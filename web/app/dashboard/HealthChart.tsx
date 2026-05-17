// Mini bar chart showing domain health scores over time.
// Uses recharts which is already installed.

"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// Mock weekly scan data
const DATA = [
  { day: "Mon", score: 82 },
  { day: "Tue", score: 85 },
  { day: "Wed", score: 78 },
  { day: "Thu", score: 71 },
  { day: "Fri", score: 88 },
  { day: "Sat", score: 90 },
  { day: "Sun", score: 87 },
];

// Color each bar based on its score
function barColor(score: number) {
  if (score >= 80) return "#16A34A";
  if (score >= 60) return "#D97706";
  return "#DC2626";
}

// Custom tooltip shown on hover
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div
      className="bg-card border border-border rounded-lg px-3 py-2
                    shadow-lg text-[12px]"
    >
      <p className="font-bold text-foreground">{label}</p>
      <p className="text-muted-foreground">
        Avg score:{" "}
        <span className="font-bold text-foreground font-mono">
          {payload[0].value}
        </span>
      </p>
    </div>
  );
}

export default function HealthChart() {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-[14px] font-bold tracking-tight">
          Avg Health Score
        </h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Last 7 days across all domains
        </p>
      </div>

      {/* Chart */}
      <div className="px-4 py-4">
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={DATA} barCategoryGap="30%">
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip content={<CustomTooltip />} cursor={false} />
            <Bar dataKey="score" radius={[4, 4, 0, 0]}>
              {DATA.map((entry, i) => (
                <Cell key={i} fill={barColor(entry.score)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex gap-4 mt-2 justify-center">
          {[
            { color: "bg-green-500", label: "Healthy (80+)" },
            { color: "bg-amber-500", label: "Warning (60+)" },
            { color: "bg-red-500", label: "Critical (<60)" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-sm ${item.color}`} />
              <span className="text-[11px] text-muted-foreground font-medium">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
