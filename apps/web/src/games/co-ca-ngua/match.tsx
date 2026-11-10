'use client';

import { useEffect, useState } from 'react';
import type { House } from './board';
import { botChoice, botTurn, createGame, pickHorse, rollDie, type Game } from './engine';
import { GameScreen, WinScreen } from './screens';

// Ván chơi trên một máy (chung máy, hoặc với máy): màn hình giữ ván, máy tự đổ và tự đi, và ván
// được lưu sau mỗi nước để F5 không mất ván. Đồng hồ chờ của máy (botDelay) dùng chung với chủ
// phòng online.

const SAVE_KEY = 'cocangua.local';
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
    // Không lưu được (chế độ riêng tư, bộ nhớ đầy) thì F5 mất ván như trước — vẫn chơi bình thường.
  }
}

export const cloneGame = (g: Game): Game => JSON.parse(JSON.stringify(g)) as Game;
export const randomDie = () => 1 + Math.floor(Math.random() * 6);

/**
 * Máy (hoặc người đang rớt mạng) chờ bao lâu trước khi đi tiếp: đủ để mọi màn hình diễn xong nước
 * vừa rồi — xúc xắc lăn, ngựa phi từng ô, camera cưỡi theo, tóe lửa khi đá.
 */
export function botDelay(g: Game): number {
  const e = g.event;
  if (e.kind === 'roll') return e.passed ? 2600 : 1900;
  if (e.kind === 'move') {
    const steps = e.from < 0 ? 1 : e.move.to - e.from;
    return 1300 + steps * 210 + (e.kicked ? 1100 : 0);
  }
  return 1400;
}

/**
 * Còn việc máy tự làm không: vừa đổ xong thì chiến mã tự đi nước tốt nhất (người hay máy cũng vậy,
 * không ai phải chọn), còn tới lượt ghế máy (hoặc người đang rớt mạng) thì máy tự đổ.
 */
export function autoPending(g: Game): boolean {
  if (g.winner !== null) return false;
  return g.roll !== null ? g.moves.length > 0 : botTurn(g);
}

/** Một bước tự động: chưa đổ thì đổ (ghế máy), đổ rồi thì cho chiến mã đi nước tốt nhất. */
export function autoStep(g: Game): boolean {
  if (g.roll === null) return rollDie(g, g.turn, randomDie());
  const m = botChoice(g);
  return !!m && pickHorse(g, g.turn, m.slot);
}

export function LocalMatch({ save, onLeave }: { save: LocalSave; onLeave: () => void }) {
  const [game, setGame] = useState<Game>(save.game);
  const [over, setOver] = useState(false);
  const passAndPlay = save.passAndPlay;
  const humans = game.seats.filter((s) => s.kind === 'human').map((s) => s.house);

  const apply = (fn: (g: Game) => boolean) =>
    setGame((g) => {
      const next = cloneGame(g);
      return fn(next) ? next : g;
    });

  useEffect(() => saveLocal({ game, passAndPlay }), [game, passAndPlay]);

  // Chiến mã tự đi sau khi đổ, máy tự đổ lượt của mình — đợi màn diễn xong nước trước.
  useEffect(() => {
    if (!autoPending(game)) return;
    const t = setTimeout(() => apply(autoStep), botDelay(game));
    return () => clearTimeout(t);
  }, [game]);

  if (over)
    return (
      <WinScreen
        game={game}
        onAgain={() => {
          setOver(false);
          setGame(createGame(game.seats, game.rules));
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
      controls={humans as House[]}
      passAndPlay={passAndPlay}
      modeLabel={passAndPlay ? 'Chung máy' : 'Với máy'}
      onRoll={() => apply((g) => rollDie(g, g.turn, randomDie()))}
      onLeave={() => {
        saveLocal(null);
        onLeave();
      }}
      onFinished={() => setOver(true)}
    />
  );
}
