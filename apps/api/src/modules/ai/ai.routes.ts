// src/modules/ai/ai.routes.ts
//
// HTTP routes that expose the AI features to the frontend.
// The header analyzer uses Server-Sent Events (SSE) to stream
// the AI response token by token as it is generated.
// The other endpoints return regular JSON responses.

import { FastifyInstance } from "fastify";
import { z } from "zod";
import { checkDomain } from "../dns-checker/dns.service";
import { analyzeEmailHeaders } from "./header-analyzer";
import { generateHeaderSnippet } from "./snippet-generator";
import { assertAiQuota, AiQuotaExceededError } from "./ai-quota";

export async function aiRoutes(app: FastifyInstance) {
  // ─────────────────────────────────────────────
  // POST /api/v1/ai/analyze
  // Analyze a domain's DNS and stream an AI explanation
  //
  // The client receives a stream of text chunks via SSE.
  // The UI can display these as they arrive for a real-time feel.
  // ─────────────────────────────────────────────
  app.post("/analyze", async (request, reply) => {
    // Validate the request body
    const schema = z.object({
      domain: z
        .string()
        .min(1)
        .max(253)
        .trim()
        .toLowerCase()
        .refine(
          (val) => !val.includes("http") && val.includes("."),
          "Please enter a valid domain name",
        ),
    });

    const parseResult = schema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: parseResult.error.issues[0]?.message || "Invalid domain",
        },
      });
    }

    const { domain } = parseResult.data;
    const tenantId = request.tenantId;

    // Enforce the per-tenant monthly AI budget BEFORE opening the SSE stream,
    // so an over-quota tenant gets a clean 429 JSON response rather than a
    // half-open event stream. (Checked here, not deeper, because once the SSE
    // head is written we can no longer set an HTTP status code.)
    try {
      await assertAiQuota(tenantId);
    } catch (err) {
      if (err instanceof AiQuotaExceededError) {
        return reply.status(429).send({
          error: {
            code: "AI_QUOTA_EXCEEDED",
            message:
              "Monthly AI usage limit reached for your plan. Upgrade to continue.",
          },
        });
      }
      throw err;
    }

    // Set headers for Server-Sent Events (SSE)
    // This tells the browser to keep the connection open
    // and read data as it arrives
    const origin = request.headers.origin || "";
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      // Inherit the origin-restricted CORS already configured in server.ts,
      // rather than hardcoding * (which is inconsistent and needlessly broad).
      "Access-Control-Allow-Origin": origin,
    });

    try {
      // Step 1 — Run the deterministic DNS check first
      // Send these results immediately so the user sees
      // the pass/fail checklist before AI starts generating
      const dnsResult = await checkDomain(domain);

      // Send the structured results as the first SSE event
      // The client renders the checklist from this data
      reply.raw.write(
        `event: dns_result\n` + `data: ${JSON.stringify(dnsResult)}\n\n`,
      );

      // Step 2 — Stream the AI analysis token by token
      // Each token is sent as a separate SSE event
      const aiStream = analyzeEmailHeaders(dnsResult, tenantId);

      for await (const token of aiStream) {
        // Each SSE message has this format:
        // event: <event name>
        // data: <data>
        // <blank line>
        reply.raw.write(
          `event: ai_token\n` + `data: ${JSON.stringify({ token })}\n\n`,
        );
      }

      // Send a done event so the client knows the stream is complete
      reply.raw.write(`event: done\ndata: {}\n\n`);
    } catch (err: any) {
      // Send an error event if something goes wrong mid-stream
      reply.raw.write(
        `event: error\n` +
          `data: ${JSON.stringify({ message: "Analysis failed. Please try again." })}\n\n`,
      );
    } finally {
      // Always close the connection when done
      reply.raw.end();
    }
  });

  // ─────────────────────────────────────────────
  // POST /api/v1/ai/snippet
  // Generate List-Unsubscribe header configuration
  // for a specific ESP
  // ─────────────────────────────────────────────
  app.post("/snippet", async (request, reply) => {
    const schema = z.object({
      // Which ESP the domain uses
      esp: z.string().min(1).max(100),

      // The domain to generate the snippet for
      domain: z.string().min(1).max(253),

      // The hosted unsubscribe URL from InboxRules
      unsubscribeUrl: z.string().url("Must be a valid URL"),

      // What kind of email they are sending
      useCase: z
        .enum(["marketing", "transactional", "cold_outreach"])
        .default("marketing"),
    });

    const parseResult = schema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input",
          details: parseResult.error.issues,
        },
      });
    }

    const tenantId = request.tenantId;

    try {
      const result = await generateHeaderSnippet(parseResult.data, tenantId);

      return reply.status(200).send({ data: result });
    } catch (err: any) {
      if (err instanceof AiQuotaExceededError) {
        return reply.status(429).send({
          error: {
            code: "AI_QUOTA_EXCEEDED",
            message:
              "Monthly AI usage limit reached for your plan. Upgrade to continue.",
          },
        });
      }
      app.log.error({ err, tenantId }, "Snippet generation failed");
      return reply.status(500).send({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to generate snippet. Please try again.",
        },
      });
    }
  });
}
