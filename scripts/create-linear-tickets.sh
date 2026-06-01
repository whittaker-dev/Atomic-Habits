#!/usr/bin/env bash
# DEPRECATED — use scripts/sync-linear-tickets.sh (Personal Growth OS vision)
# Kept for reference only.
set -euo pipefail

TEAM="TRY"
PARENT="TRY-16"
DESC_DIR="$(mktemp -d)"
trap 'rm -rf "$DESC_DIR"' EXIT

create() {
  local title="$1"
  local label="$2"
  local priority="${3:-0}"
  local desc_file="$DESC_DIR/issue.md"
  cat > "$desc_file" <<EOF
$4
EOF
  local args=(issue create --team "$TEAM" --parent "$PARENT" --title "$title" --description-file "$desc_file")
  if [[ -n "$label" ]]; then
    args+=(--label "$label")
  fi
  if [[ "$priority" != "0" ]]; then
    args+=(--priority "$priority")
  fi
  linear "${args[@]}"
}

echo "=== Project setup (single ticket) ==="

create "[Setup] Project bootstrap — monorepo, Next.js, Express, Prisma, shadcn/ui, SWR, i18n, auth, CI" "Improvement" 2 "$(cat <<'EOF'
## Goal
Bootstrap the Atomic-Habits monorepo end-to-end (see TRY-44 for full checklist).

Covers: pnpm monorepo, TypeScript, ESLint/Prettier, Docker Postgres, Prisma, Express API, Next.js, shadcn/ui, SWR, i18next EN/VI, auth foundation, GitHub Actions CI.

**Parent epic:** TRY-16
EOF
)"

echo "=== Data & API features ==="

create "[Feature] Database schema — users, habits, check-ins" "Feature" 2 "$(cat <<'EOF'
## Goal
Persist habits and daily check-ins.

## Schema (suggested)
- **User**: id, email, passwordHash, timezone (IANA string, default UTC)
- **Habit**: id, userId, slug, nameKey (i18n), category, sortOrder, isDefault
- **CheckIn**: id, userId, habitId, date (DATE only, user timezone), createdAt
- Unique: `(userId, habitId, date)`

## Acceptance criteria
- [ ] Migration applied
- [ ] Cascade rules defined (delete user → habits/check-ins)

**Parent epic:** TRY-16
EOF
)"

create "[Feature] Seed five default habits for new users" "Feature" 2 "$(cat <<'EOF'
## Goal
New users get MVP habits from TRY-16.

## Default habits
| Slug | Category |
|------|----------|
| learn-english | education |
| gym | fitness |
| read-books | reading |
| coding | dev |
| meditation | wellness |

## Tasks
- Seed on user registration (or migration seed for dev)
- Display names via i18n keys (`habits.learnEnglish`, etc.)

## Acceptance criteria
- [ ] New user has exactly 5 habits
- [ ] Habits appear on dashboard immediately after signup

**Parent epic:** TRY-16
EOF
)"

create "[Feature] Streak calculation service (timezone-aware)" "Feature" 1 "$(cat <<'EOF'
## Goal
Correct current streak and best streak per habit.

## Rules (from TRY-16)
- Consecutive **calendar days** in user's timezone
- Missed day → current streak = 0
- Duplicate check-in same day → idempotent (no double count)

## Tasks
- Pure function/service: given sorted check-in dates + today → `{ currentStreak, bestStreak }`
- Unit tests: consecutive days, gap, timezone midnight boundary, duplicate day

## Acceptance criteria
- [ ] Tests cover edge cases at day boundary (e.g. Asia/Ho_Chi_Minh vs UTC)
- [ ] Used by `GET /habits` response

**Parent epic:** TRY-16
EOF
)"

create "[Feature] API: GET /habits — list with streak and today status" "Feature" 2 "$(cat <<'EOF'
## Goal
Dashboard data endpoint.

## Response (per habit)
```json
{
  "id": "...",
  "slug": "gym",
  "checkedInToday": true,
  "currentStreak": 12,
  "bestStreak": 30
}
```

## Tasks
- Auth required
- Join habits + today's check-in + streak service

## Acceptance criteria
- [ ] Returns all user habits ordered by `sortOrder`
- [ ] `checkedInToday` accurate for user timezone
- [ ] OpenAPI or README documents shape

**Parent epic:** TRY-16
EOF
)"

create "[Feature] API: POST /habits/:id/check-in — daily check-in" "Feature" 2 "$(cat <<'EOF'
## Goal
Mark habit done for today.

## Behavior
- Creates check-in for **today** in user timezone
- Idempotent: second POST same day returns 200 with existing record
- Returns updated streak counts

## Acceptance criteria
- [ ] 404 if habit not owned by user
- [ ] Unique constraint prevents duplicate rows
- [ ] Response includes updated `currentStreak`

**Parent epic:** TRY-16
EOF
)"

create "[Feature] API: GET /habits/:id/history — check-in calendar" "Feature" 3 "$(cat <<'EOF'
## Goal
History for streak calculation and future calendar UI.

## Query params
- `from`, `to` (ISO dates) optional — default last 90 days

## Response
List of dates checked in: `["2026-05-27", "2026-05-28", ...]`

## Acceptance criteria
- [ ] Only returns requesting user's habit
- [ ] Dates in user timezone

**Parent epic:** TRY-16
EOF
)"

create "[Feature] API: DELETE /habits/:id/check-in/today — undo check-in" "Feature" 4 "$(cat <<'EOF'
## Goal
Allow user to undo mistaken check-in (TRY-16 optional API).

## Behavior
- Removes today's check-in if exists
- Recalculates streak

## Acceptance criteria
- [ ] 204 or 200 with updated habit stats
- [ ] 404 if no check-in today

**Parent epic:** TRY-16
EOF
)"

echo "=== Frontend features ==="

create "[Feature] Dashboard page — habit list and today progress" "Feature" 2 "$(cat <<'EOF'
## Goal
Main screen: all habits + completion summary.

## UI
- Header: "Today" + progress **X / 5** habits done
- Grid/list of habit cards (see related ticket)

## Acceptance criteria
- [ ] Fetches `GET /habits` via SWR
- [ ] Progress updates after check-in without full page reload
- [ ] Empty/loading states handled

**Parent epic:** TRY-16
EOF
)"

create "[Feature] Habit card UI — check-in, current streak, best streak" "Feature" 2 "$(cat <<'EOF'
## Goal
Single habit row/card on dashboard.

## UI elements
- Habit name (i18n)
- Category icon/badge
- Toggle or button: mark done / done today
- **Current streak** (prominent)
- **Best streak** (secondary)

## Acceptance criteria
- [ ] Clear visual distinction: not done vs done today
- [ ] Accessible (keyboard, aria-pressed on toggle)
- [ ] Uses shadcn Card + Button/Checkbox

**Parent epic:** TRY-16
EOF
)"

create "[Feature] Optimistic check-in with SWR revalidation" "Feature" 3 "$(cat <<'EOF'
## Goal
Instant UI feedback on check-in (TRY-16 acceptance criteria).

## Tasks
- Optimistic update on `POST /habits/:id/check-in`
- Rollback on error + toast message
- `mutate('/habits')` on success

## Acceptance criteria
- [ ] UI updates before network completes
- [ ] Failed request restores previous state

**Parent epic:** TRY-16
EOF
)"

create "[Feature] i18n — English translations (habits, dashboard, common)" "Feature" 3 "$(cat <<'EOF'
## Goal
Complete EN copy for MVP flows.

## Keys to cover
- 5 habit names + descriptions (optional)
- Dashboard: title, progress, streak labels, errors
- Auth: login, register, logout
- Common: loading, save, cancel

## Acceptance criteria
- [ ] No hardcoded user-facing English strings in dashboard/auth
- [ ] All keys exist in `en` namespace files

**Parent epic:** TRY-16
EOF
)"

create "[Feature] i18n — Vietnamese translations (habits, dashboard, common)" "Feature" 3 "$(cat <<'EOF'
## Goal
Complete VI copy for MVP flows (TRY-16 requirement).

## Tasks
- Mirror all `en` keys in `vi`
- Natural Vietnamese for habit names (e.g. Học tiếng Anh, Gym, Đọc sách, Lập trình, Thiền)

## Acceptance criteria
- [ ] Switching to `vi` shows fully translated dashboard
- [ ] No missing-key warnings in console

**Parent epic:** TRY-16
EOF
)"

create "[Feature] Language switcher (EN / VI)" "Feature" 4 "$(cat <<'EOF'
## Goal
User can change locale.

## Tasks
- Toggle or dropdown in header
- Persist preference (cookie `NEXT_LOCALE` or i18next detector)
- Page does not require full reload if possible

## Acceptance criteria
- [ ] Selection persists across sessions
- [ ] All MVP screens respect selected locale

**Parent epic:** TRY-16
EOF
)"

create "[Feature] Responsive mobile-first layout" "Feature" 3 "$(cat <<'EOF'
## Goal
Daily check-in optimized for phone (TRY-16 acceptance criteria).

## Tasks
- Mobile: single column, large tap targets
- Tablet/desktop: grid or wider cards
- Safe area / viewport meta

## Acceptance criteria
- [ ] Usable on 375px width without horizontal scroll
- [ ] Check-in button min 44px touch target

**Parent epic:** TRY-16
EOF
)"

create "[Feature] Loading and error states for dashboard" "Feature" 4 "$(cat <<'EOF'
## Goal
Polished UX during fetch and failures.

## Tasks
- Skeleton cards while `GET /habits` loading
- Error banner with retry (SWR `error` + `mutate`)
- Toast on check-in failure

## Acceptance criteria
- [ ] No layout shift flash on load
- [ ] Retry recovers from transient API errors

**Parent epic:** TRY-16
EOF
)"

create "[Feature] Auth UI — login and register pages" "Feature" 3 "$(cat <<'EOF'
## Goal
Minimal auth screens for MVP.

## Tasks
- `/login`, `/register` pages
- Form validation (email format, password length)
- Redirect to dashboard after success
- Link between login ↔ register

## Acceptance criteria
- [ ] Cannot access dashboard when logged out
- [ ] Session persists on refresh

**Parent epic:** TRY-16
EOF
)"

create "[Feature] User timezone setting" "Feature" 3 "$(cat <<'EOF'
## Goal
Accurate "today" and streak boundaries (TRY-16).

## Tasks
- Store IANA timezone on user profile (default from browser on register)
- Settings UI: dropdown of common timezones or `Intl` default
- API uses timezone for date bucketing

## Acceptance criteria
- [ ] User in `Asia/Ho_Chi_Minh` gets correct "today" at local midnight
- [ ] Changing timezone affects future check-ins (document behavior for past)

**Parent epic:** TRY-16
EOF
)"

create "[Feature] Integration tests — streak and check-in API" "Feature" 3 "$(cat <<'EOF'
## Goal
Confidence in core business logic.

## Scope
- Register → seed habits → check-in → verify streak
- Idempotent double check-in
- Missed day resets streak
- Undo today decreases/restores streak correctly

## Tooling
- Vitest or Jest + supertest against test DB

## Acceptance criteria
- [ ] Tests run in CI
- [ ] Test DB isolated (docker or sqlite prisma mode if acceptable)

**Parent epic:** TRY-16
EOF
)"

echo "=== Backlog (out of scope for MVP) ==="

create "[Backlog] Custom habits — create, edit, delete" "Feature" 4 "$(cat <<'EOF'
## Goal
Users define their own habits (TRY-16 out of scope).

## Scope
- CRUD API + UI
- Max habits limit (optional)
- Custom icon/category

**Parent epic:** TRY-16 — post-MVP
EOF
)"

create "[Backlog] Streak freeze / vacation mode" "Feature" 4 "$(cat <<'EOF'
## Goal
Allow pausing streak without reset (TRY-16 future enhancement).

## Ideas
- N freeze days per month
- Manual "vacation" date range

**Parent epic:** TRY-16 — post-MVP
EOF
)"

create "[Backlog] Reminders and push notifications" "Feature" 4 "$(cat <<'EOF'
## Goal
Nudge users before day ends (TRY-16 out of scope).

## Ideas
- Email or web push
- Per-habit reminder time
- "Don't break your streak" notification

**Parent epic:** TRY-16 — post-MVP
EOF
)"

create "[Backlog] Social features and leaderboards" "Feature" 4 "$(cat <<'EOF'
## Goal
Optional social motivation (TRY-16 out of scope).

## Ideas
- Share streak publicly
- Friends leaderboard
- Accountability partners

**Parent epic:** TRY-16 — post-MVP
EOF
)"

create "[Backlog] PWA offline sync" "Feature" 4 "$(cat <<'EOF'
## Goal
Check in without network; sync later (TRY-16 out of scope).

## Ideas
- Service worker
- IndexedDB queue for check-ins
- Conflict resolution on reconnect

**Parent epic:** TRY-16 — post-MVP
EOF
)"

create "[Backlog] Guest mode — local-only without account" "Feature" 4 "$(cat <<'EOF'
## Goal
Try app without signup (TRY-16 optional stretch).

## Ideas
- localStorage for habits/check-ins
- Prompt to create account to sync

**Parent epic:** TRY-16 — post-MVP
EOF
)"

echo "=== Done ==="
