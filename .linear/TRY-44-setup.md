## Goal

Bootstrap **Atomic-Habits** monorepo — full stack including **PostgreSQL + Redis + BullMQ**.

**Parent:** TRY-16 | **Docs:** `docs/app-flow-and-business-logic.md`

---

## Checklist

### Monorepo

- [ ] pnpm workspaces: `apps/web`, `apps/api`, `packages/shared`
- [ ] Root scripts: `dev`, `build`, `lint`, `typecheck`
- [ ] Shared types (Mission, Completion, User, XP, KanbanTask)

### TypeScript + quality

- [ ] `tsconfig.base.json` strict; ESLint + Prettier; CI on PR

### Infrastructure (Docker)

- [ ] `docker-compose.yml`: **PostgreSQL 16** + **Redis 7**
- [ ] `.env.example`: `DATABASE_URL`, `REDIS_URL`, `API_PORT`, `NEXT_PUBLIC_API_URL`, `SESSION_SECRET`

### Backend (`apps/api`)

- [ ] Express + TypeScript: cors, helmet, json, error handler, `GET /health`
- [ ] Prisma + PostgreSQL connection
- [ ] **Redis client** (ioredis) — connection + health check
- [ ] **BullMQ** — queue setup + worker stub for notifications

### Frontend (`apps/web`)

- [ ] Next.js App Router scaffold
- [ ] Tailwind + shadcn/ui (Button, Card, Checkbox, Badge, Skeleton, Toast, Progress)
- [ ] SWR provider + typed fetcher
- [ ] i18next EN/VI namespaces (`common`, `missions`, `dashboard`)

### Auth foundation

- [ ] User model in Prisma; register/login/logout; session cookies; bcrypt/argon2
- [ ] Auth middleware on protected routes

---

## Acceptance criteria

- [ ] `docker compose up` → Postgres + Redis healthy
- [ ] `pnpm dev` → web + API running
- [ ] API connects to Postgres and Redis
- [ ] BullMQ worker process starts (even if no jobs yet)
- [ ] Lint + typecheck pass in CI
