"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { Check, Zap, Building, Users, RefreshCw } from "lucide-react";
import { useApiQuery } from "@/lib/useApiQuery";

// ── Types ──
interface Subscription {
  plan: string;
  customerId: string | null;
  usage: {
    domains: { used: number; limit: number };
    checksPerDay: number;
    aiFeatures: boolean;
  };
}

interface Usage {
  domains: number;
  scans: number;
  aiCalls: number;
  aiCostUsd: number;
  suppressions: number;
}

interface BillingResponse {
  subscription: Subscription;
  usage: Usage;
}

// ── Plans ──
const PLANS = [
  {
    name: "Free",
    price: { monthly: "$0", annual: "$0" },
    period: "forever",
    description: "For individuals testing compliance",
    color: "#64748B",
    gradient: "linear-gradient(135deg, #475569, #334155)",
    variantKey: null as string | null,
    features: [
      "3 domains",
      "24h DNS monitoring",
      "Basic compliance check",
      "Community support",
    ],
  },
  {
    name: "Pro",
    price: { monthly: "$49", annual: "$39" },
    period: "per month",
    description: "For businesses sending at scale",
    color: "#2563EB",
    gradient: "linear-gradient(135deg, #2563EB, #7C3AED)",
    variantKey: "pro",
    features: [
      "50 domains",
      "6h DNS monitoring",
      "AI-powered explanations",
      "Hosted unsubscribe endpoint",
      "Slack + email alerts",
      "API access",
      "Priority support",
    ],
  },
  {
    name: "Agency",
    price: { monthly: "$199", annual: "$159" },
    period: "per month",
    description: "For agencies managing multiple clients",
    color: "#D97706",
    gradient: "linear-gradient(135deg, #D97706, #EA580C)",
    variantKey: "agency",
    features: [
      "500 domains",
      "1h DNS monitoring",
      "Everything in Pro",
      "White-label dashboard",
      "Client management",
      "Custom unsub domain",
      "SLA guarantee",
    ],
  },
];

const PLAN_LIMITS: Record<string, number> = { free: 3, pro: 50, agency: 500 };

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4500";

export default function BillingPage() {
  const { getToken } = useAuth();

  // Fetch billing data — returns { subscription, usage } inside data
  const { data, loading, refetch } = useApiQuery<BillingResponse>("/billing");

  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(
    "monthly",
  );
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const plan = data?.subscription?.plan ?? "free";
  const usage = data?.usage;
  const domainLimit = PLAN_LIMITS[plan] ?? 3;

  // ── Upgrade to paid plan ──
  const handleUpgrade = useCallback(
    async (planKey: string) => {
      setUpgrading(planKey);
      try {
        const token = await getToken();
        if (!token) throw new Error("Not authenticated");

        const response = await fetch(`${API_URL}/api/v1/billing/checkout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ plan: planKey }),
        });

        const json = (await response.json()) as {
          data?: { checkoutUrl?: string };
          error?: { message?: string };
        };

        if (!response.ok) {
          throw new Error(json.error?.message ?? "Failed to create checkout");
        }

        const checkoutUrl = json.data?.checkoutUrl;
        if (checkoutUrl) {
          window.location.href = checkoutUrl;
        }
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Failed to create checkout");
      } finally {
        setUpgrading(null);
      }
    },
    [getToken],
  );

  // ── Open Lemon Squeezy customer portal ──
  const handleManagePortal = useCallback(async () => {
    setPortalLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(`${API_URL}/api/v1/billing/portal`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = (await response.json()) as {
        data?: { portalUrl?: string };
        error?: { message?: string };
      };

      if (!response.ok) {
        throw new Error(json.error?.message ?? "No active subscription found");
      }

      const portalUrl = json.data?.portalUrl;
      if (portalUrl) {
        window.open(portalUrl, "_blank");
      }
    } catch (err: unknown) {
      alert(
        err instanceof Error ? err.message : "Failed to open billing portal",
      );
    } finally {
      setPortalLoading(false);
    }
  }, [getToken]);

  // ── Loading state ──
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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
        <div style={{ padding: 80, textAlign: "center" }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: "3px solid var(--border)",
              borderTopColor: "#2563EB",
              animation: "spin 1s linear infinite",
              margin: "0 auto",
            }}
          />
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 16 }}>
            Loading billing information...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
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
        <button
          onClick={refetch}
          style={{
            width: 36,
            height: 36,
            borderRadius: 9,
            border: "1px solid var(--border)",
            background: "var(--surface-2)",
            cursor: "pointer",
            color: "var(--text-3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* ── Current plan banner ── */}
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
              textTransform: "capitalize",
            }}
          >
            {plan} Plan
          </p>
          <p
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: 13,
              marginTop: 6,
            }}
          >
            {plan === "free"
              ? "Free forever — upgrade to unlock more domains"
              : "Billed monthly via Lemon Squeezy"}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
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
              {usage?.domains ?? 0} / {domainLimit}
            </p>
          </div>

          {plan !== "free" && (
            <button
              onClick={handleManagePortal}
              disabled={portalLoading}
              style={{
                padding: "10px 20px",
                background: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: 10,
                color: "white",
                fontSize: 13.5,
                fontWeight: 600,
                cursor: portalLoading ? "wait" : "pointer",
                fontFamily: "var(--font-sans)",
              }}
            >
              {portalLoading ? "Loading..." : "Manage Subscription"}
            </button>
          )}
        </div>
      </div>

      {/* ── Usage stats ── */}
      {usage && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 14,
          }}
        >
          {[
            {
              label: "Domains",
              used: usage.domains,
              total: domainLimit,
              color: "#2563EB",
            },
            {
              label: "Scans / mo",
              used: usage.scans,
              total: domainLimit * 30 * 4,
              color: "#10B981",
            },
            {
              label: "AI Calls",
              used: usage.aiCalls,
              total: 1000,
              color: "#8B5CF6",
            },
            {
              label: "Unsubscribes",
              used: usage.suppressions,
              total: 10000,
              color: "#F59E0B",
            },
          ].map((item) => {
            const pct = Math.min(
              100,
              item.total > 0 ? (item.used / item.total) * 100 : 0,
            );
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
                    {item.used.toLocaleString()}/{item.total.toLocaleString()}
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
                      transition: "width 0.5s ease",
                    }}
                  />
                </div>
                <p
                  style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6 }}
                >
                  {Math.round(pct)}% used this month
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Plan comparison ── */}
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
              Upgrade or downgrade anytime
            </p>
          </div>

          {/* Billing cycle toggle */}
          <div
            className="flex items-center"
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
                onClick={() => setBillingCycle(opt)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 7,
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "none",
                  fontFamily: "var(--font-sans)",
                  textTransform: "capitalize",
                  background:
                    billingCycle === opt ? "var(--surface)" : "transparent",
                  color: billingCycle === opt ? "var(--text)" : "var(--text-3)",
                  boxShadow:
                    billingCycle === opt
                      ? "0 1px 4px rgba(0,0,0,0.08)"
                      : "none",
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
                    −20%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>
          {PLANS.map((p, idx) => {
            const isCurrent = plan === p.name.toLowerCase();
            const price =
              billingCycle === "annual" ? p.price.annual : p.price.monthly;

            return (
              <div
                key={p.name}
                style={{
                  padding: 24,
                  borderRight: idx < 2 ? "1px solid var(--border)" : "none",
                  background: isCurrent
                    ? "rgba(37,99,235,0.04)"
                    : "transparent",
                  position: "relative",
                }}
              >
                {/* Current badge */}
                {isCurrent && (
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
                    Current
                  </div>
                )}

                {/* Plan icon */}
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: p.gradient,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 14,
                  }}
                >
                  {p.name === "Free" && <Zap size={18} color="white" />}
                  {p.name === "Pro" && <Users size={18} color="white" />}
                  {p.name === "Agency" && <Building size={18} color="white" />}
                </div>

                <p
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: "var(--text)",
                  }}
                >
                  {p.name}
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--text-3)",
                    marginTop: 4,
                    marginBottom: 14,
                  }}
                >
                  {p.description}
                </p>

                {/* Price */}
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
                    {price}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      color: "var(--text-3)",
                      marginBottom: 4,
                    }}
                  >
                    /{p.period}
                  </span>
                </div>

                {/* Features */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    marginBottom: 20,
                  }}
                >
                  {p.features.map((feat) => (
                    <div key={feat} className="flex items-center gap-2">
                      <Check size={13} color={p.color} strokeWidth={2.5} />
                      <span style={{ fontSize: 13, color: "var(--text-2)" }}>
                        {feat}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA button */}
                <button
                  onClick={() => {
                    if (p.variantKey && !isCurrent) handleUpgrade(p.variantKey);
                  }}
                  disabled={
                    isCurrent || !p.variantKey || upgrading === p.variantKey
                  }
                  style={{
                    width: "100%",
                    height: 38,
                    background:
                      isCurrent || !p.variantKey ? "transparent" : p.gradient,
                    border: isCurrent ? "1px solid var(--border)" : "none",
                    borderRadius: 9,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: isCurrent || !p.variantKey ? "default" : "pointer",
                    color: isCurrent ? "var(--text-2)" : "white",
                    fontFamily: "var(--font-sans)",
                    opacity: upgrading === p.variantKey ? 0.7 : 1,
                    boxShadow:
                      !isCurrent && p.variantKey
                        ? `0 4px 12px ${p.color}40`
                        : "none",
                  }}
                >
                  {upgrading === p.variantKey
                    ? "Redirecting..."
                    : isCurrent
                      ? "Current Plan"
                      : p.variantKey
                        ? "Upgrade"
                        : "Free Forever"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── AI cost breakdown ── */}
      {usage && usage.aiCostUsd > 0 && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <p
              style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}
            >
              AI Usage Cost This Month
            </p>
            <p style={{ fontSize: 12.5, color: "var(--text-3)", marginTop: 3 }}>
              {usage.aiCalls} AI calls · Gemini 2.0 Flash
            </p>
          </div>
          <p
            style={{
              fontSize: 22,
              fontWeight: 800,
              fontFamily: "var(--font-mono)",
              color: "#8B5CF6",
            }}
          >
            ${usage.aiCostUsd.toFixed(4)}
          </p>
        </div>
      )}
    </div>
  );
}
