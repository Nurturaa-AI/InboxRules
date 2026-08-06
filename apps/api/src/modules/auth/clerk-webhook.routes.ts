// Receives Clerk webhooks when users sign up or are deleted.
// Creates/removes our user and tenant records accordingly.
//
// Set up in Clerk dashboard:
// Webhooks → Add Endpoint → http://your-api.railway.app/webhooks/clerk
// Events to listen for: user.created, user.deleted

import { FastifyInstance } from "fastify";
import { Webhook } from "svix";
import db from "../../db";

export async function clerkWebhookRoutes(app: FastifyInstance) {
  app.post("/webhooks/clerk", async (request, reply) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("[Clerk Webhook] CLERK_WEBHOOK_SECRET is not set");
      return reply.status(500).send({ error: "Webhook secret not configured" });
    }

    // Get Svix headers for signature verification
    const svixId = request.headers["svix-id"] as string;
    const svixTimestamp = request.headers["svix-timestamp"] as string;
    const svixSignature = request.headers["svix-signature"] as string;

    if (!svixId || !svixTimestamp || !svixSignature) {
      return reply.status(400).send({ error: "Missing svix headers" });
    }

    // Verify against the EXACT raw payload that was signed, not a
    // re-serialized body (see the content-type parser in server.ts).
    const rawBody = request.rawBody ?? "";

    if (!rawBody) {
      return reply.status(400).send({ error: "Missing request body" });
    }

    // Verify the webhook signature using Svix
    const wh = new Webhook(webhookSecret);
    let event: any;

    try {
      event = wh.verify(rawBody, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      });
    } catch (err) {
      return reply.status(400).send({ error: "Invalid webhook signature" });
    }

    const eventType = event.type;

    // ── User Created ──
    if (eventType === "user.created") {
      const {
        id: clerkId,
        email_addresses: emailAddresses,
        first_name: firstName,
        last_name: lastName,
      } = event.data;

      const primaryEmail = emailAddresses?.find(
        (e: any) => e.id === event.data.primary_email_address_id,
      )?.email_address;

      if (!primaryEmail) {
        console.error("[Clerk Webhook] No primary email for user:", clerkId);
        return reply.status(400).send({ error: "No primary email found" });
      }

      try {
        // Create tenant first
        const tenant = await db.tenant.create({
          data: {
            name: firstName
              ? `${firstName}${lastName ? " " + lastName : ""}'s Workspace`
              : primaryEmail.split("@")[0] + "'s Workspace",
            plan: "free",
          },
        });

        // Create the user linked to the tenant
        await db.user.create({
          data: {
            clerkId,
            email: primaryEmail,
            tenantId: tenant.id,
            role: "owner",
          },
        });

        // Write audit log
        await db.auditLog.create({
          data: {
            tenantId: tenant.id,
            action: "user.created",
            metadata: { clerkId, email: primaryEmail } as any,
          },
        });

        console.log(
          `[Clerk Webhook] Created user and tenant for ${primaryEmail}`,
        );
      } catch (err: any) {
        // If user already exists, that's fine — just log it
        if (err.code === "P2002") {
          console.log(
            `[Clerk Webhook] User ${clerkId} already exists — skipping`,
          );
        } else {
          console.error("[Clerk Webhook] Failed to create user:", err.message);
          return reply.status(500).send({ error: "Failed to create user" });
        }
      }
    }

    // ── User Deleted ──
    if (eventType === "user.deleted") {
      const { id: clerkId } = event.data;

      // Look up the user to find their tenant before soft-deleting
      const user = await db.user.findFirst({
        where: { clerkId },
        select: { id: true, tenantId: true, role: true },
      });

      if (!user) {
        console.log(`[Clerk Webhook] User ${clerkId} not found — already deleted`);
        return reply.status(200).send({ received: true });
      }

      // Soft-delete the user
      await db.user.updateMany({
        where: { clerkId },
        data: { deletedAt: new Date() },
      });

      // If this was the owner of the tenant, cascade soft-delete the tenant
      // and all its domains. A tenant without an owner is orphaned and can't
      // be accessed or managed. In a multi-user future, this would check if
      // other owners remain; for now every tenant has exactly one owner.
      if (user.role === "owner") {
        await db.tenant.update({
          where: { id: user.tenantId },
          data: { deletedAt: new Date() },
        });

        // Soft-delete all domains belonging to this tenant
        await db.domain.updateMany({
          where: { tenantId: user.tenantId },
          data: { deletedAt: new Date() },
        });

        console.log(
          `[Clerk Webhook] Soft deleted user ${clerkId}, tenant ${user.tenantId}, and its domains`,
        );
      } else {
        console.log(`[Clerk Webhook] Soft deleted user ${clerkId}`);
      }
    }

    return reply.status(200).send({ received: true });
  });
}
