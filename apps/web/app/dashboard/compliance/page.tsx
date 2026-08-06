"use client"

import { useState } from "react"
import {
  CheckCircle,
  XCircle,
  ChevronDown,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  LayoutGrid,
  Shield,
} from "lucide-react"

import { useApiQuery } from "@/lib/useApiQuery"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/PageHeader"
import { MetricCard } from "@/components/shared/MetricCard"
import { HealthScore } from "@/components/shared/HealthScore"
import { AuthStatusBadge } from "@/components/shared/AuthStatusBadge"
import { DomainAvatar } from "@/components/shared/DomainAvatar"
import { StatusBadge, statusFromString } from "@/components/shared/StatusBadge"
import { EmptyState } from "@/components/shared/EmptyState"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"

interface DkimSelector {
  selector: string
  keyBits?: number
  valid?: boolean
}

interface Domain {
  id: string
  domain: string
  unsubStatus?: "active" | "inactive" | null
  detectedEsp: string | null
  healthScore: number
  spfStatus: string
  dkimStatus: string
  dmarcStatus: string
  snapshots: Array<{
    spfRecord: string | null
    spfLookupCount: number | null
    spfResult: string | null
    dkimSelectors: unknown
    dmarcRecord: string | null
    dmarcPolicy: string | null
    dmarcPct: number | null
    dmarcResult?: string | null
    overallScore: number
  }>
}

/** Small status icon paired with a label (never color-only). */
function CheckIcon({ status }: { status: string }) {
  const kind = statusFromString(status)
  if (kind === "success")
    return <CheckCircle className="size-3.5 text-success" aria-label="Pass" />
  if (kind === "danger" || kind === "neutral")
    return <XCircle className="size-3.5 text-danger" aria-label="Fail" />
  return <ShieldAlert className="size-3.5 text-warning" aria-label="Warning" />
}

/** A labeled record block inside the expanded detail. */
function DetailBlock({
  title,
  status,
  children,
}: {
  title: string
  status: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-4">
      <div className="mb-3 flex items-center gap-2">
        <CheckIcon status={status} />
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
      {children}
    </div>
  )
}

export default function CompliancePage() {
  const { data, loading, error, refetch } = useApiQuery<Domain[]>(
    "/domains?limit=100&include=snapshots,changeEvents"
  )
  const [expanded, setExpanded] = useState<string | null>(null)

  const domains = data || []
  // Canonical thresholds (shared with HealthScore): ≥80 healthy, ≥60 warning, <60 critical.
  const compliant = domains.filter((d) => d.healthScore >= 80).length
  const warning = domains.filter(
    (d) => d.healthScore >= 60 && d.healthScore < 80
  ).length
  const critical = domains.filter((d) => d.healthScore < 60).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance"
        description="SPF, DKIM, DMARC, and unsubscribe status for every domain"
        action={
          <Button
            variant="outline"
            size="icon-sm"
            onClick={refetch}
            aria-label="Refresh compliance data"
          >
            <RefreshCw className={loading ? "animate-spin" : ""} />
          </Button>
        }
      />

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total"
          value={loading ? "—" : domains.length}
          icon={LayoutGrid}
        />
        <MetricCard
          label="Compliant"
          value={loading ? "—" : compliant}
          icon={ShieldCheck}
          hint="Score ≥ 80"
        />
        <MetricCard
          label="Warning"
          value={loading ? "—" : warning}
          icon={ShieldAlert}
          hint="Score 60–79"
        />
        <MetricCard
          label="Critical"
          value={loading ? "—" : critical}
          icon={ShieldX}
          hint="Score < 60"
        />
      </div>

      {/* Body */}
      {loading ? (
        <Card className="p-5">
          <LoadingSkeleton variant="table" count={5} />
        </Card>
      ) : error ? (
        <Card className="p-5">
          <EmptyState
            icon={Shield}
            title="Failed to load compliance data"
            description={error}
            action={
              <Button variant="outline" size="sm" onClick={refetch}>
                <RefreshCw />
                Try again
              </Button>
            }
          />
        </Card>
      ) : domains.length === 0 ? (
        <Card className="p-5">
          <EmptyState
            icon={Shield}
            title="No domains yet"
            description="Add domains to see compliance details here."
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {domains.map((d) => {
            const snap = d.snapshots?.[0]
            const dkimSelectors: DkimSelector[] = Array.isArray(
              snap?.dkimSelectors
            )
              ? (snap.dkimSelectors as DkimSelector[])
              : []
            const isExpanded = expanded === d.id
            const panelId = `compliance-detail-${d.id}`

            return (
              <Card key={d.id} className="gap-0 overflow-hidden p-0">
                {/* Row header (accessible disclosure trigger) */}
                <button
                  type="button"
                  onClick={() => setExpanded(isExpanded ? null : d.id)}
                  aria-expanded={isExpanded}
                  aria-controls={panelId}
                  className={cn(
                    "flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
                    isExpanded && "bg-muted/40"
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <DomainAvatar domain={d.domain} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {d.domain}
                      </p>
                      <p className="truncate font-mono text-xs text-muted-foreground">
                        {d.detectedEsp || "Unknown ESP"}
                      </p>
                    </div>
                  </div>

                  <div className="hidden items-center gap-2 md:flex">
                    <AuthStatusBadge status={d.spfStatus} />
                    <AuthStatusBadge status={d.dkimStatus} />
                    <AuthStatusBadge status={d.dmarcStatus} />
                  </div>

                  <HealthScore
                    score={d.healthScore}
                    variant="text"
                    className="min-w-[2.5rem] text-right text-lg"
                  />

                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-muted-foreground transition-transform",
                      isExpanded && "rotate-180"
                    )}
                    aria-hidden="true"
                  />
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div
                    id={panelId}
                    className="border-t border-border p-5"
                  >
                    {/* Compact auth badges on mobile (hidden in header) */}
                    <div className="mb-4 flex flex-wrap items-center gap-2 md:hidden">
                      <AuthStatusBadge status={d.spfStatus} />
                      <AuthStatusBadge status={d.dkimStatus} />
                      <AuthStatusBadge status={d.dmarcStatus} />
                    </div>

                    {!snap ? (
                      <p className="py-5 text-center text-sm text-muted-foreground">
                        No scan data yet. Click &quot;Scan&quot; on the domain to
                        run a check.
                      </p>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">
                        {/* SPF */}
                        <DetailBlock
                          title="SPF Record"
                          status={snap.spfResult || "unknown"}
                        >
                          {snap.spfRecord ? (
                            <code className="mb-2.5 block rounded-md border border-border bg-card px-2.5 py-2 font-mono text-xs break-all text-muted-foreground">
                              {snap.spfRecord}
                            </code>
                          ) : (
                            <p className="mb-2.5 text-xs text-danger">
                              No SPF record found
                            </p>
                          )}
                          <p className="mb-1 text-xs text-muted-foreground">
                            DNS Lookups
                          </p>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                              <div
                                className={cn(
                                  "h-full rounded-full",
                                  (snap.spfLookupCount || 0) >= 8
                                    ? "bg-danger"
                                    : (snap.spfLookupCount || 0) >= 6
                                      ? "bg-warning"
                                      : "bg-success"
                                )}
                                style={{
                                  width: `${Math.min(100, ((snap.spfLookupCount || 0) / 10) * 100)}%`,
                                }}
                              />
                            </div>
                            <span
                              className={cn(
                                "font-mono text-xs font-semibold",
                                (snap.spfLookupCount || 0) >= 8
                                  ? "text-danger"
                                  : "text-success"
                              )}
                            >
                              {snap.spfLookupCount || 0}/10
                            </span>
                          </div>
                        </DetailBlock>

                        {/* DKIM */}
                        <DetailBlock title="DKIM Selectors" status={d.dkimStatus}>
                          {dkimSelectors.length === 0 ? (
                            <p className="text-xs text-danger">
                              No DKIM selectors found
                            </p>
                          ) : (
                            <ul className="flex flex-col gap-2">
                              {dkimSelectors.map((sel, i) => (
                                <li
                                  key={i}
                                  className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-2.5 py-2"
                                >
                                  <code className="flex-1 font-mono text-xs text-muted-foreground">
                                    {sel.selector}
                                  </code>
                                  <span
                                    className={cn(
                                      "font-mono text-xs font-semibold",
                                      (sel.keyBits || 0) >= 2048
                                        ? "text-success"
                                        : "text-warning"
                                    )}
                                  >
                                    {sel.keyBits || "?"}bit
                                  </span>
                                  {sel.valid ? (
                                    <CheckCircle
                                      className="size-3 text-success"
                                      aria-label="Valid"
                                    />
                                  ) : (
                                    <XCircle
                                      className="size-3 text-danger"
                                      aria-label="Invalid"
                                    />
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </DetailBlock>

                        {/* DMARC */}
                        <DetailBlock
                          title="DMARC Policy"
                          status={snap.dmarcResult || d.dmarcStatus}
                        >
                          {snap.dmarcRecord ? (
                            <code className="mb-2.5 block rounded-md border border-border bg-card px-2.5 py-2 font-mono text-xs break-all text-muted-foreground">
                              {snap.dmarcRecord}
                            </code>
                          ) : (
                            <p className="mb-2.5 text-xs text-danger">
                              No DMARC record found
                            </p>
                          )}
                          {snap.dmarcPolicy && (
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span>Policy:</span>
                              <span
                                className={cn(
                                  "font-mono font-semibold",
                                  snap.dmarcPolicy === "reject"
                                    ? "text-success"
                                    : snap.dmarcPolicy === "quarantine"
                                      ? "text-warning"
                                      : "text-danger"
                                )}
                              >
                                p={snap.dmarcPolicy}
                              </span>
                              <span>· pct={snap.dmarcPct ?? 100}%</span>
                            </div>
                          )}
                        </DetailBlock>

                        {/* Unsubscribe */}
                        <DetailBlock
                          title="One-Click Unsubscribe"
                          status={d.unsubStatus === "active" ? "pass" : "warn"}
                        >
                          {d.unsubStatus === "active" ? (
                            <StatusBadge
                              status="success"
                              label="RFC 8058 endpoint active"
                            />
                          ) : (
                            <p className="text-xs leading-relaxed text-muted-foreground">
                              One-click unsubscribe endpoint not configured.
                              Enable it in the Unsubscribe tab.
                            </p>
                          )}
                        </DetailBlock>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
