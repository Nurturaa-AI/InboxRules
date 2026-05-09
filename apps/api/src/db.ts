// src/db.ts
// This file creates ONE Prisma client that the whole app shares.
// We use a singleton pattern because creating a new DB connection
// on every request would exhaust the connection pool quickly.

import { PrismaClient } from "@prisma/client";

// 'declare global' lets us attach our client to Node's global object.
// This prevents creating multiple clients during hot-reloads in development.
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// If a client already exists (from a previous hot-reload), reuse it.
// Otherwise create a new one.
const db =
  globalThis.__prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? // In development, log all queries to help with debugging
          ["query", "error", "warn"]
        : // In production, only log errors to avoid noise
          ["error"],
  });

// Save the client to global in development so hot-reloads reuse it
if (process.env.NODE_ENV === "development") {
  globalThis.__prisma = db;
}

export default db;
