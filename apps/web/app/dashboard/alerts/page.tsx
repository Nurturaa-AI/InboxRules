"use client";

import { useState } from "react";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  ChevronRight,
} from "lucide-react";

const ALERTS = [
  {
    id: "1",
    type: "critical",
    status: "unresolved",
    title: "SPF Lookup Limit Exceeded",
    domain: "startup.co",
    summary:
      "Your SPF record now requires 12 DNS lookups — Gmail and Yahoo reject at 10. This likely happened when you added HubSpot 3 days ago.",
    fix: "Replace include:_spf.hubspot.com with ip4:205.201.128.0/20 to reduce lookups.",
    time: "5 min ago",
    detectedAt: "May 12, 2025 · 04:07",
  },
  {
    id: "2",
    type: "warning",
    status: "unresolved",
    title: "DMARC Policy is p=none",
    domain: "techcorp.io",
    summary:
      "Your DMARC record exists but is in monitoring mode only. Your domain is not protected against email spoofing.",
    fix: "Change p=none to p=quarantine in your _dmarc.techcorp.io TXT record once you have reviewed your DMARC reports.",
    time: "2 hr ago",
    detectedAt: "May 12, 2025 · 02:15",
  },
  {
    id: "3",
    type: "warning",
    status: "unresolved",
    title: "Weak 1024-bit DKIM Key",
    domain: "agency.xyz",
    summary:
      "DKIM selector 'google' uses a 1024-bit RSA key. The current recommendation is 2048-bit. Some providers are beginning to reject weak keys.",
    fix: "Generate a new 2048-bit DKIM key pair in Google Workspace Admin Console and update your DNS record.",
    time: "6 hr ago",
    detectedAt: "May 11, 2025 · 22:10",
  },
  {
    id: "4",
    type: "info",
    status: "resolved",
    title: "DKIM Selector Rotated",
    domain: "acme.com",
    summary:
      "DKIM selector changed from s1 to s2. This appears to be a scheduled rotation by SendGrid.",
    fix: "No action needed — rotation was automatic and both selectors are valid.",
    time: "1 day ago",
    detectedAt: "May 11, 2025 · 09:30",
  },
  {
    id: "5",
    type: "critical",
    status: "resolved",
    title: "DMARC Record Removed",
    domain: "newsletter.dev",
    summary:
      "Your DMARC record was deleted from DNS. The domain was unprotected for 4 hours before you restored it.",
    fix: "Record has been restored. Consider adding monitoring to your DNS provider to alert on deletions.",
    time: "2 days ago",
    detectedAt: "May 10, 2025 · 14:22",
  },
];

type FilterType = "all" | "unresolved" | "critical" | "warning" | "info";

const ICONS = {
  critical: <XCircle size={16} color="#EF4444" />,
  warning: <AlertTriangle size={16} color="#F59E0B" />,
  info: <Info size={16} color="#3B82F6" />,
};

const TYPE_STYLES: Record<string, { dot: string; bg: string; border: string }> =
  {
    critical: {
      dot: "#EF4444",
      bg: "rgba(239,68,68,0.06)",
      border: "rgba(239,68,68,0.2)",
    },
    warning: {
      dot: "#F59E0B",
      bg: "rgba(245,158,11,0.06)",
      border: "rgba(245,158,11,0.2)",
    },
    info: {
      dot: "#3B82F6",
      bg: "rgba(59,130,246,0.06)",
      border: "rgba(59,130,246,0.2)",
    },
  };

export default function AlertsPage() {
  const [filter, setFilter] = useState<FilterType>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [resolved, setResolved] = useState<string[]>(["4", "5"]);

  const filtered = ALERTS.filter((a) => {
    if (filter === "unresolved") return !resolved.includes(a.id);
    if (filter === "critical") return a.type === "critical";
    if (filter === "warning") return a.type === "warning";
    if (filter === "info") return a.type === "info";
    return true;
  });

  const unresolvedCount = ALERTS.filter((a) => !resolved.includes(a.id)).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "var(--text)",
                letterSpacing: "-0.4px",
              }}
            >
              Alerts
            </h1>
            {unresolvedCount > 0 && (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "2px 10px",
                  borderRadius: 999,
                  background: "rgba(239,68,68,0.1)",
                  color: "#EF4444",
                }}
              >
                {unresolvedCount} unresolved
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>
            DNS change events and compliance issues across your domains
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
        {(
          ["all", "unresolved", "critical", "warning", "info"] as FilterType[]
        ).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "6px 14px",
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
      </div>

      {/* Alert cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map((alert) => {
          const isResolved = resolved.includes(alert.id);
          const isExpanded = expanded === alert.id;
          const s = TYPE_STYLES[alert.type];

          return (
            <div
              key={alert.id}
              style={{
                background: isResolved ? "var(--surface)" : s.bg,
                border: `1px solid ${isResolved ? "var(--border)" : s.border}`,
                borderRadius: 14,
                overflow: "hidden",
                opacity: isResolved ? 0.7 : 1,
                transition: "all 0.2s",
              }}
            >
              {/* Alert header */}
              <div
                className="flex items-center gap-3"
                style={{ padding: "16px 20px", cursor: "pointer" }}
                onClick={() => setExpanded(isExpanded ? null : alert.id)}
              >
                {/* Severity icon */}
                <div style={{ flexShrink: 0 }}>
                  {isResolved ? (
                    <CheckCircle size={16} color="#10B981" />
                  ) : (
                    ICONS[alert.type as keyof typeof ICONS]
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-center gap-2">
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: isResolved ? "var(--text-2)" : "var(--text)",
                      }}
                    >
                      {alert.title}
                    </p>
                    {isResolved && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: "rgba(16,185,129,0.1)",
                          color: "#10B981",
                        }}
                      >
                        Resolved
                      </span>
                    )}
                  </div>
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--text-3)",
                      marginTop: 2,
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {alert.domain} · {alert.time}
                  </p>
                </div>

                {/* Resolve button */}
                {!isResolved && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setResolved((prev) => [...prev, alert.id]);
                    }}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 8,
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      color: "var(--text-2)",
                      fontFamily: "var(--font-sans)",
                      flexShrink: 0,
                    }}
                  >
                    Mark resolved
                  </button>
                )}

                <ChevronRight
                  size={14}
                  color="var(--text-3)"
                  style={{
                    transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                    flexShrink: 0,
                  }}
                />
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div
                  style={{
                    padding: "16px 20px",
                    borderTop: `1px solid ${isResolved ? "var(--border)" : s.border}`,
                    background: "var(--surface)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--text-3)",
                        marginBottom: 4,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      What happened
                    </p>
                    <p
                      style={{
                        fontSize: 13.5,
                        color: "var(--text)",
                        lineHeight: 1.6,
                      }}
                    >
                      {alert.summary}
                    </p>
                  </div>
                  <div
                    style={{
                      background: "rgba(37,99,235,0.06)",
                      border: "1px solid rgba(37,99,235,0.15)",
                      borderRadius: 10,
                      padding: "12px 14px",
                    }}
                  >
                    <p
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#2563EB",
                        marginBottom: 4,
                      }}
                    >
                      💡 Recommended fix
                    </p>
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--text-2)",
                        lineHeight: 1.6,
                      }}
                    >
                      {alert.fix}
                    </p>
                  </div>
                  <p
                    style={{
                      fontSize: 11.5,
                      color: "var(--text-3)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    Detected: {alert.detectedAt}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
