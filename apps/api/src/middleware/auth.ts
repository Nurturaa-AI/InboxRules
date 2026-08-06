// Verifies Clerk JWTs using their public JWKS endpoint.
// jose is a lightweight JWT library — no Clerk SDK needed.

import { FastifyRequest, FastifyReply } from "fastify";
import { createRemoteJWKSet, jwtVerify } from "jose";
import db from "../db";

declare module "fastify" {
  interface FastifyRequest {
    tenantId: string;
    userId: string;
  }
}

// Build the Clerk JWKS URL from the publishable key
// pk_test_abc123 → https://abc123.clerk.accounts.dev/.well-known/jwks.json
// pk_live_abc123 → https://abc123.clerk.accounts.com/.well-known/jwks.json
function getJwksUrl(): string {
  const pk = process.env.CLERK_PUBLISHABLE_KEY || "";

  if (!pk) {
    throw new Error("CLERK_PUBLISHABLE_KEY is not set in .env");
  }

  // Extract the instance part from the publishable key
  // pk_test_XXXXXXXXXX → XXXXXXXXXX
  const withoutPrefix = pk.replace(/^pk_(test|live)_/, "");

  // Clerk encodes the frontend API URL in the key as base64.
  try {
    const decoded = Buffer.from(withoutPrefix, "base64").toString("utf8");
    const frontendApiUrl = decoded.replace(/\$+$/, "").trim();

    return `${frontendApiUrl}/.well-known/jwks.json`;
  } catch {
    const fragment = withoutPrefix.toLowerCase();

    return `https://${fragment}.clerk.accounts.dev/.well-known/jwks.json`;
  }
}

// Cache the JWKS set so we don't fetch it on every request
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (!jwks) {
    const url = getJwksUrl();
    jwks = createRemoteJWKSet(new URL(url));
  }
  return jwks;
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return reply.status(401).send({
      error: {
        code: "UNAUTHORIZED",
        message: "Authorization header is required",
      },
    });
  }

  const token = authHeader.substring(7);

  if (!token || token === "null" || token === "undefined") {
    return reply.status(401).send({
      error: { code: "UNAUTHORIZED", message: "Token is missing" },
    });
  }

  try {
    // Verify the JWT using Clerk's public keys
    const { payload } = await jwtVerify(token, getJwks(), {
      // Allow 60 seconds of clock skew — fixes the clock skew issue
      clockTolerance: 60,

      // Issuer validation: Clerk tokens are always issued by your Clerk instance.
      // This guards against tokens from a different Clerk instance or a forged
      // issuer claim. The issuer is https://<your-instance>.clerk.accounts.dev
      // or .com for production. Derive the expected domain from CLERK_PUBLISHABLE_KEY.
      issuer: getJwksUrl().replace("/.well-known/jwks.json", ""),

      // Authorized party (`azp`) validation: Clerk recommends verifying azp to
      // bind tokens to your frontend origin. This prevents a token issued to
      // attacker.com from being replayed against your API. The azp claim appears
      // in the standard `aud` field for Clerk JWTs. In dev we allow localhost.
      audience: process.env.FRONTEND_URL || "http://localhost:3000",
    });

    const clerkUserId = payload.sub;

    if (!clerkUserId) {
      throw new Error("Token has no subject");
    }

    // Look up user in our database
    const user = await db.user.findFirst({
      where: { clerkId: clerkUserId, deletedAt: null },
    });

    if (!user) {
      request.log.warn({ clerkUserId }, "Clerk user not in DB — run seed");
      return reply.status(401).send({
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found. Please contact support.",
        },
      });
    }

    request.tenantId = user.tenantId;
    request.userId = user.id;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    request.log.error({ message }, "Token verification failed");

    return reply.status(401).send({
      error: {
        code: "INVALID_TOKEN",
        message: "Session expired. Please log in again.",
      },
    });
  }
}
