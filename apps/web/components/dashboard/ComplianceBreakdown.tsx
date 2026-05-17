"use client";
const ITEMS = [
  {
    emoji: "📋",
    name: "SPF Records",
    desc: "Sender Policy Framework",
    pass: 9,
    total: 12,
    color: "#0EA5E9",
    bg: "rgba(14,165,233,0.1)",
  },
  {
    emoji: "🔑",
    name: "DKIM Signatures",
    desc: "DomainKeys Identified Mail",
    pass: 10,
    total: 12,
    color: "#8B5CF6",
    bg: "rgba(139,92,246,0.1)",
  },
  {
    emoji: "🛡️",
    name: "DMARC Policies",
    desc: "Domain-based Auth Reporting",
    pass: 7,
    total: 12,
    color: "#10B981",
    bg: "rgba(16,185,129,0.1)",
  },
  {
    emoji: "📧",
    name: "One-Click Unsub",
    desc: "RFC 8058 compliance",
    pass: 5,
    total: 12,
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.1)",
  },
];

export default function ComplianceBreakdown() {
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
            Compliance Breakdown
          </h2>
          <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
            Across all monitored domains
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
          Full report
        </span>
      </div>
      {ITEMS.map((item) => {
        const pct = Math.round((item.pass / item.total) * 100);
        return (
          <div
            key={item.name}
            className="flex items-center gap-3"
            style={{
              padding: "14px 20px",
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
                width: 38,
                height: 38,
                borderRadius: 10,
                background: item.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 17,
                flexShrink: 0,
              }}
            >
              {item.emoji}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="flex items-center justify-between">
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text)",
                  }}
                >
                  {item.name}
                </p>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                    color: item.color,
                  }}
                >
                  {item.pass}/{item.total}
                </span>
              </div>
              <p
                style={{
                  fontSize: 11.5,
                  color: "var(--text-3)",
                  marginTop: 2,
                  marginBottom: 6,
                }}
              >
                {item.desc}
              </p>
              <div
                style={{
                  height: 4,
                  background: "var(--border)",
                  borderRadius: 999,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    background: item.color,
                    borderRadius: 999,
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
