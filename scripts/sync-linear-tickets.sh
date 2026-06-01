#!/usr/bin/env bash
# Sync Linear tickets with Personal Growth OS vision (TRY-16)
set -euo pipefail

TEAM="TRY"
PARENT="TRY-16"
DIR="$(cd "$(dirname "$0")/.." && pwd)/.linear"
DESC_DIR="$(mktemp -d)"
trap 'rm -rf "$DESC_DIR"' EXIT

create() {
  local title="$1" label="$2" priority="${3:-0}" body="$4"
  cat > "$DESC_DIR/issue.md" <<< "$body"
  local args=(issue create --team "$TEAM" --parent "$PARENT" --title "$title" --description-file "$DESC_DIR/issue.md")
  [[ -n "$label" ]] && args+=(--label "$label")
  [[ "$priority" != "0" ]] && args+=(--priority "$priority")
  linear "${args[@]}"
}

update() {
  local id="$1" title="${2:-}" body="${3:-}"
  local args=(issue update "$id")
  [[ -n "$title" ]] && args+=(--title "$title")
  if [[ -n "$body" ]]; then
    cat > "$DESC_DIR/issue.md" <<< "$body"
    args+=(--description-file "$DESC_DIR/issue.md")
  fi
  linear "${args[@]}"
}

cancel() {
  linear issue update "$1" --state Canceled
}

echo "=== Update epic + existing ==="
linear issue update TRY-16 --title "Personal Growth OS — missions, streaks, XP, English, Redis" --description-file "$DIR/TRY-16-epic.md"
linear issue update TRY-44 --description-file "$DIR/TRY-44-setup.md"
linear issue update TRY-30 --title "[MVP] Database schema — users, missions, completions, XP, kanban, English" --description-file "$DIR/TRY-30-schema.md"
linear issue update TRY-32 --title "[MVP] Global streak engine — Redis cache + timezone-aware" --description-file "$DIR/TRY-32-streak.md"

echo "=== Cancel obsolete (habits-only tickets) ==="
for id in TRY-31 TRY-33 TRY-34 TRY-35 TRY-36 TRY-37 TRY-47; do
  cancel "$id" && echo "Canceled $id"
done

echo "=== Create MVP tickets ==="

create "[MVP] Redis infrastructure — cache, sorted sets, TTL, Pub/Sub, BullMQ" "Feature" 2 "$(cat <<'EOF'
## Goal
Redis layer per TRY-16 architecture.

## Scope
- ioredis client + connection pooling
- **Cache:** dashboard stats (`cache:dashboard:{userId}`, TTL 60s)
- **Sorted sets:** weekly XP leaderboard prep (`leaderboard:weekly`)
- **TTL keys:** daily activity flags, streak-at-risk markers
- **Pub/Sub:** `channel:activity` for live completion events
- **BullMQ:** notification queue + worker stub

## Acceptance criteria
- [ ] Redis health in `/health`
- [ ] Helper module with get/set/invalidate patterns
- [ ] Documented key naming in `docs/app-flow-and-business-logic.md` §17

**Parent:** TRY-16
EOF
)"

create "[MVP] Daily missions — CRUD + complete today" "Feature" 2 "$(cat <<'EOF'
## Goal
Core loop: create daily missions and mark complete.

## Examples
- Learn 10 English words (+20 XP)
- Exercise 20 mins (+15 XP)
- Finish ticket TRY-44 (+25 XP)

## API
- `GET/POST/PATCH/DELETE /missions`
- `POST /missions/:id/complete` — idempotent per day, awards XP, updates streak

## UI
Today's Missions checklist (checkbox list):
- [ ] English
- [ ] Workout
- [ ] Coding

## Acceptance criteria
- [ ] User can add/edit/delete missions
- [ ] Complete toggles state for today only
- [ ] Completing mission triggers XP + streak update

**Parent:** TRY-16
EOF
)"

# Dashboard API ticket: use .linear/TRY-dashboard-api.md (backticks break heredocs in bash)
create "[MVP] API: GET /dashboard — missions, streak, XP, today summary" "Feature" 2 "$(cat "$DIR/TRY-dashboard-api.md")"

create "[MVP] XP and level system" "Feature" 2 "$(cat <<'EOF'
## Goal
Gamification on mission complete.

## Rules
- Each mission has xpReward (default 20)
- Daily English bonus XP
- Optional: all-missions-done bonus (+50)
- Level derived from totalXp (document formula)

## UI
- "+20 XP" toast on complete
- Level badge + progress bar on dashboard

## Storage
- PostgreSQL: user.totalXp, user.level
- Redis cache for dashboard reads

**Parent:** TRY-16
EOF
)"

create "[MVP] Visual progress — heatmap + XP bar + weekly consistency" "Feature" 2 "$(cat <<'EOF'
## Goal
User sees "I'm improving."

## Components
- **GitHub-style heatmap** — last 12 weeks, intensity by completions/day
- **XP progress bar** — level progress
- **Weekly consistency** — % days with ≥1 completion

## API
- `GET /progress/heatmap?weeks=12`
- `GET /progress/weekly`

## UI
- `/progress` page or dashboard widgets

**Parent:** TRY-16
EOF
)"

create "[MVP] Daily English challenge" "Feature" 2 "$(cat <<'EOF'
## Goal
Daily reason to return — vocabulary / mini quiz / phrase.

## MVP scope
- One challenge per day (rotate type or vocab-only)
- `GET /english/today` — content
- `POST /english/today/submit` — score + XP
- Completion counts toward daily activity (streak)

## UI
- `/english` tab with challenge + submit
- Score feedback + XP reward

**Parent:** TRY-16
EOF
)"

create "[MVP] Today's Missions dashboard UI" "Feature" 2 "$(cat <<'EOF'
## Goal
Main screen per product spec.

## Layout
- Header: Today's Missions + streak (e.g. 28-day)
- Checklist: mission rows with complete toggle
- Footer: today X/Y complete, Level N, XP progress bar

## Tasks
- Fetch `GET /dashboard` via SWR
- Mission checklist with complete toggle
- Streak + XP bar prominent
- Optimistic complete + revalidate
- Mobile-first, loading/error states

**Parent:** TRY-16
EOF
)"

create "[MVP] Seed default mission templates on signup" "Feature" 3 "$(cat <<'EOF'
## Goal
New users start with example missions.

## Defaults
- Learn 10 English words (english)
- Exercise 20 mins (fitness)
- Coding session (coding)

User can edit/delete after signup.

**Parent:** TRY-16
EOF
)"

echo "=== Create V2 tickets ==="

create "[V2] Personal Kanban board — Todo / In Progress / Done" "Feature" 3 "$(cat <<'EOF'
## Goal
Self-growth kanban (Linear/Trello style).

## Scope
- Columns: Todo, In Progress, Done
- Drag-and-drop or status buttons
- Focus: learning, habits, self-improvement tasks
- API: `/board/tasks` CRUD

**Parent:** TRY-16 — post-MVP
EOF
)"

create "[V2] Realtime motivation — live activity feed (Redis Pub/Sub)" "Feature" 3 "$(cat <<'EOF'
## Goal
Light social pressure.

## Examples
- "5 people studying right now"
- "Dung completed 12 tasks today"

## Tech
- Redis Pub/Sub on mission complete
- SSE or WebSocket to client
- `online:users` SET with TTL

**Parent:** TRY-16 — post-MVP
EOF
)"

create "[V2] Smart notifications — streak at risk, study reminders (BullMQ)" "Feature" 3 "$(cat <<'EOF'
## Goal
Retention nudges.

## Examples
- "Don't lose your 14-day streak" (evening, no activity)
- "You usually study at 8PM"

## Tech
- BullMQ scheduled + delayed jobs
- Redis queue; email or in-app for MVP of notifications

**Parent:** TRY-16 — post-MVP
EOF
)"

create "[V2] Weekly report — consistency, hours, goals" "Feature" 3 "$(cat <<'EOF'
## Goal
Weekly reflection email/screen.

## Content
- 82% consistency
- Hours by category (English, etc.)
- Goals completed
- XP earned, streak status

## API
- `GET /reports/weekly`
- Optional BullMQ job Sunday AM

**Parent:** TRY-16 — post-MVP
EOF
)"

echo "=== Create Future tickets ==="

create "[Future] AI Coach — personalized focus insights" "Feature" 4 "$(cat <<'EOF'
## Example
"You focus better in the morning."

**Parent:** TRY-16
EOF
)"

create "[Future] AI English correction" "Feature" 4 "$(cat <<'EOF'
Writing/speaking feedback powered by AI.

**Parent:** TRY-16
EOF
)"

create "[Future] Team accountability rooms" "Feature" 4 "$(cat <<'EOF'
Shared groups for mutual accountability.

**Parent:** TRY-16
EOF
)"

create "[Future] Shared study sessions" "Feature" 4 "$(cat <<'EOF'
Realtime co-studying rooms.

**Parent:** TRY-16
EOF
)"

echo "=== Update backlog tickets ==="
cancel TRY-49 && echo "Canceled TRY-49 (replaced by V2 notifications)"
cancel TRY-50 && echo "Canceled TRY-50 (replaced by V2 realtime)"

linear issue update TRY-48 --title "[Future] Streak freeze / vacation mode" --description "Pause streak without reset. Post-MVP. **Parent:** TRY-16"
linear issue update TRY-51 --title "[Future] PWA offline sync" --description "Offline check-ins + sync. Post-MVP. **Parent:** TRY-16"
linear issue update TRY-52 --title "[Future] Guest mode — local-only" --description "Try without account. Post-MVP. **Parent:** TRY-16"

linear issue update TRY-46 --title "[MVP] Integration tests — missions, streak, XP API" --description "Test: register → complete mission → streak + XP update → heatmap data. **Parent:** TRY-16"

echo "=== Done ==="
