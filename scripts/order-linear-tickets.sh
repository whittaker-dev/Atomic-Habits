#!/usr/bin/env bash
# Set implementation order: priority + estimate (step) + blocked-by relations
set -euo pipefail

set_order() {
  local id="$1" priority="$2" step="$3"
  linear issue update "$id" --priority "$priority" --estimate "$step"
  echo "✓ $id → priority=$priority step=$step"
}

block() {
  local issue="$1" blocker="$2"
  linear issue relation add "$issue" blocked-by "$blocker" 2>/dev/null || true
  echo "  $issue blocked-by $blocker"
}

echo "=== Phase 1: Foundation (P1) ==="
set_order TRY-44 1 1
set_order TRY-30 1 2
set_order TRY-53 1 3

block TRY-30 TRY-44
block TRY-53 TRY-44

echo "=== Phase 2: Core backend (P2) ==="
set_order TRY-45 2 4
set_order TRY-59 2 5
set_order TRY-54 2 6
set_order TRY-32 2 7
set_order TRY-55 2 8
set_order TRY-68 2 9

block TRY-45 TRY-30
block TRY-59 TRY-30
block TRY-54 TRY-30
block TRY-54 TRY-53
block TRY-32 TRY-54
block TRY-55 TRY-54
block TRY-68 TRY-32
block TRY-68 TRY-55
block TRY-68 TRY-54

echo "=== Phase 3: Frontend + MVP features (P2) ==="
set_order TRY-43 2 10
set_order TRY-58 2 11
set_order TRY-56 3 12
set_order TRY-57 3 13

block TRY-43 TRY-44
block TRY-58 TRY-68
block TRY-58 TRY-43
block TRY-56 TRY-68
block TRY-57 TRY-30
block TRY-57 TRY-55

echo "=== Phase 4: Polish (P3) ==="
set_order TRY-38 3 14
set_order TRY-39 3 15
set_order TRY-40 3 16
set_order TRY-41 3 17
set_order TRY-42 3 18
set_order TRY-46 3 19

block TRY-38 TRY-58
block TRY-39 TRY-58
block TRY-40 TRY-38
block TRY-40 TRY-39
block TRY-41 TRY-58
block TRY-42 TRY-58
block TRY-46 TRY-58
block TRY-46 TRY-57

echo "=== Phase 5: V2 (P4) ==="
set_order TRY-60 4 20
set_order TRY-61 4 21
set_order TRY-62 4 22
set_order TRY-63 4 23

block TRY-60 TRY-46
block TRY-61 TRY-46
block TRY-61 TRY-53
block TRY-62 TRY-46
block TRY-62 TRY-53
block TRY-63 TRY-46

echo "=== Phase 6: Future (P4, no step) ==="
for id in TRY-48 TRY-51 TRY-52 TRY-64 TRY-65 TRY-66 TRY-67; do
  linear issue update "$id" --priority 4
  echo "✓ $id → priority=4 (future)"
done

echo "=== Update epic with order doc ==="
linear issue update TRY-16 --description-file "$(cd "$(dirname "$0")/.." && pwd)/.linear/TRY-16-epic.md"

echo "=== Done ==="
