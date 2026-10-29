"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Zap,
  Globe,
  RefreshCw,
  Link2,
  Mail,
} from "lucide-react"

import Link from "next/link"
import { useApi } from "@/lib/api"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
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

export default function UnsubscribePage() {
  const api = useApi()
  const { data: domainsData, loading: domainsLoading, error: domainsError, refetch: refreshDomains } =
    useApiQuery<Domain[]>("/domains?limit=100")

  const {
    data: suppressionData,
    loading: suppressionLoading,
    error: suppressionError,
    pagination,
    refetch,
  } = useApiQuery<SuppressionEvent[]>(
    "/suppression?limit=20"
  )

  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null)
  const [recipient, setRecipient] = useState("")
  const [generating, setGenerating] = useState(false)
  const [headers, setHeaders] = useState<string | null>(null)
  const [headerError, setHeaderError] = useState<string | null>(null)
  const domains = domainsData ?? []
  const events = suppressionData ?? []
  const active = domains.filter((d) => d.unsubStatus === "active").length

  async function generateHeaders(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedDomain) return
    setGenerating(true)
    setHeaderError(null)
    setHeaders(null)
    try {
      const response = await api.get<{ data: { listUnsubscribe: string; listUnsubscribePost: string } }>(`/domains/${selectedDomain.id}/unsubscribe/headers?recipient=${encodeURIComponent(recipient.trim())}`)
      setHeaders(`List-Unsubscribe: ${response.data.listUnsubscribe}\nList-Unsubscribe-Post: ${response.data.listUnsubscribePost}`)
    } catch (err) {
      setHeaderError(err instanceof Error ? err.message : "Could not generate headers")
    } finally { setGenerating(false) }
  }

  async function copyHeaders() {
    if (!headers) return
    try { await navigator.clipboard.writeText(headers); toast.success("Recipient headers copied") }
    catch { toast.error("Could not copy headers. Select and copy the text below.") }
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

      <div className="border-l-2 border-primary py-1 pl-4 text-sm leading-relaxed text-muted-foreground">
        Enable one-click unsubscribe in <Link href="/dashboard/compliance" className="font-medium text-primary underline">Compliance</Link>, then generate signed headers for each recipient.
        Each URL identifies one recipient; generate separate headers for every message.
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Active Endpoints"
          value={domainsLoading || domainsError ? "—" : active}
          icon={Zap}
        />
        <MetricCard
          label="Unsubscribes (all)"
          value={suppressionLoading || suppressionError ? "—" : pagination?.total ?? "—"}
          icon={Mail}
        />
        <MetricCard
          label="Total Domains"
          value={domainsLoading || domainsError ? "—" : domains.length}
          icon={Globe}
        />
      </div>

      {/* Endpoints */}
      <Card className="gap-0 p-0">
        <CardHeader className="border-b p-5">
          <CardTitle className="text-sm">Unsubscribe Endpoints</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Generate recipient-specific headers for enabled domains
          </p>
        </CardHeader>

        {domainsLoading ? (
          <div className="p-5">
            <LoadingSkeleton variant="text" count={3} />
          </div>
        ) : domainsError ? (<EmptyState title="Could not load endpoints" description={domainsError} action={<Button variant="outline" onClick={refreshDomains}>Try again</Button>} />) : domains.length === 0 ? (
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
                    label={d.unsubStatus === "active" ? "Active" : d.unsubStatus === "unknown" ? "Not configured" : "Inactive"}
                  />
                </div>

                <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-3">
                  <p className="text-xs text-muted-foreground">{d.unsubStatus === "active" ? "Signed, per-recipient URL" : "Enable in Compliance before generating headers"}</p>
                  <Button variant="outline" size="sm" disabled={d.unsubStatus !== "active"} onClick={() => { setSelectedDomain(d); setRecipient(""); setHeaders(null); setHeaderError(null) }}>Generate headers</Button>
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
          ) : suppressionError ? (<EmptyState title="Could not load unsubscribe events" description={suppressionError} action={<Button variant="outline" onClick={refetch}>Try again</Button>} />) : (
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
      <Dialog open={selectedDomain !== null} onOpenChange={(open) => { if (!open && !generating) setSelectedDomain(null) }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Generate unsubscribe headers</DialogTitle><DialogDescription>Generate signed headers for one recipient on {selectedDomain?.domain}. Use a new token for each recipient.</DialogDescription></DialogHeader>
          <form onSubmit={generateHeaders} className="space-y-3">
            <label htmlFor="header-recipient" className="text-sm font-medium">Recipient email</label>
            <Input id="header-recipient" type="email" required value={recipient} disabled={generating} onChange={(event) => { setRecipient(event.target.value); setHeaders(null) }} autoComplete="off" />
            <Button type="submit" disabled={generating || !recipient.trim()}>{generating ? "Generating…" : "Generate headers"}</Button>
          </form>
          {headerError && <p role="alert" className="text-sm text-danger">{headerError}</p>}
          {headers && <div className="space-y-3"><pre className="whitespace-pre-wrap break-all rounded-md border bg-muted p-3 font-mono text-xs">{headers}</pre><Button variant="outline" onClick={copyHeaders}>Copy headers</Button></div>}
        </DialogContent>
      </Dialog>
    </div>
  )
}
