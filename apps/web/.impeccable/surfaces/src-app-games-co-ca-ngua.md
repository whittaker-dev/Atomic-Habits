---
version: 1
slug: 'src-app-games-co-ca-ngua'
primary_target: 'src/app/games/co-ca-ngua'
related_targets: ['src/games/co-ca-ngua']
---

# Cờ cá ngựa (/games/co-ca-ngua)

Scope: the game's own screens (home, local setup, online lobby, full-screen 3D match, pass-the-phone hand-off, win). Mode: operate. Phone-first; friends at home or in an online room, evenings.
Audience/job: 2–4 players race four horses each from their stable around a cross board into their home column; roll, pick a horse, kick rivals back. House rules: leave the stable on 1 or 6; a 6 rolls again; landing on a rival kicks it home; the home column is climbed step by step.
Constraints: must look unlike Bomb Arena, Sơn Lãnh Địa and Vẽ Đoán. three.js only (no new dependency). Same PeerJS room layer as the other games; F5 keeps the match (local and online).
Unresolved: sounds (war drum), catalog card and banner, finish review.

## Direction contract

THESIS: A night battlefield of the Tây Sơn cavalry: the board is a carved stone dais under torchlight, the pieces are war horses, every roll and kick is a clash. Replaces the earlier gạch bông Tết world at the owner's request ("mạnh mẽ, chiến đấu hơn"); refuses the glossy four-primary plastic board.
OWN-WORLD: Night #0e1013, armour-plate stone #1c2025/#2a3038 with iron #4a525c seams, bone text #ece8e1, ember #ff6a1a for actions and fire; war-banner house colours red #e5383b, green #2fbf71, gold #f6b81a, blue #3a86ff. Anton uppercase display + Barlow Semi Condensed. Chamfered plates and blade-like buttons, swallowtail banners, bone die with red 1 and 4.
STORY: Players see whose turn it is, press Đổ, watch the bone die tumble into the centre of the board, and the war horse moves itself (best move: kick, else enter, else furthest); kicks throw sparks.
FIRST VIEWPORT: Full-bleed 3D on 390x844: dark flagstone field, stone dais, four braziers and waving banners at the corners; overview camera that swings round to the current player's side. Floating chamfered plates: Rời ván alone top-left, turn plate with house slash and players' progress; bottom dock with bone die face, one status line and the Đổ blade in the house colour.
FORM: Owner-pinned direction (Chiến mã Tây Sơn) from a three-option question after the Sàn gạch bông round. seed:e70ebce7531f87f5. Raises kept: die value is the only large figure; Rời ván isolated; only movable horses lift; pass-the-phone is a shield-flip hand-off.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
