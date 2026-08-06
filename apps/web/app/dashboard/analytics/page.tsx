"use client"

import { RefreshCw, Activity, ShieldCheck, AlertTriangle, XCircle, BarChart3 } from "lucide-react"

import { useApiQuery } from "@/lib/useApiQuery"
import { cn, scoreToStatus } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/shared/PageHeader"
import { MetricCard } from "@/components/shared/MetricCard"
import { HealthScore } from "@/components/shared/HealthScore"
import { AuthStatusBadge } from "@/components/shared/AuthStatusBadge"
import { StatusBadge, statusFromString } from "@/components/shared/StatusBadge"
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable"
import { EmptyState } from "@/components/shared/EmptyState"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"

interface Domain {
  id: string
  domain: string
  healthScore: number
  spfStatus: string
  dkimStatus: string
  dmarcStatus: string
  createdAt: string
  snapshots: Array<{ overallScore: number; capturedAt: string }>
}

const BAR_BG: Record<ReturnType<typeof scoreToStatus>, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
}

export default function AnalyticsPage() {
  const { data, loading, error, refetch } =
    useApiQuery<Domain[]>("/domains?limit=100")

  const domains = data || []
  const avgScore = domains.length
    ? Math.round(domains.reduce((a, d) => a + d.healthScore, 0) / domains.length)
    : 0
  // Canonical thresholds (shared with HealthScore): ≥80 healthy, ≥60 warning, <60 critical.
  const healthy = domains.filter((d) => d.healthScore >= 80).length
  const warning = domains.filter(
    (d) => d.healthScore >= 60 && d.healthScore < 80
  ).length
  const critical = domains.filter((d) => d.healthScore < 60).length

  // NOTE: Placeholder sample data. The 7-day series is derived from the current
  // average, NOT real snapshot history — the API exposes no health-history
  // endpoint yet. Marked "Sample data" in the UI. Phase 2 backend dependency:
  // add GET /analytics/health-history (daily avg score) and wire it here.
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  const scoreHistory = days.map((day, i) => {
    const variation = (i - 3) * 2 // stable curve, no randomness
    const score = domains.length
      ? Math.max(40, Math.min(100, avgScore + variation))
      : 0
    return { day, score }
  })
  const maxScore = Math.max(...scoreHistory.map((d) => d.score), 1)

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

  const sortedDomains = [...domains].sort((a, b) => b.healthScore - a.healthScore)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Deliverability trends and compliance data"
        action={
          <Button
            variant="outline"
            size="icon-sm"
            onClick={refetch}
            aria-label="Refresh analytics"
          >
            <RefreshCw className={loading ? "animate-spin" : ""} />
          </Button>
        }
      />

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Avg Health Score"
          value={loading ? "—" : avgScore}
          icon={Activity}
        />
        <MetricCard
          label="Healthy Domains"
          value={loading ? "—" : healthy}
          icon={ShieldCheck}
          hint="Score ≥ 80"
        />
        <MetricCard
          label="Needs Attention"
          value={loading ? "—" : warning}
          icon={AlertTriangle}
          hint="Score 60–79"
        />
        <MetricCard
          label="Critical Issues"
          value={loading ? "—" : critical}
          icon={XCircle}
          hint="Score < 60"
        />
      </div>

      {loading ? (
        <Card className="p-5">
          <LoadingSkeleton variant="table" count={5} />
        </Card>
      ) : error ? (
        <Card className="p-5">
          <EmptyState
            icon={BarChart3}
            title="Failed to load analytics"
            description={error}
            action={
              <Button variant="outline" size="sm" onClick={refetch}>
                <RefreshCw />
                Try again
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          {/* Health score chart */}
          <Card className="gap-0 p-0">
            <CardHeader className="border-b p-5">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm">
                  Average Health Score — Last 7 Days
                </CardTitle>
                <Badge variant="secondary">Sample data</Badge>
              </div>
              <CardDescription className="text-xs">
                Placeholder trend derived from the current average — not real
                history. A health-history endpoint is needed to populate this.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              <div className="flex h-36 items-end gap-2">
                {scoreHistory.map((d) => {
                  const status = scoreToStatus(d.score)
                  return (
                    <div
                      key={d.day}
                      className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                    >
                      <span className="font-mono text-[10px] font-semibold text-muted-foreground">
                        {d.score}
                      </span>
                      <div
                        title={`${d.day}: ${d.score}/100`}
                        className={cn(
                          "w-full rounded-t-md transition-opacity hover:opacity-75",
                          BAR_BG[status]
                        )}
                        style={{
                          height: `${(d.score / maxScore) * 100}%`,
                          minHeight: 4,
                        }}
                      />
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {d.day}
                      </span>
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 flex flex-wrap justify-center gap-4">
                {[
                  { cls: "bg-success", label: "Healthy (80+)" },
                  { cls: "bg-warning", label: "Warning (60+)" },
                  { cls: "bg-danger", label: "Critical (<60)" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-1.5">
                    <span className={cn("size-2.5 rounded-sm", item.cls)} />
                    <span className="text-xs text-muted-foreground">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Domain performance table */}
          <Card className="gap-0 overflow-hidden p-0">
            <CardHeader className="border-b p-5">
              <CardTitle className="text-sm">Domain Performance</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              {domains.length === 0 ? (
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
        </>
      )}
    </div>
  )
}
