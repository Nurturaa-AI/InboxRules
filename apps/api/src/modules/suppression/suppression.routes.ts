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

export async function suppressionRoutes(app: FastifyInstance) {
  // ─────────────────────────────────────────────
  // POST /internal/unsubscribe
  // Called by the Cloudflare Worker — not by users directly
  // Verified by internal API key header
  // ─────────────────────────────────────────────
  app.post("/internal/unsubscribe", async (request, reply) => {
    // Verify the internal API key
    // This prevents anyone from calling this endpoint directly
    const internalKey = request.headers["x-internal-key"];

    if (internalKey !== process.env.INTERNAL_API_KEY) {
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

  // ─────────────────────────────────────────────
  // GET /api/v1/suppression
  // List suppression events for the current tenant
  // ─────────────────────────────────────────────
  app.get("/", async (request, reply) => {
    const tenantId = request.tenantId;

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
