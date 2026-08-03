// src/modules/domains/domains.service.ts
//
// The service layer contains all the business logic for domains.
// Routes call service functions — services talk to the database.
// This separation means we can test business logic without
// needing to set up HTTP requests.

import db from "../../db";
import { dnsPollQueue } from "../../queue";
import { checkDomain, detectEsp } from "../dns-checker/dns.service";
import type { AddDomainInput, ListDomainsInput } from "./domains.schema";

// ─────────────────────────────────────────────
// ADD A DOMAIN
// ─────────────────────────────────────────────

export async function addDomain(tenantId: string, input: AddDomainInput) {
  // Look up any existing row for this (tenant, domain) — INCLUDING soft-deleted
  // ones. The DB enforces @@unique([tenantId, domain]) and does NOT scope that
  // to deletedAt, so a previously-removed domain still occupies the unique slot.
  // If we only checked deletedAt: null here we would fall through to create()
  // and hit a P2002 unique violation that surfaces as a generic 500.
  const existing = await db.domain.findUnique({
    where: {
      tenantId_domain: { tenantId, domain: input.domain },
    },
  });

  // An active (non-deleted) row means it is genuinely already in the account.
  if (existing && existing.deletedAt === null) {
    throw new Error(`Domain ${input.domain} is already in your account`);
  }

  // Check plan limits — free plan allows maximum 3 domains
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    throw new Error("Tenant not found");
  }

  // Count how many domains this tenant currently has
  const domainCount = await db.domain.count({
    where: {
      tenantId,
      deletedAt: null,
    },
  });

  // Enforce domain limits per plan
  const planLimits: Record<string, number> = {
    free: 3,
    pro: 50,
    agency: 500,
  };

  const limit = planLimits[tenant.plan] ?? 3;

  if (domainCount >= limit) {
    throw new Error(
      `Your ${tenant.plan} plan allows a maximum of ${limit} domain(s). ` +
        `You currently have ${domainCount}. Please upgrade to add more.`,
    );
  }

  // Create the domain, or reactivate a previously soft-deleted one.
  // Reactivating (rather than deleting + recreating) keeps the same id and any
  // historical snapshots/events attached to it. Fields are reset to a clean
  // baseline so stale statuses from before the deletion do not linger.
  const baseline = {
    healthScore: 0,
    spfStatus: "unknown",
    dkimStatus: "unknown",
    dmarcStatus: "unknown",
    unsubStatus: "unknown",
    detectedEsp: null,
    lastCheckedAt: null,
  };

  const domain = existing
    ? await db.domain.update({
        where: { id: existing.id },
        data: { ...baseline, deletedAt: null },
      })
    : await db.domain.create({
        data: { tenantId, domain: input.domain, ...baseline },
      });

  // Queue an immediate DNS scan so the user sees results quickly.
  // This is best-effort: the domain is already persisted, and the scheduler
  // will pick it up within a few minutes regardless. A transient Redis outage
  // must NOT turn a successful add into a 500 — so we log and move on.
  try {
    await dnsPollQueue.add(
      "scan-domain",
      {
        domainId: domain.id,
        tenantId,
        // Mark as triggered by user so we can prioritize it
        triggeredBy: "user_add",
      },
      {
        // Run this job immediately (no delay)
        delay: 0,
        // Give it a unique job ID so duplicate jobs are rejected
        jobId: `scan-${domain.id}-${Date.now()}`,
      },
    );
  } catch (err) {
    console.error(
      `[addDomain] Failed to queue initial scan for ${domain.domain} (${domain.id}); scheduler will retry:`,
      err instanceof Error ? err.message : err,
    );
  }

  // Write an audit log entry
  await db.auditLog.create({
    data: {
      tenantId,
      action: "domain.added",
      resourceType: "domain",
      resourceId: domain.id,
      metadata: { domain: input.domain },
    },
  });

  return domain;
}

// ─────────────────────────────────────────────
// LIST DOMAINS
// ─────────────────────────────────────────────

export async function listDomains(tenantId: string, input: ListDomainsInput) {
  // Build the filter conditions
  const where: any = {
    tenantId,
    // Never return soft-deleted domains
    deletedAt: null,
  };

  // Apply health status filter if requested
  if (input.status !== "all") {
    if (input.status === "healthy") {
      // Healthy = score 80 or above
      where.healthScore = { gte: 80 };
    } else if (input.status === "warning") {
      // Warning = score between 50 and 79
      where.healthScore = { gte: 50, lt: 80 };
    } else if (input.status === "critical") {
      // Critical = score below 50
      where.healthScore = { lt: 50 };
    }
  }

  // Apply cursor for pagination
  // If a cursor is provided, only return domains after that cursor
  if (input.cursor) {
    where.id = { gt: input.cursor };
  }

  // Fetch domains from the database
  const domains = await db.domain.findMany({
    where,
    // Return one extra record so we know if there is a next page
    take: input.limit + 1,
    orderBy: {
      // Most recently added domains first
      createdAt: "desc",
    },
    // Only select the fields we need — avoids over-fetching
    select: {
      id: true,
      domain: true,
      healthScore: true,
      spfStatus: true,
      dkimStatus: true,
      dmarcStatus: true,
      unsubStatus: true,
      detectedEsp: true,
      lastCheckedAt: true,
      createdAt: true,
    },
  });

  // Check if there are more pages after this one
  const hasNextPage = domains.length > input.limit;

  // Remove the extra record we fetched — it was only used to check hasNextPage
  const items = hasNextPage ? domains.slice(0, input.limit) : domains;

  // The cursor for the next page is the ID of the last item in this page
  const nextCursor = hasNextPage ? items[items.length - 1]?.id : null;

  return {
    items,
    nextCursor,
    hasNextPage,
    // Total count for display purposes (e.g. "Showing 20 of 45 domains")
    total: await db.domain.count({ where: { tenantId, deletedAt: null } }),
  };
}

// ─────────────────────────────────────────────
// GET A SINGLE DOMAIN WITH FULL DETAILS
// ─────────────────────────────────────────────

export async function getDomain(tenantId: string, domainId: string) {
  const domain = await db.domain.findFirst({
    where: {
      id: domainId,
      // Ensure the domain belongs to this tenant — prevents data leakage
      tenantId,
      deletedAt: null,
    },
    include: {
      // Include the most recent DNS snapshot for full record details
      snapshots: {
        orderBy: { capturedAt: "desc" },
        // Only the latest snapshot
        take: 1,
      },
      // Include recent unresolved change events (alerts)
      changeEvents: {
        where: { acknowledged: false },
        orderBy: { detectedAt: "desc" },
        take: 10,
      },
    },
  });

  // If domain not found or belongs to another tenant, return null
  // The route layer will convert this to a 404 response
  if (!domain) {
    return null;
  }

  return domain;
}

// ─────────────────────────────────────────────
// TRIGGER A MANUAL SCAN
// ─────────────────────────────────────────────

export async function triggerScan(tenantId: string, domainId: string) {
  // Verify domain exists and belongs to this tenant
  const domain = await db.domain.findFirst({
    where: {
      id: domainId,
      tenantId,
      deletedAt: null,
    },
  });

  if (!domain) {
    return null;
  }

  // Check if there is already a pending scan for this domain
  // We do not want to queue duplicate scans
  const existingJob = await dnsPollQueue.getJob(`manual-scan-${domainId}`);

  if (existingJob) {
    const state = await existingJob.getState();
    // If job is waiting or active, do not queue another one
    if (state === "waiting" || state === "active") {
      return {
        domain,
        message: "A scan is already in progress for this domain",
        alreadyQueued: true,
      };
    }
  }

  // Queue the scan job
  await dnsPollQueue.add(
    "scan-domain",
    {
      domainId: domain.id,
      tenantId,
      triggeredBy: "manual",
    },
    {
      // Use a predictable job ID so we can check for it above
      jobId: `manual-scan-${domainId}`,
      // No delay — run immediately
      delay: 0,
    },
  );

  // Write audit log
  await db.auditLog.create({
    data: {
      tenantId,
      action: "domain.scan_triggered",
      resourceType: "domain",
      resourceId: domainId,
      metadata: { domain: domain.domain, triggeredBy: "manual" },
    },
  });

  return {
    domain,
    message: "Scan queued. Results will appear in a few seconds.",
    alreadyQueued: false,
  };
}

// ─────────────────────────────────────────────
// DELETE A DOMAIN (soft delete)
// ─────────────────────────────────────────────

export async function deleteDomain(tenantId: string, domainId: string) {
  // Verify domain exists and belongs to this tenant
  const domain = await db.domain.findFirst({
    where: {
      id: domainId,
      tenantId,
      deletedAt: null,
    },
  });

  if (!domain) {
    return null;
  }

  // Soft delete — we set deletedAt instead of actually deleting the row
  // This preserves historical data and makes recovery possible
  await db.domain.update({
    where: { id: domainId },
    data: { deletedAt: new Date() },
  });

  // Write audit log
  await db.auditLog.create({
    data: {
      tenantId,
      action: "domain.deleted",
      resourceType: "domain",
      resourceId: domainId,
      metadata: { domain: domain.domain },
    },
  });

  return domain;
}

// ─────────────────────────────────────────────
// RUN A SCAN AND SAVE RESULTS
// Called by the BullMQ worker — not directly by routes
// ─────────────────────────────────────────────

export async function runAndSaveScan(domainId: string, tenantId: string) {
  // Get the domain from the database
  const domain = await db.domain.findFirst({
    where: { id: domainId, tenantId, deletedAt: null },
  });

  if (!domain) {
    throw new Error(`Domain ${domainId} not found`);
  }

  // Run the actual DNS check
  const result = await checkDomain(domain.domain);

  // Detect which ESP this domain uses
  const detectedEsp = detectEsp(result.spf.record, result.dkim);

  // Get the previous snapshot to compare (for change detection)
  const previousSnapshot = await db.dnsSnapshot.findFirst({
    where: { domainId },
    orderBy: { capturedAt: "desc" },
  });

  // Save the new snapshot to the database
  const snapshot = await db.dnsSnapshot.create({
    data: {
      domainId,
      spfRecord: result.spf.record,
      spfLookupCount: result.spf.lookupCount,
      spfResult: result.spf.result,
      // Store DKIM results as JSON array
      dkimSelectors: result.dkim as any,
      dmarcRecord: result.dmarc.record,
      dmarcPolicy: result.dmarc.policy,
      dmarcPct: result.dmarc.pct,
      overallScore: result.overallScore,
    },
  });

  /// Cast each status value to 'any' to bypass the stale enum types
  // After prisma generate runs cleanly these casts will not be needed
  await db.domain.update({
    where: { id: domainId },
    data: {
      healthScore: result.overallScore,
      spfStatus: result.spf.result as any,
      dkimStatus: (result.dkim.some((d) => d.valid) ? "pass" : "fail") as any,
      dmarcStatus: result.dmarc.result as any,
      detectedEsp: detectedEsp ?? null,
      lastCheckedAt: new Date(),
    },
  });

  // Detect changes between this scan and the previous one
  // and create change events if anything important changed
  if (previousSnapshot) {
    await detectAndSaveChanges(domainId, tenantId, previousSnapshot, result);
  }

  return { snapshot, result };
}

// ─────────────────────────────────────────────
// DETECT CHANGES BETWEEN TWO SNAPSHOTS
// ─────────────────────────────────────────────

async function detectAndSaveChanges(
  domainId: string,
  tenantId: string,
  previous: any,
  current: any,
) {
  const changes = [];

  // Check if SPF lookup count crossed the limit
  if (
    previous.spfLookupCount !== null &&
    previous.spfLookupCount <= 10 &&
    current.spf.lookupCount > 10
  ) {
    changes.push({
      domainId,
      tenantId,
      changeType: "spf_lookup_exceeded",
      severity: "critical",
      previousValue: `${previous.spfLookupCount} lookups`,
      currentValue: `${current.spf.lookupCount} lookups`,
    });
  }

  // Check if SPF record changed
  if (previous.spfRecord && previous.spfRecord !== current.spf.record) {
    changes.push({
      domainId,
      tenantId,
      changeType: "spf_record_changed",
      severity: "warning",
      previousValue: previous.spfRecord,
      currentValue: current.spf.record,
    });
  }

  // Check if DMARC policy was weakened
  const policyStrength: Record<string, number> = {
    reject: 3,
    quarantine: 2,
    none: 1,
  };

  const previousPolicyStrength = policyStrength[previous.dmarcPolicy] ?? 0;
  const currentPolicyStrength = policyStrength[current.dmarc.policy] ?? 0;

  if (previousPolicyStrength > currentPolicyStrength) {
    changes.push({
      domainId,
      tenantId,
      changeType: "dmarc_policy_weakened",
      severity: "critical",
      previousValue: previous.dmarcPolicy,
      currentValue: current.dmarc.policy,
    });
  }

  // Check if DMARC record disappeared
  if (previous.dmarcRecord && !current.dmarc.record) {
    changes.push({
      domainId,
      tenantId,
      changeType: "dmarc_record_removed",
      severity: "critical",
      previousValue: previous.dmarcRecord,
      currentValue: null,
    });
  }

  // Save all detected changes to the database
  // Save all detected changes to the database
  // Using create in a loop instead of createMany
  // to avoid TypeScript inference issues with plain string fields
  if (changes.length > 0) {
    for (const change of changes) {
      await db.dnsChangeEvent.create({
        data: {
          domainId: change.domainId,
          tenantId: change.tenantId,
          changeType: change.changeType,
          severity: change.severity as any,
          previousValue: change.previousValue ?? null,
          currentValue: change.currentValue ?? null,
        },
      });
    }
  }
}
