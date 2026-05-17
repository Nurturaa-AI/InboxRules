// Four stat cards at the top of the dashboard.
// Each shows a key metric with trend indicator.

import { Globe, ShieldCheck, AlertTriangle, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

// Static data — will be replaced with real API data later
const STATS = [
  {
    label: "Total Domains",
    value: "12",
    trend: "+2 this month",
    up: true,
    icon: Globe,
    color: "blue",
  },
  {
    label: "Healthy Domains",
    value: "8",
    trend: "67% of total",
    up: true,
    icon: ShieldCheck,
    color: "green",
  },
  {
    label: "Active Alerts",
    value: "3",
    trend: "2 critical",
    up: false,
    icon: AlertTriangle,
    color: "red",
  },
  {
    label: "Unsubscribes (7d)",
    value: "142",
    trend: "-8% vs last week",
    up: true,
    icon: Mail,
    color: "amber",
  },
];

// Color maps for the icon backgrounds and trend badges
const ICON_COLORS: Record<string, string> = {
  blue: "bg-blue-50   dark:bg-blue-950   text-blue-600  dark:text-blue-400",
  green: "bg-green-50  dark:bg-green-950  text-green-600 dark:text-green-400",
  red: "bg-red-50    dark:bg-red-950    text-red-600   dark:text-red-400",
  amber: "bg-amber-50  dark:bg-amber-950  text-amber-600 dark:text-amber-400",
};

const TREND_UP =
  "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400";
const TREND_DOWN =
  "bg-red-50   dark:bg-red-950   text-red-700   dark:text-red-400";

export default function StatCards() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {STATS.map((stat) => {
        const Icon = stat.icon;

        return (
          <div
            key={stat.label}
            className="bg-card border border-border rounded-xl p-5
                       hover:shadow-md hover:-translate-y-0.5
                       transition-all duration-200 cursor-default"
          >
            {/* Top row — icon and trend */}
            <div className="flex items-center justify-between mb-4">
              {/* Icon with colored background */}
              <div
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  ICON_COLORS[stat.color],
                )}
              >
                <Icon className="w-4.5 h-4.5" />
              </div>

              {/* Trend badge */}
              <span
                className={cn(
                  "text-[11.5px] font-semibold px-2 py-1 rounded-full",
                  stat.up ? TREND_UP : TREND_DOWN,
                )}
              >
                {stat.trend}
              </span>
            </div>

            {/* Value */}
            <p
              className="text-3xl font-extrabold tracking-tight font-mono
                          text-foreground"
            >
              {stat.value}
            </p>

            {/* Label */}
            <p className="text-[12.5px] text-muted-foreground font-medium mt-1">
              {stat.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}
