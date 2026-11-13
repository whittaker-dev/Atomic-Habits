import { createGame, type Game } from './engine';
import { createPower, type Power } from './power';

// Lưu trữ trên máy: bảng xếp hạng top 10 thời gian phá sạch bi của từng màn (localStorage, giữ lâu
// dài) và ván đang chơi dở (sessionStorage, để F5 không mất ván; đóng tab thì thôi).

export type Score = { name: string; ms: number; peak: number; at: number };
export const TOP = 10;
const SCORES_KEY = 'banbi.scores';
// Đổi khoá khi luật hay lưới bi đổi, để ván dở lưu theo luật cũ không bị nạp nhầm.
const RUN_KEY = 'banbi.run.v2';

function readAll(): Record<string, Score[]> {
  try {
    const raw = localStorage.getItem(SCORES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Score[]>) : {};
  } catch {
    return {};
  }
}

export const scoresOf = (level: string): Score[] => readAll()[level] ?? [];

/** Ghi một lần phá sạch bi. Trả về hạng (1..TOP) nếu lọt bảng, null nếu không. */
export function addScore(level: string, s: Score): number | null {
  const all = readAll();
  const list = [...(all[level] ?? []), s].sort((a, b) => a.ms - b.ms || a.at - b.at);
  const rank = list.indexOf(s) + 1;
  all[level] = list.slice(0, TOP);
  try {
    localStorage.setItem(SCORES_KEY, JSON.stringify(all));
  } catch {
    // Không lưu được (chế độ riêng tư) thì bảng chỉ sống tới khi tải lại trang.
  }
  return rank <= TOP ? rank : null;
}

/** Thời gian dạng 1:23.45. */
export function formatMs(ms: number) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  return `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

export type Run = { name: string; level: string; game: Game; power: Power; elapsed: number };

export const newRun = (name: string, level: string): Run => ({
  name,
  level,
  game: createGame(level),
  power: createPower(),
  elapsed: 0,
});

export function loadRun(): Run | null {
  try {
    const raw = sessionStorage.getItem(RUN_KEY);
    return raw ? (JSON.parse(raw) as Run) : null;
  } catch {
    return null;
  }
}

export function saveRun(run: Run | null) {
  try {
    if (run) sessionStorage.setItem(RUN_KEY, JSON.stringify(run));
    else sessionStorage.removeItem(RUN_KEY);
  } catch {
    // Không lưu được thì F5 mất ván — vẫn chơi bình thường.
  }
}
