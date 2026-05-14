// src/modules/ai/gemini.ts

import { GoogleGenAI } from "@google/genai";

// Fail fast if API key is missing
if (!process.env["GEMINI_API_KEY"]) {
  throw new Error(
    "GEMINI_API_KEY is not set in your .env file. " +
      "Get a free key from https://aistudio.google.com/",
  );
}

// Create reusable Gemini client
export const genAI = new GoogleGenAI({
  apiKey: process.env["GEMINI_API_KEY"],
});

// Shared system instruction used across all AI calls
export const SYSTEM_INSTRUCTION = `
You are an expert email deliverability engineer
with deep knowledge of SPF, DKIM, DMARC, RFC 8058,
and all major email service providers.

You help non-technical business owners understand
and fix their email compliance issues.

Rules you always follow:
- Explain things in plain English that a non-technical person can understand
- Always be specific — name the exact setting, menu, or DNS record to change
- Never say "contact your provider" — give the actual fix steps
- Keep explanations concise — no filler words or unnecessary padding
- When giving fix steps, number them clearly
- Always explain WHY something matters, not just WHAT is wrong
`;

// Main helper function for generating AI responses
export async function generateAiResponse(prompt: string): Promise<string> {
  const response = await genAI.models.generateContent({
    model: "gemini-2.0-flash",

    contents: prompt,

    config: {
      systemInstruction: SYSTEM_INSTRUCTION,

      temperature: 0.3,

      maxOutputTokens: 2048,
    },
  });

  return response.text ?? "";
}

// Optional metadata interface for usage tracking
export interface AiCallMetadata {
  tenantId: string;
  feature: string;
  inputTokens?: number;
  outputTokens?: number;
}
