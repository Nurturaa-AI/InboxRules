// src/modules/ai/snippet-generator.ts
//
// Generates copy-paste List-Unsubscribe header configuration
// for the user's specific ESP.
//
// Template-first approach:
// - 95% of ESPs are covered by pre-built templates (no AI needed)
// - AI only fires for unknown ESPs or custom SMTP setups
// This keeps costs low and responses fast for common cases.

import { genAI } from "./gemini";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface SnippetRequest {
  esp: string; // Detected ESP e.g. "sendgrid"
  domain: string; // The sending domain e.g. "acme.com"
  unsubscribeUrl: string; // The hosted unsubscribe URL from InboxRules
  useCase: string; // "marketing" | "transactional" | "cold_outreach"
}

export interface SnippetResult {
  snippet: string; // The copy-paste configuration
  instructions: string; // Where to add it in the ESP
  source: "template" | "ai"; // How it was generated
}

// ─────────────────────────────────────────────
// PRE-BUILT TEMPLATES
// These cover the most common ESPs without any AI call.
// Variables in {curly_braces} are replaced with actual values.
// ─────────────────────────────────────────────

const ESP_TEMPLATES: Record<string, { snippet: string; instructions: string }> =
  {
    sendgrid: {
      snippet: `// Add these headers to your SendGrid API call:
{
  "headers": {
    "List-Unsubscribe": "<{unsubscribeUrl}>, <mailto:unsubscribe@{domain}>",
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
  }
}

// Or in the SendGrid Node.js SDK:
const msg = {
  headers: {
    'List-Unsubscribe': '<{unsubscribeUrl}>, <mailto:unsubscribe@{domain}>',
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  }
}`,
      instructions:
        "In SendGrid: Go to Settings → Unsubscribe Groups for managed unsubscribes, " +
        "or add the headers directly in your API call as shown above.",
    },

    mailgun: {
      snippet: `// Add these headers to your Mailgun API call:
{
  "h:List-Unsubscribe": "<{unsubscribeUrl}>, <mailto:unsubscribe@{domain}>",
  "h:List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
}

// Or with the Mailgun Node.js SDK:
const messageData = {
  'h:List-Unsubscribe': '<{unsubscribeUrl}>, <mailto:unsubscribe@{domain}>',
  'h:List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
}`,
      instructions:
        "In Mailgun: Add custom headers using the h: prefix in your API call. " +
        "Go to Sending → Domains → [your domain] → Settings to enable tracking.",
    },

    google_workspace: {
      snippet: `// For Google Workspace (Gmail) custom SMTP or API:
// Add these headers to your email message:

List-Unsubscribe: <{unsubscribeUrl}>, <mailto:unsubscribe@{domain}>
List-Unsubscribe-Post: List-Unsubscribe=One-Click

// In Nodemailer:
const mailOptions = {
  headers: {
    'List-Unsubscribe': '<{unsubscribeUrl}>, <mailto:unsubscribe@{domain}>',
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  }
}`,
      instructions:
        "In Google Workspace: Add these headers through your sending application. " +
        "Google Workspace SMTP does not support header injection directly — " +
        "use the Gmail API or your sending library (Nodemailer, etc.) instead.",
    },

    amazon_ses: {
      snippet: `// For Amazon SES using the AWS SDK:
const params = {
  Message: {
    Headers: [
      {
        Name: 'List-Unsubscribe',
        Value: '<{unsubscribeUrl}>, <mailto:unsubscribe@{domain}>'
      },
      {
        Name: 'List-Unsubscribe-Post',
        Value: 'List-Unsubscribe=One-Click'
      }
    ]
  }
}

// For SES via SMTP, add raw headers:
List-Unsubscribe: <{unsubscribeUrl}>, <mailto:unsubscribe@{domain}>
List-Unsubscribe-Post: List-Unsubscribe=One-Click`,
      instructions:
        "In Amazon SES: Add custom headers in the SendRawEmail or SendEmail API call. " +
        "Go to SES Console → Configuration → Sending to enable the feature.",
    },

    microsoft_365: {
      snippet: `// For Microsoft 365 / Outlook using Microsoft Graph API:
const message = {
  internetMessageHeaders: [
    {
      name: 'List-Unsubscribe',
      value: '<{unsubscribeUrl}>, <mailto:unsubscribe@{domain}>'
    },
    {
      name: 'List-Unsubscribe-Post',
      value: 'List-Unsubscribe=One-Click'
    }
  ]
}

// For SMTP, add raw headers before the message body:
List-Unsubscribe: <{unsubscribeUrl}>, <mailto:unsubscribe@{domain}>
List-Unsubscribe-Post: List-Unsubscribe=One-Click`,
      instructions:
        "In Microsoft 365: Use the Graph API to add custom headers, " +
        "or add them directly in your SMTP application.",
    },

    postmark: {
      snippet: `// For Postmark using the API:
{
  "Headers": [
    {
      "Name": "List-Unsubscribe",
      "Value": "<{unsubscribeUrl}>, <mailto:unsubscribe@{domain}>"
    },
    {
      "Name": "List-Unsubscribe-Post",
      "Value": "List-Unsubscribe=One-Click"
    }
  ]
}`,
      instructions:
        "In Postmark: Add custom headers in your API call under the Headers array. " +
        "Go to your Server → Message Streams to manage unsubscribe settings.",
    },

    brevo: {
      snippet: `// For Brevo (Sendinblue) using the API:
{
  "headers": {
    "List-Unsubscribe": "<{unsubscribeUrl}>, <mailto:unsubscribe@{domain}>",
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
  }
}`,
      instructions:
        "In Brevo: Add custom headers in your API call. " +
        "Go to Settings → Senders & IP → Domains to manage your domain settings.",
    },
  };

// ─────────────────────────────────────────────
// MAIN FUNCTION
// ─────────────────────────────────────────────

export async function generateHeaderSnippet(
  request: SnippetRequest,
  tenantId: string,
): Promise<SnippetResult> {
  // Check if we have a pre-built template for this ESP
  const template = ESP_TEMPLATES[request.esp];

  if (template) {
    // Use the template — fast and free (no AI call needed)
    const snippet = template.snippet
      // Replace placeholder variables with actual values
      .replace(/\{unsubscribeUrl\}/g, request.unsubscribeUrl)
      .replace(/\{domain\}/g, request.domain);

    return {
      snippet,
      instructions: template.instructions,
      // Tell the client this came from a template not AI
      source: "template",
    };
  }

  // No template found — use AI to generate configuration
  // This handles unknown ESPs and custom SMTP setups
  return generateSnippetWithAi(request, tenantId);
}

// ─────────────────────────────────────────────
// AI FALLBACK FOR UNKNOWN ESPs
// ─────────────────────────────────────────────

async function generateSnippetWithAi(
  request: SnippetRequest,
  tenantId: string,
): Promise<SnippetResult> {
  const prompt = `Generate List-Unsubscribe header configuration for an email sender.

ESP/Platform: ${request.esp}
Domain: ${request.domain}
One-click unsubscribe URL: ${request.unsubscribeUrl}
Use case: ${request.useCase}

Generate:
1. The exact code or configuration to add List-Unsubscribe and List-Unsubscribe-Post headers
2. Where to add it in this specific platform

Requirements:
- List-Unsubscribe must include BOTH a URL and a mailto: address
- List-Unsubscribe-Post must be exactly: List-Unsubscribe=One-Click
- This is required for RFC 8058 compliance (Gmail and Yahoo bulk sender requirement)

Respond with ONLY a JSON object:
{
  "snippet": "the code or configuration to copy-paste",
  "instructions": "where to add it in the platform (1-2 sentences)"
}`;

  try {
    const result = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });
    const responseText = result.text ?? "";

    // Log usage
    const usage = result.usageMetadata;
    await logSnippetUsage({
      tenantId,
      inputTokens: usage?.promptTokenCount,
      outputTokens: usage?.candidatesTokenCount,
    });

    // Parse the JSON response
    const cleaned = responseText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    return {
      snippet: parsed.snippet || "Could not generate snippet",
      instructions: parsed.instructions || "",
      source: "ai",
    };
  } catch (err: any) {
    console.error("[AI] Snippet generator failed:", err.message);

    // Return a generic fallback if AI fails
    return {
      snippet:
        `// Add these headers to your outgoing emails:\n` +
        `List-Unsubscribe: <${request.unsubscribeUrl}>, <mailto:unsubscribe@${request.domain}>\n` +
        `List-Unsubscribe-Post: List-Unsubscribe=One-Click`,
      instructions:
        `Add these two headers to every marketing or bulk email you send from ${request.domain}. ` +
        `Consult your email platform's documentation for how to add custom headers.`,
      source: "ai",
    };
  }
}

async function logSnippetUsage(data: {
  tenantId: string;
  inputTokens?: number;
  outputTokens?: number;
}) {
  try {
    const { default: db } = await import("../../db");
    const cost =
      ((data.inputTokens || 0) / 1_000_000) * 0.075 +
      ((data.outputTokens || 0) / 1_000_000) * 0.3;

    await db.aiUsageLog.create({
      data: {
        tenantId: data.tenantId,
        feature: "snippet_generator",
        model: "gemini-2.0-flash",
        inputTokens: data.inputTokens,
        outputTokens: data.outputTokens,
        costUsd: cost,
      },
    });
  } catch (err: any) {
    console.error("[AI] Failed to log snippet usage:", err.message);
  }
}
