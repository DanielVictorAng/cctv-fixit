# 02-LOGIC
Logic Version: 2.0.0

Every date, day and month is Asia/Manila. Money is in pesos; stored totals are rounded to
whole pesos (half up). OPEN = the owner decides before that phase is built.

## Job Lifecycle
| From | To | Trigger | Required | Who | Phase |
|------|----|---------|----------|-----|-------|
| — | DRAFT | Store creates project | customer | STORE_STAFF, ADMIN | 1 |
| DRAFT | QUOTED | Present quote | ≥1 line, site_address, no PENDING or REJECTED override, prices refreshed | STORE_STAFF, ADMIN | 1 |
| QUOTED | DRAFT | Edit quote | — | STORE_STAFF, ADMIN | 1 |
| QUOTED | JOB_ORDER | Customer approves | DOWNPAYMENT payments ≥ downpayment_required | STORE_STAFF, ADMIN | 1 |
| JOB_ORDER | SURVEY | Dispatch survey | survey_required, SURVEY technician assigned | ADMIN | 2 |
| SURVEY | SURVEY_REVIEW | Tech submits survey | ≥1 SURVEY photo or survey notes | TECHNICIAN (assigned) | 2 |
| SURVEY_REVIEW | JOB_ORDER | Final quote confirmed | admin reviewed, store confirmed | ADMIN, then STORE_STAFF | 2 |
| JOB_ORDER | SCHEDULED | Store sets install date | scheduled_start, zone, survey confirmed if survey_required | STORE_STAFF, ADMIN | 3 |
| SCHEDULED | DISPATCHED | Assign technicians | ≥1 INSTALL technician | ADMIN | 3 |
| DISPATCHED | IN_PROGRESS | GPS check-in | check-in recorded | TECHNICIAN (assigned) | 4 |
| IN_PROGRESS | ON_HOLD | On Hold – Weather | hold reason | TECHNICIAN (assigned) | 4 |
| ON_HOLD | IN_PROGRESS | Resume | — | TECHNICIAN (assigned) | 4 |
| IN_PROGRESS | COMPLETED | Complete | ≥1 FINAL photo, customer signature | TECHNICIAN (assigned) | 4 |
| COMPLETED | PAID | Balance received | payments total ≥ grand_total | STORE_STAFF, ADMIN | 5 |
| DRAFT, QUOTED, JOB_ORDER, SURVEY, SURVEY_REVIEW, SCHEDULED, DISPATCHED, ON_HOLD | CANCELLED | Cancel | cancel_reason | STORE_STAFF, ADMIN | 1 |

Invalid transitions throw. No skipping. A removed technician loses access immediately via RLS.
OPEN (before Phase 2): if the survey raises the Grand Total, is a downpayment top-up required?
OPEN (before Phase 3): is the downpayment refunded or kept when a job order is cancelled?

## Phase 1 — Quote
1. Store staff (or an admin) find the customer by phone number or add them, then create the project (DRAFT).
2. Apply one or more quote templates (Home 4-cam, Office 8-cam, WiFi, UPS). Each adds its equipment and service lines; applying a template again adds its quantities again.
3. Adjust lines. Equipment comes from the store catalog at sell_price. Services come from the rate card.
4. DVR suggestion: camera points = Σ quantity of service lines whose rate card item is a camera point. Suggest the active DVR/NVR with the fewest channels ≥ camera points. Store staff accept or choose another; nothing is added silently.
5. Tick After-hours if the customer wants work outside normal hours. Tick Survey needed if the site must be checked first.
6. Special rate needed (e.g. difficult terrain)? Store staff request an override on a service line with a reason → PENDING. The quote cannot be presented until an admin APPROVES or REJECTS it; a rejected override must be removed from the line. An admin's own override needs a reason and is APPROVED straight away.
7. Present the quote (QUOTED). The customer sees one Grand Total and the 50% downpayment. Equipment Total and Service Total stay internal.
8. The customer approves and pays the downpayment (Cash/GCash/Maya). Store staff record it; the job becomes a JOB_ORDER.

## Pricing Engine
Location: /lib/pricing.ts, run server-side. Prices and rates come from the database, never from a form.

```
equipment_total  = Σ EQUIPMENT lines: quantity × sell_price
billed_units     = SERVICE line: ceil(quantity ÷ unit_size)            25 m at "per 10 m" → 3
service_subtotal = Σ SERVICE lines: billed_units × rate                 rate = APPROVED override_price, else rate card rate
rainy            = quoted in a RAINY_SEASON month (June–October) AND ≥1 SERVICE line with an outdoor rate card item
multiplier       = (rainy ? RAINY_SEASON 1.10 : 1) × (after_hours ? AFTER_HOURS 1.50 : 1)
service_total    = round(service_subtotal × multiplier)
grand_total      = round(equipment_total) + service_total
downpayment      = round(grand_total × 0.50)
```

- Multipliers apply to our service fees only; equipment stays at the store's price.
- Each line captures its price when added. Presenting a quote (DRAFT → QUOTED) refreshes every line to the current catalog and rate card, then prices freeze. Approved override prices are never refreshed.
- The rainy season is judged by the date the quote is presented (quoted_at).
- Outdoor rate card items: Outdoor Camera Install and High-Mount Install.

### Worked Examples
Equipment prices below are illustrative, not the store's catalog.

Ex1 — Home 4-cam, presented in March, normal hours:
In: equipment 4 × camera ₱1,800, 1 × 4-ch DVR ₱3,500, 1 × 1 TB HDD ₱2,800.
    services Indoor Camera 2 pts, Outdoor Camera 2 pts, DVR/NVR Setup 1, Remote Viewing 1, Cat6 Cable Pulling 60 m, Transport 1 trip.
Calc: equipment 7,200 + 3,500 + 2,800 = 13,500
      service 1,200 + 2,000 + 1,200 + 600 + (6 × 500 = 3,000) + 300 = 8,300; March → multiplier 1
Out: { equipment_total:13500, service_total:8300, grand_total:21800, downpayment:10900 }
DVR suggestion: 4 camera points → the smallest DVR/NVR with ≥4 channels.

Ex2 — the same job presented in July, after-hours:
Calc: July with outdoor points → 1.10; after-hours → 1.50; 8,300 × 1.10 × 1.50 = 13,695
Out: { equipment_total:13500, service_total:13695, grand_total:27195, downpayment:13598 }

Ex3 — rounding and an override, presented in October:
In: services High-Mount Install 3 pts, Core Drilling 4 holes with override ₱700 ("solid concrete wall", APPROVED), PVC Molding 25 m, Transport 1 trip; equipment total ₱18,000.
Calc: service 4,500 + (4 × 700 = 2,800) + (ceil(25 ÷ 10) = 3 × 500 = 1,500) + 300 = 9,100
      October with high-mount → 9,100 × 1.10 = 10,010
Out: { equipment_total:18000, service_total:10010, grand_total:28010, downpayment:14005 }
While the override is PENDING the quote cannot be presented.

## Rate Card
Seeded defaults. ADMIN edits rates, units and pricing rules anytime (/admin/rate-card).
| Code | Service | Unit | Unit size | Rate | Camera point | Outdoor |
|------|---------|------|-----------|------|--------------|---------|
| INDOOR_CAMERA | Indoor Camera Install | point | 1 | ₱600 | yes | no |
| OUTDOOR_CAMERA | Outdoor Camera Install | point | 1 | ₱1,000 | yes | yes |
| HIGH_MOUNT | High-Mount Install | point | 1 | ₱1,500 | yes | yes |
| DVR_NVR_SETUP | DVR/NVR Setup | unit | 1 | ₱1,200 | no | no |
| REMOTE_VIEWING | Remote Viewing Setup | system | 1 | ₱600 | no | no |
| CAT6_PULLING | Cat6 Cable Pulling | 10 m | 10 | ₱500 | no | no |
| PVC_MOLDING | PVC Molding | 10 m | 10 | ₱500 | no | no |
| CORE_DRILLING | Core Drilling (Standard) | hole | 1 | ₱400 | no | no |
| TRANSPORT_BAGUIO | Transport (Baguio) | trip | 1 | ₱300 | no | no |

| Rule | Multiplier | Applies |
|------|------------|---------|
| RAINY_SEASON | ×1.10 | June–October, quotes with an outdoor service line |
| AFTER_HOURS | ×1.50 | Quotes with After-hours ticked |

Rate overrides require a reason, and an admin's approval when requested by store staff.

## Payments
- Downpayment: 50% of grand_total, recorded as DOWNPAYMENT (one or more rows) before JOB_ORDER.
- Balance: the rest, recorded as BALANCE once COMPLETED. The job is PAID when payments ≥ grand_total.
- Methods: Cash, GCash, Maya. Record the GCash/Maya reference number when given.
- Store staff confirm every payment by hand. NEVER auto-confirm. Payments are never edited or deleted.
OPEN (before Phase 5): how an admin corrects a payment recorded by mistake.

## Phase 2 — Survey (only when survey_required)
1. Admin assigns a technician to survey the site (SURVEY).
2. The technician uploads site photos and notes from the PWA and submits (SURVEY_REVIEW).
3. Admin reviews and adjusts the quote lines if needed; totals re-run through the pricing engine.
4. Store staff confirm the final quote with the customer; the job returns to JOB_ORDER, ready to schedule.

## Phase 3 — Dispatch
1. Store staff set the install date (SCHEDULED). The pick-list is generated from the equipment lines.
2. Admin assigns one or more technicians on the dispatch board (DISPATCHED). Max 4 jobs/tech/day; 45-min gap between zones, 30-min same zone.
3. Each technician is notified and taps Acknowledge.
4. The customer is notified (docs/04-integrations.md).
5. The technician collects the equipment before the first job. Store staff tap [DISPENSED] → stock decrements by the undispensed quantity, audit_log entry. Insufficient stock → nothing is taken and the admin is alerted. No auto-order.
OPEN (before Phase 3): how technicians get push notifications; SMS provider for customers.

## Phase 4 — Installation
1. The technician arrives and checks in with GPS (IN_PROGRESS); location and accuracy are recorded.
2. Uploads milestone photos (compressed to ≤1 MB, queued while offline).
3. Raining? The technician sets On Hold – Weather (ON_HOLD) and resumes later. Never auto-cancel.
4. Completion: at least one final photo, then the customer signs on the technician's phone. The job is COMPLETED; completed_at decides the statement month.

## Phase 5 — Settlement
1. The customer pays the balance at the store (BALANCE); the job becomes PAID.
2. Two documents per job:
   - Customer receipt: Grand Total, payments made, balance. No split.
   - Service invoice: Service Total only, with its service lines and any multipliers.
3. Monthly statement: every job COMPLETED in the month adds its Service Total. Example: "June: 8 jobs = ₱93,800 owed".
4. The store pays us; an admin marks the statement paid. We pay technicians outside the app.
