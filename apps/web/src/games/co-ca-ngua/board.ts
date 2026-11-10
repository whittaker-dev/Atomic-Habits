// Hình học bàn cờ cá ngựa 15×15, không phụ thuộc giao diện: đường đi 56 ô quanh hình chữ thập
// (mỗi nhà một đoạn 14 ô), đường về chuồng 6 bậc của từng nhà, ô xuất quân và chỗ đứng trong chuồng.
// Ô (cột, hàng) đếm từ góc trên trái. Bốn nhà xếp theo chiều kim đồng hồ: 0 trên trái, 1 trên phải,
// 2 dưới phải, 3 dưới trái; dữ liệu của nhà h là dữ liệu nhà 0 xoay h lần 90° quanh tâm bàn.

export const N = 15;
export const TRACK_LEN = 56;
export const HOME_LEN = 6;
/** Từ ô xuất quân đi hết vòng tới ô cuối trước đường về chuồng: 55 ô, tức 54 bước. */
export const LAST_TRACK_STEP = TRACK_LEN - 2;
/** Bậc cao nhất của đường về chuồng: tới đây là ngựa đã về đích. */
export const FINISH = LAST_TRACK_STEP + HOME_LEN;
export const HORSES = 4;

export type House = 0 | 1 | 2 | 3;
export type Cell = readonly [col: number, row: number];

/** Xoay một ô 90° theo chiều kim đồng hồ quanh tâm bàn. */
const rotCell = ([c, r]: Cell): Cell => [N - 1 - r, c];
/** Như rotCell nhưng cho toạ độ liên tục (tâm ô (c, r) là (c + 0.5, r + 0.5)). */
const rotPoint = ([x, y]: Cell): Cell => [N - y, x];

function rotate<T>(v: T, times: number, f: (v: T) => T): T {
  let out = v;
  for (let i = 0; i < times; i++) out = f(out);
  return out;
}

// Đoạn 14 ô của nhà 0: hàng trên của cánh trái đi vào, góc tâm, cột trái của cánh trên đi lên, ô đỉnh.
const QUARTER: Cell[] = [
  ...[0, 1, 2, 3, 4, 5].map((c): Cell => [c, 6]),
  [6, 6],
  ...[5, 4, 3, 2, 1, 0].map((r): Cell => [6, r]),
  [7, 0],
];

/** 56 ô đường đi theo chiều kim đồng hồ; ô 0 là (0, 6). */
export const TRACK: Cell[] = [0, 1, 2, 3].flatMap((h) => QUARTER.map((c) => rotate(c, h, rotCell)));

/** Chỉ số trên TRACK của ô xuất quân mỗi nhà (ngay sau góc của nhà đó). */
export const startIndex = (h: House) => h * (TRACK_LEN / 4) + 1;

/** Sáu bậc về chuồng của mỗi nhà, bậc 1 ở mép ngoài, bậc 6 sát tâm. */
export const HOME: Cell[][] = [0, 1, 2, 3].map((h) =>
  [1, 2, 3, 4, 5, 6].map((c) => rotate<Cell>([c, 7], h, rotCell)),
);

/** Góc chuồng 6×6 của mỗi nhà (ô trên trái). */
export const YARD: Cell[] = [
  [0, 0],
  [9, 0],
  [9, 9],
  [0, 9],
];

/** Bốn chỗ đứng trong chuồng (toạ độ liên tục). */
export const STABLE: Cell[][] = [0, 1, 2, 3].map((h) =>
  (
    [
      [2, 2],
      [4, 2],
      [2, 4],
      [4, 4],
    ] as Cell[]
  ).map((p) => rotate(p, h, rotPoint)),
);

/** Tâm bàn: nơi đặt huy hiệu bốn màu. */
export const CENTER: Cell = [7.5, 7.5];

/**
 * Vị trí của một con ngựa theo số bước đã đi: -1 là còn trong chuồng, 0..54 là trên đường đi tính từ
 * ô xuất quân, 55..60 là bậc 1..6 về chuồng.
 */
export type Spot =
  | { kind: 'stable'; slot: number }
  | { kind: 'track'; index: number }
  | { kind: 'home'; step: number };

export function spotOf(h: House, progress: number, slot: number): Spot {
  if (progress < 0) return { kind: 'stable', slot };
  if (progress <= LAST_TRACK_STEP)
    return { kind: 'track', index: (startIndex(h) + progress) % TRACK_LEN };
  return { kind: 'home', step: progress - LAST_TRACK_STEP };
}

/** Toạ độ liên tục (tâm ô) của một chỗ trên bàn. */
export function pointOf(h: House, spot: Spot): Cell {
  if (spot.kind === 'stable') return STABLE[h]![spot.slot]!;
  const [c, r] = spot.kind === 'track' ? TRACK[spot.index]! : HOME[h]![spot.step - 1]!;
  return [c + 0.5, r + 0.5];
}

/** Loại của từng ô trên lưới, để vẽ bàn. */
export type CellKind =
  | { kind: 'yard'; house: House }
  | { kind: 'track'; start: House | null }
  | { kind: 'home'; house: House; step: number }
  | { kind: 'goal' };

export function cellKind(c: number, r: number): CellKind {
  if (c === 7 && r === 7) return { kind: 'goal' };
  for (let h = 0; h < 4; h++) {
    const step = HOME[h]!.findIndex(([hc, hr]) => hc === c && hr === r);
    if (step >= 0) return { kind: 'home', house: h as House, step: step + 1 };
  }
  const t = TRACK.findIndex(([tc, tr]) => tc === c && tr === r);
  if (t >= 0) {
    const start = ([0, 1, 2, 3] as House[]).find((h) => startIndex(h) === t);
    return { kind: 'track', start: start ?? null };
  }
  const house = (r < 6 ? (c < 6 ? 0 : 1) : c < 6 ? 3 : 2) as House;
  return { kind: 'yard', house };
}
