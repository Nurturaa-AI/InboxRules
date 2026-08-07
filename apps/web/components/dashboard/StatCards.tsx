"use client"

import { Globe, ShieldCheck, AlertTriangle, Mail } from "lucide-react"

import { useApiQuery } from "@/lib/useApiQuery"
import { MetricCard } from "@/components/shared/MetricCard"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"

// Shape returned by GET /analytics/overview (the subset this widget reads).
interface Overview {
  health: {
    average: number
    healthy: number
    warning: number
    critical: number
  }
  alerts: {
    total: number
    unresolved: number
    critical: number
    previousTotal: number
    trendPct: number | null
  }
  suppressions: {
    total: number
    previousTotal: number
    trendPct: number | null
  }
}

// Turn a nullable trendPct into MetricCard delta/trend props. Null (no prior
// period to compare) renders no delta at all — never a fabricated 0%.
function trendProps(pct: number | null): {
  delta?: string
  trend: "up" | "down" | "neutral"
} {
  if (pct === null) return { trend: "neutral" }
  if (pct > 0) return { delta: `+${pct}%`, trend: "up" }
  if (pct < 0) return { delta: `${pct}%`, trend: "down" }
  return { delta: "0%", trend: "neutral" }
}

export default function StatCards() {
  const { data, loading } = useApiQuery<Overview>("/analytics/overview?period=7")

  if (loading) {
    return <LoadingSkeleton variant="metrics" count={4} />
  }

  const health = data?.health
  const totalDomains = health
    ? health.healthy + health.warning + health.critical
    : 0
  const healthyDomains = health?.healthy ?? 0
  const healthyPct =
    totalDomains > 0 ? Math.round((healthyDomains / totalDomains) * 100) : 0

  const unresolvedAlerts = data?.alerts.unresolved ?? 0
  const suppressions = data?.suppressions.total ?? 0
  const suppressionsTrend = trendProps(data?.suppressions.trendPct ?? null)

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        label="Total Domains"
        value={totalDomains}
        icon={Globe}
        hint={`${healthyDomains} healthy`}
      />
      <MetricCard
        label="Healthy Domains"
        value={healthyDomains}
        icon={ShieldCheck}
        hint={totalDomains > 0 ? `${healthyPct}% of total` : "No domains yet"}
      />
      <MetricCard
        label="Active Alerts"
        value={unresolvedAlerts}
        icon={AlertTriangle}
        trendUpIsGood={false}
        hint={unresolvedAlerts === 0 ? "All clear" : "Need attention"}
      />
      <MetricCard
        label="Unsubscribes"
        value={suppressions}
        icon={Mail}
        {...suppressionsTrend}
        trendUpIsGood={false}
        hint="Last 7 days"
      />
    </div>
  )
}
