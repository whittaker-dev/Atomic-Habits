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

- `/games` is a library that will grow. Two games are playable: Bomb Arena (first, featured) and Sơn Lãnh Địa ("Paint Turf" in English).
- Bomb Arena (route `/games/bong-bong-bum`, renamed from "Bong Bóng Bùm"): 2D chibi grid-bomber party arena, up to 6 players, bots at three difficulties, two players on one device, online rooms; 72 characters (24 original 3D chibi agents in `src/games/bong-bong-bum/agents.ts` with front and back views, the rest hand-drawn PNG art or code-drawn), 13 maps, 11 power-ups.
- Sơn Lãnh Địa (route `/games/son-lanh-dia`): 3D floor-painting party game rendered with three.js; run to paint, shoot paintballs that freeze rivals, most floor after 2 minutes wins. Up to 6 players, bots at three difficulties, two players on one device, online rooms through the same PeerJS layer as Bomb Arena (`bong-bong-bum/net.ts`, game-specific messages in `son-lanh-dia/net.ts`); unlike Bomb Arena, a host reload closes the room. Its own 8-character paint squad (`src/games/son-lanh-dia/squad.ts`, art in `public/games/son-lanh-dia/characters/`, sources in `art-source/son-lanh-dia/`) and 4 arenas (`arenas.ts`); it shares the grid, controls, name and UI kit with Bomb Arena but none of its characters.
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
