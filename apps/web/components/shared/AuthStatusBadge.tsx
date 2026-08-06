import * as React from "react"

import { StatusBadge, statusFromString } from "@/components/shared/StatusBadge"

/** Human labels for the raw SPF/DKIM/DMARC status strings from the API. */
const AUTH_STATUS_LABELS: Record<string, string> = {
  pass: "Pass",
  fail: "Fail",
  warn: "Warn",
  softfail: "Soft",
  none: "None",
  missing: "Missing",
  unknown: "—",
}

export interface AuthStatusBadgeProps {
  status: string
  className?: string
}

/**
 * Canonical badge for a domain-auth check (SPF / DKIM / DMARC).
 * Maps the raw status string to the shared StatusBadge — single source for
 * the pill previously duplicated across domains, compliance, analytics,
 * and the dashboard home table.
 */
export function AuthStatusBadge({ status, className }: AuthStatusBadgeProps) {
  return (
    <StatusBadge
      status={statusFromString(status)}
      label={AUTH_STATUS_LABELS[status] ?? status}
      className={className}
    />
  )
}
