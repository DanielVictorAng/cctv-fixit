# n8n (self-hosted)

**Phase 6.1** — the automation container. n8n **Community Edition**: free, no subscription.
(n8n *Cloud* is the paid product — not used here.)

Two ways to run it. Pick one.

## Option A — Docker (recommended for an always-on VPS)

```bash
cd n8n
cp env.example .env        # set N8N_WEBHOOK_SECRET + NEXT_APP_URL
docker compose up -d
docker compose logs -f n8n
```

n8n is then at <http://localhost:5678>.

## Option B — no Docker (quickest locally, still free)

Requires Node 20+. From the repo root:

```bash
npx n8n start
```

n8n runs on the host at <http://localhost:5678>, and data persists in `~/.n8n`.
With this option set `NEXT_APP_URL=http://localhost:3000` (not `host.docker.internal`).

## Environment

| Var | Used by | Value |
|-----|---------|-------|
| `N8N_WEBHOOK_SECRET` | compose + Next.js | long random string; must match the app's `.env.local` |
| `NEXT_APP_URL` | compose only | `http://host.docker.internal:3000` (Docker) or `http://localhost:3000` (host) |

## Scope of this sub-phase

- ✅ Runs n8n and persists its data (Docker volume `n8n_data`, or `~/.n8n` with npx).
- ✅ Shared-secret + app URL wired through env.
- ⏭️ The Messenger / Viber workflows themselves are **6.2 / 6.3**.

## Verify

1. Open <http://localhost:5678> and create the owner account.
2. Docker path: `docker compose ps` should show `n8n` as running.
3. npx path: the terminal stays attached; Ctrl+C stops it.
