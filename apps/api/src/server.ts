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
import { alertRoutes } from "./modules/alerts/alerts.routes";
import {
  billingRoutes,
  billingWebhookRoutes,
} from "./modules/billing/billing.routes";
import { clerkWebhookRoutes } from "./modules/auth/clerk-webhook.routes";
import {
  suppressionRoutes,
  internalSuppressionRoutes,
} from "./modules/suppression/suppression.routes";
import { analyticsRoutes } from "./modules/analytics/analytics.routes";

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
  // RAW BODY CAPTURE
  // Replace the default JSON parser with one that also keeps the raw payload
  // string on request.rawBody. Webhook routes (Lemon Squeezy, Clerk/svix) must
  // verify provider signatures against the EXACT bytes that were signed — a
  // re-serialized JSON.stringify(request.body) does not reliably reproduce
  // key order / whitespace / unicode escaping, so it can reject valid hooks.
  // ─────────────────────────────────────────────
  app.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (_req, body: string, done) => {
      try {
        const json = body.length ? JSON.parse(body) : {};
        (_req as { rawBody?: string }).rawBody = body;
        done(null, json);
      } catch (err) {
        done(err as Error, undefined);
      }
    },
  );

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

  // Prevents API abuse — 100 requests per minute per IP.
  //
  // The store is environment-aware, mirroring the CORS split above:
  //   • production  → Redis-backed, so the limit is shared across every API
  //     instance Railway runs.
  //   • development → in-memory (omit `redis`). A single dev process does not
  //     need a *distributed* limit, and the Redis-backed limiter ran an Upstash
  //     command on EVERY request before any handler — which (a) added a remote
  //     round-trip to each request's latency and (b) burned the Upstash
  //     free-tier command budget that the BullMQ workers also draw from (the
  //     "temporarily rate-limited" errors). In-memory is strictly better here.
  const useRedisRateLimit = process.env.NODE_ENV === "production";
  await app.register(rateLimit, {
    ...(useRedisRateLimit ? { redis } : {}),
    max: 100,
    timeWindow: "1 minute",
    // Fail OPEN if Redis is unreachable/rate-limited: allow the request through
    // rather than 500-ing every endpoint (including /health). Without this, an
    // upstream Redis outage takes the entire API down, because the limiter runs
    // a Redis command on every request before any route handler.
    skipOnError: true,
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

  // Suppression internal routes (called by the Cloudflare Worker)
  // (it uses its own internal key auth, not Clerk). This plugin contains
  // ONLY POST /internal/unsubscribe — no tenant-scoped routes.
  app.register(internalSuppressionRoutes, { prefix: "" });

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

      // Suppression list routes
      protectedApp.register(suppressionRoutes, { prefix: "/suppression" });

      // Alert management routes
      protectedApp.register(alertRoutes, { prefix: "/alerts" });

      // Billing routes
      protectedApp.register(billingRoutes, { prefix: "/billing" });

      // Analytics routes
      protectedApp.register(analyticsRoutes, { prefix: "/analytics" });
    },
    { prefix: "/api/v1" },
  );

  // ── Outside protected routes (public webhook) ──
  app.register(billingWebhookRoutes);
  app.register(clerkWebhookRoutes);

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
    //
    // Gated behind RUN_WORKERS_INLINE so dev can run the HTTP API WITHOUT the
    // workers + scheduler. Running all three against one Upstash instance is
    // what exhausts its per-command rate limit (BullMQ polls constantly). To
    // work on the API alone: leave RUN_WORKERS_INLINE unset and, if you need
    // jobs processed, run `pnpm workers` in a second terminal. Set
    // RUN_WORKERS_INLINE=true to keep the old all-in-one-process behavior.
    // ─────────────────────────────────────────────
    if (process.env.RUN_WORKERS_INLINE === "true") {
      // Processes DNS scan jobs from the queue
      createDnsPollWorker();

      // Processes alert notification jobs from the queue
      createAlertDispatchWorker();

      // Adds DNS scan jobs to the queue on a schedule
      await runScheduler();

      console.log("   Background workers: running inline");
    } else {
      console.log(
        "   Background workers: DISABLED (set RUN_WORKERS_INLINE=true or run `pnpm workers`)",
      );
    }
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();
