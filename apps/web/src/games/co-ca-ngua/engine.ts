import { HORSES, type House } from './board';
import { finished, kickedBy, legalMoves, type Horses, type Move, type Rules } from './rules';

// Ván Cờ cá ngựa, thuần dữ liệu và không phụ thuộc thời gian: ai đang đi, vừa đổ mấy, đi được những
// nước nào, ai thắng. Chơi trên một máy thì màn hình gọi thẳng các hàm này; chơi online thì chỉ chủ
// phòng gọi (kể cả đổ xúc xắc, để không ai gian được) rồi gửi cả ván cho mọi người.
// Mỗi thay đổi tăng `seq` và ghi `event` — máy nhận dựa vào đó để diễn hoạt cảnh (lăn xúc xắc,
// ngựa phi, đá ngựa) trước khi hiện thế cờ mới.

export type SeatKind = 'human' | 'bot' | 'empty';
export type Seat = { house: House; name: string; kind: SeatKind; connected: boolean };

export type GameEvent =
  | { kind: 'start' }
  /** passed: không con nào đi được, lượt đã chuyển cho người kế tiếp. */
  | { kind: 'roll'; house: House; value: number; passed: boolean }
  /** again: đổ 6 nên người này được đổ thêm. */
  | {
      kind: 'move';
      move: Move;
      from: number;
      kicked: { house: House; slot: number } | null;
      again: boolean;
    };

export type Game = {
  seats: Seat[];
  rules: Rules;
  horses: Horses;
  turn: House;
  roll: number | null;
  moves: Move[];
  winner: House | null;
  seq: number;
  event: GameEvent;
};

export const activeHouses = (g: Pick<Game, 'seats'>) =>
  g.seats.filter((s) => s.kind !== 'empty').map((s) => s.house);

export function createGame(seats: Seat[], rules: Rules, horses?: Horses): Game {
  const active = seats.filter((s) => s.kind !== 'empty');
  if (active.length < 2) throw new Error('Cần ít nhất hai nhà');
  return {
    seats,
    rules,
    horses: horses ?? [0, 1, 2, 3].map(() => Array.from({ length: HORSES }, () => -1)),
    turn: active[0]!.house,
    roll: null,
    moves: [],
    winner: null,
    seq: 0,
    event: { kind: 'start' },
  };
}

function nextTurn(g: Game) {
  const active = activeHouses(g);
  g.turn = active[(active.indexOf(g.turn) + 1) % active.length]!;
  g.roll = null;
  g.moves = [];
}

/** Nhà đang đi đổ xúc xắc (giá trị do bên giữ ván bốc). Không đi được con nào thì qua lượt luôn. */
export function rollDie(g: Game, by: House, value: number): boolean {
  if (g.winner !== null || by !== g.turn || g.roll !== null) return false;
  if (!Number.isInteger(value) || value < 1 || value > 6) return false;
  const moves = legalMoves(g.horses, by, value, g.rules);
  g.roll = value;
  g.moves = moves;
  const passed = moves.length === 0;
  if (passed) nextTurn(g);
  g.seq++;
  g.event = { kind: 'roll', house: by, value, passed };
  return true;
}

/**
 * Nhà đang đi chọn con ngựa để đi. Con trong chuồng nào cũng như nhau: chọn con nào trong chuồng
 * cũng là nước ra quân (nếu ra quân được).
 */
export function pickHorse(g: Game, by: House, slot: number): boolean {
  if (g.winner !== null || by !== g.turn || g.roll === null) return false;
  const inStable = (g.horses[by]?.[slot] ?? 0) < 0;
  const move =
    g.moves.find((m) => m.slot === slot) ??
    (inStable ? g.moves.find((m) => m.to === 0 && g.horses[by]![m.slot]! < 0) : undefined);
  if (!move) return false;
  const from = g.horses[by]![move.slot]!;
  const kicked = kickedBy(g.horses, move, g.rules);
  g.horses[by]![move.slot] = move.to;
  if (kicked) g.horses[kicked.house]![kicked.slot] = -1;
  if (finished(g.horses, by) === HORSES) g.winner = by;
  const again = g.winner === null && g.roll === 6 && g.rules.bonusOnSix;
  if (again) {
    g.roll = null;
    g.moves = [];
  } else if (g.winner === null) nextTurn(g);
  g.seq++;
  g.event = { kind: 'move', move, from, kicked, again };
  return true;
}

/** Máy chọn nước: ưu tiên đá ngựa, rồi ra quân, rồi con đi xa nhất. */
export function botChoice(g: Game): Move | null {
  const moves = g.moves;
  if (!moves.length) return null;
  return (
    moves.find((m) => kickedBy(g.horses, m, g.rules)) ??
    moves.find((m) => m.to === 0) ??
    [...moves].sort((a, b) => b.to - a.to)[0]!
  );
}

/** Lượt hiện tại do máy đi (ghế máy, hoặc người chơi online đang rớt mạng). */
export const botTurn = (g: Game) => {
  const s = g.seats.find((x) => x.house === g.turn);
  return !!s && (s.kind === 'bot' || !s.connected);
};

export function setConnected(g: Game, house: House, on: boolean) {
  const s = g.seats.find((x) => x.house === house);
  // Không tăng seq: seq đánh dấu nước đi để máy nhận diễn hoạt cảnh, đổi kết nối thì không có gì để diễn.
  if (s) s.connected = on;
}

/** Xếp hạng khi ván kết thúc: người thắng, rồi theo số con đã về, rồi theo tổng số bước. */
export function standings(g: Game) {
  return g.seats
    .filter((s) => s.kind !== 'empty')
    .map((s) => ({
      ...s,
      done: finished(g.horses, s.house),
      steps: g.horses[s.house]!.reduce((t, x) => t + Math.max(0, x), 0),
    }))
    .sort((a, b) =>
      a.house === g.winner ? -1 : b.house === g.winner ? 1 : b.done - a.done || b.steps - a.steps,
    );
}
