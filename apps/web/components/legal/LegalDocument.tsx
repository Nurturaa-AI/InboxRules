import type { ReactNode } from "react"
import { TriangleAlert, ArrowUp } from "lucide-react"

import { cn } from "@/lib/utils"

export interface LegalSection {
  /** Anchor id, used by the table of contents and deep links. */
  id: string
  /** Section heading. */
  title: string
  /** Section body — authored as semantic HTML, styled by <LegalProse>. */
  content: ReactNode
}

interface LegalDocumentProps {
  /** Small label above the title, e.g. "Legal" or "Reference". */
  eyebrow: string
  eyebrowIcon: ReactNode
  title: string
  /** Human-readable date string, e.g. "August 9, 2026". */
  updated: string
  /** One-paragraph lead under the title. */
  summary: string
  sections: LegalSection[]
}

// Centralised prose styling. Sections author plain semantic HTML
// (<p>, <ul>, <h3>, <strong>, <a>, <code>) and inherit consistent typography
// built entirely from design tokens, so light/dark is handled automatically.
export const LEGAL_PROSE = cn(
  "text-sm leading-relaxed text-muted-foreground",
  "[&>*+*]:mt-3",
  "[&_h3]:mt-6 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:tracking-tight [&_h3]:text-foreground",
  "[&_strong]:font-semibold [&_strong]:text-foreground",
  "[&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary/80",
  "[&_ul]:space-y-2 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5",
  "[&_ul>li]:relative [&_ul>li]:pl-5",
  "[&_ul>li]:before:absolute [&_ul>li]:before:left-1 [&_ul>li]:before:top-[0.5rem] [&_ul>li]:before:size-1.5 [&_ul>li]:before:rounded-full [&_ul>li]:before:bg-primary/40",
  "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.8125rem] [&_code]:text-foreground"
)

export function LegalProse({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn(LEGAL_PROSE, className)}>{children}</div>
}

export default function LegalDocument({
  eyebrow,
  eyebrowIcon,
  title,
  updated,
  summary,
  sections,
}: LegalDocumentProps) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      {/* Title block */}
      <div className="max-w-2xl">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-medium text-muted-foreground [&>svg]:size-3.5">
          {eyebrowIcon}
          {eyebrow}
        </span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated <time>{updated}</time>
        </p>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          {summary}
        </p>
      </div>

      {/* Draft / counsel-review disclaimer */}
      <div
        role="note"
        className="mt-8 flex gap-3 rounded-xl border border-card-warning-border bg-card-warning p-4"
      >
        <TriangleAlert
          className="mt-0.5 size-5 shrink-0 text-warning"
          aria-hidden="true"
        />
        <div className="space-y-1 text-sm leading-relaxed text-foreground">
          <p className="font-semibold">Draft for legal review</p>
          <p className="text-muted-foreground">
            This document describes how InboxRules works and is provided for
            transparency. It has not been reviewed or approved as legal advice.
            Have it reviewed by qualified legal counsel, and complete every
            bracketed placeholder (for example{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
              [LEGAL COMPANY NAME]
            </code>
            ), before relying on it as a binding agreement.
          </p>
        </div>
      </div>

      {/* Body: sticky ToC + sections */}
      <div className="mt-10 grid gap-10 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-14">
        <aside className="hidden lg:block">
          <nav
            aria-label="On this page"
            className="sticky top-24 self-start"
          >
            <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              On this page
            </p>
            <ol className="space-y-1 text-sm">
              {sections.map((section, i) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="flex gap-2 rounded-md px-2 py-1 text-muted-foreground underline-offset-4 outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
                  >
                    <span className="tabular-nums text-muted-foreground/60">
                      {i + 1}.
                    </span>
                    <span>{section.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <div className="min-w-0 space-y-12">
          {sections.map((section, i) => (
            <section
              key={section.id}
              id={section.id}
              aria-labelledby={`${section.id}-heading`}
              className="scroll-mt-24"
            >
              <h2
                id={`${section.id}-heading`}
                className="text-lg font-semibold tracking-tight text-foreground"
              >
                <span className="mr-2 text-muted-foreground/50 tabular-nums">
                  {i + 1}.
                </span>
                {section.title}
              </h2>
              <div className="mt-3">
                <LegalProse>{section.content}</LegalProse>
              </div>
            </section>
          ))}

          {/* Back to top */}
          <div className="border-t border-border pt-6">
            <a
              href="#top"
              className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground underline-offset-4 outline-none transition-colors hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <ArrowUp className="size-4" aria-hidden="true" />
              Back to top
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
