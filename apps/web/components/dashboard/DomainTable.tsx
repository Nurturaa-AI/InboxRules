"use client";
import { useState } from "react";
import { RefreshCw, ExternalLink, Trash2, Plus } from "lucide-react";
import { domainInitials, scoreColor } from "@/lib/utils";

const DOMAINS = [
  {
    id: "1",
    domain: "acme.com",
    esp: "SendGrid",
    score: 95,
    spf: "pass",
    dkim: "pass",
    dmarc: "pass",
    checked: "2 min ago",
  },
  {
    id: "2",
    domain: "techcorp.io",
    esp: "Mailgun",
    score: 78,
    spf: "pass",
    dkim: "pass",
    dmarc: "warn",
    checked: "14 min ago",
  },
  {
    id: "3",
    domain: "startup.co",
    esp: "Google Workspace",
    score: 42,
    spf: "fail",
    dkim: "pass",
    dmarc: "none",
    checked: "1 hr ago",
  },
  {
    id: "4",
    domain: "newsletter.dev",
    esp: "Amazon SES",
    score: 88,
    spf: "pass",
    dkim: "pass",
    dmarc: "pass",
    checked: "3 hr ago",
  },
  {
    id: "5",
    domain: "agency.xyz",
    esp: "Postmark",
    score: 61,
    spf: "pass",
    dkim: "warn",
    dmarc: "warn",
    checked: "6 hr ago",
  },
  {
    id: "6",
    domain: "hookdropi.qzz.io",
    esp: "Unknown",
    score: 0,
    spf: "none",
    dkim: "none",
    dmarc: "none",
    checked: "12 hr ago",
  },
];

type Filter = "all" | "healthy" | "warning" | "critical";

function ScoreBar({ score }: { score: number }) {
  const color = scoreColor(score);
  return (
    <div className="flex items-center gap-2.5">
      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          fontFamily: "var(--font-mono)",
          color,
          width: 26,
          flexShrink: 0,
        }}
      >
        {score}
      </span>
      <div
        style={{
          flex: 1,
          height: 5,
          background: "var(--border)",
          borderRadius: 999,
          overflow: "hidden",
          minWidth: 55,
        }}
      >
        <div
          style={{
            width: `${score}%`,
            height: "100%",
            background: color,
            borderRadius: 999,
          }}
        />
      </div>
    </div>
  );
}

function Pill({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    pass: { bg: "rgba(16,185,129,0.12)", color: "#10B981" },
    fail: { bg: "rgba(239,68,68,0.12)", color: "#EF4444" },
    warn: { bg: "rgba(245,158,11,0.12)", color: "#F59E0B" },
    none: { bg: "var(--surface-2)", color: "var(--text-3)" },
  };
  const labels: Record<string, string> = {
    pass: "Pass",
    fail: "Fail",
    warn: "Warn",
    none: "None",
  };
  const s = styles[status] ?? styles.none;
  return (
    <span
      className="inline-flex items-center gap-1.5"
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 11.5,
        fontWeight: 600,
        background: s.bg,
        color: s.color,
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: "currentColor",
          flexShrink: 0,
        }}
      />
      {labels[status] ?? status}
    </span>
  );
}

const FILTERS: Filter[] = ["all", "healthy", "warning", "critical"];

export default function DomainTable() {
  const [filter, setFilter] = useState<Filter>("all");
  const [scanning, setScanning] = useState<string | null>(null);

  const filtered = DOMAINS.filter((d) => {
    if (filter === "healthy") return d.score >= 80;
    if (filter === "warning") return d.score >= 50 && d.score < 80;
    if (filter === "critical") return d.score < 50;
    return true;
  });

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      <div
        className="flex items-center justify-between"
        style={{
          padding: "18px 22px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
            Monitored Domains
          </h2>
          <p style={{ fontSize: 12.5, color: "var(--text-3)", marginTop: 3 }}>
            {DOMAINS.length} domains · real-time monitoring
          </p>
        </div>
        <button
          className="flex items-center gap-1.5"
          style={{
            height: 34,
            padding: "0 13px",
            background: "linear-gradient(135deg, #2563EB, #7C3AED)",
            color: "white",
            border: "none",
            borderRadius: 9,
            fontSize: 12.5,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
          }}
        >
          <Plus size={13} strokeWidth={2.5} /> Add Domain
        </button>
      </div>

      <div
        className="flex items-center gap-2"
        style={{
          padding: "12px 22px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface-2)",
        }}
      >
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "5px 14px",
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              border: "none",
              fontFamily: "var(--font-sans)",
              textTransform: "capitalize",
              transition: "all 0.15s",
              background:
                filter === f
                  ? "linear-gradient(135deg, #2563EB, #7C3AED)"
                  : "var(--surface)",
              color: filter === f ? "white" : "var(--text-2)",
              boxShadow:
                filter === f ? "0 2px 8px rgba(37,99,235,0.3)" : "none",
              outline: filter !== f ? "1px solid var(--border)" : "none",
            }}
          >
            {f}
          </button>
        ))}
        <span
          style={{
            marginLeft: "auto",
            fontSize: 12,
            color: "var(--text-3)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr
              style={{
                borderBottom: "1px solid var(--border)",
                background: "var(--surface-2)",
              }}
            >
              {[
                "Domain",
                "Health Score",
                "SPF",
                "DKIM",
                "DMARC",
                "Last Checked",
                "Actions",
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    padding: "11px 22px",
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    color: "var(--text-3)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr
                key={d.id}
                style={{
                  borderBottom: "1px solid var(--border)",
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.background =
                    "var(--surface-2)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.background =
                    "transparent";
                }}
              >
                <td style={{ padding: "15px 22px" }}>
                  <div className="flex items-center gap-3">
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 9,
                        background: "var(--surface-2)",
                        border: "1px solid var(--border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "var(--text-3)",
                        fontFamily: "var(--font-mono)",
                        flexShrink: 0,
                      }}
                    >
                      {domainInitials(d.domain)}
                    </div>
                    <div>
                      <p
                        style={{
                          fontWeight: 600,
                          fontSize: 13.5,
                          color: "var(--text)",
                        }}
                      >
                        {d.domain}
                      </p>
                      <p
                        style={{
                          fontSize: 11.5,
                          color: "var(--text-3)",
                          fontFamily: "var(--font-mono)",
                          marginTop: 2,
                        }}
                      >
                        {d.esp}
                      </p>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "15px 22px", minWidth: 140 }}>
                  <ScoreBar score={d.score} />
                </td>
                <td style={{ padding: "15px 22px" }}>
                  <Pill status={d.spf} />
                </td>
                <td style={{ padding: "15px 22px" }}>
                  <Pill status={d.dkim} />
                </td>
                <td style={{ padding: "15px 22px" }}>
                  <Pill status={d.dmarc} />
                </td>
                <td style={{ padding: "15px 22px" }}>
                  <span
                    style={{
                      fontSize: 12.5,
                      color: "var(--text-3)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {d.checked}
                  </span>
                </td>
                <td style={{ padding: "15px 22px" }}>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setScanning(d.id);
                        setTimeout(() => setScanning(null), 2500);
                      }}
                      className="flex items-center gap-1.5"
                      style={{
                        padding: "5px 11px",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        border: "none",
                        fontFamily: "var(--font-sans)",
                        background: "rgba(37,99,235,0.1)",
                        color: "#2563EB",
                        transition: "all 0.15s",
                      }}
                    >
                      <RefreshCw
                        size={11}
                        strokeWidth={2.5}
                        className={scanning === d.id ? "spin" : ""}
                      />
                      {scanning === d.id ? "Scanning" : "Scan"}
                    </button>
                    <button
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 7,
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                        color: "var(--text-3)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <ExternalLink size={12} />
                    </button>
                    <button
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 7,
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                        color: "var(--text-3)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        className="flex items-center justify-between"
        style={{
          padding: "13px 22px",
          borderTop: "1px solid var(--border)",
          background: "var(--surface-2)",
        }}
      >
        <span style={{ fontSize: 12.5, color: "var(--text-3)" }}>
          Showing {filtered.length} of {DOMAINS.length} domains
        </span>
        <div className="flex items-center gap-1.5">
          <button
            style={{
              height: 30,
              padding: "0 12px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text-2)",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
            }}
          >
            ← Previous
          </button>
          {[1, 2, 3, 4].map((p) => (
            <button
              key={p}
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                border: "none",
                background:
                  p === 1
                    ? "linear-gradient(135deg, #2563EB, #7C3AED)"
                    : "var(--surface)",
                color: p === 1 ? "white" : "var(--text-2)",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                outline: p !== 1 ? "1px solid var(--border)" : "none",
              }}
            >
              {p}
            </button>
          ))}
          <button
            style={{
              height: 30,
              padding: "0 12px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text-2)",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
            }}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
