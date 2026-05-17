"use client";

import { useState } from "react";
import {
  RefreshCw,
  ExternalLink,
  Trash2,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
} from "lucide-react";

const DOMAINS = [
  {
    id: "1",
    domain: "acme.com",
    esp: "SendGrid",
    score: 95,
    spf: "pass",
    dkim: "pass",
    dmarc: "pass",
    unsubStatus: "active",
    checked: "2 min ago",
    addedDate: "Jan 12, 2025",
    emails7d: "45,230",
  },
  {
    id: "2",
    domain: "techcorp.io",
    esp: "Mailgun",
    score: 78,
    spf: "pass",
    dkim: "pass",
    dmarc: "warn",
    unsubStatus: "active",
    checked: "14 min ago",
    addedDate: "Feb 3, 2025",
    emails7d: "12,450",
  },
  {
    id: "3",
    domain: "startup.co",
    esp: "Google Workspace",
    score: 42,
    spf: "fail",
    dkim: "pass",
    dmarc: "none",
    unsubStatus: "inactive",
    checked: "1 hr ago",
    addedDate: "Mar 1, 2025",
    emails7d: "3,200",
  },
  {
    id: "4",
    domain: "newsletter.dev",
    esp: "Amazon SES",
    score: 88,
    spf: "pass",
    dkim: "pass",
    dmarc: "pass",
    unsubStatus: "active",
    checked: "3 hr ago",
    addedDate: "Mar 15, 2025",
    emails7d: "98,100",
  },
  {
    id: "5",
    domain: "agency.xyz",
    esp: "Postmark",
    score: 61,
    spf: "pass",
    dkim: "warn",
    dmarc: "warn",
    unsubStatus: "active",
    checked: "6 hr ago",
    addedDate: "Apr 2, 2025",
    emails7d: "7,850",
  },
  {
    id: "6",
    domain: "hookdropi.qzz.io",
    esp: "Unknown",
    score: 0,
    spf: "none",
    dkim: "none",
    dmarc: "none",
    unsubStatus: "inactive",
    checked: "12 hr ago",
    addedDate: "May 8, 2025",
    emails7d: "0",
  },
];

function scoreColor(s: number) {
  if (s >= 80) return "#10B981";
  if (s >= 60) return "#F59E0B";
  return "#EF4444";
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
    none: {
      bg: "var(--surface-2)",
      color: "var(--text-3)",
      icon: <Clock size={10} />,
    },
  };
  const s = map[status] ?? map.none;
  const labels: Record<string, string> = {
    pass: "Pass",
    fail: "Fail",
    warn: "Warn",
    none: "None",
  };
  return (
    <span
      className="inline-flex items-center gap-1"
      style={{
        padding: "3px 8px",
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
  const [search, setSearch] = useState("");
  const [scanning, setScanning] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const filtered = DOMAINS.filter(
    (d) =>
      d.domain.toLowerCase().includes(search.toLowerCase()) ||
      d.esp.toLowerCase().includes(search.toLowerCase()),
  );

  const healthy = DOMAINS.filter((d) => d.score >= 80).length;
  const warning = DOMAINS.filter((d) => d.score >= 50 && d.score < 80).length;
  const critical = DOMAINS.filter((d) => d.score < 50).length;

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
            Domains
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>
            {DOMAINS.length} domains being monitored in real time
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
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
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                fontWeight: 800,
                color: item.color,
                fontFamily: "var(--font-mono)",
              }}
            >
              {item.count}
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
          <span
            style={{
              fontSize: 12.5,
              color: "var(--text-3)",
              marginLeft: "auto",
              fontFamily: "var(--font-mono)",
            }}
          >
            {filtered.length} of {DOMAINS.length}
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
                  "Health",
                  "SPF",
                  "DKIM",
                  "DMARC",
                  "Unsubscribe",
                  "Emails (7d)",
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
                    (e.currentTarget as HTMLTableRowElement).style.background =
                      "var(--surface-2)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background =
                      "transparent";
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
                          {d.esp}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "14px 22px" }}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: `conic-gradient(${scoreColor(d.score)} ${d.score * 3.6}deg, var(--border) 0deg)`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <div
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            background: "var(--surface)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 8,
                            fontWeight: 800,
                            color: scoreColor(d.score),
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          {d.score}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "14px 22px" }}>
                    <Pill status={d.spf} />
                  </td>
                  <td style={{ padding: "14px 22px" }}>
                    <Pill status={d.dkim} />
                  </td>
                  <td style={{ padding: "14px 22px" }}>
                    <Pill status={d.dmarc} />
                  </td>
                  <td style={{ padding: "14px 22px" }}>
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 600,
                        padding: "3px 9px",
                        borderRadius: 999,
                        background:
                          d.unsubStatus === "active"
                            ? "rgba(16,185,129,0.1)"
                            : "var(--surface-2)",
                        color:
                          d.unsubStatus === "active"
                            ? "#10B981"
                            : "var(--text-3)",
                      }}
                    >
                      {d.unsubStatus === "active" ? "● Active" : "○ Inactive"}
                    </span>
                  </td>
                  <td style={{ padding: "14px 22px" }}>
                    <span
                      style={{
                        fontSize: 13,
                        fontFamily: "var(--font-mono)",
                        color: "var(--text-2)",
                        fontWeight: 600,
                      }}
                    >
                      {d.emails7d}
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
                      {d.addedDate}
                    </span>
                  </td>
                  <td style={{ padding: "14px 22px" }}>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setScanning(d.id);
                          setTimeout(() => setScanning(null), 2500);
                        }}
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
      </div>

      {/* Add modal */}
      {showAdd && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
          onClick={() => setShowAdd(false)}
        >
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 20,
              padding: 32,
              width: 440,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "var(--text)",
                marginBottom: 6,
              }}
            >
              Add New Domain
            </h2>
            <p
              style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 24 }}
            >
              Enter a domain to start monitoring its email compliance health
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: "var(--text-2)",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  Domain Name
                </label>
                <input
                  placeholder="e.g. acme.com"
                  style={{
                    width: "100%",
                    height: 40,
                    padding: "0 14px",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    fontSize: 14,
                    color: "var(--text)",
                    fontFamily: "var(--font-sans)",
                    outline: "none",
                  }}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAdd(false)}
                  style={{
                    flex: 1,
                    height: 40,
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    color: "var(--text-2)",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowAdd(false)}
                  style={{
                    flex: 1,
                    height: 40,
                    background: "linear-gradient(135deg, #2563EB, #7C3AED)",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    color: "white",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  Add & Scan Domain
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
