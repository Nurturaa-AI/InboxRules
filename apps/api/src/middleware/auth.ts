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
  // Prefer explicit config when present. The .env already sets these correctly;
  // deriving from the publishable key is only a fallback.
  if (process.env.CLERK_JWKS_URL) {
    return process.env.CLERK_JWKS_URL;
  }
  if (process.env.CLERK_DOMAIN) {
    return `https://${process.env.CLERK_DOMAIN}/.well-known/jwks.json`;
  }

  const pk = process.env.CLERK_PUBLISHABLE_KEY || "";

  if (!pk) {
    throw new Error("CLERK_PUBLISHABLE_KEY is not set in .env");
  }

  // A Clerk publishable key is `pk_<test|live>_<base64>`, where the base64
  // decodes to the Frontend API HOST followed by a `$` — e.g.
  // "golden-ferret-62.clerk.accounts.dev$". It is a bare host with NO scheme,
  // so we must prepend https:// ourselves. Returning it without a scheme is
  // what made `new URL(...)` throw "Invalid URL" on every request.
  const withoutPrefix = pk.replace(/^pk_(test|live)_/, "");
  const decoded = Buffer.from(withoutPrefix, "base64").toString("utf8");
  const host = decoded.replace(/\$+$/, "").trim();

  return `https://${host}/.well-known/jwks.json`;
}

// Cache the JWKS set so we don't fetch it on every request
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (!jwks) {
    const url = getJwksUrl();
    jwks = createRemoteJWKSet(new URL(url), {
      // Clerk's JWKS endpoint can be slow on the very first hit (cold DNS +
      // TLS handshake). jose's default fetch timeout is 5s, and when a batch of
      // requests races on that first uncached fetch they ALL fail together —
      // exactly the wave of ~5000ms "request timed out" 401s seen right after a
      // cold start. Give the network more headroom; steady-state requests are
      // served from jose's in-memory cache and never wait on this.
      timeoutDuration: 10_000,
    });
  }
  return jwks;
}

// Pre-fetch Clerk's JWKS once at boot so the first real authenticated request
// doesn't pay the cold-fetch latency (otherwise seen as a burst of ~5s 401s
// immediately after startup). Best-effort: if Clerk is unreachable we log and
// carry on — the normal per-request path will fetch (and retry) later.
export async function warmJwks(): Promise<void> {
  try {
    await getJwks().reload();
    console.log("[auth] Clerk JWKS pre-warmed");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.warn(
      `[auth] JWKS pre-warm failed (will fetch on first request): ${message}`,
    );
  }
}

// Decides whether a token's `azp` (authorized party = frontend origin) is one
// we trust. In development we accept any localhost/127.0.0.1 origin because the
// Next dev server's port is not stable. In production we require an exact match
// against FRONTEND_URL (comma-separated list allowed for multiple frontends).
function isAuthorizedParty(azp: string): boolean {
  if (process.env.NODE_ENV !== "production") {
    try {
      const host = new URL(azp).hostname;
      if (host === "localhost" || host === "127.0.0.1") {
        return true;
      }
    } catch {
      // Not a parseable URL — fall through to the configured allow-list.
    }
  }

  const allowed = (process.env.FRONTEND_URL || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return allowed.includes(azp);
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
      // Allow 60 seconds of clock skew
      clockTolerance: 60,

      // Issuer validation: Clerk tokens are issued by your Clerk instance, e.g.
      // https://<instance>.clerk.accounts.dev (or a custom domain in prod).
      issuer: getJwksUrl().replace("/.well-known/jwks.json", ""),

      // NOTE: do NOT pass `audience` here. Clerk's default session token has no
      // `aud` claim — the frontend origin lives in `azp` — so validating the
      // audience rejects every legitimate token. We check `azp` manually below.
    });

    // Authorized-party check: bind the token to our own frontend origin so a
    // token minted for a different site can't be replayed against this API.
    // Clerk puts that origin in `azp`; only enforce when the token carries it.
    //
    // Dev vs prod split mirrors the CORS config in server.ts: in development
    // the Next dev server may land on any localhost port (3000, 3001, 3500…),
    // so accept any localhost origin rather than hard-coding a port that drifts
    // between runs. In production, bind strictly to the configured frontend(s).
    if (typeof payload.azp === "string" && payload.azp) {
      if (!isAuthorizedParty(payload.azp)) {
        throw new Error(`Untrusted authorized party (azp): ${payload.azp}`);
      }
    }

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
