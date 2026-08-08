// src/modules/domains/domains.schema.ts
//
// Zod schemas validate incoming request data before it touches
// the database. If data is invalid, Zod rejects it immediately
// with a clear error message — the service layer never sees bad data.

import { z } from "zod";

// ─────────────────────────────────────────────
// ADD DOMAIN
// ─────────────────────────────────────────────

export const AddDomainSchema = z.object({
  // The domain the user wants to monitor
  // e.g. "acme.com" or "mail.acme.com"
  domain: z
    .string()
    // Must not be empty
    .min(1, "Domain is required")
    // Must not be too long (DNS limit is 253 chars)
    .max(253, "Domain is too long")
    // Remove spaces the user may have accidentally typed
    .trim()
    // Convert to lowercase so "Acme.COM" becomes "acme.com"
    .toLowerCase()
    // Reject anything with http:// or https:// — we want just the domain
    .refine(
      (val) => !val.startsWith("http://") && !val.startsWith("https://"),
      "Enter just the domain name without http:// or https://",
    )
    // Reject anything with a path like "acme.com/about"
    .refine(
      (val) => !val.includes("/"),
      "Enter just the domain name without any path",
    )
    // Basic domain format check — must have at least one dot
    .refine(
      (val) =>
        /^[a-z0-9]([a-z0-9\-\.]{0,251}[a-z0-9])?$/.test(val) &&
        val.includes("."),
      "Please enter a valid domain name e.g. acme.com",
    ),
});

// ─────────────────────────────────────────────
// LIST DOMAINS (query params for pagination)
// ─────────────────────────────────────────────

export const ListDomainsSchema = z.object({
  // How many domains to return per page (default 20, max 100)
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().min(1).max(100)),

  // Cursor for pagination — the ID of the last domain from the previous page
  // Undefined means start from the beginning
  cursor: z.string().uuid().optional(),

  // Filter by health status
  status: z
    .enum(["all", "healthy", "warning", "critical"])
    .optional()
    .default("all"),

  // Comma-separated list of relations to include (e.g. "snapshots")
  // When "snapshots" is requested, the most recent snapshot is included
  include: z.string().optional(),
});

// ─────────────────────────────────────────────
// DOMAIN ID PARAM
// Used for routes like GET /domains/:id
// ─────────────────────────────────────────────

export const DomainIdParamSchema = z.object({
  id: z.string().uuid("Domain ID must be a valid UUID"),
});

// ─────────────────────────────────────────────
// UNSUBSCRIBE HEADERS QUERY
// GET /domains/:id/unsubscribe/headers?recipient=...
//
// List-Unsubscribe headers are per-recipient: the token encodes
// `domainId:recipientEmail`, so a genuine header can only be produced for a
// real recipient address. We require it rather than fabricating an example.
// ─────────────────────────────────────────────

export const UnsubscribeHeadersQuerySchema = z.object({
  recipient: z
    .string()
    .min(1, "recipient is required")
    .email("recipient must be a valid email address")
    .toLowerCase()
    .trim(),
});

// TypeScript types derived from the schemas
// We use these types in our service and route files
export type AddDomainInput = z.infer<typeof AddDomainSchema>;
export type ListDomainsInput = z.infer<typeof ListDomainsSchema>;
export type DomainIdParam = z.infer<typeof DomainIdParamSchema>;
export type UnsubscribeHeadersQuery = z.infer<
  typeof UnsubscribeHeadersQuerySchema
>;
