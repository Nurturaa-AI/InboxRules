// Handles all billing operations via Lemon Squeezy.
// Lemon Squeezy is the Stripe alternative that works
// for Nigerian founders and handles global tax compliance.

import db from "../../db";

// ─────────────────────────────────────────────
// LEMON SQUEEZY API CLIENT
// ─────────────────────────────────────────────

const LS_API_URL = "https://api.lemonsqueezy.com/v1";
const LS_API_KEY = process.env.LEMON_SQUEEZY_API_KEY;
const LS_STORE_ID = process.env.LEMON_SQUEEZY_STORE_ID;

// Product variant IDs from your Lemon Squeezy store
// You create these in the Lemon Squeezy dashboard
const PLAN_VARIANT_IDS: Record<string, string> = {
  free: "", // Free plan has no variant ID
  pro: process.env.LS_PRO_VARIANT_ID || "",
  agency: process.env.LS_AGENCY_VARIANT_ID || "",
};

// Helper to call the Lemon Squeezy API
async function lsRequest(
  method: string,
  path: string,
  body?: object,
): Promise<any> {
  if (!LS_API_KEY) {
    throw new Error("LEMON_SQUEEZY_API_KEY is not set");
  }

  const response = await fetch(`${LS_API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${LS_API_KEY}`,
      "Content-Type": "application/vnd.api+json",
      Accept: "application/vnd.api+json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Lemon Squeezy API error ${response.status}: ${error}`);
  }

  return response.json();
}

// ─────────────────────────────────────────────
// GET CURRENT SUBSCRIPTION
// ─────────────────────────────────────────────

export async function getSubscription(tenantId: string) {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) throw new Error("Tenant not found");

  // Count current domain usage
  const domainCount = await db.domain.count({
    where: { tenantId, deletedAt: null },
  });

  // Plan limits
  const PLAN_LIMITS: Record<
    string,
    { domains: number; checksPerDay: number; aiFeatures: boolean }
  > = {
    free: { domains: 3, checksPerDay: 1, aiFeatures: false },
    pro: { domains: 50, checksPerDay: 4, aiFeatures: true },
    agency: { domains: 500, checksPerDay: 24, aiFeatures: true },
  };

  const limits = PLAN_LIMITS[tenant.plan] ?? PLAN_LIMITS.free;

  return {
    plan: tenant.plan,
    customerId: tenant.lsCustomerId,
    usage: {
      domains: { used: domainCount, limit: limits.domains },
      checksPerDay: limits.checksPerDay,
      aiFeatures: limits.aiFeatures,
    },
    nextBillingDate: null, // Retrieved from LS API when customer ID exists
  };
}

// ─────────────────────────────────────────────
// CREATE A CHECKOUT SESSION
// Returns a URL to redirect the user to for payment
// ─────────────────────────────────────────────

export async function createCheckout(
  tenantId: string,
  plan: "pro" | "agency",
  userEmail: string,
): Promise<string> {
  const variantId = PLAN_VARIANT_IDS[plan];

  if (!variantId) {
    throw new Error(`No variant ID configured for plan: ${plan}`);
  }

  if (!LS_STORE_ID) {
    throw new Error("LEMON_SQUEEZY_STORE_ID is not set");
  }

  // Create a checkout in Lemon Squeezy
  const response = await lsRequest("POST", "/checkouts", {
    data: {
      type: "checkouts",
      attributes: {
        checkout_data: {
          email: userEmail,
          // Pass tenant ID so we can link the subscription in the webhook
          custom: {
            tenant_id: tenantId,
            plan,
          },
        },
        // Redirect back to billing page after payment
        product_options: {
          redirect_url: `${process.env.FRONTEND_URL}/dashboard/billing?success=true`,
        },
      },
      relationships: {
        store: {
          data: { type: "stores", id: LS_STORE_ID },
        },
        variant: {
          data: { type: "variants", id: variantId },
        },
      },
    },
  });

  // Return the checkout URL
  return response.data.attributes.url;
}

// ─────────────────────────────────────────────
// CREATE CUSTOMER PORTAL URL
// Lets users manage their subscription (cancel, upgrade, etc.)
// ─────────────────────────────────────────────

export async function getCustomerPortalUrl(
  tenantId: string,
): Promise<string | null> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant?.lsCustomerId) {
    // No customer yet — they have not paid
    return null;
  }

  try {
    const response = await lsRequest(
      "GET",
      `/customers/${tenant.lsCustomerId}`,
    );

    // Lemon Squeezy provides a customer portal URL
    return response.data.attributes.urls?.customer_portal || null;
  } catch (err: any) {
    console.error("[Billing] Failed to get portal URL:", err.message);
    return null;
  }
}

// ─────────────────────────────────────────────
// HANDLE LEMON SQUEEZY WEBHOOK
// Called when a subscription is created, updated, or cancelled
// ─────────────────────────────────────────────

export async function handleWebhook(
  eventName: string,
  data: any,
): Promise<void> {
  console.log(`[Billing] Webhook received: ${eventName}`);

  // Extract our custom metadata
  const customData = data.meta?.custom_data || {};
  const tenantId = customData.tenant_id;
  const plan = customData.plan;
  const customerId = data.data?.attributes?.customer_id?.toString();
  const status = data.data?.attributes?.status;

  if (!tenantId) {
    console.log("[Billing] No tenant_id in webhook custom data — skipping");
    return;
  }

  switch (eventName) {
    // New subscription created — upgrade the tenant's plan
    case "subscription_created":
      if (plan && status === "active") {
        await db.tenant.update({
          where: { id: tenantId },
          data: {
            plan: plan,
            // Store the LS customer ID for future portal access
            lsCustomerId: customerId || undefined,
          },
        });

        await db.auditLog.create({
          data: {
            tenantId,
            action: "billing.subscription_created",
            metadata: { plan, status, customerId } as any,
          },
        });

        console.log(`[Billing] Tenant ${tenantId} upgraded to ${plan}`);
      }
      break;

    // Subscription updated — handle plan changes
    case "subscription_updated":
      if (status === "active" && plan) {
        await db.tenant.update({
          where: { id: tenantId },
          data: { plan },
        });

        console.log(`[Billing] Tenant ${tenantId} plan updated to ${plan}`);
      }

      // Handle cancellation
      if (status === "cancelled" || status === "expired") {
        await db.tenant.update({
          where: { id: tenantId },
          data: { plan: "free" },
        });

        console.log(
          `[Billing] Tenant ${tenantId} downgraded to free (${status})`,
        );
      }
      break;

    // Payment failed — notify user but don't immediately downgrade
    case "subscription_payment_failed":
      console.log(`[Billing] Payment failed for tenant ${tenantId}`);
      // In production: send a payment failure email via Resend
      break;

    default:
      console.log(`[Billing] Unhandled webhook event: ${eventName}`);
  }
}

// ─────────────────────────────────────────────
// GET USAGE METRICS FOR BILLING PAGE
// ─────────────────────────────────────────────

export async function getUsageMetrics(tenantId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Count domains
  const domainCount = await db.domain.count({
    where: { tenantId, deletedAt: null },
  });

  // Count DNS snapshots this month (= scans run)
  const scansThisMonth = await db.dnsSnapshot.count({
    where: {
      domain: { tenantId },
      capturedAt: { gte: monthStart },
    },
  });

  // Count AI usage this month
  const aiUsage = await db.aiUsageLog.aggregate({
    where: {
      tenantId,
      createdAt: { gte: monthStart },
    },
    _count: { id: true },
    _sum: { costUsd: true },
  });

  // Count suppression events this month
  const suppressionCount = await db.suppressionEvent.count({
    where: {
      tenantId,
      processedAt: { gte: monthStart },
    },
  });

  return {
    domains: domainCount,
    scans: scansThisMonth,
    aiCalls: aiUsage._count.id,
    aiCostUsd: aiUsage._sum.costUsd ?? 0,
    suppressions: suppressionCount,
  };
}
