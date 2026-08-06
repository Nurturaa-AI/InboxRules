# Frontend Architecture

The InboxRules dashboard (`apps/web`) — a Next.js 16 App Router application for
monitoring email-deliverability compliance (SPF/DKIM/DMARC, one-click
unsubscribe). This document describes how the frontend is put together and how to
extend it without regressing the design system.

## Table of contents

1. [Stack](#stack)
2. [Folder structure](#folder-structure)
3. [Component hierarchy](#component-hierarchy)
4. [Design system](#design-system)
5. [Token system](#token-system)
6. [Shared components](#shared-components)
7. [Data flow](#data-flow)
8. [Query layer](#query-layer)
9. [Theme architecture](#theme-architecture)
10. [Accessibility guidelines](#accessibility-guidelines)
11. [Responsive breakpoints](#responsive-breakpoints)
12. [Naming conventions](#naming-conventions)
13. [How to add a new dashboard page](#how-to-add-a-new-dashboard-page)
14. [How to build a new shared component](#how-to-build-a-new-shared-component)
15. [How to use the design tokens](#how-to-use-the-design-tokens)
16. [Common patterns](#common-patterns)
17. [Anti-patterns](#anti-patterns)
18. [Future roadmap](#future-roadmap)

---

## Stack

| Concern | Choice | Version |
|---|---|---|
| Framework | Next.js (App Router, Turbopack) | `16.2.6` |
| UI runtime | React | `19.2.4` |
| Styling | Tailwind CSS (CSS-first `@theme`) | `^4` |
| Primitives | `radix-ui` (unified package) | `^1.4.3` |
| Variants | `class-variance-authority` | `^0.7.1` |
| Class merge | `clsx` + `tailwind-merge` (via `cn()`) | `^2.1.1` / `^3.6.0` |
| Icons | `lucide-react` | `^1.16.0` |
| Toasts | `sonner` | `^2.0.7` |
| Charts | `recharts` | `^3.8.1` |
| Theme | `next-themes` | `^0.4.6` |
| Auth | `@clerk/nextjs` | `^7.3.7` |

> **⚠ Next 16 is not the Next.js in your training data.** Per `AGENTS.md`, verify
> any Next-specific API against `node_modules/next/dist/docs/` before using it.
> (The build currently warns that the `middleware` file convention is being
> renamed to `proxy` — a framework-level migration, tracked in the roadmap.)

---

## Folder structure

```
apps/web/
├── app/                          # App Router — routes + layouts
│   ├── layout.tsx                # Root: ClerkProvider → ThemeProvider → Toaster
│   ├── globals.css               # Design tokens (@theme) + light/dark palettes
│   ├── page.tsx                  # Public landing
│   ├── sign-in/[[...sign-in]]/   # Clerk catch-all sign-in
│   ├── sign-up/[[...sign-up]]/   # Clerk catch-all sign-up
│   └── dashboard/
│       ├── layout.tsx            # Sidebar + DashboardShell + AddDomainWizard host
│       ├── page.tsx              # Dashboard home
│       ├── domains/page.tsx
│       ├── compliance/page.tsx
│       ├── alerts/page.tsx
│       ├── analytics/page.tsx
│       ├── billing/page.tsx
│       ├── settings/page.tsx
│       └── unsubscribe/page.tsx
│
├── components/
│   ├── ui/                       # shadcn-style primitives (generic, app-agnostic)
│   │   ├── button.tsx  badge.tsx  card.tsx  input.tsx  switch.tsx
│   │   ├── dialog.tsx  alert-dialog.tsx  dropdown-menu.tsx  table.tsx
│   │   ├── skeleton.tsx  sonner.tsx
│   ├── shared/                   # Composed, app-aware building blocks
│   │   ├── PageHeader.tsx  MetricCard.tsx  StatusBadge.tsx  HealthScore.tsx
│   │   ├── FilterBar.tsx  DataTable.tsx  EmptyState.tsx  LoadingSkeleton.tsx
│   │   ├── ConfirmationDialog.tsx  SearchInput.tsx  ActionMenu.tsx
│   │   ├── DomainAvatar.tsx  AuthStatusBadge.tsx
│   ├── dashboard/                # Feature widgets & shell chrome
│   │   ├── Sidebar.tsx  Header.tsx  DashboardShell.tsx
│   │   ├── StatCards.tsx  DomainTable.tsx  AlertsFeed.tsx
│   │   ├── HealthChart.tsx  ComplianceBreakdown.tsx  AddDomainWizard.tsx
│   └── theme-provider.tsx        # "use client" wrapper around next-themes
│
├── lib/
│   ├── useApiQuery.ts            # Query hook + apiRequest() + refreshAllQueries()
│   ├── api.ts                    # useApi() (get/post/del + SSE streamAnalysis)
│   └── utils.ts                  # cn(), scoreToStatus(), timeAgo(), domainInitials()
│
├── middleware.ts                 # Clerk route protection
├── next.config.ts  postcss.config.mjs  eslint.config.mjs
└── components.json               # shadcn registry config
```

**The three component tiers — the most important structural rule:**

| Tier | Directory | Knows about the app? | Depends on | Example |
|---|---|---|---|---|
| **Primitive** | `components/ui/` | No | radix, CVA, `cn` | `Button`, `Card`, `Badge` |
| **Shared** | `components/shared/` | A little (domain concepts, status kinds) | `ui/` + `lib/utils` | `StatusBadge`, `DataTable` |
| **Feature** | `components/dashboard/` | Yes (fetches, business logic) | `shared/` + `ui/` + `lib` | `DomainTable`, `Sidebar` |

Dependencies only ever point **downward** (feature → shared → primitive). A
primitive must never import from `shared/` or `dashboard/`.

---

## Component hierarchy

Runtime tree for an authenticated dashboard route:

```
RootLayout (app/layout.tsx)
└── ClerkProvider
    └── ThemeProvider (next-themes, attribute="class", defaultTheme="light")
        ├── DashboardLayout (app/dashboard/layout.tsx)          ["use client"]
        │   ├── Sidebar                     — nav, off-canvas drawer on mobile
        │   ├── DashboardShell
        │   │   ├── Header                  — search, theme toggle, notifications, menu trigger
        │   │   └── <main>                  — {page content}
        │   │       └── e.g. DomainsPage
        │   │           ├── PageHeader
        │   │           ├── FilterBar
        │   │           └── DataTable → StatusBadge / HealthScore / ActionMenu
        │   └── AddDomainWizard             — conditionally mounted, hosted at layout level
        └── Toaster (sonner)                — one instance, rendered at root
```

- **Shell chrome** (`Sidebar`, `Header`, `DashboardShell`) is owned by
  `app/dashboard/layout.tsx` and persists across route changes.
- **`AddDomainWizard`** is hosted at the layout so "Add domain" works from any
  page. On success it calls `refreshAllQueries()` (see [Query layer](#query-layer)).
- **Pages** are thin: they fetch data and compose `shared/` components. Business
  logic that isn't reusable lives in a `dashboard/` feature widget.

---

## Design system

**Direction:** *Refined modern SaaS* (Linear / Vercel / Resend) — subtle borders,
near-flat surfaces, a single indigo brand accent used sparingly, minimal
gradients, strong typographic hierarchy, fully tokenized light + dark.

### Type

| Role | Font | CSS var | Usage |
|---|---|---|---|
| Body / UI | Plus Jakarta Sans | `--font-sans` | Default (`font-sans` on `<html>`) |
| Mono | JetBrains Mono | `--font-mono` | Scores, domains, code, timestamps (`font-mono`) |

Both are loaded via `next/font/google` in `app/layout.tsx` and exposed as CSS
variables. Weights are restricted to those actually used (400–800 sans, 400/500/700 mono).

### Radius

Single base token `--radius: 0.65rem`, scaled into a Tailwind ramp
(`rounded-sm` … `rounded-4xl`) via `calc()` in `@theme inline`. Cards use
`rounded-xl`, buttons/inputs `rounded-md`, badges `rounded-full`.

### Shape language

- Cards: 1px `border-border`, `bg-card`, `shadow-sm`, `rounded-xl`.
- One primary CTA per view (`Button` default/indigo). Everything else is
  `outline`/`ghost`/`secondary`.
- Status is **never** communicated by color alone — always color + icon + text
  (see `StatusBadge`).

---

## Token system

All color is defined as **oklch** CSS custom properties in `app/globals.css`,
then bridged to Tailwind utilities via `@theme inline`. There are three layers:

```
:root / .dark            @theme inline                 Tailwind utility
------------------       ----------------------        ------------------
--primary: oklch(...)  → --color-primary: var(--primary) → bg-primary / text-primary
--success: oklch(...)  → --color-success: var(--success) → bg-success / text-success
```

**Palette groups** (each has the value + a `-foreground` for text on it):

- **Surfaces:** `background`, `card`, `popover`, `muted`, `secondary`, `accent`, `sidebar*`
- **Brand:** `primary` (indigo), `ring`
- **Semantic status:** `success` (green), `warning` (amber), `danger`/`destructive` (red), `info` (blue) — each additionally has a **`-subtle`** tinted-background variant used by badges (`bg-success-subtle text-success`).
- **Structural:** `border`, `input`, `ring`
- **Charts:** `chart-1` … `chart-5` (indigo-anchored ramp).

Both `:root` (light) and `.dark` define the **same token names** with
theme-appropriate values, so component classes never branch on theme —
`bg-card` is correct in both modes.

> The legacy token bridge (`--surface`, `--text`, `--bg`, …) that back-filled
> pre-migration references has been **removed** — every page now uses canonical
> tokens. Do not reintroduce those names.

**Canonical thresholds** live in code, not scattered magic numbers:
`scoreToStatus(score)` in `lib/utils.ts` maps `≥80 → success`, `≥60 → warning`,
`<60 → danger`. `HealthScore` and any status coloring must go through it.

---

## Shared components

All in `components/shared/`. Import from `@/components/shared/<Name>`.

| Component | Purpose | Key props |
|---|---|---|
| **PageHeader** | Standard page title block | `title`, `description?`, `badge?`, `action?` |
| **MetricCard** | Flat KPI tile | `label`, `value`, `icon?`, `delta?`, `trend?`, `trendUpIsGood?`, `hint?` |
| **StatusBadge** | The canonical status pill (color + icon + text) | `status: StatusKind`, `label?`, `showIcon?` |
| **HealthScore** | 0–100 score as bar/ring/text, colored via `scoreToStatus` | `score`, `variant?: bar\|ring\|text`, `showValue?`, `size?` |
| **FilterBar** | Accessible segmented filter (real `<button>` + `aria-pressed`) | `options`, `value`, `onValueChange`, `aria-label?` |
| **DataTable** | Generic table with loading/empty/error slots | `columns`, `data`, `getRowKey?`, `onRowClick?`, `loading?`, `emptySlot?`, `error?` |
| **EmptyState** | Zero-data / empty-search view | `icon?`, `title`, `description?`, `action?`, `size?: sm\|md` |
| **LoadingSkeleton** | Layout-shaped skeletons | `variant?: text\|card\|metrics\|table`, `count?` |
| **ConfirmationDialog** | Replaces native `confirm()`/`alert()`; focus-trapped | `open`, `onOpenChange`, `title`, `onConfirm`, `variant?`, … |
| **SearchInput** | Labeled (visually-hidden) search field, clearable | `value`, `onValueChange`, `label?`, `clearable?` |
| **ActionMenu** | Keyboard-accessible row/overflow menu | `items: ActionMenuItem[]`, `label?`, `align?`, `trigger?` |
| **DomainAvatar** | Two-letter domain monogram tile | `domain`, `size?: sm\|md` |
| **AuthStatusBadge** | Auth/verification status pill | — |

### Supporting types

```ts
// StatusBadge
type StatusKind = "success" | "warning" | "danger" | "info" | "neutral" | "pending"
// statusFromString(value) maps free-form API strings → StatusKind (falls back to "neutral")

// DataTable
interface DataTableColumn<T> {
  header: React.ReactNode
  key: string
  cell: (row: T, index: number) => React.ReactNode
  className?: string
  width?: string       // e.g. "w-12"
}

// ActionMenu
interface ActionMenuItem {
  label: React.ReactNode
  icon?: LucideIcon
  onClick: () => void
  variant?: "default" | "destructive"
  disabled?: boolean
}
```

### Primitive variant APIs (`components/ui/`)

**Button** — `variant`: `default` (primary CTA, one per view), `secondary`,
`outline`, `ghost`, `destructive`, `link`. `size`: `default`, `sm`, `xs`, `lg`,
plus square `icon`, `icon-sm`, `icon-xs`, `icon-lg`. **Icon-only buttons require
`aria-label`.** Use `asChild` to render as a `<Link>`. (Full doc block lives in
`components/ui/button.tsx`.)

**Badge** — `variant`: `default`, `secondary`, `destructive`, `outline`,
`success`, `warning`, `info`, `ghost`, `link`. The status variants use the
`-subtle` tokens (`bg-success-subtle text-success`).

**Card** — parts: `Card`, `CardHeader`, `CardTitle`, `CardDescription`,
`CardAction`, `CardContent`, `CardFooter`. `size`: `default` | `sm` (tighter gap/padding).

---

## Data flow

```
Clerk session ──► useAuth().getToken()
                        │  Bearer JWT
                        ▼
   ┌──────────────────────────────────────────────┐
   │  lib/useApiQuery.ts    lib/api.ts             │
   │  useApiQuery<T>(path)  useApi(): get/post/del │
   └──────────────────────────────────────────────┘
                        │  fetch  ${NEXT_PUBLIC_API_URL}/api/v1<path>
                        ▼
              Fastify backend (apps/api)
                        │  { data, ... }  (envelope)
                        ▼
     hooks unwrap .data  ──►  component state  ──►  shared components render
```

- **Every** request attaches the Clerk token as `Authorization: Bearer <jwt>`.
- Base URL: `process.env.NEXT_PUBLIC_API_URL` (default `http://localhost:4500`),
  always suffixed with `/api/v1`.
- API responses are enveloped as `{ data, ... }`. `useApiQuery` unwraps with
  `json.data ?? json`, tolerating both enveloped and raw payloads.
- **Reads** → `useApiQuery`. **Mutations** → `apiRequest(path, method, token, body?)`
  or `useApi().post/del`. **Streaming AI analysis** → `useApi().streamAnalysis`
  (manual `fetch` + `ReadableStream` reader, because `EventSource` cannot send
  auth headers).

---

## Query layer

`lib/useApiQuery.ts` is the primary read layer.

```ts
const { data, loading, error, refetch } = useApiQuery<Domain[]>("/domains?limit=100")
```

- Returns `{ data: T | null, loading, error, refetch }`.
- Fetches on mount (via a `setTimeout(…, 0)` effect to avoid a synchronous
  `setState`-in-render), and re-fetches whenever `refetch`'s identity changes
  (keyed on `path`).

### Global refresh signal

A module-level pub/sub lets any mutation refresh **every mounted query** without
a full-page reload:

```ts
import { refreshAllQueries } from "@/lib/useApiQuery"

// After a successful create/delete elsewhere in the tree:
refreshAllQueries()
```

Internally each `useApiQuery` subscribes via `useSyncExternalStore`; calling
`refreshAllQueries()` bumps a version counter that re-runs every hook's fetch.
This is how `AddDomainWizard` (hosted in the layout) refreshes list pages after
adding a domain — replacing the old `window.location.reload()`.

### One-off mutations

```ts
import { apiRequest } from "@/lib/useApiQuery"
const token = await getToken()
await apiRequest(`/domains/${id}`, "DELETE", token)
refetch()                    // local refresh, or refreshAllQueries() for global
```

> **Note — two fetch conventions still coexist.** Most pages use `useApiQuery`,
> but the home widgets `StatCards` and `DomainTable` use bespoke `fetch` +
> `useState` and therefore refresh via a local `refreshKey` remount rather than
> the global signal. New code should use `useApiQuery`. (Tracked in the roadmap.)

---

## Theme architecture

- **Single source of truth: `next-themes`.** Configured in `app/layout.tsx` with
  `attribute="class"`, `defaultTheme="light"`, `enableSystem={false}`. It toggles
  the `.dark` class on `<html>`.
- `components/theme-provider.tsx` is a thin `"use client"` wrapper so the context
  works in the server-rendered root layout.
- `suppressHydrationWarning` on `<html>` prevents the class-set-before-hydration
  warning.
- To read/switch theme in a client component: `const { theme, setTheme } = useTheme()`
  (from `next-themes`). The header theme toggle uses this.
- **There is no manual `localStorage`/`.dark` toggle** — the earlier dual
  mechanism was removed. Never add a second one; components stay theme-agnostic by
  using tokens (`bg-card`, not `bg-white dark:bg-slate-900`).

---

## Accessibility guidelines

Target: **WCAG AA**, full keyboard operability.

1. **Status is never color-only.** Use `StatusBadge` (color + icon + text) or
   pair any colored indicator with a label/icon.
2. **Icon-only buttons must have `aria-label`.** Enforced by convention across
   `Button size="icon*"` usages (copy buttons, refresh, menu triggers).
3. **Toggles/filters** expose `aria-pressed` — get this for free by using
   `FilterBar` instead of hand-rolled pills.
4. **Disclosures** (expandable rows, e.g. compliance) use `aria-expanded` +
   `aria-controls` pointing at the panel `id`.
5. **Dialogs** use the radix `dialog`/`alert-dialog` primitives via
   `ConfirmationDialog` — focus trap, `Esc` to close, restore focus on close.
   Never use native `alert()`/`confirm()`.
6. **Focus is always visible.** Interactive elements carry
   `focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none`.
   Do not remove outlines without a visible replacement.
7. **Inputs are labeled.** `SearchInput` renders a visually-hidden `<label>`;
   other inputs wire `htmlFor`/`id`.
8. **Feedback is announced.** Mutations report via `sonner` toasts
   (`toast.success` / `toast.error`) — never fail silently.
9. **Hover state is CSS, not JS.** Use `hover:`/`focus-visible:` utilities, not
   `onMouseEnter`/`onMouseLeave` (which skip keyboard users).

---

## Responsive breakpoints

Tailwind defaults (mobile-first). Design against these three primary stops:

| Prefix | Min width | Typical use |
|---|---|---|
| *(base)* | 0 | Single column, stacked |
| `sm:` | 640px | 2-up metric grids, inline rows |
| `md:` | 768px | Multi-column comparison grids |
| `lg:` | 1024px | Auth split layout, main + rail |
| `xl:` | 1280px | Home: `xl:grid-cols-[minmax(0,1fr)_320px]` (main + fixed rail) |

Rules:

- **Mobile-first:** base styles target the smallest screen; add complexity
  upward with `sm:`/`md:`/`lg:`/`xl:`.
- **No fixed pixel widths** on layout containers — use fluid `flex-col`,
  `grid`, `minmax(0,1fr)`, and `min-w-0` to prevent overflow. (Pages with no
  breakpoint prefixes, e.g. settings/alerts, are intentionally fluid
  single-column.)
- **Sidebar** collapses to an off-canvas drawer below `lg`, toggled by the
  header hamburger (`onMenuClick`).
- **Tables** get horizontal scroll for free from the `ui/table` primitive.
- The only permitted inline `style` is a **dynamic numeric dimension** (a bar
  width / ring height computed from data) — everything else is a token class.

---

## Naming conventions

| Thing | Convention | Example |
|---|---|---|
| Component files | `PascalCase.tsx` | `MetricCard.tsx` |
| Primitive files (`ui/`) | `kebab-case.tsx` (shadcn) | `alert-dialog.tsx` |
| Component export | Named, matches file | `export function MetricCard` |
| Feature widget export | Default export | `export default function Sidebar` |
| Props interface | `<Component>Props`, exported | `MetricCardProps` |
| Hooks | `useX` | `useApiQuery`, `useApi` |
| Utility fns | `camelCase`, verb-first | `scoreToStatus`, `timeAgo` |
| CSS tokens | `--kebab-case` (+ `-foreground`/`-subtle`) | `--success-subtle` |
| Radix imports | `import { X as XPrimitive } from "radix-ui"` | `Dialog as DialogPrimitive` |
| Route dirs | `kebab-case/` under `app/dashboard/` | `unsubscribe/page.tsx` |
| Boolean props | `is`/`show`/`has` prefix | `showIcon`, `clearable` |

---

## How to add a new dashboard page

1. **Create the route:** `app/dashboard/<name>/page.tsx`. Add `"use client"` if
   it fetches or holds state (most do).
2. **Add nav:** append `{ label, icon, href: "/dashboard/<name>" }` to the
   relevant group in `components/dashboard/Sidebar.tsx` (icon from `lucide-react`).
3. **Fetch with the query layer:**
   ```tsx
   const { data, loading, error, refetch } = useApiQuery<Thing[]>("/things")
   ```
4. **Compose from shared components** — do not hand-roll headers/tables/badges:
   ```tsx
   return (
     <div className="space-y-6">
       <PageHeader title="Things" description="…" action={<Button>New</Button>} />
       <FilterBar options={OPTS} value={filter} onValueChange={setFilter} aria-label="Filter things" />
       {loading ? (
         <LoadingSkeleton variant="table" count={5} />
       ) : (
         <DataTable
           columns={columns}
           data={data ?? []}
           getRowKey={(t) => t.id}
           emptySlot={<EmptyState icon={Inbox} title="No things yet" description="…" />}
           error={error}
         />
       )}
     </div>
   )
   ```
5. **Mutations** → `apiRequest` + `toast.success`/`toast.error`, then `refetch()`
   (or `refreshAllQueries()` if the change affects other pages). Destructive
   actions go through `ConfirmationDialog`.
6. **Only token classes** — no hex, no inline `style` (except a dynamic numeric
   dimension), no `any`.
7. **Verify:** `npx tsc --noEmit` and `pnpm lint` must both be clean; check the
   page at mobile / tablet / desktop and with keyboard only.

---

## How to build a new shared component

1. **Confirm the tier.** Generic and app-agnostic → `components/ui/` (shadcn
   style). App-aware composition of primitives → `components/shared/`.
2. **File & export:** `components/shared/<Name>.tsx`, named export `<Name>`,
   exported `<Name>Props`.
3. **Author against installed versions.** Hand-write against the installed
   `radix-ui`/CVA — don't run the shadcn CLI (it can overwrite the custom
   registry). Radix import convention:
   `import { Dialog as DialogPrimitive } from "radix-ui"`.
4. **Style with tokens + `cn()`**, and always spread `className` last so callers
   can override:
   ```tsx
   export interface ThingProps extends React.ComponentProps<"div"> {
     tone?: "default" | "danger"
   }
   export function Thing({ tone = "default", className, ...props }: ThingProps) {
     return (
       <div
         className={cn(
           "rounded-lg border border-border bg-card p-4 text-card-foreground",
           tone === "danger" && "border-destructive/30 bg-danger-subtle",
           className,
         )}
         {...props}
       />
     )
   }
   ```
5. **Variants → CVA** when there are ≥3 style axes; keep the `variant`/`size` prop
   shape consistent with `Button`/`Badge`.
6. **Accessibility baked in:** roles/ARIA, `focus-visible` rings, keyboard
   operation, icon-only → require `aria-label`. Never rely on color alone.
7. **Document** non-obvious variants in a leading JSDoc block (see
   `components/ui/button.tsx` for the reference style).

---

## How to use the design tokens

**Always reach for a Tailwind utility backed by a token — never a raw color.**

| You want | Use | Not |
|---|---|---|
| Page/card surface | `bg-background`, `bg-card`, `bg-muted` | `bg-white`, `bg-slate-50` |
| Body / secondary text | `text-foreground`, `text-muted-foreground` | `text-black`, `text-gray-500` |
| Brand action | `bg-primary text-primary-foreground` | `bg-indigo-600` |
| Borders | `border-border` | `border-gray-200` |
| Success/warn/danger/info fill | `bg-success` / `bg-warning` / `bg-danger` / `bg-info` | `#16a34a`, `bg-green-600` |
| Status **badge** (tinted) | `bg-success-subtle text-success` | custom light-green |
| Focus ring | `focus-visible:ring-ring/40` | `ring-blue-400` |

- **Text-on-color:** pair a fill token with its `-foreground`
  (`bg-primary text-primary-foreground`).
- **Theme-agnostic:** the same token renders correctly in light and dark, so you
  never write `dark:` color overrides for standard surfaces/text.
- **Score coloring** must derive from `scoreToStatus(score)` (or use
  `HealthScore`), never a bespoke threshold.
- **Adding a token:** define it in **both** `:root` and `.dark` in
  `app/globals.css`, then expose it in `@theme inline` as
  `--color-<name>: var(--<name>)` so `bg-<name>`/`text-<name>` resolve.

---

## Common patterns

- **Page skeleton:** `PageHeader` → filters → content, wrapped in
  `<div className="space-y-6">`.
- **Loading/empty/error triad:** `LoadingSkeleton` while `loading`; `EmptyState`
  (via `DataTable emptySlot`) when empty; `error` slot / toast on failure.
- **Status rendering:** map an API string with `statusFromString()` then render
  `<StatusBadge status={…} />`.
- **Destructive action:** `Button variant="destructive"` → opens
  `ConfirmationDialog variant="destructive"` → `apiRequest(DELETE)` →
  `toast.success` → `refetch()`.
- **Copy-to-clipboard:** icon `Button` with `aria-label`, swap icon to `Check`
  briefly, `toast.success("Copied")`.
- **Cross-tree refresh:** mutation in a globally-hosted component (e.g. the
  wizard) → `refreshAllQueries()`.
- **Dynamic bar/ring:** the *value* is inline
  (`style={{ width: `${pct}%` }}`), the *color* is a token class
  (`bg-success`) chosen via `scoreToStatus`.
- **Mock widgets are labeled:** `HealthChart` and `ComplianceBreakdown` run on
  placeholder data and show a visible **"Sample data"** badge until wired to a
  real endpoint.

## Anti-patterns

Avoid these — they were removed during migration and should not return:

- ❌ **Hardcoded colors** — `#4f46e5`, `bg-indigo-600`, inline hex. Use tokens.
- ❌ **Inline `style` for anything static** — only dynamic numeric dimensions
  (bar width/height) may use `style`.
- ❌ **JS hover** (`onMouseEnter`/`onMouseLeave`) — use `hover:`/`focus-visible:`.
- ❌ **`window.location.reload()`** — use `refetch()` / `refreshAllQueries()`.
- ❌ **Native `alert()` / `confirm()`** — use `sonner` toasts / `ConfirmationDialog`.
- ❌ **Silent failures** — every mutation reports success or error.
- ❌ **Color-only status** — always color + icon + text.
- ❌ **`any` / unlabeled icon buttons / removed focus outlines.**
- ❌ **`dark:` color overrides on standard surfaces** — tokens already theme.
- ❌ **Re-adding the legacy token bridge** (`--surface`, `--text`, `--bg`, …).
- ❌ **Duplicating primitives** — reuse `shared/` (one `StatusBadge`, one
  `timeAgo`, one `DataTable`), don't re-implement per page.
- ❌ **Importing `shared/`/`dashboard/` from a `ui/` primitive** — deps point down only.

## Future roadmap

Known, deliberately-deferred work (also see the Phase 2 report):

1. **Unify the fetch layer.** Migrate `StatCards` and `DomainTable` off bespoke
   `fetch`/`useState` onto `useApiQuery`, so the home page participates in
   `refreshAllQueries()` and drops the `refreshKey` remount.
2. **Real data for mock widgets.** Wire `HealthChart` (health-history) and
   `ComplianceBreakdown` (compliance-summary) to real endpoints, and replace the
   analytics "Sample data" 7-day trend with a real time series — then remove the
   "Sample data" badges.
3. **Suppression CSV export.** Add `GET /suppression/export` (CSV stream) and
   reinstate the export button on the unsubscribe page.
4. **Billing cycle support.** Make the annual/monthly toggle functional once the
   checkout endpoint accepts a billing cycle (currently display-only).
5. **Header interactivity.** Wire global search and notification
   unread-count/acknowledgement (currently presentational).
6. **`middleware` → `proxy`.** Adopt the Next 16 rename to clear the build
   deprecation warning; verify against `node_modules/next/dist/docs/`.

---

*Keep this document in sync when you add a token, a shared component, or a route.
Every change should leave `npx tsc --noEmit` and `pnpm lint` clean.*
