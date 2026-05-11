// src/server.ts
//
// This is the entry point for the Fastify application.
// It sets up all plugins, middleware, and routes,
// then starts listening for HTTP requests.

import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { domainRoutes } from "./modules/domains/domains.routes";
import { authMiddleware } from "./middleware/auth";
import redis from "./redis";

// Create the Fastify app instance
const app = Fastify({
  // Enable built-in structured JSON logging
  logger: {
    // In development, use pretty-printed logs for readability
    // In production, use compact JSON logs for log aggregation tools
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

  // Helmet adds security headers to every response
  // e.g. X-Content-Type-Options, X-Frame-Options
  await app.register(helmet);

  // CORS allows the Next.js frontend to make requests to this API
  await app.register(cors, {
    // In development, allow all origins
    // In production, only allow your frontend domain
    origin:
      process.env.NODE_ENV === "development"
        ? true
        : process.env.FRONTEND_URL || "https://inboxrules.io",

    // Allow these HTTP methods
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

    // Allow the Authorization header (needed for our JWT auth)
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  // Rate limiting prevents API abuse
  await app.register(rateLimit, {
    // Use Redis to store rate limit counters
    // This means limits are shared across multiple server instances
    redis,

    // Default: 100 requests per minute per IP
    max: 100,
    timeWindow: "1 minute",

    // Custom error message when rate limit is hit
    errorResponseBuilder: () => ({
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message:
          "Too many requests. Please slow down and try again in a minute.",
      },
    }),
  });

  // ─────────────────────────────────────────────
  // HEALTH CHECK (no auth required)
  // Used by Railway/Vercel to check if the server is running
  // ─────────────────────────────────────────────
  app.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
  }));

  // ─────────────────────────────────────────────
  // AUTHENTICATED ROUTES
  // All routes under /api/v1 require a valid Clerk token
  // ─────────────────────────────────────────────
  app.register(
    async (protectedApp) => {
      // Run auth middleware before every route in this scope
      protectedApp.addHook("preHandler", authMiddleware);

      // Register domain routes at /api/v1/domains
      protectedApp.register(domainRoutes, { prefix: "/domains" });
    },
    // All protected routes are prefixed with /api/v1
    { prefix: "/api/v1" },
  );

  // ─────────────────────────────────────────────
  // GLOBAL ERROR HANDLER
  // Catches any unhandled errors and returns a clean response
  // ─────────────────────────────────────────────
  app.setErrorHandler((error, request, reply) => {
    // Log the full error internally
    app.log.error({
      err: error,
      requestId: request.id,
      url: request.url,
      method: request.method,
    });

    // Never expose internal error details to clients
    return reply.status(500).send({
      error: {
        code: "INTERNAL_ERROR",
        message: "Something went wrong. Please try again.",
        // Include request ID so the user can reference it in support
        requestId: request.id,
      },
    });
  });

  return app;
}

// Start the server
async function start() {
  try {
    const server = await buildApp();

    const port = parseInt(process.env.PORT || "4500", 10);

    await server.listen({
      port,
      // Listen on all network interfaces
      // '0.0.0.0' is required for Docker and Railway deployments
      host: "0.0.0.0",
    });

    console.log(`InboxRules API running on port ${port}`);
    console.log(`   Health check: http://localhost:${port}/health`);
    console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
  } catch (err) {
    console.error(" Failed to start server:", err);
    process.exit(1);
  }
}

start();
