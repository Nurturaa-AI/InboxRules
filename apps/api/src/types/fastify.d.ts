import "fastify";
import { PrismaClient } from "@prisma/client";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }

  interface FastifyRequest {
    tenantId: string;
    userId: string;
    // Raw request body string, preserved by the JSON content-type parser in
    // server.ts. Webhook routes MUST verify provider signatures against this
    // exact payload, not a re-serialized JSON.stringify(request.body).
    rawBody?: string;
  }
}
