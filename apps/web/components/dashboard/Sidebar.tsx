"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useUser, useClerk } from "@clerk/nextjs"
import {
  LayoutDashboard,
  Globe,
  ShieldCheck,
  Mail,
  Bell,
  BarChart3,
  CreditCard,
  Settings,
  LogOut,
  Inbox,
  X,
} from "lucide-react"
import Image from "next/image"

import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

const NAV_ITEMS = [
  {
    section: "Workspace",
    items: [
      { label: "Overview", icon: LayoutDashboard, href: "/dashboard" },
      { label: "Domains", icon: Globe, href: "/dashboard/domains" },
      {
        label: "Compliance",
        icon: ShieldCheck,
        href: "/dashboard/compliance",
      },
      { label: "Unsubscribe", icon: Mail, href: "/dashboard/unsubscribe" },
    ],
  },
  {
    section: "Monitor",
    items: [
      { label: "Alerts", icon: Bell, href: "/dashboard/alerts" },
      { label: "Analytics", icon: BarChart3, href: "/dashboard/analytics" },
    ],
  },
  {
    section: "Account",
    items: [
      { label: "Billing", icon: CreditCard, href: "/dashboard/billing" },
      { label: "Settings", icon: Settings, href: "/dashboard/settings" },
    ],
  },
]

interface SidebarContentProps {
  onClose?: () => void
}

function SidebarContent({ onClose }: SidebarContentProps) {
  const pathname = usePathname()
  const { user } = useUser()
  const { signOut } = useClerk()

  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName || ""}`.trim()
    : user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "User"

  const initials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : displayName.substring(0, 2).toUpperCase()

  return (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Brand */}
      <div className="flex items-center justify-between gap-3 border-b border-sidebar-border px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent border border-sidebar-border">
            <Inbox className="size-[18px] text-sidebar-foreground" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[15px] font-extrabold leading-none tracking-tight text-sidebar-foreground">
              Inbox<span className="text-primary">Rules</span>
            </p>
            <p className="mt-0.5 text-[10px] font-medium text-sidebar-foreground/70">
              Email operations
            </p>
          </div>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="text-sidebar-foreground/50 hover:text-sidebar-foreground"
            aria-label="Close menu"
          >
            <X />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav aria-label="Workspace" className="flex-1 overflow-y-auto px-2.5 py-4">
        {NAV_ITEMS.map((section) => (
          <div key={section.section} className="mb-6">
            <p className="mb-1.5 px-2.5 text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/70">
              {section.section}
            </p>

            {section.items.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href)
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  onClick={onClose}
                  className={cn(
                    "group mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors outline-none",
                    "focus-visible:ring-2 focus-visible:ring-ring/40",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground ring-1 ring-sidebar-border font-semibold"
                      : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "size-[15px] shrink-0",
                      isActive && "stroke-[2.5]"
                    )}
                  />
                  <span className="flex-1">{item.label}</span>

                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-sidebar-border p-2.5">
        <Button
          variant="ghost"
          onClick={() => signOut({ redirectUrl: "/sign-in" })}
          className="h-auto w-full justify-start gap-2.5 rounded-xl px-2.5 py-2 text-sidebar-foreground/80 hover:text-sidebar-foreground"
        >
          {user?.imageUrl ? (
            <Image
              src={user.imageUrl}
              alt={displayName}
              width={34}
              height={34}
              className="size-[34px] shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-bold text-sidebar-foreground">
              {initials}
            </div>
          )}

          <div className="flex-1 overflow-hidden text-left">
            <p className="truncate text-[13px] font-semibold text-sidebar-foreground">
              {displayName}
            </p>
            <p className="text-[11px] text-sidebar-foreground/70">Sign out</p>
          </div>

          <LogOut className="size-[14px] text-sidebar-foreground/70" />
        </Button>
      </div>
    </div>
  )
}

export default function Sidebar({
  mobileOpen = false,
  onMobileOpenChange,
}: {
  mobileOpen?: boolean
  onMobileOpenChange?: (open: boolean) => void
}) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-[228px] lg:shrink-0 lg:flex-col lg:border-r lg:border-sidebar-border">
        <SidebarContent />
      </aside>

      <Dialog open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <DialogContent showCloseButton={false} className="top-0 left-0 h-dvh w-[min(280px,85vw)] max-w-none translate-x-0 translate-y-0 gap-0 rounded-none border-0 p-0">
          <DialogTitle className="sr-only">Workspace navigation</DialogTitle>
          <DialogDescription className="sr-only">Navigate your email operations workspace.</DialogDescription>
          <SidebarContent onClose={() => onMobileOpenChange?.(false)} />
        </DialogContent>
      </Dialog>
    </>
  )
}
