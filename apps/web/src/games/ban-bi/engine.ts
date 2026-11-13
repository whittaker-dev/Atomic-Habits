// Luật Bắn Bi Bá Khí, thuần dữ liệu (không đụng giao diện): lưới bi xếp lục giác, mỗi hàng 10 và 9
// bi so le; bắn một bi lên, chạm bi khác hay trần thì dính vào ô trống gần nhất; ba bi cùng màu trở
// lên liền nhau thì nổ, bi không còn bám được lên trần thì rơi theo. Cả mảng bi tự trôi xuống liên
// tục, hàng mới trượt vào từ mép trên, càng chơi lâu trôi càng nhanh; bi chạm vạch dưới là thua (chơi
// vô tận, tính điểm). Mỗi ván xáo thế bi mới. Đơn vị: bán kính bi = 1; thời gian tính bằng giây.

export const COLS = 10;
export const R = 1;
export const ROW_H = Math.sqrt(3) * R;
export const WIDTH = COLS * 2 * R;
/** Hàng bi thấp nhất được phép; bi nào nằm từ hàng này trở xuống là thua. */
export const DEATH_ROW = 12;
/** Chiều cao sân: từ trần tới hết đầu rồng làm nòng bắn. */
export const HEIGHT = ROW_H * (DEATH_ROW + 1.6) + 4 * R;
/** Bệ bắn ở giữa đáy sân, chừa chỗ phía dưới cho đầu rồng. */
export const LAUNCH = { x: WIDTH / 2, y: HEIGHT - R * 3.2 };
/** Góc bắn (radian, 0 là sang phải, π/2 là thẳng lên) giới hạn để không bắn ngang. */
export const MIN_ANGLE = (8 * Math.PI) / 180;
export const MAX_ANGLE = Math.PI - MIN_ANGLE;

export const PALETTE_SIZE = 6;

export type Cell = { r: number; c: number };

export type Level = {
  id: string;
  name: string;
  rows: number;
  colors: number;
  /** Đầu ván: mất chừng này giây để mảng bi trôi xuống một hàng. */
  rowSeconds: number;
  /** Nhanh nhất về sau. */
  minRowSeconds: number;
};

export const LEVELS: Level[] = [
  { id: 'de', name: 'Dễ', rows: 5, colors: 4, rowSeconds: 5, minRowSeconds: 1.4 },
  { id: 'vua', name: 'Vừa', rows: 6, colors: 5, rowSeconds: 4, minRowSeconds: 1.2 },
  { id: 'kho', name: 'Khó', rows: 7, colors: 6, rowSeconds: 3, minRowSeconds: 1 },
];

/** Cứ chơi thêm chừng này giây thì tốc độ trôi gấp đôi (cho tới mức nhanh nhất của màn). */
export const SPEEDUP_HALF_LIFE = 120;

export type Game = {
  level: string;
  /** grid[r][c]: màu (0..5) hoặc -1. Hàng lẻ (theo parity) có COLS - 1 bi. */
  grid: number[][];
  /** Hàng 0 lệch nửa bi hay không (đổi mỗi khi chen hàng mới vào trên). */
  parity: 0 | 1;
  /** Mảng bi đã trôi xuống bao nhiêu phần của một hàng (0..1); đủ một hàng thì hàng chờ chen vào. */
  offset: number;
  /** Hàng sắp chen vào, đang lộ dần ở mép trên (hàng -1). */
  incoming: number[];
  /** Số giây đã trôi (tính tốc độ nhanh dần). */
  time: number;
  current: number;
  next: number;
  rng: number;
  status: 'play' | 'lost';
};

/** Kết quả một phát bắn, để giao diện diễn hoạt cảnh. */
export type ShotResult = {
  path: { x: number; y: number }[];
  cell: Cell;
  color: number;
  popped: (Cell & { color: number })[];
  dropped: (Cell & { color: number })[];
};

function rand(g: { rng: number }) {
  let t = (g.rng = (g.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// Hàng chờ ở chỉ số -1 nên phải lấy dư dương.
export const isShort = (g: Pick<Game, 'parity'>, r: number) => (((r + g.parity) % 2) + 2) % 2 === 1;
export const rowLen = (g: Pick<Game, 'parity'>, r: number) => (isShort(g, r) ? COLS - 1 : COLS);

/** Tâm ô (r, c) trên sân, tính cả phần mảng bi đã trôi xuống. */
export function cellPos(g: Pick<Game, 'parity' | 'offset'>, r: number, c: number) {
  return {
    x: R + c * 2 * R + (isShort(g, r) ? R : 0),
    y: R + (r + g.offset) * ROW_H,
  };
}

export const at = (g: Game, r: number, c: number) => g.grid[r]?.[c] ?? -1;

/** Sáu ô kề của một ô (trong lưới lục giác so le). */
export function neighbors(g: Pick<Game, 'parity'>, r: number, c: number): Cell[] {
  const off = isShort(g, r) ? 0 : -1;
  const out: Cell[] = [
    { r, c: c - 1 },
    { r, c: c + 1 },
    { r: r - 1, c: c + off },
    { r: r - 1, c: c + off + 1 },
    { r: r + 1, c: c + off },
    { r: r + 1, c: c + off + 1 },
  ];
  return out.filter((n) => n.r >= 0 && n.c >= 0 && n.c < rowLen(g, n.r));
}

const ensureRows = (g: Game, rows: number) => {
  while (g.grid.length < rows) g.grid.push(Array(rowLen(g, g.grid.length)).fill(-1));
};

/** Màu còn trên sân (bi mới chỉ ra những màu này để luôn có đường phá). */
export function colorsLeft(g: Game): number[] {
  const set = new Set<number>();
  for (const row of g.grid) for (const v of row) if (v >= 0) set.add(v);
  return [...set].sort((a, b) => a - b);
}

function pickColor(g: Game, palette: number) {
  const left = colorsLeft(g);
  const pool = left.length ? left : Array.from({ length: palette }, (_, i) => i);
  return pool[Math.floor(rand(g) * pool.length)]!;
}

export const levelOf = (id: string) => LEVELS.find((l) => l.id === id) ?? LEVELS[0]!;

/**
 * Hàng bi mới dài `len`: lấy đủ các màu của màn (chơi vô tận nên không thu hẹp theo màu còn trên sân),
 * hay chép màu bi bên cạnh cho ra cụm.
 */
function makeRow(g: Game, len: number) {
  const colors = levelOf(g.level).colors;
  const row: number[] = [];
  for (let c = 0; c < len; c++)
    row.push(c > 0 && rand(g) < 0.5 ? row[c - 1]! : Math.floor(rand(g) * colors));
  return row;
}

/** Ván mới; mỗi ván một hạt giống ngẫu nhiên nên thế bi khác nhau (test truyền hạt giống cố định). */
export function createGame(levelId: string, seed = Math.floor(Math.random() * 2 ** 31)): Game {
  const lv = levelOf(levelId);
  const g: Game = {
    level: lv.id,
    grid: [],
    parity: 0,
    offset: 0,
    incoming: [],
    time: 0,
    current: 0,
    next: 0,
    rng: seed | 0,
    status: 'play',
  };
  ensureRows(g, lv.rows);
  // Đổ màu thành từng mảng: mỗi bi có xác suất chép màu của bi kề phía trên/trái, cho ra cụm đẹp
  // và có nhiều chỗ nổ dây chuyền.
  for (let r = 0; r < lv.rows; r++)
    for (let c = 0; c < rowLen(g, r); c++) {
      const near = neighbors(g, r, c).filter((n) => n.r < r || (n.r === r && n.c < c));
      const from = near.length && rand(g) < 0.55 ? near[Math.floor(rand(g) * near.length)]! : null;
      g.grid[r]![c] = from ? at(g, from.r, from.c) : Math.floor(rand(g) * lv.colors);
    }
  g.incoming = makeRow(g, rowLen(g, -1));
  g.current = pickColor(g, lv.colors);
  g.next = pickColor(g, lv.colors);
  return g;
}

/**
 * Đường bay của bi bắn theo góc `angle`: dội tường trái phải, dừng khi chạm trần hoặc chạm bi.
 * Trả về các điểm gãy và ô bi sẽ dính vào. Dùng cho cả đường ngắm lẫn phát bắn thật.
 */
export function trace(g: Game, angle: number): { path: { x: number; y: number }[]; cell: Cell } {
  const a = Math.min(MAX_ANGLE, Math.max(MIN_ANGLE, angle));
  let x = LAUNCH.x;
  let y = LAUNCH.y;
  let dx = Math.cos(a);
  const dy = -Math.sin(a);
  const path = [{ x, y }];
  // Trần là tâm hàng 0, trôi xuống cùng mảng bi.
  const top = R + g.offset * ROW_H;
  const STEP = 0.1;
  for (let i = 0; i < 6000; i++) {
    x += dx * STEP;
    y += dy * STEP;
    if (x < R) {
      x = 2 * R - x;
      dx = -dx;
      path.push({ x: R, y });
    } else if (x > WIDTH - R) {
      x = 2 * (WIDTH - R) - x;
      dx = -dx;
      path.push({ x: WIDTH - R, y });
    }
    let hit = y <= top;
    if (!hit)
      for (let r = 0; r < g.grid.length && !hit; r++)
        for (let c = 0; c < g.grid[r]!.length; c++) {
          if (g.grid[r]![c]! < 0) continue;
          const p = cellPos(g, r, c);
          // Chạm hơi sớm (1.8R thay vì 2R) cho cảm giác "dính" quen thuộc và dễ lách khe.
          if ((p.x - x) ** 2 + (p.y - y) ** 2 < (1.8 * R) ** 2) {
            hit = true;
            break;
          }
        }
    if (hit) {
      path.push({ x, y });
      return { path, cell: snap(g, x, y) };
    }
  }
  path.push({ x, y });
  return { path, cell: snap(g, x, y) };
}

/** Ô trống gần điểm (x, y) nhất, phải bám vào trần hoặc vào một bi có sẵn. */
function snap(g: Game, x: number, y: number): Cell {
  let best: Cell = { r: 0, c: 0 };
  let bestD = Infinity;
  const rows = Math.max(g.grid.length + 1, 1);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < rowLen(g, r); c++) {
      if (at(g, r, c) >= 0) continue;
      const attached = r === 0 || neighbors(g, r, c).some((n) => at(g, n.r, n.c) >= 0);
      if (!attached) continue;
      const p = cellPos(g, r, c);
      const d = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = { r, c };
      }
    }
  }
  return best;
}

/** Ô nối liền nhau cùng màu với ô bắt đầu. */
function cluster(g: Game, start: Cell): Cell[] {
  const color = at(g, start.r, start.c);
  const seen = new Set([`${start.r},${start.c}`]);
  const out: Cell[] = [];
  const stack = [start];
  while (stack.length) {
    const cur = stack.pop()!;
    out.push(cur);
    for (const n of neighbors(g, cur.r, cur.c)) {
      const k = `${n.r},${n.c}`;
      if (!seen.has(k) && at(g, n.r, n.c) === color) {
        seen.add(k);
        stack.push(n);
      }
    }
  }
  return out;
}

/** Bi không còn nối được tới hàng trên cùng. */
function floating(g: Game): Cell[] {
  const seen = new Set<string>();
  const stack: Cell[] = [];
  for (let c = 0; c < rowLen(g, 0); c++)
    if (at(g, 0, c) >= 0) {
      seen.add(`0,${c}`);
      stack.push({ r: 0, c });
    }
  while (stack.length) {
    const cur = stack.pop()!;
    for (const n of neighbors(g, cur.r, cur.c)) {
      const k = `${n.r},${n.c}`;
      if (!seen.has(k) && at(g, n.r, n.c) >= 0) {
        seen.add(k);
        stack.push(n);
      }
    }
  }
  const out: Cell[] = [];
  g.grid.forEach((row, r) =>
    row.forEach((v, c) => v >= 0 && !seen.has(`${r},${c}`) && out.push({ r, c })),
  );
  return out;
}

/** Hàng thấp nhất còn bi. */
export function lowestRow(g: Game) {
  for (let r = g.grid.length - 1; r >= 0; r--) if (g.grid[r]!.some((v) => v >= 0)) return r;
  return -1;
}

/** Bi thấp nhất đã chạm vạch dưới (tâm bi qua vạch nằm giữa hàng DEATH_ROW - 1 và DEATH_ROW). */
const overLine = (g: Game) => {
  const low = lowestRow(g);
  return low >= 0 && low + g.offset >= DEATH_ROW - 0.5;
};

/** Số giây để mảng bi trôi xuống một hàng lúc này (nhanh dần theo thời gian chơi). */
export function rowSeconds(g: Pick<Game, 'level' | 'time'>) {
  const lv = levelOf(g.level);
  return Math.max(lv.minRowSeconds, lv.rowSeconds * 0.5 ** (g.time / SPEEDUP_HALF_LIFE));
}

/**
 * Cho mảng bi trôi xuống theo `dt` giây. Đủ một hàng thì hàng chờ chen vào hàng 0 và một hàng chờ mới
 * lộ ra ở mép trên. Bi chạm vạch là thua. Trả về số hàng vừa chen vào.
 */
export function advance(g: Game, dt: number): number {
  if (g.status !== 'play' || dt <= 0) return 0;
  g.time += dt;
  g.offset += dt / rowSeconds(g);
  let added = 0;
  while (g.offset >= 1) {
    g.offset -= 1;
    // Mọi hàng cũ lùi xuống một chỉ số: đảo parity để hàng nào vẫn giữ đúng độ lệch của nó.
    g.parity = g.parity === 0 ? 1 : 0;
    g.grid.unshift(g.incoming);
    g.incoming = makeRow(g, rowLen(g, -1));
    added++;
  }
  if (overLine(g)) g.status = 'lost';
  return added;
}

/** Bắn bi đang cầm theo góc `angle`. Đổi `g` tại chỗ và trả về diễn biến; null nếu ván đã xong. */
export function shoot(g: Game, angle: number): ShotResult | null {
  if (g.status !== 'play') return null;
  const lv = levelOf(g.level);
  const { path, cell } = trace(g, angle);
  const color = g.current;
  ensureRows(g, cell.r + 1);
  g.grid[cell.r]![cell.c] = color;

  let popped: ShotResult['popped'] = [];
  let dropped: ShotResult['dropped'] = [];
  const group = cluster(g, cell);
  if (group.length >= 3) {
    popped = group.map((p) => ({ ...p, color }));
    for (const p of group) g.grid[p.r]![p.c] = -1;
    dropped = floating(g).map((p) => ({ ...p, color: at(g, p.r, p.c) }));
    for (const p of dropped) g.grid[p.r]![p.c] = -1;
  }
  // Bỏ các hàng trống cuối lưới.
  while (g.grid.length && g.grid[g.grid.length - 1]!.every((v) => v < 0)) g.grid.pop();

  if (overLine(g)) g.status = 'lost';
  g.current = g.next;
  // Bi đang cầm có thể mang màu vừa bị phá hết: đổi sang màu còn trên sân.
  const left = colorsLeft(g);
  if (left.length && !left.includes(g.current)) g.current = pickColor(g, lv.colors);
  g.next = pickColor(g, lv.colors);
  return { path, cell, color, popped, dropped };
}

/** Đổi bi đang cầm với bi kế tiếp. */
export function swap(g: Game) {
  [g.current, g.next] = [g.next, g.current];
}

export const bubbleCount = (g: Game) =>
  g.grid.reduce((n, row) => n + row.filter((v) => v >= 0).length, 0);
