/*
  Warnings:

  - The `spfStatus` column on the `domains` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `dkimStatus` column on the `domains` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `dmarcStatus` column on the `domains` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `unsubStatus` column on the `domains` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `plan` column on the `tenants` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `role` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `severity` on the `dns_change_events` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `eventType` on the `suppression_events` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "ai_usage_logs" DROP CONSTRAINT "ai_usage_logs_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "dns_change_events" DROP CONSTRAINT "dns_change_events_domainId_fkey";

-- DropForeignKey
ALTER TABLE "dns_change_events" DROP CONSTRAINT "dns_change_events_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "dns_snapshots" DROP CONSTRAINT "dns_snapshots_domainId_fkey";

-- DropForeignKey
ALTER TABLE "domains" DROP CONSTRAINT "domains_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "email_analyses" DROP CONSTRAINT "email_analyses_domainId_fkey";

-- DropForeignKey
ALTER TABLE "email_analyses" DROP CONSTRAINT "email_analyses_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "suppression_events" DROP CONSTRAINT "suppression_events_domainId_fkey";

-- DropForeignKey
ALTER TABLE "suppression_events" DROP CONSTRAINT "suppression_events_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "unsubscribe_tokens" DROP CONSTRAINT "unsubscribe_tokens_domainId_fkey";

-- DropForeignKey
ALTER TABLE "unsubscribe_tokens" DROP CONSTRAINT "unsubscribe_tokens_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_tenantId_fkey";

-- DropIndex
DROP INDEX "users_tenantId_email_key";

-- AlterTable
ALTER TABLE "dns_change_events" DROP COLUMN "severity",
ADD COLUMN     "severity" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "domains" DROP COLUMN "spfStatus",
ADD COLUMN     "spfStatus" TEXT NOT NULL DEFAULT 'unknown',
DROP COLUMN "dkimStatus",
ADD COLUMN     "dkimStatus" TEXT NOT NULL DEFAULT 'unknown',
DROP COLUMN "dmarcStatus",
ADD COLUMN     "dmarcStatus" TEXT NOT NULL DEFAULT 'unknown',
DROP COLUMN "unsubStatus",
ADD COLUMN     "unsubStatus" TEXT NOT NULL DEFAULT 'unknown';

-- AlterTable
ALTER TABLE "suppression_events" DROP COLUMN "eventType",
ADD COLUMN     "eventType" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "tenants" DROP COLUMN "plan",
ADD COLUMN     "plan" TEXT NOT NULL DEFAULT 'free';

-- AlterTable
ALTER TABLE "users" DROP COLUMN "role",
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'member';

-- DropEnum
DROP TYPE "SeverityType";

-- DropEnum
DROP TYPE "StatusType";

-- DropEnum
DROP TYPE "SuppressionEventType";

-- DropEnum
DROP TYPE "TenantPlan";

-- DropEnum
DROP TYPE "UserRole";

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "domains" ADD CONSTRAINT "domains_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dns_snapshots" ADD CONSTRAINT "dns_snapshots_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "domains"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dns_change_events" ADD CONSTRAINT "dns_change_events_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "domains"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dns_change_events" ADD CONSTRAINT "dns_change_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_analyses" ADD CONSTRAINT "email_analyses_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "domains"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_analyses" ADD CONSTRAINT "email_analyses_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppression_events" ADD CONSTRAINT "suppression_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppression_events" ADD CONSTRAINT "suppression_events_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "domains"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unsubscribe_tokens" ADD CONSTRAINT "unsubscribe_tokens_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unsubscribe_tokens" ADD CONSTRAINT "unsubscribe_tokens_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "domains"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
