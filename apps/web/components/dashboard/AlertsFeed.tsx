"use client"

import { useState } from "react"
import { toast } from "sonner"
import Link from "next/link"
import { useAuth } from "@clerk/nextjs"
import { CheckCircle2, RefreshCw } from "lucide-react"

import { useApiQuery, apiRequest, refreshAllQueries } from "@/lib/useApiQuery"
import { timeAgo } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge, statusFromString } from "@/components/shared/StatusBadge"

interface AlertEvent {
  id: string
  changeType: string
  severity: string
  aiTitle: string | null
  acknowledged: boolean
  detectedAt: string
  domain: { domain: string }
}

const CHANGE_LABELS: Record<string, string> = {
  spf_lookup_exceeded: "SPF Lookup Limit Exceeded",
  spf_record_changed: "SPF Record Changed",
  dmarc_policy_weakened: "DMARC Policy Weakened",
  dmarc_record_removed: "DMARC Record Removed",
  dkim_removed: "DKIM Selector Removed",
  dkim_key_rotated: "DKIM Key Rotated",
}

export default function AlertsFeed() {
  const { getToken } = useAuth()

  // Shared, refresh-aware query — participates in refreshAllQueries() so a
  // mutation anywhere on the dashboard re-runs this fetch automatically.
  const { data, loading, error, refetch } = useApiQuery<AlertEvent[]>(
    "/alerts?status=unresolved&limit=4"
  )
  const alerts = data ?? []

  // Acknowledge an alert, then refresh the dashboard so this feed (and the
  // alert counts elsewhere) reflect the change.
  const [acknowledging, setAcknowledging] = useState<string | null>(null)

  async function acknowledgeAlert(id: string) {
    setAcknowledging(id)
    try {
      const token = await getToken()
      if (!token) throw new Error("Not authenticated")
      await apiRequest(`/alerts/${id}/acknowledge`, "POST", token)
      toast.success("Alert acknowledged")
      refreshAllQueries()
    } catch (err) {
      toast.error("Could not acknowledge alert", { description: err instanceof Error ? err.message : undefined })
    } finally {
      setAcknowledging(null)
    }
  }

  const unresolvedCount = alerts.length

  return (
    <Card className="gap-0 overflow-hidden p-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Requires review
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {loading
              ? "Loading…"
              : `Latest ${unresolvedCount} unacknowledged alert${unresolvedCount !== 1 ? "s" : ""} · review the finding before taking action`}
          </p>
        </div>
        <Link
          href="/dashboard/alerts"
          className="shrink-0 whitespace-nowrap text-xs font-medium text-primary hover:underline"
        >
          View all
        </Link>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center px-5 py-8 text-muted-foreground">
          <RefreshCw className="size-5 animate-spin" />
        </div>
      )}

      {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 p-5 text-sm"><p>Could not load alerts. {error}</p><Button variant="outline" size="sm" onClick={refetch}>Try again</Button></div>}
      {/* Empty */}
      {!loading && !error && alerts.length === 0 && (
        <div className="flex flex-col items-center gap-2 px-5 py-8 text-center">
          <CheckCircle2 className="size-7 text-success" />
          <p className="text-sm font-semibold text-foreground">
            No alerts awaiting review
          </p>
          <p className="text-xs text-muted-foreground">
            Acknowledged alerts remain available in Alerts until marked resolved.
          </p>
        </div>
      )}

      {/* Alert items */}
      {!loading && !error &&
        alerts.map((alert) => {
          const title =
            CHANGE_LABELS[alert.changeType] || alert.changeType

          return (
            <div
              key={alert.id}
              className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 border-b border-border px-5 py-4 last:border-b-0 sm:flex sm:items-center"
            >
              <StatusBadge
                status={statusFromString(alert.severity)}
                label={alert.severity?.toUpperCase()}
                showIcon={false}
                className="shrink-0"
              />

              {/* Content */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  <Link href="/dashboard/alerts" className="hover:text-primary hover:underline">{title}</Link>
                </p>
                <p className="mt-0.5 break-all font-mono text-xs text-muted-foreground">
                  {alert.domain?.domain} · {timeAgo(alert.detectedAt)}
                </p>
              </div>

              {/* Acknowledge */}
              <Button
                variant="outline"
                size="xs"
                onClick={() => acknowledgeAlert(alert.id)}
                disabled={acknowledging === alert.id}
                aria-label={`Acknowledge alert: ${title}`}
                className="col-start-2 w-fit shrink-0"
              >
                Acknowledge
              </Button>
            </div>
          )
        })}
    </Card>
  )
}
