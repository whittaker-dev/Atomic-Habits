import { judgeGuess, type Verdict } from './guess';
import { wordsOf, type PackId } from './words';

// Luật Vẽ Đoán, thuần dữ liệu: chủ phòng giữ một Game và gọi các hàm dưới đây; mạng và giao diện
// chỉ đọc kết quả. Thời gian luôn truyền vào (`now`, mili giây) chứ không đọc đồng hồ, để test được
// và để mọi quyết định giờ giấc nằm ở một máy duy nhất (chủ phòng).

export const PICK_TIME = 12_000;
export const REVEAL_TIME = 7_000;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;
/** Điểm người đoán: đoán ngay được tối đa, sát giờ vẫn được sàn. */
const GUESS_MAX = 200;
const GUESS_MIN = 50;
/** Điểm người vẽ khi cả phòng đoán ra; ít người đoán ra thì chia theo tỉ lệ. */
const DRAWER_MAX = 200;

/** Điểm một người đoán ra khi lượt vẽ dài `totalMs` còn `leftMs`; cẩm nang tính ví dụ bằng chính hàm này. */
export const guessPoints = (leftMs: number, totalMs: number) =>
  Math.round(GUESS_MIN + ((GUESS_MAX - GUESS_MIN) * leftMs) / totalMs);

/** Điểm người vẽ khi `solved` trong số `guessers` người đoán ra. */
export const drawerPoints = (solved: number, guessers: number) =>
  guessers === 0 ? 0 : Math.round((DRAWER_MAX * solved) / guessers);

export type Settings = { turns: number; drawTime: number; pack: PackId };
export type Seat = { name: string; score: number; connected: boolean };
export type GuessItem = { by: number; text: string; verdict: Verdict; points?: number };
export type RoundResult = { id: number; points: number; why: string };
export type Solve = { id: number; at: number; points: number };

export type Phase =
  | { kind: 'pick'; drawer: number; choices: string[]; endsAt: number }
  | {
      kind: 'draw';
      drawer: number;
      word: string;
      startedAt: number;
      endsAt: number;
      /** Vị trí chữ cái (không tính dấu cách) đã lật làm gợi ý. */
      hints: number[];
      solved: Solve[];
      /** Câu gần đúng gần nhất của từng người — để ghi lý do ở màn đáp án. */
      near: Record<number, string>;
    }
  | { kind: 'reveal'; drawer: number; word: string; results: RoundResult[]; endsAt: number }
  | { kind: 'final' };

export type Game = {
  settings: Settings;
  seats: Seat[];
  /** Lượt đang chơi, đếm từ 1. */
  turn: number;
  phase: Phase;
  /** Câu đoán của lượt hiện tại. */
  feed: GuessItem[];
  used: string[];
  rng: number;
};

// ---------------------------------------------------------------------------

/** mulberry32: ngẫu nhiên có hạt giống, trạng thái nằm trong Game để test lặp lại được. */
function random(g: Game): number {
  let t = (g.rng = (g.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const letters = (word: string) => word.replace(/\s/g, '').length;

/** Chữ hiện cho người đoán: chữ chưa lật thành "_", giữ dấu cách giữa các tiếng. */
export function maskWord(word: string, hints: number[]): string {
  let i = 0;
  return [...word]
    .map((ch) => {
      if (ch === ' ') return ' ';
      return hints.includes(i++) ? ch : '_';
    })
    .join('');
}

const connected = (g: Game) => g.seats.map((s, i) => (s.connected ? i : -1)).filter((i) => i >= 0);

function chooseWords(g: Game): string[] {
  let pool = wordsOf(g.settings.pack).filter((w) => !g.used.includes(w));
  if (pool.length < 3) {
    g.used = [];
    pool = wordsOf(g.settings.pack);
  }
  const out: string[] = [];
  while (out.length < 3) {
    const w = pool[Math.floor(random(g) * pool.length)]!;
    if (!out.includes(w)) out.push(w);
  }
  return out;
}

/** Người vẽ kế tiếp: đi vòng theo thứ tự ghế, bỏ qua người đã rời. */
function nextDrawer(g: Game, after: number): number {
  for (let k = 1; k <= g.seats.length; k++) {
    const i = (after + k) % g.seats.length;
    if (g.seats[i]!.connected) return i;
  }
  return after;
}

function startTurn(g: Game, drawer: number, now: number) {
  g.feed = [];
  g.phase = { kind: 'pick', drawer, choices: chooseWords(g), endsAt: now + PICK_TIME };
}

export function createGame(settings: Settings, names: string[], now: number, seed: number): Game {
  const g: Game = {
    settings,
    seats: names.map((name) => ({ name, score: 0, connected: true })),
    turn: 1,
    phase: { kind: 'final' },
    feed: [],
    used: [],
    rng: seed | 0,
  };
  startTurn(g, Math.floor(random(g) * names.length), now);
  return g;
}

export function pickWord(g: Game, by: number, index: number, now: number): boolean {
  const p = g.phase;
  if (p.kind !== 'pick' || p.drawer !== by) return false;
  const word = p.choices[index];
  if (!word) return false;
  g.used.push(word);
  g.phase = {
    kind: 'draw',
    drawer: by,
    word,
    startedAt: now,
    endsAt: now + g.settings.drawTime * 1000,
    hints: [],
    solved: [],
    near: {},
  };
  return true;
}

function guessersLeft(g: Game): number[] {
  const p = g.phase;
  if (p.kind !== 'draw') return [];
  return connected(g).filter((i) => i !== p.drawer && !p.solved.some((s) => s.id === i));
}

/**
 * Một câu đoán. Trả về dòng mới của bảng câu đoán, hoặc null khi người này không được đoán lúc này
 * (không phải lượt vẽ, là người vẽ, đã đoán ra rồi, hoặc gõ trống).
 */
export function submitGuess(g: Game, by: number, raw: string, now: number): GuessItem | null {
  const p = g.phase;
  const text = raw.normalize('NFC').replace(/\s+/g, ' ').trim().slice(0, 40);
  if (p.kind !== 'draw' || by === p.drawer || !text || !g.seats[by]?.connected) return null;
  if (p.solved.some((s) => s.id === by)) return null;
  const verdict = judgeGuess(text, p.word);
  const item: GuessItem = { by, text, verdict };
  if (verdict === 'correct') {
    const points = guessPoints(Math.max(0, p.endsAt - now), p.endsAt - p.startedAt);
    p.solved.push({ id: by, at: now, points });
    g.seats[by]!.score += points;
    item.points = points;
  } else if (verdict === 'near') {
    p.near[by] = text;
  }
  g.feed.push(item);
  if (guessersLeft(g).length === 0) endTurn(g, now);
  return item;
}

/** Người vẽ bấm "Vẽ xong": kết thúc lượt ngay, ai chưa đoán ra thì 0 điểm như lúc hết giờ. */
export function finishDrawing(g: Game, by: number, now: number): boolean {
  const p = g.phase;
  if (p.kind !== 'draw' || p.drawer !== by) return false;
  endTurn(g, now);
  return true;
}

function endTurn(g: Game, now: number, drawerLeft = false) {
  const p = g.phase;
  if (p.kind === 'pick') {
    // Người vẽ rời phòng lúc còn chọn từ: bỏ lượt, chưa ai có điểm.
    g.phase = {
      kind: 'reveal',
      drawer: p.drawer,
      word: '',
      results: [],
      endsAt: now + REVEAL_TIME,
    };
    return;
  }
  if (p.kind !== 'draw') return;
  const guessers = g.seats
    .map((_, i) => i)
    .filter((i) => i !== p.drawer && (g.seats[i]!.connected || p.solved.some((s) => s.id === i)));
  const results: RoundResult[] = guessers.map((id) => {
    const solve = p.solved.find((s) => s.id === id);
    if (solve)
      return {
        id,
        points: solve.points,
        why: `Đoán ra sau ${Math.max(1, Math.round((solve.at - p.startedAt) / 1000))} giây`,
      };
    const near = p.near[id];
    const why = !g.seats[id]!.connected
      ? 'Đã rời phòng'
      : near
        ? `Gần đúng: “${near}”`
        : 'Chưa đoán ra';
    return { id, points: 0, why };
  });
  const drawerScore = drawerLeft ? 0 : drawerPoints(p.solved.length, guessers.length);
  g.seats[p.drawer]!.score += drawerScore;
  results.push({
    id: p.drawer,
    points: drawerScore,
    why: drawerLeft
      ? 'Đã rời phòng'
      : `Người vẽ: ${p.solved.length}/${guessers.length} người đoán ra`,
  });
  results.sort((a, b) => b.points - a.points);
  g.phase = { kind: 'reveal', drawer: p.drawer, word: p.word, results, endsAt: now + REVEAL_TIME };
}

/** Lật thêm một chữ ở 50% và 75% thời gian (từ ngắn lật ít hơn để còn gì mà đoán). */
function hintsDue(word: string, elapsed: number): number {
  const n = letters(word);
  let due = 0;
  if (elapsed >= 0.5 && n >= 4) due++;
  if (elapsed >= 0.75 && n >= 7) due++;
  return due;
}

/** Nhịp của chủ phòng: hết giờ chọn từ, lật gợi ý, hết giờ vẽ, chuyển lượt. Trả về true nếu có gì đổi. */
export function tick(g: Game, now: number): boolean {
  const p = g.phase;
  if (p.kind === 'pick') {
    if (now < p.endsAt) return false;
    return pickWord(g, p.drawer, 0, now);
  }
  if (p.kind === 'draw') {
    if (now >= p.endsAt) {
      endTurn(g, now);
      return true;
    }
    const due = hintsDue(p.word, (now - p.startedAt) / (p.endsAt - p.startedAt));
    if (p.hints.length >= due) return false;
    const n = letters(p.word);
    const free = Array.from({ length: n }, (_, i) => i).filter((i) => !p.hints.includes(i));
    p.hints.push(free[Math.floor(random(g) * free.length)]!);
    return true;
  }
  if (p.kind === 'reveal') {
    if (now < p.endsAt) return false;
    if (g.turn >= g.settings.turns || connected(g).length < MIN_PLAYERS) {
      g.phase = { kind: 'final' };
      return true;
    }
    g.turn++;
    startTurn(g, nextDrawer(g, p.drawer), now);
    return true;
  }
  return false;
}

/** Một người rời hoặc vào lại giữa ván. */
export function setConnected(g: Game, id: number, on: boolean, now: number): void {
  const seat = g.seats[id];
  if (!seat || seat.connected === on) return;
  seat.connected = on;
  if (on) return;
  const p = g.phase;
  if ((p.kind === 'pick' || p.kind === 'draw') && p.drawer === id) endTurn(g, now, true);
  else if (p.kind === 'draw' && guessersLeft(g).length === 0) endTurn(g, now);
}

export type Standing = { id: number; name: string; score: number };

export function standings(g: Game): Standing[] {
  return g.seats
    .map((s, id) => ({ id, name: s.name, score: s.score }))
    .sort((a, b) => b.score - a.score || a.id - b.id);
}
