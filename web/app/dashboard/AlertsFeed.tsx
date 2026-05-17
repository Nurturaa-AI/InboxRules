// Shows recent DNS change events and compliance alerts.

import { AlertTriangle, Info, XCircle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const ALERTS = [
  {
    id: "1",
    type: "critical",
    title: "SPF Lookup Limit Exceeded",
    domain: "startup.co",
    time: "5 min ago",
  },
  {
    id: "2",
    type: "warning",
    title: "DMARC Policy is p=none",
    domain: "techcorp.io",
    time: "2 hr ago",
  },
  {
    id: "3",
    type: "warning",
    title: "Weak 1024-bit DKIM Key",
    domain: "agency.xyz",
    time: "6 hr ago",
  },
  {
    id: "4",
    type: "info",
    title: "DKIM Selector Rotated",
    domain: "acme.com",
    time: "1 day ago",
  },
];

const ALERT_STYLES = {
  critical: {
    dot: "bg-red-500",
    icon: XCircle,
    color: "text-red-500",
  },
  warning: {
    dot: "bg-amber-500",
    icon: AlertTriangle,
    color: "text-amber-500",
  },
  info: {
    dot: "bg-blue-500",
    icon: Info,
    color: "text-blue-500",
  },
};

export default function AlertsFeed() {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4
                      border-b border-border"
      >
        <div>
          <h2 className="text-[14px] font-bold tracking-tight">
            Recent Alerts
          </h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            3 unresolved issues
          </p>
        </div>
        <span
          className="text-[12.5px] text-blue-600 dark:text-blue-400
                         font-semibold cursor-pointer hover:opacity-70
                         transition-opacity"
        >
          View all →
        </span>
      </div>

      {/* Alert list */}
      <div>
        {ALERTS.map((alert) => {
          const style = ALERT_STYLES[alert.type as keyof typeof ALERT_STYLES];

          return (
            <div
              key={alert.id}
              className="flex items-start gap-3 px-5 py-3.5
                         border-b border-border last:border-none
                         hover:bg-muted/30 cursor-pointer
                         transition-colors group"
            >
              {/* Colored dot indicator */}
              <div
                className={cn(
                  "w-2 h-2 rounded-full shrink-0 mt-1.5",
                  style.dot,
                )}
              />

              {/* Alert content */}
              <div className="flex-1 min-w-0">
                <p
                  className="text-[13px] font-semibold text-foreground
                               leading-tight"
                >
                  {alert.title}
                </p>
                <p
                  className="text-[11.5px] text-muted-foreground
                               font-mono mt-0.5"
                >
                  {alert.domain}
                </p>
              </div>

              {/* Time and arrow */}
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-[11px] text-muted-foreground">
                  {alert.time}
                </span>
                <ChevronRight
                  className="w-3.5 h-3.5 text-muted-foreground
                                          opacity-0 group-hover:opacity-100
                                          transition-opacity"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
