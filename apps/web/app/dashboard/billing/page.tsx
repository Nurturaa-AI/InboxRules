"use client";

import { useState } from "react";
import { Check, Zap, Building, Users } from "lucide-react";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "For individuals testing compliance",
    color: "#64748B",
    gradient: "linear-gradient(135deg, #475569, #334155)",
    features: [
      "3 domains",
      "24h DNS monitoring",
      "Basic compliance check",
      "Community support",
    ],
    current: false,
  },
  {
    name: "Pro",
    price: "$49",
    period: "per month",
    description: "For businesses sending at scale",
    color: "#2563EB",
    gradient: "linear-gradient(135deg, #2563EB, #7C3AED)",
    features: [
      "50 domains",
      "6h DNS monitoring",
      "AI-powered explanations",
      "Hosted unsubscribe endpoint",
      "Slack + email alerts",
      "API access",
      "Priority support",
    ],
    current: true,
  },
  {
    name: "Agency",
    price: "$199",
    period: "per month",
    description: "For agencies managing multiple clients",
    color: "#D97706",
    gradient: "linear-gradient(135deg, #D97706, #EA580C)",
    features: [
      "500 domains",
      "1h DNS monitoring",
      "Everything in Pro",
      "White-label dashboard",
      "Client management",
      "Custom domain for unsub",
      "Dedicated support",
      "SLA guarantee",
    ],
    current: false,
  },
];

const INVOICES = [
  { id: "INV-001", date: "May 1, 2025", amount: "$49.00", status: "paid" },
  { id: "INV-002", date: "Apr 1, 2025", amount: "$49.00", status: "paid" },
  { id: "INV-003", date: "Mar 1, 2025", amount: "$49.00", status: "paid" },
  { id: "INV-004", date: "Feb 1, 2025", amount: "$49.00", status: "paid" },
];

export default function BillingPage() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

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
          Billing
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>
          Manage your subscription, usage, and invoices
        </p>
      </div>

      {/* Current plan summary */}
      <div
        style={{
          background: "linear-gradient(135deg, #2563EB, #7C3AED)",
          borderRadius: 16,
          padding: "24px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 8px 32px rgba(37,99,235,0.3)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: "absolute",
            top: -30,
            right: -30,
            width: 160,
            height: 160,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -40,
            right: 80,
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.04)",
          }}
        />

        <div>
          <p
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            Current Plan
          </p>
          <p
            style={{
              color: "white",
              fontSize: 26,
              fontWeight: 800,
              marginTop: 4,
            }}
          >
            Pro Plan
          </p>
          <p
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: 13,
              marginTop: 6,
            }}
          >
            Next billing date: June 1, 2025 · $49.00
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ textAlign: "right" }}>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>
              Domains used
            </p>
            <p
              style={{
                color: "white",
                fontSize: 22,
                fontWeight: 800,
                fontFamily: "var(--font-mono)",
              }}
            >
              12 / 50
            </p>
          </div>
          <button
            style={{
              padding: "10px 20px",
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 10,
              color: "white",
              fontSize: 13.5,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
              backdropFilter: "blur(4px)",
            }}
          >
            Manage Plan
          </button>
        </div>
      </div>

      {/* Usage stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
        }}
      >
        {[
          { label: "Domains", used: 12, total: 50, color: "#2563EB" },
          { label: "Scans / day", used: 48, total: 200, color: "#10B981" },
          { label: "API calls", used: 1240, total: 5000, color: "#8B5CF6" },
          { label: "Alerts sent", used: 7, total: 100, color: "#F59E0B" },
        ].map((item) => {
          const pct = (item.used / item.total) * 100;
          return (
            <div
              key={item.label}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: "16px 18px",
              }}
            >
              <div
                className="flex items-center justify-between"
                style={{ marginBottom: 10 }}
              >
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text)",
                  }}
                >
                  {item.label}
                </p>
                <span
                  style={{
                    fontSize: 11.5,
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    color: item.color,
                  }}
                >
                  {item.used}/{item.total}
                </span>
              </div>
              <div
                style={{
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
                    background: item.color,
                    borderRadius: 999,
                  }}
                />
              </div>
              <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6 }}>
                {Math.round(pct)}% used this month
              </p>
            </div>
          );
        })}
      </div>

      {/* Plan comparison */}
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
              Plans
            </h2>
            <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
              Upgrade or downgrade at any time
            </p>
          </div>
          {/* Billing toggle */}
          <div
            className="flex items-center gap-2"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 9,
              padding: 3,
            }}
          >
            {(["monthly", "annual"] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setBilling(opt)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 7,
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "none",
                  fontFamily: "var(--font-sans)",
                  background:
                    billing === opt ? "var(--surface)" : "transparent",
                  color: billing === opt ? "var(--text)" : "var(--text-3)",
                  boxShadow:
                    billing === opt ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                  textTransform: "capitalize",
                }}
              >
                {opt}
                {opt === "annual" && (
                  <span
                    style={{
                      marginLeft: 4,
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#10B981",
                    }}
                  >
                    -20%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 0,
          }}
        >
          {PLANS.map((plan, idx) => (
            <div
              key={plan.name}
              style={{
                padding: "24px",
                borderRight: idx < 2 ? "1px solid var(--border)" : "none",
                position: "relative",
                background: plan.current
                  ? "rgba(37,99,235,0.04)"
                  : "transparent",
              }}
            >
              {plan.current && (
                <div
                  style={{
                    position: "absolute",
                    top: 16,
                    right: 16,
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "rgba(37,99,235,0.1)",
                    color: "#2563EB",
                  }}
                >
                  Current Plan
                </div>
              )}

              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: plan.gradient,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 14,
                }}
              >
                {plan.name === "Free" && <Zap size={18} color="white" />}
                {plan.name === "Pro" && <Users size={18} color="white" />}
                {plan.name === "Agency" && <Building size={18} color="white" />}
              </div>

              <p
                style={{ fontSize: 16, fontWeight: 800, color: "var(--text)" }}
              >
                {plan.name}
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-3)",
                  marginTop: 4,
                  marginBottom: 14,
                }}
              >
                {plan.description}
              </p>

              <div
                className="flex items-end gap-1"
                style={{ marginBottom: 18 }}
              >
                <span
                  style={{
                    fontSize: 30,
                    fontWeight: 800,
                    fontFamily: "var(--font-mono)",
                    color: "var(--text)",
                  }}
                >
                  {billing === "annual" && plan.price !== "$0"
                    ? `$${Math.round(parseInt(plan.price.slice(1)) * 0.8)}`
                    : plan.price}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    color: "var(--text-3)",
                    marginBottom: 4,
                  }}
                >
                  /{plan.period}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  marginBottom: 20,
                }}
              >
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-2">
                    <Check size={13} color={plan.color} strokeWidth={2.5} />
                    <span style={{ fontSize: 13, color: "var(--text-2)" }}>
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              <button
                style={{
                  width: "100%",
                  height: 38,
                  background: plan.current ? "transparent" : plan.gradient,
                  border: plan.current ? `1px solid var(--border)` : "none",
                  borderRadius: 9,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  color: plan.current ? "var(--text-2)" : "white",
                  fontFamily: "var(--font-sans)",
                  boxShadow: !plan.current
                    ? `0 4px 12px ${plan.color}40`
                    : "none",
                }}
              >
                {plan.current ? "Current Plan" : "Upgrade"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Invoice history */}
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
            Invoice History
          </h2>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr
              style={{
                borderBottom: "1px solid var(--border)",
                background: "var(--surface-2)",
              }}
            >
              {["Invoice", "Date", "Amount", "Status", ""].map((h) => (
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
            {INVOICES.map((inv) => (
              <tr
                key={inv.id}
                style={{ borderBottom: "1px solid var(--border)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.background =
                    "var(--surface-2)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.background =
                    "transparent";
                }}
              >
                <td style={{ padding: "13px 22px" }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontFamily: "var(--font-mono)",
                      color: "var(--text-2)",
                      fontWeight: 500,
                    }}
                  >
                    {inv.id}
                  </span>
                </td>
                <td style={{ padding: "13px 22px" }}>
                  <span style={{ fontSize: 13, color: "var(--text)" }}>
                    {inv.date}
                  </span>
                </td>
                <td style={{ padding: "13px 22px" }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--text)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {inv.amount}
                  </span>
                </td>
                <td style={{ padding: "13px 22px" }}>
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      padding: "3px 9px",
                      borderRadius: 999,
                      background: "rgba(16,185,129,0.1)",
                      color: "#10B981",
                    }}
                  >
                    ✓ Paid
                  </span>
                </td>
                <td style={{ padding: "13px 22px" }}>
                  <button
                    style={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: "#2563EB",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    Download PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
