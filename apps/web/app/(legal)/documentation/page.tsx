import type { Metadata } from "next"
import Link from "next/link"
import {
  BookOpen,
  ScanLine,
  Bell,
  Sparkles,
  MailX,
  Globe,
  KeyRound,
  Webhook,
  ShieldCheck,
  Gauge,
  ArrowRight,
  LifeBuoy,
} from "lucide-react"

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "Guides and reference for monitoring email deliverability with InboxRules — DNS checks, change alerts, AI analysis, one-click unsubscribe, plans, and the API.",
  alternates: { canonical: "/documentation" },
  openGraph: {
    title: "Documentation — InboxRules",
    description:
      "Guides and reference for monitoring email deliverability with InboxRules.",
    url: "/documentation",
    type: "article",
  },
}

const SUPPORT_EMAIL = "support@inboxrules.com"

const FEATURES = [
  {
    icon: ScanLine,
    title: "DNS monitoring",
    body: "Scheduled checks of SPF, DKIM, DMARC, BIMI, MTA-STS, and TLS-RPT for every sending domain, with historical snapshots.",
  },
  {
    icon: Bell,
    title: "Change detection & alerts",
    body: "Record changes are detected between scans, classified by severity, and dispatched over email, Slack, and webhooks.",
  },
  {
    icon: Sparkles,
    title: "AI explanations",
    body: "Google Gemini turns structured findings into plain-English explanations and provider-specific configuration fixes.",
  },
  {
    icon: MailX,
    title: "One-click unsubscribe",
    body: "An RFC 8058 List-Unsubscribe endpoint hosted at the edge, backed by an automatic suppression list.",
  },
  {
    icon: Globe,
    title: "Multi-domain & multi-tenant",
    body: "Organize domains under a workspace with strict tenant isolation. Agency plans manage many client domains.",
  },
  {
    icon: Gauge,
    title: "Plans & quotas",
    body: "Per-plan domain limits, scan frequency, and monthly AI budgets keep usage predictable across Free, Pro, and Agency.",
  },
] as const

const QUICK_START = [
  {
    title: "Create your workspace",
    body: "Sign up and sign in through Clerk. Your account is associated with a single tenant workspace.",
  },
  {
    title: "Add a sending domain",
    body: "From Domains, add a domain you own or are authorized to manage. InboxRules runs its first DNS scan right away.",
  },
  {
    title: "Review compliance & fixes",
    body: "Open Compliance to see SPF, DKIM, and DMARC status. Use AI analysis for a plain-English explanation and a suggested fix.",
  },
  {
    title: "Enable alerts",
    body: "Connect an email address, Slack channel, or webhook so you are notified the moment a record changes.",
  },
  {
    title: "Host one-click unsubscribe",
    body: "Enable unsubscribe hosting for a domain and reference the generated List-Unsubscribe header in your outbound mail.",
  },
] as const

const PLANS = [
  { name: "Free", domains: "3 domains", scan: "every 24 hours", ai: "$0.50 / mo" },
  { name: "Pro", domains: "50 domains", scan: "every 6 hours", ai: "$10 / mo" },
  { name: "Agency", domains: "500 domains", scan: "every hour", ai: "$50 / mo" },
] as const

const API_TOPICS = [
  {
    icon: KeyRound,
    title: "Authentication",
    body: "User-facing endpoints under /api/v1 authenticate with a Clerk-issued bearer JWT, verified server-side. Every request is scoped to your tenant.",
  },
  {
    icon: Webhook,
    title: "Webhooks & internal routes",
    body: "Billing and Clerk webhooks are signature-verified. The edge unsubscribe worker calls an internal endpoint secured with a shared internal key.",
  },
  {
    icon: ShieldCheck,
    title: "Rate limits",
    body: "Requests are rate-limited per IP and metered against your plan. AI analysis is additionally capped by a monthly per-tenant budget.",
  },
] as const
const ENDPOINT_GROUPS = [
  { path: "/api/v1/domains", purpose: "CRUD, on-demand scans, unsubscribe controls" },
  { path: "/api/v1/ai", purpose: "Streaming analysis (SSE) and configuration snippets" },
  { path: "/api/v1/alerts", purpose: "List, acknowledge, and resolve change events; channels" },
  { path: "/api/v1/analytics", purpose: "Health history, overview, and compliance summary" },
  { path: "/api/v1/suppression", purpose: "List suppression events" },
  { path: "/api/v1/billing", purpose: "Plan info, checkout, portal, and usage" },
] as const

export default function DocumentationPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      {/* Hero */}
      <header className="max-w-2xl">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          <BookOpen className="size-3.5" aria-hidden="true" />
          Documentation
        </span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          InboxRules documentation
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          InboxRules monitors your sending domains for SPF, DKIM, DMARC, and
          one-click-unsubscribe compliance, explains issues in plain English with
          AI, and hosts an RFC 8058 unsubscribe endpoint at the edge. This page is
          an overview of how the product works and how to get started.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild size="sm">
            <Link href="/dashboard">
              Open the dashboard
              <ArrowRight />
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href="#quick-start">Quick start</a>
          </Button>
        </div>
      </header>

      {/* Quick start */}
      <section id="quick-start" className="mt-14 scroll-mt-24">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Quick start
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          From sign-up to your first alert in five steps.
        </p>
        <ol className="mt-6 space-y-4">
          {QUICK_START.map((step, i) => (
            <li key={step.title} className="flex gap-4">
              <span
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary tabular-nums"
              >
                {i + 1}
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Features */}
      <section id="features" className="mt-16 scroll-mt-24">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Core features
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon
            return (
              <Card key={f.title} size="sm">
                <CardHeader>
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-[18px]" aria-hidden="true" />
                  </span>
                  <CardTitle className="mt-3">{f.title}</CardTitle>
                  <CardDescription>{f.body}</CardDescription>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="mt-16 scroll-mt-24">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Plans and limits
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Each plan sets how many domains you can monitor, how often they are
          scanned, and your monthly AI analysis allowance. See{" "}
          <Link
            href="/dashboard/billing"
            className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
          >
            Billing
          </Link>{" "}
          for current pricing.
        </p>
        <div className="mt-6 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[34rem] border-collapse text-sm">
            <caption className="sr-only">
              InboxRules plan limits: domains, scan frequency, and monthly AI
              allowance.
            </caption>
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th scope="col" className="px-4 py-3 font-semibold text-foreground">
                  Plan
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-foreground">
                  Domains
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-foreground">
                  Scan frequency
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-foreground">
                  Monthly AI allowance
                </th>
              </tr>
            </thead>
            <tbody>
              {PLANS.map((p) => (
                <tr
                  key={p.name}
                  className="border-b border-border last:border-b-0"
                >
                  <th
                    scope="row"
                    className="px-4 py-3 font-semibold text-foreground"
                  >
                    {p.name}
                  </th>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">
                    {p.domains}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.scan}</td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">
                    {p.ai}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          The monthly AI allowance is a fair-use spend cap on AI analysis; normal
          use stays well within it. When it is reached, AI features pause until the
          next cycle while the rest of the Service keeps running.
        </p>
      </section>

      {/* API */}
      <section id="api" className="mt-16 scroll-mt-24">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          API reference
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The API is served under{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.8125rem] text-foreground">
            /api/v1
          </code>{" "}
          and authenticated with your Clerk session token.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {API_TOPICS.map((t) => {
            const Icon = t.icon
            return (
              <Card key={t.title} size="sm" variant="neutral">
                <CardHeader>
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-[18px]" aria-hidden="true" />
                  </span>
                  <CardTitle className="mt-3">{t.title}</CardTitle>
                  <CardDescription>{t.body}</CardDescription>
                </CardHeader>
              </Card>
            )
          })}
        </div>

        <div className="mt-6 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[34rem] border-collapse text-sm">
            <caption className="sr-only">
              InboxRules API endpoint groups and their purpose.
            </caption>
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th scope="col" className="px-4 py-3 font-semibold text-foreground">
                  Endpoint group
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-foreground">
                  Purpose
                </th>
              </tr>
            </thead>
            <tbody>
              {ENDPOINT_GROUPS.map((e) => (
                <tr
                  key={e.path}
                  className="border-b border-border last:border-b-0"
                >
                  <td className="px-4 py-3 align-top">
                    <code className="font-mono text-[0.8125rem] text-foreground">
                      {e.path}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{e.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Security & support */}
      <section id="security" className="mt-16 scroll-mt-24">
        <div className="grid gap-4 md:grid-cols-2">
          <Card variant="info">
            <CardHeader>
              <span className="flex size-9 items-center justify-center rounded-lg bg-info-subtle text-info">
                <ShieldCheck className="size-[18px]" aria-hidden="true" />
              </span>
              <CardTitle className="mt-3">Security &amp; privacy</CardTitle>
              <CardDescription>
                Data is encrypted in transit, recipient identifiers and
                unsubscribe tokens are stored as one-way hashes, and workspaces are
                strictly isolated. Raw DNS and email-header content is never sent to
                the AI provider.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" size="sm">
                <Link href="/privacy">
                  Read the Privacy Policy
                  <ArrowRight />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <LifeBuoy className="size-[18px]" aria-hidden="true" />
              </span>
              <CardTitle className="mt-3">Need help?</CardTitle>
              <CardDescription>
                Can&rsquo;t find what you need? Our team is happy to help with
                setup, deliverability questions, and troubleshooting.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button asChild size="sm">
                <a href={`mailto:${SUPPORT_EMAIL}`}>Contact support</a>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/support">Support center</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
