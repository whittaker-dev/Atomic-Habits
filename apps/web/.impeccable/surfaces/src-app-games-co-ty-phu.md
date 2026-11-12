---
version: 1
slug: 'src-app-games-co-ty-phu'
primary_target: 'src/app/games/co-ty-phu'
related_targets: ['src/games/co-ty-phu']
---

# Cờ tỷ phú (/games/co-ty-phu)

Scope: the game's own screens (home, local setup, online lobby, full-screen 3D match with buy, auction, assets and trade sheets, pass-the-phone hand-off, final standings). Mode: operate. Phone-first; friends at home or in an online room, evenings.
Audience/job: 2–6 players move around a board of Vietnamese places, buy land, build houses, collect rent, auction, mortgage and trade, until the chosen end condition (rounds, time, last player standing).
Constraints: must look unlike Bomb Arena, Sơn Lãnh Địa, Vẽ Đoán and Cờ cá ngựa. three.js only (no new dependency). Same PeerJS room layer as the other games; F5 keeps the match (local and online). No Monopoly names, cards or branding.

## Direction contract

THESIS: A lacquer box (sơn mài vàng son): black lacquer, cinnabar, gold leaf and eggshell inlay; the board is a lacquered lid with a red sun over gold hills at its centre. Refuses the bright plastic property-game look.
OWN-WORLD: Lacquer #120b09/#1f1310, cinnabar #a3201a, gold #d4a73a/#f0cf72, eggshell #efe6d2, ash #a8998a. Noto Serif Display + Montserrat. Rounded lacquer panels with a gold inset line, cinnabar buttons with gold text, eggshell deed cards with a region band, gold rule with a cinnabar diamond.
STORY: The player presses Đổ xúc xắc, two ivory dice tumble to the centre, the token walks, and a deed card offers Mua or Đem đấu giá; between rolls Tài sản and Đổi đất open sheets.
FIRST VIEWPORT: Full-bleed 3D on 390x844: lacquer board on a wooden table, fixed view from the bottom side. Rời ván alone top-left, round or timer and mute top-right, player cash strip below; bottom dock with die faces, one status line and the turn's actions.
FORM: Owner-pinned direction (Sơn mài vàng son) from a three-option question.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
