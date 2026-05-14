// src/server.ts
// Entry point for the Fastify API server.
// Also starts background workers in the same process during development.

import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { domainRoutes } from "./modules/domains/domains.routes";
import { authMiddleware } from "./middleware/auth";
import redis from "./redis";

// Worker imports — these run in the same process during development
import { createDnsPollWorker } from "./workers/dns-poll.worker";
import { createAlertDispatchWorker } from "./workers/alert-dispatch.worker";
import { runScheduler } from "./workers/scheduler";
import { aiRoutes } from "./modules/ai/ai.routes";

// Create the Fastify app instance
const app = Fastify({
  logger: {
    transport:
      process.env.NODE_ENV === "development"
        ? { target: "pino-pretty" }
        : undefined,
  },
});

async function buildApp() {
  // ─────────────────────────────────────────────
  // SECURITY PLUGINS
  // ─────────────────────────────────────────────

  // Adds security headers to every response
  await app.register(helmet);

  // Allows the Next.js frontend to call this API
  await app.register(cors, {
    origin:
      process.env.NODE_ENV === "development"
        ? true
        : process.env.FRONTEND_URL || "https://inboxrules.io",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  // Prevents API abuse — 100 requests per minute per IP
  await app.register(rateLimit, {
    redis,
    max: 100,
    timeWindow: "1 minute",
    errorResponseBuilder: () => ({
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message:
          "Too many requests. Please slow down and try again in a minute.",
      },
    }),
  });

  // ─────────────────────────────────────────────
  // HEALTH CHECK — no auth required
  // Used by Railway to verify the server is alive
  // ─────────────────────────────────────────────
  app.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
  }));

  // Add this AFTER the health check route and BEFORE the protected routes block
  // DELETE THIS before going to production

  app.post("/test/ai/snippet", async (request, reply) => {
    const { generateHeaderSnippet } =
      await import("./modules/ai/snippet-generator");

    const body = request.body as {
      esp: string;
      domain: string;
      unsubscribeUrl: string;
      useCase: string;
    };

    // Use a fake tenant ID for testing
    const result = await generateHeaderSnippet(
      {
        esp: body.esp || "sendgrid",
        domain: body.domain || "acme.com",
        unsubscribeUrl:
          body.unsubscribeUrl || "https://unsub.inboxrules.io/test",
        useCase: body.useCase || "marketing",
      },
      "test-tenant-id",
    );

    return reply.send({ data: result });
  });

  app.post("/test/ai/analyze", async (request, reply) => {
    const { checkDomain } = await import("./modules/dns-checker/dns.service");
    const { analyzeEmailHeaders } =
      await import("./modules/ai/header-analyzer");

    const body = request.body as { domain: string };
    const domain = body.domain || "github.com";

    // Set SSE headers
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    try {
      // Run DNS check
      const dnsResult = await checkDomain(domain);

      // Send structured results first
      reply.raw.write(
        `event: dns_result\n` + `data: ${JSON.stringify(dnsResult)}\n\n`,
      );

      // Stream AI analysis
      const aiStream = analyzeEmailHeaders(dnsResult, "test-tenant-id");

      for await (const token of aiStream) {
        reply.raw.write(
          `event: ai_token\n` + `data: ${JSON.stringify({ token })}\n\n`,
        );
      }

      reply.raw.write(`event: done\ndata: {}\n\n`);
    } catch (err: any) {
      reply.raw.write(
        `event: error\n` +
          `data: ${JSON.stringify({ message: err.message })}\n\n`,
      );
    } finally {
      reply.raw.end();
    }
  });

  // ─────────────────────────────────────────────
  // AUTHENTICATED ROUTES
  // All routes under /api/v1 require a valid Clerk token
  // ─────────────────────────────────────────────
  app.register(
    async (protectedApp) => {
      // Auth middleware runs before every route in this scope
      protectedApp.addHook("preHandler", authMiddleware);

      // Domain routes at /api/v1/domains
      protectedApp.register(domainRoutes, { prefix: "/domains" });

      // AI routes
      protectedApp.register(aiRoutes, { prefix: "/ai" });
    },
    { prefix: "/api/v1" },
  );

  // ─────────────────────────────────────────────
  // GLOBAL ERROR HANDLER
  // Catches unhandled errors and returns a clean response
  // ─────────────────────────────────────────────
  app.setErrorHandler((error, request, reply) => {
    app.log.error({
      err: error,
      requestId: request.id,
      url: request.url,
      method: request.method,
    });

    return reply.status(500).send({
      error: {
        code: "INTERNAL_ERROR",
        message: "Something went wrong. Please try again.",
        requestId: request.id,
      },
    });
  });

  return app;
}

// ─────────────────────────────────────────────
// START EVERYTHING
// ─────────────────────────────────────────────
async function start() {
  try {
    const server = await buildApp();

    const port = parseInt(process.env.PORT || "4500", 10);

    await server.listen({
      port,
      host: "0.0.0.0",
    });

    console.log(` InboxRules API running on port ${port}`);
    console.log(`   Health check: http://localhost:${port}/health`);
    console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);

    // ─────────────────────────────────────────────
    // START BACKGROUND WORKERS
    // These run in the same process as the HTTP server during development.
    // In production, extract these to a separate Railway service
    // by running: node dist/workers/index.js
    // ─────────────────────────────────────────────

    // Processes DNS scan jobs from the queue
    createDnsPollWorker();

    // Processes alert notification jobs from the queue
    createAlertDispatchWorker();

    // Adds DNS scan jobs to the queue on a schedule
    await runScheduler();
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();
