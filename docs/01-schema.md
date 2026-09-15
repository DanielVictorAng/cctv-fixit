# 01-SCHEMA
Schema Version: 2.0.0

Target model for the CCTV store-partner flow (docs/02-logic.md). Each table says which phase
ships it; build only the phase being worked on. Migrations 001–008 hold the previous
repair-business schema, which Phase 1 replaces (see §Removed in Phase 1).

## ENUMs
user_role: ADMIN | STORE_STAFF | TECHNICIAN
job_status: DRAFT | QUOTED | JOB_ORDER | SURVEY | SURVEY_REVIEW | SCHEDULED | DISPATCHED | IN_PROGRESS | ON_HOLD | COMPLETED | PAID | CANCELLED
baguio_zone: ZONE_1_CENTER | ZONE_2_EAST | ZONE_3_WEST | ZONE_4_SOUTH | ZONE_5_NORTH | ZONE_6_PERIPHERAL
payment_method: CASH | GCASH | MAYA
payment_kind: DOWNPAYMENT | BALANCE
line_type: EQUIPMENT | SERVICE
override_status: PENDING | APPROVED | REJECTED

## Tables — Phase 1 (Quote)

### profiles
| Field | Type | Constraint | Note |
|-------|------|-----------|------|
| id | uuid | PK, FK→auth.users | |
| role | user_role | NOT NULL, default TECHNICIAN | An admin sets the real role |
| full_name | text | NOT NULL | |
| phone_number | text | nullable | |
| is_active | boolean | NOT NULL, default true | Inactive profiles are refused by the app and by RLS |

### customers
| Field | Type | Constraint | Note |
|-------|------|-----------|------|
| id | uuid | PK, auto | |
| full_name | text | NOT NULL | |
| phone_number | text | nullable | Store searches by phone before adding a customer |
| address | text | nullable | Default site address |
| fb_messenger_id | text | UNIQUE, nullable | For customer updates (docs/04-integrations.md) |
| viber_id | text | UNIQUE, nullable | |
| created_by | uuid | FK→profiles, nullable | |
| created_at | timestamptz | auto | |

Indexes: (phone_number)

### equipment
The store's catalog. Equipment is sold at sell_price with no markup and is store revenue.
| Field | Type | Constraint | Note |
|-------|------|-----------|------|
| id | uuid | PK, auto | |
| sku | text | UNIQUE, NOT NULL | |
| name | text | NOT NULL | |
| category | text | NOT NULL | 'Camera','DVR','NVR','Storage','Cable','Power','Network','Accessory' |
| sell_price | numeric(10,2) | NOT NULL, ≥ 0 | Price to the customer |
| channels | int | nullable, > 0 | DVR/NVR only: camera channels, for the DVR suggestion |
| stock_qty | int | NOT NULL, default 0 | |
| is_active | boolean | NOT NULL, default true | Inactive items cannot be added to quotes |

### rate_card_items
Our service fees. ADMIN edits them anytime; a presented quote keeps the rates it was priced at.
| Field | Type | Constraint | Note |
|-------|------|-----------|------|
| id | uuid | PK, auto | |
| code | text | UNIQUE, NOT NULL | e.g. OUTDOOR_CAMERA |
| name | text | NOT NULL | |
| unit_label | text | NOT NULL | 'point','unit','system','10 m','hole','trip' |
| unit_size | numeric(10,2) | NOT NULL, default 1, > 0 | Quantity per billed unit (10 for "per 10 m") |
| rate | numeric(10,2) | NOT NULL, ≥ 0 | Price per billed unit |
| is_camera_point | boolean | NOT NULL, default false | Counts toward the DVR suggestion |
| is_outdoor | boolean | NOT NULL, default false | Makes a quote outdoor for the rainy-season rule |
| is_active | boolean | NOT NULL, default true | Inactive items cannot be added to quotes |
| sort_order | int | NOT NULL, default 0 | |
| updated_at | timestamptz | auto, trigger | |

Seed rows: docs/02-logic.md §Rate Card.

### pricing_rules
| Field | Type | Constraint | Note |
|-------|------|-----------|------|
| code | text | PK, CHECK RAINY_SEASON|AFTER_HOURS | |
| name | text | NOT NULL | |
| multiplier | numeric(6,4) | NOT NULL, ≥ 1 | 1.10, 1.50 |
| start_month | int | nullable, 1–12 | RAINY_SEASON only |
| end_month | int | nullable, 1–12 | RAINY_SEASON only |
| is_active | boolean | NOT NULL, default true | |
| updated_at | timestamptz | auto, trigger | |

### quote_templates
| Field | Type | Constraint | Note |
|-------|------|-----------|------|
| id | uuid | PK, auto | |
| name | text | UNIQUE, NOT NULL | 'Home 4-cam', 'Office 8-cam', 'WiFi', 'UPS' |
| description | text | nullable | |
| is_active | boolean | NOT NULL, default true | |
| sort_order | int | NOT NULL, default 0 | |
| created_at | timestamptz | auto | |

### quote_template_lines
| Field | Type | Constraint | Note |
|-------|------|-----------|------|
| id | uuid | PK, auto | |
| template_id | uuid | FK→quote_templates ON DELETE CASCADE, NOT NULL | |
| line_type | line_type | NOT NULL | |
| equipment_id | uuid | FK→equipment, nullable | EQUIPMENT lines only |
| rate_card_item_id | uuid | FK→rate_card_items, nullable | SERVICE lines only |
| quantity | numeric(10,2) | NOT NULL, > 0 | |
| sort_order | int | NOT NULL, default 0 | |

CHECK: EQUIPMENT ⇒ equipment_id set and rate_card_item_id null; SERVICE ⇒ the reverse.
Indexes: (template_id)

### jobs
One row per project, from quote to settlement.
| Field | Type | Constraint | Note |
|-------|------|-----------|------|
| id | uuid | PK, auto | |
| job_number | bigint | UNIQUE, identity | Shown to people: "Job #1024" |
| customer_id | uuid | FK→customers, NOT NULL | |
| status | job_status | NOT NULL, default DRAFT | |
| site_address | text | nullable | Required before QUOTED |
| zone | baguio_zone | nullable | Required before SCHEDULED |
| notes | text | nullable | |
| survey_required | boolean | NOT NULL, default false | Store decides at quote time |
| after_hours | boolean | NOT NULL, default false | Store ticks; applies AFTER_HOURS |
| rainy_season_applied | boolean | NOT NULL, default false | Written by pricing |
| service_multiplier | numeric(6,4) | NOT NULL, default 1 | Product of the rules applied |
| equipment_total | numeric(10,2) | NOT NULL, default 0 | Store revenue |
| service_subtotal | numeric(10,2) | NOT NULL, default 0 | Before multipliers |
| service_total | numeric(10,2) | NOT NULL, default 0 | Our revenue |
| grand_total | numeric(10,2) | NOT NULL, default 0 | The only figure a customer sees |
| downpayment_required | numeric(10,2) | NOT NULL, default 0 | 50% of grand_total |
| priced_at | timestamptz | nullable | When totals were last calculated |
| quoted_at | timestamptz | nullable | Decides the rainy season |
| job_order_at | timestamptz | nullable | |
| scheduled_start | timestamptz | nullable | Phase 3 |
| scheduled_end | timestamptz | nullable | Phase 3 |
| completed_at | timestamptz | nullable | Phase 4; decides the statement month |
| cancelled_at | timestamptz | nullable | |
| cancel_reason | text | nullable | Required when CANCELLED |
| created_by | uuid | FK→profiles, NOT NULL | |
| created_at | timestamptz | auto | |
| updated_at | timestamptz | auto, trigger | |

Indexes: (customer_id), (status), (scheduled_start), (completed_at)
Totals are written only by server-side pricing (/lib/pricing.ts), never from a form.

### job_lines
| Field | Type | Constraint | Note |
|-------|------|-----------|------|
| id | uuid | PK, auto | |
| job_id | uuid | FK→jobs ON DELETE CASCADE, NOT NULL | |
| line_type | line_type | NOT NULL | |
| equipment_id | uuid | FK→equipment, nullable | EQUIPMENT lines only |
| rate_card_item_id | uuid | FK→rate_card_items, nullable | SERVICE lines only |
| description | text | NOT NULL | Item name when the line was added |
| quantity | numeric(10,2) | NOT NULL, > 0 | As entered: points, units, metres, holes, trips |
| unit_price | numeric(10,2) | NOT NULL, ≥ 0 | Equipment sell_price or rate card rate, captured by pricing |
| unit_size | numeric(10,2) | NOT NULL, default 1, > 0 | Copied from the rate card |
| billed_units | numeric(10,2) | NOT NULL | EQUIPMENT: quantity. SERVICE: ceil(quantity ÷ unit_size) |
| override_price | numeric(10,2) | nullable, ≥ 0 | Special rate requested (SERVICE only) |
| override_reason | text | nullable | Required with override_price |
| override_status | override_status | nullable | Set with override_price |
| override_requested_by | uuid | FK→profiles, nullable | |
| override_decided_by | uuid | FK→profiles, nullable | ADMIN only |
| override_decided_at | timestamptz | nullable | |
| line_total | numeric(10,2) | NOT NULL, default 0 | billed_units × (APPROVED override_price, else unit_price) |
| dispensed_qty | int | NOT NULL, default 0 | EQUIPMENT: units the store handed over (Phase 3) |
| dispensed_at | timestamptz | nullable | Phase 3 |
| dispensed_by | uuid | FK→profiles, nullable | Phase 3 |
| sort_order | int | NOT NULL, default 0 | |

CHECK: same line_type rule as quote_template_lines; override columns only on SERVICE lines.
Indexes: (job_id)

### payments
Append-only. Receipts (Phase 5) are built from these rows.
| Field | Type | Constraint | Note |
|-------|------|-----------|------|
| id | uuid | PK, auto | |
| job_id | uuid | FK→jobs, NOT NULL | |
| kind | payment_kind | NOT NULL | |
| amount | numeric(10,2) | NOT NULL, > 0 | |
| method | payment_method | NOT NULL | |
| reference | text | nullable | GCash/Maya reference number |
| received_by | uuid | FK→profiles, NOT NULL | |
| received_at | timestamptz | auto | |

Indexes: (job_id), (received_at)

### audit_log
| Field | Type | Constraint | Note |
|-------|------|-----------|------|
| id | uuid | PK, auto | |
| table_name | text | NOT NULL | |
| record_id | uuid | NOT NULL | |
| action | text | NOT NULL | INSERT/UPDATE/DELETE |
| changed_by | uuid | FK→profiles | |
| changed_at | timestamptz | auto | |
| old_values | jsonb | nullable | Same keys as new_values on UPDATE |
| new_values | jsonb | nullable | |

Indexes: (record_id), (changed_at)

### outbound_queue
| Field | Type | Constraint | Note |
|-------|------|-----------|------|
| id | uuid | PK, auto | |
| channel | text | NOT NULL, CHECK messenger|viber | |
| recipient_id | text | NOT NULL | Platform-scoped id |
| body | text | NOT NULL | Rendered message |
| job_id | uuid | FK→jobs, nullable | |
| attempts | int | NOT NULL, default 0 | |
| last_error | text | nullable | |
| status | text | NOT NULL, default PENDING | PENDING|SENT|FAILED |
| next_attempt_at | timestamptz | default now() | |
| created_at | timestamptz | auto | |
| sent_at | timestamptz | nullable | |

Indexes: (status, next_attempt_at)

## Tables — later phases (columns finalised when the phase starts)

### job_technicians — Phase 2 (survey), Phase 3 (install)
| Field | Type | Constraint | Note |
|-------|------|-----------|------|
| job_id | uuid | FK→jobs, PK | |
| technician_id | uuid | FK→profiles, PK | |
| purpose | text | PK, CHECK SURVEY|INSTALL | |
| assigned_by | uuid | FK→profiles, NOT NULL | |
| assigned_at | timestamptz | auto | |
| acknowledged_at | timestamptz | nullable | Phase 3: tech taps Acknowledge |

### job_photos — Phase 2 (survey), Phase 4 (install)
| Field | Type | Constraint | Note |
|-------|------|-----------|------|
| id | uuid | PK, auto | |
| job_id | uuid | FK→jobs, NOT NULL | |
| kind | text | NOT NULL, CHECK SURVEY|MILESTONE|FINAL | |
| storage_path | text | NOT NULL | Supabase Storage path under the job's folder |
| caption | text | nullable | |
| uploaded_by | uuid | FK→profiles, NOT NULL | |
| uploaded_at | timestamptz | auto | |

Phase 2 adds to jobs: survey_notes, survey_submitted_at, survey_reviewed_at, final_quote_confirmed_at.

### job_check_ins — Phase 4
| Field | Type | Constraint | Note |
|-------|------|-----------|------|
| id | uuid | PK, auto | |
| job_id | uuid | FK→jobs, NOT NULL | |
| technician_id | uuid | FK→profiles, NOT NULL | |
| latitude | numeric(9,6) | NOT NULL | |
| longitude | numeric(9,6) | NOT NULL | |
| accuracy_m | numeric(8,2) | nullable | |
| checked_in_at | timestamptz | auto | |

Phase 4 adds to jobs: hold_reason, signature_path, signed_by_name, signed_at.

### statements — Phase 5
| Field | Type | Constraint | Note |
|-------|------|-----------|------|
| id | uuid | PK, auto | |
| month | date | UNIQUE, NOT NULL | First day of the month (Asia/Manila) |
| job_count | int | NOT NULL | |
| service_total | numeric(12,2) | NOT NULL | What the store owes us |
| generated_at | timestamptz | auto | |
| paid_at | timestamptz | nullable | Admin marks the store's payment |
| paid_reference | text | nullable | |

## Removed in Phase 1
tickets, ticket_materials, change_orders, services, materials (replaced by equipment),
inbound_events, customers.zone, customers.possible_duplicate, profiles.skills, the COORDINATOR
role, ticket_status and change_order_status enums, BANK_TRANSFER payment method, and
dispense_ticket_materials() (rebuilt on job_lines in Phase 3).

## RLS Policies (Phase 1)
Role helpers count active profiles only.
- profiles: SELF reads own. ADMIN reads all and updates role/is_active. STORE_STAFF reads TECHNICIAN names.
- customers: ADMIN+STORE_STAFF SELECT, INSERT, UPDATE. ADMIN DELETE.
- equipment: All authenticated SELECT. ADMIN+STORE_STAFF INSERT, UPDATE. ADMIN DELETE.
- rate_card_items, pricing_rules, quote_templates, quote_template_lines: All authenticated SELECT. ADMIN INSERT, UPDATE, DELETE.
- jobs: ADMIN+STORE_STAFF SELECT, INSERT, UPDATE. No DELETE (cancel instead).
- job_lines: ADMIN+STORE_STAFF SELECT. ADMIN+STORE_STAFF INSERT, UPDATE, DELETE while the job is DRAFT. Only ADMIN changes override_status and override_decided_*.
- payments: ADMIN+STORE_STAFF SELECT, INSERT. No UPDATE. No DELETE.
- audit_log: ADMIN SELECT only. No UPDATE. No DELETE. Ever.
- outbound_queue: ADMIN SELECT only. Writes happen server-side via service role.
Later phases add TECHNICIAN access to jobs, job_lines and customers of jobs they are assigned to.

## Triggers
### on_auth_user_created (on auth.users)
- Auto-creates a `profiles` row whenever a new auth user signs up.
- Defaults: `role = TECHNICIAN`, `is_active = true`.
- `full_name` = `raw_user_meta_data.full_name`, falling back to the user's email.
- Public sign-ups must stay disabled in Supabase Auth; an admin creates accounts.

### set_updated_at
- jobs, rate_card_items, pricing_rules.

### job_lines override guard
- Non-admins cannot change override_status, override_decided_by or override_decided_at.

## Storage
- Bucket `job-photos` (private) — Phase 2. Path `<job_id>/<kind>/<file>`. Reads by signed URL (1 hour).
- Bucket `signatures` (private) — Phase 4.
- Uploads: max 5MB, image/jpeg|png|webp, via Server Action only (service role).

## Security Rules
1. NEVER expose service_role key to client. Server Actions only.
2. Uploads: max 5MB, image/jpeg|png|webp only.
3. Webhooks: validate signature headers. Reject invalid.
4. All inputs through Zod before DB.
5. A technician only ever reads jobs they are assigned to.

## Migration Protocol
1. Update THIS file first.
2. supabase migration new <description>
3. Write ALTER TABLE.
4. supabase migration up
5. supabase gen types typescript --project-id <id> > lib/types.ts
6. NEVER manually edit production DB.
7. Commit: "db: [description]"
