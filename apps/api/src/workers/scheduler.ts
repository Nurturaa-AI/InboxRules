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
import { dnsPollQueue } from "../queue";

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
