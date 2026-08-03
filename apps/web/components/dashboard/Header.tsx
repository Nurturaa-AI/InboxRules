"use client";

import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Sun, Moon, Bell, Search, Plus, X, CheckCircle } from "lucide-react";

interface Props {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onAddDomain?: () => void;
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4500";

export default function Header({ theme, onToggleTheme, onAddDomain }: Props) {
  const pathname = usePathname();
  const { getToken } = useAuth();
  const meta = PAGE_META[pathname] ?? PAGE_META["/dashboard"];
  const isDark = theme === "dark";

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropRef.current &&
        !dropRef.current.contains(e.target as Node) &&
        !bellRef.current?.contains(e.target as Node)
      ) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Fetch notifications when bell is clicked
  async function handleBellClick() {
    setShowNotifications((prev) => !prev);
    if (!showNotifications) {
      setNotifLoading(true);
      try {
        const token = await getToken();
        const response = await fetch(
          `${API_URL}/api/v1/alerts?status=unresolved&limit=5`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (response.ok) {
          const data = await response.json();
          const items = data.data || data.items || [];
          setNotifications(items);
        }
      } catch {
        /* fail silently */
      } finally {
        setNotifLoading(false);
      }
    }
  }

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

  const CHANGE_LABELS: Record<string, string> = {
    spf_lookup_exceeded: "SPF Lookup Limit Exceeded",
    spf_record_changed: "SPF Record Changed",
    dmarc_policy_weakened: "DMARC Policy Weakened",
    dmarc_record_removed: "DMARC Record Removed",
  };

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
      {/* Page title */}
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

      {/* Controls */}
      <div className="flex items-center gap-2">
        {/* Search */}
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

        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          style={btnBase}
          title={isDark ? "Light mode" : "Dark mode"}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Notifications bell with dropdown */}
        <div style={{ position: "relative" }}>
          <button
            ref={bellRef}
            onClick={handleBellClick}
            style={{ ...btnBase, position: "relative" }}
            title="Notifications"
          >
            <Bell size={16} />
            {/* Red dot — always show if there could be alerts */}
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

          {/* Dropdown panel */}
          {showNotifications && (
            <div
              ref={dropRef}
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                width: 340,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
                zIndex: 500,
                overflow: "hidden",
              }}
            >
              {/* Dropdown header */}
              <div
                className="flex items-center justify-between"
                style={{
                  padding: "14px 16px",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "var(--text)",
                  }}
                >
                  Notifications
                </p>
                <button
                  onClick={() => setShowNotifications(false)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-3)",
                    display: "flex",
                  }}
                >
                  <X size={14} />
                </button>
              </div>

              {/* Notification list */}
              {notifLoading ? (
                <div style={{ padding: 24, textAlign: "center" }}>
                  <p style={{ fontSize: 13, color: "var(--text-3)" }}>
                    Loading...
                  </p>
                </div>
              ) : notifications.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center" }}>
                  <CheckCircle
                    size={28}
                    color="#10B981"
                    style={{ margin: "0 auto 10px" }}
                  />
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--text)",
                    }}
                  >
                    All clear
                  </p>
                  <p
                    style={{
                      fontSize: 12.5,
                      color: "var(--text-3)",
                      marginTop: 4,
                    }}
                  >
                    No unresolved alerts right now
                  </p>
                </div>
              ) : (
                <div>
                  {notifications.map((notif: any) => (
                    <div
                      key={notif.id}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        padding: "12px 16px",
                        borderBottom: "1px solid var(--border)",
                        transition: "background 0.12s",
                        cursor: "pointer",
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
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          flexShrink: 0,
                          marginTop: 4,
                          background:
                            notif.severity === "critical"
                              ? "#EF4444"
                              : notif.severity === "warning"
                                ? "#F59E0B"
                                : "#3B82F6",
                        }}
                      />
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
                          {notif.aiTitle ||
                            CHANGE_LABELS[notif.changeType] ||
                            notif.changeType}
                        </p>
                        <p
                          style={{
                            fontSize: 11.5,
                            color: "var(--text-3)",
                            fontFamily: "var(--font-mono)",
                            marginTop: 2,
                          }}
                        >
                          {notif.domain?.domain}
                        </p>
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 7px",
                          borderRadius: 999,
                          flexShrink: 0,
                          background:
                            notif.severity === "critical"
                              ? "rgba(239,68,68,0.1)"
                              : "rgba(245,158,11,0.1)",
                          color:
                            notif.severity === "critical"
                              ? "#EF4444"
                              : "#F59E0B",
                        }}
                      >
                        {notif.severity?.toUpperCase()}
                      </span>
                    </div>
                  ))}
                  <div style={{ padding: "12px 16px", textAlign: "center" }}>
                    <a
                      href="/dashboard/alerts"
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#2563EB",
                        textDecoration: "none",
                      }}
                    >
                      View all alerts →
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Add domain */}
        <button
          onClick={onAddDomain}
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
