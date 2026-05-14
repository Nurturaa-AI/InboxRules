// src/workers/alert-dispatch.worker.ts
//
// This worker sends notifications when DNS changes are detected.
// Currently it sends email via Resend.
// Slack and webhook channels will be added later.
//
// It also calls the AI module to generate a plain-English
// explanation of what changed and how to fix it.

import { Worker, Job } from "bullmq";
import { Resend } from "resend";
import db from "../db";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface AlertJobData {
  changeEventId: string;
  tenantId: string;
  domainId: string;
  domainName: string;
  changeType: string;
  severity: string;
}

// ─────────────────────────────────────────────
// REDIS CONNECTION
// Same helper as dns-poll.worker.ts
// ─────────────────────────────────────────────

function getRedisConnection() {
  const url = process.env.REDIS_URL;

  if (!url) {
    throw new Error("REDIS_URL environment variable is not set");
  }

  const parsed = new URL(url);

  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || "6379", 10),
    password: parsed.password || undefined,
    tls: url.startsWith("rediss://") ? {} : undefined,
  };
}

// ─────────────────────────────────────────────
// HUMAN-READABLE CHANGE TYPE LABELS
// Maps internal change type codes to readable titles
// ─────────────────────────────────────────────

const CHANGE_TYPE_LABELS: Record<string, string> = {
  spf_lookup_exceeded: "SPF Lookup Limit Exceeded",
  spf_record_changed: "SPF Record Changed",
  dmarc_policy_weakened: "DMARC Policy Weakened",
  dmarc_record_removed: "DMARC Record Removed",
  dkim_removed: "DKIM Selector Removed",
  dkim_key_rotated: "DKIM Key Rotated",
};

// ─────────────────────────────────────────────
// SEVERITY TO EMAIL SUBJECT PREFIX
// ─────────────────────────────────────────────

const SEVERITY_PREFIX: Record<string, string> = {
  critical: "🔴 Critical",
  warning: "⚠️ Warning",
  info: "ℹ️ Info",
};

// ─────────────────────────────────────────────
// BUILD EMAIL HTML
// Simple HTML template for alert emails
// We keep it simple — no external email template library needed
// ─────────────────────────────────────────────

function buildAlertEmailHtml(data: {
  domainName: string;
  changeType: string;
  severity: string;
  previousValue: string | null;
  currentValue: string | null;
  aiTitle: string | null;
  aiSummary: string | null;
  aiFixSteps: any;
}): string {
  // Choose a color based on severity
  const severityColor =
    data.severity === "critical"
      ? "#dc2626"
      : data.severity === "warning"
        ? "#d97706"
        : "#2563eb";

  const changeLabel = CHANGE_TYPE_LABELS[data.changeType] || data.changeType;

  // Build the fix steps HTML if AI has generated them
  let fixStepsHtml = "";
  if (data.aiFixSteps && Array.isArray(data.aiFixSteps)) {
    const steps = data.aiFixSteps
      .map(
        (step: string, i: number) =>
          `<li style="margin-bottom: 8px;">${step}</li>`,
      )
      .join("");
    fixStepsHtml = `
      <div style="margin-top: 20px;">
        <h3 style="color: #111827; margin-bottom: 12px;">How to fix it</h3>
        <ol style="padding-left: 20px; color: #374151;">${steps}</ol>
      </div>
    `;
  }

  // Build the change details section
  let changeDetailsHtml = "";
  if (data.previousValue || data.currentValue) {
    changeDetailsHtml = `
      <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-top: 16px;">
        ${
          data.previousValue
            ? `
          <div style="margin-bottom: 8px;">
            <span style="font-weight: 600; color: #6b7280;">Before:</span>
            <code style="background: #fee2e2; padding: 2px 6px; border-radius: 4px; font-size: 13px; color: #991b1b;">
              ${data.previousValue}
            </code>
          </div>
        `
            : ""
        }
        ${
          data.currentValue
            ? `
          <div>
            <span style="font-weight: 600; color: #6b7280;">After:</span>
            <code style="background: #dcfce7; padding: 2px 6px; border-radius: 4px; font-size: 13px; color: #166534;">
              ${data.currentValue}
            </code>
          </div>
        `
            : ""
        }
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
                 max-width: 600px; margin: 0 auto; padding: 20px; color: #111827;">
      
      <!-- Header -->
      <div style="border-left: 4px solid ${severityColor}; padding-left: 16px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 13px; color: #6b7280; text-transform: uppercase; 
                  letter-spacing: 0.05em;">InboxRules Alert</p>
        <h1 style="margin: 4px 0 0; font-size: 22px; color: #111827;">
          ${data.aiTitle || changeLabel}
        </h1>
      </div>

      <!-- Domain badge -->
      <div style="margin-bottom: 20px;">
        <span style="background: #f3f4f6; border-radius: 6px; padding: 6px 12px; 
                     font-size: 14px; font-weight: 600; color: #374151;">
          🌐 ${data.domainName}
        </span>
        <span style="background: ${severityColor}; color: white; border-radius: 6px; 
                     padding: 6px 12px; font-size: 13px; font-weight: 600; margin-left: 8px;">
          ${data.severity.toUpperCase()}
        </span>
      </div>

      <!-- AI Summary -->
      ${
        data.aiSummary
          ? `
        <p style="font-size: 16px; line-height: 1.6; color: #374151; 
                  background: #eff6ff; border-radius: 8px; padding: 16px;">
          ${data.aiSummary}
        </p>
      `
          : `
        <p style="font-size: 16px; line-height: 1.6; color: #374151;">
          A ${changeLabel.toLowerCase()} was detected on your domain.
        </p>
      `
      }

      <!-- Change details -->
      ${changeDetailsHtml}

      <!-- Fix steps -->
      ${fixStepsHtml}

      <!-- CTA -->
      <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <a href="${process.env.FRONTEND_URL || "https://inboxrules.io"}/dashboard" 
           style="background: #2563eb; color: white; padding: 12px 24px; 
                  border-radius: 8px; text-decoration: none; font-weight: 600;
                  display: inline-block;">
          View in Dashboard →
        </a>
      </div>

      <!-- Footer -->
      <p style="margin-top: 24px; font-size: 12px; color: #9ca3af;">
        You are receiving this because you monitor ${data.domainName} on InboxRules.
        <br>
        To manage your alert settings, visit your dashboard.
      </p>

    </body>
    </html>
  `;
}

// ─────────────────────────────────────────────
// WORKER DEFINITION
// ─────────────────────────────────────────────

export function createAlertDispatchWorker() {
  // Initialize Resend email client
  const resend = new Resend(process.env.RESEND_API_KEY);

  const worker = new Worker<AlertJobData>(
    "alert-dispatch",

    async (job: Job<AlertJobData>) => {
      const { changeEventId, tenantId, domainName, changeType, severity } =
        job.data;

      console.log(
        `[Alert Worker] Processing alert for change ${changeEventId}`,
      );

      await job.updateProgress(10);

      // Load the full change event with AI explanation from the database
      const changeEvent = await db.dnsChangeEvent.findFirst({
        where: { id: changeEventId },
      });

      if (!changeEvent) {
        console.log(
          `[Alert Worker] Change event ${changeEventId} not found — skipping`,
        );
        return { skipped: true };
      }

      // If the change event does not have an AI explanation yet, generate one now
      if (!changeEvent.aiTitle || !changeEvent.aiSummary) {
        try {
          // Get the domain to find its detected ESP
          const domain = await db.domain.findFirst({
            where: { id: job.data.domainId },
            select: { detectedEsp: true },
          });

          const { explainDnsChange } =
            await import("../modules/ai/alert-explainer");

          const explanation = await explainDnsChange(
            {
              changeType: changeEvent.changeType,
              severity: changeEvent.severity,
              domain: job.data.domainName,
              previousValue: changeEvent.previousValue,
              currentValue: changeEvent.currentValue,
              detectedEsp: domain?.detectedEsp || null,
            },
            tenantId,
          );

          // Save the AI explanation back to the change event
          await db.dnsChangeEvent.update({
            where: { id: changeEventId },
            data: {
              aiTitle: explanation.title,
              aiSummary: explanation.summary,
              aiFixSteps: explanation.fixSteps,
            },
          });

          // Update the local changeEvent object so the email uses the AI content
          changeEvent.aiTitle = explanation.title;
          changeEvent.aiSummary = explanation.summary;
          changeEvent.aiFixSteps = explanation.fixSteps as any;
        } catch (err: any) {
          // If AI fails, the email still goes out without AI content
          console.error("[Alert Worker] AI explanation failed:", err.message);
        }
      }

      // If change event was deleted, skip this alert
      if (!changeEvent) {
        console.log(
          `[Alert Worker] Change event ${changeEventId} not found — skipping`,
        );
        return { skipped: true };
      }

      await job.updateProgress(30);

      // Load the tenant to get their email address
      // We need to find the owner of this tenant to send the alert to
      const tenantOwner = await db.user.findFirst({
        where: {
          tenantId,
          // Send to the owner — they are responsible for the domain
          role: "owner",
          deletedAt: null,
        },
      });

      // If no owner found, try any user in the tenant
      const recipient =
        tenantOwner ??
        (await db.user.findFirst({
          where: { tenantId, deletedAt: null },
        }));

      if (!recipient) {
        console.log(
          `[Alert Worker] No recipient found for tenant ${tenantId} — skipping`,
        );
        return { skipped: true, reason: "no_recipient" };
      }

      await job.updateProgress(50);

      // Build the email subject
      const severityPrefix = SEVERITY_PREFIX[severity] || severity;
      const changeLabel = CHANGE_TYPE_LABELS[changeType] || changeType;
      const subject = `${severityPrefix}: ${changeLabel} — ${domainName}`;

      // Build the email HTML using the change event data
      // aiTitle and aiSummary are populated by the AI module (built next)
      // For now they may be null — the email still works without them
      const html = buildAlertEmailHtml({
        domainName,
        changeType,
        severity,
        previousValue: changeEvent.previousValue,
        currentValue: changeEvent.currentValue,
        aiTitle: changeEvent.aiTitle,
        aiSummary: changeEvent.aiSummary,
        // Parse JSON fix steps if they exist
        aiFixSteps: changeEvent.aiFixSteps
          ? typeof changeEvent.aiFixSteps === "string"
            ? JSON.parse(changeEvent.aiFixSteps)
            : changeEvent.aiFixSteps
          : null,
      });

      await job.updateProgress(70);

      // Send the email via Resend
      try {
        const emailResult = await resend.emails.send({
          // The from address — must match a verified domain in your Resend account
          from: process.env.RESEND_FROM_EMAIL || "alerts@inboxrules.io",
          to: recipient.email,
          subject,
          html,
        });

        console.log(
          `[Alert Worker] Alert email sent to ${recipient.email}`,
          emailResult,
        );
      } catch (err: any) {
        console.error(
          `[Alert Worker] Failed to send email to ${recipient.email}:`,
          err.message,
        );
        // Re-throw so BullMQ retries the job
        throw new Error(`Email send failed: ${err.message}`);
      }

      await job.updateProgress(100);

      return {
        sentTo: recipient.email,
        subject,
        changeEventId,
      };
    },

    {
      connection: getRedisConnection(),

      // Only process one alert at a time
      // Email sending is rate-limited by Resend anyway
      concurrency: 2,

      removeOnComplete: { count: 50 },
      removeOnFail: { count: 200 },
    },
  );

  worker.on("completed", (job, result) => {
    console.log(`[Alert Worker] Job ${job.id} completed:`, result);
  });

  worker.on("failed", (job, err) => {
    console.error(`[Alert Worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on("error", (err) => {
    console.error("[Alert Worker] Redis error:", err.message);
  });

  console.log(" Alert dispatch worker started");

  return worker;
}
