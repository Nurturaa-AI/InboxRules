// src/test-dns.ts
// Quick test script to run the DNS checker against a real domain
// and print results in a readable format.
//
// Run with: pnpm test:dns google.com
// or:       pnpm test:dns gmail.com
// or any domain you want to check

import { checkDomain, detectEsp } from "./modules/dns-checker/dns.service";

// Get the domain from command line arguments
// process.argv[0] = node
// process.argv[1] = this file path
// process.argv[2] = the domain you typed
const domain = process.argv[2];

// If no domain was provided, show usage instructions and exit
if (!domain) {
  console.log("");
  console.log("Usage: pnpm test:dns <domain>");
  console.log("Example: pnpm test:dns google.com");
  console.log("");
  process.exit(1);
}

// Helper function to print a colored status badge
// This makes the output easy to read at a glance
function statusBadge(status: string): string {
  const badges: Record<string, string> = {
    pass: " PASS",
    fail: " FAIL",
    softfail: "  SOFTFAIL",
    none: "  NONE",
    permerror: " PERMERROR",
    missing: " MISSING",
    invalid: " INVALID",
    error: " ERROR",
    unknown: " UNKNOWN",
  };
  // Return the badge or a generic one if status is not recognized
  return badges[status.toLowerCase()] || `⚪ ${status.toUpperCase()}`;
}

// Helper to print a section divider so the output is easy to scan
function divider(title: string) {
  console.log("");
  console.log("─".repeat(60));
  console.log(`  ${title}`);
  console.log("─".repeat(60));
}

// Main function — runs the check and prints results
async function runTest() {
  console.log("");
  console.log("🔍 InboxRules DNS Checker");
  console.log(`   Checking domain: ${domain}`);
  console.log(`   Started at: ${new Date().toISOString()}`);
  console.log("");
  console.log("   Running SPF, DKIM, and DMARC checks in parallel...");

  // Record start time so we can show how long the check took
  const startTime = Date.now();

  let result;
  try {
    // Run the full DNS check
    result = await checkDomain(domain);
  } catch (err: any) {
    console.error("");
    console.error(" DNS check failed with an unexpected error:");
    console.error(`   ${err.message}`);
    console.error("");
    process.exit(1);
  }

  // Calculate how long the check took
  const duration = Date.now() - startTime;

  // ─────────────────────────────────────────────
  // OVERALL SCORE
  // ─────────────────────────────────────────────
  divider("OVERALL HEALTH SCORE");

  // Show a visual score bar made of blocks
  const scoreBlocks = Math.round(result.overallScore / 10);
  const bar = "█".repeat(scoreBlocks) + "░".repeat(10 - scoreBlocks);

  // Choose an emoji based on the score range
  const scoreEmoji =
    result.overallScore >= 90
      ? "🟢"
      : result.overallScore >= 70
        ? "🟡"
        : result.overallScore >= 50
          ? "🟠"
          : "🔴";

  console.log("");
  console.log(`  ${scoreEmoji}  Score: ${result.overallScore}/100`);
  console.log(`      [${bar}]`);
  console.log("");

  // ─────────────────────────────────────────────
  // SPF RESULTS
  // ─────────────────────────────────────────────
  divider("SPF CHECK");
  console.log("");
  console.log(`  Status:       ${statusBadge(result.spf.result)}`);
  console.log(
    `  DNS Lookups:  ${result.spf.lookupCount}/10 ${result.spf.lookupCount >= 8 ? "  Approaching limit" : ""}`,
  );

  if (result.spf.record) {
    // Truncate long records so they fit on screen
    const truncated =
      result.spf.record.length > 80
        ? result.spf.record.substring(0, 80) + "..."
        : result.spf.record;
    console.log(`  Record:       ${truncated}`);
  } else {
    console.log("  Record:       (none found)");
  }

  if (result.spf.allMechanism) {
    const allLabels: Record<string, string> = {
      "-": "-all (fail — recommended)",
      "~": "~all (softfail — acceptable)",
      "?": "?all (neutral — weak)",
      "+": "+all (pass all — DANGEROUS)",
    };
    console.log(
      `  All mechanism: ${allLabels[result.spf.allMechanism] || result.spf.allMechanism}`,
    );
  }

  // Show lookup chain if there are any
  if (result.spf.lookupChain.length > 0) {
    console.log("");
    console.log("  Lookup chain:");
    result.spf.lookupChain.forEach((step) => {
      console.log(`    → ${step}`);
    });
  }

  // Show any issues found
  if (result.spf.issues.length > 0) {
    console.log("");
    console.log("  Issues found:");
    result.spf.issues.forEach((issue) => {
      console.log(`      ${issue}`);
    });
  }

  // ─────────────────────────────────────────────
  // DKIM RESULTS
  // ─────────────────────────────────────────────
  divider("DKIM CHECK");
  console.log("");

  if (result.dkim.length === 0) {
    console.log("     No DKIM records found for any common selector");
    console.log("     Checked selectors: google, s1, s2, k1, k2, selector1,");
    console.log("     selector2, mandrill, em, mail, default, dkim, smtp,");
    console.log("     mimecast, pm, resend");
  } else {
    console.log(`  Found ${result.dkim.length} DKIM selector(s):`);
    console.log("");

    result.dkim.forEach((dkim) => {
      // Show each DKIM selector with its details
      console.log(`  Selector: ${dkim.selector}`);
      console.log(
        `    Status:    ${dkim.valid ? " Valid" : " Invalid/Revoked"}`,
      );
      console.log(`    Key type:  ${dkim.keyType.toUpperCase()}`);
      console.log(
        `    Key bits:  ${dkim.keyBits} ${dkim.keyBits < 2048 ? "  Weak key" : " Strong key"}`,
      );

      if (dkim.issues.length > 0) {
        console.log("    Issues:");
        dkim.issues.forEach((issue) => {
          console.log(`        ${issue}`);
        });
      }
      console.log("");
    });
  }

  // ─────────────────────────────────────────────
  // DMARC RESULTS
  // ─────────────────────────────────────────────
  divider("DMARC CHECK");
  console.log("");
  console.log(`  Status:   ${statusBadge(result.dmarc.result)}`);
  console.log(
    `  Policy:   ${result.dmarc.policy.toUpperCase()} ${
      result.dmarc.policy === "reject"
        ? " Best protection"
        : result.dmarc.policy === "quarantine"
          ? "🟡 Good protection"
          : "  No protection"
    }`,
  );
  console.log(`  Coverage: ${result.dmarc.pct}% of emails`);

  if (result.dmarc.record) {
    const truncated =
      result.dmarc.record.length > 80
        ? result.dmarc.record.substring(0, 80) + "..."
        : result.dmarc.record;
    console.log(`  Record:   ${truncated}`);
  }

  if (result.dmarc.ruaAddresses.length > 0) {
    console.log(`  Reports → ${result.dmarc.ruaAddresses.join(", ")}`);
  } else {
    console.log("  Reports →   No reporting address configured");
  }

  if (result.dmarc.issues.length > 0) {
    console.log("");
    console.log("  Issues found:");
    result.dmarc.issues.forEach((issue) => {
      console.log(`      ${issue}`);
    });
  }

  // ─────────────────────────────────────────────
  // SOFT FAILURES (future problems)
  // ─────────────────────────────────────────────
  if (result.softFailures.length > 0) {
    divider("SOFT FAILURES (problems that will break delivery soon)");
    console.log("");
    result.softFailures.forEach((warning, index) => {
      console.log(`  ${index + 1}. ${warning}`);
      console.log("");
    });
  }

  // ─────────────────────────────────────────────
  // ESP DETECTION
  // ─────────────────────────────────────────────
  divider("ESP DETECTION");
  console.log("");

  const detectedEsp = detectEsp(result.spf.record, result.dkim);

  if (detectedEsp) {
    const espNames: Record<string, string> = {
      google_workspace: "Google Workspace",
      sendgrid: "SendGrid",
      mailgun: "Mailgun",
      microsoft_365: "Microsoft 365",
      salesforce: "Salesforce",
      hubspot: "HubSpot",
      mailchimp: "Mailchimp",
      brevo: "Brevo (Sendinblue)",
      klaviyo: "Klaviyo",
      amazon_ses: "Amazon SES",
      postmark: "Postmark",
      resend: "Resend",
    };
    console.log(`  Detected ESP: ${espNames[detectedEsp] || detectedEsp}`);
    console.log(
      "  (InboxRules will generate fix instructions specific to this ESP)",
    );
  } else {
    console.log("  Could not detect ESP from DNS records");
    console.log(
      "  (Send a test email to your InboxRules inbox for better detection)",
    );
  }

  // ─────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────
  divider("SUMMARY");
  console.log("");
  console.log(`  Domain:       ${domain}`);
  console.log(`  Health score: ${result.overallScore}/100`);
  console.log(`  SPF:          ${statusBadge(result.spf.result)}`);
  console.log(
    `  DKIM:         ${result.dkim.length > 0 ? " " + result.dkim.length + " selector(s) found" : "None found"}`,
  );
  console.log(`  DMARC:        ${statusBadge(result.dmarc.result)}`);
  console.log(`  Soft warnings: ${result.softFailures.length}`);
  console.log(`  Checked in:   ${duration}ms`);
  console.log("");
  console.log("─".repeat(60));
  console.log("");
}

// Run the test
// .catch handles any unhandled promise rejections
runTest().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
