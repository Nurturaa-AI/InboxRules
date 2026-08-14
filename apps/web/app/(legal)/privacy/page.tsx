import type { Metadata } from "next"
import { ShieldCheck } from "lucide-react"

import LegalDocument, {
  type LegalSection,
} from "@/components/legal/LegalDocument"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How InboxRules collects, uses, shares, retains, and protects personal data across email deliverability monitoring, AI analysis, and unsubscribe hosting.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy Policy — InboxRules",
    description:
      "How InboxRules collects, uses, shares, retains, and protects your data.",
    url: "/privacy",
    type: "article",
  },
}

// The only user-facing contact address present in the codebase.
const SUPPORT_EMAIL = "support@inboxrules.com"

// Placeholders for details that cannot be verified from the codebase.
const COMPANY = "[LEGAL COMPANY NAME]"
const ADDRESS = "[REGISTERED BUSINESS ADDRESS]"
const DPO = "[DATA PROTECTION CONTACT]"

const UPDATED = "August 9, 2026"

const Email = () => <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>

const sections: LegalSection[] = [
  {
    id: "introduction",
    title: "Introduction and scope",
    content: (
      <>
        <p>
          This Privacy Policy explains how <strong>{COMPANY}</strong>, operator
          of InboxRules (&ldquo;InboxRules&rdquo;, &ldquo;we&rdquo;,
          &ldquo;us&rdquo;), collects, uses, shares, and protects personal data
          when you use our email deliverability monitoring service, dashboard,
          and API (the &ldquo;Service&rdquo;). It applies to our customers and to
          visitors of the authenticated dashboard.
        </p>
        <p>
          For the personal data we process to provide the Service to you, we act
          as a <strong>controller</strong>. For data contained in the domain
          configuration you ask us to monitor, we act on your instructions as a{" "}
          <strong>processor</strong>. This policy should be read together with
          our <a href="/terms">Terms of Service</a>.
        </p>
      </>
    ),
  },
  {
    id: "data-we-collect",
    title: "Information we collect",
    content: (
      <>
        <h3>Account information</h3>
        <p>
          Authentication is handled by <strong>Clerk</strong>. When you register,
          we and Clerk process your name, email address, and authentication
          identifiers. We store a reference to your Clerk user and your tenant
          (workspace) association; we do not store your password.
        </p>
        <h3>Domain and configuration data</h3>
        <p>
          For each domain you add, we query and store publicly available DNS
          records (SPF, DKIM, DMARC, BIMI, MTA-STS, TLS-RPT), historical
          snapshots, and detected change events. This data is about domains, not
          individuals, but you may choose to include it here for completeness.
        </p>
        <h3>Email analysis data</h3>
        <p>
          If you submit email headers for analysis, they are processed to produce
          a structured result and are retained only transiently; raw headers are
          marked for deletion once analysis completes and are not used to build
          long-term profiles.
        </p>
        <h3>Unsubscribe and suppression data</h3>
        <p>
          To operate the one-click unsubscribe endpoint and suppression list, we
          store recipient identifiers as one-way <code>SHA-256</code> hashes and
          unsubscribe tokens as keyed <code>HMAC-SHA256</code> values &mdash; not
          as plaintext email addresses.
        </p>
        <h3>Billing information</h3>
        <p>
          Payments are processed by <strong>Lemon Squeezy</strong>, our merchant
          of record. We receive subscription and transaction metadata (such as
          plan, status, and country for tax) but do not store your full payment
          card details.
        </p>
        <h3>Usage, logs, and technical data</h3>
        <p>
          We keep operational records including AI usage logs, audit logs, and
          request metadata such as IP address and timestamps, which are used for
          security, rate limiting, and abuse prevention.
        </p>
      </>
    ),
  },
  {
    id: "how-we-use",
    title: "How and why we use information",
    content: (
      <>
        <p>We use personal data to:</p>
        <ul>
          <li>
            Provide the Service &mdash; authenticate you, run scheduled DNS
            scans, detect changes, and deliver alerts by email, Slack, and
            webhook.
          </li>
          <li>
            Generate AI explanations and configuration suggestions from
            structured DNS signals.
          </li>
          <li>
            Operate the one-click unsubscribe endpoint and maintain your
            suppression list.
          </li>
          <li>
            Process subscriptions, enforce plan limits, and prevent fraud and
            abuse.
          </li>
          <li>
            Secure and improve the Service, provide support, and comply with
            legal obligations.
          </li>
        </ul>
        <p>
          Where required by law (for example, in the EEA and UK), we rely on the
          following legal bases: <strong>performance of a contract</strong> to
          provide the Service; <strong>legitimate interests</strong> in securing,
          maintaining, and improving it; <strong>consent</strong> where
          applicable; and <strong>compliance with legal obligations</strong>.
        </p>
      </>
    ),
  },
  {
    id: "ai-processing",
    title: "AI processing",
    content: (
      <>
        <p>
          AI features are powered by <strong>Google Gemini</strong>. To protect
          your data, the Service sends only structured, non-sensitive signals
          derived from DNS checks to the AI provider. Raw DNS record strings and
          raw email headers are deliberately excluded from AI prompts.
        </p>
        <p>
          We do not use your Customer Data to train our own models, and we rely on
          the AI provider&rsquo;s enterprise processing terms. AI usage is logged
          for quota and billing purposes.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and analytics",
    content: (
      <>
        <p>
          InboxRules uses <strong>strictly necessary cookies</strong> to keep you
          signed in and to secure your session. These are set primarily by our
          authentication provider, Clerk. Your theme preference (light or dark) is
          stored locally in your browser.
        </p>
        <p>
          We do <strong>not</strong> use third-party advertising cookies, and the
          application does not embed third-party analytics, tracking pixels, or
          cross-site advertising trackers. Because the essential cookies are
          required for the Service to function, disabling them may prevent you
          from signing in.
        </p>
      </>
    ),
  },
  {
    id: "sharing",
    title: "How we share information and subprocessors",
    content: (
      <>
        <p>
          We do not sell your personal data. We share it only with service
          providers that help us operate the Service, and only as needed for the
          purposes below. Each is bound by contractual confidentiality and
          data-protection obligations.
        </p>
        <ul>
          <li>
            <strong>Clerk</strong> &mdash; authentication and user management.
          </li>
          <li>
            <strong>Google (Gemini API)</strong> &mdash; AI analysis of structured
            DNS signals.
          </li>
          <li>
            <strong>Lemon Squeezy</strong> &mdash; payment processing and merchant
            of record.
          </li>
          <li>
            <strong>Resend</strong> &mdash; transactional and alert email delivery.
          </li>
          <li>
            <strong>Cloudflare</strong> &mdash; edge hosting of the one-click
            unsubscribe endpoint.
          </li>
          <li>
            <strong>Upstash (Redis)</strong> &mdash; background job queue and
            rate-limiting.
          </li>
          <li>
            <strong>Vercel</strong> &mdash; hosting of the web dashboard.
          </li>
          <li>
            <strong>Railway</strong> &mdash; hosting of the API, background
            workers, and PostgreSQL database.
          </li>
        </ul>
        <p>
          We may also disclose data to comply with law, enforce our{" "}
          <a href="/terms">Terms</a>, or protect rights and safety, and we may
          transfer data as part of a merger, acquisition, or asset sale, subject
          to this policy.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    title: "Data retention and deletion",
    content: (
      <>
        <p>
          We keep personal data only as long as needed for the purposes described
          here. Most records support <strong>soft deletion</strong> and are
          filtered from active use immediately when removed, then purged on a
          routine basis. Raw email headers submitted for analysis are retained
          transiently and marked for deletion once analysis completes.
        </p>
        <p>
          When you close your account, we delete or de-identify your Customer Data
          within a commercially reasonable period, except where we must retain
          limited records to meet legal, tax, security, or dispute-resolution
          obligations. Hashed suppression records may be retained to keep honoring
          prior unsubscribe requests.
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "Security",
    content: (
      <>
        <p>
          We take technical and organizational measures to protect personal data,
          including:
        </p>
        <ul>
          <li>Encryption of data in transit over HTTPS/TLS.</li>
          <li>
            One-way hashing of recipient identifiers and unsubscribe tokens rather
            than plaintext storage.
          </li>
          <li>
            Strict multi-tenant isolation, so each workspace can access only its
            own data.
          </li>
          <li>
            A structured-data boundary that keeps raw DNS and email header content
            out of AI prompts.
          </li>
          <li>
            Timing-safe verification for internal service-to-service requests and
            provider webhook signatures.
          </li>
        </ul>
        <p>
          No method of transmission or storage is completely secure. If we become
          aware of a breach affecting your personal data, we will notify you and
          the relevant authorities as required by law.
        </p>
      </>
    ),
  },
  {
    id: "international",
    title: "International data transfers",
    content: (
      <>
        <p>
          We and our providers may process data in countries other than your own,
          including the United States. Where personal data is transferred
          internationally, we rely on appropriate safeguards such as the European
          Commission&rsquo;s Standard Contractual Clauses or equivalent
          mechanisms offered by our providers.{" "}
          <strong>
            [Confirm the applicable transfer mechanisms and hosting regions with
            legal counsel.]
          </strong>
        </p>
      </>
    ),
  },
  {
    id: "your-rights",
    title: "Your privacy rights",
    content: (
      <>
        <p>
          Depending on where you live, you may have rights to access, correct,
          delete, or receive a copy of your personal data, to restrict or object
          to certain processing, and to withdraw consent. Residents of the EEA and
          UK have rights under the GDPR; California residents have rights under the
          CCPA/CPRA, including the right not to be discriminated against for
          exercising them.
        </p>
        <p>
          Many actions &mdash; updating your profile, managing domains, or closing
          your account &mdash; can be performed directly in the dashboard. To make
          any other request, contact us at <Email />. We will verify your request
          and respond within the timeframe required by applicable law. You may also
          have the right to complain to your local data protection authority.
        </p>
      </>
    ),
  },
  {
    id: "childrens-privacy",
    title: "Children’s privacy",
    content: (
      <>
        <p>
          The Service is intended for business use and is not directed to children.
          We do not knowingly collect personal data from anyone under 16. If you
          believe a child has provided us personal data, contact <Email /> and we
          will delete it.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    content: (
      <>
        <p>
          We may update this Privacy Policy from time to time. When we make
          material changes, we will revise the &ldquo;last updated&rdquo; date and,
          where appropriate, provide additional notice through the dashboard or by
          email. Your continued use of the Service after changes take effect
          constitutes acceptance of the updated policy.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    title: "Contact us",
    content: (
      <>
        <p>
          For privacy questions or to exercise your rights, contact us at{" "}
          <Email />. Our details are:
        </p>
        <ul>
          <li>
            <strong>{COMPANY}</strong>
          </li>
          <li>{ADDRESS}</li>
          <li>
            Data protection contact: {DPO} (<Email />)
          </li>
        </ul>
      </>
    ),
  },
]

export default function PrivacyPage() {
  return (
    <LegalDocument
      eyebrow="Privacy"
      eyebrowIcon={<ShieldCheck aria-hidden="true" />}
      title="Privacy Policy"
      updated={UPDATED}
      summary="This policy explains what personal data InboxRules collects, how and why we use it, who we share it with, how long we keep it, and the choices and rights you have."
      sections={sections}
    />
  )
}
