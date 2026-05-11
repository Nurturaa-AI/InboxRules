// src/db.ts

// Shared Prisma client for the whole application.
// Prisma 7 with engineType="client" requires a database adapter.

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

// Read DATABASE_URL from .env
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

// Create PostgreSQL adapter
const adapter = new PrismaPg({
  connectionString,
});

// Extend globalThis so TypeScript knows about our cached client
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Reuse Prisma client during hot reloads in development
const db =
  globalThis.__prisma ??
  new PrismaClient({
    adapter,

    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

// Cache client globally in development
if (process.env.NODE_ENV === "development") {
  globalThis.__prisma = db;
}

export default db;
