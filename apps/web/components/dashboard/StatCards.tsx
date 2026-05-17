"use client";
import {
  Globe,
  ShieldCheck,
  AlertTriangle,
  Mail,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

const STATS = [
  {
    label: "Total Domains",
    value: "12",
    trend: "+2 this month",
    up: true,
    icon: Globe,
    gradient: "linear-gradient(135deg, #0EA5E9 0%, #2563EB 100%)",
    shadow: "rgba(14,165,233,0.35)",
  },
  {
    label: "Healthy Domains",
    value: "8",
    trend: "67% of total",
    up: true,
    icon: ShieldCheck,
    gradient: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
    shadow: "rgba(16,185,129,0.35)",
  },
  {
    label: "Active Alerts",
    value: "3",
    trend: "2 critical",
    up: false,
    icon: AlertTriangle,
    gradient: "linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)",
    shadow: "rgba(245,158,11,0.35)",
  },
  {
    label: "Unsubscribes (7d)",
    value: "142",
    trend: "−8% vs last week",
    up: true,
    icon: Mail,
    gradient: "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)",
    shadow: "rgba(139,92,246,0.35)",
  },
];

export default function StatCards() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 16,
      }}
    >
      {STATS.map((stat) => {
        const Icon = stat.icon;
        const Trend = stat.up ? TrendingUp : TrendingDown;
        return (
          <div
            key={stat.label}
            style={{
              borderRadius: 16,
              padding: "22px 20px",
              background: stat.gradient,
              boxShadow: `0 8px 24px ${stat.shadow}`,
              cursor: "default",
              transition: "transform 0.2s, box-shadow 0.2s",
              position: "relative",
              overflow: "hidden",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLDivElement;
              el.style.transform = "translateY(-3px)";
              el.style.boxShadow = `0 14px 32px ${stat.shadow}`;
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLDivElement;
              el.style.transform = "translateY(0)";
              el.style.boxShadow = `0 8px 24px ${stat.shadow}`;
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -20,
                right: -20,
                width: 100,
                height: 100,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.08)",
              }}
            />
            <div
              className="flex items-start justify-between"
              style={{ marginBottom: 16 }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={19} color="white" strokeWidth={2} />
              </div>
              <div
                className="flex items-center gap-1"
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.9)",
                  background: "rgba(255,255,255,0.15)",
                  padding: "3px 8px",
                  borderRadius: 8,
                }}
              >
                <Trend size={11} strokeWidth={2.5} />
                {stat.trend}
              </div>
            </div>
            <p
              style={{
                fontSize: 34,
                fontWeight: 800,
                color: "white",
                letterSpacing: "-0.5px",
                fontFamily: "var(--font-mono)",
                lineHeight: 1,
              }}
            >
              {stat.value}
            </p>
            <p
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.8)",
                fontWeight: 500,
                marginTop: 6,
              }}
            >
              {stat.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}
