# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

InboxRules — an email-deliverability monitoring SaaS. It checks a customer's sending domains for SPF/DKIM/DMARC/one-click-unsubscribe compliance, uses AI (Gemini) to explain problems and generate fixes in plain English, and hosts an RFC 8058 one-click unsubscribe endpoint at the edge.

## Monorepo layout

pnpm workspace (`pnpm-workspace.yaml` → `apps/*`). Three deployable apps, no shared `packages/`:

- **`apps/api`** — Fastify + Prisma + BullMQ backend. The core of the system. Deployed to Railway.
- **`apps/web`** — Next.js 16 (App Router) + Clerk + Tailwind v4 dashboard.
- **`apps/unsub`** — Cloudflare Worker (single `src/index.ts`) serving the RFC 8058 unsubscribe endpoint at the edge, deployed independently via Wrangler.

The `web/.next/` directory at the repo root is stray build output, not a separate app; the real frontend is `apps/web`. Each app has its own `package.json`; run commands from inside the app directory.

## Commands

All commands are run per-app. There is no root-level build/test orchestration (root `package.json` `test` script is a placeholder).

**`apps/api`** (uses `tsx`, needs a `.env` — see env vars below):
```bash
pnpm dev            # HTTP server + workers together (tsx watch src/server.ts)
pnpm workers        # workers only, separate process (tsx watch src/workers/index.ts)
pnpm start          # production: node dist/server.js (run tsc first)
pnpm db:migrate     # prisma migrate dev
pnpm db:generate    # prisma generate (run after editing schema.prisma)
pnpm db:push        # prisma db push
pnpm db:studio      # prisma studio
pnpm test:dns       # tsx src/test-dns.ts — ad-hoc DNS check script
```

**`apps/web`**:
```bash
pnpm dev            # next dev
pnpm build          # next build
pnpm lint           # eslint
```

**`apps/unsub`**:
```bash
pnpm dev            # wrangler dev src/index.ts
pnpm deploy         # wrangler deploy
```

There is **no automated test suite** anywhere in the repo. Prisma 7 does not auto-load `.env`, so all `db:*` scripts go through `dotenv -e .env`, and `prisma.config.ts` loads it manually.

## API architecture (`apps/api`)

Request flow: **routes → service → db/external**. Routes handle HTTP only (Zod validation, status codes, error shaping); business logic lives in the sibling `*.service.ts`. Modules live under `src/modules/<name>/` and are registered in `src/server.ts`.

- **`src/server.ts`** is the entry point. It builds the Fastify app, registers plugins (helmet, cors, rate-limit backed by Redis), mounts routes, **and in dev also starts the BullMQ workers + scheduler in the same process**. In production, workers are meant to run as a separate service via `src/workers/index.ts`.
- **Auth model:** two separate mechanisms.
  - User-facing routes are mounted under `/api/v1` behind `authMiddleware` (`src/middleware/auth.ts`), which verifies a **Clerk JWT** using Clerk's JWKS (via `jose`, no Clerk SDK), looks up the local `User` by `clerkId`, and attaches `request.tenantId` / `request.userId`. Every downstream service is scoped by `tenantId` — this is the tenant-isolation boundary; preserve it.
  - Internal machine-to-machine routes (e.g. `POST /internal/unsubscribe`, called by the `unsub` worker) authenticate with a static `x-internal-key` header compared against `INTERNAL_API_KEY`, **not** Clerk. Webhook routes (billing, Clerk) are mounted outside the `/api/v1` scope and verify provider signatures.
- **Background jobs (BullMQ + Redis):** queues are defined in `src/queue.ts` (`dns-poll`, `alert-dispatch`); workers consume them in `src/workers/*.worker.ts`. The **scheduler** (`src/workers/scheduler.ts`) runs on a 5-minute `setInterval`, finds domains due for a rescan based on plan tier (free 24h / pro 6h / agency 1h), and enqueues `dns-poll` jobs with a deterministic `jobId` so BullMQ dedupes. The weekly-report send is also piggybacked on this interval (Monday ~9am check).
- **DNS checker** (`src/modules/dns-checker/dns.service.ts`) is the domain core: it queries DNS directly and **only ever emits structured data** (`dns.types.ts`), never raw DNS strings. The AI layer consumes that structured data — keep this boundary; do not feed raw DNS/headers straight into prompts.
- **AI** (`src/modules/ai/`) wraps Gemini (`gemini.ts`, model `gemini-2.0-flash`) behind a shared system instruction. AI usage is logged to `AiUsageLog`. Some routes stream tokens to the client via SSE (see `/ai/analyze` and the web client's `streamAnalysis`).
- **Billing** (`src/modules/billing/`) uses **Lemon Squeezy** (not Stripe) via its REST API + signed webhooks. Plans: `free` / `pro` / `agency`, stored as `Tenant.plan`.

### Database (Prisma 7)

- Schema: `apps/api/prisma/schema.prisma`. Provider `postgresql`, generator `engineType = "client"`.
- Prisma 7 with `engineType="client"` **requires a driver adapter**: the shared client in `src/db.ts` wraps `@prisma/adapter-pg` (`PrismaPg`). Use the default export from `src/db.ts` everywhere; don't `new PrismaClient()` elsewhere.
- Everything is multi-tenant off the `Tenant` root; almost every model carries `tenantId` and most support soft-delete via `deletedAt` (queries filter `deletedAt: null`).
- When adding a relation, define **both sides** or Prisma errors (the schema comments call this out explicitly). PII is hashed, not stored raw: unsubscribe tokens and recipients are stored as SHA-256 hashes (`tokenHash`, `recipientHash`), suppression uses `emailHash`, and email analyses track `rawHeadersDeletedAt` for retention.

## Web architecture (`apps/web`)

- Next.js App Router. `middleware.ts` uses `clerkMiddleware` + `createRouteMatcher`; everything except `/`, `/sign-in`, `/sign-up` requires auth. The authenticated app lives under `app/dashboard/*`.
- All backend calls go through `lib/api.ts` (`useApi` hook) and `lib/useApiQuery.ts`, which attach the Clerk token as a `Bearer` header and hit `NEXT_PUBLIC_API_URL` (default `http://localhost:4500`) under `/api/v1`. API responses are wrapped as `{ data, ... }`; the hooks unwrap `.data`. SSE analysis is done with `fetch` + a manual stream reader (EventSource can't send auth headers).
- UI is shadcn-style components in `components/ui`, Tailwind v4, `recharts` for charts.

## Edge unsubscribe worker (`apps/unsub`)

Standalone Cloudflare Worker, no Node APIs. Handles `POST /unsubscribe/:token` (RFC 8058 one-click, must answer <10s and return 200), `GET /unsubscribe/:token` (manual confirmation page), and `/health`. It verifies the token's HMAC using `UNSUB_HMAC_SECRET` (must match the API), then calls the API's `POST /internal/unsubscribe` with the `INTERNAL_API_KEY`. Secrets are set with `wrangler secret put`, never in `wrangler.toml`.

## Environment variables

`apps/api` needs a `.env` (loaded by `dotenv`). Keys in use: `DATABASE_URL`, `REDIS_URL` (Upstash `rediss://` → TLS auto-enabled), `PORT` (default 4500), `NODE_ENV`, `FRONTEND_URL`, Clerk (`CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`, `CLERK_JWKS_URL`, `CLERK_DOMAIN`), `GEMINI_API_KEY`, Resend (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`), Lemon Squeezy (`LEMON_SQUEEZY_API_KEY`, `LEMON_SQUEEZY_STORE_ID`, `LEMON_SQUEEZY_WEBHOOK_SECRET`, `LS_PRO_VARIANT_ID`, `LS_AGENCY_VARIANT_ID`), and the unsub link (`UNSUB_HMAC_SECRET`, `UNSUB_WORKER_URL`, `INTERNAL_API_KEY`). `apps/web` uses `NEXT_PUBLIC_API_URL` plus Clerk keys.

## Known rough edges (safe to clean up)

- `src/server.ts` has unauthenticated `POST /test/ai/snippet` and `POST /test/ai/analyze` routes using a hardcoded `"test-tenant-id"`, marked "DELETE THIS before going to production."
- `src/middleware/auth.ts` has `console.log` calls that print the Clerk key / decoded JWKS URL on every cold start.
