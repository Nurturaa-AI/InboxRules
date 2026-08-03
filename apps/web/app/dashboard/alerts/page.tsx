"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { useApiQuery, apiRequest } from "@/lib/useApiQuery";

interface AlertEvent {
  id: string;
  changeType: string;
  severity: string;
  aiTitle: string | null;
  aiSummary: string | null;
  aiFixSteps: string[] | null;
  previousValue: string | null;
  currentValue: string | null;
  acknowledged: boolean;
  resolvedAt: string | null;
  detectedAt: string;
  domain: { domain: string; detectedEsp: string | null };
}

type FilterType = "all" | "unresolved" | "critical" | "warning" | "info";

const CHANGE_LABELS: Record<string, string> = {
  spf_lookup_exceeded: "SPF Lookup Limit Exceeded",
  spf_record_changed: "SPF Record Changed",
  dmarc_policy_weakened: "DMARC Policy Weakened",
  dmarc_record_removed: "DMARC Record Removed",
  dkim_removed: "DKIM Selector Removed",
  dkim_key_rotated: "DKIM Key Rotated",
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

function timeAgo(d: string) {
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AlertsPage() {
  const { getToken } = useAuth();
  const { data, loading, error, refetch } = useApiQuery<{
    items: AlertEvent[];
    pagination: { total: number };
  }>("/alerts?limit=50&status=all");

  const [filter, setFilter] = useState<FilterType>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);

  const allAlerts =
    data?.items || (Array.isArray(data) ? (data as AlertEvent[]) : []);

  const filtered = allAlerts.filter((a) => {
    if (filter === "unresolved") return !a.resolvedAt;
    if (filter === "critical") return a.severity === "critical";
    if (filter === "warning") return a.severity === "warning";
    if (filter === "info") return a.severity === "info";
    return true;
  });

  const unresolvedCount = allAlerts.filter((a) => !a.resolvedAt).length;

  async function handleResolve(id: string) {
    setResolving(id);

    try {
      const token = await getToken();

      if (!token) {
        throw new Error("Authentication token missing");
      }

      await apiRequest(`/alerts/${id}/resolve`, "POST", token);

      refetch();
    } catch {
      alert("Failed to resolve alert");
    } finally {
      setResolving(null);
    }
  }

  async function handleAcknowledge(id: string) {
    try {
      const token = await getToken();

      if (!token) {
        throw new Error("Authentication token missing");
      }

      await apiRequest(`/alerts/${id}/acknowledge`, "POST", token);

      refetch();
    } catch {
      alert("Failed to acknowledge alert");
    }
  }
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
        <button
          onClick={refetch}
          style={{
            width: 36,
            height: 36,
            borderRadius: 9,
            border: "1px solid var(--border)",
            background: "var(--surface-2)",
            cursor: "pointer",
            color: "var(--text-3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <RefreshCw size={14} className={loading ? "spin" : ""} />
        </button>
      </div>

      {/* Filters */}
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
              background:
                filter === f
                  ? "linear-gradient(135deg, #2563EB, #7C3AED)"
                  : "var(--surface)",
              color: filter === f ? "white" : "var(--text-2)",
              outline: filter !== f ? "1px solid var(--border)" : "none",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Loading / Error / Empty */}
      {loading && (
        <div style={{ padding: 60, textAlign: "center" }}>
          <RefreshCw
            size={24}
            color="var(--text-3)"
            className="spin"
            style={{ margin: "0 auto" }}
          />
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 12 }}>
            Loading alerts...
          </p>
        </div>
      )}

      {error && (
        <div style={{ padding: 40, textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "#EF4444", fontWeight: 600 }}>
            Failed to load alerts
          </p>
          <button
            onClick={refetch}
            style={{
              marginTop: 12,
              padding: "8px 16px",
              background: "#2563EB",
              color: "white",
              border: "none",
              borderRadius: 9,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: 60,
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 40, marginBottom: 12 }}>✅</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
            {allAlerts.length === 0
              ? "No alerts yet"
              : "No alerts match this filter"}
          </p>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 6 }}>
            {allAlerts.length === 0
              ? "InboxRules will alert you when DNS changes are detected"
              : "Try a different filter"}
          </p>
        </div>
      )}

      {/* Alert cards */}
      {!loading && !error && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((alert) => {
            const isResolved = !!alert.resolvedAt;
            const isExpanded = expanded === alert.id;
            const s = TYPE_STYLES[alert.severity] ?? TYPE_STYLES.info;
            const title =
              alert.aiTitle ||
              CHANGE_LABELS[alert.changeType] ||
              alert.changeType;

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
                {/* Header row */}
                <div
                  className="flex items-center gap-3"
                  style={{
                    padding: "16px 20px",
                    cursor: "pointer",
                  }}
                  onClick={() => setExpanded(isExpanded ? null : alert.id)}
                >
                  <div style={{ flexShrink: 0 }}>
                    {isResolved ? (
                      <CheckCircle size={16} color="#10B981" />
                    ) : alert.severity === "critical" ? (
                      <XCircle size={16} color="#EF4444" />
                    ) : alert.severity === "warning" ? (
                      <AlertTriangle size={16} color="#F59E0B" />
                    ) : (
                      <Info size={16} color="#3B82F6" />
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex items-center gap-2">
                      <p
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: isResolved ? "var(--text-2)" : "var(--text)",
                        }}
                      >
                        {title}
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
                      {alert.domain?.domain} · {timeAgo(alert.detectedAt)}
                    </p>
                  </div>

                  {!isResolved && (
                    <div className="flex items-center gap-2">
                      {!alert.acknowledged && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAcknowledge(alert.id);
                          }}
                          style={{
                            padding: "5px 12px",
                            borderRadius: 8,
                            background: "rgba(245,158,11,0.08)",
                            border: "1px solid rgba(245,158,11,0.2)",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            color: "#F59E0B",
                            fontFamily: "var(--font-sans)",
                            flexShrink: 0,
                          }}
                        >
                          Acknowledge
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResolve(alert.id);
                        }}
                        disabled={resolving === alert.id}
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
                        {resolving === alert.id ? "..." : "Mark resolved"}
                      </button>
                    </div>
                  )}

                  <ChevronRight
                    size={14}
                    color="var(--text-3)"
                    style={{
                      transform: isExpanded ? "rotate(90deg)" : "rotate(0)",
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
                    {alert.aiSummary && (
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
                          {alert.aiSummary}
                        </p>
                      </div>
                    )}

                    {(alert.previousValue || alert.currentValue) && (
                      <div
                        style={{
                          background: "var(--surface-2)",
                          border: "1px solid var(--border)",
                          borderRadius: 10,
                          padding: "12px 14px",
                        }}
                      >
                        {alert.previousValue && (
                          <div style={{ marginBottom: 6 }}>
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: "var(--text-3)",
                              }}
                            >
                              Before:{" "}
                            </span>
                            <code
                              style={{
                                fontSize: 11.5,
                                fontFamily: "var(--font-mono)",
                                color: "#EF4444",
                                background: "rgba(239,68,68,0.08)",
                                padding: "2px 6px",
                                borderRadius: 4,
                              }}
                            >
                              {alert.previousValue}
                            </code>
                          </div>
                        )}
                        {alert.currentValue && (
                          <div>
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: "var(--text-3)",
                              }}
                            >
                              After:{" "}
                            </span>
                            <code
                              style={{
                                fontSize: 11.5,
                                fontFamily: "var(--font-mono)",
                                color: "#10B981",
                                background: "rgba(16,185,129,0.08)",
                                padding: "2px 6px",
                                borderRadius: 4,
                              }}
                            >
                              {alert.currentValue}
                            </code>
                          </div>
                        )}
                      </div>
                    )}

                    {alert.aiFixSteps && alert.aiFixSteps.length > 0 && (
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
                            marginBottom: 8,
                          }}
                        >
                          💡 How to fix it
                        </p>
                        <ol
                          style={{
                            paddingLeft: 18,
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                          }}
                        >
                          {alert.aiFixSteps.map((step, i) => (
                            <li
                              key={i}
                              style={{
                                fontSize: 13,
                                color: "var(--text-2)",
                                lineHeight: 1.5,
                              }}
                            >
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
