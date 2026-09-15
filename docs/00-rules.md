# 00-RULES
Version: 2.0.0 | Owner: [YOUR NAME] | Last Updated: 2026-09-15

## Business
CCTV installation company in Baguio City working through a partner hardware store.
- Customers walk into the store. The store quotes, collects every payment and supplies the equipment.
- We survey and install, then bill the store monthly for our service fees.
- The customer sees one Grand Total. Internally it splits into the Equipment Total (store revenue) and the Service Total (our revenue).
Process, pricing and rate card: docs/02-logic.md.

## Roles
| Role | Who | Does |
|------|-----|------|
| ADMIN | Our company | Rate card, pricing rules, quote templates, override approval, quotes, survey review, dispatch, reconciliation, audit log |
| STORE_STAFF | Partner store | Customers, quotes, equipment catalog and stock, payments, install dates, pick-lists |
| TECHNICIAN | Our installers | Assigned surveys and installations on the mobile PWA |

## Stack
| Layer | Tech |
|-------|------|
| Framework | Next.js 14+ App Router |
| Language | TypeScript strict |
| Database | Supabase (Postgres + Auth + Storage) |
| Styling | Tailwind CSS + shadcn/ui |
| Forms | React Hook Form + Zod |
| Automation | n8n (self-hosted Docker) |
| Mobile | PWA (manifest + service worker) — tech only |
| Hosting | Local/VPS + Cloudflare Tunnels |
| DB Client | @supabase/supabase-js (NO Prisma) |

## Approved Packages (WHITELIST — nothing else)
next, react, react-dom, typescript, tailwindcss, @supabase/supabase-js,
zod, react-hook-form, @hookform/resolvers, @dnd-kit/core, @dnd-kit/sortable,
lucide-react, date-fns, clsx, tailwind-merge, class-variance-authority

Need another package? STOP. Explain why. Wait for approval.

## AI Decision Protocol
1. This document overrides all assumptions.
2. Requirement conflicts with constraint → CONSTRAINT wins.
3. Two constraints conflict → ASK.
4. Default to SIMPLEST implementation.
5. No abstractions for "future flexibility."
6. Unsure frontend vs backend → BACKEND.
7. Unsure new component vs reuse → REUSE. Check 03-ui-map.md.
8. Missing info in referenced docs → ASK. Never guess.
9. Task >100 lines → Break into sub-tasks. Ask which first.
10. Build only the phase being worked on (docs/02-logic.md §Job Lifecycle). Items marked OPEN must be decided by the owner first.

## Architecture Rules
1. All DB writes → Server Actions. Never client-side writes.
2. All data fetching → React Server Components. No useEffect.
3. All forms → React Hook Form + Zod. No manual useState forms.
4. All images → Supabase Storage. Store the path in DB. Never binary.
5. All prices → DB (rate card, pricing rules, equipment catalog) or /lib/pricing.ts server-side. Never hardcoded in UI. Totals are never taken from a form.
6. Max component nesting: 3 levels. Extract beyond that.
7. One Server Action per mutation. No god-functions.
8. All inputs through Zod before DB. No raw interpolation.

## Error Handling
Every Server Action returns: { success: boolean; data?: T; error?: string }
Frontend errors → shadcn Toaster (top-right, 5s auto-dismiss).
Never raw error strings to user.
Offline failures → queue in localStorage, retry on reconnect, show banner.

## Folder Structure
/app → Routes: quotes/, store/, admin/, tech/, api/, login/
/components → Reusable UI (check 03-ui-map.md first)
/lib → pricing.ts, supabase-client.ts, validators.ts, types.ts, time.ts
/docs → This system. AI must NOT modify without instruction.
/supabase → migrations/

## Operational Constraints (Code-Affecting)
1. OFFLINE: Tech PWA caches today's jobs + customer details. Photo uploads queue in IndexedDB if offline. Compress to max 1MB before upload. Sync on reconnect.
2. POWER: All critical data in Supabase cloud. Outbound messages queue and retry; a message is never sent twice.
3. STORE STAFF UX: Min 16px font. Touch targets ≥44px. Confirm dialog for destructive actions. Every screen except the quote builder: max 3 buttons, one action per screen, no dropdowns >10 items. The quote builder is a guided flow (customer → template → lines → review) and uses searchable pickers instead of long dropdowns.
4. PAYMENT: The store collects Cash, GCash or Maya and records it by hand. 50% downpayment before a quote becomes a Job Order; the balance on completion. NEVER auto-confirm a payment.
5. DISPATCH: Max 4 jobs/tech/day. 45-min gap between zones. 30-min same zone. Rain: technicians put a job On Hold – Weather. NEVER auto-cancel.
6. EQUIPMENT: Pick-list generated from the job's equipment lines when the install is SCHEDULED. Store dispenses. Stock decrements. Alert if insufficient.
7. SETTLEMENT: Customer-facing views and documents show the Grand Total only. The Equipment/Service split is internal. Monthly statement = Service Totals of jobs COMPLETED that month.
8. TIME: Every date, day and month is Asia/Manila (UTC+8), via /lib/time.ts.

## Anti-Patterns
1. DO NOT use Prisma or Drizzle. Use @supabase/supabase-js.
2. DO NOT store images in Postgres. Use Supabase Storage.
3. DO NOT fetch all jobs client-side. Filter in DB query.
4. DO NOT create Redux/Zustand for server data. Use RSC + props.
5. DO NOT hardcode prices or rates in components.
6. DO NOT use react-beautiful-dnd. Use @dnd-kit/core.
7. DO NOT add spinners without skeletons. Use shadcn Skeleton.
8. DO NOT create API routes when Server Actions suffice.
9. DO NOT use `any`. Use `unknown` + narrow.
10. DO NOT modify /docs/ files. Flag contradictions. Owner decides.
11. DO NOT show the Equipment Total or Service Total to a customer.
12. DO NOT format dates with the server's clock. Use /lib/time.ts (Asia/Manila).

## Escalation Rules
- Same error 3x → STOP. Output error. Ask for guidance.
- Need unapproved package → STOP. Describe need.
- Contradicts this doc → Doc wins. Flag it.
- Task >100 lines → Break down. Ask which first.
- Going in circles → User closes chat. Fresh session.

## Doc Maintenance
- BEFORE schema change → update 01-schema.md first.
- BEFORE new component → add to 03-ui-map.md inventory.
- BEFORE new business rule → add to 02-logic.md.
- AFTER AI failure mode discovered → add to Anti-Patterns.
- All /docs/ changes → own git commit: "docs: [description]"
- AI may SUGGEST changes. Must NOT modify without instruction.
