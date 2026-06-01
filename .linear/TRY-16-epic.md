## Vision

**Personal growth operating system** — _Linear + Duolingo for self-improvement._

Not a todo app. Daily missions, streaks, XP, English challenges, and visible progress.

**Docs:** `docs/app-flow-and-business-logic.md` · `docs/implementation-order.md`

---

## MVP must-have

- Auth · Daily missions · Global streak · Heatmap · XP/level · Daily English · Redis layer

---

## Implementation order (for developers)

Work tickets **in step order** (`estimate` = step #). In Linear: sort by **Priority** → **Estimate**.

### Phase 1 — Foundation (Priority: Urgent)

| Step | Ticket | Task                                  |
| ---- | ------ | ------------------------------------- |
| 01   | TRY-44 | Monorepo, Postgres, Redis, BullMQ, CI |
| 02   | TRY-30 | Database schema                       |
| 03   | TRY-53 | Redis infrastructure                  |

### Phase 2 — Core backend (Priority: High)

| Step | Ticket | Task                     |
| ---- | ------ | ------------------------ |
| 04   | TRY-45 | User timezone            |
| 05   | TRY-59 | Seed default missions    |
| 06   | TRY-54 | Missions CRUD + complete |
| 07   | TRY-32 | Global streak engine     |
| 08   | TRY-55 | XP + level               |
| 09   | TRY-68 | GET /dashboard API       |

### Phase 3 — Frontend & MVP (Priority: High)

| Step | Ticket | Task                        |
| ---- | ------ | --------------------------- |
| 10   | TRY-43 | Auth UI                     |
| 11   | TRY-58 | Today's Missions dashboard  |
| 12   | TRY-56 | Heatmap + XP bar + weekly % |
| 13   | TRY-57 | Daily English challenge     |

### Phase 4 — Polish (Priority: Medium)

| Step | Ticket | Task                   |
| ---- | ------ | ---------------------- |
| 14   | TRY-38 | i18n English           |
| 15   | TRY-39 | i18n Vietnamese        |
| 16   | TRY-40 | Language switcher      |
| 17   | TRY-41 | Responsive layout      |
| 18   | TRY-42 | Loading / error states |
| 19   | TRY-46 | Integration tests      |

**→ MVP complete after step 19**

### Phase 5 — V2 (Priority: Low)

| Step | Ticket | Task                |
| ---- | ------ | ------------------- |
| 20   | TRY-60 | Kanban board        |
| 21   | TRY-61 | Realtime motivation |
| 22   | TRY-62 | Smart notifications |
| 23   | TRY-63 | Weekly reports      |

### Phase 6 — Future (Priority: Low)

TRY-48, TRY-51–52, TRY-64–67 — do not start before V2.

---

## Tech stack

Next.js · Express · TypeScript · PostgreSQL · Prisma · **Redis** · **BullMQ** · shadcn/ui · SWR · i18next

---

## Parallel work (2 devs)

| Dev A (backend)             | Dev B (frontend)             |
| --------------------------- | ---------------------------- |
| 01 → 02 → 06 → 07 → 08 → 09 | 01 → 03 → 10 → 11 (after 09) |
| 12–13 after API ready       | 14–18 polish                 |
