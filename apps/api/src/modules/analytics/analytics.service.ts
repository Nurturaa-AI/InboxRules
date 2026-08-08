// src/modules/analytics/analytics.service.ts
//
// Analytics aggregates — REAL data only. Every query scopes by tenantId.
// DnsSnapshot has no tenantId — resolve domain IDs once and reuse.

import db from "../../db";

// ─────────────────────────────────────────────
// HEALTH HISTORY — daily average score
// ─────────────────────────────────────────────

export async function getHealthHistory(tenantId: string, period: number) {
  // Resolve the tenant's domain IDs once
  const domains = await db.domain.findMany({
    where: { tenantId, deletedAt: null },
    select: { id: true },
  });

  const domainIds = domains.map((d) => d.id);

  if (domainIds.length === 0) {
    // No domains → no snapshots
    return { period, points: [] };
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - period);

  // Fetch all snapshots in the window
  const snapshots = await db.dnsSnapshot.findMany({
    where: {
      domainId: { in: domainIds },
      capturedAt: { gte: cutoff },
    },
    select: {
      capturedAt: true,
      overallScore: true,
    },
    orderBy: { capturedAt: "asc" },
  });

  // Bucket by date (YYYY-MM-DD) and compute daily average
  const buckets = new Map<
    string,
    { scores: number[]; date: string }
  >();

  for (const snap of snapshots) {
    const dateKey = snap.capturedAt.toISOString().slice(0, 10);
    if (!buckets.has(dateKey)) {
      buckets.set(dateKey, { date: dateKey, scores: [] });
    }
    buckets.get(dateKey)!.scores.push(snap.overallScore);
  }

  // Compute averages
  const points = Array.from(buckets.values())
    .map((bucket) => {
      const sum = bucket.scores.reduce((acc, val) => acc + val, 0);
      const avg = bucket.scores.length > 0 ? sum / bucket.scores.length : 0;
      return {
        date: bucket.date,
        score: Math.round(avg),
        sampleCount: bucket.scores.length,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  return { period, points };
}

// ─────────────────────────────────────────────
// OVERVIEW — KPIs with trend comparisons
// ─────────────────────────────────────────────

export async function getOverview(tenantId: string, period: number) {
  const now = new Date();
  const currentStart = new Date(now);
  currentStart.setDate(currentStart.getDate() - period);

  const previousStart = new Date(currentStart);
  previousStart.setDate(previousStart.getDate() - period);

  // Resolve domain IDs for snapshot queries
  const domains = await db.domain.findMany({
    where: { tenantId, deletedAt: null },
    select: { id: true, healthScore: true, lastCheckedAt: true },
  });

  const domainIds = domains.map((d) => d.id);

  // Run independent aggregates in parallel
  const [scans, scansPrev, alerts, alertsPrev, suppressions, suppressionsPrev, ai, aiPrev] =
    await Promise.all([
      // Scans (DNS snapshots) in current window
      db.dnsSnapshot.count({
        where: {
          domainId: { in: domainIds },
          capturedAt: { gte: currentStart, lt: now },
        },
      }),
      // Scans in previous window
      db.dnsSnapshot.count({
        where: {
          domainId: { in: domainIds },
          capturedAt: { gte: previousStart, lt: currentStart },
        },
      }),
      // Alerts in current window
      db.dnsChangeEvent.aggregate({
        where: {
          tenantId,
          detectedAt: { gte: currentStart, lt: now },
        },
        _count: { id: true },
      }),
      // Alerts in previous window
      db.dnsChangeEvent.aggregate({
        where: {
          tenantId,
          detectedAt: { gte: previousStart, lt: currentStart },
        },
        _count: { id: true },
      }),
      // Suppressions in current window
      db.suppressionEvent.count({
        where: {
          tenantId,
          processedAt: { gte: currentStart, lt: now },
        },
      }),
      // Suppressions in previous window
      db.suppressionEvent.count({
        where: {
          tenantId,
          processedAt: { gte: previousStart, lt: currentStart },
        },
      }),
      // AI usage in current window
      db.aiUsageLog.aggregate({
        where: {
          tenantId,
          createdAt: { gte: currentStart, lt: now },
        },
        _count: { id: true },
        _sum: { costUsd: true },
      }),
      // AI usage in previous window
      db.aiUsageLog.aggregate({
        where: {
          tenantId,
          createdAt: { gte: previousStart, lt: currentStart },
        },
        _count: { id: true },
      }),
    ]);

  // Unresolved alerts (any time)
  const unresolvedAlerts = await db.dnsChangeEvent.count({
    where: { tenantId, acknowledged: false },
  });

  // Critical alerts in current window
  const criticalAlerts = await db.dnsChangeEvent.count({
    where: {
      tenantId,
      detectedAt: { gte: currentStart, lt: now },
      severity: "critical",
    },
  });

  // Health metrics from current domain health scores
  const total = domains.length;
  const healthy = domains.filter((d) => d.healthScore >= 80).length;
  const warning = domains.filter((d) => d.healthScore >= 50 && d.healthScore < 80).length;
  const critical = domains.filter((d) => d.healthScore < 50).length;

  const sum = domains.reduce((acc, d) => acc + d.healthScore, 0);
  const average = total > 0 ? Math.round(sum / total) : 0;

  // Compute trend percentages — only when prev > 0
  const scansTrend = scansPrev > 0 ? Math.round(((scans - scansPrev) / scansPrev) * 100) : null;
  const alertsTrend = alertsPrev._count.id > 0 ? Math.round(((alerts._count.id - alertsPrev._count.id) / alertsPrev._count.id) * 100) : null;
  const suppressionsTrend = suppressionsPrev > 0 ? Math.round(((suppressions - suppressionsPrev) / suppressionsPrev) * 100) : null;
  const aiTrend = aiPrev._count.id > 0 ? Math.round(((ai._count.id - aiPrev._count.id) / aiPrev._count.id) * 100) : null;

  return {
    period,
    health: {
      average,
      healthy,
      warning,
      critical,
    },
    scans: {
      total: scans,
      previousTotal: scansPrev,
      trendPct: scansTrend,
    },
    alerts: {
      total: alerts._count.id,
      unresolved: unresolvedAlerts,
      critical: criticalAlerts,
      previousTotal: alertsPrev._count.id,
      trendPct: alertsTrend,
    },
    suppressions: {
      total: suppressions,
      previousTotal: suppressionsPrev,
      trendPct: suppressionsTrend,
    },
    ai: {
      calls: ai._count.id,
      costUsd: ai._sum.costUsd ?? 0,
      previousCalls: aiPrev._count.id,
      trendPct: aiTrend,
    },
  };
}

// ─────────────────────────────────────────────
// COMPLIANCE SUMMARY — per-signal pass counts
// ─────────────────────────────────────────────

export async function getComplianceSummary(tenantId: string) {
  const domains = await db.domain.findMany({
    where: { tenantId, deletedAt: null },
    select: {
      id: true,
      lastCheckedAt: true,
      spfStatus: true,
      dkimStatus: true,
      dmarcStatus: true,
      bimiStatus: true,
      mtaStsStatus: true,
      tlsRptStatus: true,
    },
  });

  const total = domains.length;
  const scanned = domains.filter((d) => d.lastCheckedAt !== null).length;

  const signals = [
    {
      key: "spf",
      label: "SPF Records",
      pass: domains.filter((d) => d.spfStatus === "pass").length,
      total,
    },
    {
      key: "dkim",
      label: "DKIM Signatures",
      pass: domains.filter((d) => d.dkimStatus === "pass").length,
      total,
    },
    {
      key: "dmarc",
      label: "DMARC Policies",
      pass: domains.filter((d) => d.dmarcStatus === "pass").length,
      total,
    },
    {
      key: "bimi",
      label: "BIMI",
      pass: domains.filter((d) => d.bimiStatus === "pass").length,
      total,
    },
    {
      key: "mtaSts",
      label: "MTA-STS",
      pass: domains.filter((d) => d.mtaStsStatus === "pass").length,
      total,
    },
    {
      key: "tlsRpt",
      label: "TLS-RPT",
      pass: domains.filter((d) => d.tlsRptStatus === "pass").length,
      total,
    },
  ];

  return { total, scanned, signals };
}
