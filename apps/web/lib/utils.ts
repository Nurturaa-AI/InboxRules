import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes, with later classes overriding earlier ones.
 * Uses clsx for conditional/array support + tailwind-merge for deduplication.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function domainInitials(domain: string): string {
  return domain.substring(0, 2).toUpperCase();
}

/**
 * Convert a health score (0-100) to a semantic status.
 * Thresholds: ≥80 = success, ≥60 = warning, <60 = danger.
 */
export function scoreToStatus(score: number): "success" | "warning" | "danger" {
  if (score >= 80) return "success";
  if (score >= 60) return "warning";
  return "danger";
}

/**
 * Shared relative-time formatter.
 * Replaces the 4 duplicated copies across domains/alerts/unsubscribe/AlertsFeed.
 */
export function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
