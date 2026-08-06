// src/modules/ai/header-analyzer.ts
//
// When a user sends a test email to their InboxRules inbox,
// this module takes the STRUCTURED results from our deterministic
// parser and asks Gemini to explain them in plain English.
//
// Gemini receives structured JSON only — never raw email headers.
// This is critical for security (prevents prompt injection)
// and for accuracy (structured data = better AI output).

import { genAI } from "./gemini";
import { DnsCheckResult } from "../dns-checker/dns.types";

// ─────────────────────────────────────────────
// STREAMING ANALYZER
// Returns an async generator that yields text tokens
// as Gemini generates them — enables real-time streaming to UI
// ─────────────────────────────────────────────

export async function* analyzeEmailHeaders(
  parsedResult: DnsCheckResult,
  tenantId: string,
): AsyncGenerator<string> {
  // Build a clean summary of results to send to Gemini
  // We extract only the relevant fields — not the entire result object
  const structuredSummary = {
    domain: parsedResult.domain,
    overallScore: parsedResult.overallScore,

    spf: {
      result: parsedResult.spf.result,
      lookupCount: parsedResult.spf.lookupCount,
      allMechanism: parsedResult.spf.allMechanism,
      // Only include issues — not the raw record text
      issues: parsedResult.spf.issues,
    },

    dkim: parsedResult.dkim.map((d) => ({
      selector: d.selector,
      valid: d.valid,
      keyType: d.keyType,
      keyBits: d.keyBits,
      // Only include issues — not the full record
      issues: d.issues,
    })),

    dmarc: {
      result: parsedResult.dmarc.result,
      policy: parsedResult.dmarc.policy,
      pct: parsedResult.dmarc.pct,
      hasReportingAddress: parsedResult.dmarc.ruaAddresses.length > 0,
      issues: parsedResult.dmarc.issues,
    },

    softFailures: parsedResult.softFailures,
  };

  const prompt = `You are analyzing the results of an email authentication check.
These results come from a verified technical analysis — treat them as accurate.

## Authentication Check Results
${JSON.stringify(structuredSummary, null, 2)}

## Your Task
Write a clear, helpful analysis for the domain owner.

Structure your response exactly like this:

### Overall Assessment
[1-2 sentences summarizing the overall health. Mention the score and what it means.]

### What Is Working Well
[List the things that are configured correctly. Be specific.]

### Issues Found
[For each issue, explain: what is wrong, why it matters for email delivery, and exactly how to fix it. Be specific and actionable.]

### Priority Actions
[List the 1-3 most important things to fix first, in order of urgency.]

Use plain English. Avoid jargon unless you explain it immediately.
Do not repeat information unnecessarily.
If everything is configured correctly, say so clearly and explain what each passing check means.`;

  try {
    // Use streaming so tokens appear in the UI as they are generated
    // The user sees the analysis building in real time
    const streamResult = await genAI.models.generateContentStream({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    // Capture usage from the stream itself. Gemini reports cumulative
    // usageMetadata on the chunks (populated on the final chunk), so we
    // keep the last non-empty value and log it once the stream ends —
    // no need for a second full generateContent call (which doubled both
    // latency and cost on every analysis).
    let usage: { promptTokenCount?: number; candidatesTokenCount?: number } | undefined;

    // Yield each text chunk as it arrives from Gemini
    for await (const chunk of streamResult) {
      if (chunk.usageMetadata) {
        usage = chunk.usageMetadata;
      }
      const text = chunk.text;
      if (text) {
        yield text;
      }
    }

    // Log usage after stream completes
    await logHeaderAnalysisUsage({
      tenantId,
      inputTokens: usage?.promptTokenCount,
      outputTokens: usage?.candidatesTokenCount,
    });
  } catch (err: any) {
    console.error("[AI] Header analyzer failed:", err.message);

    // If streaming fails, yield a fallback message
    // The user gets something rather than an empty screen
    yield buildFallbackAnalysis(parsedResult);
  }
}

// ─────────────────────────────────────────────
// FALLBACK
// Used when Gemini is unavailable
// ─────────────────────────────────────────────

function buildFallbackAnalysis(result: DnsCheckResult): string {
  const lines: string[] = [];

  lines.push(`### Overall Assessment`);
  lines.push(
    `Your domain scored ${result.overallScore}/100. ` +
      (result.overallScore >= 80
        ? "Good compliance overall."
        : result.overallScore >= 50
          ? "Some issues need attention."
          : "Critical issues found that are likely affecting email delivery."),
  );
  lines.push("");

  lines.push("### SPF");
  lines.push(`Status: ${result.spf.result.toUpperCase()}`);
  if (result.spf.issues.length > 0) {
    result.spf.issues.forEach((issue) => lines.push(`- ${issue}`));
  }
  lines.push("");

  lines.push("### DKIM");
  if (result.dkim.length === 0) {
    lines.push(
      "No DKIM selectors found. DKIM is required for good deliverability.",
    );
  } else {
    result.dkim.forEach((d) => {
      lines.push(
        `Selector ${d.selector}: ${d.valid ? "Valid" : "Invalid"}, ${d.keyBits}-bit ${d.keyType.toUpperCase()}`,
      );
    });
  }
  lines.push("");

  lines.push("### DMARC");
  lines.push(`Policy: ${result.dmarc.policy.toUpperCase()}`);
  if (result.dmarc.issues.length > 0) {
    result.dmarc.issues.forEach((issue) => lines.push(`- ${issue}`));
  }

  return lines.join("\n");
}

async function logHeaderAnalysisUsage(data: {
  tenantId: string;
  inputTokens?: number;
  outputTokens?: number;
}) {
  try {
    const { default: db } = await import("../../db");
    const inputCost = ((data.inputTokens || 0) / 1_000_000) * 0.075;
    const outputCost = ((data.outputTokens || 0) / 1_000_000) * 0.3;

    await db.aiUsageLog.create({
      data: {
        tenantId: data.tenantId,
        feature: "header_analyzer",
        model: "gemini-2.0-flash",
        inputTokens: data.inputTokens,
        outputTokens: data.outputTokens,
        costUsd: inputCost + outputCost,
      },
    });
  } catch (err: any) {
    console.error("[AI] Failed to log header analysis usage:", err.message);
  }
}
