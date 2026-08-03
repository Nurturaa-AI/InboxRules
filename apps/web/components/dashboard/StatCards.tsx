"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  Globe, ShieldCheck, AlertTriangle, Mail,
  TrendingUp, TrendingDown,
} from "lucide-react";

interface Stats {
  totalDomains:   number;
  healthyDomains: number;
  activeAlerts:   number;
  unsubscribes:   number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4500";

export default function StatCards() {
  const { getToken } = useAuth();
  const [stats,   setStats]   = useState<Stats>({
    totalDomains: 0, healthyDomains: 0,
    activeAlerts: 0, unsubscribes: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const [domainsRes, alertsRes, suppressionRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/domains?limit=100`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/v1/alerts?status=unresolved&limit=1`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/v1/suppression?limit=1`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const domainsData     = domainsRes.ok     ? await domainsRes.json()     : null;
      const alertsData      = alertsRes.ok      ? await alertsRes.json()      : null;
      const suppressionData = suppressionRes.ok ? await suppressionRes.json() : null;

      const domains = domainsData?.data || [];

      setStats({
        totalDomains:   domains.length,
        healthyDomains: domains.filter((d: { healthScore: number }) => d.healthScore >= 80).length,
        activeAlerts:   alertsData?.pagination?.total ?? 0,
        unsubscribes:   suppressionData?.pagination?.total ?? 0,
      });
    } catch {
      // keep zeros on error
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    // Avoid calling setState synchronously within an effect to prevent
    // cascading renders. Schedule the fetch asynchronously.
    void Promise.resolve().then(() => fetchStats());
  }, [fetchStats]);

  const CARDS = [
    {
      label:    "Total Domains",
      value:    loading ? "—" : String(stats.totalDomains),
      trend:    `${stats.healthyDomains} healthy`,
      up:       true,
      icon:     Globe,
      gradient: "linear-gradient(135deg, #0EA5E9 0%, #2563EB 100%)",
      shadow:   "rgba(14,165,233,0.35)",
    },
    {
      label:    "Healthy Domains",
      value:    loading ? "—" : String(stats.healthyDomains),
      trend:    stats.totalDomains > 0
        ? `${Math.round((stats.healthyDomains / stats.totalDomains) * 100)}% of total`
        : "No domains yet",
      up:       true,
      icon:     ShieldCheck,
      gradient: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
      shadow:   "rgba(16,185,129,0.35)",
    },
    {
      label:    "Active Alerts",
      value:    loading ? "—" : String(stats.activeAlerts),
      trend:    stats.activeAlerts === 0 ? "All clear" : "Need attention",
      up:       stats.activeAlerts === 0,
      icon:     AlertTriangle,
      gradient: "linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)",
      shadow:   "rgba(245,158,11,0.35)",
    },
    {
      label:    "Unsubscribes",
      value:    loading ? "—" : String(stats.unsubscribes),
      trend:    "Via hosted endpoint",
      up:       true,
      icon:     Mail,
      gradient: "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)",
      shadow:   "rgba(139,92,246,0.35)",
    },
  ];

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 16,
    }}>
      {CARDS.map((card) => {
        const Icon  = card.icon;
        const Trend = card.up ? TrendingUp : TrendingDown;

        return (
          <div
            key={card.label}
            style={{
              borderRadius: 16, padding: "22px 20px",
              background: card.gradient,
              boxShadow: `0 8px 24px ${card.shadow}`,
              position: "relative", overflow: "hidden",
              transition: "transform 0.2s, box-shadow 0.2s",
              cursor: "default",
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLDivElement;
              el.style.transform = "translateY(-3px)";
              el.style.boxShadow = `0 14px 32px ${card.shadow}`;
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLDivElement;
              el.style.transform = "translateY(0)";
              el.style.boxShadow = `0 8px 24px ${card.shadow}`;
            }}
          >
            {/* Decorative circle */}
            <div style={{
              position: "absolute", top: -20, right: -20,
              width: 100, height: 100, borderRadius: "50%",
              background: "rgba(255,255,255,0.08)",
            }} />

            {/* Top row */}
            <div className="flex items-start justify-between" style={{ marginBottom: 16 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12,
                background: "rgba(255,255,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon size={19} color="white" strokeWidth={2} />
              </div>

              <div className="flex items-center gap-1" style={{
                fontSize: 11.5, fontWeight: 600,
                color: "rgba(255,255,255,0.9)",
                background: "rgba(255,255,255,0.15)",
                padding: "3px 8px", borderRadius: 8,
              }}>
                <Trend size={11} strokeWidth={2.5} />
                {card.trend}
              </div>
            </div>

            {/* Value */}
            <p style={{
              fontSize: 34, fontWeight: 800, color: "white",
              letterSpacing: "-0.5px",
              fontFamily: "var(--font-mono)", lineHeight: 1,
            }}>
              {card.value}
            </p>

            {/* Label */}
            <p style={{
              fontSize: 13, color: "rgba(255,255,255,0.8)",
              fontWeight: 500, marginTop: 6,
            }}>
              {card.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}