import * as React from "react"

import { cn, scoreToStatus } from "@/lib/utils"

export interface HealthScoreProps extends React.ComponentProps<"div"> {
  /** Score 0–100. */
  score: number
  variant?: "bar" | "ring" | "text"
  /** Show the numeric value. Default true. */
  showValue?: boolean
  size?: "sm" | "md" | "lg"
}

const STATUS_TEXT: Record<ReturnType<typeof scoreToStatus>, string> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
}

const STATUS_BG: Record<ReturnType<typeof scoreToStatus>, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
}

const STATUS_STROKE: Record<ReturnType<typeof scoreToStatus>, string> = {
  success: "stroke-success",
  warning: "stroke-warning",
  danger: "stroke-danger",
}

/**
 * Renders a health score (0–100) with a color derived from the shared
 * ≥80 / ≥60 thresholds — the single source of truth for score status.
 */
export function HealthScore({
  score,
  variant = "bar",
  showValue = true,
  size = "md",
  className,
  ...props
}: HealthScoreProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)))
  const status = scoreToStatus(clamped)

  if (variant === "text") {
    return (
      <span
        className={cn("font-semibold tabular-nums", STATUS_TEXT[status], className)}
        {...props}
      >
        {clamped}
      </span>
    )
  }

  if (variant === "ring") {
    const dim = size === "sm" ? 40 : size === "lg" ? 72 : 56
    const stroke = size === "sm" ? 4 : size === "lg" ? 6 : 5
    const r = (dim - stroke) / 2
    const c = 2 * Math.PI * r
    const offset = c - (clamped / 100) * c
    return (
      <div
        className={cn("relative inline-flex items-center justify-center", className)}
        style={{ width: dim, height: dim }}
        {...props}
      >
        <svg width={dim} height={dim} className="-rotate-90">
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={r}
            strokeWidth={stroke}
            className="fill-none stroke-muted"
          />
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={r}
            strokeWidth={stroke}
            strokeDasharray={c}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={cn("fill-none transition-[stroke-dashoffset]", STATUS_STROKE[status])}
          />
        </svg>
        {showValue && (
          <span
            className={cn(
              "absolute font-semibold tabular-nums",
              size === "sm" ? "text-xs" : size === "lg" ? "text-lg" : "text-sm",
              STATUS_TEXT[status]
            )}
          >
            {clamped}
          </span>
        )}
      </div>
    )
  }

  // bar
  const barHeight = size === "sm" ? "h-1.5" : size === "lg" ? "h-2.5" : "h-2"
  return (
    <div className={cn("flex items-center gap-2", className)} {...props}>
      <div
        className={cn("relative w-full overflow-hidden rounded-full bg-muted", barHeight)}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn("h-full rounded-full transition-[width]", STATUS_BG[status])}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showValue && (
        <span className={cn("shrink-0 text-sm font-semibold tabular-nums", STATUS_TEXT[status])}>
          {clamped}
        </span>
      )}
    </div>
  )
}
