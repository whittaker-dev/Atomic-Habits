# Atomic Habits

Personal growth operating system — daily missions, streaks, XP, and English challenges.

## Stack

| Layer         | Tech                                                                         |
| ------------- | ---------------------------------------------------------------------------- |
| Frontend      | Next.js 15, Tailwind, editorial design system (`apps/web/src/design-system`) |
| Backend       | Express, Prisma, PostgreSQL                                                  |
| Cache / queue | Redis, BullMQ                                                                |
| Monorepo      | pnpm workspaces                                                              |

## Quick start

```bash
# Install
pnpm install

# Start Postgres + Redis
docker compose up -d

# Copy env
cp .env.example .env
cp .env.example apps/api/.env

# Generate Prisma client (after DB is up)
pnpm --filter @atomic-habits/api db:generate

# Run web + API
pnpm dev
```

## Verify (before PR)

```bash
pnpm check    # typecheck + lint + format:check
```

Or run individually:

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
```

- Web: http://localhost:3000
- Design system showcase: http://localhost:3000/design-system
- API health: http://localhost:4000/health

## Project structure

```
apps/
  web/          Next.js frontend + design system
  api/          Express API
packages/
  shared/       Shared TypeScript types
docs/           Product flow & implementation order
```

## Design system

Notion-inspired: white canvas, navy hero band, purple primary CTA, pastel feature card tints.

- **Tokens:** `apps/web/src/design-system/tokens/`
- **Components:** `apps/web/src/design-system/components/`
- **Font:** Inter (Notion Sans substitute)
- **Showcase:** http://localhost:3000/design-system

## Docs

- [App flow & business logic](docs/app-flow-and-business-logic.md)
- [Implementation order](docs/implementation-order.md)
- Linear epic: [TRY-16](https://linear.app/trysomethign/issue/TRY-16)
