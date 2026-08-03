"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  Copy,
  Check,
  Download,
  Shield,
  Zap,
  Globe,
  RefreshCw,
} from "lucide-react";
import { useApiQuery } from "@/lib/useApiQuery";

type UnsubStatus = "active" | "inactive" | "disabled" | "unknown";
interface Domain {
  id: string;
  domain: string;
  unsubStatus: UnsubStatus;
}

interface SuppressionEvent {
  id: string;
  eventType: string;
  sourceEsp: string | null;
  occurredAt: string;
  domain: { domain: string };
}

function timeAgo(d: string) {
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const UNSUB_URL =
  process.env.NEXT_PUBLIC_UNSUB_URL || "https://unsub.inboxrules.io";

export default function UnsubscribePage() {
  useAuth();

  const { data: domainsData, loading: domainsLoading } =
    useApiQuery<Domain[]>("/domains?limit=100");

  const {
    data: suppressionData,
    loading: suppressionLoading,
    refetch,
  } = useApiQuery<{ items: SuppressionEvent[]; pagination: { total: number } }>(
    "/suppression?limit=20",
  );

  const [copied, setCopied] = useState<string | null>(null);

  const domains = domainsData || [];
  const events =
    suppressionData?.items ||
    (Array.isArray(suppressionData)
      ? (suppressionData as SuppressionEvent[])
      : []);
  const totalUnsubs = suppressionData?.pagination?.total || 0;
  const active = domains.filter((d) => d.unsubStatus === "active").length;

  function copyEndpoint(domainId: string) {
    const url = `${UNSUB_URL}/unsubscribe/${domainId}`;
    navigator.clipboard.writeText(url);
    setCopied(domainId);
    setTimeout(() => setCopied(null), 2000);
  }

  function copyHeaders(domain: Domain) {
    const text =
      `List-Unsubscribe: <${UNSUB_URL}/unsubscribe/${domain.id}>, ` +
      `<mailto:unsubscribe@${domain.domain}?subject=unsubscribe>\n` +
      `List-Unsubscribe-Post: List-Unsubscribe=One-Click`;
    navigator.clipboard.writeText(text);
    setCopied(`headers-${domain.id}`);
    setTimeout(() => setCopied(null), 2000);
  }

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

      {/* Stats */}
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
            value: domainsLoading ? "—" : String(active),
            color: "#10B981",
          },
          {
            label: "Unsubscribes (all)",
            value: suppressionLoading ? "—" : String(totalUnsubs),
            color: "#2563EB",
          },
          {
            label: "Total Domains",
            value: domainsLoading ? "—" : String(domains.length),
            color: "#8B5CF6",
          },
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
          style={{
            padding: "16px 22px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
            Unsubscribe Endpoints
          </h2>
          <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
            Add these URLs and headers to your email campaigns
          </p>
        </div>

        {domainsLoading ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <RefreshCw
              size={20}
              color="var(--text-3)"
              className="spin"
              style={{ margin: "0 auto" }}
            />
          </div>
        ) : domains.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <p style={{ fontSize: 14, color: "var(--text-3)" }}>
              No domains yet. Add a domain to generate unsubscribe endpoints.
            </p>
          </div>
        ) : (
          domains.map((d) => (
            <div
              key={d.id}
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
                </div>

                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    padding: "3px 9px",
                    borderRadius: 999,
                    flexShrink: 0,
                    background:
                      d.unsubStatus === "active"
                        ? "rgba(16,185,129,0.1)"
                        : "rgba(239,68,68,0.1)",
                    color: d.unsubStatus === "active" ? "#10B981" : "#EF4444",
                  }}
                >
                  {d.unsubStatus === "active" ? "● Active" : "○ Inactive"}
                </span>

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
                    {UNSUB_URL}/unsubscribe/{d.id}
                  </code>
                  <button
                    onClick={() => copyEndpoint(d.id)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
                      color: copied === d.id ? "#10B981" : "var(--text-2)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    title="Copy endpoint URL"
                  >
                    {copied === d.id ? <Check size={13} /> : <Copy size={13} />}
                  </button>
                  <button
                    onClick={() => copyHeaders(d)}
                    style={{
                      height: 32,
                      padding: "0 12px",
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
                      color:
                        copied === `headers-${d.id}`
                          ? "#10B981"
                          : "var(--text-2)",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: "var(--font-sans)",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                    title="Copy full email headers"
                  >
                    {copied === `headers-${d.id}` ? (
                      <Check size={11} />
                    ) : (
                      <Copy size={11} />
                    )}
                    Headers
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
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
              Email addresses stored as SHA-256 hashes only
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refetch}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--surface-2)",
                cursor: "pointer",
                color: "var(--text-3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <RefreshCw
                size={13}
                className={suppressionLoading ? "spin" : ""}
              />
            </button>
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
              }}
            >
              <Download size={13} /> Export CSV
            </button>
          </div>
        </div>

        {suppressionLoading ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <RefreshCw
              size={20}
              color="var(--text-3)"
              className="spin"
              style={{ margin: "0 auto" }}
            />
          </div>
        ) : events.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <p style={{ fontSize: 14, color: "var(--text-3)" }}>
              No unsubscribe events yet. Events appear here when recipients
              click unsubscribe.
            </p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid var(--border)",
                  background: "var(--surface-2)",
                }}
              >
                {["Domain", "Method", "Source", "Time"].map((h) => (
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
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
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
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: "var(--text)",
                      }}
                    >
                      {e.domain?.domain}
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
                          e.sourceEsp === "one_click"
                            ? "rgba(37,99,235,0.1)"
                            : "var(--surface-2)",
                        color:
                          e.sourceEsp === "one_click"
                            ? "#2563EB"
                            : "var(--text-3)",
                      }}
                    >
                      {e.sourceEsp === "one_click" ? "⚡ One-click" : "Manual"}
                    </span>
                  </td>
                  <td style={{ padding: "13px 22px" }}>
                    <span style={{ fontSize: 13, color: "var(--text-2)" }}>
                      {e.sourceEsp || "Unknown"}
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
                      {timeAgo(e.occurredAt)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
