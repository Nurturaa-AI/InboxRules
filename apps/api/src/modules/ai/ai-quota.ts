// src/modules/ai/ai-quota.ts
//
// Per-tenant AI spend guard. The global rate limit (100 req/min/IP in
// server.ts) does NOT bound Gemini cost: a single authenticated tenant can
// drive unbounded spend by hammering /ai/analyze. AiUsageLog was already
// written after every call but never *checked* before one.
//
// This module sums a tenant's logged AI cost for the current calendar month
// and rejects further calls once the plan's budget is exhausted. It runs in
// the request path, BEFORE Gemini is invoked.

import db from "../../db";
import { redact } from "../../lib/redact";

// Monthly AI budget per plan, in USD. Generous relative to expected usage —
// the point is to cap runaway/abuse, not to meter normal use. Tune as needed.
const MONTHLY_AI_BUDGET_USD: Record<string, number> = {
  free: 0.5,
  pro: 10,
  agency: 50,
};

// Thrown when a tenant has exhausted its monthly AI budget. Routes translate
// this into a 429 so the client can distinguish it from a generic failure.
export class AiQuotaExceededError extends Error {
  readonly spentUsd: number;
  readonly budgetUsd: number;

  constructor(spentUsd: number, budgetUsd: number) {
    super("Monthly AI usage limit reached");
    this.name = "AiQuotaExceededError";
    this.spentUsd = spentUsd;
    this.budgetUsd = budgetUsd;
  }
}

// Start of the current month (server local time). AiUsageLog.createdAt is
// compared against this to scope spend to the current billing month.
function startOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

// Throws AiQuotaExceededError if the tenant has already spent its monthly
// budget. Call this before every billable Gemini request. Fails OPEN on an
// unexpected DB error: a metering outage should not take AI features down.
export async function assertAiQuota(tenantId: string): Promise<void> {
  let spent: number;
  let budget: number;

  try {
    budget = await resolveBudget(tenantId);

    const agg = await db.aiUsageLog.aggregate({
      where: { tenantId, createdAt: { gte: startOfMonth() } },
      _sum: { costUsd: true },
    });

    spent = agg._sum.costUsd ?? 0;
  } catch (err: any) {
    // Metering/DB failure — fail OPEN so a transient outage doesn't take AI
    // features down for everyone. Abuse is bounded by the global rate limit.
    console.error("[AI] Quota check failed, allowing request:", redact(err));
    return;
  }

  if (spent >= budget) {
    throw new AiQuotaExceededError(spent, budget);
  }
}

// Look up the tenant's plan and map it to a budget. Unknown/missing plans
// fall back to the free-tier budget (fail closed on plan, not on spend).
async function resolveBudget(tenantId: string): Promise<number> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true },
  });

  const plan = tenant?.plan ?? "free";
  return MONTHLY_AI_BUDGET_USD[plan] ?? MONTHLY_AI_BUDGET_USD.free;
}
