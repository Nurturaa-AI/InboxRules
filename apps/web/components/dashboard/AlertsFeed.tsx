"use client";
import { ChevronRight } from "lucide-react";

const ALERTS = [
  {
    id: "1",
    type: "critical",
    title: "SPF Lookup Limit Exceeded",
    domain: "startup.co",
    time: "5m ago",
  },
  {
    id: "2",
    type: "warning",
    title: "DMARC Policy is p=none",
    domain: "techcorp.io",
    time: "2h ago",
  },
  {
    id: "3",
    type: "warning",
    title: "Weak 1024-bit DKIM Key",
    domain: "agency.xyz",
    time: "6h ago",
  },
  {
    id: "4",
    type: "info",
    title: "DKIM Selector Rotated",
    domain: "acme.com",
    time: "1d ago",
  },
];

const TYPE_STYLES: Record<string, { dot: string; bg: string }> = {
  critical: { dot: "#EF4444", bg: "rgba(239,68,68,0.1)" },
  warning: { dot: "#F59E0B", bg: "rgba(245,158,11,0.1)" },
  info: { dot: "#3B82F6", bg: "rgba(59,130,246,0.1)" },
};

export default function AlertsFeed() {
  return (
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
          padding: "16px 20px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
            Recent Alerts
          </h2>
          <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
            3 unresolved issues
          </p>
        </div>
        <span
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: "#2563EB",
            cursor: "pointer",
          }}
        >
          View all
        </span>
      </div>
      {ALERTS.map((alert) => {
        const s = TYPE_STYLES[alert.type] ?? TYPE_STYLES.info;
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
                {alert.title}
              </p>
              <p
                style={{
                  fontSize: 11.5,
                  color: "var(--text-3)",
                  fontFamily: "var(--font-mono)",
                  marginTop: 2,
                }}
              >
                {alert.domain}
              </p>
            </div>
            <div
              className="flex flex-col items-end gap-1"
              style={{ flexShrink: 0 }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-3)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {alert.time}
              </span>
              <ChevronRight size={12} color="var(--text-3)" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
