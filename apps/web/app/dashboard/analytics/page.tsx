// const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
"use client";
const SCORE_HISTORY = [
  { month: "Jan", avg: 62 },
  { month: "Feb", avg: 68 },
  { month: "Mar", avg: 71 },
  { month: "Apr", avg: 75 },
  { month: "May", avg: 83 },
  { month: "Jun", avg: 79 },
  { month: "Jul", avg: 84 },
  { month: "Aug", avg: 88 },
  { month: "Sep", avg: 85 },
  { month: "Oct", avg: 90 },
  { month: "Nov", avg: 87 },
  { month: "Dec", avg: 92 },
];

const DOMAIN_TRENDS = [
  { domain: "acme.com", trend: "up", change: "+12", current: 95 },
  { domain: "newsletter.dev", trend: "up", change: "+8", current: 88 },
  { domain: "techcorp.io", trend: "up", change: "+5", current: 78 },
  { domain: "agency.xyz", trend: "down", change: "-3", current: 61 },
  { domain: "startup.co", trend: "down", change: "-18", current: 42 },
];

const UNSUB_STATS = [
  { week: "W1", count: 23 },
  { week: "W2", count: 31 },
  { week: "W3", count: 19 },
  { week: "W4", count: 45 },
  { week: "W5", count: 38 },
  { week: "W6", count: 52 },
  { week: "W7", count: 29 },
  { week: "W8", count: 41 },
];

function barColor(score: number) {
  if (score >= 80) return "#10B981";
  if (score >= 60) return "#F59E0B";
  return "#EF4444";
}

const maxScore = Math.max(...SCORE_HISTORY.map((d) => d.avg));
const maxUnsub = Math.max(...UNSUB_STATS.map((d) => d.count));

export default function AnalyticsPage() {
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
          Analytics
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>
          Deliverability trends and historical compliance data
        </p>
      </div>

      {/* KPI row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
        }}
      >
        {[
          {
            label: "Avg Health Score",
            value: "83",
            sub: "+21 pts since Jan",
            color: "#10B981",
          },
          {
            label: "Total Scans Run",
            value: "1,847",
            sub: "Last 12 months",
            color: "#2563EB",
          },
          {
            label: "Issues Detected",
            value: "34",
            sub: "12 auto-resolved",
            color: "#F59E0B",
          },
          {
            label: "Total Unsubscribes",
            value: "278",
            sub: "Last 8 weeks",
            color: "#8B5CF6",
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: "18px 20px",
            }}
          >
            <p
              style={{
                fontSize: 30,
                fontWeight: 800,
                fontFamily: "var(--font-mono)",
                color: kpi.color,
              }}
            >
              {kpi.value}
            </p>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text)",
                marginTop: 4,
              }}
            >
              {kpi.label}
            </p>
            <p style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 3 }}>
              {kpi.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Two charts side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Health score trend */}
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
              Average Health Score
            </h2>
            <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
              Monthly average across all domains — 2025
            </p>
          </div>
          <div style={{ padding: "20px 22px" }}>
            <div className="flex items-end gap-2" style={{ height: 120 }}>
              {SCORE_HISTORY.map((d) => (
                <div
                  key={d.month}
                  className="flex flex-col items-center flex-1"
                  style={{ height: "100%", justifyContent: "flex-end", gap: 4 }}
                >
                  <div
                    title={`${d.month}: ${d.avg}/100`}
                    style={{
                      width: "100%",
                      height: `${(d.avg / maxScore) * 100}%`,
                      background: barColor(d.avg),
                      borderRadius: "4px 4px 0 0",
                      minHeight: 4,
                      cursor: "pointer",
                      transition: "opacity 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.opacity =
                        "0.75";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.opacity = "1";
                    }}
                  />
                  <span
                    style={{
                      fontSize: 9,
                      color: "var(--text-3)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {d.month}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Unsubscribe trend */}
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
              Unsubscribe Volume
            </h2>
            <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
              Weekly unsubscribe events — last 8 weeks
            </p>
          </div>
          <div style={{ padding: "20px 22px" }}>
            <div className="flex items-end gap-2" style={{ height: 120 }}>
              {UNSUB_STATS.map((d) => (
                <div
                  key={d.week}
                  className="flex flex-col items-center flex-1"
                  style={{ height: "100%", justifyContent: "flex-end", gap: 4 }}
                >
                  <div
                    title={`${d.week}: ${d.count}`}
                    style={{
                      width: "100%",
                      height: `${(d.count / maxUnsub) * 100}%`,
                      background: "linear-gradient(180deg, #8B5CF6, #2563EB)",
                      borderRadius: "4px 4px 0 0",
                      minHeight: 4,
                      cursor: "pointer",
                      transition: "opacity 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.opacity =
                        "0.75";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.opacity = "1";
                    }}
                  />
                  <span
                    style={{
                      fontSize: 9,
                      color: "var(--text-3)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {d.week}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Domain performance table */}
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
            Domain Performance
          </h2>
          <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
            Score changes over the last 30 days
          </p>
        </div>

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
                "Current Score",
                "30-day Change",
                "Trend",
                "Status",
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
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DOMAIN_TRENDS.map((d) => (
              <tr
                key={d.domain}
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
                  <span
                    style={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: "var(--text)",
                    }}
                  >
                    {d.domain}
                  </span>
                </td>
                <td style={{ padding: "14px 22px" }}>
                  <div className="flex items-center gap-2">
                    <div
                      style={{
                        flex: 1,
                        height: 5,
                        background: "var(--border)",
                        borderRadius: 999,
                        overflow: "hidden",
                        maxWidth: 80,
                      }}
                    >
                      <div
                        style={{
                          width: `${d.current}%`,
                          height: "100%",
                          background: barColor(d.current),
                          borderRadius: 999,
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        fontFamily: "var(--font-mono)",
                        color: barColor(d.current),
                      }}
                    >
                      {d.current}
                    </span>
                  </div>
                </td>
                <td style={{ padding: "14px 22px" }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      fontFamily: "var(--font-mono)",
                      color: d.trend === "up" ? "#10B981" : "#EF4444",
                    }}
                  >
                    {d.change} pts
                  </span>
                </td>
                <td style={{ padding: "14px 22px" }}>
                  <span style={{ fontSize: 16 }}>
                    {d.trend === "up" ? "📈" : "📉"}
                  </span>
                </td>
                <td style={{ padding: "14px 22px" }}>
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      padding: "3px 9px",
                      borderRadius: 999,
                      background:
                        d.current >= 80
                          ? "rgba(16,185,129,0.1)"
                          : d.current >= 60
                            ? "rgba(245,158,11,0.1)"
                            : "rgba(239,68,68,0.1)",
                      color:
                        d.current >= 80
                          ? "#10B981"
                          : d.current >= 60
                            ? "#F59E0B"
                            : "#EF4444",
                    }}
                  >
                    {d.current >= 80
                      ? "Healthy"
                      : d.current >= 60
                        ? "Warning"
                        : "Critical"}
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
