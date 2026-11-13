import { createGame, type Game } from './engine';
import { createPower, type Power } from './power';

// Lưu trữ trên máy: bảng xếp hạng top 10 điểm cao nhất của từng màn (localStorage, giữ lâu dài) và
// ván đang chơi dở (sessionStorage, để F5 không mất ván; đóng tab thì thôi).

/** Một lần chơi trên bảng: điểm, thời gian trụ được, dạng khí cao nhất. */
export type Score = { name: string; score: number; ms: number; peak: number; at: number };
export const TOP = 10;
// Bảng cũ (khoá 'banbi.scores') xếp theo giờ phá sạch, không so được với điểm: để nguyên trên máy,
// bảng điểm dùng khoá mới.
const SCORES_KEY = 'banbi.scores.v2';
// Đổi khoá khi luật hay lưới bi đổi, để ván dở lưu theo luật cũ không bị nạp nhầm.
const RUN_KEY = 'banbi.run.v3';

function readAll(): Record<string, Score[]> {
  try {
    const raw = localStorage.getItem(SCORES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Score[]>) : {};
  } catch {
    return {};
  }
}

export const scoresOf = (level: string): Score[] => readAll()[level] ?? [];

/** Ghi một lần chơi. Trả về hạng (1..TOP) nếu lọt bảng, null nếu không. */
export function addScore(level: string, s: Score): number | null {
  const all = readAll();
  const list = [...(all[level] ?? []), s].sort((a, b) => b.score - a.score || a.at - b.at);
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

export type Run = {
  name: string;
  level: string;
  game: Game;
  power: Power;
  elapsed: number;
  score: number;
};

export const newRun = (name: string, level: string): Run => ({
  name,
  level,
  game: createGame(level),
  power: createPower(),
  elapsed: 0,
  score: 0,
});

/** Điểm một phát bắn: 10 mỗi bi nổ, 20 mỗi bi rơi theo, nhân theo cấp khí (cấp 1 ×1 … cấp 6 ×2,25). */
export const shotPoints = (popped: number, dropped: number, level: number) =>
  Math.round((popped * 10 + dropped * 20) * (1 + level * 0.25));

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
