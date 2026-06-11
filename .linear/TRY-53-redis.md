## Goal

Redis layer per TRY-16 architecture — cache, sorted sets, TTL keys, Pub/Sub, BullMQ.

**Parent:** TRY-16 | **Docs:** `docs/app-flow-and-business-logic.md` §17

---

## Implementation

### Client (`apps/api/src/lib/redis/`)

- `redis` — general commands (cache, sorted sets, TTL)
- `redisPub` / `redisSub` — dedicated Pub/Sub connections
- `checkRedis()` — used by `GET /health`

### Cache helpers

| Function                    | Key                          | TTL   |
| --------------------------- | ---------------------------- | ----- |
| `get/setDashboardCache`     | `cache:dashboard:{userId}`   | 60s   |
| `invalidateDashboardCache`  | `cache:dashboard:{userId}`   | —     |
| `get/setStreakCache`        | `streak:current/best:{userId}` | 60s |
| `invalidateStreakCache`     | streak keys                  | —     |

### Sorted sets (leaderboard prep)

| Function           | Key                  |
| ------------------ | -------------------- |
| `addWeeklyXp`      | `leaderboard:weekly` |
| `getWeeklyRank`    | `leaderboard:weekly` |
| `getWeeklyTop`     | `leaderboard:weekly` |

### TTL keys

| Function              | Key                         |
| --------------------- | --------------------------- |
| `markDailyActive`     | `active:{userId}:{date}`    |
| `setStreakAtRisk`     | `streak:at-risk:{userId}`   |

### Pub/Sub

| Function            | Channel              |
| ------------------- | -------------------- |
| `publishActivity`   | `channel:activity`   |
| `subscribeActivity` | `channel:activity`   |

### BullMQ (`apps/api/src/lib/queue.ts`)

- Queue: `notifications`
- Jobs: `send-mail`, `mission-complete` (stub worker log)

---

## Acceptance criteria

- [x] Redis health in `/health`
- [x] Helper module with get/set/invalidate patterns
- [x] Documented key naming in `docs/app-flow-and-business-logic.md` §17
