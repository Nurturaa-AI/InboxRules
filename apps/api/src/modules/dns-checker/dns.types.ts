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

export interface DnsCheckResult {
  domain: string;
  checkedAt: Date;
  spf: SpfResult;
  dkim: DkimResult[];
  dmarc: DmarcResult;
  softFailures: string[]; // Future failures that haven't happened yet
  overallScore: number; // Health score 0-100
}
