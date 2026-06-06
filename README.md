# ClawDashboard

OpenClaw Task Manager Dashboard — assign tasks to OpenClaw agents, run manually or on a schedule, and auto-reset repeatable tasks.

## Features

- Multi-agent task assignment (`main`, `dev`, `ops`, etc.)
- Manual **Run now** and optional cron/interval schedules
- Repeatable tasks reset to `ready` after completion
- Run history and per-agent stats
- OpenClaw Gateway integration via hooks + cron webhooks
- Background worker for cron sync and stuck-run reconciliation
- Basic password auth

## Quick start (local)

```bash
cp .env.example .env
npm install
npx prisma db push
npm run db:seed
npm run dev
```

Visit http://localhost:3000

## GitHub + Coolify auto-deploy

Push this repo to GitHub, then connect Coolify so every push to `main` rebuilds and redeploys automatically.

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: OpenClaw task manager dashboard"
git branch -M main
git remote add origin https://github.com/YOUR_USER/clawdashboard.git
git push -u origin main
```

Or with GitHub CLI:

```bash
gh repo create clawdashboard --public --source=. --remote=origin --push
```

### 2. Connect Coolify to GitHub

1. In Coolify → **Sources**, connect your GitHub account (OAuth app).
2. **+ New Resource** → **Docker Compose** → pick this repository and branch `main`.
3. Set **Base Directory** to `/` (repo root — `docker-compose.yml` is at the top level).
4. Enable **Auto Deploy** (Coolify adds a GitHub webhook on push).
5. Add environment variables from [`.env.example`](.env.example) in the Coolify UI (never commit `.env`).
6. Map persistent volumes: `pgdata`, `openclaw_config`, `workspaces`.
7. Expose only port **3000** publicly.

On first deploy, seed agents once:

```bash
docker compose exec clawdashboard npm run db:seed
```

After that, pushes to `main` trigger Coolify to pull, rebuild images, and restart the stack.

## Docker / Coolify (manual)

```bash
cp .env.example .env
# Edit secrets: AUTH_PASSWORD, OPENCLAW_HOOKS_TOKEN, OPENCLAW_GATEWAY_TOKEN, OPENCLAW_WEBHOOK_SECRET
docker compose up -d --build
```

Only `clawdashboard:3000` should be public. OpenClaw Gateway stays on the internal Docker network.

### Coolify checklist

1. Create a new Docker Compose resource pointing at this GitHub repo
2. Turn on **Auto Deploy** for automatic updates on push
3. Set env vars from `.env.example`
4. Attach persistent volumes: `pgdata`, `openclaw_config`, `workspaces`
5. Expose port 3000 publicly
6. Run `docker compose exec clawdashboard npm run db:seed` on first deploy

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tasks` | GET/POST | List/create tasks |
| `/api/tasks/:id` | GET/PATCH/DELETE | Task CRUD |
| `/api/tasks/:id/run` | POST | Manual trigger |
| `/api/tasks/:id/cancel` | POST | Cancel active run |
| `/api/agents` | GET | List agents |
| `/api/agents/sync` | POST | Sync agents from Gateway |
| `/api/webhooks/openclaw` | POST | OpenClaw completion webhook |
| `/api/health` | GET | Health check |

## OpenClaw webhook

Configure cron jobs to POST to:

```
POST {APP_URL}/api/webhooks/openclaw
Header: x-openclaw-webhook-secret: {OPENCLAW_WEBHOOK_SECRET}
```

Payload should include `taskId` or `jobName: clawdashboard:{taskId}`.

## Worker

```bash
npm run worker
```

Jobs: agent sync (15m), cron sync (5m), stuck-run reconciliation (2m).
