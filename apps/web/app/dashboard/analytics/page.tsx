"use client"

import { useState } from "react"
import {
  RefreshCw,
  Activity,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  BarChart3,
} from "lucide-react"

import { useApiQuery, refreshAllQueries } from "@/lib/useApiQuery"
import { cn, scoreToStatus } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/PageHeader"
import { MetricCard } from "@/components/shared/MetricCard"
import { HealthScore } from "@/components/shared/HealthScore"
import { AuthStatusBadge } from "@/components/shared/AuthStatusBadge"
import { StatusBadge, statusFromString } from "@/components/shared/StatusBadge"
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable"
import { EmptyState } from "@/components/shared/EmptyState"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { FilterBar } from "@/components/shared/FilterBar"

interface Domain {
  id: string
  domain: string
  healthScore: number
  spfStatus: string
  dkimStatus: string
  dmarcStatus: string
  createdAt: string
}

interface HealthPoint {
  date: string // YYYY-MM-DD
  score: number
  sampleCount: number
}

interface HealthHistory {
  period: number
  points: HealthPoint[]
}

const BAR_BG: Record<ReturnType<typeof scoreToStatus>, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
}

const PERIODS: { value: string; label: string }[] = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
]

const LEGEND: { cls: string; label: string }[] = [
  { cls: "bg-success", label: "Healthy (80+)" },
  { cls: "bg-warning", label: "Warning (60+)" },
  { cls: "bg-danger", label: "Critical (<60)" },
]

// Short bar label from a YYYY-MM-DD key. Weekday for short windows, M/D for
// longer ones. Parse as UTC so it matches the server's snapshot bucketing.
function pointLabel(dateKey: string, period: number): string {
  const d = new Date(`${dateKey}T00:00:00Z`)
  if (period <= 14) {
    return d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })
  }
  return d.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    timeZone: "UTC",
  })
}

export default function AnalyticsPage() {
  // Period drives only the (period-scoped) health-history chart. The KPI tiles
  // and the table reflect current domain state, which is not a function of the
  // selected lookback window.
  const [period, setPeriod] = useState<string>("7")

  const historyQ = useApiQuery<HealthHistory>(
    `/analytics/health-history?period=${period}`
  )
  const domainsQ = useApiQuery<Domain[]>("/domains?limit=100")

  const domainsLoading = domainsQ.loading
  const domainsError = domainsQ.error

  // Real current-state counts using the shared ≥80/≥60/<60 thresholds
  // (consistent with HealthScore and the per-row Status badge below).
  const domains = domainsQ.data ?? []
  const avgScore = domains.length
    ? Math.round(domains.reduce((a, d) => a + d.healthScore, 0) / domains.length)
    : 0
  const healthy = domains.filter((d) => d.healthScore >= 80).length
  const warning = domains.filter(
    (d) => d.healthScore >= 60 && d.healthScore < 80
  ).length
  const critical = domains.filter((d) => d.healthScore < 60).length

  const points = historyQ.data?.points ?? []
  const periodNum = Number(period)
  const historyAvg = points.length
    ? Math.round(points.reduce((a, p) => a + p.score, 0) / points.length)
    : 0
  const maxScore = Math.max(...points.map((p) => p.score), 1)

  const sortedDomains = [...domains].sort((a, b) => b.healthScore - a.healthScore)

  const columns: DataTableColumn<Domain>[] = [
    {
      key: "domain",
      header: "Domain",
      cell: (d) => (
        <span className="text-sm font-semibold text-foreground">
          {d.domain}
        </span>
      ),
    },
    {
      key: "health",
      header: "Health Score",
      className: "w-44",
      cell: (d) => <HealthScore score={d.healthScore} size="sm" />,
    },
    { key: "spf", header: "SPF", cell: (d) => <AuthStatusBadge status={d.spfStatus} /> },
    { key: "dkim", header: "DKIM", cell: (d) => <AuthStatusBadge status={d.dkimStatus} /> },
    { key: "dmarc", header: "DMARC", cell: (d) => <AuthStatusBadge status={d.dmarcStatus} /> },
    {
      key: "status",
      header: "Status",
      cell: (d) => (
        <StatusBadge
          status={statusFromString(
            d.healthScore >= 80 ? "healthy" : d.healthScore >= 60 ? "warn" : "critical"
          )}
          label={
            d.healthScore >= 80
              ? "Healthy"
              : d.healthScore >= 60
                ? "Warning"
                : "Critical"
          }
        />
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Deliverability trends and compliance data"
        action={
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => refreshAllQueries()}
            aria-label="Refresh analytics"
          >
            <RefreshCw
              className={
                domainsLoading || historyQ.loading ? "animate-spin" : ""
              }
            />
          </Button>
        }
      />

      {/* KPI row — current domain state (shared ≥80/≥60/<60 thresholds) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          variant="primary"
          label="Avg Health Score"
          value={domainsLoading ? "—" : avgScore}
          icon={Activity}
        />
        <MetricCard
          variant="success"
          label="Healthy Domains"
          value={domainsLoading ? "—" : healthy}
          icon={ShieldCheck}
          hint="Score ≥ 80"
        />
        <MetricCard
          variant="warning"
          label="Needs Attention"
          value={domainsLoading ? "—" : warning}
          icon={AlertTriangle}
          hint="Score 60–79"
        />
        <MetricCard
          variant="danger"
          label="Critical Issues"
          value={domainsLoading ? "—" : critical}
          icon={XCircle}
          hint="Score < 60"
        />
      </div>

      {/* Health score chart — real snapshot history for the selected window */}
      <Card className="gap-0 p-0">
        <CardHeader className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-sm">Average Health Score</CardTitle>
            {points.length > 0 && (
              <span className="rounded-md bg-success-subtle px-2 py-0.5 font-mono text-xs font-semibold text-success">
                {historyAvg}/100 avg
              </span>
            )}
          </div>
          <FilterBar
            options={PERIODS}
            value={period}
            onValueChange={setPeriod}
            aria-label="Select time period"
          />
        </CardHeader>
        <CardContent className="p-5">
          {historyQ.loading ? (
            <div className="flex h-36 items-end gap-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className="h-full flex-1 animate-pulse rounded-t-md bg-muted"
                  style={{ height: `${40 + ((i * 13) % 50)}%` }}
                />
              ))}
            </div>
          ) : historyQ.error ? (
            <EmptyState
              icon={BarChart3}
              size="sm"
              title="Failed to load history"
              description={historyQ.error}
            />
          ) : points.length === 0 ? (
            <EmptyState
              icon={Activity}
              size="sm"
              title="Not enough scan history yet"
              description="Points appear here as your domains are scanned over time."
            />
          ) : (
            <>
              <div className="flex h-36 items-end gap-2">
                {points.map((p) => {
                  const status = scoreToStatus(p.score)
                  return (
                    <div
                      key={p.date}
                      className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                    >
                      <span className="font-mono text-[10px] font-semibold text-muted-foreground">
                        {p.score}
                      </span>
                      <div
                        title={`${p.date}: ${p.score}/100 (${p.sampleCount} scan${p.sampleCount !== 1 ? "s" : ""})`}
                        className={cn(
                          "w-full rounded-t-md transition-opacity hover:opacity-75",
                          BAR_BG[status]
                        )}
                        style={{
                          height: `${(p.score / maxScore) * 100}%`,
                          minHeight: 4,
                        }}
                      />
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {pointLabel(p.date, periodNum)}
                      </span>
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 flex flex-wrap justify-center gap-4">
                {LEGEND.map((item) => (
                  <div key={item.label} className="flex items-center gap-1.5">
                    <span className={cn("size-2.5 rounded-sm", item.cls)} />
                    <span className="text-xs text-muted-foreground">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Domain performance table */}
      <Card className="gap-0 overflow-hidden p-0">
        <CardHeader className="border-b p-5">
          <CardTitle className="text-sm">Domain Performance</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          {domainsLoading ? (
            <LoadingSkeleton variant="table" count={5} />
          ) : domainsError ? (
            <EmptyState
              icon={BarChart3}
              title="Failed to load domains"
              description={domainsError}
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refreshAllQueries()}
                >
                  <RefreshCw />
                  Try again
                </Button>
              }
            />
          ) : domains.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              size="sm"
              title="No domains yet"
              description="Add domains to see performance data."
            />
          ) : (
            <DataTable
              columns={columns}
              data={sortedDomains}
              getRowKey={(d) => d.id}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}