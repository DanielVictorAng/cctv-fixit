# 04-INTEGRATIONS
Integrations Version: 1.1.0

## Architecture
Inbound (preferred): Meta/Viber → n8n → Next.js /api/webhooks/ → Supabase
Inbound (fallback):  Meta/Viber → Next.js /api/webhooks/ → Supabase
Outbound: Next.js Server Actions → Meta/Viber APIs
n8n: Inbound parsing, dedup, routing. Next.js: Logic, DB, outbound.
Webhook routes accept BOTH paths. A request carrying the x-n8n-secret header
(an n8n forward) is trusted without a platform signature; otherwise the raw
platform signature is verified (Meta X-Hub-Signature-256 / Viber
X-Viber-Content-Signature). A raw payload is normalised into the same shape n8n
sends, so dedup and intake behave identically either way.
The fallback exists because the client's n8n instance sits behind a home
router and has no public URL, so Meta/Viber may point straight at the app. If no
n8n secret is configured, that path is not silently trusted — it fails closed.

## Messenger Webhook
- Path: /api/webhooks/messenger
- Verify: GET hub.challenge → return challenge string
- Inbound POST: Parse sender_id, text, image attachments
- Outbound: POST graph.facebook.com/v18.0/me/messages
- Security: Verify X-Hub-Signature-256. Reject invalid.

## Viber Webhook
- Path: /api/webhooks/viber
- Inbound POST: Parse sender.id, text; media URL for picture/video/file messages
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
ack: "Salamat {name}! Natanggap na po namin ang message niyo. We will get back to you shortly. 🙏"

## Failure Handling
- API down: Retry 3x, backoff 1s/4s/16s.
- After 3 fails: Log to outbound_queue. Cron retries 15 min.
- NEVER block app if messaging API down.
- n8n down: Manual ticket creation via coordinator dashboard still works.

## Payment
- GCash/Maya: NO API. Manual confirm by coordinator.
- Cash: Tech confirms in PWA. Coordinator verifies end of day.
- Future: GCash Merchant API when volume justifies. NOT now.
