"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@clerk/nextjs"
import { useTheme } from "next-themes"
import { Sun, Moon, Bell, Plus, CheckCircle2, Menu } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/shared/SearchInput"
import { StatusBadge, statusFromString } from "@/components/shared/StatusBadge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface Props {
  onAddDomain?: () => void
  onMenuClick?: () => void
}

interface AlertNotification {
  id: string
  changeType: string
  severity?: string
  aiTitle?: string
  domain?: { domain?: string }
}

const PAGE_META: Record<string, { title: string; sub: string }> = {
  "/dashboard": {
    title: "Dashboard",
    sub: "Your email compliance and deliverability overview",
  },
  "/dashboard/domains": {
    title: "Domains",
    sub: "Manage and monitor your sending domains",
  },
  "/dashboard/compliance": {
    title: "Compliance",
    sub: "SPF, DKIM, and DMARC status across all domains",
  },
  "/dashboard/unsubscribe": {
    title: "Unsubscribe",
    sub: "RFC 8058 hosted endpoint and suppression list",
  },
  "/dashboard/alerts": {
    title: "Alerts",
    sub: "DNS change events and compliance issues",
  },
  "/dashboard/analytics": {
    title: "Analytics",
    sub: "Deliverability trends and historical data",
  },
  "/dashboard/billing": {
    title: "Billing",
    sub: "Subscription, usage, and invoices",
  },
  "/dashboard/settings": {
    title: "Settings",
    sub: "Account preferences and integrations",
  },
}

const CHANGE_LABELS: Record<string, string> = {
  spf_lookup_exceeded: "SPF Lookup Limit Exceeded",
  spf_record_changed: "SPF Record Changed",
  dmarc_policy_weakened: "DMARC Policy Weakened",
  dmarc_record_removed: "DMARC Record Removed",
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4500"

export default function Header({ onAddDomain, onMenuClick }: Props) {
  const pathname = usePathname()
  const { getToken } = useAuth()
  const { resolvedTheme, setTheme } = useTheme()
  const meta = PAGE_META[pathname] ?? PAGE_META["/dashboard"]

  const [search, setSearch] = React.useState("")
  const [notifications, setNotifications] = React.useState<AlertNotification[]>([])
  const [notifLoading, setNotifLoading] = React.useState(false)

  // Fetch unresolved alerts once on mount so the dot reflects real unread count.
  React.useEffect(() => {
    let cancelled = false
    async function loadNotifications() {
      setNotifLoading(true)
      try {
        const token = await getToken()
        const response = await fetch(
          `${API_URL}/api/v1/alerts?status=unresolved&limit=5`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (response.ok) {
          const data = await response.json()
          const items: AlertNotification[] = data.data || data.items || []
          if (!cancelled) setNotifications(items)
        }
      } catch {
        /* fail silently */
      } finally {
        if (!cancelled) setNotifLoading(false)
      }
    }
    loadNotifications()
    return () => {
      cancelled = true
    }
  }, [getToken])

  const isDark = resolvedTheme === "dark"
  const hasUnread = notifications.length > 0

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card px-4 sm:px-6">
      {/* Mobile menu trigger */}
      <Button
        variant="outline"
        size="icon-sm"
        onClick={onMenuClick}
        className="lg:hidden"
        aria-label="Open navigation menu"
      >
        <Menu />
      </Button>

      {/* Page title */}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">
          {meta.title}
        </h1>
        <p className="hidden truncate text-xs text-muted-foreground sm:block">
          {meta.sub}
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="hidden md:block md:w-56">
          <SearchInput
            value={search}
            onValueChange={setSearch}
            label="Search domains"
            placeholder="Search domains…"
          />
        </div>

        {/* Theme toggle */}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          <Sun className="hidden dark:block" />
          <Moon className="dark:hidden" />
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon-sm"
              className="relative"
              aria-label={
                hasUnread
                  ? `Notifications, ${notifications.length} unread`
                  : "Notifications"
              }
            >
              <Bell />
              {hasUnread && (
                <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-danger ring-2 ring-card" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">
                Notifications
              </p>
              {hasUnread && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {notifications.length} unread
                </span>
              )}
            </div>

            {notifLoading ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                Loading…
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <CheckCircle2 className="size-7 text-success" />
                <p className="text-sm font-semibold text-foreground">All clear</p>
                <p className="text-xs text-muted-foreground">
                  No unresolved alerts right now
                </p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="flex items-start gap-3 border-b border-border px-4 py-3 last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {notif.aiTitle ||
                          CHANGE_LABELS[notif.changeType] ||
                          notif.changeType}
                      </p>
                      {notif.domain?.domain && (
                        <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                          {notif.domain.domain}
                        </p>
                      )}
                    </div>
                    <StatusBadge
                      status={statusFromString(notif.severity)}
                      label={notif.severity?.toUpperCase()}
                      showIcon={false}
                      className={cn("shrink-0")}
                    />
                  </div>
                ))}
                <div className="px-4 py-3 text-center">
                  <Link
                    href="/dashboard/alerts"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    View all alerts →
                  </Link>
                </div>
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Add domain */}
        <Button onClick={onAddDomain} size="sm" className="hidden sm:inline-flex">
          <Plus strokeWidth={2.5} />
          Add Domain
        </Button>
        <Button
          onClick={onAddDomain}
          size="icon-sm"
          className="sm:hidden"
          aria-label="Add domain"
        >
          <Plus strokeWidth={2.5} />
        </Button>
      </div>
    </header>
  )
}
