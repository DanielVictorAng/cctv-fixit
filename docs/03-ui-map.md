# 03-UI-MAP
UI Version: 1.0.0

## Routes
| Path | Role | Purpose |
|------|------|---------|
| /login | ALL | Supabase email+password auth |
| /coordinator | COORDINATOR, ADMIN | Kanban board, dispatch overview |
| /coordinator/tickets/[id] | COORDINATOR, ADMIN | Ticket detail, pricing, assignment |
| /coordinator/customers | COORDINATOR, ADMIN | Customer list, create/edit |
| /tech | TECHNICIAN | Today's jobs (PWA) |
| /tech/jobs/[id] | TECHNICIAN | Job detail, photos, complete (PWA) |
| /store | STORE_STAFF | Pick-lists, inventory |
| /admin | ADMIN | Analytics, pricing config, audit log |

## Component Inventory (CHECK BEFORE CREATING NEW)
| Name | Path | Props | Used By |
|------|------|-------|---------|
| TicketCard | @/components/tickets/ticket-card.tsx | ticket, onDrag? | Kanban |
| StatusBadge | @/components/ui/status-badge.tsx | status | All |
| PriceCalculator | @/components/tickets/price-calculator.tsx | serviceId, materials[], surcharges[] | Ticket detail |
| TechAssignment | @/components/tickets/tech-assignment.tsx | ticketId, availableTechs[] | Ticket detail |
| PhotoUploader | @/components/ui/photo-uploader.tsx | maxFiles:5, onUpload | Tech job |
| JobCard | @/components/tech/job-card.tsx | ticket | Tech PWA |
| PickList | @/components/store/pick-list.tsx | ticketId, materials[] | Store |
| ConfirmDialog | @/components/ui/confirm-dialog.tsx | title, message, onConfirm | Destructive actions |

New component? Add to this table immediately.

## UI Rules
- Kanban: @dnd-kit/core ONLY.
- Forms: React Hook Form + Zod. Inline errors.
- Loading: shadcn Skeleton. No blank screens. No layout shift.
- Empty: Text + CTA button.
- Errors: shadcn Toaster top-right. 5s dismiss. User-friendly.
- Tech PWA: Touch ≥44px. Bottom nav. Buttons min h-12.
- Store UI: Max 3 buttons. Min 16px font. No complex dropdowns.
- Colors: Tailwind defaults + shadcn theme. No custom hex.
- Icons: lucide-react only.

## Offline (Tech PWA Only)
- Cache: Today's jobs + customer details (stale-while-revalidate).
- Queue: Photos, status changes → localStorage → sync on reconnect.
- DO NOT cache: Pricing, inventory, other techs' data.
- Banner: "Offline — changes will sync" when navigator.onLine === false.
- Photos: Compress to max 1MB via canvas before upload.

## Navigation
NO embedded maps. Deep links only:
Primary: https://waze.com/ul?q={encoded_address}
Fallback: https://maps.google.com/?q={encoded_address}
Show both. Labels: "Open Waze" / "Open Google Maps".

## Definition of Done (ALL features)
1. ✅ Happy path works
2. ✅ Empty state (message + CTA)
3. ✅ Loading state (skeleton, no shift)
4. ✅ Error state (toast, friendly message)
5. ✅ Responsive at 375px
6. ✅ No `any` types
7. ✅ No console.log
8. ✅ Server Action returns { success, data?, error? }
9. ✅ RLS tested (tech can't see other tech's data)
10. ✅ Commit: "feat([scope]): [description]"
