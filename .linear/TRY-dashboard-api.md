## Goal

Single endpoint for the home screen — powers Today's Missions UI (TRY-58).

**Parent:** TRY-16 | **Docs:** `docs/app-flow-and-business-logic.md` §16

---

## Response includes

- Today's missions + `completedToday` flag per mission
- 🔥 `currentStreak`, `bestStreak`
- `totalXp`, `level`, `levelProgress` (0–100 for bar)
- `todayCompleted` / `todayTotal`
- Optional: last 7 days activity summary for mini heatmap

## Example

```json
{
  "streak": { "current": 28, "best": 30 },
  "xp": { "total": 340, "level": 7, "progress": 68 },
  "today": { "completed": 1, "total": 3 },
  "missions": [
    { "id": "...", "title": "Learn 10 English words", "completedToday": false, "xpReward": 20 }
  ]
}
```

## Performance

- Redis cache `cache:dashboard:{userId}` TTL 60s
- Invalidate on `POST /missions/:id/complete`

## Acceptance criteria

- [ ] Authenticated only (401 otherwise)
- [ ] Cached path under 50ms p95
- [ ] Documented in OpenAPI or README
