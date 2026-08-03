"use client";

import { useState } from "react";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useApiQuery } from "@/lib/useApiQuery";
import { RefreshCw } from "lucide-react";

interface Domain {
  id: string;
  domain: string;
  unsubStatus?: "active" | "inactive" | null;
  detectedEsp: string | null;
  healthScore: number;
  spfStatus: string;
  dkimStatus: string;
  dmarcStatus: string;
  snapshots: Array<{
    spfRecord: string | null;
    spfLookupCount: number | null;
    spfResult: string | null;
    dkimSelectors: unknown;
    dmarcRecord: string | null;
    dmarcPolicy: string | null;
    dmarcPct: number | null;
    dmarcResult?: string | null;
    overallScore: number;
  }>;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "pass") return <CheckCircle size={14} color="#10B981" />;
  if (status === "fail" || status === "none" || status === "missing")
    return <XCircle size={14} color="#EF4444" />;
  return <AlertCircle size={14} color="#F59E0B" />;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    pass: { bg: "rgba(16,185,129,0.1)", color: "#10B981" },
    fail: { bg: "rgba(239,68,68,0.1)", color: "#EF4444" },
    warn: { bg: "rgba(245,158,11,0.1)", color: "#F59E0B" },
    softfail: { bg: "rgba(245,158,11,0.1)", color: "#F59E0B" },
    none: { bg: "var(--surface-2)", color: "var(--text-3)" },
    missing: { bg: "rgba(239,68,68,0.1)", color: "#EF4444" },
    unknown: { bg: "var(--surface-2)", color: "var(--text-3)" },
  };
  const labels: Record<string, string> = {
    pass: "Pass",
    fail: "Fail",
    warn: "Warn",
    softfail: "Soft",
    none: "None",
    missing: "Missing",
    unknown: "Unknown",
  };
  const s = styles[status] ?? styles.unknown;
  return (
    <span
      className="inline-flex items-center gap-1.5"
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        background: s.bg,
        color: s.color,
      }}
    >
      <StatusIcon status={status} />
      {labels[status] ?? status}
    </span>
  );
}

export default function CompliancePage() {
  const { data, loading, error, refetch } = useApiQuery<Domain[]>(
    "/domains?limit=100&include=snapshots,changeEvents",
  );
  const [expanded, setExpanded] = useState<string | null>(null);

  const domains = data || [];
  const compliant = domains.filter((d) => d.healthScore >= 80).length;
  const warning = domains.filter(
    (d) => d.healthScore >= 50 && d.healthScore < 80,
  ).length;
  const critical = domains.filter((d) => d.healthScore < 50).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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
            Compliance
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>
            SPF, DKIM, DMARC, and unsubscribe status for every domain
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

      {/* Summary */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
        }}
      >
        {[
          {
            label: "Total",
            value: domains.length,
            color: "#2563EB",
            bg: "rgba(37,99,235,0.1)",
          },
          {
            label: "Compliant",
            value: compliant,
            color: "#10B981",
            bg: "rgba(16,185,129,0.1)",
          },
          {
            label: "Warning",
            value: warning,
            color: "#F59E0B",
            bg: "rgba(245,158,11,0.1)",
          },
          {
            label: "Critical",
            value: critical,
            color: "#EF4444",
            bg: "rgba(239,68,68,0.1)",
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
                width: 46,
                height: 46,
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
              {loading ? "—" : item.value}
            </div>
            <p
              style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}
            >
              {item.label}
            </p>
          </div>
        ))}
      </div>

      {/* Loading / Error */}
      {loading && (
        <div style={{ padding: 60, textAlign: "center" }}>
          <RefreshCw
            size={24}
            color="var(--text-3)"
            className="spin"
            style={{ margin: "0 auto" }}
          />
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 12 }}>
            Loading compliance data...
          </p>
        </div>
      )}

      {error && (
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
      )}

      {/* Domain detail cards */}
      {!loading && !error && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {domains.length === 0 ? (
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 16,
                padding: 60,
                textAlign: "center",
              }}
            >
              <p style={{ fontSize: 32, marginBottom: 12 }}>🛡️</p>
              <p
                style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}
              >
                No domains yet
              </p>
              <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 6 }}>
                Add domains to see compliance details here
              </p>
            </div>
          ) : (
            domains.map((d) => {
              const snap = d.snapshots?.[0];
              const dkimSelectors = snap?.dkimSelectors
                ? Array.isArray(snap.dkimSelectors)
                  ? snap.dkimSelectors
                  : []
                : [];
              const isExpanded = expanded === d.id;

              return (
                <div
                  key={d.id}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 16,
                    overflow: "hidden",
                  }}
                >
                  {/* Row header */}
                  <div
                    className="flex items-center gap-4"
                    style={{
                      padding: "16px 22px",
                      cursor: "pointer",
                      background: isExpanded
                        ? "var(--surface-2)"
                        : "var(--surface)",
                      transition: "background 0.15s",
                    }}
                    onClick={() => setExpanded(isExpanded ? null : d.id)}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        style={{
                          width: 36,
                          height: 36,
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
                            fontWeight: 700,
                            fontSize: 14,
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
                          {d.detectedEsp || "Unknown ESP"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusBadge status={d.spfStatus} />
                      <StatusBadge status={d.dkimStatus} />
                      <StatusBadge status={d.dmarcStatus} />
                    </div>

                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 800,
                        fontFamily: "var(--font-mono)",
                        color:
                          d.healthScore >= 80
                            ? "#10B981"
                            : d.healthScore >= 50
                              ? "#F59E0B"
                              : "#EF4444",
                        minWidth: 48,
                        textAlign: "right",
                      }}
                    >
                      {d.healthScore}
                    </div>

                    {isExpanded ? (
                      <ChevronUp size={16} color="var(--text-3)" />
                    ) : (
                      <ChevronDown size={16} color="var(--text-3)" />
                    )}
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div
                      style={{
                        padding: "20px 22px",
                        borderTop: "1px solid var(--border)",
                      }}
                    >
                      {!snap ? (
                        <p
                          style={{
                            fontSize: 13,
                            color: "var(--text-3)",
                            textAlign: "center",
                            padding: "20px 0",
                          }}
                        >
                          No scan data yet. Click &quot;Scan&quot; on the domain
                          to run a check.
                        </p>
                      ) : (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(2, 1fr)",
                            gap: 16,
                          }}
                        >
                          {/* SPF */}
                          <div
                            style={{
                              background: "var(--surface-2)",
                              border: "1px solid var(--border)",
                              borderRadius: 12,
                              padding: 16,
                            }}
                          >
                            <div
                              className="flex items-center gap-2"
                              style={{ marginBottom: 12 }}
                            >
                              <StatusIcon
                                status={snap.spfResult || "unknown"}
                              />
                              <p
                                style={{
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: "var(--text)",
                                }}
                              >
                                SPF Record
                              </p>
                            </div>
                            {snap.spfRecord ? (
                              <code
                                style={{
                                  display: "block",
                                  fontSize: 11,
                                  color: "var(--text-2)",
                                  background: "var(--surface)",
                                  border: "1px solid var(--border)",
                                  borderRadius: 7,
                                  padding: "8px 10px",
                                  marginBottom: 10,
                                  wordBreak: "break-all",
                                  fontFamily: "var(--font-mono)",
                                }}
                              >
                                {snap.spfRecord}
                              </code>
                            ) : (
                              <p
                                style={{
                                  fontSize: 12.5,
                                  color: "#EF4444",
                                  marginBottom: 10,
                                }}
                              >
                                No SPF record found
                              </p>
                            )}
                            <div style={{ marginTop: 8 }}>
                              <p
                                style={{
                                  fontSize: 11.5,
                                  color: "var(--text-3)",
                                  marginBottom: 4,
                                }}
                              >
                                DNS Lookups
                              </p>
                              <div className="flex items-center gap-2">
                                <div
                                  style={{
                                    flex: 1,
                                    height: 5,
                                    background: "var(--border)",
                                    borderRadius: 999,
                                    overflow: "hidden",
                                  }}
                                >
                                  <div
                                    style={{
                                      width: `${((snap.spfLookupCount || 0) / 10) * 100}%`,
                                      height: "100%",
                                      borderRadius: 999,
                                      background:
                                        (snap.spfLookupCount || 0) >= 8
                                          ? "#EF4444"
                                          : (snap.spfLookupCount || 0) >= 6
                                            ? "#F59E0B"
                                            : "#10B981",
                                    }}
                                  />
                                </div>
                                <span
                                  style={{
                                    fontSize: 11.5,
                                    fontFamily: "var(--font-mono)",
                                    fontWeight: 700,
                                    color:
                                      (snap.spfLookupCount || 0) >= 8
                                        ? "#EF4444"
                                        : "#10B981",
                                  }}
                                >
                                  {snap.spfLookupCount || 0}/10
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* DKIM */}
                          <div
                            style={{
                              background: "var(--surface-2)",
                              border: "1px solid var(--border)",
                              borderRadius: 12,
                              padding: 16,
                            }}
                          >
                            <div
                              className="flex items-center gap-2"
                              style={{ marginBottom: 12 }}
                            >
                              <StatusIcon status={d.dkimStatus} />
                              <p
                                style={{
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: "var(--text)",
                                }}
                              >
                                DKIM Selectors
                              </p>
                            </div>
                            {dkimSelectors.length === 0 ? (
                              <p style={{ fontSize: 12.5, color: "#EF4444" }}>
                                No DKIM selectors found
                              </p>
                            ) : (
                              dkimSelectors.map((sel, i: number) => (
                                <div
                                  key={i}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                    marginBottom: 8,
                                    padding: "8px 10px",
                                    background: "var(--surface)",
                                    border: "1px solid var(--border)",
                                    borderRadius: 8,
                                  }}
                                >
                                  <code
                                    style={{
                                      fontSize: 12,
                                      fontFamily: "var(--font-mono)",
                                      color: "var(--text-2)",
                                      flex: 1,
                                    }}
                                  >
                                    {sel.selector}
                                  </code>
                                  <span
                                    style={{
                                      fontSize: 11,
                                      fontFamily: "var(--font-mono)",
                                      color:
                                        (sel.keyBits || 0) >= 2048
                                          ? "#10B981"
                                          : "#F59E0B",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {sel.keyBits || "?"}bit
                                  </span>
                                  {sel.valid ? (
                                    <CheckCircle size={12} color="#10B981" />
                                  ) : (
                                    <XCircle size={12} color="#EF4444" />
                                  )}
                                </div>
                              ))
                            )}
                          </div>

                          {/* DMARC */}
                          <div
                            style={{
                              background: "var(--surface-2)",
                              border: "1px solid var(--border)",
                              borderRadius: 12,
                              padding: 16,
                            }}
                          >
                            <div
                              className="flex items-center gap-2"
                              style={{ marginBottom: 12 }}
                            >
                              <StatusIcon
                                status={snap.dmarcResult || d.dmarcStatus}
                              />
                              <p
                                style={{
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: "var(--text)",
                                }}
                              >
                                DMARC Policy
                              </p>
                            </div>
                            {snap.dmarcRecord ? (
                              <code
                                style={{
                                  display: "block",
                                  fontSize: 11,
                                  color: "var(--text-2)",
                                  background: "var(--surface)",
                                  border: "1px solid var(--border)",
                                  borderRadius: 7,
                                  padding: "8px 10px",
                                  marginBottom: 10,
                                  wordBreak: "break-all",
                                  fontFamily: "var(--font-mono)",
                                }}
                              >
                                {snap.dmarcRecord}
                              </code>
                            ) : (
                              <p
                                style={{
                                  fontSize: 12.5,
                                  color: "#EF4444",
                                  marginBottom: 10,
                                }}
                              >
                                No DMARC record found
                              </p>
                            )}
                            {snap.dmarcPolicy && (
                              <div className="flex items-center gap-2">
                                <span
                                  style={{
                                    fontSize: 12,
                                    color: "var(--text-3)",
                                  }}
                                >
                                  Policy:
                                </span>
                                <span
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                    fontFamily: "var(--font-mono)",
                                    color:
                                      snap.dmarcPolicy === "reject"
                                        ? "#10B981"
                                        : snap.dmarcPolicy === "quarantine"
                                          ? "#F59E0B"
                                          : "#EF4444",
                                  }}
                                >
                                  p={snap.dmarcPolicy}
                                </span>
                                <span
                                  style={{
                                    fontSize: 12,
                                    color: "var(--text-3)",
                                  }}
                                >
                                  · pct={snap.dmarcPct ?? 100}%
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Unsubscribe */}
                          <div
                            style={{
                              background: "var(--surface-2)",
                              border: "1px solid var(--border)",
                              borderRadius: 12,
                              padding: 16,
                            }}
                          >
                            <div
                              className="flex items-center gap-2"
                              style={{ marginBottom: 12 }}
                            >
                              <StatusIcon
                                status={
                                  d.unsubStatus === "active" ? "pass" : "warn"
                                }
                              />
                              <p
                                style={{
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: "var(--text)",
                                }}
                              >
                                One-Click Unsubscribe
                              </p>
                            </div>
                            {d.unsubStatus === "active" ? (
                              <div className="flex items-center gap-2">
                                <CheckCircle size={13} color="#10B981" />
                                <span
                                  style={{
                                    fontSize: 12.5,
                                    color: "#10B981",
                                    fontWeight: 600,
                                  }}
                                >
                                  RFC 8058 endpoint active
                                </span>
                              </div>
                            ) : (
                              <p
                                style={{
                                  fontSize: 12.5,
                                  color: "var(--text-2)",
                                  lineHeight: 1.5,
                                }}
                              >
                                One-click unsubscribe endpoint not configured.
                                Enable it in the Unsubscribe tab.
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
