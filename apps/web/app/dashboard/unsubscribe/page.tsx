"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Copy,
  Check,
  Shield,
  Zap,
  Globe,
  RefreshCw,
  Link2,
  Mail,
} from "lucide-react"

import { useApiQuery } from "@/lib/useApiQuery"
import { timeAgo } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/PageHeader"
import { MetricCard } from "@/components/shared/MetricCard"
import { StatusBadge, statusFromString } from "@/components/shared/StatusBadge"
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable"
import { EmptyState } from "@/components/shared/EmptyState"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"

type UnsubStatus = "active" | "inactive" | "disabled" | "unknown"

interface Domain {
  id: string
  domain: string
  unsubStatus: UnsubStatus
}

interface SuppressionEvent {
  id: string
  eventType: string
  sourceEsp: string | null
  occurredAt: string
  domain: { domain: string }
}

const UNSUB_URL =
  process.env.NEXT_PUBLIC_UNSUB_URL || "https://unsub.inboxrules.io"

const FEATURES = [
  {
    icon: Shield,
    title: "RFC 8058 Compliant",
    desc: "One-click POST handler meeting Gmail and Yahoo requirements",
  },
  {
    icon: Zap,
    title: "Global Edge Delivery",
    desc: "Hosted on Cloudflare Workers — zero cold starts worldwide",
  },
  {
    icon: Globe,
    title: "Auto Suppression",
    desc: "Unsubscribes are recorded and suppressed automatically",
  },
]

export default function UnsubscribePage() {
  const { data: domainsData, loading: domainsLoading } =
    useApiQuery<Domain[]>("/domains?limit=100")

  const {
    data: suppressionData,
    loading: suppressionLoading,
    refetch,
  } = useApiQuery<{ items: SuppressionEvent[]; pagination: { total: number } }>(
    "/suppression?limit=20"
  )

  const [copied, setCopied] = useState<string | null>(null)

  const domains = domainsData || []
  const events =
    suppressionData?.items ||
    (Array.isArray(suppressionData)
      ? (suppressionData as SuppressionEvent[])
      : [])
  const totalUnsubs = suppressionData?.pagination?.total || 0
  const active = domains.filter((d) => d.unsubStatus === "active").length

  function copyEndpoint(domainId: string) {
    const url = `${UNSUB_URL}/unsubscribe/${domainId}`
    navigator.clipboard.writeText(url)
    setCopied(domainId)
    toast.success("Endpoint URL copied to clipboard")
    setTimeout(() => setCopied(null), 2000)
  }

  function copyHeaders(domain: Domain) {
    const text =
      `List-Unsubscribe: <${UNSUB_URL}/unsubscribe/${domain.id}>, ` +
      `<mailto:unsubscribe@${domain.domain}?subject=unsubscribe>\n` +
      `List-Unsubscribe-Post: List-Unsubscribe=One-Click`
    navigator.clipboard.writeText(text)
    setCopied(`headers-${domain.id}`)
    toast.success("Email headers copied to clipboard")
    setTimeout(() => setCopied(null), 2000)
  }

  const eventColumns: DataTableColumn<SuppressionEvent>[] = [
    {
      key: "domain",
      header: "Domain",
      cell: (e) => (
        <span className="text-sm font-medium text-foreground">
          {e.domain?.domain}
        </span>
      ),
    },
    {
      key: "method",
      header: "Method",
      cell: (e) =>
        e.sourceEsp === "one_click" ? (
          <StatusBadge status="info" label="One-click" showIcon={false} />
        ) : (
          <StatusBadge status="neutral" label="Manual" showIcon={false} />
        ),
    },
    {
      key: "source",
      header: "Source",
      cell: (e) => (
        <span className="text-sm text-muted-foreground">
          {e.sourceEsp || "Unknown"}
        </span>
      ),
    },
    {
      key: "time",
      header: "Time",
      cell: (e) => (
        <span className="font-mono text-xs text-muted-foreground">
          {timeAgo(e.occurredAt)}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Unsubscribe"
        description="RFC 8058 one-click unsubscribe endpoints and suppression list"
      />

      {/* Feature cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.title} className="flex-row gap-3.5 p-5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:size-[18px]">
                <Icon aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {item.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {item.desc}
                </p>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Active Endpoints"
          value={domainsLoading ? "—" : active}
          icon={Zap}
        />
        <MetricCard
          label="Unsubscribes (all)"
          value={suppressionLoading ? "—" : totalUnsubs}
          icon={Mail}
        />
        <MetricCard
          label="Total Domains"
          value={domainsLoading ? "—" : domains.length}
          icon={Globe}
        />
      </div>

      {/* Endpoints */}
      <Card className="gap-0 p-0">
        <CardHeader className="border-b p-5">
          <CardTitle className="text-sm">Unsubscribe Endpoints</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Add these URLs and headers to your email campaigns
          </p>
        </CardHeader>

        {domainsLoading ? (
          <div className="p-5">
            <LoadingSkeleton variant="text" count={3} />
          </div>
        ) : domains.length === 0 ? (
          <EmptyState
            icon={Link2}
            size="sm"
            title="No domains yet"
            description="Add a domain to generate unsubscribe endpoints."
          />
        ) : (
          <ul className="divide-y divide-border">
            {domains.map((d) => (
              <li
                key={d.id}
                className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-4"
              >
                <div className="flex items-center gap-3 sm:w-56 sm:shrink-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {d.domain}
                  </p>
                  <StatusBadge
                    status={statusFromString(d.unsubStatus)}
                    label={d.unsubStatus === "active" ? "Active" : "Inactive"}
                  />
                </div>

                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-md border border-border bg-muted px-2.5 py-1.5 font-mono text-xs text-muted-foreground">
                    {UNSUB_URL}/unsubscribe/{d.id}
                  </code>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => copyEndpoint(d.id)}
                    aria-label={`Copy unsubscribe endpoint for ${d.domain}`}
                  >
                    {copied === d.id ? (
                      <Check className="text-success" />
                    ) : (
                      <Copy />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyHeaders(d)}
                  >
                    {copied === `headers-${d.id}` ? (
                      <Check className="text-success" />
                    ) : (
                      <Copy />
                    )}
                    Headers
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Recent unsubscribe events */}
      <Card className="gap-0 p-0">
        <CardHeader className="flex flex-row items-center justify-between gap-2 border-b p-5">
          <div>
            <CardTitle className="text-sm">Recent Unsubscribe Events</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Email addresses stored as SHA-256 hashes only
            </p>
          </div>
          {/*
            NOTE: the previous "Export CSV" button was a no-op (no handler, no
            backend). Removed rather than shipped as a dead control. Phase 2
            backend dependency: add GET /suppression/export (CSV stream) and
            reinstate the button wired to it.
          */}
          <Button
            variant="outline"
            size="icon-sm"
            onClick={refetch}
            aria-label="Refresh unsubscribe events"
          >
            <RefreshCw className={suppressionLoading ? "animate-spin" : ""} />
          </Button>
        </CardHeader>

        <div className="p-5">
          {suppressionLoading ? (
            <LoadingSkeleton variant="table" count={4} />
          ) : (
            <DataTable
              columns={eventColumns}
              data={events}
              getRowKey={(e) => e.id}
              emptySlot={
                <EmptyState
                  icon={Mail}
                  size="sm"
                  title="No unsubscribe events yet"
                  description="Events appear here when recipients click unsubscribe."
                />
              }
            />
          )}
        </div>
      </Card>
    </div>
  )
}
