"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Globe,
  ShieldCheck,
  Mail,
  Bell,
  BarChart3,
  CreditCard,
  Settings,
  LogOut,
  Inbox,
} from "lucide-react";
import Image from "next/image";

const NAV_ITEMS = [
  {
    section: "Main",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
      { label: "Domains", icon: Globe, href: "/dashboard/domains" },
      { label: "Compliance", icon: ShieldCheck, href: "/dashboard/compliance" },
      { label: "Unsubscribe", icon: Mail, href: "/dashboard/unsubscribe" },
    ],
  },
  {
    section: "Monitor",
    items: [
      { label: "Alerts", icon: Bell, href: "/dashboard/alerts", badge: 3 },
      { label: "Analytics", icon: BarChart3, href: "/dashboard/analytics" },
    ],
  },
  {
    section: "Account",
    items: [
      { label: "Billing", icon: CreditCard, href: "/dashboard/billing" },
      { label: "Settings", icon: Settings, href: "/dashboard/settings" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const { signOut } = useClerk();

  // Get display name from Clerk user object
  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName || ""}`.trim()
    : user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "User";

  // Get initials for avatar fallback
  const initials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : displayName.substring(0, 2).toUpperCase();

  return (
    <aside
      className="flex flex-col shrink-0"
      style={{
        width: 228,
        minWidth: 228,
        background: "#060D1F",
        borderRight: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {/* ── Brand ── */}
      <div
        className="flex items-center gap-3"
        style={{
          padding: "22px 18px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            flexShrink: 0,
            background: "linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)",
            boxShadow: "0 4px 12px rgba(37,99,235,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Inbox size={17} color="white" strokeWidth={2.5} />
        </div>
        <div>
          <p
            style={{
              color: "white",
              fontWeight: 800,
              fontSize: 15.5,
              letterSpacing: "-0.3px",
              lineHeight: 1,
            }}
          >
            Inbox<span style={{ color: "#60A5FA" }}>Rules</span>
          </p>
          <p
            style={{
              color: "#1E3A5F",
              fontSize: 10,
              marginTop: 3,
              fontWeight: 500,
            }}
          >
            Compliance Platform
          </p>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto" style={{ padding: "18px 10px" }}>
        {NAV_ITEMS.map((section) => (
          <div key={section.section} style={{ marginBottom: 26 }}>
            <p
              style={{
                fontSize: 9.5,
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: "#1E3A5F",
                padding: "0 10px",
                marginBottom: 6,
              }}
            >
              {section.section}
            </p>

            {section.items.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 10px",
                    borderRadius: 10,
                    marginBottom: 2,
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 500,
                    textDecoration: "none",
                    color: isActive ? "#FFFFFF" : "#3D5A80",
                    background: isActive
                      ? "linear-gradient(135deg, rgba(37,99,235,0.85), rgba(124,58,237,0.7))"
                      : "transparent",
                    boxShadow: isActive
                      ? "0 4px 12px rgba(37,99,235,0.25)"
                      : "none",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      const el = e.currentTarget as HTMLAnchorElement;
                      el.style.background = "rgba(255,255,255,0.05)";
                      el.style.color = "#7FA3C8";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      const el = e.currentTarget as HTMLAnchorElement;
                      el.style.background = "transparent";
                      el.style.color = "#3D5A80";
                    }
                  }}
                >
                  <Icon
                    size={15}
                    strokeWidth={isActive ? 2.5 : 2}
                    style={{ flexShrink: 0 }}
                  />
                  <span style={{ flex: 1 }}>{item.label}</span>

                  {"badge" in item && item.badge ? (
                    <span
                      style={{
                        background: "#EF4444",
                        color: "white",
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: 999,
                      }}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ── User ── */}
      <div
        style={{
          padding: "12px 10px",
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div
          className="flex items-center gap-2.5 rounded-xl cursor-pointer"
          style={{ padding: "9px 10px" }}
          onClick={() => signOut({ redirectUrl: "/sign-in" })}
          title="Sign out"
        >
          {/* Avatar — Clerk profile image or initials */}
          {user?.imageUrl ? (
            <Image
              src={user.imageUrl}
              alt={displayName}
              width={34}
              height={34}
              style={{
                borderRadius: "50%",
                objectFit: "cover",
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                flexShrink: 0,
                background: "linear-gradient(135deg, #2563EB, #7C3AED)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                color: "white",
              }}
            >
              {initials}
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                color: "#CBD5E1",
                fontSize: 13,
                fontWeight: 600,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {displayName}
            </p>
            <p style={{ color: "#1E3A5F", fontSize: 11, marginTop: 1 }}>
              Pro Plan
            </p>
          </div>

          <LogOut size={14} color="#1E3A5F" />
        </div>
      </div>
    </aside>
  );
}
