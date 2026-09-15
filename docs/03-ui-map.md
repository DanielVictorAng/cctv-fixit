# 03-UI-MAP
UI Version: 1.0.0

## Routes
| Path | Role | Purpose |
|------|------|---------|
| /login | ALL | Supabase email+password auth |
| /coordinator | COORDINATOR, ADMIN | Kanban board, dispatch overview |
| /coordinator/tickets/[id] | COORDINATOR, ADMIN | Ticket detail, pricing, assignment |
| /coordinator/customers | COORDINATOR, ADMIN | Customer list, create/edit |
| /coordinator/dispatch | COORDINATOR, ADMIN | Weekly dispatch calendar by zone |
| /tech | TECHNICIAN | Today's jobs (PWA) |
| /tech/jobs/[id] | TECHNICIAN | Job detail, photos, complete (PWA) |
| /store | STORE_STAFF | Pick-lists + low-stock alerts |
| /store/inventory | STORE_STAFF | Inventory list, stock levels |
| /admin | ADMIN | Analytics, pricing config, audit log |
| /api/webhooks/messenger | PUBLIC (n8n/Meta) | Messenger inbound + auto-reply |
| /api/webhooks/viber | PUBLIC (n8n/Viber) | Viber inbound + auto-reply |

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
| ConfirmDialog | @/components/ui/confirm-dialog.tsx | open, title, message, onConfirm | Destructive actions |
| Dialog | @/components/ui/dialog.tsx | open, onClose, title, children | Modals (no radix) |
| Select | @/components/ui/select.tsx | native select props | Forms |
| Textarea | @/components/ui/textarea.tsx | native textarea props | Forms |
| Skeleton | @/components/ui/skeleton.tsx | className | Loading states |
| EmptyState | @/components/ui/empty-state.tsx | title, message, action? | Empty screens |
| KanbanBoard | @/components/coordinator/kanban-board.tsx | tickets, services, materials, techs | /coordinator |
| TicketActions | @/components/coordinator/ticket-actions.tsx | ticketId, status, role, catalogs | Ticket detail |
| TransitionDialog | @/components/tickets/transition-dialog.tsx | open, ticketId, targetStatus, catalogs | Kanban, detail |
| ScheduleForm/PaymentForm/CancelForm | @/components/tickets/transition-forms.tsx | ticketId, onDone | TransitionDialog |
| NewTicketDialog | @/components/coordinator/new-ticket-dialog.tsx | customers | /coordinator |
| CustomerFormDialog | @/components/customers/customer-form.tsx | open, customer | Customers |
| CustomersView | @/components/customers/customers-view.tsx | customers | /coordinator/customers |
| DispatchCalendar | @/components/coordinator/dispatch-calendar.tsx | jobs, days | /coordinator/dispatch |
| PwaManager | @/components/pwa/pwa-manager.tsx | — | Tech layout |
| JobActions | @/components/tech/job-actions.tsx | ticketId, status, photoUrls | Tech job detail |
| DeepLinks | @/components/tech/deep-links.tsx | address | Tech job detail |
| ChangeOrderForm | @/components/tech/change-order-form.tsx | ticketId, materials, onDone | Tech job detail |
| ChangeOrderReview | @/components/coordinator/change-order-review.tsx | orders, materials | Ticket detail |
| ServicesPanel | @/components/admin/services-panel.tsx | services | /admin |

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
