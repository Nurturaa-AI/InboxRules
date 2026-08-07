-- AlterTable
ALTER TABLE "dns_snapshots" ADD COLUMN     "bimiRecord" TEXT,
ADD COLUMN     "bimiResult" TEXT,
ADD COLUMN     "mtaStsRecord" TEXT,
ADD COLUMN     "mtaStsResult" TEXT,
ADD COLUMN     "tlsRptRecord" TEXT,
ADD COLUMN     "tlsRptResult" TEXT;

-- AlterTable
ALTER TABLE "domains" ADD COLUMN     "bimiStatus" TEXT NOT NULL DEFAULT 'unknown',
ADD COLUMN     "mtaStsStatus" TEXT NOT NULL DEFAULT 'unknown',
ADD COLUMN     "tlsRptStatus" TEXT NOT NULL DEFAULT 'unknown',
ADD COLUMN     "unsubEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "unsubEnabledAt" TIMESTAMP(3);
