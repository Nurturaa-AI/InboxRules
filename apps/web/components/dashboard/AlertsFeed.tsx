"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { ChevronRight, RefreshCw } from "lucide-react";

interface AlertEvent {
  id: string;
  changeType: string;
  severity: string;
  aiTitle: string | null;
  acknowledged: boolean;
  detectedAt: string;
  domain: { domain: string };
}

const TYPE_STYLES: Record<string, { dot: string; bg: string }> = {
  critical: { dot: "#EF4444", bg: "rgba(239,68,68,0.1)" },
  warning: { dot: "#F59E0B", bg: "rgba(245,158,11,0.1)" },
  info: { dot: "#3B82F6", bg: "rgba(59,130,246,0.1)" },
};

const CHANGE_LABELS: Record<string, string> = {
  spf_lookup_exceeded: "SPF Lookup Limit Exceeded",
  spf_record_changed: "SPF Record Changed",
  dmarc_policy_weakened: "DMARC Policy Weakened",
  dmarc_record_removed: "DMARC Record Removed",
  dkim_removed: "DKIM Selector Removed",
  dkim_key_rotated: "DKIM Key Rotated",
};

function timeAgo(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4500";

export default function AlertsFeed() {
  const { getToken } = useAuth();
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // useCallback so useEffect dependency is stable
  const fetchAlerts = useCallback(async () => {
    try {
      await Promise.resolve();
      setLoading(true);
      const token = await getToken();
      if (!token) return;
      const response = await fetch(
        `${API_URL}/api/v1/alerts?status=unresolved&limit=4`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!response.ok) return;
      const data = await response.json();
      // Handle both { data: [] } and { items: [] } shapes
      setAlerts(data.data || data.items || []);
    } catch {
      // fail silently — show empty state
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    let isActive = true;

    Promise.resolve().then(() => {
      if (isActive) {
        void fetchAlerts();
      }
    });

    return () => {
      isActive = false;
    };
  }, [fetchAlerts]);

  async function acknowledgeAlert(id: string) {
    try {
      const token = await getToken();
      if (!token) return;
      await fetch(`${API_URL}/api/v1/alerts/${id}/acknowledge`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch {
      // fail silently
    }
  }

  const unresolvedCount = alerts.length;

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
          padding: "16px 20px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
            Recent Alerts
          </h2>
          <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
            {loading
              ? "Loading..."
              : `${unresolvedCount} unresolved issue${unresolvedCount !== 1 ? "s" : ""}`}
          </p>
        </div>
        <a
          href="/dashboard/alerts"
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: "#2563EB",
            textDecoration: "none",
          }}
        >
          View all
        </a>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ padding: 30, textAlign: "center" }}>
          <RefreshCw
            size={20}
            color="var(--text-3)"
            style={{ margin: "0 auto", animation: "spin 1s linear infinite" }}
          />
        </div>
      )}

      {/* Empty */}
      {!loading && alerts.length === 0 && (
        <div style={{ padding: "24px 20px", textAlign: "center" }}>
          <p style={{ fontSize: 24, marginBottom: 8 }}>✅</p>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
            No unresolved alerts
          </p>
          <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>
            All your domains are looking good
          </p>
        </div>
      )}

      {/* Alert items */}
      {!loading &&
        alerts.map((alert) => {
          const s = TYPE_STYLES[alert.severity] ?? TYPE_STYLES.info;
          const title =
            alert.aiTitle ||
            CHANGE_LABELS[alert.changeType] ||
            alert.changeType;

          return (
            <div
              key={alert.id}
              className="flex items-center gap-3"
              style={{
                padding: "13px 20px",
                borderBottom: "1px solid var(--border)",
                cursor: "pointer",
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
              {/* Severity indicator */}
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: s.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: s.dot,
                  }}
                />
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {title}
                </p>
                <p
                  style={{
                    fontSize: 11.5,
                    color: "var(--text-3)",
                    fontFamily: "var(--font-mono)",
                    marginTop: 2,
                  }}
                >
                  {alert.domain?.domain} · {timeAgo(alert.detectedAt)}
                </p>
              </div>

              {/* Acknowledge */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  acknowledgeAlert(alert.id);
                }}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "3px 8px",
                  borderRadius: 6,
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--text-3)",
                  cursor: "pointer",
                  flexShrink: 0,
                  fontFamily: "var(--font-sans)",
                }}
              >
                Ack
              </button>

              <ChevronRight
                size={12}
                color="var(--text-3)"
                style={{ flexShrink: 0 }}
              />
            </div>
          );
        })}
    </div>
  );
}
