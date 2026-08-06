"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export interface FilterOption<T extends string = string> {
  value: T
  label: React.ReactNode
  /** Optional trailing count badge. */
  count?: number
}

export interface FilterBarProps<T extends string = string>
  extends Omit<React.ComponentProps<"div">, "onChange"> {
  options: FilterOption<T>[]
  value: T
  onValueChange: (value: T) => void
  /** Accessible group label. */
  "aria-label"?: string
}

/**
 * Accessible segmented filter. Uses real <button>s with aria-pressed —
 * replaces the color-only filter pills.
 */
export function FilterBar<T extends string = string>({
  options,
  value,
  onValueChange,
  className,
  "aria-label": ariaLabel = "Filter",
  ...props
}: FilterBarProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1",
        className
      )}
      {...props}
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onValueChange(opt.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
              active
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.label}
            {opt.count != null && (
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs tabular-nums",
                  active
                    ? "bg-muted text-muted-foreground"
                    : "bg-transparent text-muted-foreground"
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
