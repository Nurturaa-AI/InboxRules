"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  Plus,
  Search,
  RefreshCw,
  ExternalLink,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { useApiQuery, apiRequest } from "@/lib/useApiQuery";
import AddDomainWizard from "@/components/dashboard/AddDomainWizard";

interface Domain {
  id: string;
  domain: string;
  detectedEsp: string | null;
  healthScore: number;
  spfStatus: string;
  dkimStatus: string;
  dmarcStatus: string;
  unsubStatus: string;
  lastCheckedAt: string | null;
  createdAt: string;
}

function scoreColor(s: number) {
  if (s >= 80) return "#10B981";
  if (s >= 60) return "#F59E0B";
  return "#EF4444";
}

function timeAgo(d: string | null) {
  if (!d) return "Never";
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function Pill({ status }: { status: string }) {
  const map: Record<
    string,
    { bg: string; color: string; icon: React.ReactNode }
  > = {
    pass: {
      bg: "rgba(16,185,129,0.1)",
      color: "#10B981",
      icon: <CheckCircle size={10} />,
    },
    fail: {
      bg: "rgba(239,68,68,0.1)",
      color: "#EF4444",
      icon: <XCircle size={10} />,
    },
    warn: {
      bg: "rgba(245,158,11,0.1)",
      color: "#F59E0B",
      icon: <AlertCircle size={10} />,
    },
    softfail: {
      bg: "rgba(245,158,11,0.1)",
      color: "#F59E0B",
      icon: <AlertCircle size={10} />,
    },
    none: { bg: "var(--surface-2)", color: "var(--text-3)", icon: null },
    missing: {
      bg: "rgba(239,68,68,0.1)",
      color: "#EF4444",
      icon: <XCircle size={10} />,
    },
    unknown: { bg: "var(--surface-2)", color: "var(--text-3)", icon: null },
  };
  const s = map[status] ?? map.none;
  const labels: Record<string, string> = {
    pass: "Pass",
    fail: "Fail",
    warn: "Warn",
    softfail: "Soft",
    none: "None",
    missing: "Missing",
    unknown: "—",
  };
  return (
    <span
      className="inline-flex items-center gap-1"
      style={{
        padding: "3px 9px",
        borderRadius: 999,
        fontSize: 11.5,
        fontWeight: 600,
        background: s.bg,
        color: s.color,
      }}
    >
      {s.icon} {labels[status] ?? status}
    </span>
  );
}

export default function DomainsPage() {
  const { getToken } = useAuth();
  const { data, loading, error, refetch } =
    useApiQuery<Domain[]>("/domains?limit=100");
  const [search, setSearch] = useState("");
  const [scanning, setScanning] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  const domains = data || [];
  const filtered = domains.filter(
    (d) =>
      d.domain.toLowerCase().includes(search.toLowerCase()) ||
      (d.detectedEsp || "").toLowerCase().includes(search.toLowerCase()),
  );

  const healthy = domains.filter((d) => d.healthScore >= 80).length;
  const warning = domains.filter(
    (d) => d.healthScore >= 50 && d.healthScore < 80,
  ).length;
  const critical = domains.filter((d) => d.healthScore < 50).length;

  async function handleScan(id: string) {
    setScanning(id);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("No auth token found");
      }
      await apiRequest(`/domains/${id}/scan`, "POST", token);
      setTimeout(() => {
        refetch();
        setScanning(null);
      }, 3000);
    } catch {
      setScanning(null);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remove ${name} from monitoring?`)) return;
    setDeleting(id);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("No auth token found");
      }
      await apiRequest(`/domains/${id}`, "DELETE", token);
      refetch();
    } catch {
      alert("Failed to remove domain");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {showWizard && (
        <AddDomainWizard
          onClose={() => setShowWizard(false)}
          onDomainAdded={() => {
            refetch();
            setShowWizard(false);
          }}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "var(--text)",
              letterSpacing: "-0.4px",
            }}
          >
            Domains
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>
            {loading
              ? "Loading..."
              : `${domains.length} domain${domains.length !== 1 ? "s" : ""} being monitored`}
          </p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="flex items-center gap-2"
          style={{
            height: 38,
            padding: "0 16px",
            background: "linear-gradient(135deg, #2563EB, #7C3AED)",
            color: "white",
            border: "none",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
            boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
          }}
        >
          <Plus size={14} strokeWidth={2.5} /> Add Domain
        </button>
      </div>

      {/* Summary cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 14,
        }}
      >
        {[
          {
            label: "Healthy",
            count: healthy,
            color: "#10B981",
            bg: "rgba(16,185,129,0.1)",
            desc: "Score ≥ 80",
          },
          {
            label: "Warning",
            count: warning,
            color: "#F59E0B",
            bg: "rgba(245,158,11,0.1)",
            desc: "Score 50–79",
          },
          {
            label: "Critical",
            count: critical,
            color: "#EF4444",
            bg: "rgba(239,68,68,0.1)",
            desc: "Score < 50",
          },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: "18px 20px",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: item.bg,
                color: item.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                fontWeight: 800,
                fontFamily: "var(--font-mono)",
              }}
            >
              {loading ? "—" : item.count}
            </div>
            <div>
              <p
                style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}
              >
                {item.label}
              </p>
              <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
                {item.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        {/* Search */}
        <div
          style={{
            padding: "14px 22px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            className="flex items-center gap-2"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 9,
              padding: "0 12px",
              height: 36,
              maxWidth: 300,
              flex: 1,
            }}
          >
            <Search size={13} color="var(--text-3)" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search domains or ESP..."
              style={{
                background: "none",
                border: "none",
                outline: "none",
                fontSize: 13,
                color: "var(--text)",
                fontFamily: "var(--font-sans)",
                width: "100%",
              }}
            />
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

        {/* Loading / Error / Empty / Table */}
        {loading ? (
          <div style={{ padding: 60, textAlign: "center" }}>
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
          <div style={{ padding: 40, textAlign: "center" }}>
            <p style={{ fontSize: 14, color: "#EF4444", fontWeight: 600 }}>
              Failed to load
            </p>
            <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>
              {error}
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
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>🌐</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
              {domains.length === 0 ? "No domains yet" : "No results"}
            </p>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 6 }}>
              {domains.length === 0
                ? "Add your first domain to start monitoring"
                : "Try a different search"}
            </p>
            {domains.length === 0 && (
              <button
                onClick={() => setShowWizard(true)}
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
                    "Health",
                    "SPF",
                    "DKIM",
                    "DMARC",
                    "Last Checked",
                    "Added",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "10px 22px",
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
                      (
                        e.currentTarget as HTMLTableRowElement
                      ).style.background = "var(--surface-2)";
                    }}
                    onMouseLeave={(e) => {
                      (
                        e.currentTarget as HTMLTableRowElement
                      ).style.background = "transparent";
                    }}
                  >
                    <td style={{ padding: "14px 22px" }}>
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
                          }}
                        >
                          {d.domain.substring(0, 2).toUpperCase()}
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
                              marginTop: 1,
                            }}
                          >
                            {d.detectedEsp || "Detecting ESP..."}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "14px 22px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: "50%",
                            background: `conic-gradient(${scoreColor(d.healthScore)} ${d.healthScore * 3.6}deg, var(--border) 0deg)`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <div
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                              background: "var(--surface)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 8,
                              fontWeight: 800,
                              color: scoreColor(d.healthScore),
                              fontFamily: "var(--font-mono)",
                            }}
                          >
                            {d.healthScore}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "14px 22px" }}>
                      <Pill status={d.spfStatus} />
                    </td>
                    <td style={{ padding: "14px 22px" }}>
                      <Pill status={d.dkimStatus} />
                    </td>
                    <td style={{ padding: "14px 22px" }}>
                      <Pill status={d.dmarcStatus} />
                    </td>
                    <td style={{ padding: "14px 22px" }}>
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
                    <td style={{ padding: "14px 22px" }}>
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--text-3)",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {new Date(d.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </td>
                    <td style={{ padding: "14px 22px" }}>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleScan(d.id)}
                          className="flex items-center gap-1"
                          style={{
                            padding: "5px 10px",
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
      </div>
    </div>
  );
}
