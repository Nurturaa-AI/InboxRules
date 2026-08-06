// src/workers/scheduler.ts
//
// The scheduler adds DNS poll jobs to the queue on a schedule.
// Free plan domains are checked every 24 hours.
// Pro plan domains are checked every 6 hours.
// Agency plan domains are checked every 1 hour.
//
// This runs as a simple interval — no external cron service needed.
// BullMQ handles deduplication so we never queue the same domain twice.

import db from "../db";
import redis from "../redis";
import { dnsPollQueue } from "../queue";
import { sendWeeklyReport } from "../modules/alerts/alerts.service";

// How often each plan's domains are checked (in milliseconds)
const POLL_INTERVALS: Record<string, number> = {
  free: 24 * 60 * 60 * 1000, // 24 hours
  pro: 6 * 60 * 60 * 1000, //  6 hours
  agency: 1 * 60 * 60 * 1000, //  1 hour
};

// How often the scheduler itself runs to check what needs scanning
// Every 5 minutes is frequent enough without hammering the database
const SCHEDULER_INTERVAL_MS = 5 * 60 * 1000;

export async function runScheduler() {
  console.log("DNS scheduler started — checking every 5 minutes");

  // Run immediately on startup so domains are checked right away
  await scheduleDueScans();

  // Then run every 5 minutes
  setInterval(async () => {
    try {
      await scheduleDueScans();
    } catch (err: any) {
      // Log but do not crash — the scheduler will retry in 5 minutes
      console.error("[Scheduler] Error during scheduled run:", err.message);
    }
  }, SCHEDULER_INTERVAL_MS);
}

async function scheduleDueScans() {
  console.log("[Scheduler] Checking for domains due for scanning...");

  // Get all active tenants with their plans
  const tenants = await db.tenant.findMany({
    where: { deletedAt: null },
    select: { id: true, plan: true },
  });

  // Weekly reports are handled once per scheduler tick, NOT inside the
  // per-tenant loop below. The old placement re-queried every tenant and
  // sent to all of them on each iteration — O(N²) sends — and could fire
  // repeatedly across the 9:00–9:05 window. See maybeSendWeeklyReports.
  await maybeSendWeeklyReports();

  let totalQueued = 0;

  for (const tenant of tenants) {
    // How long between scans for this plan
    const interval = POLL_INTERVALS[tenant.plan] ?? POLL_INTERVALS.free;

    // Calculate the cutoff time
    // Any domain not checked since before this time is due for a scan
    const cutoff = new Date(Date.now() - interval);

    // Find domains that are due for scanning
    // Either they have never been scanned (lastCheckedAt is null)
    // or their last check was before the cutoff time
    const dueDomains = await db.domain.findMany({
      where: {
        tenantId: tenant.id,
        deletedAt: null,
        OR: [
          // Never been checked
          { lastCheckedAt: null },
          // Last check was too long ago
          { lastCheckedAt: { lt: cutoff } },
        ],
      },
      select: {
        id: true,
        domain: true,
        lastCheckedAt: true,
      },
    });

    if (dueDomains.length === 0) continue;

    console.log(
      `[Scheduler] Queuing ${dueDomains.length} domain(s) for tenant ${tenant.id} (${tenant.plan} plan)`,
    );

    // Queue a scan job for each due domain
    for (const domain of dueDomains) {
      try {
        await dnsPollQueue.add(
          "scan-domain",
          {
            domainId: domain.id,
            tenantId: tenant.id,
            triggeredBy: "scheduler",
          },
          {
            // Use a predictable job ID to prevent duplicate jobs
            // If this domain is already queued, BullMQ will skip it
            jobId: `scheduled-scan-${domain.id}`,
          },
        );
        totalQueued++;
      } catch (err: any) {
        // Log but continue — one failed queue should not stop the rest
        console.error(
          `[Scheduler] Failed to queue domain ${domain.domain}:`,
          err.message,
        );
      }
    }
  }

  if (totalQueued > 0) {
    console.log(`[Scheduler]  Queued ${totalQueued} domain scan(s)`);
  } else {
    console.log("[Scheduler] No domains due for scanning right now");
  }
}

// ─────────────────────────────────────────────
// WEEKLY REPORTS
// ─────────────────────────────────────────────

// Sends the weekly report to every tenant once per week, on Monday ~9am.
//
// Two problems this guards against:
//  1. O(N²) sends — the old code ran this inside the per-tenant scan loop and
//     re-fetched + mailed ALL tenants on every iteration. Now it runs once per
//     scheduler tick and iterates tenants a single time.
//  2. Duplicate sends — the scheduler runs every 5 minutes, so the 9:00–9:05
//     Monday window matches on (up to) two consecutive ticks, and a restart in
//     that window would match again. We claim a per-ISO-week marker in Redis
//     with SET NX so the batch fires at most once per week across restarts and
//     across multiple scheduler instances.
async function maybeSendWeeklyReports(): Promise<void> {
  const now = new Date();
  const isMonday = now.getDay() === 1;
  const isReportTime = now.getHours() === 9 && now.getMinutes() < 5;

  if (!isMonday || !isReportTime) return;

  // Claim the send for this ISO week. SET key val NX EX:
  //  - NX  → only sets if the key does not already exist (atomic claim)
  //  - EX  → auto-expires after 8 days so the key never lingers between weeks
  // If the key already exists, another tick/instance already sent this week.
  const markerKey = `weekly-report:sent:${isoWeekKey(now)}`;
  let claimed: string | null = null;

  try {
    claimed = await redis.set(markerKey, now.toISOString(), "EX", 8 * 24 * 60 * 60, "NX");
  } catch (err: any) {
    // If Redis is unreachable we skip this tick rather than risk a duplicate
    // blast. The next 5-minute tick (still inside the window) will retry.
    console.error("[Scheduler] Weekly-report marker check failed:", err.message);
    return;
  }

  if (claimed !== "OK") {
    // Already sent this week — nothing to do.
    return;
  }

  console.log("[Scheduler] Sending weekly reports...");

  const tenants = await db.tenant.findMany({
    where: { deletedAt: null },
    select: { id: true },
  });

  let sent = 0;
  for (const tenant of tenants) {
    try {
      await sendWeeklyReport(tenant.id);
      sent++;
    } catch (err: any) {
      console.error(
        `[Scheduler] Weekly report failed for ${tenant.id}:`,
        err.message,
      );
    }
  }

  console.log(`[Scheduler] Weekly reports sent to ${sent}/${tenants.length} tenant(s)`);
}

// Builds a stable per-week key like "2026-W32" (ISO-8601 week numbering).
// Used to scope the once-per-week send marker.
function isoWeekKey(date: Date): string {
  // Copy so we don't mutate the caller's Date. Work in UTC to avoid DST/tz
  // drift shifting the week boundary.
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );

  // ISO week: Thursday determines the year the week belongs to.
  // getUTCDay() is 0 (Sun)..6 (Sat); map Sunday to 7.
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);

  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );

  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}
