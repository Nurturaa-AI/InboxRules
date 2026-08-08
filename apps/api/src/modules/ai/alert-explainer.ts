// src/modules/ai/alert-explainer.ts
//
// When a DNS change is detected (e.g. SPF record changed,
// DKIM selector removed), this module calls Gemini to explain:
// 1. What changed
// 2. Why it matters
// 3. Exactly how to fix it
//
// IMPORTANT: Gemini never receives raw DNS records.
// It only receives structured data from our deterministic parser.
// This prevents prompt injection from malicious DNS record contents.

import { genAI } from "./gemini";
import db from "../../db";
import { redact } from "../../lib/redact";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface DnsChangeContext {
  changeType: string; // e.g. "spf_lookup_exceeded"
  severity: string; // "critical" | "warning" | "info"
  domain: string; // e.g. "acme.com"
  previousValue: string | null;
  currentValue: string | null;
  detectedEsp: string | null; // Which ESP we detected for this domain
}

export interface AiAlertExplanation {
  title: string; // Short title e.g. "SPF Lookup Limit Exceeded"
  summary: string; // 2-3 sentence plain English explanation
  fixSteps: string[]; // Numbered fix instructions
  urgency: string; // "Fix immediately" | "Fix this week" | "Monitor"
}

// ─────────────────────────────────────────────
// HUMAN-READABLE LABELS FOR CHANGE TYPES
// Maps internal codes to descriptions Gemini can reason about
// ─────────────────────────────────────────────

const CHANGE_TYPE_DESCRIPTIONS: Record<string, string> = {
  spf_lookup_exceeded:
    "The SPF record now requires more than 10 DNS lookups, which exceeds the RFC 7208 limit. Gmail and other providers will reject emails with a PermError.",
  spf_record_changed:
    "The SPF record content has changed. This may have been intentional (adding a new ESP) or accidental (DNS misconfiguration).",
  dmarc_policy_weakened:
    "The DMARC policy has been changed to a less strict setting. This reduces protection against email spoofing.",
  dmarc_record_removed:
    "The DMARC record has been completely removed from DNS. The domain is now unprotected and vulnerable to spoofing.",
  dkim_removed:
    "A DKIM selector that was previously valid has been removed from DNS. Emails signed with this selector will now fail DKIM verification.",
  dkim_key_rotated:
    "The DKIM public key for a selector has changed. This may be intentional key rotation or accidental deletion and replacement.",
};

// ─────────────────────────────────────────────
// ESP-SPECIFIC CONTEXT
// Gives Gemini additional context about the detected ESP
// so it can give accurate fix instructions
// ─────────────────────────────────────────────

const ESP_CONTEXT: Record<string, string> = {
  google_workspace:
    "Google Workspace: DKIM is managed in Admin Console > Apps > Google Workspace > Gmail > Authenticate email. SPF is managed in your domain DNS. DMARC is added as a TXT record at _dmarc.yourdomain.com.",
  sendgrid:
    "SendGrid: Domain authentication is in Settings > Sender Authentication. DKIM uses selectors s1 and s2. SPF include is include:sendgrid.net.",
  mailgun:
    "Mailgun: Domain settings are in Sending > Domains > [your domain] > DNS Records. DKIM selector is typically k1 or k2.",
  microsoft_365:
    "Microsoft 365: DKIM is managed in the Microsoft 365 Defender portal under Email & Collaboration > Policies. SPF include is include:spf.protection.outlook.com.",
  amazon_ses:
    "Amazon SES: DKIM is configured in SES console > Verified Identities > [your domain] > DKIM. SPF include is include:amazonses.com.",
  mailchimp:
    "Mailchimp: Domain authentication is in Account > Domains. DKIM and SPF records are provided automatically when you verify your domain.",
  postmark:
    "Postmark: Domain authentication is in your Sender Signatures settings. DKIM selector is typically pm. SPF include is include:spf.mtasv.net.",
  brevo:
    "Brevo (Sendinblue): Domain authentication is in Settings > Senders & IP > Domains. SPF include is include:spf.sendinblue.com.",
};

// ─────────────────────────────────────────────
// MAIN FUNCTION
// ─────────────────────────────────────────────

export async function explainDnsChange(
  context: DnsChangeContext,
  tenantId: string,
): Promise<AiAlertExplanation> {
  // Get the human-readable description of this change type
  const changeDescription =
    CHANGE_TYPE_DESCRIPTIONS[context.changeType] ||
    `A DNS change of type "${context.changeType}" was detected.`;

  // Get ESP-specific context if we know which ESP the domain uses
  const espContext = context.detectedEsp
    ? ESP_CONTEXT[context.detectedEsp] || ""
    : "";

  // Build the prompt
  // We pass structured data only — never raw DNS records
  const prompt = `A DNS compliance change was detected for an email sending domain.

## Change Details
- Domain: ${context.domain}
- Severity: ${context.severity}
- What happened: ${changeDescription}
- Previous value: ${context.previousValue || "Not available"}
- Current value: ${context.currentValue || "Not available"}
${espContext ? `\n## Email Service Provider Context\n${espContext}` : ""}

## Your Task
Generate a clear alert explanation for the domain owner.

Respond with ONLY a JSON object in this exact format:
{
  "title": "Short title (max 8 words)",
  "summary": "2-3 sentences explaining what happened and why it matters to email delivery. Use plain English.",
  "fixSteps": [
    "Step 1: specific action to take",
    "Step 2: specific action to take",
    "Step 3: specific action to take"
  ],
  "urgency": "Fix immediately"
}

For urgency use exactly one of: "Fix immediately", "Fix this week", "Monitor closely"
For critical severity always use "Fix immediately".
Give 2-4 fix steps maximum. Be specific to the ESP if known.`;

  try {
    // Call Gemini and get the response
    const result = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    const responseText = result.text ?? "";

    // Log token usage for cost tracking
    const usageMetadata = result.usageMetadata;
    await logAiUsage({
      tenantId,
      feature: "alert_explainer",
      inputTokens: usageMetadata?.promptTokenCount,
      outputTokens: usageMetadata?.candidatesTokenCount,
    });

    // Parse the JSON response from Gemini
    // Gemini sometimes wraps JSON in markdown code blocks
    // so we strip those before parsing
    const cleaned = responseText
      .replace(/```json\n?/g, "") // Remove opening ```json
      .replace(/```\n?/g, "") // Remove closing ```
      .trim();

    const parsed = JSON.parse(cleaned) as AiAlertExplanation;

    // Validate the response has the fields we need
    // If Gemini returns something unexpected, use a fallback
    if (!parsed.title || !parsed.summary || !Array.isArray(parsed.fixSteps)) {
      return buildFallbackExplanation(context);
    }

    return parsed;
  } catch (err: any) {
    // If the AI call fails for any reason (network, quota, parse error)
    // return a basic fallback explanation so the alert still goes out
    // The user gets SOME information rather than nothing
    console.error("[AI] Alert explainer failed:", redact(err));
    return buildFallbackExplanation(context);
  }
}

// ─────────────────────────────────────────────
// FALLBACK
// Used when Gemini is unavailable or returns unexpected output
// The alert still goes out — just without AI enrichment
// ─────────────────────────────────────────────

function buildFallbackExplanation(
  context: DnsChangeContext,
): AiAlertExplanation {
  const descriptions: Record<string, AiAlertExplanation> = {
    spf_lookup_exceeded: {
      title: "SPF Lookup Limit Exceeded",
      summary:
        "Your SPF record now requires more than 10 DNS lookups, which exceeds the RFC 7208 limit. " +
        "Gmail, Yahoo, and Microsoft will reject your emails with a PermError until this is fixed.",
      fixSteps: [
        "Log into your DNS provider and view your SPF record",
        "Count the number of include: mechanisms — you need to reduce them",
        "Replace some include: entries with direct IP addresses using ip4: or ip6:",
        "Use an SPF flattening tool to help consolidate your record",
      ],
      urgency: "Fix immediately",
    },
    dmarc_record_removed: {
      title: "DMARC Record Removed",
      summary:
        "Your DMARC record has been deleted from DNS. " +
        "Your domain is now unprotected and anyone can send emails pretending to be you.",
      fixSteps: [
        "Log into your DNS provider",
        "Add a TXT record at _dmarc.yourdomain.com",
        "Set the value to: v=DMARC1; p=quarantine; rua=mailto:you@yourdomain.com",
        "Wait 24-48 hours for DNS propagation",
      ],
      urgency: "Fix immediately",
    },
    dmarc_policy_weakened: {
      title: "DMARC Policy Weakened",
      summary:
        "Your DMARC policy has been changed to a less protective setting. " +
        "This increases the risk of email spoofing and phishing attacks using your domain name.",
      fixSteps: [
        "Log into your DNS provider",
        "Find your _dmarc TXT record",
        "Change p=none back to p=quarantine or p=reject",
        "Save the record and allow 24 hours for propagation",
      ],
      urgency: "Fix this week",
    },
  };

  return (
    descriptions[context.changeType] || {
      title: "DNS Configuration Changed",
      summary:
        `A change was detected on ${context.domain} that may affect email delivery. ` +
        "Please review your DNS settings.",
      fixSteps: [
        "Log into your DNS provider",
        "Review your SPF, DKIM, and DMARC records",
        "Compare against your previous configuration",
        "Contact your email service provider if you need help",
      ],
      urgency: "Monitor closely",
    }
  );
}

// ─────────────────────────────────────────────
// LOG AI USAGE
// Records every AI call to the database for cost tracking
// ─────────────────────────────────────────────

async function logAiUsage(data: {
  tenantId: string;
  feature: string;
  inputTokens?: number;
  outputTokens?: number;
}) {
  try {
    // Gemini 2.0 Flash pricing (as of 2025):
    // Input: $0.075 per million tokens
    // Output: $0.30 per million tokens
    const inputCost = ((data.inputTokens || 0) / 1_000_000) * 0.075;
    const outputCost = ((data.outputTokens || 0) / 1_000_000) * 0.3;
    const totalCost = inputCost + outputCost;

    await db.aiUsageLog.create({
      data: {
        tenantId: data.tenantId,
        feature: data.feature,
        model: "gemini-2.0-flash",
        inputTokens: data.inputTokens,
        outputTokens: data.outputTokens,
        costUsd: totalCost,
      },
    });
  } catch (err: any) {
    // Never let usage logging crash the main flow
    console.error("[AI] Failed to log usage:", redact(err));
  }
}
