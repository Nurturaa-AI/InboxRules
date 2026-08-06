import { FastifyInstance } from "fastify";
import crypto from "crypto";
import db from "../../db";
import {
  getSubscription,
  createCheckout,
  getCustomerPortalUrl,
  handleWebhook,
  getUsageMetrics,
} from "./billing.service";

export async function billingRoutes(app: FastifyInstance) {
  // ─────────────────────────────────────────────
  // GET /api/v1/billing
  // Get current subscription and usage
  // ─────────────────────────────────────────────
  app.get("/", async (request, reply) => {
    const tenantId = request.tenantId;

    try {
      const [subscription, usage] = await Promise.all([
        getSubscription(tenantId),
        getUsageMetrics(tenantId),
      ]);

      return reply.status(200).send({
        data: { subscription, usage },
      });
    } catch (err: unknown) {
      app.log.error({ err, tenantId }, "Failed to get billing info");
      return reply.status(500).send({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch billing info",
        },
      });
    }
  });

  // ─────────────────────────────────────────────
  // POST /api/v1/billing/checkout
  // Create a Lemon Squeezy checkout session
  // Returns a URL to redirect the user to
  // ─────────────────────────────────────────────
  app.post("/checkout", async (request, reply) => {
    const tenantId = request.tenantId;

    const body = request.body as { plan: string };

    if (!body.plan || !["pro", "agency"].includes(body.plan)) {
      return reply.status(400).send({
        error: {
          code: "INVALID_PLAN",
          message: 'Plan must be "pro" or "agency"',
        },
      });
    }

    try {
      // Get the user's email for the checkout
      const user = await db.user.findFirst({
        where: { id: request.userId },
      });

      const checkoutUrl = await createCheckout(
        tenantId,
        body.plan as "pro" | "agency",
        user?.email || "customer@example.com",
      );

      return reply.status(200).send({
        data: { checkoutUrl },
      });
    } catch (err: unknown) {
      app.log.error({ err, tenantId }, "Failed to create checkout");
      return reply.status(500).send({
        error: {
          code: "CHECKOUT_FAILED",
          message:
            (err as Error).message || "Failed to create checkout session",
        },
      });
    }
  });

  // ─────────────────────────────────────────────
  // POST /api/v1/billing/portal
  // Get the Lemon Squeezy customer portal URL
  // ─────────────────────────────────────────────
  app.post("/portal", async (request, reply) => {
    const tenantId = request.tenantId;

    try {
      const portalUrl = await getCustomerPortalUrl(tenantId);

      if (!portalUrl) {
        return reply.status(400).send({
          error: {
            code: "NO_SUBSCRIPTION",
            message: "No active subscription found. Please upgrade first.",
          },
        });
      }

      return reply.status(200).send({
        data: { portalUrl },
      });
    } catch (err: unknown) {
      app.log.error({ err, tenantId }, "Failed to get portal URL");
      return reply.status(500).send({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to get billing portal",
        },
      });
    }
  });

  // ─────────────────────────────────────────────
  // GET /api/v1/billing/usage
  // Get detailed usage metrics for the current month
  // ─────────────────────────────────────────────
  app.get("/usage", async (request, reply) => {
    const tenantId = request.tenantId;

    try {
      const usage = await getUsageMetrics(tenantId);
      return reply.status(200).send({ data: usage });
    } catch (err: unknown) {
      app.log.error({ err, tenantId }, "Failed to get usage metrics");
      return reply.status(500).send({
        error: {
          code: "INTERNAL_ERROR",
          message: (err as Error).message || "Failed to get usage metrics",
        },
      });
    }
  });
}

// ─────────────────────────────────────────────
// LEMON SQUEEZY WEBHOOK HANDLER
// This route is PUBLIC — no auth required
// But we verify the signature to ensure it's genuine
// ─────────────────────────────────────────────

export async function billingWebhookRoutes(app: FastifyInstance) {
  app.post("/webhooks/billing", async (request, reply) => {
    // Verify against the EXACT raw payload that was signed, not a
    // re-serialized body (see the content-type parser in server.ts).
    const rawBody = request.rawBody ?? "";

    if (!rawBody) {
      return reply
        .status(400)
        .send({ error: { message: "Missing request body" } });
    }

    // Verify the webhook signature from Lemon Squeezy
    const signature = request.headers["x-signature"] as string;

    if (!signature) {
      return reply
        .status(401)
        .send({ error: { message: "Missing signature" } });
    }

    const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;

    if (!secret) {
      console.error("[Billing] LEMON_SQUEEZY_WEBHOOK_SECRET is not set");
      return reply
        .status(500)
        .send({ error: { message: "Webhook secret not configured" } });
    }

    // Compute expected signature using HMAC-SHA256
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    // Use timing-safe comparison to prevent timing attacks
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (signatureBuffer.length !== expectedBuffer.length) {
      return reply.status(401).send({
        error: "Invalid signature",
      });
    }

    const signaturesMatch = crypto.timingSafeEqual(
      signatureBuffer,
      expectedBuffer,
    );

    if (!signaturesMatch) {
      console.warn("[Billing] Invalid webhook signature");
      return reply
        .status(401)
        .send({ error: { message: "Invalid signature" } });
    }

    // Parse the event
    const body = request.body as any;
    const eventName = request.headers["x-event-name"] as string;

    if (!eventName) {
      return reply
        .status(400)
        .send({ error: { message: "Missing event name" } });
    }

    try {
      // Process the webhook asynchronously
      // We acknowledge immediately to avoid Lemon Squeezy timeout
      reply.status(200).send({ received: true });

      // Process after responding
      await handleWebhook(eventName, body);
    } catch (err: unknown) {
      console.error(
        "[Billing] Webhook processing error:",
        (err as Error).message,
      );
      // Already sent 200 — LS won't retry
    }
  });
}
