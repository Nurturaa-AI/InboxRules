import * as React from "react"
import { type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export interface EmptyStateProps extends Omit<React.ComponentProps<"div">, "title"> {
  icon?: LucideIcon
  title: React.ReactNode
  description?: React.ReactNode
  /** Primary/secondary actions rendered below the copy. */
  action?: React.ReactNode
  /** Compact variant for inline/table empties. */
  size?: "sm" | "md"
}

/**
 * Centered empty state for zero-data views and empty search results.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = "md",
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        size === "md" ? "gap-4 px-6 py-16" : "gap-3 px-4 py-10",
        className
      )}
      {...props}
    >
      {Icon && (
        <span
          className={cn(
            "flex items-center justify-center rounded-full bg-muted text-muted-foreground",
            size === "md" ? "size-12 [&_svg]:size-6" : "size-10 [&_svg]:size-5"
          )}
        >
          <Icon aria-hidden="true" />
        </span>
      )}
      <div className="flex flex-col gap-1">
        <h3
          className={cn(
            "font-semibold tracking-tight text-foreground",
            size === "md" ? "text-base" : "text-sm"
          )}
        >
          {title}
        </h3>
        {description && (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-1 flex items-center gap-2">{action}</div>}
    </div>
  )
}
