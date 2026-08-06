import * as React from "react"

import { cn, domainInitials } from "@/lib/utils"

export interface DomainAvatarProps extends React.ComponentProps<"div"> {
  domain: string
  size?: "sm" | "md"
}

/**
 * The two-letter monogram tile shown next to a domain name.
 * Single source for the avatar markup duplicated across the domains,
 * compliance, and dashboard-home tables.
 */
export function DomainAvatar({
  domain,
  size = "md",
  className,
  ...props
}: DomainAvatarProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg border border-border bg-muted font-mono font-bold text-muted-foreground",
        size === "md" ? "size-9 text-xs" : "size-8 text-[11px]",
        className
      )}
      {...props}
    >
      {domainInitials(domain)}
    </div>
  )
}
