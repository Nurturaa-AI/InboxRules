// src/modules/dns-checker/dns.types.ts
// TypeScript types for all DNS check results.
// Having strong types here means TypeScript catches mistakes
// when we use these results in other parts of the codebase.

export interface SpfResult {
  record: string | null; // The raw SPF record text
  result: "pass" | "fail" | "softfail" | "none" | "permerror" | "error";
  lookupCount: number; // How many DNS lookups this record requires
  lookupChain: string[]; // Step-by-step trace of what contributes to the count
  allMechanism?: string; // The 'all' qualifier: '-', '~', '?', '+'
  issues: string[]; // Plain-English description of any problems found
}

export interface DkimResult {
  selector: string; // The DKIM selector e.g. 's1', 'google'
  domain: string; // Full DKIM domain e.g. 's1._domainkey.acme.com'
  record: string; // The raw DKIM TXT record
  keyType: string; // 'rsa' or 'ed25519'
  keyBits: number; // Key strength: 1024, 2048, 4096, or 256 for ed25519
  valid: boolean; // Whether the key is valid (not revoked)
  issues: string[]; // Plain-English description of any problems
}

export interface DmarcResult {
  record: string | null; // The raw DMARC record
  policy: "none" | "quarantine" | "reject";
  result: "pass" | "missing" | "invalid" | "error";
  pct: number; // Percentage of mail the policy applies to (0-100)
  ruaAddresses: string[]; // Aggregate report email addresses
  rufAddresses: string[]; // Forensic report email addresses
  issues: string[]; // Plain-English description of any problems
}

// ─────────────────────────────────────────────
// BIMI / MTA-STS / TLS-RPT
// These three are TXT-presence + syntax checks only (no HTTPS policy fetch),
// so they keep the "structured data only, <5s per query" contract and reuse
// resolveTxtWithTimeout. Their `result` shares the same value space:
//   "pass"    — a syntactically valid record is present
//   "none"    — no record found (domain simply hasn't adopted the signal)
//   "invalid" — a record exists but the version prefix is wrong/malformed
//   "error"   — the DNS query itself failed (network/timeout)
// ─────────────────────────────────────────────

export interface BimiResult {
  record: string | null; // The raw BIMI TXT record
  selector: string; // The BIMI selector queried (default is "default")
  result: "pass" | "none" | "invalid" | "error";
  issues: string[]; // Plain-English description of any problems
}

export interface MtaStsResult {
  record: string | null; // The raw MTA-STS TXT record (the _mta-sts TXT, not the policy file)
  result: "pass" | "none" | "invalid" | "error";
  issues: string[];
}

export interface TlsRptResult {
  record: string | null; // The raw TLS-RPT (SMTP TLS Reporting) TXT record
  result: "pass" | "none" | "invalid" | "error";
  issues: string[];
}

export interface DnsCheckResult {
  domain: string;
  checkedAt: Date;
  spf: SpfResult;
  dkim: DkimResult[];
  dmarc: DmarcResult;
  bimi: BimiResult;
  mtaSts: MtaStsResult;
  tlsRpt: TlsRptResult;
  softFailures: string[]; // Future failures that haven't happened yet
  overallScore: number; // Health score 0-100
}
