"use client"

import { useState } from "react"
import Link from "next/link"
import { useApi } from "@/lib/api"
import { refreshAllQueries } from "@/lib/useApiQuery"
import {
  CheckCircle,
  RefreshCw,
  ArrowRight,
  FileText,
  KeyRound,
  ShieldCheck,
  Sparkles,
  Bell,
  Mail,
} from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { StatusBadge, statusFromString } from "@/components/shared/StatusBadge"
import { cn } from "@/lib/utils"

interface Props {
  onClose: () => void
  onDomainAdded: (domain: Domain) => void
}

interface DKIMRecord {
  selector: string
  keyBits: number
  valid?: boolean
}

interface DNSResult {
  spf?: { lookupCount?: number; result?: string; record?: string }
  dkim?: DKIMRecord[]
  dmarc?: { policy?: string; result?: string; record?: string }
  softFailures?: string[]
  overallScore?: number
}

interface Domain {
  id: string
  domain: string
  createdAt?: string
  [key: string]: unknown
}

const STEP_TITLES: Record<number, string> = {
  1: "Add New Domain",
  2: "Running Compliance Scan",
  3: "Compliance Report",
  4: "All Set!",
}

/** Score ring — same thresholds as HealthScore (≥80 / ≥60 / <60). */
function ScoreRing({ score }: { score: number }) {
  const tone = score >= 80 ? "success" : score >= 60 ? "warning" : "danger"
  const circumference = 2 * Math.PI * 28
  const progress = (score / 100) * circumference
  const toneText =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : "text-danger"

  return (
    <div className="relative size-20 shrink-0">
      <svg
        width="80"
        height="80"
        className="-rotate-90"
        role="img"
        aria-label={`Health score ${score} out of 100`}
      >
        <circle
          cx="40"
          cy="40"
          r="28"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-muted"
        />
        <circle
          cx="40"
          cy="40"
          r="28"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
          className={cn("transition-all duration-700", toneText)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-mono text-xl font-bold", toneText)}>
          {score}
        </span>
        <span className="text-[9px] font-semibold text-muted-foreground">
          /100
        </span>
      </div>
    </div>
  )
}

/** Progress rail of step dots. */
function StepDots({ step }: { step: number }) {
  return (
    <div className="flex gap-1.5" aria-hidden="true">
      {[1, 2, 3, 4].map((s) => (
        <div
          key={s}
          className={cn(
            "h-1 rounded-full transition-all duration-300",
            s <= step ? "w-7 bg-primary" : "w-4 bg-muted"
          )}
        />
      ))}
    </div>
  )
}

export default function AddDomainWizard({ onClose, onDomainAdded }: Props) {
  const api = useApi()

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [domain, setDomain] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [addedDomain, setAddedDomain] = useState<Domain | null>(null)
  const [dnsResult, setDnsResult] = useState<DNSResult | null>(null)
  const [aiDiagnosis, setAiDiagnosis] = useState("")
  const [scanComplete, setScanComplete] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [progress, setProgress] = useState({
    spfDone: false,
    dkimDone: false,
    dmarcDone: false,
    aiDone: false,
  })

  // Clean the domain input
  function cleanDomain(input: string) {
    return input
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
      .replace(/\s/g, "")
  }

  // Step 1 → 2: Add domain then stream analysis
  async function handleAddDomain() {
    const cleaned = cleanDomain(domain)
    if (!cleaned || !cleaned.includes(".")) {
      setError("Please enter a valid domain e.g. acme.com")
      return
    }

    setError("")
    setLoading(true)

    try {
      const addData = await api.post<{ data: Domain }>("/domains", { domain: cleaned })
      refreshAllQueries()
      setAddedDomain(addData.data)
      setStep(2)
      setLoading(false)

      // 2. Start streaming DNS analysis
      startAnalysis(cleaned)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err ?? "")
      setError(msg || "Failed to add domain. Please try again.")
      setLoading(false)
    }
  }

  // Keep recorded DNS results separate from generated explanation and stream failures.
  async function startAnalysis(domainName: string) {
    let finished = false
    function finish(message?: string) {
      finished = true
      if (message) setAnalysisError(message)
      setScanComplete(true)
      setStep(3)
    }
    try {
      await api.streamAnalysis(
        domainName,
        (result) => {
          const parsed: DNSResult = JSON.parse(result)
          setDnsResult(parsed)
          setProgress((p) => ({ ...p, spfDone: true, dkimDone: true, dmarcDone: true }))
        },
        (token) => setAiDiagnosis((text) => text + token),
        () => { setProgress((p) => ({ ...p, aiDone: true })); finish() },
        (message) => finish(message),
      )
      if (!finished) finish("Analysis ended before completion. Review the saved domain and run a new scan.")
    } catch (err) {
      finish(err instanceof Error ? err.message : "Analysis is unavailable. Your domain has been saved.")
    }
  }

  const score = dnsResult?.overallScore ?? 0
  const scoreText =
    score >= 80
      ? "text-success"
      : score >= 60
        ? "text-warning"
        : "text-danger"

  function handleOpenChange(open: boolean) {
    if (!open) onClose()
  }

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] max-w-xl flex-col gap-0 overflow-hidden p-0"
        showCloseButton
      >
        {/* Header */}
        <DialogHeader className="gap-2 border-b border-border p-5 text-left">
          <DialogTitle className="text-base">{STEP_TITLES[step]}</DialogTitle>
          <StepDots step={step} />
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* ── STEP 1 ── */}
          {step === 1 && (
            <div className="flex flex-col gap-5">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Enter your sending domain and we&apos;ll run a full SPF, DKIM,
                and DMARC compliance check instantly.
              </p>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="wizard-domain"
                  className="text-sm font-medium text-foreground"
                >
                  Domain Name
                </label>
                <Input
                  id="wizard-domain"
                  type="text"
                  value={domain}
                  onChange={(e) => {
                    setDomain(e.target.value)
                    setError("")
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleAddDomain()}
                  placeholder="e.g. acme.com"
                  autoFocus
                  aria-invalid={!!error}
                  aria-describedby={error ? "wizard-domain-error" : undefined}
                  className="h-11 text-base"
                />
                {error && (
                  <p
                    id="wizard-domain-error"
                    className="text-xs text-danger"
                    role="alert"
                  >
                    {error}
                  </p>
                )}
              </div>

              {/* What we check */}
              <Card size="sm" className="gap-0 bg-muted/40 p-4">
                <p className="mb-3 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                  What we check
                </p>
                <ul className="flex flex-col gap-2.5">
                  {[
                    {
                      icon: FileText,
                      label: "SPF Record",
                      desc: "Validates lookup count and alignment",
                    },
                    {
                      icon: KeyRound,
                      label: "DKIM Selectors",
                      desc: "Checks 16 common selectors automatically",
                    },
                    {
                      icon: ShieldCheck,
                      label: "DMARC Policy",
                      desc: "Validates policy and reporting setup",
                    },
                    {
                      icon: Sparkles,
                      label: "AI Diagnosis",
                      desc: "Plain-English explanation with fix steps",
                    },
                  ].map((item) => (
                    <li key={item.label} className="flex items-center gap-3">
                      <item.icon className="size-4 shrink-0 text-muted-foreground" />
                      <div className="text-sm">
                        <span className="font-medium text-foreground">
                          {item.label}
                        </span>
                        <span className="text-muted-foreground">
                          {" "}
                          — {item.desc}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          )}

          {/* ── STEP 2 — Scanning ── */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              {/* Domain badge */}
              <div className="flex items-center gap-2.5 rounded-lg border border-info/30 bg-info-subtle px-4 py-3">
                <span
                  className="size-2 animate-pulse rounded-full bg-info"
                  aria-hidden="true"
                />
                <span className="font-mono text-sm font-semibold text-foreground">
                  {cleanDomain(domain)}
                </span>
                <span className="text-xs text-foreground/80">
                  — scanning in progress
                </span>
              </div>

              {/* Check rows */}
              <Card size="sm" className="gap-0 p-4">
                <ul>
                  {[
                    {
                      done: progress.spfDone,
                      label: "SPF Record",
                      status: dnsResult?.spf?.result,
                      detail: `${dnsResult?.spf?.lookupCount || 0}/10 lookups`,
                    },
                    {
                      done: progress.dkimDone,
                      label: "DKIM",
                      status: dnsResult?.dkim?.some((d: DKIMRecord) => d.valid)
                        ? "pass"
                        : "fail",
                      detail: `${dnsResult?.dkim?.length || 0} selector(s) found`,
                    },
                    {
                      done: progress.dmarcDone,
                      label: "DMARC Policy",
                      status: dnsResult?.dmarc?.result,
                      detail: `p=${dnsResult?.dmarc?.policy || "?"}`,
                    },
                    {
                      done: progress.aiDone,
                      label: "AI Analysis",
                      status: "info",
                      detail: "Generating fix instructions",
                    },
                  ].map((row, i) => (
                    <li
                      key={row.label}
                      className={cn(
                        "flex items-center gap-3 py-3",
                        i < 3 && "border-b border-border"
                      )}
                    >
                      {row.done ? (
                        <StatusBadge
                          status={statusFromString(row.status || "unknown")}
                          showIcon
                          label=""
                          className="size-5 justify-center rounded-full p-0 [&>svg]:size-4"
                          aria-label={`${row.label} ${row.status || "done"}`}
                        />
                      ) : (
                        <RefreshCw
                          className="size-4 shrink-0 animate-spin text-primary"
                          aria-hidden="true"
                        />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {row.label}
                        </p>
                        {row.done && row.detail && (
                          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                            {row.detail}
                          </p>
                        )}
                      </div>
                      {row.done ? (
                        <StatusBadge
                          status={statusFromString(row.status || "unknown")}
                          showIcon={false}
                          label={(row.status || "done").toUpperCase()}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Checking…
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>

              {/* Soft failures */}
              {(dnsResult?.softFailures?.length ?? 0) > 0 && (
                <div className="rounded-lg border border-warning/30 bg-warning-subtle p-3.5">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-warning-foreground">
                    Soft failures detected
                  </p>
                  <ul className="flex flex-col gap-1">
                    {dnsResult?.softFailures?.map((w: string, i: number) => (
                      <li
                        key={i}
                        className="text-xs leading-relaxed text-warning-foreground/90"
                      >
                        · {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3 — Report ── */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              {/* Score summary */}
              {analysisError && <p role="alert" className="rounded-md border border-danger/30 bg-danger-subtle p-3 text-sm text-danger">{analysisError}</p>}
              {dnsResult ? <Card size="sm" className="flex-row items-center gap-5 bg-muted/40 p-4">
                <ScoreRing score={score} />
                <div className="flex-1">
                  <p className={cn("text-lg font-bold", scoreText)}>
                    {score >= 80
                      ? "DNS health score ≥ 80"
                      : score >= 60
                        ? "Needs attention"
                        : "Critical issues found"}
                  </p>
                  <p className="font-mono text-sm text-muted-foreground">
                    {cleanDomain(domain)}
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {[
                      { label: "SPF", status: dnsResult?.spf?.result },
                      {
                        label: "DKIM",
                        status: dnsResult?.dkim?.some(
                          (d: DKIMRecord) => d.valid
                        )
                          ? "pass"
                          : "fail",
                      },
                      { label: "DMARC", status: dnsResult?.dmarc?.result },
                    ].map((item) => (
                      <StatusBadge
                        key={item.label}
                        status={statusFromString(item.status || "unknown")}
                        label={item.label}
                      />
                    ))}
                  </div>
                </div>
              </Card>

              : <Card className="p-4"><p className="text-sm text-muted-foreground">No DNS results available from this analysis. Your domain is saved. Open Domains to check the background scan.</p></Card>}

              {/* DNS Details */}
              {dnsResult && (
                <Card size="sm" className="gap-0 p-4">
                  <p className="mb-3 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                    Detailed Results
                  </p>
                  <ul>
                    {[
                      {
                        label: `SPF — ${dnsResult.spf?.lookupCount || 0}/10 DNS lookups`,
                        status: dnsResult.spf?.result,
                        detail: dnsResult.spf?.record,
                      },
                      {
                        label: `DKIM — ${dnsResult.dkim?.length || 0} selector(s)`,
                        status: dnsResult.dkim?.some(
                          (d: DKIMRecord) => d.valid
                        )
                          ? "pass"
                          : "fail",
                        detail: dnsResult.dkim
                          ?.map(
                            (d: DKIMRecord) =>
                              `${d.selector}(${d.keyBits}bit)`
                          )
                          .join(", "),
                      },
                      {
                        label: `DMARC — p=${dnsResult.dmarc?.policy || "none"}`,
                        status: dnsResult.dmarc?.result,
                        detail: dnsResult.dmarc?.record,
                      },
                    ].map((row, i) => (
                      <li
                        key={i}
                        className={cn(
                          "flex items-start gap-2.5 py-2.5",
                          i < 2 && "border-b border-border"
                        )}
                      >
                        <StatusBadge
                          status={statusFromString(row.status || "unknown")}
                          showIcon
                          label=""
                          className="mt-0.5 size-5 justify-center rounded-full p-0 [&>svg]:size-4"
                          aria-label={row.status || "unknown"}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">
                            {row.label}
                          </p>
                          {row.detail && (
                            <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                              {row.detail}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* AI Analysis */}
              {aiDiagnosis && (
                <div className="rounded-xl border border-info/30 bg-info-subtle p-4">
                  <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-foreground uppercase">
                    <Sparkles className="size-3.5" aria-hidden="true" />
                    AI generated explanation
                  </p>
                  <p className="mb-3 text-xs text-muted-foreground">Generated suggestions. Verify against the DNS findings before applying changes.</p>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                    {aiDiagnosis}
                  </div>
                </div>
              )}

              <Card size="sm" className="gap-2 p-4">
                <p className="text-sm font-semibold">Configure one-click unsubscribe</p>
                <p className="text-sm text-muted-foreground">Enable the endpoint in Compliance, then generate signed headers for each recipient from Unsubscribe.</p>
                <Link href="/dashboard/unsubscribe" onClick={onClose} className="text-sm font-medium text-primary underline">Open unsubscribe setup</Link>
              </Card>
            </div>
          )}

          {/* ── STEP 4 — Done ── */}
          {step === 4 && (
            <div className="flex flex-col items-center gap-5 py-5 text-center">
              <CheckCircle className="size-10 text-primary" aria-hidden="true" />
              <div>
                <h3 className="mb-2 text-xl font-bold text-foreground">
                  {cleanDomain(domain)} is now being monitored
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Your domain is saved. Scheduled checks follow your subscription.
                  Review completed scans in Domains and configure notifications in Settings.
                </p>
              </div>

              <Card
                size="sm"
                className="w-full gap-0 bg-muted/40 p-4 text-left"
              >
                <p className="mb-3 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                  Recommended next steps
                </p>
                <ul className="flex flex-col gap-3">
                  {[
                    {
                      icon: Mail,
                      title: "Add unsubscribe headers",
                      desc: "Generate signed headers for each recipient in Unsubscribe",
                    },
                    {
                      icon: Bell,
                      title: "Set up Slack alerts",
                      desc: "Get notified in Slack when something breaks",
                    },
                  ].map((item) => (
                    <li key={item.title} className="flex items-start gap-3">
                      <item.icon
                        className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {item.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {item.desc}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="flex-row items-center justify-between border-t border-border bg-muted/30 p-4 sm:justify-between">
          <Button
            variant="outline"
            onClick={
              step === 1
                ? onClose
                : () => setStep((s) => Math.max(1, s - 1) as 1 | 2 | 3 | 4)
            }
          >
            {step === 1 ? "Cancel" : "← Back"}
          </Button>

          {step === 1 && (
            <Button
              onClick={handleAddDomain}
              disabled={loading || !domain.trim()}
            >
              {loading ? (
                <>
                  <RefreshCw className="animate-spin" />
                  Adding…
                </>
              ) : (
                <>
                  Start Scan
                  <ArrowRight />
                </>
              )}
            </Button>
          )}

          {step === 2 && (
            <Button
              onClick={() => scanComplete && setStep(3)}
              disabled={!scanComplete}
            >
              {scanComplete ? (
                <>
                  View Report
                  <ArrowRight />
                </>
              ) : (
                <>
                  <RefreshCw className="animate-spin" />
                  Scanning…
                </>
              )}
            </Button>
          )}

          {step === 3 && (
            <Button onClick={() => setStep(4)}>
              Continue
              <ArrowRight />
            </Button>
          )}

          {step === 4 && (
            <Button
              onClick={() => {
                if (addedDomain) onDomainAdded(addedDomain)
                onClose()
              }}
            >
              <CheckCircle />
              Go to Dashboard
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
