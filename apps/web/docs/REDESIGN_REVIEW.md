# InboxRules interface redesign

Branch: `redesign/phase-1-design-system`.

## Product audit and scope

Reviewed the eight existing dashboard routes, root and dashboard layouts, shared
components and semantic tokens, the query and mutation helpers, Clerk middleware,
backend domain, analytics, alert and suppression contracts, DNS result types,
subscription presentation, and the unsubscribe worker's signed-token contract.
Read the web application's AGENTS.md, frontend architecture document, and the
installed Next 16 layouts/navigation guidance before modifying components.

Existing routes remain intact: overview, domains, compliance, alerts, analytics,
billing, settings, and unsubscribe. AI analysis remains in the domain wizard and
alert details. No separate AI route or new product capability was introduced.

The audit identified hardcoded alert/plan indicators, a nonfunctional header
search, decorated sidebar states, undifferentiated metric surfaces, initial zero
scores rendered as failures, fixed-duration scan feedback, nested alert buttons,
query failures disguised as empty/healthy states, generated summaries labelled
as facts, and domain-ID URLs incorrectly offered as usable unsubscribe headers.

## Implemented direction

- Retain the InboxRules inbox mark, indigo brand, Plus Jakarta Sans and JetBrains
  Mono. Use dark slate navigation, quieter surfaces, smaller radii, restrained
  metric accents, and stronger secondary-text contrast.
- Prioritize alerts requiring review, then domain health, then supporting history
  and authentication coverage. Domain names link to their existing compliance
  disclosure. Remove hardcoded alert counts and the plan label.
- Keep status facts and actions explicit: not scanned, failed authentication,
  failed lookup, scan queued, newly completed scan, acknowledged, and manually
  resolved. Scores describe configuration health, not certification or inbox placement.
- Keep DNS changes above generated explanations and suggestions. AI failures
  remain visible; no results is never a fabricated score of zero.
- Generate signed unsubscribe headers through the existing recipient-specific
  endpoint. The user supplies a real recipient. Copy failures are reported.
- Preserve query errors in widgets, notifications, billing, notification settings,
  endpoints and suppression events. Failed reads do not imply a free plan,
  healthy domains, or zero events.
- Add a focus-trapped mobile navigation dialog, skip link, keyboard-focusable
  table scroll areas, wrapping filters, mobile dialog gutters, and reduced-motion
  support. Alert actions are siblings of the disclosure button.

## Changed files

Routes and theme:

- `app/globals.css`
- `app/dashboard/layout.tsx`
- `app/dashboard/page.tsx`
- `app/dashboard/domains/page.tsx`
- `app/dashboard/compliance/page.tsx`
- `app/dashboard/alerts/page.tsx`
- `app/dashboard/analytics/page.tsx`
- `app/dashboard/billing/page.tsx`
- `app/dashboard/settings/page.tsx`
- `app/dashboard/unsubscribe/page.tsx`

Feature components:

- `components/dashboard/Sidebar.tsx`
- `components/dashboard/Header.tsx`
- `components/dashboard/DashboardShell.tsx`
- `components/dashboard/StatCards.tsx`
- `components/dashboard/DomainTable.tsx`
- `components/dashboard/AlertsFeed.tsx`
- `components/dashboard/HealthChart.tsx`
- `components/dashboard/ComplianceBreakdown.tsx`
- `components/dashboard/AddDomainWizard.tsx`

Shared components and primitives:

- `components/shared/MetricCard.tsx`
- `components/shared/HealthScore.tsx`
- `components/shared/AuthStatusBadge.tsx`
- `components/shared/StatusBadge.tsx`
- `components/shared/FilterBar.tsx`
- `components/ui/card.tsx`
- `components/ui/dialog.tsx`
- `components/ui/table.tsx`

Data helpers and documentation:

- `lib/useDomainScan.ts` — new reusable queue/completion feedback hook.
- `lib/useApiQuery.ts` — expose existing response pagination metadata.
- `lib/api.ts` — deliver streamed DNS JSON through its declared string callback.
- `FRONTEND_ARCHITECTURE.md`
- This review document.

## Verification and practical limits

- TypeScript: `pnpm --dir apps/web exec tsc --noEmit`.
- Lint: `pnpm --dir apps/web lint`.
- Production: `pnpm --dir apps/web build`; all 17 pages generated successfully.
  Existing warning: Next 16 deprecates the `middleware` filename in favor of
  `proxy`. That framework migration is outside the visual redesign.
- Render review uses the real components and compiled stylesheet in a temporary
  harness under `/tmp/inboxrules-review`. It supplies labelled test fixtures for
  auth and data, outside the product source. There are no seeded display values
  or authentication bypasses in the application.
- The render matrix covers eight dashboard routes, four data states, and widths
  of 375, 768, and 1440 pixels. It checks rendered main content, page headings,
  document overflow, and nested buttons. All 96 combinations pass. Screenshots
  support manual inspection with the production fonts and stylesheet.
- Additional browser assertions cover mobile drawer focus/Escape, queued scan
  feedback and timestamp-confirmed completion, evidence before AI guidance,
  non-nested alert actions, and recipient-specific header generation. Semantic
  status, primary-button, destructive-button, and muted-text contrast are measured
  in both themes; the tested pairs all exceed 4.5:1 (minimum 4.76:1).
- Two isolated regression tests exercise the real API streaming helper with
  mocked HTTP responses: authenticated split-chunk DNS/AI delivery, and failed
  analysis without fabricated evidence or false completion. Both pass. Temporary
  review scripts and screenshots remain under `/tmp/inboxrules-review`.
- These component checks do not establish that live Clerk, PostgreSQL, Redis,
  Gemini, billing checkout, or the deployed unsubscribe worker are functioning.
  An authenticated integration pass against a configured environment remains
  necessary before release.
- The repository's root `test` script is an intentional failure placeholder;
  no existing frontend automated suite is configured.

## Preserved architecture

No backend, database schema, Clerk middleware, tenant selection, billing service,
subscription enforcement, validation, scheduler, queue worker, or token-signing
logic was changed. Existing authenticated query/mutation helpers, semantic token
architecture, and Radix confirmation dialogs remain in use. No dependencies were
added. Existing untracked `.agents/` content was left intact.

## Follow-up issues discovered in existing contracts

1. The frontend's established score categories use 80/60 while backend overview
   warning/critical aggregates use 80/50. The overview now labels high-score
   counts explicitly; a separately agreed contract change should unify the
   category boundary without silently changing backend behavior here.
2. Some domain views load at most 100 domains; alerts load 50, and suppression
   events load 20. Cursor pagination is available in backend responses but not
   implemented throughout the UI. Loaded-domain counts and recent-alert labels
   avoid implying a complete global list. Large tenants need pagination work.
3. Manual resolution records an operator's decision; it does not verify DNS
   remediation. The UI says to run a domain scan to verify the configuration.
4. Scan completion polling stops after 90 seconds or on navigation. Background
   workers continue independently; later refreshes retrieve completed results.
5. Unsubscribe headers are per-recipient. This UI generates an individual set;
   campaign senders must call the same existing API for each recipient.
