"use client"

import {
  FileText,
  KeyRound,
  ShieldCheck,
  Image as ImageIcon,
  Lock,
  FileCheck,
  ShieldQuestion,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { useApiQuery } from "@/lib/useApiQuery"
import { Card } from "@/components/ui/card"
import { cn, scoreToStatus } from "@/lib/utils"

interface Signal {
  key: string
  label: string
  pass: number
  total: number
}

interface ComplianceSummary {
  total: number
  scanned: number
  signals: Signal[]
}

// Map each signal key → icon + short description. Keys match the backend
// (/analytics/compliance-summary): spf, dkim, dmarc, bimi, mtaSts, tlsRpt.
const SIGNAL_META: Record<string, { icon: LucideIcon; desc: string }> = {
  spf: { icon: FileText, desc: "Sender Policy Framework" },
  dkim: { icon: KeyRound, desc: "DomainKeys Identified Mail" },
  dmarc: { icon: ShieldCheck, desc: "Domain-based Auth Reporting" },
  bimi: { icon: ImageIcon, desc: "Brand Indicators for Message ID" },
  mtaSts: { icon: Lock, desc: "SMTP MTA Strict Transport Security" },
  tlsRpt: { icon: FileCheck, desc: "SMTP TLS Reporting" },
}

const STATUS_TEXT: Record<ReturnType<typeof scoreToStatus>, string> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
}

const STATUS_BAR: Record<ReturnType<typeof scoreToStatus>, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
}

export default function ComplianceBreakdown() {
  const { data, loading } = useApiQuery<ComplianceSummary>(
    "/analytics/compliance-summary"
  )

  const signals = data?.signals ?? []

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Compliance Breakdown
        </h2>
        {data && data.total > 0 && (
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {data.scanned}/{data.total} scanned
          </span>
        )}
      </div>

      {loading ? (
        <div className="divide-y divide-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3.5">
              <div className="size-9 shrink-0 animate-pulse rounded-lg bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                <div className="h-1 w-full animate-pulse rounded-full bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : !data || data.total === 0 ? (
        <div className="flex flex-col items-center gap-2 px-5 py-8 text-center">
          <ShieldQuestion className="size-7 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">
            No compliance data yet
          </p>
          <p className="text-xs text-muted-foreground">
            Add and scan a domain to see compliance.
          </p>
        </div>
      ) : (
        signals.map((signal) => {
          const meta = SIGNAL_META[signal.key]
          const Icon = meta?.icon ?? ShieldCheck
          const pct =
            signal.total > 0
              ? Math.round((signal.pass / signal.total) * 100)
              : 0
          const status = scoreToStatus(pct)
          return (
            <div
              key={signal.key}
              className="flex items-center gap-3 border-b border-border px-5 py-3.5 last:border-b-0"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                <Icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">
                    {signal.label}
                  </p>
                  <span
                    className={cn(
                      "font-mono text-xs font-semibold tabular-nums",
                      STATUS_TEXT[status]
                    )}
                  >
                    {signal.pass}/{signal.total}
                  </span>
                </div>
                <p className="mt-0.5 mb-1.5 text-xs text-muted-foreground">
                  {meta?.desc ?? signal.key}
                </p>
                <div className="h-1 overflow-hidden rounded-full bg-border">
                  <div
                    className={cn("h-full rounded-full", STATUS_BAR[status])}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          )
        })
      )}
    </Card>
  )
}
