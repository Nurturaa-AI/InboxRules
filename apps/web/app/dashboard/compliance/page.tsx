"use client";

import { useState } from "react";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";

const COMPLIANCE_DATA = [
  {
    id: "1",
    domain: "acme.com",
    esp: "SendGrid",
    score: 95,
    spf: {
      status: "pass",
      record: "v=spf1 include:sendgrid.net ~all",
      lookups: 3,
      maxLookups: 10,
      issues: [],
    },
    dkim: {
      status: "pass",
      selectors: [
        { name: "s1", valid: true, bits: 2048, aligned: true },
        { name: "s2", valid: true, bits: 2048, aligned: true },
      ],
      issues: [],
    },
    dmarc: {
      status: "pass",
      policy: "reject",
      pct: 100,
      record: "v=DMARC1; p=reject; rua=mailto:dmarc@acme.com",
      issues: [],
    },
    listUnsub: {
      status: "active",
      endpoint: "https://unsub.inboxrules.io/abc123",
    },
  },
  {
    id: "2",
    domain: "techcorp.io",
    esp: "Mailgun",
    score: 78,
    spf: {
      status: "pass",
      record: "v=spf1 include:mailgun.org ~all",
      lookups: 2,
      maxLookups: 10,
      issues: [],
    },
    dkim: {
      status: "pass",
      selectors: [{ name: "k1", valid: true, bits: 2048, aligned: true }],
      issues: [],
    },
    dmarc: {
      status: "warn",
      policy: "none",
      pct: 100,
      record: "v=DMARC1; p=none; rua=mailto:dmarc@techcorp.io",
      issues: [
        "DMARC policy is p=none — domain is not protected from spoofing",
      ],
    },
    listUnsub: {
      status: "active",
      endpoint: "https://unsub.inboxrules.io/def456",
    },
  },
  {
    id: "3",
    domain: "startup.co",
    esp: "Google Workspace",
    score: 42,
    spf: {
      status: "fail",
      record: null,
      lookups: 0,
      maxLookups: 10,
      issues: [
        "No SPF record found — add one to authorize your sending servers",
      ],
    },
    dkim: {
      status: "pass",
      selectors: [{ name: "google", valid: true, bits: 1024, aligned: true }],
      issues: ["1024-bit key is weak — upgrade to 2048-bit"],
    },
    dmarc: {
      status: "none",
      policy: "none",
      pct: 0,
      record: null,
      issues: ["No DMARC record found — your domain can be spoofed"],
    },
    listUnsub: { status: "inactive", endpoint: null },
  },
];

function StatusIcon({ status }: { status: string }) {
  if (status === "pass") return <CheckCircle size={14} color="#10B981" />;
  if (status === "fail" || status === "none")
    return <XCircle size={14} color="#EF4444" />;
  return <AlertCircle size={14} color="#F59E0B" />;
}

function StatusBadge({ status, label }: { status: string; label?: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    pass: { bg: "rgba(16,185,129,0.1)", color: "#10B981" },
    fail: { bg: "rgba(239,68,68,0.1)", color: "#EF4444" },
    warn: { bg: "rgba(245,158,11,0.1)", color: "#F59E0B" },
    none: { bg: "var(--surface-2)", color: "var(--text-3)" },
  };
  const s = styles[status] ?? styles.none;
  const defaultLabels: Record<string, string> = {
    pass: "Pass",
    fail: "Fail",
    warn: "Warning",
    none: "Missing",
  };
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
      {label ?? defaultLabels[status] ?? status}
    </span>
  );
}

function LookupBar({ count, max }: { count: number; max: number }) {
  const pct = (count / max) * 100;
  const color = count >= 8 ? "#EF4444" : count >= 6 ? "#F59E0B" : "#10B981";
  return (
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
            width: `${pct}%`,
            height: "100%",
            background: color,
            borderRadius: 999,
          }}
        />
      </div>
      <span
        style={{
          fontSize: 11.5,
          fontFamily: "var(--font-mono)",
          fontWeight: 700,
          color,
        }}
      >
        {count}/{max}
      </span>
    </div>
  );
}

export default function CompliancePage() {
  const [expanded, setExpanded] = useState<string | null>("1");

  const totalPass = COMPLIANCE_DATA.filter((d) => d.score >= 80).length;
  const totalWarn = COMPLIANCE_DATA.filter(
    (d) => d.score >= 50 && d.score < 80,
  ).length;
  const totalFail = COMPLIANCE_DATA.filter((d) => d.score < 50).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
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
          Detailed SPF, DKIM, DMARC, and unsubscribe compliance for every domain
        </p>
      </div>

      {/* Summary row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
        }}
      >
        {[
          {
            label: "Total Domains",
            value: COMPLIANCE_DATA.length,
            color: "#2563EB",
            bg: "rgba(37,99,235,0.1)",
          },
          {
            label: "Fully Compliant",
            value: totalPass,
            color: "#10B981",
            bg: "rgba(16,185,129,0.1)",
          },
          {
            label: "Needs Attention",
            value: totalWarn,
            color: "#F59E0B",
            bg: "rgba(245,158,11,0.1)",
          },
          {
            label: "Critical Issues",
            value: totalFail,
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
              {item.value}
            </div>
            <p
              style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}
            >
              {item.label}
            </p>
          </div>
        ))}
      </div>

      {/* Compliance detail cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {COMPLIANCE_DATA.map((d) => (
          <div
            key={d.id}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            {/* Row header — clickable to expand */}
            <div
              className="flex items-center gap-4"
              style={{
                padding: "16px 22px",
                cursor: "pointer",
                background:
                  expanded === d.id ? "var(--surface-2)" : "var(--surface)",
                transition: "background 0.15s",
              }}
              onClick={() => setExpanded(expanded === d.id ? null : d.id)}
            >
              {/* Domain info */}
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
                    {d.esp}
                  </p>
                </div>
              </div>

              {/* Status pills */}
              <div className="flex items-center gap-2">
                <StatusBadge status={d.spf.status} label="SPF" />
                <StatusBadge status={d.dkim.status} label="DKIM" />
                <StatusBadge status={d.dmarc.status} label="DMARC" />
                <StatusBadge
                  status={d.listUnsub.status === "active" ? "pass" : "fail"}
                  label="Unsub"
                />
              </div>

              {/* Score */}
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  fontFamily: "var(--font-mono)",
                  color:
                    d.score >= 80
                      ? "#10B981"
                      : d.score >= 50
                        ? "#F59E0B"
                        : "#EF4444",
                  minWidth: 48,
                  textAlign: "right",
                }}
              >
                {d.score}
              </div>

              {/* Expand icon */}
              {expanded === d.id ? (
                <ChevronUp size={16} color="var(--text-3)" />
              ) : (
                <ChevronDown size={16} color="var(--text-3)" />
              )}
            </div>

            {/* Expanded detail */}
            {expanded === d.id && (
              <div
                style={{
                  padding: "20px 22px",
                  borderTop: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: 16,
                  }}
                >
                  {/* SPF detail */}
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
                      <StatusIcon status={d.spf.status} />
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
                    {d.spf.record && (
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
                        {d.spf.record}
                      </code>
                    )}
                    <div style={{ marginBottom: 8 }}>
                      <p
                        style={{
                          fontSize: 11.5,
                          color: "var(--text-3)",
                          marginBottom: 4,
                        }}
                      >
                        DNS Lookups
                      </p>
                      <LookupBar count={d.spf.lookups} max={d.spf.maxLookups} />
                    </div>
                    {d.spf.issues.map((issue, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2"
                        style={{ marginTop: 8 }}
                      >
                        <AlertCircle
                          size={12}
                          color="#F59E0B"
                          style={{ flexShrink: 0, marginTop: 1 }}
                        />
                        <p style={{ fontSize: 12, color: "var(--text-2)" }}>
                          {issue}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* DKIM detail */}
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
                      <StatusIcon status={d.dkim.status} />
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
                    {d.dkim.selectors.map((sel) => (
                      <div
                        key={sel.name}
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
                          {sel.name}
                        </code>
                        <span
                          style={{
                            fontSize: 11,
                            fontFamily: "var(--font-mono)",
                            color: sel.bits >= 2048 ? "#10B981" : "#F59E0B",
                            fontWeight: 600,
                          }}
                        >
                          {sel.bits}-bit
                        </span>
                        <CheckCircle
                          size={12}
                          color={sel.valid ? "#10B981" : "#EF4444"}
                        />
                      </div>
                    ))}
                    {d.dkim.issues.map((issue, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2"
                        style={{ marginTop: 8 }}
                      >
                        <AlertCircle
                          size={12}
                          color="#F59E0B"
                          style={{ flexShrink: 0, marginTop: 1 }}
                        />
                        <p style={{ fontSize: 12, color: "var(--text-2)" }}>
                          {issue}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* DMARC detail */}
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
                      <StatusIcon status={d.dmarc.status} />
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
                    {d.dmarc.record && (
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
                        {d.dmarc.record}
                      </code>
                    )}
                    <div
                      className="flex items-center gap-2"
                      style={{ marginBottom: 8 }}
                    >
                      <span style={{ fontSize: 12, color: "var(--text-3)" }}>
                        Policy:
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          fontFamily: "var(--font-mono)",
                          color:
                            d.dmarc.policy === "reject"
                              ? "#10B981"
                              : d.dmarc.policy === "quarantine"
                                ? "#F59E0B"
                                : "#EF4444",
                        }}
                      >
                        p={d.dmarc.policy}
                      </span>
                      <span style={{ fontSize: 12, color: "var(--text-3)" }}>
                        ·
                      </span>
                      <span style={{ fontSize: 12, color: "var(--text-3)" }}>
                        pct={d.dmarc.pct}%
                      </span>
                    </div>
                    {d.dmarc.issues.map((issue, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2"
                        style={{ marginTop: 8 }}
                      >
                        <AlertCircle
                          size={12}
                          color="#EF4444"
                          style={{ flexShrink: 0, marginTop: 1 }}
                        />
                        <p style={{ fontSize: 12, color: "var(--text-2)" }}>
                          {issue}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Unsubscribe detail */}
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
                          d.listUnsub.status === "active" ? "pass" : "fail"
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
                    {d.listUnsub.endpoint ? (
                      <>
                        <p
                          style={{
                            fontSize: 11.5,
                            color: "var(--text-3)",
                            marginBottom: 6,
                          }}
                        >
                          RFC 8058 endpoint
                        </p>
                        <code
                          style={{
                            display: "block",
                            fontSize: 11,
                            color: "var(--text-2)",
                            background: "var(--surface)",
                            border: "1px solid var(--border)",
                            borderRadius: 7,
                            padding: "8px 10px",
                            wordBreak: "break-all",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          {d.listUnsub.endpoint}
                        </code>
                        <div
                          className="flex items-center gap-2"
                          style={{ marginTop: 10 }}
                        >
                          <CheckCircle size={12} color="#10B981" />
                          <span
                            style={{
                              fontSize: 12,
                              color: "#10B981",
                              fontWeight: 600,
                            }}
                          >
                            Endpoint active and accepting POST requests
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-start gap-2">
                        <Info
                          size={13}
                          color="#F59E0B"
                          style={{ flexShrink: 0, marginTop: 1 }}
                        />
                        <p style={{ fontSize: 12, color: "var(--text-2)" }}>
                          No unsubscribe endpoint configured. Enable it to
                          comply with Gmail and Yahoo bulk sender requirements.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
