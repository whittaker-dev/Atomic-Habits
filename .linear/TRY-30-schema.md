## Goal

PostgreSQL schema for **Personal Growth OS** (missions, streaks, XP, kanban, English).

**Parent:** TRY-16

---

## Models

### User

- id, email, passwordHash, timezone (IANA)
- totalXp, level, currentStreak, bestStreak

### MissionCategory (separate lookup table)

- id, slug (unique: english|fitness|work|…)
- nameKey (i18n), icon, defaultXpReward, sortOrder, isActive
- Seeded once via `pnpm db:seed` — shared across all users

### Mission

- id, userId, **categoryId** (FK → mission_categories)
- title, xpReward (defaults from category), isActive, sortOrder

### MissionCompletion

- id, userId, missionId, completedDate (DATE in user TZ)
- **UNIQUE** (userId, missionId, completedDate)

### KanbanTask

- id, userId, title, column (todo|in_progress|done), sortOrder
- Separate from daily missions; user-owned self-growth board

### EnglishChallenge / EnglishSubmission

- **EnglishChallenge:** one row per calendar date (global content), type + JSON content
- **EnglishSubmission:** user answers per challenge; **UNIQUE** (userId, challengeId)

---

## Why category is a separate table

| Benefit                 | Example                                      |
| ----------------------- | -------------------------------------------- |
| Consistent slugs        | Weekly report: "6h English" groups correctly |
| i18n                    | `nameKey: categories.english` → EN/VI labels |
| Default XP per category | english=20, coding=25                        |
| Icons / UI              | `icon: dumbbell` on mission cards            |
| No typos                | FK constraint vs free-text `"Englsh"`        |

---

## Acceptance criteria

- [x] Prisma migration applied
- [x] `mission_categories` seeded with system categories
- [x] Missions use `category_id` FK (not string)
- [x] Cascade delete user → missions; **Restrict** delete category if missions exist
- [x] Index on (userId, completedDate) for heatmap queries
- [x] Kanban tasks table with column enum + user FK
- [x] English challenge + submission tables with daily uniqueness
