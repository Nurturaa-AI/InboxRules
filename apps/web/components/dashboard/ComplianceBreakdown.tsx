"use client"

import { FileText, KeyRound, ShieldCheck, MailCheck } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn, scoreToStatus } from "@/lib/utils"

// NOTE: Placeholder — this widget runs on hardcoded sample data.
// Phase 2: wire to a real compliance-summary endpoint or remove.
const ITEMS: {
  icon: LucideIcon
  name: string
  desc: string
  pass: number
  total: number
}[] = [
  {
    icon: FileText,
    name: "SPF Records",
    desc: "Sender Policy Framework",
    pass: 9,
    total: 12,
  },
  {
    icon: KeyRound,
    name: "DKIM Signatures",
    desc: "DomainKeys Identified Mail",
    pass: 10,
    total: 12,
  },
  {
    icon: ShieldCheck,
    name: "DMARC Policies",
    desc: "Domain-based Auth Reporting",
    pass: 7,
    total: 12,
  },
  {
    icon: MailCheck,
    name: "One-Click Unsub",
    desc: "RFC 8058 compliance",
    pass: 5,
    total: 12,
  },
]

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
  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Compliance Breakdown
          </h2>
          <Badge variant="secondary" className="text-[10px]">
            Sample data
          </Badge>
        </div>
      </div>

      {ITEMS.map((item) => {
        const pct = Math.round((item.pass / item.total) * 100)
        const status = scoreToStatus(pct)
        const Icon = item.icon
        return (
          <div
            key={item.name}
            className="flex items-center gap-3 border-b border-border px-5 py-3.5 last:border-b-0"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
              <Icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">
                  {item.name}
                </p>
                <span
                  className={cn(
                    "font-mono text-xs font-semibold tabular-nums",
                    STATUS_TEXT[status]
                  )}
                >
                  {item.pass}/{item.total}
                </span>
              </div>
              <p className="mt-0.5 mb-1.5 text-xs text-muted-foreground">
                {item.desc}
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
      })}
    </Card>
  )
}
