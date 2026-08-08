"use client"

import { Activity } from "lucide-react"

import { useApiQuery } from "@/lib/useApiQuery"
import { Card } from "@/components/ui/card"
import { cn, scoreToStatus } from "@/lib/utils"

interface HealthPoint {
  date: string // YYYY-MM-DD
  score: number
  sampleCount: number
}

interface HealthHistory {
  period: number
  points: HealthPoint[]
}

// Status-token background classes, keyed off the shared ≥80 / ≥60 thresholds.
const BAR_BG: Record<ReturnType<typeof scoreToStatus>, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
}

const LEGEND: { status: ReturnType<typeof scoreToStatus>; label: string }[] = [
  { status: "success", label: "Healthy" },
  { status: "warning", label: "Warning" },
  { status: "danger", label: "Critical" },
]

// Short weekday label (e.g. "Mon") from a YYYY-MM-DD key. Parse as UTC so the
// label matches the day the snapshots were bucketed under on the server.
function dayLabel(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00Z`)
  return d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })
}

export default function HealthChart() {
  const { data, loading } =
    useApiQuery<HealthHistory>("/analytics/health-history?period=7")

  const points = data?.points ?? []
  const avg = points.length
    ? Math.round(points.reduce((a, p) => a + p.score, 0) / points.length)
    : 0

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Health Trend
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">7-day average</p>
        </div>
        {points.length > 0 && (
          <span className="rounded-md bg-success-subtle px-2.5 py-1 font-mono text-sm font-semibold text-success">
            {avg}/100
          </span>
        )}
      </div>

      <div className="p-5">
        {loading ? (
          <div className="flex h-24 items-end gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="h-full flex-1 animate-pulse rounded-t-md bg-muted"
                style={{ height: `${40 + ((i * 13) % 50)}%` }}
              />
            ))}
          </div>
        ) : points.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Activity className="size-7 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">
              Not enough scan history yet
            </p>
            <p className="text-xs text-muted-foreground">
              Points appear here as your domains are scanned.
            </p>
          </div>
        ) : (
          <>
            <div className="flex h-24 items-end gap-2">
              {points.map((p) => (
                <div
                  key={p.date}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-1"
                >
                  <div
                    title={`${p.date}: ${p.score}/100 (${p.sampleCount} scan${p.sampleCount !== 1 ? "s" : ""})`}
                    className={cn(
                      "w-full rounded-t-md transition-opacity hover:opacity-75",
                      BAR_BG[scoreToStatus(p.score)]
                    )}
                    style={{ height: `${p.score}%`, minHeight: 4 }}
                  />
                  <span className="mt-1 font-mono text-[10px] text-muted-foreground">
                    {dayLabel(p.date)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-4">
              {LEGEND.map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <span
                    className={cn("size-2.5 rounded-sm", BAR_BG[item.status])}
                  />
                  <span className="text-xs font-medium text-muted-foreground">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Card>
  )
}
