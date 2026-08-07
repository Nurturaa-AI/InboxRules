// src/modules/analytics/analytics.routes.ts
//
// Analytics endpoints — aggregate reads scoped by tenantId.

import { FastifyInstance } from "fastify";
import {
  HealthHistoryQuerySchema,
  OverviewQuerySchema,
} from "./analytics.schema";
import {
  getHealthHistory,
  getOverview,
  getComplianceSummary,
} from "./analytics.service";

export async function analyticsRoutes(app: FastifyInstance) {
  // ─────────────────────────────────────────────
  // GET /api/v1/analytics/health-history?period=7|30|90
  // Daily average health score over the requested window
  // ─────────────────────────────────────────────
  app.get("/health-history", async (request, reply) => {
    const parseResult = HealthHistoryQuerySchema.safeParse(request.query);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
          details: parseResult.error.issues,
        },
      });
    }

    const tenantId = request.tenantId;

    try {
      const result = await getHealthHistory(tenantId, parseResult.data.period);
      return reply.status(200).send({ data: result });
    } catch (err: any) {
      app.log.error({ err, tenantId }, "Failed to fetch health history");
      return reply.status(500).send({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch health history. Please try again.",
        },
      });
    }
  });

  // ─────────────────────────────────────────────
  // GET /api/v1/analytics/overview?period=7|30|90
  // KPIs with real previous-period comparisons
  // ─────────────────────────────────────────────
  app.get("/overview", async (request, reply) => {
    const parseResult = OverviewQuerySchema.safeParse(request.query);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
          details: parseResult.error.issues,
        },
      });
    }

    const tenantId = request.tenantId;

    try {
      const result = await getOverview(tenantId, parseResult.data.period);
      return reply.status(200).send({ data: result });
    } catch (err: any) {
      app.log.error({ err, tenantId }, "Failed to fetch overview");
      return reply.status(500).send({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch overview. Please try again.",
        },
      });
    }
  });

  // ─────────────────────────────────────────────
  // GET /api/v1/analytics/compliance-summary
  // Per-signal pass counts across the tenant's domains
  // ─────────────────────────────────────────────
  app.get("/compliance-summary", async (request, reply) => {
    const tenantId = request.tenantId;

    try {
      const result = await getComplianceSummary(tenantId);
      return reply.status(200).send({ data: result });
    } catch (err: any) {
      app.log.error({ err, tenantId }, "Failed to fetch compliance summary");
      return reply.status(500).send({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch compliance summary. Please try again.",
        },
      });
    }
  });
}
