// src/modules/suppression/suppression.routes.ts
//
// Internal route called by the Cloudflare Worker when
// an unsubscribe event is received.
//
// Also includes the public suppression list management routes
// for the dashboard.

import { FastifyInstance } from "fastify";
import crypto from "crypto";
import db from "../../db";

// tenantId / userId are attached by authMiddleware. This augmentation must
// match the one in src/types/fastify.d.ts exactly (same property types) so the
// declarations merge rather than conflict. It is repeated here because the
// unsub worker's tsconfig compiles this file without that .d.ts in scope.
declare module "fastify" {
  interface FastifyRequest {
    tenantId: string;
    userId: string;
  }
}


// ─────────────────────────────────────────────
// INTERNAL routes — mounted at the ROOT scope, NOT behind Clerk auth.
// This plugin MUST NOT contain any tenant-scoped routes: it is registered
// without the authMiddleware preHandler, so any route here is public.
// Authentication is the static x-internal-key header only.
// ─────────────────────────────────────────────
export async function internalSuppressionRoutes(app: FastifyInstance) {
  // ─────────────────────────────────────────────
  // POST /internal/unsubscribe
  // Called by the Cloudflare Worker — not by users directly
  // Verified by internal API key header
  // ─────────────────────────────────────────────
  app.post("/internal/unsubscribe", async (request, reply) => {
    // Verify the internal API key using constant-time comparison to guard
    // against timing attacks. High-entropy keys make remote timing impractical,
    // but crypto.timingSafeEqual is a trivial hardening with zero cost.
    const internalKeyHeader = request.headers["x-internal-key"];
    const expectedKey = process.env.INTERNAL_API_KEY;

    // Fastify headers can be string | string[] — take the first if it's an array.
    const internalKey = Array.isArray(internalKeyHeader)
      ? internalKeyHeader[0]
      : internalKeyHeader;

    if (!internalKey || !expectedKey) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    // Both must be the same length for timingSafeEqual to accept them.
    if (internalKey.length !== expectedKey.length) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const keyBuffer = Buffer.from(internalKey);
    const expectedBuffer = Buffer.from(expectedKey);

    if (!crypto.timingSafeEqual(keyBuffer, expectedBuffer)) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const body = request.body as {
      token: string;
      method: string;
      processedAt: string;
    };

    if (!body.token) {
      return reply.status(400).send({ error: "Token is required" });
    }

    // Look up the token in the database
    // We store the hash of the token, not the token itself
    const tokenHash = crypto
      .createHash("sha256")
      .update(body.token)
      .digest("hex");

    const tokenRecord = await db.unsubscribeToken.findUnique({
      where: { tokenHash },
    });

    if (!tokenRecord) {
      // Token not found — return 200 anyway
      // We do not want to reveal which tokens are valid
      return reply.status(200).send({ success: true });
    }

    // Check if this token has already been used
    if (tokenRecord.usedAt) {
      // Already processed — return success (idempotent)
      return reply.status(200).send({ success: true, alreadyProcessed: true });
    }

    // Mark the token as used so it cannot be used again
    await db.unsubscribeToken.update({
      where: { tokenHash },
      data: { usedAt: new Date() },
    });

    // Record the suppression event
    // We store the SHA-256 hash of the recipient email
    // The recipient email itself is in the token record as a hash already
    await db.suppressionEvent.create({
      data: {
        tenantId: tokenRecord.tenantId,
        domainId: tokenRecord.domainId,
        // Use the recipient hash from the token record
        emailHash: tokenRecord.recipientHash,
        eventType: "unsubscribe",
        // Record how they unsubscribed
        sourceEsp: body.method,
        occurredAt: new Date(body.processedAt),
      },
    });

    return reply.status(200).send({ success: true });
  });
}

// ─────────────────────────────────────────────
// TENANT routes — mounted ONLY under /api/v1/suppression, behind Clerk auth.
// Every route here relies on request.tenantId being set by authMiddleware.
// Never register this plugin at the root scope (see incident C1: doing so
// exposed the list below with an undefined tenantId, which Prisma treats as
// "no filter" — leaking every tenant's suppression events).
// ─────────────────────────────────────────────
export async function suppressionRoutes(app: FastifyInstance) {
  // ─────────────────────────────────────────────
  // GET /api/v1/suppression
  // List suppression events for the current tenant
  // ─────────────────────────────────────────────
  app.get("/", async (request, reply) => {
    const tenantId = request.tenantId;

    // Defence in depth: authMiddleware should always set this, but if this
    // plugin is ever mounted outside the protected scope a missing tenantId
    // must fail closed rather than query across all tenants.
    if (!tenantId) {
      return reply.status(401).send({
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    const query = request.query as {
      limit?: string;
      cursor?: string;
      domainId?: string;
    };

    const limit = Math.min(parseInt(query.limit || "50", 10), 100);

    const where: any = {
      tenantId,
      // Filter by domain if provided
      ...(query.domainId ? { domainId: query.domainId } : {}),
      // Cursor pagination
      ...(query.cursor ? { id: { gt: query.cursor } } : {}),
    };

    const events = await db.suppressionEvent.findMany({
      where,
      take: limit + 1,
      orderBy: { occurredAt: "desc" },
      select: {
        id: true,
        eventType: true,
        sourceEsp: true,
        occurredAt: true,
        processedAt: true,
        // Include domain name for display
        domain: {
          select: { domain: true },
        },
      },
    });

    const hasNextPage = events.length > limit;
    const items = hasNextPage ? events.slice(0, limit) : events;

    return reply.status(200).send({
      data: items,
      pagination: {
        hasNextPage,
        nextCursor: hasNextPage ? items[items.length - 1]?.id : null,
        total: await db.suppressionEvent.count({ where: { tenantId } }),
      },
    });
  });
}
