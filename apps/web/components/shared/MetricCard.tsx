import * as React from "react"
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface MetricCardProps extends React.ComponentProps<typeof Card> {
  label: React.ReactNode
  value: React.ReactNode
  icon?: LucideIcon
  /** Optional delta, e.g. "+12%" or "-3". */
  delta?: React.ReactNode
  /** Direction of the delta; drives its color + arrow. */
  trend?: "up" | "down" | "neutral"
  /** Whether an upward trend is good (green) or bad (red). Default true. */
  trendUpIsGood?: boolean
  /** Small supporting text under the value. */
  hint?: React.ReactNode
}

/**
 * Flat, tokenized metric tile. Replaces the gradient StatCards.
 */
export function MetricCard({
  label,
  value,
  icon: Icon,
  delta,
  trend = "neutral",
  trendUpIsGood = true,
  hint,
  className,
  ...props
}: MetricCardProps) {
  const isGood =
    trend === "neutral"
      ? null
      : trend === "up"
        ? trendUpIsGood
        : !trendUpIsGood
  const TrendIcon = trend === "down" ? TrendingDown : TrendingUp

  return (
    <Card
      className={cn("gap-3 p-5", className)}
      {...props}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {Icon && (
          <span className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground [&_svg]:size-4">
            <Icon aria-hidden="true" />
          </span>
        )}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
          {value}
        </span>
        {delta != null && (
          <span
            className={cn(
              "mb-0.5 inline-flex items-center gap-0.5 text-xs font-medium tabular-nums [&_svg]:size-3",
              isGood === null && "text-muted-foreground",
              isGood === true && "text-success",
              isGood === false && "text-danger"
            )}
          >
            {trend !== "neutral" && <TrendIcon aria-hidden="true" />}
            {delta}
          </span>
        )}
      </div>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </Card>
  )
}
