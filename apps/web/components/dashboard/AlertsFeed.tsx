"use client"

import { useState } from "react"
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
  const { data, loading } = useApiQuery<AlertEvent[]>(
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
      if (!token) return
      await apiRequest(`/alerts/${id}/acknowledge`, "POST", token)
      refreshAllQueries()
    } catch {
      // fail silently
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
            Recent Alerts
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {loading
              ? "Loading…"
              : `${unresolvedCount} unresolved issue${unresolvedCount !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link
          href="/dashboard/alerts"
          className="text-xs font-medium text-primary hover:underline"
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

      {/* Empty */}
      {!loading && alerts.length === 0 && (
        <div className="flex flex-col items-center gap-2 px-5 py-8 text-center">
          <CheckCircle2 className="size-7 text-success" />
          <p className="text-sm font-semibold text-foreground">
            No unresolved alerts
          </p>
          <p className="text-xs text-muted-foreground">
            All your domains are looking good
          </p>
        </div>
      )}

      {/* Alert items */}
      {!loading &&
        alerts.map((alert) => {
          const title =
            alert.aiTitle || CHANGE_LABELS[alert.changeType] || alert.changeType

          return (
            <div
              key={alert.id}
              className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-b-0"
            >
              <StatusBadge
                status={statusFromString(alert.severity)}
                label={alert.severity?.toUpperCase()}
                showIcon={false}
                className="shrink-0"
              />

              {/* Content */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {title}
                </p>
                <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
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
                className="shrink-0"
              >
                Ack
              </Button>
            </div>
          )
        })}
    </Card>
  )
}
