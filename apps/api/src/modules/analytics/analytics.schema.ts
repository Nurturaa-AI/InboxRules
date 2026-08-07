// src/modules/analytics/analytics.schema.ts
//
// Zod schemas for analytics endpoints. These aggregate real data from the
// tenant's scans, alerts, suppressions, and AI usage — never fabricated.

import { z } from "zod";

// ─────────────────────────────────────────────
// HEALTH HISTORY — daily average score over time
// ─────────────────────────────────────────────

export const HealthHistoryQuerySchema = z.object({
  period: z
    .enum(["7", "30", "90"])
    .transform((val) => parseInt(val, 10)),
});

export type HealthHistoryQuery = z.infer<typeof HealthHistoryQuerySchema>;

// ─────────────────────────────────────────────
// OVERVIEW — KPIs with trend comparisons
// ─────────────────────────────────────────────

export const OverviewQuerySchema = z.object({
  period: z
    .enum(["7", "30", "90"])
    .transform((val) => parseInt(val, 10)),
});

export type OverviewQuery = z.infer<typeof OverviewQuerySchema>;
