import type { Metadata } from "next"
import { Scale } from "lucide-react"

import LegalDocument, {
  type LegalSection,
} from "@/components/legal/LegalDocument"

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms governing your use of InboxRules — email deliverability monitoring, AI-assisted DNS analysis, and RFC 8058 one-click unsubscribe hosting.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Terms of Service — InboxRules",
    description:
      "The terms governing your use of InboxRules — email deliverability monitoring, AI-assisted DNS analysis, and one-click unsubscribe hosting.",
    url: "/terms",
    type: "article",
  },
}

// Verified from the codebase: the only user-facing contact address in the app
// is the support inbox shown on /support.
const SUPPORT_EMAIL = "support@inboxrules.com"

// Details that cannot be established from the codebase are left as explicit,
// clearly-marked placeholders — they must be completed before publication.
const COMPANY = "[LEGAL COMPANY NAME]"
const ADDRESS = "[REGISTERED BUSINESS ADDRESS]"
const JURISDICTION = "[GOVERNING LAW JURISDICTION]"

const UPDATED = "August 9, 2026"

const Email = () => (
  <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
)

const sections: LegalSection[] = [
  {
    id: "agreement",
    title: "Agreement to these terms",
    content: (
      <>
        <p>
          These Terms of Service (the &ldquo;Terms&rdquo;) form a binding
          agreement between you, or the organization you represent
          (&ldquo;you&rdquo; or &ldquo;Customer&rdquo;), and{" "}
          <strong>{COMPANY}</strong>, the operator of InboxRules
          (&ldquo;InboxRules&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). They
          govern your access to and use of the InboxRules website, dashboard,
          API, and related services (together, the &ldquo;Service&rdquo;).
        </p>
        <p>
          By creating an account, connecting a domain, or otherwise using the
          Service, you agree to these Terms and to our{" "}
          <a href="/privacy">Privacy Policy</a>. If you do not agree, do not use
          the Service. If you accept these Terms on behalf of an organization,
          you represent that you are authorized to bind that organization.
        </p>
      </>
    ),
  },
  {
    id: "eligibility",
    title: "Eligibility and account registration",
    content: (
      <>
        <p>
          You must be at least 18 years old and capable of forming a binding
          contract to use the Service. Authentication and account management are
          provided through <strong>Clerk</strong>, our identity provider. You
          are responsible for the accuracy of the information you provide and for
          all activity that occurs under your account.
        </p>
        <ul>
          <li>
            Keep your login credentials confidential and enable available
            security features such as multi-factor authentication.
          </li>
          <li>
            Notify us promptly at <Email /> if you suspect unauthorized access
            to your account.
          </li>
          <li>
            An account is associated with a single tenant workspace. You are
            responsible for the acts and omissions of every user you invite or
            allow to access your workspace.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "service",
    title: "What the Service does",
    content: (
      <>
        <p>InboxRules is an email deliverability monitoring platform. It:</p>
        <ul>
          <li>
            Performs scheduled DNS checks of your sending domains for{" "}
            <strong>SPF, DKIM, DMARC, BIMI, MTA-STS, and TLS-RPT</strong>{" "}
            configuration.
          </li>
          <li>
            Detects changes to those records between scans, classifies their
            severity, and dispatches alerts by email, Slack, and webhook.
          </li>
          <li>
            Uses AI (Google Gemini) to generate plain-English explanations of
            configuration issues and example provider-specific fixes.
          </li>
          <li>
            Hosts an <strong>RFC 8058 one-click unsubscribe</strong> endpoint at
            the edge and maintains a suppression list on your behalf.
          </li>
        </ul>
        <p>
          The Service is an informational and monitoring tool. It reports on and
          explains the public DNS configuration of the domains you add; it does
          not send your marketing email, does not control your DNS or your email
          service provider, and does not guarantee inbox placement or that your
          sending program complies with any law.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    content: (
      <>
        <p>You agree not to, and not to permit anyone else to:</p>
        <ul>
          <li>
            Add, scan, or monitor a domain you do not own or are not authorized
            to administer (see{" "}
            <a href="#domains">Domain authorization</a>).
          </li>
          <li>
            Use the Service to send unsolicited bulk email, to facilitate
            spamming, or in violation of any applicable anti-spam or
            data-protection law.
          </li>
          <li>
            Probe, scan, overload, or disrupt the Service or its infrastructure,
            or attempt to circumvent rate limits, plan quotas, or usage
            controls.
          </li>
          <li>
            Reverse engineer, decompile, scrape, or create derivative works from
            the Service except to the extent this restriction is prohibited by
            law.
          </li>
          <li>
            Resell, sublicense, or provide the Service to third parties except as
            expressly permitted by your plan (for example, agency management of
            client domains you are authorized to administer).
          </li>
          <li>
            Upload or submit content that is unlawful, infringing, or that
            contains malware.
          </li>
        </ul>
        <p>
          We may investigate suspected violations and may suspend or terminate
          access to protect the Service, our users, or third parties.
        </p>
      </>
    ),
  },
  {
    id: "domains",
    title: "Domain authorization and scanning",
    content: (
      <>
        <p>
          When you add a domain, you represent and warrant that you own it or are
          authorized by its owner to monitor its email configuration. InboxRules
          queries publicly available DNS records for the domains you add; it does
          not attempt to access private systems, mailboxes, or non-public data.
        </p>
        <p>
          Plan-based limits apply to the number of domains you may monitor and
          how frequently they are scanned. If you enable one-click unsubscribe
          hosting for a domain, you are responsible for correctly referencing the
          hosted endpoint in your outbound mail headers and for the accuracy of
          the recipients you send to.
        </p>
      </>
    ),
  },
  {
    id: "deliverability",
    title: "Deliverability, unsubscribe, and your compliance obligations",
    content: (
      <>
        <p>
          The guidance InboxRules provides about SPF, DKIM, DMARC, and related
          standards is informational and generated in part by automated systems.
          You are solely responsible for how you configure your DNS and email,
          and for the deliverability and legal compliance of your own sending
          program.
        </p>
        <p>
          Where you use our hosted unsubscribe endpoint, you remain responsible
          for honoring unsubscribe requests and suppressing addresses in your own
          sending systems. Compliance with laws such as CAN-SPAM, GDPR, CASL, and
          any other applicable regulation is your responsibility. InboxRules is a
          tool that supports your compliance efforts; it is not a substitute for
          them, and nothing in the Service constitutes legal advice.
        </p>
      </>
    ),
  },
  {
    id: "ai",
    title: "AI-assisted analysis",
    content: (
      <>
        <p>
          Certain features use Google Gemini to explain DNS findings and suggest
          configuration snippets. To protect your data, only structured,
          non-sensitive signals derived from your DNS checks are sent to the AI
          provider &mdash; raw DNS strings and email headers are not.
        </p>
        <p>
          AI-generated output is provided <strong>&ldquo;as is&rdquo;</strong>,
          may be incomplete or inaccurate, and should be reviewed by a qualified
          administrator before you act on it. AI usage is metered against a
          monthly allowance that depends on your plan; once the allowance is
          reached, AI features are paused until the next cycle while the rest of
          the Service continues to function.
        </p>
      </>
    ),
  },
  {
    id: "plans-billing",
    title: "Plans, billing, and renewals",
    content: (
      <>
        <p>
          InboxRules offers <strong>Free</strong>, <strong>Pro</strong>, and{" "}
          <strong>Agency</strong> plans. Paid plans are sold and processed
          through <strong>Lemon Squeezy</strong>, which acts as our merchant of
          record and handles payment collection and applicable sales tax or VAT.
          Your purchase is also subject to Lemon Squeezy&rsquo;s terms.
        </p>
        <ul>
          <li>
            Paid subscriptions renew automatically at the end of each billing
            period until cancelled. By subscribing, you authorize recurring
            charges to your payment method.
          </li>
          <li>
            Fees are stated at checkout. We may change plan pricing or features
            on a prospective basis; changes take effect at your next renewal, and
            we will give reasonable notice of material changes.
          </li>
          <li>
            Any free trial or Free plan is offered as-is and may be modified or
            discontinued. We may verify eligibility and limit abuse of trials.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "cancellation",
    title: "Cancellation and refunds",
    content: (
      <>
        <p>
          You may cancel a paid plan at any time from your billing settings.
          Cancellation stops future renewals; your plan remains active until the
          end of the current paid period, after which your workspace reverts to
          the Free plan and its limits.
        </p>
        <p>
          Except where required by law or expressly stated at purchase, fees are
          non-refundable and there are no refunds or credits for partial periods
          or unused capacity. Refund handling is administered through Lemon
          Squeezy. If you believe you were billed in error, contact us at{" "}
          <Email /> and we will work with you in good faith.{" "}
          <strong>
            [Confirm your final refund and trial policy with legal counsel before
            publication.]
          </strong>
        </p>
      </>
    ),
  },
  {
    id: "fair-use",
    title: "Plan limits and fair use",
    content: (
      <>
        <p>
          Each plan includes limits on the number of monitored domains, the
          frequency of automated scans, the monthly AI analysis allowance, and
          API request rates. These limits protect the shared platform and are
          described in your plan and in our{" "}
          <a href="/documentation">documentation</a>. We may enforce reasonable
          technical limits and suspend activity that materially exceeds fair use
          or degrades the Service for others.
        </p>
      </>
    ),
  },
  {
    id: "your-data",
    title: "Your data and ownership",
    content: (
      <>
        <p>
          As between the parties, you retain all rights to the data you submit to
          the Service, including your domain list and configuration
          (&ldquo;Customer Data&rdquo;). You grant us a limited, worldwide license
          to host, process, and transmit Customer Data solely to operate,
          secure, and improve the Service and to provide support.
        </p>
        <p>
          We apply data-minimization practices: recipient identifiers and
          unsubscribe tokens are stored as one-way hashes rather than in the
          clear, and raw email headers submitted for analysis are retained only
          transiently. Our handling of personal data is described in the{" "}
          <a href="/privacy">Privacy Policy</a>.
        </p>
      </>
    ),
  },
  {
    id: "ip",
    title: "Intellectual property",
    content: (
      <>
        <p>
          The Service, including its software, design, and content (excluding
          Customer Data), is owned by <strong>{COMPANY}</strong> or its licensors
          and is protected by intellectual property laws. Subject to these Terms,
          we grant you a limited, non-exclusive, non-transferable right to access
          and use the Service.
        </p>
        <p>
          If you send us feedback or suggestions, you grant us a perpetual,
          royalty-free license to use it without restriction. &ldquo;InboxRules&rdquo;
          and our logos are our trademarks; you may not use them without prior
          written permission.
        </p>
      </>
    ),
  },
  {
    id: "third-parties",
    title: "Third-party services",
    content: (
      <>
        <p>
          The Service relies on third-party providers, including{" "}
          <strong>Clerk</strong> (authentication), <strong>Google Gemini</strong>{" "}
          (AI analysis), <strong>Lemon Squeezy</strong> (billing),{" "}
          <strong>Resend</strong> (transactional and alert email), and{" "}
          <strong>Cloudflare</strong> (edge unsubscribe hosting). Your use of
          features that depend on these providers may also be subject to their
          terms. We are not responsible for the acts, omissions, or availability
          of third-party services, and links or integrations do not imply our
          endorsement.
        </p>
      </>
    ),
  },
  {
    id: "availability",
    title: "Availability and changes to the Service",
    content: (
      <>
        <p>
          We work to keep the Service available but do not guarantee uninterrupted
          or error-free operation unless a separate written service-level
          agreement applies. We may perform maintenance, and we may add, modify,
          or discontinue features. Scan frequency and alert timing depend on
          factors outside our control, including public DNS behavior and
          third-party providers.
        </p>
      </>
    ),
  },
  {
    id: "disclaimers",
    title: "Disclaimers",
    content: (
      <>
        <p>
          The Service is provided <strong>&ldquo;as is&rdquo;</strong> and{" "}
          <strong>&ldquo;as available&rdquo;</strong> without warranties of any
          kind, whether express, implied, or statutory, including implied
          warranties of merchantability, fitness for a particular purpose, and
          non-infringement. We do not warrant that the Service will meet your
          requirements, that monitoring will detect every change, that alerts
          will be delivered on time, or that any configuration or AI suggestion
          will achieve a particular deliverability outcome. The Service does not
          provide legal advice.
        </p>
      </>
    ),
  },
  {
    id: "liability",
    title: "Limitation of liability",
    content: (
      <>
        <p>
          To the maximum extent permitted by law, InboxRules and{" "}
          <strong>{COMPANY}</strong> will not be liable for any indirect,
          incidental, special, consequential, or punitive damages, or for any
          loss of profits, revenue, data, goodwill, or deliverability, arising out
          of or relating to the Service, even if advised of the possibility of
          such damages.
        </p>
        <p>
          Our aggregate liability for all claims relating to the Service will not
          exceed the greater of the amounts you paid us for the Service in the
          twelve months before the event giving rise to the claim, or USD 100.
          Some jurisdictions do not allow certain limitations, so some of the
          above may not apply to you.
        </p>
      </>
    ),
  },
  {
    id: "indemnification",
    title: "Indemnification",
    content: (
      <>
        <p>
          You will defend, indemnify, and hold harmless{" "}
          <strong>{COMPANY}</strong> and its personnel from any claims, damages,
          and expenses (including reasonable legal fees) arising from your
          Customer Data, your use of the Service, your sending practices, or your
          breach of these Terms or of any law, including your representations
          about domain ownership and authorization.
        </p>
      </>
    ),
  },
  {
    id: "termination",
    title: "Suspension and termination",
    content: (
      <>
        <p>
          You may stop using the Service and close your account at any time.
          We may suspend or terminate your access if you materially breach these
          Terms, if required for security or legal reasons, or if your use poses
          a risk to the Service or others.
        </p>
        <p>
          On termination, your right to use the Service ends. We retain and delete
          Customer Data as described in the{" "}
          <a href="/privacy">Privacy Policy</a>; you are responsible for exporting
          any data you wish to keep before your account is closed. Terms that by
          their nature should survive &mdash; including ownership, disclaimers,
          limitation of liability, and indemnification &mdash; survive
          termination.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to these terms",
    content: (
      <>
        <p>
          We may update these Terms from time to time. If we make material
          changes, we will update the &ldquo;last updated&rdquo; date and provide
          reasonable notice, such as through the dashboard or by email. Your
          continued use of the Service after changes take effect constitutes
          acceptance of the revised Terms.
        </p>
      </>
    ),
  },
  {
    id: "governing-law",
    title: "Governing law and disputes",
    content: (
      <>
        <p>
          These Terms are governed by the laws of{" "}
          <strong>{JURISDICTION}</strong>, without regard to its conflict-of-laws
          rules, and the courts located there will have exclusive jurisdiction
          over any dispute, unless a separate agreement or mandatory local law
          provides otherwise.{" "}
          <strong>
            [Governing law, venue, and any arbitration or class-action waiver must
            be set by legal counsel for your jurisdiction.]
          </strong>
        </p>
      </>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    content: (
      <>
        <p>
          Questions about these Terms can be sent to <Email />. Formal or legal
          notices should be addressed to:
        </p>
        <ul>
          <li>
            <strong>{COMPANY}</strong>
          </li>
          <li>{ADDRESS}</li>
          <li>
            <Email />
          </li>
        </ul>
      </>
    ),
  },
]

export default function TermsPage() {
  return (
    <LegalDocument
      eyebrow="Legal"
      eyebrowIcon={<Scale aria-hidden="true" />}
      title="Terms of Service"
      updated={UPDATED}
      summary="These terms govern your access to and use of InboxRules — our email deliverability monitoring, AI-assisted DNS analysis, and one-click unsubscribe hosting. Please read them carefully."
      sections={sections}
    />
  )
}
