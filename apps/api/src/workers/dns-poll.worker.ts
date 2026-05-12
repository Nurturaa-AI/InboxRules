// src/workers/dns-poll.worker.ts
//
// This worker listens to the 'dns-poll' queue and processes jobs.
// A job is added to this queue in two ways:
//   1. When a user adds a new domain (immediate scan)
//   2. By the scheduler (every 6h for pro, 24h for free)
//
// The worker runs independently from the HTTP server.
// If the HTTP server is slow or busy, this worker is unaffected.

import { Worker, Job } from "bullmq";
import db from "../db";
import { runAndSaveScan } from "../modules/domains/domains.service";
import { alertDispatchQueue } from "../queue";

// ─────────────────────────────────────────────
// TYPES
// Define what data a dns-poll job carries
// ─────────────────────────────────────────────

interface DnsPollJobData {
  domainId: string;
  tenantId: string;
  // Who triggered this scan — useful for logging and prioritization
  triggeredBy: "user_add" | "manual" | "scheduler";
}

// ─────────────────────────────────────────────
// REDIS CONNECTION CONFIG
// BullMQ needs its own connection config object
// It cannot share the ioredis instance directly
// ─────────────────────────────────────────────

function getRedisConnection() {
  const url = process.env.REDIS_URL;

  // Fail loudly if Redis URL is not configured
  // Better to crash at startup than fail silently on every job
  if (!url) {
    throw new Error("REDIS_URL environment variable is not set");
  }

  const parsed = new URL(url);

  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || "6379", 10),
    // Extract password from the URL if present
    password: parsed.password || undefined,
    // Enable TLS for Upstash (rediss:// protocol)
    tls: url.startsWith("rediss://") ? {} : undefined,
  };
}

// ─────────────────────────────────────────────
// WORKER DEFINITION
// ─────────────────────────────────────────────

export function createDnsPollWorker() {
  const worker = new Worker<DnsPollJobData>(
    // Must match the queue name in queue.ts
    "dns-poll",

    // This function runs for every job pulled from the queue
    async (job: Job<DnsPollJobData>) => {
      const { domainId, tenantId, triggeredBy } = job.data;

      // Log the start of this job so we can trace issues
      console.log(
        `[DNS Worker] Starting scan for domain ${domainId} (triggered by: ${triggeredBy})`,
      );

      // Update job progress so Bull Board dashboard shows activity
      await job.updateProgress(10);

      // Verify the domain still exists before scanning
      // It may have been deleted after the job was queued
      const domain = await db.domain.findFirst({
        where: {
          id: domainId,
          tenantId,
          // Only scan domains that have not been soft deleted
          deletedAt: null,
        },
      });

      // If domain was deleted, skip this job silently
      // No need to throw an error — just log and move on
      if (!domain) {
        console.log(
          `[DNS Worker] Domain ${domainId} not found or deleted — skipping`,
        );
        return { skipped: true, reason: "domain_not_found" };
      }

      await job.updateProgress(20);

      // Run the actual DNS scan and save results to the database
      // runAndSaveScan is defined in domains.service.ts
      // It handles: DNS check → snapshot save → domain status update → change detection
      let scanResult;
      try {
        scanResult = await runAndSaveScan(domainId, tenantId);
      } catch (err: any) {
        // Log the error with context so we can debug it
        console.error(
          `[DNS Worker] Scan failed for domain ${domain.domain}:`,
          err.message,
        );

        // Re-throw so BullMQ knows this job failed
        // BullMQ will retry it based on the queue's retry config
        throw new Error(`DNS scan failed for ${domain.domain}: ${err.message}`);
      }

      await job.updateProgress(80);

      // Check if this scan detected any changes compared to the previous scan
      // If there are new change events, queue alert notifications
      const unresolvedChanges = await db.dnsChangeEvent.findMany({
        where: {
          domainId,
          // Only alert on changes detected in the last 5 minutes
          // This prevents re-alerting on old changes if the worker restarts
          detectedAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000),
          },
          // Only alert on changes we have not already alerted about
          acknowledged: false,
        },
      });

      // Queue an alert for each new change event
      // We use Promise.allSettled so one failed alert does not block others
      if (unresolvedChanges.length > 0) {
        console.log(
          `[DNS Worker] Found ${unresolvedChanges.length} new change(s) for ${domain.domain} — queuing alerts`,
        );

        await Promise.allSettled(
          unresolvedChanges.map((change) =>
            alertDispatchQueue.add(
              "send-alert",
              {
                changeEventId: change.id,
                tenantId,
                domainId,
                domainName: domain.domain,
                changeType: change.changeType,
                severity: change.severity,
              },
              {
                // Deduplicate alerts — same change event gets one alert only
                jobId: `alert-${change.id}`,
              },
            ),
          ),
        );
      }

      await job.updateProgress(100);

      console.log(
        `[DNS Worker] Scan complete for ${domain.domain} — ` +
          `score: ${scanResult.result.overallScore}/100, ` +
          `changes: ${unresolvedChanges.length}`,
      );

      // Return a summary — visible in Bull Board dashboard
      return {
        domain: domain.domain,
        score: scanResult.result.overallScore,
        changesDetected: unresolvedChanges.length,
        spf: scanResult.result.spf.result,
        dkimCount: scanResult.result.dkim.length,
        dmarc: scanResult.result.dmarc.result,
      };
    },

    // Worker configuration
    {
      connection: getRedisConnection(),

      // How many jobs this worker processes at the same time
      // Keep at 5 — DNS queries are IO-bound so concurrency helps
      // But too high and we might hit DNS resolver rate limits
      concurrency: 5,

      // Automatically remove completed and failed jobs after a while
      // This prevents Redis from filling up
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    },
  );

  // ─────────────────────────────────────────────
  // WORKER EVENT HANDLERS
  // Log important events so we can monitor the worker
  // ─────────────────────────────────────────────

  // Fires when a job completes successfully
  worker.on("completed", (job, result) => {
    console.log(`[DNS Worker] Job ${job.id} completed:`, result);
  });

  // Fires when a job fails after all retries are exhausted
  worker.on("failed", (job, err) => {
    console.error(
      `[DNS Worker] Job ${job?.id} failed permanently:`,
      err.message,
    );
  });

  // Fires when there is a connection error with Redis
  worker.on("error", (err) => {
    console.error("[DNS Worker] Redis connection error:", err.message);
  });

  console.log("DNS poll worker started");

  return worker;
}
