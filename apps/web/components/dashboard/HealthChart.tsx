"use client";
const DATA = [
  { day: "Mon", score: 82 },
  { day: "Tue", score: 85 },
  { day: "Wed", score: 78 },
  { day: "Thu", score: 71 },
  { day: "Fri", score: 88 },
  { day: "Sat", score: 90 },
  { day: "Sun", score: 87 },
];

function barColor(score: number) {
  if (score >= 80) return "#10B981";
  if (score >= 60) return "#F59E0B";
  return "#EF4444";
}

export default function HealthChart() {
  const avg = Math.round(DATA.reduce((a, d) => a + d.score, 0) / DATA.length);
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
            Health Trend
          </h2>
          <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
            7-day average
          </p>
        </div>
        <div
          style={{
            padding: "4px 11px",
            borderRadius: 9,
            background: "rgba(16,185,129,0.12)",
            color: "#10B981",
            fontSize: 13,
            fontWeight: 700,
            fontFamily: "var(--font-mono)",
          }}
        >
          {avg}/100
        </div>
      </div>
      <div style={{ padding: 20 }}>
        <div className="flex items-end gap-2" style={{ height: 100 }}>
          {DATA.map((d) => (
            <div
              key={d.day}
              className="flex flex-col items-center flex-1 gap-1"
              style={{ height: "100%", justifyContent: "flex-end" }}
            >
              <div
                title={`${d.day}: ${d.score}/100`}
                style={{
                  width: "100%",
                  height: `${d.score}%`,
                  background: barColor(d.score),
                  borderRadius: "5px 5px 0 0",
                  cursor: "pointer",
                  minHeight: 4,
                  transition: "opacity 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.opacity = "0.75";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.opacity = "1";
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  color: "var(--text-3)",
                  fontFamily: "var(--font-mono)",
                  marginTop: 5,
                }}
              >
                {d.day}
              </span>
            </div>
          ))}
        </div>
        <div
          className="flex gap-4 justify-center flex-wrap"
          style={{ marginTop: 14 }}
        >
          {[
            { color: "#10B981", label: "Healthy" },
            { color: "#F59E0B", label: "Warning" },
            { color: "#EF4444", label: "Critical" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  background: item.color,
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-2)",
                  fontWeight: 500,
                }}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
