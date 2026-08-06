// src/modules/dns-checker/dns.service.ts
//
// This module does all the DNS checking: SPF, DKIM, DMARC.
// It talks directly to DNS servers — no external APIs needed.
//
// Key rule: this module produces STRUCTURED DATA only.
// The AI module receives this structured data, never raw DNS strings.

import dns from "dns/promises";
import {
  DnsCheckResult,
  SpfResult,
  DkimResult,
  DmarcResult,
} from "./dns.types";

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

// Gmail, Yahoo, and Microsoft all reject at > 10 SPF lookups
const SPF_LOOKUP_LIMIT = 10;

// Per-query DNS timeout. node's dns.resolveTxt has no built-in timeout: a slow
// or unresponsive authoritative nameserver can hang the promise until the OS
// resolver gives up (often 20-30s+). Because DNS scans run on BullMQ workers
// with a small concurrency (5), a few hung lookups can starve every worker
// slot. We race each query against this deadline and treat a timeout like any
// other DNS failure (ETIMEOUT is handled by the existing catch blocks).
const DNS_QUERY_TIMEOUT_MS = 5000;

// Resolves TXT records for a name, rejecting if it takes longer than
// DNS_QUERY_TIMEOUT_MS. The rejection carries code "ETIMEOUT" so the existing
// error handling (which branches on err.code) treats it as a normal DNS error.
async function resolveTxtWithTimeout(name: string): Promise<string[][]> {
  let timer: NodeJS.Timeout;

  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      const err = new Error(`DNS query for ${name} timed out`) as Error & {
        code: string;
      };
      err.code = "ETIMEOUT";
      reject(err);
    }, DNS_QUERY_TIMEOUT_MS);
  });

  try {
    return await Promise.race([dns.resolveTxt(name), timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

// Common DKIM selectors used by popular ESPs
// We check these because users don't always know their selector
const COMMON_DKIM_SELECTORS = [
  "google", // Google Workspace
  "s1",
  "s2", // SendGrid
  "k1",
  "k2", // Mailgun
  "mandrill", // Mandrill/Mailchimp
  "em", // SendGrid (some accounts)
  "mail", // Generic
  "default", // Generic
  "selector1", // Microsoft 365
  "selector2", // Microsoft 365
  "dkim", // Generic
  "smtp", // Generic SMTP
  "mimecast", // Mimecast
  "pm", // Postmark
  "resend", // Resend
];

// ─────────────────────────────────────────────
// MAIN ENTRY POINT
// ─────────────────────────────────────────────

/**
 * Runs a full compliance check on a domain.
 * Checks SPF, DKIM, and DMARC in parallel for speed.
 * Returns structured results — never raw DNS strings.
 */
export async function checkDomain(domain: string): Promise<DnsCheckResult> {
  // Validate the domain format before making DNS queries
  // This prevents wasted API calls and potential injection attacks
  if (!isValidDomain(domain)) {
    return createErrorResult(domain, "Invalid domain format");
  }

  // Run all three checks at the same time (parallel)
  // This is faster than running them one after another
  const [spf, dkim, dmarc] = await Promise.allSettled([
    checkSpf(domain),
    checkDkim(domain),
    checkDmarc(domain),
  ]);

  // Extract the results, handling the case where any check threw an error
  // Promise.allSettled never throws — it gives us { status, value/reason }
  const spfResult =
    spf.status === "fulfilled" ? spf.value : createSpfError(spf.reason);

  const dkimResult =
    dkim.status === "fulfilled" ? dkim.value : createDkimError(dkim.reason);

  const dmarcResult =
    dmarc.status === "fulfilled" ? dmarc.value : createDmarcError(dmarc.reason);

  // Detect soft failures — problems that don't fail today but will fail soon
  const softFailures = detectSoftFailures(spfResult, dkimResult, dmarcResult);

  // Calculate an overall health score from 0 to 100
  const overallScore = calculateHealthScore(
    spfResult,
    dkimResult,
    dmarcResult,
    softFailures,
  );

  return {
    domain,
    checkedAt: new Date(),
    spf: spfResult,
    dkim: dkimResult,
    dmarc: dmarcResult,
    softFailures,
    overallScore,
  };
}

// ─────────────────────────────────────────────
// SPF CHECK
// ─────────────────────────────────────────────

/**
 * Checks the SPF record for a domain.
 * SPF tells receiving servers which IPs are allowed to send email for this domain.
 */
async function checkSpf(domain: string): Promise<SpfResult> {
  let txtRecords: string[][];

  try {
    // Query all TXT records for the domain
    // TXT records contain SPF, DMARC, and other text-based DNS records
    txtRecords = await resolveTxtWithTimeout(domain);
  } catch (err: any) {
    // ENOTFOUND = domain doesn't exist
    // ENODATA = domain exists but has no TXT records
    if (err.code === "ENOTFOUND" || err.code === "ENODATA") {
      return {
        record: null,
        result: "none",
        lookupCount: 0,
        lookupChain: [],
        issues: ["No TXT records found for domain"],
      };
    }
    // For other errors (network issues, etc.), re-throw so the caller can handle
    throw new Error(`SPF DNS query failed: ${err.message}`);
  }

  // TXT records come back as an array of arrays because long records
  // are split into 255-char chunks. Join each record's chunks.
  const allTxtStrings = txtRecords.map((chunks) => chunks.join(""));

  // Find the SPF record — it must start with 'v=spf1'
  // A domain should only have ONE SPF record
  const spfRecords = allTxtStrings.filter((txt) =>
    txt.toLowerCase().startsWith("v=spf1"),
  );

  // Edge case: multiple SPF records = immediate permerror (RFC 7208)
  if (spfRecords.length > 1) {
    return {
      record: spfRecords[0],
      result: "permerror",
      lookupCount: 0,
      lookupChain: [],
      issues: [
        `Found ${spfRecords.length} SPF records. Only one is allowed. ` +
          "Having multiple SPF records causes a permanent error.",
      ],
    };
  }

  // Edge case: no SPF record found
  if (spfRecords.length === 0) {
    return {
      record: null,
      result: "none",
      lookupCount: 0,
      lookupChain: [],
      issues: [
        "No SPF record found. Add one to authorize your sending servers.",
      ],
    };
  }

  const spfRecord = spfRecords[0];

  // Count how many DNS lookups this SPF record requires
  // Mechanisms like 'include:' and 'mx' each cost one lookup
  const { count: lookupCount, chain: lookupChain } = await countSpfLookups(
    spfRecord,
    domain,
  );

  const issues: string[] = [];

  // Check if we're over or approaching the lookup limit
  if (lookupCount > SPF_LOOKUP_LIMIT) {
    issues.push(
      `SPF record requires ${lookupCount} DNS lookups but the limit is ${SPF_LOOKUP_LIMIT}. ` +
        "Gmail and other providers will reject your emails with a PermError.",
    );
  }

  // Check the 'all' mechanism at the end of the record
  // -all = fail (strictest, recommended)
  // ~all = softfail (lenient, not ideal)
  // ?all = neutral (no recommendation, weak)
  // +all = pass everything (dangerous, should never be used)
  const allMechanism = spfRecord.match(/[~\-+?]all/i)?.[0]?.charAt(0);

  if (allMechanism === "+") {
    issues.push(
      "SPF record ends with +all which allows ANY server to send email as your domain. " +
        "This is a serious security risk. Change to -all immediately.",
    );
  }

  return {
    record: spfRecord,
    result: lookupCount > SPF_LOOKUP_LIMIT ? "permerror" : "pass",
    lookupCount,
    lookupChain,
    allMechanism: allMechanism || "missing",
    issues,
  };
}

/**
 * Counts the number of DNS lookups an SPF record requires.
 * Each include:, a:, mx:, exists: and ptr: mechanism costs one lookup.
 * The limit is 10 (RFC 7208).
 */
async function countSpfLookups(
  record: string,
  domain: string,
  depth: number = 0,
  visited: Set<string> = new Set(),
): Promise<{ count: number; chain: string[] }> {
  // Prevent infinite loops from circular SPF references
  // e.g. if domain A includes domain B which includes domain A
  if (depth > 10) {
    return {
      count: SPF_LOOKUP_LIMIT + 1,
      chain: ["Circular reference detected"],
    };
  }

  // Prevent processing the same domain twice in one traversal
  if (visited.has(domain)) {
    return { count: 0, chain: [] };
  }
  visited.add(domain);

  let count = 0;
  const chain: string[] = [];

  // Early-exit once we exceed the RFC limit. Without this, a crafted include
  // chain can fan out dozens of live TXT queries even though the final count
  // will be marked as permerror anyway. The visited set bounds loops, but not
  // breadth: each unchecked level can add multiple includes. Stop counting
  // (and making queries) once the limit is breached.
  const earlyExitThreshold = SPF_LOOKUP_LIMIT + 1;

  // These mechanisms each cost one DNS lookup (RFC 7208 Section 4.6.4)
  const lookupMechanisms = [
    "include:",
    "a:",
    "a ",
    "mx:",
    "mx ",
    "exists:",
    "redirect=",
  ];

  for (const mechanism of lookupMechanisms) {
    // Count how many times this mechanism appears in the record
    const regex = new RegExp(
      mechanism.replace(":", "\\:").replace("=", "\\="),
      "gi",
    );
    const matches = record.match(regex);

    if (matches) {
      count += matches.length;
      chain.push(`${mechanism} × ${matches.length}`);
    }

    // Early-exit once we exceed the limit — no point counting further or
    // making additional DNS queries when the record will be marked permerror.
    if (count >= earlyExitThreshold) {
      chain.push("Lookup limit exceeded");
      return { count, chain };
    }
  }

  // For each include: mechanism, recursively count its lookups too
  // because those also count toward the total
  const includeMatches = record.matchAll(/include:(\S+)/gi);
  for (const match of includeMatches) {
    // Early-exit once we exceed the limit
    if (count >= earlyExitThreshold) {
      chain.push("Lookup limit exceeded during include traversal");
      return { count, chain };
    }

    const includedDomain = match[1];
    try {
      const txtRecords = await resolveTxtWithTimeout(includedDomain);
      const allTxt = txtRecords.map((c) => c.join("")).join("");
      const includedSpf = allTxt
        .split("\n")
        .find((r) => r.startsWith("v=spf1"));

      if (includedSpf) {
        // Recursively count the included domain's lookups
        const nested = await countSpfLookups(
          includedSpf,
          includedDomain,
          depth + 1,
          visited,
        );
        count += nested.count;
        chain.push(...nested.chain.map((c) => `  ${includedDomain}: ${c}`));
      }
    } catch {
      // If we can't resolve an included domain, count it as one lookup
      // and note the problem
      chain.push(`  ${includedDomain}: failed to resolve`);
    }
  }

  return { count, chain };
}

// ─────────────────────────────────────────────
// DKIM CHECK
// ─────────────────────────────────────────────

/**
 * Checks DKIM records for a domain.
 * DKIM uses cryptographic signatures to prove emails haven't been tampered with.
 * We check all common selectors because users often don't know which one they use.
 */
async function checkDkim(domain: string): Promise<DkimResult[]> {
  const results: DkimResult[] = [];

  // Check all common selectors in parallel
  // This is much faster than checking one by one
  const checks = await Promise.allSettled(
    COMMON_DKIM_SELECTORS.map((selector) =>
      checkDkimSelector(selector, domain),
    ),
  );

  for (const check of checks) {
    if (check.status === "fulfilled" && check.value !== null) {
      // Only include selectors that actually exist in DNS
      results.push(check.value);
    }
    // Silently skip selectors that don't exist — that's expected
  }

  return results;
}

/**
 * Checks a specific DKIM selector for a domain.
 * Returns null if the selector doesn't exist (which is normal).
 * Returns the DKIM record details if it does exist.
 */
async function checkDkimSelector(
  selector: string,
  domain: string,
): Promise<DkimResult | null> {
  // DKIM records live at: selector._domainkey.domain
  const dkimDomain = `${selector}._domainkey.${domain}`;

  let txtRecords: string[][];

  try {
    txtRecords = await resolveTxtWithTimeout(dkimDomain);
  } catch (err: any) {
    // ENOTFOUND or ENODATA = this selector doesn't exist, which is normal
    if (
      err.code === "ENOTFOUND" ||
      err.code === "ENODATA" ||
      err.code === "ESERVFAIL"
    ) {
      return null;
    }
    // Other errors = actual problem worth noting
    return null;
  }

  // Join chunks into one string
  const record = txtRecords.map((chunks) => chunks.join("")).join("");

  // A valid DKIM record must start with v=DKIM1
  if (!record.includes("v=DKIM1")) {
    return null;
  }

  // Extract the key type (k= tag) — should be 'rsa' or 'ed25519'
  const keyType = record.match(/k=(\w+)/i)?.[1] || "rsa";

  // Extract the public key (p= tag)
  const publicKey = record.match(/p=([A-Za-z0-9+/=]+)/)?.[1] || "";

  // Estimate key strength from base64-encoded key length
  // RSA-1024 ≈ 216 chars, RSA-2048 ≈ 392 chars
  const keyBits = estimateKeyBits(publicKey, keyType);

  const issues: string[] = [];

  // Key rotated out — empty p= tag means the key has been revoked
  if (publicKey === "") {
    issues.push(
      `DKIM selector '${selector}' exists but the key has been revoked (empty p= tag). ` +
        "Emails signed with this selector will fail DKIM verification.",
    );
  }

  // Warn about weak RSA keys
  if (keyType === "rsa" && keyBits < 2048) {
    issues.push(
      `DKIM key for selector '${selector}' is ${keyBits}-bit RSA. ` +
        "Minimum recommendation is 2048-bit. Some providers are beginning to reject 1024-bit keys.",
    );
  }

  return {
    selector,
    domain: dkimDomain,
    record,
    keyType,
    keyBits,
    valid: publicKey !== "",
    issues,
  };
}

/**
 * Estimates RSA key strength from the base64-encoded public key.
 * This is an approximation — the exact bit count requires parsing the ASN.1 structure.
 */
function estimateKeyBits(base64Key: string, keyType: string): number {
  if (keyType === "ed25519") return 256; // Ed25519 keys are always 256-bit

  // Base64 encodes 6 bits per character
  // RSA key size in bits ≈ (base64 length × 6) / 8 × 0.75
  const byteLength = (base64Key.length * 3) / 4;
  const bits = byteLength * 8;

  // Round to nearest standard key size
  if (bits < 768) return 512;
  if (bits < 1536) return 1024;
  if (bits < 3072) return 2048;
  return 4096;
}

// ─────────────────────────────────────────────
// DMARC CHECK
// ─────────────────────────────────────────────

/**
 * Checks the DMARC record for a domain.
 * DMARC tells receiving servers what to do with emails that fail SPF or DKIM.
 * It also provides reporting — you can receive reports about who is sending as your domain.
 */
async function checkDmarc(domain: string): Promise<DmarcResult> {
  // DMARC records always live at _dmarc.domain
  const dmarcDomain = `_dmarc.${domain}`;

  let txtRecords: string[][];

  try {
    txtRecords = await resolveTxtWithTimeout(dmarcDomain);
  } catch (err: any) {
    if (err.code === "ENOTFOUND" || err.code === "ENODATA") {
      return {
        record: null,
        policy: "none",
        result: "missing",
        pct: 100,
        ruaAddresses: [],
        rufAddresses: [],
        issues: [
          "No DMARC record found. Without DMARC, your domain is vulnerable to spoofing " +
            "and Gmail/Yahoo may reject or quarantine your emails.",
        ],
      };
    }
    throw new Error(`DMARC DNS query failed: ${err.message}`);
  }

  const record = txtRecords.map((chunks) => chunks.join("")).join("");

  // Verify it's actually a DMARC record
  if (!record.startsWith("v=DMARC1")) {
    return {
      record,
      policy: "none",
      result: "invalid",
      pct: 100,
      ruaAddresses: [],
      rufAddresses: [],
      issues: [
        "Record at _dmarc does not appear to be a valid DMARC record (must start with v=DMARC1)",
      ],
    };
  }

  // Extract the policy (p= tag): none, quarantine, or reject
  const policy = (record.match(/p=(none|quarantine|reject)/i)?.[1] ||
    "none") as DmarcResult["policy"];

  // Extract the percentage (pct= tag) — how much mail this policy applies to
  // Defaults to 100 if not specified
  const pct = parseInt(record.match(/pct=(\d+)/i)?.[1] || "100", 10);

  // Extract reporting email addresses
  // rua = where aggregate reports go (daily summary)
  // ruf = where forensic reports go (individual failure reports)
  const ruaMatch = record.match(/rua=([^;]+)/i)?.[1] || "";
  const rufMatch = record.match(/ruf=([^;]+)/i)?.[1] || "";

  // Addresses are comma-separated mailto: URIs
  const ruaAddresses = ruaMatch
    .split(",")
    .map((addr) => addr.trim().replace("mailto:", ""))
    .filter(Boolean);

  const rufAddresses = rufMatch
    .split(",")
    .map((addr) => addr.trim().replace("mailto:", ""))
    .filter(Boolean);

  const issues: string[] = [];

  // DMARC p=none means monitoring only — your domain is not protected
  if (policy === "none") {
    issues.push(
      "DMARC policy is set to p=none which means no protection. " +
        "Emails that fail authentication are still delivered. " +
        "Consider moving to p=quarantine, then p=reject once you confirm legitimate emails pass.",
    );
  }

  // pct < 100 means the policy only applies to some emails
  if (pct < 100) {
    issues.push(
      `DMARC pct=${pct} means the policy only applies to ${pct}% of emails. ` +
        "This is useful during rollout but should eventually be set to pct=100.",
    );
  }

  // No reporting address = you won't know when emails fail
  if (ruaAddresses.length === 0) {
    issues.push(
      "No rua= reporting address in DMARC record. " +
        "You will not receive aggregate reports about email authentication failures. " +
        "Add rua=mailto:your@email.com to receive daily reports.",
    );
  }

  return {
    record,
    policy,
    result: "pass",
    pct,
    ruaAddresses,
    rufAddresses,
    issues,
  };
}

// ─────────────────────────────────────────────
// SOFT FAILURE DETECTION
// ─────────────────────────────────────────────

/**
 * Detects problems that don't cause failures today but will cause
 * failures soon or under stricter enforcement.
 *
 * These are your competitive edge — most tools only show current failures.
 * InboxRules shows upcoming failures too.
 */
function detectSoftFailures(
  spf: SpfResult,
  dkim: DkimResult[],
  dmarc: DmarcResult,
): string[] {
  const warnings: string[] = [];

  // SPF approaching the lookup limit
  if (
    spf.lookupCount !== undefined &&
    spf.lookupCount >= 8 &&
    spf.lookupCount <= 10
  ) {
    warnings.push(
      `SPF record uses ${spf.lookupCount}/10 DNS lookups. ` +
        "Adding one more ESP (like HubSpot or Klaviyo) will push you over the limit and break delivery.",
    );
  }

  // SPF using softfail (~all) instead of fail (-all)
  if (spf.allMechanism === "~") {
    warnings.push(
      "SPF ends with ~all (softfail) instead of -all (fail). " +
        "Softfail allows unauthenticated emails through. " +
        "Change to -all once you confirm all legitimate sending sources are in your SPF record.",
    );
  }

  // DKIM using weak 1024-bit keys
  const weakDkimKeys = dkim.filter(
    (d) => d.keyBits < 2048 && d.keyType === "rsa",
  );
  for (const key of weakDkimKeys) {
    warnings.push(
      `DKIM selector '${key.selector}' uses a ${key.keyBits}-bit RSA key. ` +
        "2048-bit is now the minimum recommendation and some providers may reject 1024-bit keys.",
    );
  }

  // DMARC in monitoring mode (p=none)
  if (dmarc.policy === "none") {
    warnings.push(
      "DMARC is in monitoring mode (p=none). " +
        "Your domain is not protected from spoofing. " +
        "Move to p=quarantine once you have reviewed your DMARC reports.",
    );
  }

  return warnings;
}

// ─────────────────────────────────────────────
// HEALTH SCORE CALCULATION
// ─────────────────────────────────────────────

/**
 * Calculates a health score from 0 to 100.
 * This gives users an at-a-glance view of their compliance status.
 *
 * Score breakdown:
 * - SPF passing:    30 points
 * - DKIM valid:     30 points
 * - DMARC present:  20 points
 * - DMARC enforcing: 10 points (quarantine or reject)
 * - No soft failures: 10 points
 */
function calculateHealthScore(
  spf: SpfResult,
  dkim: DkimResult[],
  dmarc: DmarcResult,
  softFailures: string[],
): number {
  let score = 0;

  // SPF: 30 points for passing
  if (spf.result === "pass") {
    score += 30;
  } else if (spf.result === "softfail") {
    // Give partial credit for softfail — it's better than nothing
    score += 15;
  }

  // DKIM: 30 points for at least one valid DKIM key
  const validDkimKeys = dkim.filter((d) => d.valid);
  if (validDkimKeys.length > 0) {
    score += 30;
    // Bonus: extra points for strong keys (2048-bit+)
    const strongKeys = validDkimKeys.filter((d) => d.keyBits >= 2048);
    if (strongKeys.length > 0) {
      score += 5; // Bonus 5 points for good key strength
    }
  }

  // DMARC: 20 points for having a record at all
  if (dmarc.result !== "missing" && dmarc.result !== "invalid") {
    score += 20;
  }

  // DMARC enforcement: 10 more points for quarantine or reject policy
  if (dmarc.policy === "quarantine" || dmarc.policy === "reject") {
    score += 10;
  }

  // Soft failures: deduct 5 points each, max deduction 10
  const deduction = Math.min(softFailures.length * 5, 10);
  score -= deduction;

  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, score));
}

// ─────────────────────────────────────────────
// ESP FINGERPRINTING
// ─────────────────────────────────────────────

/**
 * Tries to identify which ESP (Email Service Provider) a domain uses.
 * We do this by looking at common DKIM selectors and SPF includes.
 * This helps us give ESP-specific fix instructions.
 */
export function detectEsp(
  spfRecord: string | null,
  dkimSelectors: DkimResult[],
): string | null {
  // Map of known patterns to ESP names
  const espPatterns: Array<{ pattern: RegExp; esp: string }> = [
    {
      pattern: /include:_spf\.google\.com|include:spf\.google\.com/i,
      esp: "google_workspace",
    },
    { pattern: /include:sendgrid\.net/i, esp: "sendgrid" },
    { pattern: /include:mailgun\.org/i, esp: "mailgun" },
    { pattern: /include:spf\.protection\.outlook\.com/i, esp: "microsoft_365" },
    { pattern: /include:_spf\.salesforce\.com/i, esp: "salesforce" },
    { pattern: /include:_spf\.hubspot\.com/i, esp: "hubspot" },
    {
      pattern: /include:spf\.mailchimp\.com|include:servers\.mcsv\.net/i,
      esp: "mailchimp",
    },
    {
      pattern: /include:spf\.brevo\.com|include:spf\.sendinblue\.com/i,
      esp: "brevo",
    },
    { pattern: /include:spf\.klaviyo\.com/i, esp: "klaviyo" },
    { pattern: /include:amazonses\.com/i, esp: "amazon_ses" },
    { pattern: /include:spf\.postmarkapp\.com/i, esp: "postmark" },
  ];

  // Check SPF includes first
  if (spfRecord) {
    for (const { pattern, esp } of espPatterns) {
      if (pattern.test(spfRecord)) {
        return esp;
      }
    }
  }

  // Check DKIM selectors
  const selectorToEsp: Record<string, string> = {
    google: "google_workspace",
    s1: "sendgrid",
    s2: "sendgrid",
    k1: "mailgun",
    k2: "mailgun",
    selector1: "microsoft_365",
    selector2: "microsoft_365",
    mandrill: "mailchimp",
    pm: "postmark",
    resend: "resend",
  };

  for (const dkim of dkimSelectors) {
    const esp = selectorToEsp[dkim.selector];
    if (esp) return esp;
  }

  return null; // Could not determine ESP
}

// ─────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────

/**
 * Validates a domain name format.
 * Prevents invalid domains from being added and protects against injection.
 */
function isValidDomain(domain: string): boolean {
  // Domain must be 1-253 characters
  if (!domain || domain.length > 253) return false;

  // Remove trailing dot (valid in DNS but we normalize it)
  const normalized = domain.endsWith(".") ? domain.slice(0, -1) : domain;

  // Each label (part between dots) must be 1-63 characters
  // and contain only letters, numbers, and hyphens
  // Labels cannot start or end with a hyphen
  const labelRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?$/;
  const labels = normalized.split(".");

  if (labels.length < 2) return false; // Must have at least one dot

  return labels.every((label) => labelRegex.test(label));
}

function createErrorResult(domain: string, message: string): DnsCheckResult {
  return {
    domain,
    checkedAt: new Date(),
    spf: createSpfError(message),
    dkim: [],
    dmarc: createDmarcError(message),
    softFailures: [],
    overallScore: 0,
  };
}

function createSpfError(error: any): SpfResult {
  return {
    record: null,
    result: "error",
    lookupCount: 0,
    lookupChain: [],
    issues: [`SPF check failed: ${error?.message || error}`],
  };
}

function createDkimError(error: any): DkimResult[] {
  return []; // Return empty array — DKIM errors are non-fatal
}

function createDmarcError(error: any): DmarcResult {
  return {
    record: null,
    policy: "none",
    result: "error",
    pct: 100,
    ruaAddresses: [],
    rufAddresses: [],
    issues: [`DMARC check failed: ${error?.message || error}`],
  };
}
