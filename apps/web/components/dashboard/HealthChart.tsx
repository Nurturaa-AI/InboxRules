"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn, scoreToStatus } from "@/lib/utils"

// NOTE: Placeholder — this widget runs on hardcoded sample data.
// Phase 2: wire to a real health-history endpoint or remove.
const DATA = [
  { day: "Mon", score: 82 },
  { day: "Tue", score: 85 },
  { day: "Wed", score: 78 },
  { day: "Thu", score: 71 },
  { day: "Fri", score: 88 },
  { day: "Sat", score: 90 },
  { day: "Sun", score: 87 },
]

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

export default function HealthChart() {
  const avg = Math.round(DATA.reduce((a, d) => a + d.score, 0) / DATA.length)

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Health Trend
            </h2>
            <Badge variant="secondary" className="text-[10px]">
              Sample data
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">7-day average</p>
        </div>
        <span className="rounded-md bg-success-subtle px-2.5 py-1 font-mono text-sm font-semibold text-success">
          {avg}/100
        </span>
      </div>

      <div className="p-5">
        <div className="flex h-24 items-end gap-2">
          {DATA.map((d) => (
            <div
              key={d.day}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1"
            >
              <div
                title={`${d.day}: ${d.score}/100`}
                className={cn(
                  "w-full rounded-t-md transition-opacity hover:opacity-75",
                  BAR_BG[scoreToStatus(d.score)]
                )}
                style={{ height: `${d.score}%`, minHeight: 4 }}
              />
              <span className="mt-1 font-mono text-[10px] text-muted-foreground">
                {d.day}
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
      </div>
    </Card>
  )
}
