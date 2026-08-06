import * as React from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export interface LoadingSkeletonProps extends React.ComponentProps<"div"> {
  variant?: "text" | "card" | "metrics" | "table"
  /** Number of repeated units (lines, rows, or cards). */
  count?: number
}

/**
 * Composable loading placeholders that mirror the real content layout,
 * so migrated pages share one skeleton vocabulary.
 */
export function LoadingSkeleton({
  variant = "text",
  count = 3,
  className,
  ...props
}: LoadingSkeletonProps) {
  if (variant === "metrics") {
    return (
      <div
        className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}
        {...props}
      >
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="size-8 rounded-md" />
            </div>
            <Skeleton className="h-7 w-16 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (variant === "card") {
    return (
      <div className={cn("flex flex-col gap-4", className)} {...props}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6"
          >
            <Skeleton className="h-5 w-1/3 rounded" />
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-2/3 rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (variant === "table") {
    return (
      <div
        className={cn(
          "overflow-hidden rounded-xl border border-border bg-card",
          className
        )}
        {...props}
      >
        <div className="border-b border-border bg-muted/40 px-3 py-3">
          <Skeleton className="h-4 w-40 rounded" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-3 py-4">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <Skeleton className="h-4 w-40 rounded" />
              <Skeleton className="ml-auto h-4 w-16 rounded" />
              <Skeleton className="h-4 w-24 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // text
  return (
    <div className={cn("flex flex-col gap-2", className)} {...props}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4 rounded", i === count - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  )
}
