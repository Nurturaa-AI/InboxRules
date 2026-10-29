"use client"

import { Globe, ShieldCheck, AlertTriangle, Mail } from "lucide-react"

import { useApiQuery } from "@/lib/useApiQuery"
import { MetricCard } from "@/components/shared/MetricCard"
import { Button } from "@/components/ui/button"
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
  const { data, loading, error, refetch } = useApiQuery<Overview>("/analytics/overview?period=7")

  if (loading) {
    return <LoadingSkeleton variant="metrics" count={4} />
  }

  if (error || !data) return <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-5 text-sm"><p>Overview unavailable. {error}</p><Button variant="outline" size="sm" onClick={refetch}>Try again</Button></div>

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
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <MetricCard
        variant="primary"
        label="Total Domains"
        value={totalDomains}
        icon={Globe}
        hint={`${healthyDomains} scoring 80 or higher`}
      />
      <MetricCard
        variant="success"
        label="Domains scoring 80+"
        value={healthyDomains}
        icon={ShieldCheck}
        hint={totalDomains > 0 ? `${healthyPct}% of configured domains` : "No domains yet"}
      />
      <MetricCard
        variant="warning"
        label="Unacknowledged alerts"
        value={unresolvedAlerts}
        icon={AlertTriangle}
        trendUpIsGood={false}
        hint={unresolvedAlerts === 0 ? "No alerts awaiting review" : "Need attention"}
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
