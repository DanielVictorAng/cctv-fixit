# 03-UI-MAP
UI Version: 2.0.0

## Routes
| Path | Role | Purpose | Phase |
|------|------|---------|-------|
| /login | ALL | Supabase email+password auth | — |
| /quotes | STORE_STAFF, ADMIN | Projects: quotes and job orders, new project | 1 |
| /quotes/new | STORE_STAFF, ADMIN | Quote builder | 1 |
| /quotes/[id] | STORE_STAFF, ADMIN | Quote: edit, present, customer view, downpayment → job order | 1 |
| /store/inventory | STORE_STAFF, ADMIN | Equipment catalog and stock | 1 |
| /store | STORE_STAFF | Pick-lists to dispense | 3 |
| /admin | ADMIN | Overview: pending overrides, open jobs, this month | 1 |
| /admin/rate-card | ADMIN | Rate card and pricing rules | 1 |
| /admin/templates | ADMIN | Quote templates | 1 |
| /admin/audit | ADMIN | Audit log | 1 |
| /admin/surveys | ADMIN | Survey review | 2 |
| /admin/dispatch | ADMIN | Dispatch board: assign technicians | 3 |
| /admin/reconciliation | ADMIN | Monthly statements | 5 |
| /tech | TECHNICIAN | Today's jobs (PWA) | 2 |
| /tech/jobs/[id] | TECHNICIAN | Scope, materials checklist, check-in, photos, signature, complete (PWA) | 2–4 |
| /api/cron/outbound | Scheduler | Drain outbound_queue | — |

Store staff land on /quotes; admins on /admin.

## Component Inventory (CHECK BEFORE CREATING NEW)
| Name | Path | Props | Used By |
|------|------|-------|---------|
| StatusBadge | @/components/ui/status-badge.tsx | status (job_status) | All |
| ConfirmDialog | @/components/ui/confirm-dialog.tsx | open, title, message, onConfirm | Destructive actions |
| Dialog | @/components/ui/dialog.tsx | open, onClose, title, children | Modals (no radix) |
| Select | @/components/ui/select.tsx | native select props | Forms |
| Textarea | @/components/ui/textarea.tsx | native textarea props | Forms |
| Skeleton | @/components/ui/skeleton.tsx | className | Loading states |
| EmptyState | @/components/ui/empty-state.tsx | title, message, action? | Empty screens |
| PhotoUploader | @/components/ui/photo-uploader.tsx | jobId, kind, onUploaded | Tech job (Phase 2, 4) |
| PwaManager | @/components/pwa/pwa-manager.tsx | — | Tech layout |
| JobCard | @/components/tech/job-card.tsx | job | /tech (Phase 2) |
| DeepLinks | @/components/tech/deep-links.tsx | address | Tech job (Phase 2) |
| PickList | @/components/store/pick-list.tsx | jobId, items | /store (Phase 3) |
| AuditLogPanel | @/components/admin/audit-log-panel.tsx | entries, activeTable, page, hasNext | /admin/audit |
| CustomerFormDialog | @/components/customers/customer-form.tsx | open, customer | Quote builder |
| QuoteList | @/components/quotes/quote-list.tsx | jobs | /quotes (Phase 1, planned) |
| CustomerPicker | @/components/quotes/customer-picker.tsx | customers, onSelect | Quote builder (Phase 1, planned) |
| TemplatePicker | @/components/quotes/template-picker.tsx | jobId, templates | Quote builder (Phase 1, planned) |
| QuoteLinesEditor | @/components/quotes/quote-lines-editor.tsx | jobId, lines, equipment, rateCard, editable | Quote builder (Phase 1, planned) |
| DvrSuggestion | @/components/quotes/dvr-suggestion.tsx | jobId, cameraPoints, recorders | Quote builder (Phase 1, planned) |
| QuoteTotals | @/components/quotes/quote-totals.tsx | totals | Quote builder, quote (internal split) (Phase 1, planned) |
| CustomerQuote | @/components/quotes/customer-quote.tsx | job, lines | Customer view: Grand Total only (Phase 1, planned) |
| OverrideRequestDialog | @/components/quotes/override-request-dialog.tsx | lineId, currentRate | Quote builder (Phase 1, planned) |
| OverrideReview | @/components/admin/override-review.tsx | requests | /admin (Phase 1, planned) |
| DownpaymentForm | @/components/quotes/downpayment-form.tsx | jobId, required, paid | /quotes/[id] (Phase 1, planned) |
| RateCardPanel | @/components/admin/rate-card-panel.tsx | items, rules | /admin/rate-card (Phase 1, planned) |
| TemplatesPanel | @/components/admin/templates-panel.tsx | templates, equipment, rateCard | /admin/templates (Phase 1, planned) |
| EquipmentPanel | @/components/store/equipment-panel.tsx | equipment | /store/inventory (Phase 1, planned) |

Removed in Phase 1 (repair-business screens): TicketCard, KanbanBoard, TicketActions, TransitionDialog,
ScheduleForm/PaymentForm/CancelForm, NewTicketDialog, CustomersView, PriceCalculator, TechAssignment,
DispatchCalendar, JobActions, ChangeOrderForm, ChangeOrderReview, ServicesPanel.

New component? Add to this table immediately.

## UI Rules
- Kanban / dispatch board: @dnd-kit/core ONLY.
- Forms: React Hook Form + Zod. Inline errors.
- Loading: shadcn Skeleton. No blank screens. No layout shift.
- Empty: Text + CTA button.
- Errors: shadcn Toaster top-right. 5s dismiss. User-friendly.
- Tech PWA: Touch ≥44px. Bottom nav. Buttons min h-12.
- Store UI: Min 16px font. Touch ≥44px. Max 3 buttons and no dropdowns >10 items, except the quote builder (guided steps, searchable pickers).
- Customer-facing views and printouts: Grand Total and downpayment only. Never the Equipment/Service split.
- Money: ₱ with thousands separators, whole pesos on totals.
- Dates: Asia/Manila via /lib/time.ts.
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
9. ✅ RLS tested (tech can't see other tech's data; store staff can't approve overrides)
10. ✅ Commit: "feat([scope]): [description]"
