// Handles alert channels (Slack, email) and alert preferences.
// When a DNS change event is detected by the DNS worker,
// it queues an alert job. This service processes that job
// and sends notifications to the configured channels.

import { Resend } from "resend";
import db from "../../db";

const resend = new Resend(process.env.RESEND_API_KEY);

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface AlertChannel {
  type: "email" | "slack" | "webhook";
  destination: string; // email address, slack webhook URL, or webhook URL
  enabled: boolean;
}

export interface AlertPreferences {
  notifyOnCritical: boolean;
  notifyOnWarning: boolean;
  notifyOnInfo: boolean;
  weeklyReport: boolean;
  channels: AlertChannel[];
}

// ─────────────────────────────────────────────
// GET ALERT PREFERENCES FOR A TENANT
// ─────────────────────────────────────────────

export async function getAlertPreferences(
  tenantId: string,
): Promise<AlertPreferences> {
  // Look up saved preferences
  // For now we store in a simple JSON column on the tenant
  // In future this becomes its own table
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    throw new Error("Tenant not found");
  }

  // Return defaults if no preferences saved yet
  const defaults: AlertPreferences = {
    notifyOnCritical: true,
    notifyOnWarning: true,
    notifyOnInfo: false,
    weeklyReport: true,
    channels: [],
  };

  return defaults;
}

// ─────────────────────────────────────────────
// SEND AN ALERT EMAIL
// Called by the alert dispatch worker
// ─────────────────────────────────────────────

export async function sendAlertEmail(data: {
  to: string;
  domainName: string;
  changeType: string;
  severity: string;
  aiTitle: string | null;
  aiSummary: string | null;
  aiFixSteps: string[] | null;
  previousValue: string | null;
  currentValue: string | null;
}): Promise<{ success: boolean; error?: string }> {
  // Human-readable labels for change types
  const CHANGE_LABELS: Record<string, string> = {
    spf_lookup_exceeded: "SPF Lookup Limit Exceeded",
    spf_record_changed: "SPF Record Changed",
    dmarc_policy_weakened: "DMARC Policy Weakened",
    dmarc_record_removed: "DMARC Record Removed",
    dkim_removed: "DKIM Selector Removed",
    dkim_key_rotated: "DKIM Key Rotated",
  };

  const changeLabel = CHANGE_LABELS[data.changeType] || data.changeType;

  // Severity to color mapping
  const severityColor =
    data.severity === "critical"
      ? "#DC2626"
      : data.severity === "warning"
        ? "#D97706"
        : "#2563EB";

  // Build email subject
  const severityPrefix =
    data.severity === "critical"
      ? " Critical"
      : data.severity === "warning"
        ? " Warning"
        : "ℹ Info";

  const subject = `${severityPrefix}: ${data.aiTitle || changeLabel} — ${data.domainName}`;

  // Build fix steps HTML
  const fixStepsHtml = data.aiFixSteps?.length
    ? `<div style="margin-top:20px">
        <p style="font-weight:700;color:#111827;margin-bottom:10px">How to fix it</p>
        <ol style="padding-left:20px;color:#374151">
          ${data.aiFixSteps.map((step) => `<li style="margin-bottom:8px">${step}</li>`).join("")}
        </ol>
       </div>`
    : "";

  // Build change details HTML
  const changeDetailsHtml =
    data.previousValue || data.currentValue
      ? `<div style="background:#f9fafb;border-radius:8px;padding:16px;margin-top:16px">
        ${data.previousValue ? `<div style="margin-bottom:8px"><span style="font-weight:600;color:#6b7280">Before: </span><code style="background:#fee2e2;padding:2px 6px;border-radius:4px;font-size:13px;color:#991b1b">${data.previousValue}</code></div>` : ""}
        ${data.currentValue ? `<div><span style="font-weight:600;color:#6b7280">After: </span><code style="background:#dcfce7;padding:2px 6px;border-radius:4px;font-size:13px;color:#166534">${data.currentValue}</code></div>` : ""}
       </div>`
      : "";

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#111827">
      <div style="border-left:4px solid ${severityColor};padding-left:16px;margin-bottom:24px">
        <p style="margin:0;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em">InboxRules Alert</p>
        <h1 style="margin:4px 0 0;font-size:22px;color:#111827">${data.aiTitle || changeLabel}</h1>
      </div>
      <div style="margin-bottom:20px">
        <span style="background:#f3f4f6;border-radius:6px;padding:6px 12px;font-size:14px;font-weight:600;color:#374151">🌐 ${data.domainName}</span>
        <span style="background:${severityColor};color:white;border-radius:6px;padding:6px 12px;font-size:13px;font-weight:600;margin-left:8px">${data.severity.toUpperCase()}</span>
      </div>
      ${
        data.aiSummary
          ? `<p style="font-size:16px;line-height:1.6;color:#374151;background:#eff6ff;border-radius:8px;padding:16px">${data.aiSummary}</p>`
          : `<p style="font-size:16px;line-height:1.6;color:#374151">A ${changeLabel.toLowerCase()} was detected on your domain.</p>`
      }
      ${changeDetailsHtml}
      ${fixStepsHtml}
      <div style="margin-top:28px;padding-top:20px;border-top:1px solid #e5e7eb">
        <a href="${process.env.FRONTEND_URL || "https://inboxrules.io"}/dashboard/alerts"
           style="background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
          View in Dashboard →
        </a>
      </div>
      <p style="margin-top:24px;font-size:12px;color:#9ca3af">
        You are receiving this because you monitor ${data.domainName} on InboxRules.
      </p>
    </body>
    </html>
  `;

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "alerts@inboxrules.io",
      to: data.to,
      subject,
      html,
    });

    return { success: true };
  } catch (err: any) {
    console.error("[Alerts] Email send failed:", err.message);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────
// SEND A SLACK ALERT
// Posts a formatted message to a Slack webhook URL
// ─────────────────────────────────────────────

export async function sendSlackAlert(data: {
  webhookUrl: string;
  domainName: string;
  changeType: string;
  severity: string;
  aiTitle: string | null;
  aiSummary: string | null;
  aiFixSteps: string[] | null;
}): Promise<{ success: boolean; error?: string }> {
  const CHANGE_LABELS: Record<string, string> = {
    spf_lookup_exceeded: "SPF Lookup Limit Exceeded",
    spf_record_changed: "SPF Record Changed",
    dmarc_policy_weakened: "DMARC Policy Weakened",
    dmarc_record_removed: "DMARC Record Removed",
    dkim_removed: "DKIM Selector Removed",
    dkim_key_rotated: "DKIM Key Rotated",
  };

  const changeLabel = CHANGE_LABELS[data.changeType] || data.changeType;
  const severityEmoji =
    data.severity === "critical"
      ? "🔴"
      : data.severity === "warning"
        ? "⚠️"
        : "ℹ️";

  // Build Slack Block Kit message
  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${severityEmoji} ${data.aiTitle || changeLabel}`,
      },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Domain:*\n${data.domainName}` },
        { type: "mrkdwn", text: `*Severity:*\n${data.severity.toUpperCase()}` },
      ],
    },
  ];

  // Add AI summary if available
  if (data.aiSummary) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: data.aiSummary },
    } as any);
  }

  // Add fix steps if available
  if (data.aiFixSteps?.length) {
    const fixText = data.aiFixSteps
      .map((step, i) => `${i + 1}. ${step}`)
      .join("\n");

    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*How to fix it:*\n${fixText}` },
    } as any);
  }

  // Add View in Dashboard button
  blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        text: { type: "plain_text", text: "View in Dashboard →" },
        url: `${process.env.FRONTEND_URL || "https://inboxrules.io"}/dashboard/alerts`,
        style: "primary",
      },
    ],
  } as any);

  try {
    const response = await fetch(data.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks }),
    });

    if (!response.ok) {
      return { success: false, error: `Slack returned ${response.status}` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────
// SEND A WEEKLY COMPLIANCE REPORT EMAIL
// Called by a scheduled job every Monday morning
// ─────────────────────────────────────────────

export async function sendWeeklyReport(tenantId: string): Promise<void> {
  // Get the tenant owner's email
  const owner = await db.user.findFirst({
    where: { tenantId, role: "owner", deletedAt: null },
  });

  if (!owner) return;

  // Get all domains for this tenant
  const domains = await db.domain.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: { healthScore: "asc" },
  });

  if (domains.length === 0) return;

  // Get unresolved change events from last 7 days
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const recentChanges = await db.dnsChangeEvent.findMany({
    where: {
      tenantId,
      detectedAt: { gte: oneWeekAgo },
      acknowledged: false,
    },
    orderBy: { detectedAt: "desc" },
    take: 10,
  });

  // Calculate summary stats
  const healthy = domains.filter(
    (d: { healthScore: number }) => d.healthScore >= 80,
  ).length;
  const warning = domains.filter(
    (d: { healthScore: number }) => d.healthScore >= 50 && d.healthScore < 80,
  ).length;
  const critical = domains.filter(
    (d: { healthScore: number }) => d.healthScore < 50,
  ).length;
  const avgScore = Math.round(
    domains.reduce((a: number, d: DomainSummary) => a + d.healthScore, 0),
  );

  // Build domain rows for the email
  type DomainSummary = {
    domain: string;
    healthScore: number;
    spfStatus: string;
    dkimStatus: string;
    dmarcStatus: string;
  };

  const domainRows = domains
    .map((d: DomainSummary) => {
      const scoreColor =
        d.healthScore >= 80
          ? "#16A34A"
          : d.healthScore >= 50
            ? "#D97706"
            : "#DC2626";

      return `
      <tr style="border-bottom:1px solid #e5e7eb">
        <td style="padding:10px 0;font-weight:600">${d.domain}</td>
        <td style="padding:10px 0;color:${scoreColor};font-weight:700;font-family:monospace">${d.healthScore}/100</td>
        <td style="padding:10px 0;color:${d.spfStatus === "pass" ? "#16A34A" : "#DC2626"}">${d.spfStatus.toUpperCase()}</td>
        <td style="padding:10px 0;color:${d.dkimStatus === "pass" ? "#16A34A" : "#DC2626"}">${d.dkimStatus.toUpperCase()}</td>
        <td style="padding:10px 0;color:${d.dmarcStatus === "pass" ? "#16A34A" : "#DC2626"}">${d.dmarcStatus.toUpperCase()}</td>
      </tr>
    `;
    })
    .join("");

  // Build alerts section
  const alertsHtml =
    recentChanges.length > 0
      ? recentChanges
          .map(
            (change: {
              severity: string;
              aiTitle: string | null;
              changeType: string;
              aiSummary: string | null;
            }) => `
        <div style="padding:12px;border-left:3px solid ${change.severity === "critical" ? "#DC2626" : "#D97706"};background:#f9fafb;margin-bottom:8px;border-radius:4px">
          <p style="margin:0;font-weight:600;color:#111827">${change.aiTitle || change.changeType}</p>
          <p style="margin:4px 0 0;font-size:13px;color:#6b7280">${change.aiSummary || "DNS configuration changed"}</p>
        </div>
      `,
          )
          .join("")
      : '<p style="color:#6b7280">No new issues detected this week. 🎉</p>';

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#111827">
      <div style="background:linear-gradient(135deg,#2563EB,#7C3AED);border-radius:12px;padding:24px;margin-bottom:24px;color:white">
        <p style="margin:0;font-size:13px;opacity:0.8">Weekly Report</p>
        <h1 style="margin:8px 0 0;font-size:24px;font-weight:800">InboxRules Compliance Summary</h1>
        <p style="margin:6px 0 0;opacity:0.8;font-size:13px">Week of ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
      </div>

      <!-- Summary stats -->
      <div style="display:flex;gap:12px;margin-bottom:24px">
        <div style="flex:1;background:#f0fdf4;border-radius:10px;padding:16px;text-align:center">
          <p style="font-size:28px;font-weight:800;color:#16A34A;margin:0;font-family:monospace">${healthy}</p>
          <p style="font-size:13px;color:#6b7280;margin:4px 0 0">Healthy</p>
        </div>
        <div style="flex:1;background:#fffbeb;border-radius:10px;padding:16px;text-align:center">
          <p style="font-size:28px;font-weight:800;color:#D97706;margin:0;font-family:monospace">${warning}</p>
          <p style="font-size:13px;color:#6b7280;margin:4px 0 0">Warning</p>
        </div>
        <div style="flex:1;background:#fef2f2;border-radius:10px;padding:16px;text-align:center">
          <p style="font-size:28px;font-weight:800;color:#DC2626;margin:0;font-family:monospace">${critical}</p>
          <p style="font-size:13px;color:#6b7280;margin:4px 0 0">Critical</p>
        </div>
        <div style="flex:1;background:#eff6ff;border-radius:10px;padding:16px;text-align:center">
          <p style="font-size:28px;font-weight:800;color:#2563EB;margin:0;font-family:monospace">${avgScore}</p>
          <p style="font-size:13px;color:#6b7280;margin:4px 0 0">Avg Score</p>
        </div>
      </div>

      <!-- Domain table -->
      <h2 style="font-size:16px;font-weight:700;margin-bottom:12px">Domain Health</h2>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="border-bottom:2px solid #e5e7eb">
            <th style="text-align:left;padding:8px 0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em">Domain</th>
            <th style="text-align:left;padding:8px 0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em">Score</th>
            <th style="text-align:left;padding:8px 0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em">SPF</th>
            <th style="text-align:left;padding:8px 0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em">DKIM</th>
            <th style="text-align:left;padding:8px 0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em">DMARC</th>
          </tr>
        </thead>
        <tbody>${domainRows}</tbody>
      </table>

      <!-- Recent alerts -->
      <h2 style="font-size:16px;font-weight:700;margin-top:28px;margin-bottom:12px">Issues This Week</h2>
      ${alertsHtml}

      <div style="margin-top:28px;padding-top:20px;border-top:1px solid #e5e7eb">
        <a href="${process.env.FRONTEND_URL || "https://inboxrules.io"}/dashboard"
           style="background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
          Open Dashboard →
        </a>
      </div>

      <p style="margin-top:24px;font-size:12px;color:#9ca3af">
        InboxRules · Email Compliance Platform<br>
        <a href="${process.env.FRONTEND_URL}/dashboard/settings" style="color:#9ca3af">Manage notification preferences</a>
      </p>
    </body>
    </html>
  `;

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "reports@inboxrules.io",
    to: owner.email,
    subject: ` Weekly Compliance Report — ${avgScore}/100 avg score`,
    html,
  });
}
