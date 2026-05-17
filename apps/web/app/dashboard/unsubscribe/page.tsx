"use client";

import { useState } from "react";
import {
  Copy,
  Check,
  ExternalLink,
  Download,
  Plus,
  Shield,
  Zap,
  Globe,
} from "lucide-react";

const UNSUB_EVENTS = [
  {
    id: "1",
    emailHash: "a3f9b2...c8d1",
    domain: "acme.com",
    method: "one_click",
    source: "Gmail",
    time: "2 min ago",
  },
  {
    id: "2",
    emailHash: "b7e2d4...f3a9",
    domain: "acme.com",
    method: "one_click",
    source: "Yahoo",
    time: "15 min ago",
  },
  {
    id: "3",
    emailHash: "c9d5e1...a2b8",
    domain: "techcorp.io",
    method: "manual",
    source: "Outlook",
    time: "1 hr ago",
  },
  {
    id: "4",
    emailHash: "d1f8c3...e7b2",
    domain: "acme.com",
    method: "one_click",
    source: "Gmail",
    time: "2 hr ago",
  },
  {
    id: "5",
    emailHash: "e4a7b9...d5c1",
    domain: "agency.xyz",
    method: "manual",
    source: "Apple Mail",
    time: "5 hr ago",
  },
];

const DOMAINS_WITH_UNSUB = [
  {
    domain: "acme.com",
    token: "ak_abc123xyz",
    active: true,
    unsubs7d: 47,
    endpoint: "https://unsub.inboxrules.io/ak_abc123xyz",
  },
  {
    domain: "techcorp.io",
    token: "tk_def456uvw",
    active: true,
    unsubs7d: 12,
    endpoint: "https://unsub.inboxrules.io/tk_def456uvw",
  },
  {
    domain: "newsletter.dev",
    token: "nd_ghi789rst",
    active: true,
    unsubs7d: 83,
    endpoint: "https://unsub.inboxrules.io/nd_ghi789rst",
  },
  {
    domain: "agency.xyz",
    token: "ax_jkl012opq",
    active: true,
    unsubs7d: 9,
    endpoint: "https://unsub.inboxrules.io/ax_jkl012opq",
  },
  {
    domain: "startup.co",
    token: null,
    active: false,
    unsubs7d: 0,
    endpoint: null,
  },
];

export default function UnsubscribePage() {
  const [copied, setCopied] = useState<string | null>(null);

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  const totalUnsubs = DOMAINS_WITH_UNSUB.reduce((a, d) => a + d.unsubs7d, 0);
  const activeEndpoints = DOMAINS_WITH_UNSUB.filter((d) => d.active).length;

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
          Unsubscribe
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>
          RFC 8058 one-click unsubscribe endpoints and suppression list
          management
        </p>
      </div>

      {/* Feature cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 14,
        }}
      >
        {[
          {
            icon: Shield,
            color: "#10B981",
            bg: "rgba(16,185,129,0.1)",
            title: "RFC 8058 Compliant",
            desc: "One-click POST handler meeting Gmail and Yahoo requirements",
          },
          {
            icon: Zap,
            color: "#2563EB",
            bg: "rgba(37,99,235,0.1)",
            title: "Global Edge Delivery",
            desc: "Hosted on Cloudflare Workers — zero cold starts worldwide",
          },
          {
            icon: Globe,
            color: "#8B5CF6",
            bg: "rgba(139,92,246,0.1)",
            title: "Auto Suppression",
            desc: "Unsubscribes are recorded and suppressed automatically",
          },
        ].map((item) => (
          <div
            key={item.title}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: "18px 20px",
              display: "flex",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 11,
                background: item.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <item.icon size={18} color={item.color} />
            </div>
            <div>
              <p
                style={{
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: "var(--text)",
                }}
              >
                {item.title}
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-3)",
                  marginTop: 4,
                  lineHeight: 1.5,
                }}
              >
                {item.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Stats row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 14,
        }}
      >
        {[
          {
            label: "Active Endpoints",
            value: activeEndpoints,
            color: "#10B981",
          },
          { label: "Unsubscribes (7d)", value: totalUnsubs, color: "#2563EB" },
          { label: "Suppressed Emails", value: "1,247", color: "#8B5CF6" },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: "18px 22px",
            }}
          >
            <p
              style={{
                fontSize: 28,
                fontWeight: 800,
                fontFamily: "var(--font-mono)",
                color: item.color,
              }}
            >
              {item.value}
            </p>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-2)",
                marginTop: 4,
                fontWeight: 500,
              }}
            >
              {item.label}
            </p>
          </div>
        ))}
      </div>

      {/* Endpoints table */}
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
            padding: "16px 22px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
              Unsubscribe Endpoints
            </h2>
            <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
              Copy the endpoint URL and add it to your List-Unsubscribe headers
            </p>
          </div>
        </div>

        {DOMAINS_WITH_UNSUB.map((d) => (
          <div
            key={d.domain}
            style={{
              padding: "16px 22px",
              borderBottom: "1px solid var(--border)",
              transition: "background 0.12s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.background =
                "var(--surface-2)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.background =
                "transparent";
            }}
          >
            <div className="flex items-center gap-4">
              {/* Domain */}
              <div style={{ width: 160, flexShrink: 0 }}>
                <p
                  style={{
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: "var(--text)",
                  }}
                >
                  {d.domain}
                </p>
                <p
                  style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}
                >
                  {d.unsubs7d} unsubs this week
                </p>
              </div>

              {/* Status */}
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  padding: "3px 9px",
                  borderRadius: 999,
                  background: d.active
                    ? "rgba(16,185,129,0.1)"
                    : "rgba(239,68,68,0.1)",
                  color: d.active ? "#10B981" : "#EF4444",
                  flexShrink: 0,
                }}
              >
                {d.active ? "● Active" : "○ Inactive"}
              </span>

              {/* Endpoint URL */}
              {d.endpoint ? (
                <div className="flex items-center gap-2 flex-1">
                  <code
                    style={{
                      flex: 1,
                      fontSize: 11.5,
                      fontFamily: "var(--font-mono)",
                      color: "var(--text-2)",
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      borderRadius: 7,
                      padding: "6px 10px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {d.endpoint}
                  </code>
                  <button
                    onClick={() => copyToClipboard(d.endpoint!, d.domain)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
                      color: copied === d.domain ? "#10B981" : "var(--text-2)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {copied === d.domain ? (
                      <Check size={13} />
                    ) : (
                      <Copy size={13} />
                    )}
                  </button>
                  <button
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
                      color: "var(--text-2)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ExternalLink size={13} />
                  </button>
                </div>
              ) : (
                <button
                  className="flex items-center gap-1.5"
                  style={{
                    padding: "6px 14px",
                    borderRadius: 8,
                    background: "linear-gradient(135deg, #2563EB, #7C3AED)",
                    color: "white",
                    border: "none",
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  <Plus size={12} /> Enable Endpoint
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Recent unsubscribe events */}
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
            padding: "16px 22px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
              Recent Unsubscribe Events
            </h2>
            <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
              Email addresses are SHA-256 hashed — never stored in plain text
            </p>
          </div>
          <button
            className="flex items-center gap-1.5"
            style={{
              height: 32,
              padding: "0 12px",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              color: "var(--text-2)",
              fontFamily: "var(--font-sans)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Download size={13} />
            Export CSV
          </button>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr
              style={{
                borderBottom: "1px solid var(--border)",
                background: "var(--surface-2)",
              }}
            >
              {["Email (hashed)", "Domain", "Method", "Source", "Time"].map(
                (h) => (
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
                    }}
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {UNSUB_EVENTS.map((e) => (
              <tr
                key={e.id}
                style={{
                  borderBottom: "1px solid var(--border)",
                  transition: "background 0.12s",
                }}
                onMouseEnter={(ev) => {
                  (ev.currentTarget as HTMLTableRowElement).style.background =
                    "var(--surface-2)";
                }}
                onMouseLeave={(ev) => {
                  (ev.currentTarget as HTMLTableRowElement).style.background =
                    "transparent";
                }}
              >
                <td style={{ padding: "13px 22px" }}>
                  <code
                    style={{
                      fontSize: 12,
                      fontFamily: "var(--font-mono)",
                      color: "var(--text-2)",
                    }}
                  >
                    {e.emailHash}
                  </code>
                </td>
                <td style={{ padding: "13px 22px" }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--text)",
                    }}
                  >
                    {e.domain}
                  </span>
                </td>
                <td style={{ padding: "13px 22px" }}>
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      padding: "3px 8px",
                      borderRadius: 999,
                      background:
                        e.method === "one_click"
                          ? "rgba(37,99,235,0.1)"
                          : "var(--surface-2)",
                      color:
                        e.method === "one_click" ? "#2563EB" : "var(--text-3)",
                    }}
                  >
                    {e.method === "one_click" ? "⚡ One-click" : "Manual"}
                  </span>
                </td>
                <td style={{ padding: "13px 22px" }}>
                  <span style={{ fontSize: 13, color: "var(--text-2)" }}>
                    {e.source}
                  </span>
                </td>
                <td style={{ padding: "13px 22px" }}>
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--text-3)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {e.time}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
