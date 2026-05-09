// prisma.config.ts
// Prisma 7 requires the database URL here instead of schema.prisma
// We manually load .env because Prisma 7 does not auto-load it

import { defineConfig } from "prisma/config";
import { config } from "dotenv";

// Load .env file from the current directory
config();

// Get the database URL from environment
const databaseUrl = process.env.DATABASE_URL;

// Stop immediately if DATABASE_URL is not set
// Better to fail here with a clear message than fail later with a confusing error
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set in your .env file. " +
      "Please add it and try again.",
  );
}

export default defineConfig({
  // Tell Prisma where the schema file is
  schema: "prisma/schema.prisma",

  datasource: {
    url: process.env.DATABASE_URL,
  },
});
