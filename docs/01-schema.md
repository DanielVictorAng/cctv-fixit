# 01-SCHEMA
Schema Version: 1.5.0

## ENUMs
user_role: ADMIN | COORDINATOR | TECHNICIAN | STORE_STAFF
ticket_status: NEW | QUOTED | SCHEDULED | DISPATCHED | IN_PROGRESS | COMPLETED | PAID | CLOSED | CANCELLED
baguio_zone: ZONE_1_CENTER | ZONE_2_EAST | ZONE_3_WEST | ZONE_4_SOUTH | ZONE_5_NORTH | ZONE_6_PERIPHERAL
payment_method: GCASH | CASH | BANK_TRANSFER | MAYA
change_order_status: PENDING | APPROVED | REJECTED

## Tables

### profiles
| Field | Type | Constraint | Note |
|-------|------|-----------|------|
| id | uuid | PK, FK→auth.users | |
| role | user_role | NOT NULL, default TECHNICIAN | |
| full_name | text | NOT NULL | |
| skills | text[] | default [] | ['plumbing','electrical','roofing','carpentry','painting'] |
| phone_number | text | nullable | |
| is_active | boolean | default true | |

### customers
| Field | Type | Constraint | Note |
|-------|------|-----------|------|
| id | uuid | PK, auto | |
| full_name | text | NOT NULL | |
| fb_messenger_id | text | UNIQUE, nullable | |
| viber_id | text | UNIQUE, nullable | |
| phone_number | text | nullable | Primary match key |
| default_address | text | nullable | |
| zone | baguio_zone | nullable | |
| created_at | timestamptz | auto | |
| possible_duplicate | boolean | default false | Intake unsure — coordinator reviews |

Indexes: (phone_number), (fb_messenger_id), (viber_id)

### services
| Field | Type | Constraint | Note |
|-------|------|-----------|------|
| id | uuid | PK, auto | |
| category | text | NOT NULL | 'Plumbing','Electrical','Roofing','Carpentry','Painting','General' |
| name | text | NOT NULL | e.g. 'Faucet Replacement' |
| base_labour_price | numeric(10,2) | NOT NULL | |
| est_duration_min | int | default 60 | |

### tickets
| Field | Type | Constraint | Note |
|-------|------|-----------|------|
| id | uuid | PK, auto | |
| customer_id | uuid | FK→customers, NOT NULL | |
| assigned_tech_id | uuid | FK→profiles, nullable | null until DISPATCHED |
| status | ticket_status | NOT NULL, default NEW | |
| service_category | text | NOT NULL | |
| issue_description | text | NOT NULL | |
| photo_urls | text[] | default [] | Supabase Storage paths |
| zone | baguio_zone | NOT NULL | |
| quoted_labour | numeric(10,2) | default 0 | |
| quoted_materials | numeric(10,2) | default 0 | |
| final_total | numeric(10,2) | default 0 | |
| downpayment_amount | numeric(10,2) | nullable | Required if final_total > 5000 |
| downpayment_paid_at | timestamptz | nullable | |
| scheduled_start | timestamptz | nullable | |
| scheduled_end | timestamptz | nullable | |
| completed_at | timestamptz | nullable | |
| warranty_expires_at | timestamptz | nullable | completed_at + 30 days |
| payment_method | payment_method | nullable | |
| is_paid | boolean | default false | |
| cancellation_fee | numeric(10,2) | default 0 | |
| change_order_pending | boolean | default false | |
| parent_ticket_id | uuid | FK→tickets, nullable | Warranty claims link |
| created_at | timestamptz | auto | |
| updated_at | timestamptz | auto, trigger | |

Indexes: (customer_id), (assigned_tech_id), (status), (scheduled_start), (zone)

### materials
| Field | Type | Constraint | Note |
|-------|------|-----------|------|
| id | uuid | PK, auto | |
| sku | text | UNIQUE, NOT NULL | |
| name | text | NOT NULL | |
| category | text | nullable | |
| cost_price | numeric(10,2) | NOT NULL | Hardware store cost |
| sell_price | numeric(10,2) | NOT NULL | cost × 1.20 |
| stock_qty | int | default 0 | |

### ticket_materials
| Field | Type | Constraint | Note |
|-------|------|-----------|------|
| ticket_id | uuid | FK→tickets, PK | |
| material_id | uuid | FK→materials, PK | |
| quantity_used | int | NOT NULL, default 1 | |
| dispensed_at | timestamptz | nullable | Set when store dispenses the pick-list |
| dispensed_by | uuid | FK→profiles, nullable | |

Do NOT store total_cost. Calculate: quantity_used × materials.sell_price at query time.

### audit_log
| Field | Type | Constraint | Note |
|-------|------|-----------|------|
| id | uuid | PK, auto | |
| table_name | text | NOT NULL | |
| record_id | uuid | NOT NULL | |
| action | text | NOT NULL | INSERT/UPDATE/DELETE |
| changed_by | uuid | FK→profiles | |
| changed_at | timestamptz | auto | |
| old_values | jsonb | nullable | |
| new_values | jsonb | nullable | |

Indexes: (record_id), (changed_at)

### change_orders
| Field | Type | Constraint | Note |
|-------|------|-----------|------|
| id | uuid | PK, auto | |
| ticket_id | uuid | FK→tickets, NOT NULL | |
| requested_by | uuid | FK→profiles, NOT NULL | Technician who raised it |
| new_description | text | NOT NULL | Added scope description |
| additional_labour | numeric(10,2) | NOT NULL, default 0 | |
| additional_materials | jsonb | NOT NULL, default [] | [{material_id, quantity, unit_cost}] |
| status | change_order_status | NOT NULL, default PENDING | |
| resolved_by | uuid | FK→profiles, nullable | |
| resolved_at | timestamptz | nullable | |
| created_at | timestamptz | auto | |

Indexes: (ticket_id), (status)

### outbound_queue
| Field | Type | Constraint | Note |
|-------|------|-----------|------|
| id | uuid | PK, auto | |
| channel | text | NOT NULL, CHECK messenger|viber | |
| recipient_id | text | NOT NULL | Platform-scoped id |
| body | text | NOT NULL | Rendered message |
| ticket_id | uuid | FK→tickets, nullable | |
| attempts | int | NOT NULL, default 0 | |
| last_error | text | nullable | |
| status | text | NOT NULL, default PENDING | PENDING|SENT|FAILED |
| next_attempt_at | timestamptz | default now() | |
| created_at | timestamptz | auto | |
| sent_at | timestamptz | nullable | |

Indexes: (status, next_attempt_at)

## RLS Policies
- profiles: SELF reads own. ADMIN reads all. COORDINATOR reads TECHNICIAN profiles.
- customers: ADMIN+COORDINATOR full CRUD. TECHNICIAN reads only assigned ticket customers.
- tickets: ADMIN+COORDINATOR full CRUD. TECHNICIAN SELECT where assigned_tech_id=auth.uid(). TECHNICIAN UPDATE only: status, photo_urls, completed_at, change_order_pending. STORE_STAFF SELECT where status IN (SCHEDULED, DISPATCHED).
- materials: All authenticated SELECT. ADMIN+STORE_STAFF UPDATE stock_qty.
- ticket_materials: ADMIN+COORDINATOR SELECT + INSERT. TECHNICIAN(assigned) SELECT + INSERT. STORE_STAFF SELECT for SCHEDULED/DISPATCHED tickets, UPDATE dispensed_at/dispensed_by only. ADMIN DELETE.
- audit_log: ADMIN SELECT only. No UPDATE. No DELETE. Ever.
- services: ADMIN full CRUD. Others SELECT only.
- change_orders: TECHNICIAN(assigned) SELECT + INSERT. COORDINATOR+ADMIN SELECT + UPDATE. ADMIN full.
- outbound_queue: ADMIN SELECT only. Writes happen server-side via service role.

## Triggers
### on_auth_user_created (on auth.users)
- Auto-creates a `profiles` row whenever a new auth user signs up.
- Defaults: `role = TECHNICIAN`, `is_active = true`, `skills = []`.
- `full_name` = `raw_user_meta_data.full_name`, falling back to the user's email.
- Backfills pre-existing users that lack a profile (see migration 002).

## Storage
- Bucket `ticket-photos` (private). Holds ticket/job photos (see migration 003).
- Uploads: max 5MB, image/jpeg|png|webp, via Server Action only (service role).
- Reads: signed URLs (1 hour).

## Security Rules
1. NEVER expose service_role key to client. Server Actions only.
2. Uploads: max 5MB, image/jpeg|png|webp only.
3. Webhooks: validate signature headers. Reject invalid.
4. Rate limit: max 10 tickets per customer per 24h.
5. All inputs through Zod before DB.

## Migration Protocol
1. Update THIS file first.
2. supabase migration new <description>
3. Write ALTER TABLE.
4. supabase migration up
5. supabase gen types typescript --project-id <id> > lib/types.ts
6. NEVER manually edit production DB.
7. Commit: "db: [description]"
