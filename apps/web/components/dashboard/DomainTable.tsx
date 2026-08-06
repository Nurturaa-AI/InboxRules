"use client"

import { useState, useEffect, useCallback } from "react"
import {
  RefreshCw,
  ExternalLink,
  Trash2,
  Plus,
  Globe,
  Search as SearchIcon,
} from "lucide-react"
import { useAuth } from "@clerk/nextjs"
import { toast } from "sonner"

import { timeAgo } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable"
import { HealthScore } from "@/components/shared/HealthScore"
import { AuthStatusBadge } from "@/components/shared/AuthStatusBadge"
import { DomainAvatar } from "@/components/shared/DomainAvatar"
import { FilterBar } from "@/components/shared/FilterBar"
import { EmptyState } from "@/components/shared/EmptyState"
import { ActionMenu } from "@/components/shared/ActionMenu"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog"

interface Domain {
  id: string
  domain: string
  detectedEsp: string | null
  healthScore: number
  spfStatus: string
  dkimStatus: string
  dmarcStatus: string
  lastCheckedAt: string | null
  createdAt: string
}

interface Props {
  onAddDomain?: () => void
}

type Filter = "all" | "healthy" | "warning" | "critical"

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "healthy", label: "Healthy" },
  { value: "warning", label: "Warning" },
  { value: "critical", label: "Critical" },
]

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4500"

export default function DomainTable({ onAddDomain }: Props) {
  const { getToken } = useAuth()

  const [domains, setDomains] = useState<Domain[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>("all")
  const [scanning, setScanning] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Domain | null>(null)

  const fetchDomains = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const token = await getToken()
      const response = await fetch(`${API_URL}/api/v1/domains`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) throw new Error("Failed to fetch domains")

      const data = await response.json()
      setDomains(data.data || [])
    } catch (err: unknown) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    void Promise.resolve().then(() => fetchDomains())
  }, [fetchDomains])

  // Trigger a manual scan
  async function handleScan(id: string, name: string) {
    setScanning(id)
    try {
      const token = await getToken()
      const res = await fetch(`${API_URL}/api/v1/domains/${id}/scan`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Scan request failed")
      toast.success(`Scanning ${name}…`, {
        description: "Results refresh in a few seconds.",
      })
      // Refresh after 3 seconds to show updated score
      setTimeout(() => {
        fetchDomains()
        setScanning(null)
      }, 3000)
    } catch (err) {
      toast.error("Failed to start scan", {
        description: err instanceof Error ? err.message : undefined,
      })
      setScanning(null)
    }
  }

  // Delete a domain (confirmation handled by ConfirmationDialog)
  async function handleDelete(domain: Domain) {
    setDeleting(domain.id)
    try {
      const token = await getToken()
      const res = await fetch(`${API_URL}/api/v1/domains/${domain.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Delete request failed")
      setDomains((prev) => prev.filter((d) => d.id !== domain.id))
      toast.success(`${domain.domain} removed from monitoring`)
    } catch (err) {
      toast.error("Failed to remove domain", {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setDeleting(null)
    }
  }

  // Filter domains
  const filtered = domains.filter((d) => {
    if (filter === "healthy") return d.healthScore >= 80
    if (filter === "warning") return d.healthScore >= 60 && d.healthScore < 80
    if (filter === "critical") return d.healthScore < 60
    return true
  })

  const columns: DataTableColumn<Domain>[] = [
    {
      key: "domain",
      header: "Domain",
      cell: (d) => (
        <div className="flex items-center gap-3">
          <DomainAvatar domain={d.domain} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {d.domain}
            </p>
            <p className="truncate font-mono text-xs text-muted-foreground">
              {d.detectedEsp || "ESP detecting…"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "health",
      header: "Health Score",
      className: "w-40",
      cell: (d) => <HealthScore score={d.healthScore} size="sm" />,
    },
    {
      key: "spf",
      header: "SPF",
      cell: (d) => <AuthStatusBadge status={d.spfStatus} />,
    },
    {
      key: "dkim",
      header: "DKIM",
      cell: (d) => <AuthStatusBadge status={d.dkimStatus} />,
    },
    {
      key: "dmarc",
      header: "DMARC",
      cell: (d) => <AuthStatusBadge status={d.dmarcStatus} />,
    },
    {
      key: "lastChecked",
      header: "Last Checked",
      cell: (d) => (
        <span className="font-mono text-xs text-muted-foreground">
          {timeAgo(d.lastCheckedAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-px text-right",
      cell: (d) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="secondary"
            size="xs"
            onClick={() => handleScan(d.id, d.domain)}
            disabled={scanning === d.id}
          >
            <RefreshCw className={scanning === d.id ? "animate-spin" : ""} />
            {scanning === d.id ? "Scanning" : "Scan"}
          </Button>
          <ActionMenu
            items={[
              {
                label: "Open site",
                icon: ExternalLink,
                onClick: () => window.open(`https://${d.domain}`, "_blank"),
              },
              {
                label: "Remove domain",
                icon: Trash2,
                variant: "destructive",
                disabled: deleting === d.id,
                onClick: () => setPendingDelete(d),
              },
            ]}
          />
        </div>
      ),
    },
  ]

  return (
    <Card className="gap-0 overflow-hidden p-0">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Monitored Domains
          </h2>
          <p className="text-xs text-muted-foreground">
            {loading
              ? "Loading…"
              : `${domains.length} domain${domains.length !== 1 ? "s" : ""} · real-time monitoring`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={fetchDomains}
            aria-label="Refresh domains"
          >
            <RefreshCw className={loading ? "animate-spin" : ""} />
          </Button>
          <Button size="sm" onClick={onAddDomain}>
            <Plus strokeWidth={2.5} />
            Add Domain
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      {!loading && !error && domains.length > 0 && (
        <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/30 px-4 py-2.5 sm:px-5">
          <FilterBar
            options={FILTERS}
            value={filter}
            onValueChange={setFilter}
            aria-label="Filter domains by health"
          />
          <span className="font-mono text-xs text-muted-foreground">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Body */}
      <div className="p-4 sm:p-5">
        {loading ? (
          <LoadingSkeleton variant="table" count={4} />
        ) : error ? (
          <EmptyState
            icon={Globe}
            title="Failed to load domains"
            description={error}
            action={
              <Button variant="outline" size="sm" onClick={fetchDomains}>
                <RefreshCw />
                Try again
              </Button>
            }
          />
        ) : domains.length === 0 ? (
          <EmptyState
            icon={Globe}
            title="No domains yet"
            description="Add your first domain to start monitoring SPF, DKIM, and DMARC compliance."
            action={
              <Button size="sm" onClick={onAddDomain}>
                <Plus strokeWidth={2.5} />
                Add your first domain
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={SearchIcon}
            size="sm"
            title="No domains match this filter"
            description="Try a different filter to see more domains."
          />
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            getRowKey={(d) => d.id}
          />
        )}
      </div>

      {/* Footer */}
      {!loading && !error && filtered.length > 0 && (
        <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-3 sm:px-5">
          <span className="text-xs text-muted-foreground">
            Showing {filtered.length} of {domains.length} domains
          </span>
        </div>
      )}

      <ConfirmationDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
        title="Remove domain?"
        description={
          pendingDelete
            ? `${pendingDelete.domain} will be removed from monitoring. This can't be undone.`
            : ""
        }
        actionLabel="Remove"
        variant="destructive"
        onConfirm={() => {
          if (pendingDelete) handleDelete(pendingDelete)
        }}
      />
    </Card>
  )
}
