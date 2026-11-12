'use client';

import { useEffect, useState } from 'react';
import { botAction } from './bot';
import {
  act,
  actor,
  checkTime,
  createGame,
  seatOf,
  type Action,
  type Ctx,
  type Game,
} from './engine';
import { GameScreen } from './game';
import { WinScreen } from './screens';

// Ván chơi trên một máy (chung máy, hoặc với máy): màn hình giữ ván, máy tự quyết lượt của mình, và
// ván được lưu sau mỗi nước để F5 không mất ván. Nhịp chờ của máy (botDelay) và bước tự động
// (autoStep) dùng chung với chủ phòng online.

const SAVE_KEY = 'cotyphu.local';
export type LocalSave = { game: Game; passAndPlay: boolean };

export function loadLocal(): LocalSave | null {
  try {
    const raw = sessionStorage.getItem(SAVE_KEY);
    return raw ? (JSON.parse(raw) as LocalSave) : null;
  } catch {
    return null;
  }
}

export function saveLocal(save: LocalSave | null) {
  try {
    if (save) sessionStorage.setItem(SAVE_KEY, JSON.stringify(save));
    else sessionStorage.removeItem(SAVE_KEY);
  } catch {
    // Không lưu được (chế độ riêng tư, bộ nhớ đầy) thì F5 mất ván — vẫn chơi bình thường.
  }
}

export const cloneGame = (g: Game): Game => JSON.parse(JSON.stringify(g)) as Game;
const randomDie = () => 1 + Math.floor(Math.random() * 6);
export const ctx = (): Ctx => ({ die: randomDie, now: Date.now() });
export const newSeed = () => Math.floor(Math.random() * 2 ** 31);

/** Ván mới với cùng ghế và cách tính thắng (đánh tiếp, hoặc mở ván từ màn chuẩn bị). */
export const newGame = (seats: Game['seats'], settings: Game['settings']) =>
  createGame(
    seats.map((s) => ({ ...s, connected: true })),
    settings,
    Date.now(),
    newSeed(),
  );

/**
 * Máy (hoặc người đang rớt mạng) chờ bao lâu trước khi quyết tiếp: đủ để mọi màn hình diễn xong
 * nước vừa rồi — xúc xắc lăn, quân đi từng ô, thẻ lật.
 */
export function botDelay(g: Game): number {
  return g.events.reduce((ms, e) => {
    if (e.k === 'roll') return ms + 1500;
    if (e.k === 'move') return ms + 300 + e.path.length * 170;
    if (e.k === 'jail') return ms + 900;
    if (e.k === 'card') return ms + 2400;
    return ms + 280;
  }, 700);
}

/** Người phải quyết định lúc này là máy, hoặc là người đang rớt mạng (máy quyết thay). */
export function autoPending(g: Game): boolean {
  if (g.pending.kind === 'over') return false;
  const id = actor(g);
  if (id === null) return false;
  const s = seatOf(g, id);
  return s.kind === 'bot' || !s.connected;
}

export function autoStep(g: Game): boolean {
  const m = botAction(g);
  return !!m && act(g, m.id, m.action, ctx());
}

/** Hết giờ (chế độ có giờ) thì chốt ván; chỉ chép ván khi thực sự đã tới giờ. */
export const timeUp = (g: Game) =>
  g.endsAt !== null && g.pending.kind !== 'over' && Date.now() >= g.endsAt;

export function LocalMatch({ save, onLeave }: { save: LocalSave; onLeave: () => void }) {
  const [game, setGame] = useState<Game>(save.game);
  const [over, setOver] = useState(false);
  const passAndPlay = save.passAndPlay;
  const humans = game.seats.filter((s) => s.kind === 'human').map((s) => s.id);

  const apply = (fn: (g: Game) => boolean) =>
    setGame((g) => {
      const next = cloneGame(g);
      return fn(next) ? next : g;
    });

  useEffect(() => saveLocal({ game, passAndPlay }), [game, passAndPlay]);

  // Máy tự quyết lượt của mình — đợi màn diễn xong nước trước.
  useEffect(() => {
    if (!autoPending(game)) return;
    const t = setTimeout(() => apply(autoStep), botDelay(game));
    return () => clearTimeout(t);
  }, [game]);

  useEffect(() => {
    if (game.endsAt === null) return;
    const t = setInterval(() => {
      setGame((g) => {
        if (!timeUp(g)) return g;
        const next = cloneGame(g);
        return checkTime(next, Date.now()) ? next : g;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [game.endsAt]);

  if (over)
    return (
      <WinScreen
        game={game}
        onAgain={() => {
          setOver(false);
          setGame(newGame(game.seats, game.settings));
        }}
        onHome={() => {
          saveLocal(null);
          onLeave();
        }}
      />
    );

  return (
    <GameScreen
      game={game}
      controls={humans}
      passAndPlay={passAndPlay}
      modeLabel={passAndPlay ? 'Chung máy' : 'Với máy'}
      onAct={(id: number, a: Action) => apply((g) => act(g, id, a, ctx()))}
      onLeave={() => {
        saveLocal(null);
        onLeave();
      }}
      onFinished={() => setOver(true)}
    />
  );
}
