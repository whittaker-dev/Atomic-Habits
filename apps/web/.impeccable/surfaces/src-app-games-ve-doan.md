---
version: 1
slug: 'src-app-games-ve-doan'
primary_target: 'src/app/games/ve-doan'
related_targets: ['src/games/ve-doan']
---

# Vẽ Đoán (/games/ve-doan)

Scope: the game's own screens (lobby, drawer, guesser, reveal, final scoreboard). Mode: operate. Phone-first; friends in one room or on a call, evenings, indoors.
Audience/job: Vietnamese friends; drawer draws a secret word with a finger, others type guesses, faster correct guess scores more.
Constraints: must look unlike Bomb Arena and Sơn Lãnh Địa (no Baloo 2 / Nunito, no cream-card ink-border kit). First delivery is a UI preview with labelled demo data; game logic and online rooms come after approval.
Unresolved: real word list, scoring numbers, online protocol.

## Direction contract

THESIS: The drawer is the lô tô caller on a fair-night stage and the room reads their ticket; refuses the category default of a white board, colour-dot row and grey chat list.
OWN-WORLD: Night tarp #1b1440 ground, fair-cloth red #d7263d for the stage frame and action bar, marigold #ffc93c for actions and near-misses, leaf green #1f9e5a for correct, warm bulb #fff3c4 for light and text; printed paper ticket #fff8e6 squares with thin printed rules. Lalezar (sign-painted display) + Be Vietnam Pro.
STORY: Players see at once who is drawing, how long is left, how many letters, and who already got it; they type a guess and see it land as a ticket strip.
FIRST VIEWPORT: Guesser on 390x844: one status band (round, single message, room code), bulb-string timer, red-framed board (~60% width height), ticket row of letter squares, player chips, last four guesses, fixed input bar at the bottom.
FORM: Candidate 4 of 7 (Hội Chợ Lô Tô). seed:55b5da34fc98f254. Raises: time is length (one bulb per second); one status message at a time; each guess state changes one variable (near = marigold, correct = green stamp).
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
