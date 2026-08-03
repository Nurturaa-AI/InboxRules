-- Replace the full unique index on domains(tenantId, domain) with a PARTIAL
-- unique index scoped to active (non-soft-deleted) rows.
--
-- Why: deletes on `domains` are soft (deletedAt is set, the row remains). The
-- old `domains_tenantId_domain_key` counted those soft-deleted rows, so a
-- domain that was added then removed permanently reserved the (tenantId,
-- domain) slot and could never be re-added — the INSERT hit a unique violation
-- (P2002) that surfaced to the user as a generic 500.
--
-- A partial unique index (WHERE "deletedAt" IS NULL) enforces "at most one
-- ACTIVE domain per tenant" while allowing any number of soft-deleted rows for
-- the same (tenantId, domain). Prisma cannot express partial indexes, so this
-- migration is hand-written and the schema declares only a plain @@index.

-- 1. Defensive de-dup: if the current data somehow already contains multiple
--    ACTIVE rows for the same (tenantId, domain) (e.g. created while the app
--    was racing the old constraint), keep the most-recently-created one and
--    soft-delete the rest. Without this, creating the unique index below would
--    fail. This is a no-op on clean data.
UPDATE "domains" d
SET "deletedAt" = now()
WHERE d."deletedAt" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "domains" other
    WHERE other."tenantId" = d."tenantId"
      AND other."domain" = d."domain"
      AND other."deletedAt" IS NULL
      AND (
        other."createdAt" > d."createdAt"
        OR (other."createdAt" = d."createdAt" AND other."id" > d."id")
      )
  );

-- 2. Drop the old full unique index.
DROP INDEX "domains_tenantId_domain_key";

-- 3. Create the partial unique index over active rows only.
CREATE UNIQUE INDEX "domains_tenantId_domain_active_key"
  ON "domains" ("tenantId", "domain")
  WHERE "deletedAt" IS NULL;

-- 4. Recreate the plain lookup index that the schema now declares
--    (@@index([tenantId, domain])). The partial index above cannot serve every
--    lookup because Postgres will not always use a partial index for queries
--    that don't include its predicate.
CREATE INDEX "domains_tenantId_domain_idx"
  ON "domains" ("tenantId", "domain");
