"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useAuth } from "@clerk/nextjs"
import { CheckCircle2, RefreshCw } from "lucide-react"

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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4500"

export default function AlertsFeed() {
  const { getToken } = useAuth()
  const [alerts, setAlerts] = useState<AlertEvent[]>([])
  const [loading, setLoading] = useState(true)

  // useCallback so useEffect dependency is stable
  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true)
      const token = await getToken()
      if (!token) return
      const response = await fetch(
        `${API_URL}/api/v1/alerts?status=unresolved&limit=4`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!response.ok) return
      const data = await response.json()
      // Handle both { data: [] } and { items: [] } shapes
      setAlerts(data.data || data.items || [])
    } catch {
      // fail silently — show empty state
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    let isActive = true
    Promise.resolve().then(() => {
      if (isActive) void fetchAlerts()
    })
    return () => {
      isActive = false
    }
  }, [fetchAlerts])

  async function acknowledgeAlert(id: string) {
    try {
      const token = await getToken()
      if (!token) return
      await fetch(`${API_URL}/api/v1/alerts/${id}/acknowledge`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      setAlerts((prev) => prev.filter((a) => a.id !== id))
    } catch {
      // fail silently
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
