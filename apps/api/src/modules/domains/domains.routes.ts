// src/modules/domains/domains.routes.ts
//
// Fastify route definitions for the domains module.
// Routes handle HTTP concerns only:
//   - Parse and validate request data
//   - Call the service layer
//   - Return the correct HTTP response
//
// Business logic lives in domains.service.ts — not here.

import { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  AddDomainSchema,
  ListDomainsSchema,
  DomainIdParamSchema,
} from "./domains.schema";
import {
  addDomain,
  listDomains,
  getDomain,
  triggerScan,
  deleteDomain,
} from "./domains.service";

export async function domainRoutes(app: FastifyInstance) {
  // ─────────────────────────────────────────────
  // POST /api/v1/domains
  // Add a new domain to monitor
  // ─────────────────────────────────────────────
  app.post("/", async (request, reply) => {
    // Parse and validate the request body using our Zod schema
    // If validation fails, we catch the error below and return 400
    const parseResult = AddDomainSchema.safeParse(request.body);

    if (!parseResult.success) {
      // safeParse gives us the errors without throwing
      // Format them into a readable message for the client
      const errors = parseResult.error.issues.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));

      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input",
          // Show the user exactly which fields are wrong
          details: errors,
        },
      });
    }

    // Get the tenant ID from the request
    // This is set by our auth middleware on every authenticated request
    const tenantId = request.tenantId;

    try {
      const domain = await addDomain(tenantId, parseResult.data);

      // 201 Created — the domain was successfully added
      return reply.status(201).send({
        data: domain,
        message:
          "Domain added. Running initial scan now — results will appear shortly.",
      });
    } catch (err: any) {
      // Handle known business logic errors
      if (err.message.includes("already in your account")) {
        return reply.status(409).send({
          error: {
            code: "DOMAIN_ALREADY_EXISTS",
            message: err.message,
          },
        });
      }

      if (err.message.includes("maximum of")) {
        return reply.status(403).send({
          error: {
            code: "PLAN_LIMIT_REACHED",
            message: err.message,
          },
        });
      }

      // Unknown error — log it and return a generic message
      // We never expose internal error details to the client
      app.log.error({ err, tenantId }, "Failed to add domain");
      return reply.status(500).send({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to add domain. Please try again.",
        },
      });
    }
  });

  // ─────────────────────────────────────────────
  // GET /api/v1/domains
  // List all domains for the current tenant
  // ─────────────────────────────────────────────
  app.get("/", async (request, reply) => {
    // Validate query parameters
    const parseResult = ListDomainsSchema.safeParse(request.query);

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
      const result = await listDomains(tenantId, parseResult.data);

      return reply.status(200).send({
        data: result.items,
        pagination: {
          nextCursor: result.nextCursor,
          hasNextPage: result.hasNextPage,
          total: result.total,
        },
      });
    } catch (err: any) {
      app.log.error({ err, tenantId }, "Failed to list domains");
      return reply.status(500).send({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch domains. Please try again.",
        },
      });
    }
  });

  // ─────────────────────────────────────────────
  // GET /api/v1/domains/:id
  // Get a single domain with full compliance details
  // ─────────────────────────────────────────────
  app.get("/:id", async (request, reply) => {
    // Validate the URL parameter
    const parseResult = DomainIdParamSchema.safeParse(request.params);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_DOMAIN_ID",
          message: "Domain ID must be a valid UUID",
        },
      });
    }

    const tenantId = request.tenantId;
    const { id } = parseResult.data;

    try {
      const domain = await getDomain(tenantId, id);

      // getDomain returns null if not found or belongs to another tenant
      if (!domain) {
        return reply.status(404).send({
          error: {
            code: "DOMAIN_NOT_FOUND",
            message: "Domain not found",
          },
        });
      }

      return reply.status(200).send({ data: domain });
    } catch (err: any) {
      app.log.error({ err, tenantId, domainId: id }, "Failed to get domain");
      return reply.status(500).send({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch domain. Please try again.",
        },
      });
    }
  });

  // ─────────────────────────────────────────────
  // POST /api/v1/domains/:id/scan
  // Trigger a manual DNS scan for a domain
  // ─────────────────────────────────────────────
  app.post("/:id/scan", async (request, reply) => {
    const parseResult = DomainIdParamSchema.safeParse(request.params);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_DOMAIN_ID",
          message: "Domain ID must be a valid UUID",
        },
      });
    }

    const tenantId = request.tenantId;
    const { id } = parseResult.data;

    try {
      const result = await triggerScan(tenantId, id);

      if (!result) {
        return reply.status(404).send({
          error: {
            code: "DOMAIN_NOT_FOUND",
            message: "Domain not found",
          },
        });
      }

      // 202 Accepted — the scan has been queued but is not complete yet
      // We use 202 instead of 200 because the work happens asynchronously
      return reply.status(202).send({
        data: {
          domainId: id,
          alreadyQueued: result.alreadyQueued,
        },
        message: result.message,
      });
    } catch (err: any) {
      app.log.error({ err, tenantId, domainId: id }, "Failed to trigger scan");
      return reply.status(500).send({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to trigger scan. Please try again.",
        },
      });
    }
  });

  // ─────────────────────────────────────────────
  // DELETE /api/v1/domains/:id
  // Remove a domain from monitoring (soft delete)
  // ─────────────────────────────────────────────
  app.delete("/:id", async (request, reply) => {
    const parseResult = DomainIdParamSchema.safeParse(request.params);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_DOMAIN_ID",
          message: "Domain ID must be a valid UUID",
        },
      });
    }

    const tenantId = request.tenantId;
    const { id } = parseResult.data;

    try {
      const domain = await deleteDomain(tenantId, id);

      if (!domain) {
        return reply.status(404).send({
          error: {
            code: "DOMAIN_NOT_FOUND",
            message: "Domain not found",
          },
        });
      }

      // 200 with the deleted domain data
      // Some clients need to know what was deleted
      return reply.status(200).send({
        data: { id: domain.id, domain: domain.domain },
        message: "Domain removed from monitoring",
      });
    } catch (err: any) {
      app.log.error({ err, tenantId, domainId: id }, "Failed to delete domain");
      return reply.status(500).send({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to remove domain. Please try again.",
        },
      });
    }
  });
}
