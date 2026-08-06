"use client"

import { useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { toast } from "sonner"
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  ChevronRight,
  RefreshCw,
  Bell,
} from "lucide-react"

import { useApiQuery, apiRequest } from "@/lib/useApiQuery"
import { timeAgo } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/PageHeader"
import { FilterBar } from "@/components/shared/FilterBar"
import { EmptyState } from "@/components/shared/EmptyState"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { cn } from "@/lib/utils"

interface AlertEvent {
  id: string
  changeType: string
  severity: string
  aiTitle: string | null
  aiSummary: string | null
  aiFixSteps: string[] | null
  previousValue: string | null
  currentValue: string | null
  acknowledged: boolean
  resolvedAt: string | null
  detectedAt: string
  domain: { domain: string; detectedEsp: string | null }
}

type FilterType = "all" | "unresolved" | "critical" | "warning" | "info"

const CHANGE_LABELS: Record<string, string> = {
  spf_lookup_exceeded: "SPF Lookup Limit Exceeded",
  spf_record_changed: "SPF Record Changed",
  dmarc_policy_weakened: "DMARC Policy Weakened",
  dmarc_record_removed: "DMARC Record Removed",
  dkim_removed: "DKIM Selector Removed",
  dkim_key_rotated: "DKIM Key Rotated",
}

const FILTERS: { value: FilterType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unresolved", label: "Unresolved" },
  { value: "critical", label: "Critical" },
  { value: "warning", label: "Warning" },
  { value: "info", label: "Info" },
]

/** Severity icon matching the alert type. */
function SeverityIcon({ severity, resolved }: { severity: string; resolved: boolean }) {
  if (resolved) return <CheckCircle className="size-4 text-success" />
  if (severity === "critical") return <XCircle className="size-4 text-danger" />
  if (severity === "warning") return <AlertTriangle className="size-4 text-warning" />
  return <Info className="size-4 text-info" />
}

export default function AlertsPage() {
  const { getToken } = useAuth()
  const { data, loading, error, refetch } = useApiQuery<{
    items: AlertEvent[]
    pagination: { total: number }
  }>("/alerts?limit=50&status=all")

  const [filter, setFilter] = useState<FilterType>("all")
  const [expanded, setExpanded] = useState<string | null>(null)
  const [resolving, setResolving] = useState<string | null>(null)
  const [acknowledging, setAcknowledging] = useState<string | null>(null)

  const allAlerts =
    data?.items || (Array.isArray(data) ? (data as AlertEvent[]) : [])

  const filtered = allAlerts.filter((a) => {
    if (filter === "unresolved") return !a.resolvedAt
    if (filter === "critical") return a.severity === "critical"
    if (filter === "warning") return a.severity === "warning"
    if (filter === "info") return a.severity === "info"
    return true
  })

  const unresolvedCount = allAlerts.filter((a) => !a.resolvedAt).length

  async function handleResolve(id: string, title: string) {
    setResolving(id)
    try {
      const token = await getToken()
      if (!token) throw new Error("Authentication token missing")
      await apiRequest(`/alerts/${id}/resolve`, "POST", token)
      toast.success(`Resolved: ${title}`)
      refetch()
    } catch (err) {
      toast.error("Failed to resolve alert", {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setResolving(null)
    }
  }

  async function handleAcknowledge(id: string, title: string) {
    setAcknowledging(id)
    try {
      const token = await getToken()
      if (!token) throw new Error("Authentication token missing")
      await apiRequest(`/alerts/${id}/acknowledge`, "POST", token)
      toast.success(`Acknowledged: ${title}`)
      refetch()
    } catch (err) {
      toast.error("Failed to acknowledge alert", {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setAcknowledging(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts"
        description="DNS change events and compliance issues across your domains"
        badge={
          unresolvedCount > 0 ? (
            <Badge variant="destructive">{unresolvedCount} unresolved</Badge>
          ) : undefined
        }
        action={
          <Button
            variant="outline"
            size="icon-sm"
            onClick={refetch}
            aria-label="Refresh alerts"
          >
            <RefreshCw className={loading ? "animate-spin" : ""} />
          </Button>
        }
      />

      {/* Filter bar */}
      {!loading && !error && allAlerts.length > 0 && (
        <FilterBar
          options={FILTERS}
          value={filter}
          onValueChange={setFilter}
          aria-label="Filter alerts by status or severity"
        />
      )}

      {/* Body */}
      {loading ? (
        <Card className="p-5">
          <LoadingSkeleton variant="table" count={5} />
        </Card>
      ) : error ? (
        <Card className="p-5">
          <EmptyState
            icon={Bell}
            title="Failed to load alerts"
            description={error}
            action={
              <Button variant="outline" size="sm" onClick={refetch}>
                <RefreshCw />
                Try again
              </Button>
            }
          />
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-5">
          <EmptyState
            icon={Bell}
            title={allAlerts.length === 0 ? "No alerts yet" : "No alerts match this filter"}
            description={
              allAlerts.length === 0
                ? "InboxRules will alert you when DNS changes are detected."
                : "Try a different filter."
            }
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((alert) => {
            const isResolved = !!alert.resolvedAt
            const isExpanded = expanded === alert.id
            const title =
              alert.aiTitle ||
              CHANGE_LABELS[alert.changeType] ||
              alert.changeType
            const panelId = `alert-detail-${alert.id}`

            return (
              <Card
                key={alert.id}
                className={cn(
                  "gap-0 overflow-hidden p-0 transition-opacity",
                  isResolved && "opacity-60"
                )}
              >
                {/* Header row */}
                <button
                  type="button"
                  onClick={() => setExpanded(isExpanded ? null : alert.id)}
                  aria-expanded={isExpanded}
                  aria-controls={panelId}
                  className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
                >
                  <SeverityIcon severity={alert.severity} resolved={isResolved} />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p
                        className={cn(
                          "text-sm font-semibold",
                          isResolved ? "text-muted-foreground" : "text-foreground"
                        )}
                      >
                        {title}
                      </p>
                      {isResolved && (
                        <Badge variant="success" className="text-xs">
                          Resolved
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                      {alert.domain?.domain} · {timeAgo(alert.detectedAt)}
                    </p>
                  </div>

                  {!isResolved && (
                    <div className="flex shrink-0 items-center gap-2">
                      {!alert.acknowledged && (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAcknowledge(alert.id, title)
                          }}
                          disabled={acknowledging === alert.id}
                        >
                          {acknowledging === alert.id ? "..." : "Acknowledge"}
                        </Button>
                      )}

                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleResolve(alert.id, title)
                        }}
                        disabled={resolving === alert.id}
                      >
                        {resolving === alert.id ? "..." : "Mark resolved"}
                      </Button>
                    </div>
                  )}

                  <ChevronRight
                    className={cn(
                      "size-3.5 shrink-0 text-muted-foreground transition-transform",
                      isExpanded && "rotate-90"
                    )}
                    aria-hidden="true"
                  />
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div
                    id={panelId}
                    className="flex flex-col gap-3 border-t border-border bg-muted/30 p-5"
                  >
                    {alert.aiSummary && (
                      <div>
                        <p className="mb-1.5 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                          What happened
                        </p>
                        <p className="text-sm leading-relaxed text-foreground">
                          {alert.aiSummary}
                        </p>
                      </div>
                    )}

                    {(alert.previousValue || alert.currentValue) && (
                      <div className="rounded-lg border border-border bg-card p-3.5">
                        {alert.previousValue && (
                          <div className="mb-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">
                              Before:{" "}
                            </span>
                            <code className="rounded bg-danger-subtle px-1.5 py-0.5 font-mono text-xs text-danger">
                              {alert.previousValue}
                            </code>
                          </div>
                        )}
                        {alert.currentValue && (
                          <div>
                            <span className="text-xs font-semibold text-muted-foreground">
                              After:{" "}
                            </span>
                            <code className="rounded bg-success-subtle px-1.5 py-0.5 font-mono text-xs text-success">
                              {alert.currentValue}
                            </code>
                          </div>
                        )}
                      </div>
                    )}

                    {alert.aiFixSteps && alert.aiFixSteps.length > 0 && (
                      <div className="rounded-lg border border-info/30 bg-info-subtle p-3.5">
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-info-foreground">
                          💡 How to fix it
                        </p>
                        <ol className="flex list-inside list-decimal flex-col gap-1.5 pl-1">
                          {alert.aiFixSteps.map((step, i) => (
                            <li
                              key={i}
                              className="text-sm leading-relaxed text-info-foreground/90"
                            >
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
