# 04-INTEGRATIONS
Integrations Version: 1.0.0

## Architecture
Inbound: Meta/Viber → n8n → Next.js /api/webhooks/ → Supabase
Outbound: Next.js Server Actions → Meta/Viber APIs
n8n: Inbound parsing, dedup, routing. Next.js: Logic, DB, outbound.
Next.js NEVER receives raw webhooks directly. n8n sanitizes first.

## Messenger Webhook
- Path: /api/webhooks/messenger
- Verify: GET hub.challenge → return challenge string
- Inbound POST: Parse sender_id, text, image attachments
- Outbound: POST graph.facebook.com/v18.0/me/messages
- Security: Verify X-Hub-Signature-256. Reject invalid.

## Viber Webhook
- Path: /api/webhooks/viber
- Inbound POST: Parse sender.id, text
- Outbound: POST chatapi.viber.com/pa/send_message
- Security: Verify X-Viber-Content-Signature. Reject invalid.

## Duplicate Prevention
Match order: phone_number → fb_messenger_id → viber_id
Same person both platforms → ONE customer. Link both IDs.
Same issue within 24h → link to existing ticket. No duplicate.
Unsure → create with "possible_duplicate" flag. Coordinator reviews.

## Outbound Templates
quote: "Hi {name}! Quote for {service}: ₱{amount}. Valid 7 days. Reply YES to schedule. 🙏"
dispatch: "Hi {name}! Tech {tech_name} arriving {time_window}. Salamat! 🙏"
complete: "Hi {name}! Job done ✅ Total: ₱{amount}. GCash: {number}. Salamat po!"
warranty: "Hi {name}! Follow-up — okay pa ba yung {service}? Message lang po if may issue. 😊"
reminder: "Hi {name}! Reminder: appointment tomorrow {time}. See you po! 👍"

## Failure Handling
- API down: Retry 3x, backoff 1s/4s/16s.
- After 3 fails: Log to outbound_queue. Cron retries 15 min.
- NEVER block app if messaging API down.
- n8n down: Manual ticket creation via coordinator dashboard still works.

## Payment
- GCash/Maya: NO API. Manual confirm by coordinator.
- Cash: Tech confirms in PWA. Coordinator verifies end of day.
- Future: GCash Merchant API when volume justifies. NOT now.
