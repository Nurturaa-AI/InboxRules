// Main table showing all monitored domains with their
// compliance status, health score, and actions.

"use client";

import { useState } from "react";
import { RefreshCw, Trash2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
//import { Badge } from "@/components/ui/badge";

// Mock domain data — replaced with real API data later
const DOMAINS = [
  {
    id: "1",
    domain: "acme.com",
    esp: "sendgrid",
    score: 95,
    spf: "pass",
    dkim: "pass",
    dmarc: "pass",
    lastChecked: "2 min ago",
  },
  {
    id: "2",
    domain: "techcorp.io",
    esp: "mailgun",
    score: 78,
    spf: "pass",
    dkim: "pass",
    dmarc: "warn",
    lastChecked: "14 min ago",
  },
  {
    id: "3",
    domain: "startup.co",
    esp: "google_workspace",
    score: 42,
    spf: "fail",
    dkim: "pass",
    dmarc: "none",
    lastChecked: "1 hr ago",
  },
  {
    id: "4",
    domain: "newsletter.dev",
    esp: "amazon_ses",
    score: 88,
    spf: "pass",
    dkim: "pass",
    dmarc: "pass",
    lastChecked: "3 hr ago",
  },
  {
    id: "5",
    domain: "agency.xyz",
    esp: "postmark",
    score: 61,
    spf: "pass",
    dkim: "warn",
    dmarc: "warn",
    lastChecked: "6 hr ago",
  },
];

// Map ESP slugs to readable names
const ESP_NAMES: Record<string, string> = {
  sendgrid: "SendGrid",
  mailgun: "Mailgun",
  google_workspace: "Google Workspace",
  amazon_ses: "Amazon SES",
  postmark: "Postmark",
  microsoft_365: "Microsoft 365",
  brevo: "Brevo",
};

// Map status string to badge variant styles
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pass: "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800",
    fail: "bg-red-50   dark:bg-red-950   text-red-700   dark:text-red-400   border-red-200   dark:border-red-800",
    warn: "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    none: "bg-muted text-muted-foreground border-border",
  };

  const labels: Record<string, string> = {
    pass: "Pass",
    fail: "Fail",
    warn: "Warn",
    none: "None",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full",
        "text-[11.5px] font-semibold border",
        styles[status] || styles.none,
      )}
    >
      {/* Colored dot */}
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {labels[status] || status}
    </span>
  );
}

// Score bar component — shows health score visually
function ScoreBar({ score }: { score: number }) {
  // Color changes based on score range
  const color =
    score >= 80 ? "bg-green-500" : score >= 60 ? "bg-amber-500" : "bg-red-500";

  const textColor =
    score >= 80
      ? "text-green-600 dark:text-green-400"
      : score >= 60
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";

  return (
    <div className="flex items-center gap-2.5">
      {/* Numeric score */}
      <span
        className={cn(
          "font-bold font-mono text-[13.5px] w-8 shrink-0",
          textColor,
        )}
      >
        {score}
      </span>

      {/* Progress bar track */}
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden min-w-12.5">
        {/* Progress bar fill */}
        <div
          className={cn("h-full rounded-full", color)}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

type FilterType = "all" | "healthy" | "warning" | "critical";

export default function DomainTable() {
  const [filter, setFilter] = useState<FilterType>("all");
  const [scanningId, setScanningId] = useState<string | null>(null);

  // Filter domains by health score
  const filtered = DOMAINS.filter((d) => {
    if (filter === "healthy") return d.score >= 80;
    if (filter === "warning") return d.score >= 50 && d.score < 80;
    if (filter === "critical") return d.score < 50;
    return true;
  });

  // Simulate a scan — will call real API later
  function handleScan(id: string) {
    setScanningId(id);
    setTimeout(() => setScanningId(null), 2000);
  }

  // Get first two letters of domain for the favicon placeholder
  function getDomainInitials(domain: string) {
    return domain.substring(0, 2).toUpperCase();
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Card header */}
      <div
        className="flex items-center justify-between px-5 py-4
                      border-b border-border"
      >
        <div>
          <h2 className="text-[14px] font-bold tracking-tight">
            Monitored Domains
          </h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {DOMAINS.length} domains · last updated just now
          </p>
        </div>
        <span
          className="text-[12.5px] text-blue-600 dark:text-blue-400
                         font-semibold cursor-pointer hover:opacity-70
                         transition-opacity"
        >
          View all →
        </span>
      </div>

      {/* Filter tabs */}
      <div
        className="flex items-center gap-2 px-5 py-3
                      border-b border-border bg-muted/30"
      >
        {(["all", "healthy", "warning", "critical"] as FilterType[]).map(
          (f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-full text-[12.5px] font-semibold",
                "transition-all duration-150 capitalize",
                filter === f
                  ? "bg-blue-600 text-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-card border border-transparent hover:border-border",
              )}
            >
              {f}
            </button>
          ),
        )}

        {/* Domain count on the right */}
        <span className="ml-auto text-[12px] text-muted-foreground font-mono">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/30 border-b border-border">
              {[
                "Domain",
                "Score",
                "SPF",
                "DKIM",
                "DMARC",
                "Last Check",
                "",
              ].map((h) => (
                <th
                  key={h}
                  className="text-left px-5 py-2.5 text-[11px] font-bold
                             uppercase tracking-wider text-muted-foreground
                             whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filtered.map((domain) => (
              <tr
                key={domain.id}
                className="border-b border-border last:border-none
                           hover:bg-muted/30 transition-colors group"
              >
                {/* Domain name with ESP */}
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    {/* Domain favicon placeholder */}
                    <div
                      className="w-7 h-7 rounded-md bg-muted border
                                    border-border flex items-center justify-center
                                    text-[11px] font-bold text-muted-foreground
                                    font-mono shrink-0"
                    >
                      {getDomainInitials(domain.domain)}
                    </div>
                    <div>
                      <p className="font-semibold text-[13.5px] text-foreground">
                        {domain.domain}
                      </p>
                      <p className="text-[11.5px] text-muted-foreground font-mono">
                        {ESP_NAMES[domain.esp] || domain.esp}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Health score bar */}
                <td className="px-5 py-3.5 min-w-32.5">
                  <ScoreBar score={domain.score} />
                </td>

                {/* SPF status */}
                <td className="px-5 py-3.5">
                  <StatusBadge status={domain.spf} />
                </td>

                {/* DKIM status */}
                <td className="px-5 py-3.5">
                  <StatusBadge status={domain.dkim} />
                </td>

                {/* DMARC status */}
                <td className="px-5 py-3.5">
                  <StatusBadge status={domain.dmarc} />
                </td>

                {/* Last checked time */}
                <td className="px-5 py-3.5">
                  <span className="text-[12.5px] text-muted-foreground font-mono">
                    {domain.lastChecked}
                  </span>
                </td>

                {/* Row actions — visible on hover */}
                <td className="px-5 py-3.5">
                  <div
                    className="flex items-center gap-1.5
                                  opacity-0 group-hover:opacity-100
                                  transition-opacity"
                  >
                    {/* Scan button */}
                    <button
                      onClick={() => handleScan(domain.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5
                                 rounded-md text-[12px] font-semibold
                                 bg-blue-50 dark:bg-blue-950
                                 text-blue-600 dark:text-blue-400
                                 hover:bg-blue-600 hover:text-white
                                 transition-all"
                    >
                      <RefreshCw
                        className={cn(
                          "w-3 h-3",
                          scanningId === domain.id && "animate-spin",
                        )}
                      />
                      {scanningId === domain.id ? "Scanning..." : "Scan"}
                    </button>

                    {/* View details */}
                    <button
                      className="w-7 h-7 rounded-md flex items-center justify-center
                                 border border-border bg-card
                                 text-muted-foreground hover:text-foreground
                                 hover:bg-muted transition-all"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </button>

                    {/* Delete */}
                    <button
                      className="w-7 h-7 rounded-md flex items-center justify-center
                                 border border-border bg-card
                                 text-muted-foreground hover:text-red-500
                                 hover:border-red-200 hover:bg-red-50
                                 dark:hover:bg-red-950 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Table footer with pagination */}
      <div
        className="flex items-center justify-between px-5 py-3
                      border-t border-border bg-muted/20"
      >
        <span className="text-[12.5px] text-muted-foreground">
          Showing {filtered.length} of {DOMAINS.length} domains
        </span>

        {/* Simple pagination */}
        <div className="flex gap-1">
          {[1, 2, 3].map((p) => (
            <button
              key={p}
              className={cn(
                "w-7 h-7 rounded-md text-[12.5px] font-semibold",
                "border transition-all",
                p === 1
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-card text-muted-foreground border-border hover:bg-muted",
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
