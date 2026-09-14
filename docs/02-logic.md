# 02-LOGIC
Logic Version: 1.0.0

## Ticket State Machine
| From | To | Trigger | Required Fields | Who |
|------|----|---------|-----------------|-----|
| NEW | QUOTED | Coordinator sets price | quoted_labour > 0 | COORDINATOR, ADMIN |
| QUOTED | SCHEDULED | Coordinator sets time | scheduled_start set | COORDINATOR, ADMIN |
| SCHEDULED | DISPATCHED | Coordinator assigns tech | assigned_tech_id set | COORDINATOR, ADMIN |
| DISPATCHED | IN_PROGRESS | Tech arrives | auto timestamp | TECHNICIAN (assigned) |
| IN_PROGRESS | COMPLETED | Tech finishes | photo_urls ≥ 1, materials logged | TECHNICIAN (assigned) |
| COMPLETED | PAID | Payment confirmed | is_paid=true, payment_method set | COORDINATOR, ADMIN |
| PAID | CLOSED | Auto after 30 days | warranty_expires_at passed | SYSTEM (cron) |
| ANY | CANCELLED | Cancel request | reason logged | COORDINATOR, ADMIN |

Invalid transitions throw error. No skipping. Reassigned ticket: previous tech loses access immediately via RLS.

## Pricing Engine
Location: /lib/pricing.ts
MARKUP = 1.20
SURCHARGES: EMERGENCY=500, WEEKEND=200, AFTER_HOURS=300, ZONE_6=300
Formula: baseLabour + (sum(materialCosts) × 1.20) + sum(surcharges). Round to integer.

### Worked Examples

Ex1 — Simple:
In: service="Faucet Replacement"(400), materials=[{cost:250}], surcharges=[]
Calc: 400 + (250×1.20) + 0 = 700
Out: { quoted_labour:400, quoted_materials:300, final_total:700 }

Ex2 — Emergency weekend peripheral:
In: service="Roof Leak Repair"(800), materials=[{cost:180},{cost:380}], surcharges=[EMERGENCY,WEEKEND,ZONE_6]
Calc: 800 + (560×1.20) + 1000 = 800+672+1000 = 2472
Out: { quoted_labour:800, quoted_materials:672, final_total:2472 }

Ex3 — Over ₱5000 (downpayment triggered):
In: service="Panel Upgrade"(2500), materials=[{cost:3500}], surcharges=[]
Calc: 2500 + (3500×1.20) + 0 = 6700
Out: { quoted_labour:2500, quoted_materials:4200, final_total:6700, downpayment_amount:3350 }
Rule: downpayment = final_total × 0.50 when final_total > 5000

## Price Lock
- Quote valid 7 days. After 7 days: reset to NEW. Re-quote required.
- Material price changes within 7 days: absorbed by business.

## Change Order Flow
1. Tech taps [Request Change Order]. Inputs: new_description, additional_materials[], additional_labour.
2. change_order_pending = true. Status stays IN_PROGRESS.
3. Coordinator notified → messages customer.
4. Customer approves → approveChangeOrder(ticket_id). final_total recalculated. change_order_pending = false.
5. Customer rejects → original scope continues. change_order_pending = false.

## Cancellation
- Before DISPATCHED: Free. Status → CANCELLED.
- After DISPATCHED: ₱200 fee in cancellation_fee. Tech notified. Slot freed.

## Warranty
- On COMPLETED: warranty_expires_at = completed_at + 30 days.
- Claim: New ticket with parent_ticket_id = original. Labour = ₱0. Materials at cost (no markup).
- After 30 days: Full price new ticket.

## Hardware Store Sync
1. Status → SCHEDULED: Auto-generate pick-list from ticket_materials.
2. STORE_STAFF sees: "Ticket #[id] — [Tech] needs: [items]"
3. Staff taps [DISPENSED] → stock_qty decrements. audit_log entry.
4. Stock insufficient → flag ticket. Alert COORDINATOR. No auto-order.

## Payment Tiers
- ≤ ₱5,000: Full on completion.
- > ₱5,000: 50% down at SCHEDULED. 50% on COMPLETED.
- > ₱15,000: 50% down. 30% at IN_PROGRESS. 20% on COMPLETED.
- GCash/Cash: Manual confirm. Bank: 7-day terms B2B only.

## Dispatch Rules
- Max 4 jobs/tech/day.
- 45-min gap between different zones. 30-min same zone.
- Morning: complex/roofing. Afternoon: simple/indoor.
- Rain forecast → flag outdoor jobs. Do NOT auto-cancel.
- Tech picks materials from store BEFORE first job.
