import Link from "next/link"
import { Inbox, ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"

interface PlaceholderPageProps {
  /** Page heading, e.g. "Privacy Policy". */
  title: string
  /** One or two sentences describing the page. */
  description: string
}

/**
 * Minimal, on-brand landing used by the informational routes linked from the
 * footer (Documentation, Support, Privacy, Terms) until their full content is
 * authored. Renders under the root layout — no dashboard shell — and relies
 * only on existing design tokens, so it is theme-aware by construction.
 */
export default function PlaceholderPage({
  title,
  description,
}: PlaceholderPageProps) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-6 py-16 text-center">
      <Link
        href="/dashboard"
        aria-label="InboxRules home"
        className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary shadow-sm">
          <Inbox
            className="size-[18px] text-primary-foreground"
            strokeWidth={2.5}
          />
        </span>
        <span className="text-lg font-extrabold tracking-tight text-foreground">
          Inbox<span className="text-primary">Rules</span>
        </span>
      </Link>

      <div className="max-w-md space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>

      <Button asChild variant="outline" size="sm">
        <Link href="/dashboard">
          <ArrowLeft />
          Back to dashboard
        </Link>
      </Button>
    </main>
  )
}
