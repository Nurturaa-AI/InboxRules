// src/lib/redact.ts
//
// Scrubs secrets from strings before they are logged.
//
// Third-party SDK errors — notably @google/genai — put the full failing
// request into `error.message`, which can include the API key itself (either
// as a bare `AIza…` value or a `?key=…` query param). Logging that verbatim
// leaks the live credential into stdout, log drains, and screenshots. This is
// exactly how a Gemini key ended up in plaintext in the dev logs.
//
// Run every externally-derived error message through `redact()` before it
// reaches console.* or the logger.

// Ordered list of (pattern → replacement). Every pattern is global so it
// scrubs multiple hits in one string. Prefixes are kept where they aid
// debugging (you can tell WHICH kind of secret it was) without exposing it.
const PATTERNS: { re: RegExp; replace: string }[] = [
  // Google API keys (Gemini, Maps, …): literal "AIza" + 35 url-safe chars.
  { re: /AIza[0-9A-Za-z_-]{35}/g, replace: "AIza[REDACTED]" },

  // key / api_key / apikey / access_token / token = <secret> in a URL or query
  // string. Keeps the parameter name, drops the value.
  {
    re: /([?&](?:api[_-]?key|key|access_token|token)=)[^&\s"']+/gi,
    replace: "$1[REDACTED]",
  },

  // Authorization: Bearer <token>
  { re: /(bearer\s+)[A-Za-z0-9._-]+/gi, replace: "$1[REDACTED]" },

  // Clerk / Stripe / Lemon-Squeezy-style keys: pk_live_… sk_test_… rk_live_…
  { re: /\b((?:pk|sk|rk)_(?:live|test)_)[A-Za-z0-9]+/g, replace: "$1[REDACTED]" },
];

// Turn anything into a safe-to-log string with secrets masked. Accepts the
// common shapes we log: a string message, an Error, or an arbitrary object.
export function redact(input: unknown): string {
  let s = typeof input === "string" ? input : safeStringify(input);
  for (const { re, replace } of PATTERNS) {
    s = s.replace(re, replace);
  }
  return s;
}

function safeStringify(value: unknown): string {
  if (value instanceof Error) {
    return value.stack || `${value.name}: ${value.message}`;
  }
  if (value === undefined) return "undefined";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
