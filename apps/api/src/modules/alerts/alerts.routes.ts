// REST endpoints for managing alerts:
// - List all change events for a tenant
// - Acknowledge / resolve an alert
// - Configure notification channels (Slack, email)
// - Test a notification channel

import { FastifyInstance } from "fastify";
import { z } from "zod";
import db from "../../db";
import { sendSlackAlert, sendAlertEmail } from "./alerts.service";

// Notification channel configuration is stored as a JSON blob on the tenant
// (Tenant.notificationChannels). This is the exact shape the settings UI
// reads and writes.
interface NotificationChannels {
  email: {
    enabled: boolean;
    address: string;
    onCritical: boolean;
    onWarning: boolean;
    weeklyReport: boolean;
  };
  slack: {
    enabled: boolean;
    webhookUrl: string | null;
    onCritical: boolean;
    onWarning: boolean;
  };
  webhook: { enabled: boolean; url: string | null };
}

// Defaults for a tenant that has never saved settings. The email address is
// intentionally blank — the frontend fills it from the signed-in user's Clerk
// email rather than us fabricating an address like "alerts@yourdomain.com".
const DEFAULT_NOTIFICATION_CHANNELS: NotificationChannels = {
  email: {
    enabled: true,
    address: "",
    onCritical: true,
    onWarning: true,
    weeklyReport: true,
  },
  slack: {
    enabled: false,
    webhookUrl: null,
    onCritical: true,
    onWarning: false,
  },
  webhook: { enabled: false, url: null },
};

export async function alertRoutes(app: FastifyInstance) {
  // ─────────────────────────────────────────────
  // GET /api/v1/alerts
  // List all change events for the current tenant
  // ─────────────────────────────────────────────
  app.get("/", async (request, reply) => {
    const tenantId = request.tenantId;

    const query = request.query as {
      status?: string; // "unresolved" | "resolved" | "all"
      severity?: string; // "critical" | "warning" | "info"
      domainId?: string;
      limit?: string;
      cursor?: string;
    };

    const limit = Math.min(parseInt(query.limit || "50", 10), 100);
    const status = query.status || "all";

    // Build where clause
    const where: any = { tenantId };

    if (status === "unresolved") {
      where.acknowledged = false;
      where.resolvedAt = null;
    } else if (status === "resolved") {
      where.resolvedAt = { not: null };
    }

    if (query.severity) {
      where.severity = query.severity;
    }

    if (query.domainId) {
      where.domainId = query.domainId;
    }

    if (query.cursor) {
      where.id = { lt: query.cursor };
    }

    try {
      const events = await db.dnsChangeEvent.findMany({
        where,
        take: limit + 1,
        orderBy: { detectedAt: "desc" },
        include: {
          // Include domain name for display
          domain: {
            select: { domain: true, detectedEsp: true },
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
          total: await db.dnsChangeEvent.count({ where: { tenantId } }),
        },
      });
    } catch (err: any) {
      app.log.error({ err, tenantId }, "Failed to list alerts");
      return reply.status(500).send({
        error: { code: "INTERNAL_ERROR", message: "Failed to fetch alerts" },
      });
    }
  });

  // ─────────────────────────────────────────────
  // GET /api/v1/alerts/:id
  // Get a single alert with full detail
  // ─────────────────────────────────────────────
  app.get("/:id", async (request, reply) => {
    const tenantId = request.tenantId;
    const { id } = request.params as { id: string };

    const event = await db.dnsChangeEvent.findFirst({
      where: { id, tenantId },
      include: {
        domain: {
          select: { domain: true, detectedEsp: true, healthScore: true },
        },
      },
    });

    if (!event) {
      return reply.status(404).send({
        error: { code: "ALERT_NOT_FOUND", message: "Alert not found" },
      });
    }

    return reply.status(200).send({ data: event });
  });

  // ─────────────────────────────────────────────
  // POST /api/v1/alerts/:id/acknowledge
  // Mark an alert as acknowledged (seen by user)
  // ─────────────────────────────────────────────
  app.post("/:id/acknowledge", async (request, reply) => {
    const tenantId = request.tenantId;
    const { id } = request.params as { id: string };

    const event = await db.dnsChangeEvent.findFirst({
      where: { id, tenantId },
    });

    if (!event) {
      return reply.status(404).send({
        error: { code: "ALERT_NOT_FOUND", message: "Alert not found" },
      });
    }

    await db.dnsChangeEvent.update({
      where: { id },
      data: { acknowledged: true },
    });

    // Write audit log
    await db.auditLog.create({
      data: {
        tenantId,
        userId: request.userId,
        action: "alert.acknowledged",
        resourceType: "dns_change_event",
        resourceId: id,
      },
    });

    return reply.status(200).send({
      data: { id, acknowledged: true },
      message: "Alert acknowledged",
    });
  });

  // ─────────────────────────────────────────────
  // POST /api/v1/alerts/:id/resolve
  // Mark an alert as fully resolved
  // ─────────────────────────────────────────────
  app.post("/:id/resolve", async (request, reply) => {
    const tenantId = request.tenantId;
    const { id } = request.params as { id: string };

    const event = await db.dnsChangeEvent.findFirst({
      where: { id, tenantId },
    });

    if (!event) {
      return reply.status(404).send({
        error: { code: "ALERT_NOT_FOUND", message: "Alert not found" },
      });
    }

    await db.dnsChangeEvent.update({
      where: { id },
      data: {
        acknowledged: true,
        resolvedAt: new Date(),
      },
    });

    await db.auditLog.create({
      data: {
        tenantId,
        userId: request.userId,
        action: "alert.resolved",
        resourceType: "dns_change_event",
        resourceId: id,
      },
    });

    return reply.status(200).send({
      data: { id, resolvedAt: new Date() },
      message: "Alert marked as resolved",
    });
  });

  // ─────────────────────────────────────────────
  // GET /api/v1/alerts/channels
  // Get configured notification channels
  // ─────────────────────────────────────────────
  app.get("/channels", async (request, reply) => {
    const tenantId = request.tenantId;

    // For MVP we store channels as a JSON blob on the tenant
    // In production this becomes its own table with encrypted fields
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return reply.status(404).send({
        error: { code: "TENANT_NOT_FOUND", message: "Tenant not found" },
      });
    }

    // Read the tenant's saved notification channels. A tenant that has never
    // configured them gets sensible defaults (with a blank email address — the
    // frontend seeds that from the signed-in user's Clerk email).
    const channels =
      (tenant.notificationChannels as unknown as NotificationChannels | null) ??
      DEFAULT_NOTIFICATION_CHANNELS;

    return reply.status(200).send({ data: channels });
  });

  // ─────────────────────────────────────────────
  // PUT /api/v1/alerts/channels
  // Update notification channel configuration
  // ─────────────────────────────────────────────
  app.put("/channels", async (request, reply) => {
    const tenantId = request.tenantId;

    const schema = z.object({
      email: z
        .object({
          enabled: z.boolean(),
          address: z.string().email().optional(),
          onCritical: z.boolean().default(true),
          onWarning: z.boolean().default(true),
          weeklyReport: z.boolean().default(true),
        })
        .optional(),

      slack: z
        .object({
          enabled: z.boolean(),
          webhookUrl: z.string().url().nullable().optional(),
          onCritical: z.boolean().default(true),
          onWarning: z.boolean().default(false),
        })
        .optional(),

      webhook: z
        .object({
          enabled: z.boolean(),
          url: z.string().url().nullable().optional(),
        })
        .optional(),
    });

    const parseResult = schema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid channel configuration",
          details: parseResult.error.issues,
        },
      });
    }

    // Persist onto the tenant's notificationChannels JSON column. Merge onto
    // the existing config so a partial update never silently wipes a channel
    // the client didn't include in this request.
    const tenant = await db.tenant.findUnique({ where: { id: tenantId } });

    if (!tenant) {
      return reply.status(404).send({
        error: { code: "TENANT_NOT_FOUND", message: "Tenant not found" },
      });
    }

    const parsed = parseResult.data;
    const existing =
      (tenant.notificationChannels as unknown as NotificationChannels | null) ??
      DEFAULT_NOTIFICATION_CHANNELS;

    const merged = {
      email: parsed.email ?? existing.email,
      slack: parsed.slack ?? existing.slack,
      webhook: parsed.webhook ?? existing.webhook,
    };

    await db.tenant.update({
      where: { id: tenantId },
      data: { notificationChannels: merged as any },
    });

    await db.auditLog.create({
      data: {
        tenantId,
        userId: request.userId,
        action: "alert.channels_updated",
        metadata: parsed as any,
      },
    });

    return reply.status(200).send({
      data: merged,
      message: "Notification channels updated",
    });
  });

  // ─────────────────────────────────────────────
  // POST /api/v1/alerts/channels/test
  // Send a test notification to verify a channel works
  // ─────────────────────────────────────────────
  app.post("/channels/test", async (request, reply) => {
    const tenantId = request.tenantId;

    const schema = z.object({
      channel: z.enum(["email", "slack", "webhook"]),
      // Email address or webhook URL to test
      destination: z.string().min(1),
    });

    const parseResult = schema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid test request",
          details: parseResult.error.issues,
        },
      });
    }

    const { channel, destination } = parseResult.data;

    // Test payload — uses the same format as real alerts
    const testPayload = {
      domainName: "test.yourdomain.com",
      changeType: "spf_record_changed",
      severity: "warning",
      aiTitle: "Test Notification from InboxRules",
      aiSummary:
        "This is a test notification to verify your alert channel is configured correctly. No action is required.",
      aiFixSteps: ["This is a test — no fix needed"],
      previousValue: "v=spf1 include:sendgrid.net ~all",
      currentValue: "v=spf1 include:sendgrid.net include:mailgun.org ~all",
    };

    let result: { success: boolean; error?: string };

    if (channel === "email") {
      result = await sendAlertEmail({ to: destination, ...testPayload });
    } else if (channel === "slack") {
      result = await sendSlackAlert({
        webhookUrl: destination,
        ...testPayload,
      });
    } else {
      // Webhook test — POST the test payload
      try {
        const response = await fetch(destination, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "test", ...testPayload }),
        });
        result = response.ok
          ? { success: true }
          : { success: false, error: `Webhook returned ${response.status}` };
      } catch (err: any) {
        result = { success: false, error: err.message };
      }
    }

    if (!result.success) {
      return reply.status(400).send({
        error: {
          code: "TEST_FAILED",
          message: `Test ${channel} notification failed: ${result.error}`,
        },
      });
    }

    return reply.status(200).send({
      message: `Test ${channel} notification sent successfully`,
    });
  });
}
