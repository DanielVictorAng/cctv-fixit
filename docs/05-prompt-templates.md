# 05-PROMPT-TEMPLATES (My reference. Not loaded by AI.)

## Database
Migration: "Read @docs/00-rules.md and @docs/01-schema.md. Generate Supabase SQL migration for [table/alteration]. Include indexes + RLS. Output as .sql file."
Add column: "Read @docs/01-schema.md. Add [field] ([type]) to [table]. Generate: 1) ALTER migration, 2) Updated TS type, 3) List affected Server Actions."
Types: "Read @docs/01-schema.md. Generate TS interfaces for all tables → /lib/types.ts."

## Server Actions
New: "Read @docs/00-rules.md and @docs/02-logic.md. Create Server Action [name] in /app/actions/[domain].ts. Behavior: [specific]. Zod validation. Typed return. Audit log."
Transition: "Read @docs/02-logic.md. Server Action: ticket [STATE_A] → [STATE_B]. Validate: [fields]. Reject invalid. Audit log."

## Frontend
Component: "Read @docs/00-rules.md and @docs/03-ui-map.md. Create [Name] at /components/[path].tsx. Props: [list]. Uses: [existing components]. Definition of Done."
Page: "Read @docs/03-ui-map.md. Page at /app/[route]/page.tsx. Role: [role]. Data: [list]. RSC fetch. Loading skeleton. Empty state."
Bug: "Error: [max 3 lines]. File: [path] line [X]. Function: [paste only function]. Fix without changing signature."

## Integrations
Webhook: "Read @docs/04-integrations.md. Create [platform] webhook at /api/webhooks/[platform]. Signature verify. Parse. Dedup. Create ticket. Auto-reply."
Outbound: "Read @docs/04-integrations.md. Server Action sendNotification(ticketId, templateKey). Fetch contact. Select template. Send. Retry per doc."

## ANTI-PROMPTS (NEVER USE)
❌ "Build the ticketing system"
❌ "Make it look nice"
❌ "Add all features"
❌ "Refactor everything"
❌ "Optimize the codebase"
❌ "Build the dispatch system"
✅ Break into atomic tasks using templates above.
