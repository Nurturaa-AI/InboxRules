"use client"

import { useState, useCallback } from "react"
import { useAuth } from "@clerk/nextjs"
import { toast } from "sonner"
import {
  Check,
  Zap,
  Building,
  Users,
  RefreshCw,
  CreditCard,
  Sparkles,
} from "lucide-react"

import { useApiQuery } from "@/lib/useApiQuery"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/shared/PageHeader"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"

// ── Types ──
interface Subscription {
  plan: string
  customerId: string | null
  usage: {
    domains: { used: number; limit: number }
    checksPerDay: number
    aiFeatures: boolean
  }
}

interface Usage {
  domains: number
  scans: number
  aiCalls: number
  aiCostUsd: number
  suppressions: number
}

interface BillingResponse {
  subscription: Subscription
  usage: Usage
}

type PlanIcon = typeof Zap

interface Plan {
  name: string
  price: string
  period: string
  description: string
  icon: PlanIcon
  variantKey: string | null
  features: string[]
}

// ── Plans ──
// Static marketing prices (monthly). Checkout does not accept a billing cycle,
// so we advertise only the real monthly price.
const PLANS: Plan[] = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "For individuals testing compliance",
    icon: Zap,
    variantKey: null,
    features: [
      "3 domains",
      "24h DNS monitoring",
      "Basic compliance check",
      "Community support",
    ],
  },
  {
    name: "Pro",
    price: "$49",
    period: "per month",
    description: "For businesses sending at scale",
    icon: Users,
    variantKey: "pro",
    features: [
      "50 domains",
      "6h DNS monitoring",
      "AI-powered explanations",
      "Hosted unsubscribe endpoint",
      "Slack + email alerts",
      "API access",
      "Priority support",
    ],
  },
  {
    name: "Agency",
    price: "$199",
    period: "per month",
    description: "For agencies managing multiple clients",
    icon: Building,
    variantKey: "agency",
    features: [
      "500 domains",
      "1h DNS monitoring",
      "Everything in Pro",
      "White-label dashboard",
      "Client management",
      "Custom unsub domain",
      "SLA guarantee",
    ],
  },
]

const PLAN_LIMITS: Record<string, number> = { free: 3, pro: 50, agency: 500 }

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4500"

export default function BillingPage() {
  const { getToken } = useAuth()

  // Fetch billing data — returns { subscription, usage } inside data
  const { data, loading, refetch } = useApiQuery<BillingResponse>("/billing")

  const [upgrading, setUpgrading] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  const plan = data?.subscription?.plan ?? "free"
  const usage = data?.usage
  const domainLimit = PLAN_LIMITS[plan] ?? 3

  // ── Upgrade to paid plan ──
  const handleUpgrade = useCallback(
    async (planKey: string) => {
      setUpgrading(planKey)
      try {
        const token = await getToken()
        if (!token) throw new Error("Not authenticated")

        const response = await fetch(`${API_URL}/api/v1/billing/checkout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ plan: planKey }),
        })

        const json = (await response.json()) as {
          data?: { checkoutUrl?: string }
          error?: { message?: string }
        }

        if (!response.ok) {
          throw new Error(json.error?.message ?? "Failed to create checkout")
        }

        const checkoutUrl = json.data?.checkoutUrl
        if (checkoutUrl) {
          window.location.href = checkoutUrl
        }
      } catch (err: unknown) {
        toast.error("Failed to start checkout", {
          description: err instanceof Error ? err.message : undefined,
        })
      } finally {
        setUpgrading(null)
      }
    },
    [getToken]
  )

  // ── Open Lemon Squeezy customer portal ──
  const handleManagePortal = useCallback(async () => {
    setPortalLoading(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("Not authenticated")

      const response = await fetch(`${API_URL}/api/v1/billing/portal`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })

      const json = (await response.json()) as {
        data?: { portalUrl?: string }
        error?: { message?: string }
      }

      if (!response.ok) {
        throw new Error(json.error?.message ?? "No active subscription found")
      }

      const portalUrl = json.data?.portalUrl
      if (portalUrl) {
        window.open(portalUrl, "_blank")
      }
    } catch (err: unknown) {
      toast.error("Failed to open billing portal", {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setPortalLoading(false)
    }
  }, [getToken])

  // Domains is a real quota (used/limit → progress bar). Scans, AI calls, and
  // unsubscribes have no per-plan cap, so show the real month-to-date count
  // only — never a fabricated denominator.
  const quotaTile = usage
    ? { label: "Domains", used: usage.domains, total: domainLimit }
    : null
  const countTiles = usage
    ? [
        { label: "Scans", value: usage.scans },
        { label: "AI Calls", value: usage.aiCalls },
        { label: "Unsubscribes", value: usage.suppressions },
      ]
    : []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description="Manage your subscription, usage, and invoices"
        action={
          <Button
            variant="outline"
            size="icon-sm"
            onClick={refetch}
            aria-label="Refresh billing information"
          >
            <RefreshCw className={loading ? "animate-spin" : ""} />
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-6">
          <LoadingSkeleton variant="card" count={1} />
          <LoadingSkeleton variant="metrics" count={4} />
          <LoadingSkeleton variant="card" count={1} />
        </div>
      ) : (
        <>
          {/* ── Current plan banner ── */}
          <Card className="gap-0 border-primary/20 bg-primary/5 p-0">
            <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold tracking-wide text-primary uppercase">
                  Current Plan
                </p>
                <p className="mt-1 text-2xl font-bold text-foreground capitalize">
                  {plan} Plan
                </p>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {plan === "free"
                    ? "Free forever — upgrade to unlock more domains"
                    : "Billed monthly via Lemon Squeezy"}
                </p>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Domains used</p>
                  <p className="font-mono text-2xl font-bold text-foreground tabular-nums">
                    {usage?.domains ?? 0}
                    <span className="text-muted-foreground">/{domainLimit}</span>
                  </p>
                </div>

                {plan !== "free" && (
                  <Button
                    variant="outline"
                    onClick={handleManagePortal}
                    disabled={portalLoading}
                  >
                    <CreditCard />
                    {portalLoading ? "Loading…" : "Manage Subscription"}
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* ── Usage stats ── */}
          {usage && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {quotaTile &&
                (() => {
                  const pct = Math.min(
                    100,
                    quotaTile.total > 0
                      ? (quotaTile.used / quotaTile.total) * 100
                      : 0
                  )
                  const barColor =
                    pct >= 90
                      ? "bg-danger"
                      : pct >= 75
                        ? "bg-warning"
                        : "bg-primary"
                  return (
                    <Card className="gap-3 p-5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-muted-foreground">
                          {quotaTile.label}
                        </p>
                        <span className="font-mono text-xs font-semibold text-foreground tabular-nums">
                          {quotaTile.used.toLocaleString()}/
                          {quotaTile.total.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full transition-[width] duration-500",
                            barColor
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(pct)}% of plan limit
                      </p>
                    </Card>
                  )
                })()}

              {countTiles.map((item) => (
                <Card key={item.label} className="gap-3 p-5">
                  <p className="text-sm font-medium text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="font-mono text-2xl font-semibold text-foreground tabular-nums">
                    {item.value.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">This month</p>
                </Card>
              ))}
            </div>
          )}

          {/* ── Plan comparison ── */}
          <Card className="gap-0 p-0">
            <CardHeader className="border-b p-5">
              <CardTitle className="text-sm">Plans</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Upgrade or downgrade anytime
              </p>
            </CardHeader>

            <div className="grid divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0">
              {PLANS.map((p) => {
                const isCurrent = plan === p.name.toLowerCase()
                const Icon = p.icon

                return (
                  <div
                    key={p.name}
                    className={cn(
                      "relative flex flex-col p-6",
                      isCurrent && "bg-primary/5"
                    )}
                  >
                    {isCurrent && (
                      <Badge
                        variant="default"
                        className="absolute top-4 right-4"
                      >
                        Current
                      </Badge>
                    )}

                    <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:size-[18px]">
                      <Icon aria-hidden="true" />
                    </span>

                    <p className="mt-3.5 text-base font-bold text-foreground">
                      {p.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {p.description}
                    </p>

                    <div className="mt-3.5 flex items-end gap-1">
                      <span className="font-mono text-3xl font-bold text-foreground">
                        {p.price}
                      </span>
                      <span className="mb-1 text-sm text-muted-foreground">
                        /{p.period}
                      </span>
                    </div>

                    <ul className="mt-4 flex flex-col gap-2">
                      {p.features.map((feat) => (
                        <li key={feat} className="flex items-center gap-2">
                          <Check
                            className="size-3.5 shrink-0 text-primary"
                            strokeWidth={2.5}
                            aria-hidden="true"
                          />
                          <span className="text-sm text-foreground/80">
                            {feat}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      variant={
                        isCurrent || !p.variantKey ? "outline" : "default"
                      }
                      className="mt-5 w-full"
                      onClick={() => {
                        if (p.variantKey && !isCurrent)
                          handleUpgrade(p.variantKey)
                      }}
                      disabled={
                        isCurrent || !p.variantKey || upgrading === p.variantKey
                      }
                    >
                      {upgrading === p.variantKey
                        ? "Redirecting…"
                        : isCurrent
                          ? "Current Plan"
                          : p.variantKey
                            ? "Upgrade"
                            : "Free Forever"}
                    </Button>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* ── AI cost breakdown ── */}
          {usage && usage.aiCostUsd > 0 && (
            <Card className="gap-0 p-0">
              <CardContent className="flex items-center justify-between gap-4 p-5">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary [&_svg]:size-4">
                    <Sparkles aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      AI Usage Cost This Month
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {usage.aiCalls} AI calls · Gemini 2.0 Flash
                    </p>
                  </div>
                </div>
                <p className="font-mono text-2xl font-bold text-foreground tabular-nums">
                  ${usage.aiCostUsd.toFixed(4)}
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
