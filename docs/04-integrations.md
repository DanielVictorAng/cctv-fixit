# 04-INTEGRATIONS
Integrations Version: 2.0.0

## Architecture
Outbound only: Next.js Server Actions → Messenger/Viber APIs, for customer updates.
Customers no longer message in to open tickets: projects start at the store (docs/02-logic.md).
The previous inbound intake — Messenger/Viber webhooks creating tickets, n8n forwarding and
duplicate matching — is removed in Phase 1.

OPEN (before Phase 3):
- Messenger can only message people who messaged the Page first, and Viber only subscribers.
  How a customer's Messenger/Viber id gets linked (for example: the customer sends their job
  number to the Page and a minimal webhook records the id; no job is created).
- SMS for customers needs a provider that is not on the approved list.
- Push notifications for technicians need a web-push package or provider that is not on the
  approved list.

## Messenger
- Outbound: POST graph.facebook.com/v18.0/me/messages with the Page access token.

## Viber
- Outbound: POST chatapi.viber.com/pa/send_message with the auth token.

## Customer Updates
Start in Phase 3, once linking is decided, and go only to customers with a linked Messenger or
Viber id. Wording is finalised before Phase 3.
| Event | Content |
|-------|---------|
| Quote presented | Grand Total and 50% downpayment (never the split) |
| Job order confirmed | Downpayment received, job number |
| Survey scheduled | Survey date |
| Installation scheduled | Install date and technician name |
| Job completed | Balance due at the store |

## Failure Handling
- API down: Retry 3x, backoff 1s/4s/16s.
- After 3 fails: Log to outbound_queue. Cron retries 15 min.
- NEVER block app if messaging API down.

## Payment
- Cash, GCash and Maya are collected at the store and recorded by store staff. NO payment API.
- Future: GCash Merchant API when volume justifies. NOT now.
