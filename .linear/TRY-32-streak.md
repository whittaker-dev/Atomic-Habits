## Goal

**Global streak** service — consecutive days with ≥1 mission completed. **Redis-backed** for fast reads.

**Parent:** TRY-16 | **Docs:** §6 Streaks

---

## Rules

- **Global streak:** any mission completion counts for the day
- User timezone defines "today"
- Miss full calendar day → streak = 0
- Yesterday done, not yet today → streak still alive until midnight

---

## Redis keys

| Key                       | Purpose                          |
| ------------------------- | -------------------------------- |
| `streak:current:{userId}` | Cached current streak            |
| `streak:best:{userId}`    | Personal best                    |
| `active:{userId}:{date}`  | User completed something on date |

Invalidate/update on `POST /missions/:id/complete`.

---

## Tasks

- Pure streak function from sorted completion dates
- Unit tests: gaps, timezone midnight, consecutive days
- Sync Redis on completion; fallback compute from PostgreSQL on cache miss

---

## Acceptance criteria

- [ ] Streak correct per docs examples
- [ ] Dashboard reads streak from Redis (<5ms)
- [ ] PostgreSQL remains source of truth for history
