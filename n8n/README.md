# n8n (self-hosted)

Inbound flow (docs/04-integrations.md):

```
Meta / Viber ──▶ n8n (public webhook, parse + route) ──▶ Next.js /api/webhooks/* ──▶ Supabase
```

## Run

```bash
cd n8n
N8N_WEBHOOK_SECRET=change-me NEXT_APP_URL=http://host.docker.internal:3000 docker compose up -d
```

## Next.js env

Set these in the app's `.env.local`:

| Var | Purpose |
|-----|---------|
| `N8N_WEBHOOK_SECRET` | Shared secret; n8n sends it as `x-n8n-secret` |
| `MESSENGER_VERIFY_TOKEN` | Meta webhook verification token (GET `hub.challenge`) |
| `MESSENGER_APP_SECRET` | Verifies `x-hub-signature-256` |
| `MESSENGER_PAGE_ACCESS_TOKEN` | Outbound Messenger sends |
| `VIBER_AUTH_TOKEN` | Viber outbound + `x-viber-content-signature` |

## Workflow shape

For each channel, add a **Webhook** node (public) that forwards to Next.js:

- Messenger: `POST ${NEXT_APP_URL}/api/webhooks/messenger`
- Viber: `POST ${NEXT_APP_URL}/api/webhooks/viber`

Include the header `x-n8n-secret: ${N8N_WEBHOOK_SECRET}`. Next.js accepts **either** that
header **or** a valid platform signature, so the endpoint also works if exposed directly
to Meta/Viber.

The sanitised JSON body Next.js accepts is:

```json
{
  "sender_id": "1234567890",
  "text": "My faucet is leaking",
  "phone_number": "+639171234567",
  "category": "Plumbing",
  "attachments": []
}
```

> Note: this build performs duplicate prevention in Next.js (it owns the database),
> rather than in n8n. n8n is responsible for receiving, parsing, and routing.
