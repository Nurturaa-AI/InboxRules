import * as React from "react"
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  MinusCircle,
  Clock,
  type LucideIcon,
} from "lucide-react"

import { Badge, type badgeVariants } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { VariantProps } from "class-variance-authority"

export type StatusKind =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral"
  | "pending"

type BadgeVariant = VariantProps<typeof badgeVariants>["variant"]

const STATUS_CONFIG: Record<
  StatusKind,
  { variant: BadgeVariant; icon: LucideIcon; label: string }
> = {
  success: { variant: "success", icon: CheckCircle2, label: "Pass" },
  warning: { variant: "warning", icon: AlertTriangle, label: "Warning" },
  danger: { variant: "destructive", icon: XCircle, label: "Fail" },
  info: { variant: "info", icon: Info, label: "Info" },
  neutral: { variant: "outline", icon: MinusCircle, label: "None" },
  pending: { variant: "secondary", icon: Clock, label: "Pending" },
}

/**
 * Maps common free-form status strings to a canonical {@link StatusKind}.
 * Falls back to "neutral" for anything unrecognized.
 */
export function statusFromString(value: string | null | undefined): StatusKind {
  switch ((value ?? "").toLowerCase()) {
    case "pass":
    case "passed":
    case "ok":
    case "active":
    case "healthy":
    case "success":
    case "resolved":
      return "success"
    case "warn":
    case "warning":
    case "degraded":
    case "softfail":
    case "soft":
      return "warning"
    case "fail":
    case "failed":
    case "error":
    case "critical":
    case "danger":
    case "inactive":
    case "disabled":
      return "danger"
    case "info":
      return "info"
    case "pending":
    case "scanning":
    case "queued":
    case "unresolved":
      return "pending"
    case "none":
    case "missing":
    case "unknown":
      return "neutral"
    default:
      return "neutral"
  }
}

export interface StatusBadgeProps
  extends React.ComponentProps<typeof Badge> {
  status: StatusKind
  /** Override the default label for the status. */
  label?: React.ReactNode
  /** Show the leading status icon (never color-only). Default true. */
  showIcon?: boolean
}

/**
 * The single canonical status pill. Always pairs color with an icon + text so
 * status is never communicated by color alone.
 */
export function StatusBadge({
  status,
  label,
  showIcon = true,
  className,
  ...props
}: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon
  return (
    <Badge variant={config.variant} className={cn("gap-1", className)} {...props}>
      {showIcon && <Icon aria-hidden="true" />}
      {label ?? config.label}
    </Badge>
  )
}
