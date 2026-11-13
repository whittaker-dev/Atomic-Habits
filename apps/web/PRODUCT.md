# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Atomic Habits app users**: people using the personal growth app (daily missions, streaks, XP, English challenges) who open the Games section to unwind.
- **Invited friends**: a small private group who open a shared link to play together, mostly on phones.
- Both groups land on `/games` (confirmed by the owner).

## Product Purpose

Atomic Habits is a personal growth operating system. `/games` is its games section: a library of browser games that start instantly with no install or account, with progress kept on the player's device. Success is a visitor picking a game and being in play within seconds, alone or with friends.

## Positioning

Games run entirely in the browser; multiplayer is peer-to-peer through a shareable room link, QR code or 6-character room code, with no account and no game server.

## Operating Context

- Players often arrive on a phone from a link a friend sent, then join a room.
- Deployment is private, shared with a few people (owner's statement); not a public product.

## Capabilities and Constraints

- `/games` is a library that will grow. Six games are playable: Bomb Arena (first, featured), Sơn Lãnh Địa ("Paint Turf" in English), Vẽ Đoán ("Draw & Guess"), Cờ cá ngựa ("Horse Race Ludo"), Cờ tỷ phú ("Vietnam Tycoon") and Bắn Bi Bá Khí ("Bubble Overlord").
- Bomb Arena (route `/games/bong-bong-bum`, renamed from "Bong Bóng Bùm"): 2D chibi grid-bomber party arena, up to 6 players, bots at three difficulties, two players on one device, online rooms; 72 characters (24 original 3D chibi agents in `src/games/bong-bong-bum/agents.ts` with front and back views, the rest hand-drawn PNG art or code-drawn), 13 maps, 11 power-ups.
- Sơn Lãnh Địa (route `/games/son-lanh-dia`): 3D floor-painting party game rendered with three.js; run to paint, shoot paintballs that freeze rivals, most floor after 2 minutes wins. Up to 6 players, bots at three difficulties, two players on one device, online rooms through the same PeerJS layer as Bomb Arena (`bong-bong-bum/net.ts`, game-specific messages in `son-lanh-dia/net.ts`); unlike Bomb Arena, a host reload closes the room. Its own 8-character paint squad (`src/games/son-lanh-dia/squad.ts`, art in `public/games/son-lanh-dia/characters/`, sources in `art-source/son-lanh-dia/`) and 4 arenas (`arenas.ts`); it shares the grid, controls, name and UI kit with Bomb Arena but none of its characters.
- Vẽ Đoán (route `/games/ve-doan`): online-only draw-and-guess party game, 2–8 players each on their own phone. One player picks one of three secret Vietnamese words and draws it with a finger; everyone else types guesses (accents optional), faster correct guesses score more and the drawer scores by how many guessed. Word packs in `src/games/ve-doan/words.ts`. The host runs the game (`engine.ts`) and sends each player only what they may see (`net.ts`, so unsolved guessers never receive the answer); strokes travel as small drawing operations (`ink.ts`). Same PeerJS layer as the other games, own message prefix; F5 keeps the room (host reclaims the same code and game, guests rejoin their seat). Its own visual world (fair-night lô tô stage: Lalezar + Be Vietnam Pro, night tarp, red cloth, bulb timer) shares no UI kit with the other two games. Banner rendered from `art-source/ve-doan/banner.html`.
- Cờ cá ngựa (route `/games/co-ca-ngua`): 3D Vietnamese Ludo for 2–4 houses, rendered with three.js. Players press Đổ, a bone die rolls into the centre of the board and the horse moves by itself (best move: kick, else leave the stable, else the furthest horse); house rules (leave on 1 or 6, a 6 rolls again, kicking, exact steps home) are toggles. Modes: pass-and-play on one phone, against bots, and online rooms through the same PeerJS layer (own prefix; the host owns the game and rolls for everyone). F5 keeps the match in every mode. Pure rules in `board.ts`, `rules.ts`, `engine.ts`; the 3D scene in `view3d.ts`; sounds synthesised in `audio.ts`. Its own visual world (Tây Sơn night battlefield: Anton + Barlow Semi Condensed, stone, iron, ember, four war-banner colours, chamfered plates) shares no UI kit with the other games. Banner rendered from `art-source/co-ca-ngua/banner.html`.
- Cờ tỷ phú (route `/games/co-ty-phu`): 3D property-trading board game for 2–6 players on a 40-square board of Vietnamese places (Hà Giang to Phú Quốc, eight regional groups, four railway stations, two utilities, Lì xì and Vận may cards with original text). Each player picks one of the game's own ten 3D chibi characters as their token (built in code in `figures.ts`; no art borrowed from other games). Buy, auction, build evenly (one building per lot that grows from thatched hut to hotel), mortgage, trade deeds and cash with other players, jail and debt handling with automatic bankruptcy. The lobby picks how the match ends: a set number of rounds, a time limit, or until one player is left (richest by net worth wins the first two). Modes: pass-and-play, against bots, and online rooms through the same PeerJS layer (own prefix; the host owns the game and rolls for everyone, bots stand in for dropped players). F5 keeps the match in every mode. Pure rules in `data.ts`, `engine.ts`, `bot.ts` with tests; the 3D scene in `view3d.ts`; sounds synthesised in `audio.ts`. Its own visual world (lacquer box: Noto Serif Display + Montserrat, lacquer black, cinnabar, gold leaf, eggshell) shares no UI kit with the other games; no Monopoly names, cards or branding. Banner rendered from `art-source/co-ty-phu/banner.html`.
- Bắn Bi Bá Khí (route `/games/ban-bi`): solo survival bubble shooter for a high score. A hex grid of six-colour bubbles, ten to a row, shuffled fresh every game; aim (mouse, drag, or arrow keys), bounce off the walls, three or more of a colour burst and anything left hanging falls. The whole mass slides down continuously (paused while a shot is in flight) with the next row easing in from the top edge, starting at 5/4/3 seconds a row on Dễ/Vừa/Khó and doubling in speed every two minutes down to about a second; a bubble crossing the line ends the game, and clearing the board just lets new rows keep coming. Bursts score 10 a bubble and drops 20, multiplied by the fighter's form (×1 to ×2.25); the top 10 scores per difficulty are kept on the device. A Cẩm nang screen (button under Vào trận) explains the rules and shows the fighter live in each of the six forms with a replayable power-up. Beside the board an original 3D fighter (a full-body model the owner made in Tripo, with the earlier code-built fighter as a fallback; not modelled on any existing character) charges up through six forms as bubbles burst quickly; energy drains over time, so speed matters. Pure rules in `engine.ts` and `power.ts` with tests; board drawn in 2D canvas (`board.ts`); fighter, aura shader, smoke, lightning and bloom in `fighter.ts`; sounds synthesised in `audio.ts`. F5 keeps the run. Its own visual world (dusk arena: Chakra Petch + Saira, ink-violet night, cyan ki, rage pink) shares no UI kit with the other games. Banner rendered from `art-source/ban-bi/banner.html`.
- Copy is bilingual through the app's i18n (`games.*` keys in `src/i18n/locales/{vi,en}.json`); Vietnamese is the primary audience.
- Character art lives at `/games/bong-bong-bum/characters/<id>.png` (512px copies in `characters/hd/`); game banner at `/games/bong-bong-bum/banner.jpg` (original in `art-source/banner/`).

## Brand Commitments

- `/games` carries the games' own playful identity rather than the Atomic Habits app chrome, keeping only a way back to the app (owner's decision).
- Only original characters and art; no third-party franchise characters (owner and project policy).
- `/games` follows the familiar game-storefront layout (featured game up top, a library of game cards below), executed at the craft level of Nintendo eShop: bright, clean, character art leading, large clear type (owner's choice). Craft bar only; no Nintendo branding or assets.

## Evidence on Hand

- Character art: `public/games/bong-bong-bum/characters/` (ids listed in `src/games/bong-bong-bum/art.ts`).
- No player counts, reviews or testimonials exist; do not invent any.

## Product Principles

1. Play first: the path from landing to playing is one tap.
2. Built for a library: every layout must hold one game today and many tomorrow.
3. Phone-first: friends arrive on phones; touch and small screens are the default case.
4. Honest status: only show what exists (playable games, real features), never placeholder claims.
