"use client";

import { useState, useCallback } from "react";
import { RefreshCw, ExternalLink, Trash2, Plus } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { domainInitials, scoreColor } from "@/lib/utils";

// ── Types ──
interface Domain {
  id: string;
  domain: string;
  detectedEsp: string | null;
  healthScore: number;
  spfStatus: string;
  dkimStatus: string;
  dmarcStatus: string;
  lastCheckedAt: string | null;
  createdAt: string;
}

interface Props {
  onAddDomain?: () => void;
}

type Filter = "all" | "healthy" | "warning" | "critical";

// ── Sub-components ──
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
  const map: Record<string, { bg: string; color: string }> = {
    pass: { bg: "rgba(16,185,129,0.12)", color: "#10B981" },
    fail: { bg: "rgba(239,68,68,0.12)", color: "#EF4444" },
    warn: { bg: "rgba(245,158,11,0.12)", color: "#F59E0B" },
    softfail: { bg: "rgba(245,158,11,0.12)", color: "#F59E0B" },
    none: { bg: "var(--surface-2)", color: "var(--text-3)" },
    unknown: { bg: "var(--surface-2)", color: "var(--text-3)" },
    missing: { bg: "rgba(239,68,68,0.12)", color: "#EF4444" },
  };
  const labels: Record<string, string> = {
    pass: "Pass",
    fail: "Fail",
    warn: "Warn",
    softfail: "Soft",
    none: "None",
    unknown: "—",
    missing: "Missing",
  };
  const s = map[status] ?? map.none;
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

// ── Relative time helper ──
function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const FILTERS: Filter[] = ["all", "healthy", "warning", "critical"];
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4500";

export default function DomainTable({ onAddDomain }: Props) {
  const { getToken } = useAuth();

  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [scanning, setScanning] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchDomains = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await getToken();
      const response = await fetch(`${API_URL}/api/v1/domains`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch domains");

      const data = await response.json();
      setDomains(data.data || []);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  // Trigger a manual scan
  async function handleScan(id: string) {
    setScanning(id);
    try {
      const token = await getToken();
      await fetch(`${API_URL}/api/v1/domains/${id}/scan`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      // Refresh after 3 seconds to show updated score
      setTimeout(() => {
        fetchDomains();
        setScanning(null);
      }, 3000);
    } catch {
      setScanning(null);
    }
  }

  // Delete a domain
  async function handleDelete(id: string, domainName: string) {
    if (!confirm(`Remove ${domainName} from monitoring?`)) return;
    setDeleting(id);
    try {
      const token = await getToken();
      await fetch(`${API_URL}/api/v1/domains/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setDomains((prev) => prev.filter((d) => d.id !== id));
    } catch {
      alert("Failed to delete domain");
    } finally {
      setDeleting(null);
    }
  }

  // Filter domains
  const filtered = domains.filter((d) => {
    if (filter === "healthy") return d.healthScore >= 80;
    if (filter === "warning") return d.healthScore >= 50 && d.healthScore < 80;
    if (filter === "critical") return d.healthScore < 50;
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
      {/* Header */}
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
            {loading
              ? "Loading..."
              : `${domains.length} domain${domains.length !== 1 ? "s" : ""} · real-time monitoring`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Refresh button */}
          <button
            onClick={fetchDomains}
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              border: "1px solid var(--border)",
              background: "var(--surface-2)",
              cursor: "pointer",
              color: "var(--text-3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} />
          </button>

          {/* Add domain */}
          <button
            onClick={onAddDomain}
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
            <Plus size={13} strokeWidth={2.5} />
            Add Domain
          </button>
        </div>
      </div>

      {/* Filter tabs */}
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

      {/* Table body */}
      {loading ? (
        // Loading skeleton
        <div style={{ padding: 40, textAlign: "center" }}>
          <RefreshCw
            size={24}
            color="var(--text-3)"
            className="spin"
            style={{ margin: "0 auto" }}
          />
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 12 }}>
            Loading domains...
          </p>
        </div>
      ) : error ? (
        // Error state
        <div style={{ padding: 40, textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "#EF4444", fontWeight: 600 }}>
            Failed to load domains
          </p>
          <p style={{ fontSize: 12.5, color: "var(--text-3)", marginTop: 6 }}>
            {error}
          </p>
          <button
            onClick={fetchDomains}
            style={{
              marginTop: 16,
              padding: "8px 16px",
              background: "linear-gradient(135deg, #2563EB, #7C3AED)",
              color: "white",
              border: "none",
              borderRadius: 9,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        // Empty state
        <div style={{ padding: 60, textAlign: "center" }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>🌐</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
            {domains.length === 0
              ? "No domains yet"
              : "No domains match this filter"}
          </p>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 6 }}>
            {domains.length === 0
              ? "Add your first domain to start monitoring"
              : "Try a different filter"}
          </p>
          {domains.length === 0 && (
            <button
              onClick={onAddDomain}
              style={{
                marginTop: 20,
                padding: "10px 20px",
                background: "linear-gradient(135deg, #2563EB, #7C3AED)",
                color: "white",
                border: "none",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              + Add Your First Domain
            </button>
          )}
        </div>
      ) : (
        // Table
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
                  {/* Domain */}
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
                          {d.detectedEsp || "ESP detecting..."}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Score */}
                  <td style={{ padding: "15px 22px", minWidth: 140 }}>
                    <ScoreBar score={d.healthScore} />
                  </td>

                  {/* Status pills */}
                  <td style={{ padding: "15px 22px" }}>
                    <Pill status={d.spfStatus} />
                  </td>
                  <td style={{ padding: "15px 22px" }}>
                    <Pill status={d.dkimStatus} />
                  </td>
                  <td style={{ padding: "15px 22px" }}>
                    <Pill status={d.dmarcStatus} />
                  </td>

                  {/* Last checked */}
                  <td style={{ padding: "15px 22px" }}>
                    <span
                      style={{
                        fontSize: 12.5,
                        color: "var(--text-3)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {timeAgo(d.lastCheckedAt)}
                    </span>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: "15px 22px" }}>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleScan(d.id)}
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
                        onClick={() =>
                          window.open(`https://${d.domain}`, "_blank")
                        }
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
                        title="Open domain"
                      >
                        <ExternalLink size={12} />
                      </button>

                      <button
                        onClick={() => handleDelete(d.id, d.domain)}
                        disabled={deleting === d.id}
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
                        title="Remove domain"
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
      )}

      {/* Footer */}
      {!loading && !error && filtered.length > 0 && (
        <div
          className="flex items-center justify-between"
          style={{
            padding: "13px 22px",
            borderTop: "1px solid var(--border)",
            background: "var(--surface-2)",
          }}
        >
          <span style={{ fontSize: 12.5, color: "var(--text-3)" }}>
            Showing {filtered.length} of {domains.length} domains
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
            <button
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                border: "none",
                background: "linear-gradient(135deg, #2563EB, #7C3AED)",
                color: "white",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              1
            </button>
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
      )}
    </div>
  );
}
