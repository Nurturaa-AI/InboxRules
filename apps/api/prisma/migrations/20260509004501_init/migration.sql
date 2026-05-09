-- CreateEnum
CREATE TYPE "TenantPlan" AS ENUM ('free', 'pro', 'agency');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('owner', 'admin', 'member');

-- CreateEnum
CREATE TYPE "StatusType" AS ENUM ('unknown', 'pass', 'fail', 'warn');

-- CreateEnum
CREATE TYPE "SeverityType" AS ENUM ('critical', 'warning', 'info');

-- CreateEnum
CREATE TYPE "SuppressionEventType" AS ENUM ('unsubscribe', 'spam_complaint', 'bounce');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plan" "TenantPlan" NOT NULL DEFAULT 'free',
    "lsCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'member',
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "domains" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "spfStatus" "StatusType" NOT NULL DEFAULT 'unknown',
    "dkimStatus" "StatusType" NOT NULL DEFAULT 'unknown',
    "dmarcStatus" "StatusType" NOT NULL DEFAULT 'unknown',
    "unsubStatus" "StatusType" NOT NULL DEFAULT 'unknown',
    "healthScore" INTEGER NOT NULL DEFAULT 0,
    "detectedEsp" TEXT,
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dns_snapshots" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "spfRecord" TEXT,
    "spfLookupCount" INTEGER,
    "spfResult" TEXT,
    "dkimSelectors" JSONB,
    "dmarcRecord" TEXT,
    "dmarcPolicy" TEXT,
    "dmarcPct" INTEGER,
    "overallScore" INTEGER NOT NULL DEFAULT 0,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dns_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dns_change_events" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "severity" "SeverityType" NOT NULL,
    "previousValue" TEXT,
    "currentValue" TEXT,
    "aiTitle" TEXT,
    "aiSummary" TEXT,
    "aiFixSteps" JSONB,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dns_change_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_analyses" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "parsedResult" JSONB NOT NULL,
    "aiDiagnosis" TEXT,
    "espDetected" TEXT,
    "espConfidence" DOUBLE PRECISION,
    "overallScore" INTEGER NOT NULL DEFAULT 0,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawHeadersDeletedAt" TIMESTAMP(3),

    CONSTRAINT "email_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppression_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "emailHash" TEXT NOT NULL,
    "eventType" "SuppressionEventType" NOT NULL,
    "sourceEsp" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suppression_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unsubscribe_tokens" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "recipientHash" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unsubscribe_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "costUsd" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_clerkId_key" ON "users"("clerkId");

-- CreateIndex
CREATE INDEX "users_clerkId_idx" ON "users"("clerkId");

-- CreateIndex
CREATE INDEX "users_tenantId_idx" ON "users"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenantId_email_key" ON "users"("tenantId", "email");

-- CreateIndex
CREATE INDEX "domains_tenantId_idx" ON "domains"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "domains_tenantId_domain_key" ON "domains"("tenantId", "domain");

-- CreateIndex
CREATE INDEX "dns_snapshots_domainId_capturedAt_idx" ON "dns_snapshots"("domainId", "capturedAt" DESC);

-- CreateIndex
CREATE INDEX "dns_change_events_tenantId_detectedAt_idx" ON "dns_change_events"("tenantId", "detectedAt" DESC);

-- CreateIndex
CREATE INDEX "dns_change_events_domainId_idx" ON "dns_change_events"("domainId");

-- CreateIndex
CREATE INDEX "email_analyses_tenantId_receivedAt_idx" ON "email_analyses"("tenantId", "receivedAt" DESC);

-- CreateIndex
CREATE INDEX "email_analyses_domainId_idx" ON "email_analyses"("domainId");

-- CreateIndex
CREATE INDEX "suppression_events_tenantId_occurredAt_idx" ON "suppression_events"("tenantId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "suppression_events_domainId_idx" ON "suppression_events"("domainId");

-- CreateIndex
CREATE UNIQUE INDEX "unsubscribe_tokens_tokenHash_key" ON "unsubscribe_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "unsubscribe_tokens_domainId_idx" ON "unsubscribe_tokens"("domainId");

-- CreateIndex
CREATE INDEX "ai_usage_logs_tenantId_createdAt_idx" ON "ai_usage_logs"("tenantId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_tenantId_createdAt_idx" ON "audit_logs"("tenantId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "domains" ADD CONSTRAINT "domains_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dns_snapshots" ADD CONSTRAINT "dns_snapshots_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dns_change_events" ADD CONSTRAINT "dns_change_events_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dns_change_events" ADD CONSTRAINT "dns_change_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_analyses" ADD CONSTRAINT "email_analyses_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_analyses" ADD CONSTRAINT "email_analyses_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppression_events" ADD CONSTRAINT "suppression_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppression_events" ADD CONSTRAINT "suppression_events_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unsubscribe_tokens" ADD CONSTRAINT "unsubscribe_tokens_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unsubscribe_tokens" ADD CONSTRAINT "unsubscribe_tokens_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
