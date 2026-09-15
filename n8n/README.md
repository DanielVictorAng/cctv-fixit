# n8n (self-hosted)

**Phase 6.1** — the automation container. n8n **Community Edition**: free, no subscription.
(n8n *Cloud* is the paid product — not used here.)

Three ways to run it. Pick one.

## Option A — Docker on a PC / VPS (recommended for an always-on VPS)

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

## Option C — UGREEN NAS (best free option: already on 24/7)

UGOS Pro ships Docker, and every DXP model is x86-64, so the normal
`linux/amd64` image just works. Use `docker-compose.nas.yml` (bind mount instead
of a named volume, so you can back the data up from the NAS file browser).

1. **Install Docker** — App Center → Docker. Also enable SSH: Control Panel → Terminal.
2. **Create the folder** — File Manager → shared folder `docker` → subfolder `n8n`.
   Its real path is usually `/volume1/docker/n8n` (confirm with `ls /volume*`).
3. **Fix ownership** — the container runs as user `node`, UID/GID 1000:
   ```bash
   sudo chown -R 1000:1000 /volume1/docker/n8n
   ```
4. **Deploy** — either Docker app → Project → Create and paste
   `docker-compose.nas.yml`, or over SSH:
   ```bash
   cd /volume1/docker/n8n
   # copy docker-compose.nas.yml here first, then:
   docker compose -f docker-compose.nas.yml up -d
   ```
5. **Open** <http://NAS-IP:5678> and create the owner account, then re-enter your
   n8n license key (it was emailed to you — nothing is tied to the old install).

### Reaching the Next.js app from the NAS

`host.docker.internal` is **wrong** here — inside the container it means the NAS
itself, not your PC. Use your PC's LAN IP in `NEXT_APP_URL`:

```
NEXT_APP_URL=http://192.168.1.50:3000
```

Allow Node.js through Windows Firewall on **private** networks, then prove it
from the NAS: `curl -I http://192.168.1.50:3000` should answer.

### Public webhooks (needed in 6.2 / 6.3)

Meta and Viber must be able to *reach* your webhook over HTTPS. Free options:
Cloudflare Tunnel (`cloudflared` container on the NAS), Tailscale Funnel, or
Nginx Proxy Manager + a free DDNS hostname. Then set `N8N_HOST`, `N8N_PROTOCOL=https`,
`WEBHOOK_URL` and `N8N_SECURE_COOKIE=true`. `N8N_PROXY_HOPS=1` is already set so
the forwarded headers are trusted.

### Back up

Everything that matters — workflows, credentials, and the credential encryption
key — lives in `/volume1/docker/n8n`. Losing it means re-creating every credential.

## Environment

| Var | Used by | Value |
|-----|---------|-------|
| `N8N_WEBHOOK_SECRET` | compose + Next.js | long random string; must match the app's `.env.local` |
| `NEXT_APP_URL` | compose only | `http://host.docker.internal:3000` (Docker), `http://localhost:3000` (npx), `http://<PC-LAN-IP>:3000` (NAS) |
| `N8N_HOST` / `N8N_PROTOCOL` / `WEBHOOK_URL` | NAS only | set once a tunnel/reverse proxy is in front of n8n |

## Scope of this sub-phase

- ✅ Runs n8n and persists its data (Docker volume `n8n_data`, bind mount on the NAS, or `~/.n8n` with npx).
- ✅ Shared-secret + app URL wired through env.
- ⏭️ The Messenger / Viber workflows themselves are **6.2 / 6.3**.

## Verify

1. Open <http://localhost:5678> (or `http://NAS-IP:5678`) and create the owner account.
2. Docker path: `docker compose ps` should show `n8n` as running.
3. npx path: the terminal stays attached; Ctrl+C stops it.
