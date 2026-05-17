"use client";

import { usePathname } from "next/navigation";
import { Sun, Moon, Bell, Search, Plus } from "lucide-react";

interface Props {
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

const PAGE_META: Record<string, { title: string; sub: string }> = {
  "/dashboard": {
    title: "Dashboard",
    sub: "Your email compliance and deliverability overview",
  },
  "/dashboard/domains": {
    title: "Domains",
    sub: "Manage and monitor your sending domains",
  },
  "/dashboard/compliance": {
    title: "Compliance",
    sub: "SPF, DKIM, and DMARC status across all domains",
  },
  "/dashboard/unsubscribe": {
    title: "Unsubscribe",
    sub: "RFC 8058 hosted endpoint and suppression list",
  },
  "/dashboard/alerts": {
    title: "Alerts",
    sub: "DNS change events and compliance issues",
  },
  "/dashboard/analytics": {
    title: "Analytics",
    sub: "Deliverability trends and historical data",
  },
  "/dashboard/billing": {
    title: "Billing",
    sub: "Subscription, usage, and invoices",
  },
  "/dashboard/settings": {
    title: "Settings",
    sub: "Account preferences and integrations",
  },
};

const btnBase: React.CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--text-2)",
};

export default function Header({ theme, onToggleTheme }: Props) {
  const pathname = usePathname();
  const meta = PAGE_META[pathname] ?? PAGE_META["/dashboard"];
  const isDark = theme === "dark";

  return (
    <header
      className="flex items-center gap-4 shrink-0"
      style={{
        height: 65,
        padding: "0 24px",
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div style={{ flex: 1 }}>
        <h1
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: "var(--text)",
            letterSpacing: "-0.4px",
            lineHeight: 1,
          }}
        >
          {meta.title}
        </h1>
        <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>
          {meta.sub}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <div
          className="hidden md:flex items-center gap-2"
          style={{
            height: 38,
            padding: "0 13px",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            width: 220,
          }}
        >
          <Search size={14} style={{ color: "var(--text-3)", flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search domains..."
            style={{
              background: "none",
              border: "none",
              outline: "none",
              fontSize: 13,
              color: "var(--text)",
              fontFamily: "var(--font-sans)",
              width: "100%",
            }}
          />
        </div>

        <button
          onClick={onToggleTheme}
          style={btnBase}
          title={isDark ? "Light mode" : "Dark mode"}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button style={{ ...btnBase, position: "relative" }}>
          <Bell size={16} />
          <span
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              width: 7,
              height: 7,
              background: "#EF4444",
              borderRadius: "50%",
              border: "2px solid var(--surface)",
            }}
          />
        </button>

        <button
          className="flex items-center gap-1.5"
          style={{
            height: 38,
            padding: "0 16px",
            background: "linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)",
            color: "white",
            border: "none",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
            boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
            whiteSpace: "nowrap",
          }}
        >
          <Plus size={14} strokeWidth={2.5} />
          Add Domain
        </button>
      </div>
    </header>
  );
}
