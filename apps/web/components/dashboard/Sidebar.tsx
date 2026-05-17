// The left navigation sidebar.
// Always dark regardless of light/dark mode (like BankDash reference).

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Globe,
  ShieldCheck,
  Mail,
  Bell,
  BarChart3,
  Settings,
  CreditCard,
  LogOut,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Navigation items — each maps to a route
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

  return (
    // Sidebar background is always dark — uses fixed dark colors
    // not the theme variables so it stays dark in both modes
    <aside className="w-55 min-w-55 bg-[#0B1120] flex flex-col border-r border-white/6 ">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-6 border-b border-white/6">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
          <Inbox className="w-4 h-4 text-white" />
        </div>
        <span className="text-white font-extrabold text-[15px] tracking-tight">
          Inbox<span className="text-blue-500">Rules</span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {NAV_ITEMS.map((section) => (
          <div key={section.section}>
            {/* Section label */}
            <p
              className="text-[10px] font-bold uppercase tracking-widest
                          text-slate-500 px-3 mb-1.5"
            >
              {section.section}
            </p>

            {/* Items */}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg",
                      "text-[13px] font-medium transition-all duration-150",
                      isActive
                        ? // Active: solid blue background
                          "bg-blue-600 text-white"
                        : // Inactive: muted text, hover lightens background
                          "text-slate-400 hover:text-slate-100 hover:bg-white/6",
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>

                    {/* Alert badge */}
                    {"badge" in item && item.badge ? (
                      <span
                        className="bg-red-500 text-white text-[10px]
                                       font-bold px-1.5 py-0.5 rounded-full
                                       font-mono leading-none"
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User section at bottom */}
      <div className="p-3 border-t border-white/6">
        <div
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg
                        cursor-pointer hover:bg-white/6 transition-colors"
        >
          {/* Avatar with gradient */}
          <div
            className="w-8 h-8 rounded-full bg-linear-to-br from-blue-500
                          to-violet-600 flex items-center justify-center
                          shrink-0 text-white text-xs font-bold"
          >
            PO
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-200 text-[12.5px] font-semibold truncate">
              Princewill O.
            </p>
            <p className="text-slate-500 text-[11px]">Pro Plan</p>
          </div>
          <LogOut className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        </div>
      </div>
    </aside>
  );
}
