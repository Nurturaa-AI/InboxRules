"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Inbox, ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/shared/ThemeToggle"
import { cn } from "@/lib/utils"

// Informational routes that share this public chrome. Each href is a real,
// existing route (see app/(legal)/* and the /docs redirect).
const NAV_LINKS = [
  { label: "Documentation", href: "/documentation" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
]

/**
 * Slim top bar for the public informational/legal pages. It is deliberately
 * separate from the dashboard Header (which is auth-aware and packed with
 * app controls) but reuses the same brand mark, Button, and ThemeToggle.
 */
export default function LegalHeader() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-3 px-4 sm:px-6">
        {/* Brand */}
        <Link
          href="/dashboard"
          aria-label="InboxRules home"
          className="flex shrink-0 items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary shadow-sm">
            <Inbox
              className="size-[17px] text-primary-foreground"
              strokeWidth={2.5}
            />
          </span>
          <span className="text-base font-extrabold tracking-tight text-foreground">
            Inbox<span className="text-primary">Rules</span>
          </span>
        </Link>

        {/* Section nav */}
        <nav aria-label="Informational pages" className="ml-2 hidden sm:block">
          <ul className="flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium underline-offset-4 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40",
                      active
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:underline"
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Controls */}
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">
              <ArrowLeft />
              <span className="hidden sm:inline">Back to dashboard</span>
              <span className="sm:hidden">Dashboard</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
