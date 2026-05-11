// src/middleware/auth.ts
//
// This middleware runs on every request and does two things:
// 1. Verifies the user's JWT token from Clerk
// 2. Looks up the user in our database and attaches their tenantId
//
// If the token is missing or invalid, the request is rejected
// before it reaches any route handler.

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import db from "../db";

// Extend Fastify's request type so TypeScript knows
// about the tenantId and userId we attach in this middleware
declare module "fastify" {
  interface FastifyRequest {
    tenantId: string;
    userId: string;
  }
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  // Get the Authorization header
  // It should look like: "Bearer eyJhbGciOiJSUzI1NiJ9..."
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return reply.status(401).send({
      error: {
        code: "UNAUTHORIZED",
        message: "Authorization header is required",
      },
    });
  }

  // Extract the token (remove the "Bearer " prefix)
  const token = authHeader.substring(7);

  if (!token) {
    return reply.status(401).send({
      error: {
        code: "UNAUTHORIZED",
        message: "Token is missing",
      },
    });
  }

  try {
    // Verify the token with Clerk
    // We call Clerk's API to validate the token
    const clerkResponse = await fetch(
      "https://api.clerk.com/v1/tokens/verify",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      },
    );

    if (!clerkResponse.ok) {
      return reply.status(401).send({
        error: {
          code: "INVALID_TOKEN",
          message: "Your session has expired. Please log in again.",
        },
      });
    }

    const clerkData = (await clerkResponse.json()) as { sub: string };

    // clerkData.sub is the Clerk user ID e.g. "user_2abc123"
    const clerkUserId = clerkData.sub;

    // Look up the user in our database using their Clerk ID
    const user = await db.user.findFirst({
      where: {
        clerkId: clerkUserId,
        deletedAt: null,
      },
    });

    if (!user) {
      return reply.status(401).send({
        error: {
          code: "USER_NOT_FOUND",
          message: "User account not found. Please sign up first.",
        },
      });
    }

    // Attach the tenant and user IDs to the request object
    // All route handlers can now access request.tenantId and request.userId
    request.tenantId = user.tenantId;
    request.userId = user.id;
  } catch (err: any) {
    request.log.error({ err }, "Auth middleware error");
    return reply.status(401).send({
      error: {
        code: "AUTH_ERROR",
        message: "Authentication failed. Please try again.",
      },
    });
  }
}
