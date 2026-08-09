"use client"

import { useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { toast } from "sonner"
import {
  Plus,
  RefreshCw,
  ExternalLink,
  Trash2,
  Globe,
  Search as SearchIcon,
  ShieldCheck,
  AlertTriangle,
  XCircle,
} from "lucide-react"

import { useApiQuery, apiRequest } from "@/lib/useApiQuery"
import { timeAgo } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/PageHeader"
import { MetricCard } from "@/components/shared/MetricCard"
import { SearchInput } from "@/components/shared/SearchInput"
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable"
import { HealthScore } from "@/components/shared/HealthScore"
import { AuthStatusBadge } from "@/components/shared/AuthStatusBadge"
import { DomainAvatar } from "@/components/shared/DomainAvatar"
import { ActionMenu } from "@/components/shared/ActionMenu"
import { EmptyState } from "@/components/shared/EmptyState"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog"
import AddDomainWizard from "@/components/dashboard/AddDomainWizard"

interface Domain {
  id: string
  domain: string
  detectedEsp: string | null
  healthScore: number
  spfStatus: string
  dkimStatus: string
  dmarcStatus: string
  unsubStatus: string
  lastCheckedAt: string | null
  createdAt: string
}

const DATE_FMT: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
}

export default function DomainsPage() {
  const { getToken } = useAuth()
  const { data, loading, error, refetch } =
    useApiQuery<Domain[]>("/domains?limit=100")

  const [search, setSearch] = useState("")
  const [scanning, setScanning] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showWizard, setShowWizard] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Domain | null>(null)

  const domains = data || []
  const filtered = domains.filter(
    (d) =>
      d.domain.toLowerCase().includes(search.toLowerCase()) ||
      (d.detectedEsp || "").toLowerCase().includes(search.toLowerCase())
  )

  // Canonical thresholds (shared with HealthScore): ≥80 healthy, ≥60 warning, <60 critical.
  const healthy = domains.filter((d) => d.healthScore >= 80).length
  const warning = domains.filter(
    (d) => d.healthScore >= 60 && d.healthScore < 80
  ).length
  const critical = domains.filter((d) => d.healthScore < 60).length

  async function handleScan(id: string, name: string) {
    setScanning(id)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token found")
      await apiRequest(`/domains/${id}/scan`, "POST", token)
      toast.success(`Scanning ${name}…`, {
        description: "Results refresh in a few seconds.",
      })
      // Refresh after 3s to show the updated score.
      setTimeout(() => {
        refetch()
        setScanning(null)
      }, 3000)
    } catch (err) {
      toast.error("Failed to start scan", {
        description: err instanceof Error ? err.message : undefined,
      })
      setScanning(null)
    }
  }

  async function handleDelete(domain: Domain) {
    setDeleting(domain.id)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token found")
      await apiRequest(`/domains/${domain.id}`, "DELETE", token)
      toast.success(`${domain.domain} removed from monitoring`)
      refetch()
    } catch (err) {
      toast.error("Failed to remove domain", {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setDeleting(null)
    }
  }

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
              {d.detectedEsp || "Detecting ESP…"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "health",
      header: "Health",
      className: "w-40",
      cell: (d) => <HealthScore score={d.healthScore} size="sm" />,
    },
    { key: "spf", header: "SPF", cell: (d) => <AuthStatusBadge status={d.spfStatus} /> },
    { key: "dkim", header: "DKIM", cell: (d) => <AuthStatusBadge status={d.dkimStatus} /> },
    { key: "dmarc", header: "DMARC", cell: (d) => <AuthStatusBadge status={d.dmarcStatus} /> },
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
      key: "added",
      header: "Added",
      cell: (d) => (
        <span className="font-mono text-xs text-muted-foreground">
          {new Date(d.createdAt).toLocaleDateString("en-US", DATE_FMT)}
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
    <div className="space-y-6">
      {showWizard && (
        <AddDomainWizard
          onClose={() => setShowWizard(false)}
          onDomainAdded={() => {
            refetch()
            setShowWizard(false)
          }}
        />
      )}

      <PageHeader
        title="Domains"
        description={
          loading
            ? "Loading…"
            : `${domains.length} domain${domains.length !== 1 ? "s" : ""} being monitored`
        }
        action={
          <Button onClick={() => setShowWizard(true)}>
            <Plus strokeWidth={2.5} />
            Add Domain
          </Button>
        }
      />

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          variant="success"
          label="Healthy"
          value={loading ? "—" : healthy}
          icon={ShieldCheck}
          hint="Score ≥ 80"
        />
        <MetricCard
          variant="warning"
          label="Warning"
          value={loading ? "—" : warning}
          icon={AlertTriangle}
          hint="Score 60–79"
        />
        <MetricCard
          variant="danger"
          label="Critical"
          value={loading ? "—" : critical}
          icon={XCircle}
          hint="Score < 60"
        />
      </div>

      {/* Table */}
      <Card className="gap-0 overflow-hidden p-0">
        <div className="flex items-center gap-3 border-b border-border p-4 sm:px-5">
          <div className="w-full max-w-xs">
            <SearchInput
              value={search}
              onValueChange={setSearch}
              label="Search domains or ESP"
              placeholder="Search domains or ESP…"
            />
          </div>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={refetch}
            aria-label="Refresh domains"
          >
            <RefreshCw className={loading ? "animate-spin" : ""} />
          </Button>
        </div>

        <div className="p-4 sm:p-5">
          {loading ? (
            <LoadingSkeleton variant="table" count={5} />
          ) : error ? (
            <EmptyState
              icon={Globe}
              title="Failed to load domains"
              description={error}
              action={
                <Button variant="outline" size="sm" onClick={refetch}>
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
                <Button onClick={() => setShowWizard(true)}>
                  <Plus strokeWidth={2.5} />
                  Add your first domain
                </Button>
              }
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={SearchIcon}
              size="sm"
              title="No results"
              description="Try a different search term."
            />
          ) : (
            <DataTable columns={columns} data={filtered} getRowKey={(d) => d.id} />
          )}
        </div>
      </Card>

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
    </div>
  )
}
