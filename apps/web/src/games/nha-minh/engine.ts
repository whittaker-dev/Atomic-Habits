import {
  DOOR_PRICE,
  GOALS,
  ITEM,
  ROOM_NAMES,
  START_FUND,
  TILES_PER_CELL,
  WALL_PRICE,
  WINDOW_PRICE,
  type Kind,
} from './catalog';
import { TILES, type TileId } from './tiles';

// Luật của Nhà Mình, thuần dữ liệu (không đụng React, three.js hay mạng) để chủ phòng chạy và kiểm
// thử được. Lô đất là lưới ô 1 m. Tường là các cạnh lưới dài 1 m; một cạnh có thể là tường, cửa đi
// hoặc cửa sổ. Phòng là vùng ô liền nhau không bị tường ngăn; phòng "kín" khi không lọt ra ngoài lô.
// Hai người chơi tiêu chung một quỹ; mục tiêu gia đình xong thì quỹ được cộng thưởng.

export const LOT = { w: 10, d: 8 } as const;
export const MAX_NAME = 24;

export type Seat = 0 | 1;
/** Cạnh lưới: "h:x:y" là cạnh ngang từ (x,y) tới (x+1,y); "v:x:y" là cạnh dọc từ (x,y) tới (x,y+1). */
export type Edge = string;
export type WallKind = 'wall' | 'door' | 'window';
export type WallPiece = { kind: WallKind; by: Seat; paid: number };
export type Rot = 0 | 1 | 2 | 3;
export type Piece = {
  id: string;
  kind: Kind;
  x: number;
  y: number;
  rot: Rot;
  by: Seat;
  paid: number;
};

export type House = {
  v: 1;
  id: string;
  name: string;
  created: number;
  updated: number;
  /** Mã phòng cố định của căn nhà, để người kia lần sau vào lại bằng đúng mã cũ. */
  code: string;
  players: [string, string | null];
  walls: Record<Edge, WallPiece>;
  /** Gạch lát từng ô, theo hàng: chỉ số y * LOT.w + x; null là sàn xi măng trơn. */
  floor: (TileId | null)[];
  /** Tiền gạch đã trả của từng ô, để biết hoàn cho ai khi lát đè. */
  floorPaid: { by: Seat; paid: number }[];
  pieces: Piece[];
  spent: [number, number];
  income: number;
  goals: string[];
  nextId: number;
};

export type Action =
  | { a: 'wall'; x1: number; y1: number; x2: number; y2: number }
  | { a: 'open'; edge: Edge; kind: 'door' | 'window' }
  | { a: 'erase-wall'; edge: Edge }
  | { a: 'tile'; x: number; y: number; tile: TileId }
  | { a: 'place'; kind: Kind; x: number; y: number; rot: Rot }
  | { a: 'remove'; id: string }
  | { a: 'rename'; name: string };

export type GameEvent = { e: 'goal'; id: string; reward: number };
export type Result = { ok: true; events: GameEvent[] } | { ok: false; reason: string };
export type Quote = { cost: number; refund?: number } | { error: string };

// ---------------------------------------------------------------------------
// Tạo nhà
// ---------------------------------------------------------------------------

const edgeKey = (dir: 'h' | 'v', x: number, y: number): Edge => `${dir}:${x}:${y}`;

export function parseEdge(e: Edge): { dir: 'h' | 'v'; x: number; y: number } | null {
  const m = /^([hv]):(-?\d+):(-?\d+)$/.exec(e);
  if (!m) return null;
  const dir = m[1] as 'h' | 'v';
  const x = Number(m[2]);
  const y = Number(m[3]);
  const ok =
    dir === 'h'
      ? x >= 0 && x < LOT.w && y >= 0 && y <= LOT.d
      : x >= 0 && x <= LOT.w && y >= 0 && y < LOT.d;
  return ok ? { dir, x, y } : null;
}

/** Nhà mới: khung tường bao quanh lô và một cửa chính ở mặt trước, miễn phí. */
export function createHouse(id: string, code: string, hostName: string, now: number): House {
  const walls: Record<Edge, WallPiece> = {};
  const free = (e: Edge, kind: WallKind = 'wall') => (walls[e] = { kind, by: 0, paid: 0 });
  for (let x = 0; x < LOT.w; x++) {
    free(edgeKey('h', x, 0));
    free(edgeKey('h', x, LOT.d));
  }
  for (let y = 0; y < LOT.d; y++) {
    free(edgeKey('v', 0, y));
    free(edgeKey('v', LOT.w, y));
  }
  free(edgeKey('h', 6, LOT.d), 'door');
  return {
    v: 1,
    id,
    name: `Nhà của ${hostName}`.slice(0, MAX_NAME),
    created: now,
    updated: now,
    code,
    players: [hostName, null],
    walls,
    floor: Array(LOT.w * LOT.d).fill(null),
    floorPaid: Array.from({ length: LOT.w * LOT.d }, () => ({ by: 0 as Seat, paid: 0 })),
    pieces: [],
    spent: [0, 0],
    income: 0,
    goals: [],
    nextId: 1,
  };
}

export const fund = (h: House) => START_FUND + h.income;
export const left = (h: House) => fund(h) - h.spent[0] - h.spent[1];

// ---------------------------------------------------------------------------
// Phòng
// ---------------------------------------------------------------------------

export type Room = {
  /** Ô đầu tiên (nhỏ nhất) của phòng, làm mã phòng ổn định giữa các lần tính. */
  id: number;
  cells: number[];
  enclosed: boolean;
};

/** Chia lô thành các vùng ô không bị tường (kể cả cửa) ngăn cách. */
export function rooms(h: House): Room[] {
  const seen = new Uint8Array(LOT.w * LOT.d);
  const out: Room[] = [];
  for (let start = 0; start < seen.length; start++) {
    if (seen[start]) continue;
    const cells: number[] = [];
    let enclosed = true;
    const stack = [start];
    seen[start] = 1;
    while (stack.length) {
      const c = stack.pop()!;
      cells.push(c);
      const x = c % LOT.w;
      const y = Math.floor(c / LOT.w);
      // Bốn hướng: [ô bên cạnh, cạnh lưới ngăn giữa hai ô].
      const steps: [number, number, Edge][] = [
        [x, y - 1, edgeKey('h', x, y)],
        [x, y + 1, edgeKey('h', x, y + 1)],
        [x - 1, y, edgeKey('v', x, y)],
        [x + 1, y, edgeKey('v', x + 1, y)],
      ];
      for (const [nx, ny, e] of steps) {
        if (h.walls[e]) continue;
        if (nx < 0 || ny < 0 || nx >= LOT.w || ny >= LOT.d) {
          enclosed = false;
          continue;
        }
        const n = ny * LOT.w + nx;
        if (!seen[n]) {
          seen[n] = 1;
          stack.push(n);
        }
      }
    }
    cells.sort((a, b) => a - b);
    out.push({ id: cells[0]!, cells, enclosed });
  }
  return out;
}

/** Phòng chứa tâm món đồ (hoặc null nếu tâm nằm ngoài lô). */
function roomOf(rs: Room[], x: number, y: number): Room | null {
  const cx = Math.floor(x);
  const cy = Math.floor(y);
  if (cx < 0 || cy < 0 || cx >= LOT.w || cy >= LOT.d) return null;
  const cell = cy * LOT.w + cx;
  return rs.find((r) => r.cells.includes(cell)) ?? null;
}

export function roomName(h: House, room: Room, rs = rooms(h)): string {
  const kinds = new Set(
    h.pieces.filter((p) => roomOf(rs, p.x, p.y)?.id === room.id).map((p) => p.kind),
  );
  return ROOM_NAMES.find(([k]) => kinds.has(k))?.[1] ?? 'Phòng trống';
}

export const isTiled = (h: House, room: Room) => room.cells.every((c) => h.floor[c] !== null);

// ---------------------------------------------------------------------------
// Đồ đạc
// ---------------------------------------------------------------------------

/** Kích thước mặt bằng sau khi xoay. */
export function footprint(kind: Kind, rot: Rot): { w: number; d: number } {
  const it = ITEM[kind];
  return rot % 2 ? { w: it.d, d: it.w } : { w: it.w, d: it.d };
}

type Box = { x0: number; x1: number; y0: number; y1: number };
const boxOf = (kind: Kind, x: number, y: number, rot: Rot): Box => {
  const f = footprint(kind, rot);
  return { x0: x - f.w / 2, x1: x + f.w / 2, y0: y - f.d / 2, y1: y + f.d / 2 };
};
const EPS = 1e-6;
const overlap = (a: Box, b: Box) =>
  a.x0 < b.x1 - EPS && b.x0 < a.x1 - EPS && a.y0 < b.y1 - EPS && b.y0 < a.y1 - EPS;

/** Món đồ ở vị trí này có đặt được không; trả lý do nếu không. */
export function placeError(
  h: House,
  kind: Kind,
  x: number,
  y: number,
  rot: Rot,
  ignore?: string,
): string | null {
  if (!ITEM[kind]) return 'Không có món này.';
  if (![x, y].every(Number.isFinite)) return 'Vị trí không hợp lệ.';
  const b = boxOf(kind, x, y, rot);
  if (b.x0 < -EPS || b.y0 < -EPS || b.x1 > LOT.w + EPS || b.y1 > LOT.d + EPS)
    return 'Món đồ lọt ra ngoài lô đất.';
  // Tường là đường kẻ trên lưới: món đồ không được vắt ngang qua.
  for (const e of Object.keys(h.walls)) {
    const p = parseEdge(e);
    if (!p) continue;
    const hit =
      p.dir === 'h'
        ? b.y0 < p.y - EPS && p.y < b.y1 - EPS && b.x0 < p.x + 1 - EPS && p.x < b.x1 - EPS
        : b.x0 < p.x - EPS && p.x < b.x1 - EPS && b.y0 < p.y + 1 - EPS && p.y < b.y1 - EPS;
    if (hit) return 'Món đồ vắt qua tường.';
  }
  if (!ITEM[kind].flat)
    for (const q of h.pieces)
      if (q.id !== ignore && !ITEM[q.kind].flat && overlap(b, boxOf(q.kind, q.x, q.y, q.rot)))
        return `Chồng lên ${ITEM[q.kind].name.toLowerCase()}.`;
  return null;
}

// ---------------------------------------------------------------------------
// Tường
// ---------------------------------------------------------------------------

/** Các cạnh lưới của một đoạn tường thẳng từ điểm lưới (x1,y1) tới (x2,y2). */
export function wallEdges(x1: number, y1: number, x2: number, y2: number): Edge[] | null {
  if (![x1, y1, x2, y2].every(Number.isInteger)) return null;
  if (x1 !== x2 && y1 !== y2) return null;
  if (x1 === x2 && y1 === y2) return null;
  const out: Edge[] = [];
  if (y1 === y2) {
    for (let x = Math.min(x1, x2); x < Math.max(x1, x2); x++) out.push(edgeKey('h', x, y1));
  } else {
    for (let y = Math.min(y1, y2); y < Math.max(y1, y2); y++) out.push(edgeKey('v', x1, y));
  }
  return out.every((e) => parseEdge(e)) ? out : null;
}

/** Cạnh tường gần điểm (x, y) trên sàn nhất, nếu đủ gần. */
export function nearestEdge(x: number, y: number, maxDist = 0.45): Edge | null {
  const gx = Math.round(x);
  const gy = Math.round(y);
  const dh = Math.abs(y - gy);
  const dv = Math.abs(x - gx);
  const cand: [number, Edge][] = [];
  if (dh <= maxDist) cand.push([dh, edgeKey('h', Math.floor(x), gy)]);
  if (dv <= maxDist) cand.push([dv, edgeKey('v', gx, Math.floor(y))]);
  cand.sort((a, b) => a[0] - b[0]);
  return cand.map(([, e]) => e).find((e) => parseEdge(e)) ?? null;
}

/** Tường gỡ được: không gỡ khung tường bao (để nhà luôn có vỏ). */
const isFrame = (e: Edge) => {
  const p = parseEdge(e);
  return !!p && (p.dir === 'h' ? p.y === 0 || p.y === LOT.d : p.x === 0 || p.x === LOT.w);
};

// ---------------------------------------------------------------------------
// Báo giá và áp dụng
// ---------------------------------------------------------------------------

/** Giá (hoặc lý do không làm được) của một thao tác, chưa trừ tiền. */
export function quote(h: House, act: Action): Quote {
  switch (act.a) {
    case 'wall': {
      const es = wallEdges(act.x1, act.y1, act.x2, act.y2);
      if (!es) return { error: 'Tường phải thẳng theo lưới, trong lô đất.' };
      const fresh = es.filter((e) => !h.walls[e]);
      if (!fresh.length) return { error: 'Đoạn này đã có tường.' };
      // Tường mới không được cắt ngang món đồ đang đặt.
      const probe: House = { ...h, walls: { ...h.walls } };
      for (const e of fresh) probe.walls[e] = { kind: 'wall', by: 0, paid: 0 };
      for (const p of h.pieces)
        if (placeError(probe, p.kind, p.x, p.y, p.rot, p.id) === 'Món đồ vắt qua tường.')
          return { error: `Tường cắt ngang ${ITEM[p.kind].name.toLowerCase()}.` };
      return { cost: fresh.length * WALL_PRICE };
    }
    case 'open': {
      const w = h.walls[act.edge];
      if (!w) return { error: 'Chạm vào một đoạn tường để trổ cửa.' };
      if (w.kind === act.kind)
        return { error: act.kind === 'door' ? 'Đây đã là cửa đi.' : 'Đây đã là cửa sổ.' };
      return { cost: act.kind === 'door' ? DOOR_PRICE : WINDOW_PRICE };
    }
    case 'erase-wall': {
      const w = h.walls[act.edge];
      if (!w) return { error: 'Ở đây không có tường.' };
      if (isFrame(act.edge) && w.kind === 'wall')
        return { error: 'Không gỡ được tường bao của nhà.' };
      return { cost: 0, refund: w.paid };
    }
    case 'tile': {
      const t = TILES.find((q) => q.id === act.tile);
      if (!t) return { error: 'Không có loại gạch này.' };
      const room = roomOf(rooms(h), act.x, act.y);
      if (!room) return { error: 'Chạm vào trong nhà để chọn phòng.' };
      if (!room.enclosed) return { error: 'Phòng chưa kín tường, chưa lát được.' };
      const cells = room.cells.filter((c) => h.floor[c] !== act.tile);
      if (!cells.length) return { error: 'Phòng này đã lát đúng loại gạch đó.' };
      return { cost: cells.length * TILES_PER_CELL * t.price };
    }
    case 'place': {
      const err = placeError(h, act.kind, act.x, act.y, act.rot);
      return err ? { error: err } : { cost: ITEM[act.kind].price };
    }
    case 'remove': {
      const p = h.pieces.find((q) => q.id === act.id);
      return p ? { cost: 0, refund: p.paid } : { error: 'Món đồ này không còn nữa.' };
    }
    case 'rename':
      return act.name.trim() ? { cost: 0 } : { error: 'Tên nhà không được để trống.' };
  }
}

/** Áp một thao tác của người ngồi ghế `seat`. Trả lỗi (không đổi gì) nếu không làm được. */
export function apply(h: House, seat: Seat, act: Action, now: number): Result {
  const q = quote(h, act);
  if ('error' in q) return { ok: false, reason: q.error };
  if (q.cost > left(h)) return { ok: false, reason: 'Quỹ chung không đủ tiền.' };
  const pay = (n: number) => (h.spent[seat] += n);
  const refund = (by: Seat, n: number) => (h.spent[by] = Math.max(0, h.spent[by] - n));

  switch (act.a) {
    case 'wall':
      for (const e of wallEdges(act.x1, act.y1, act.x2, act.y2)!)
        if (!h.walls[e]) h.walls[e] = { kind: 'wall', by: seat, paid: WALL_PRICE };
      break;
    case 'open': {
      const w = h.walls[act.edge]!;
      h.walls[act.edge] = { kind: act.kind, by: seat, paid: w.paid + q.cost };
      break;
    }
    case 'erase-wall': {
      const w = h.walls[act.edge]!;
      refund(w.by, w.paid);
      // Cửa trên khung tường bao thì trả lại thành tường; tường trong thì gỡ hẳn.
      if (isFrame(act.edge)) h.walls[act.edge] = { kind: 'wall', by: w.by, paid: 0 };
      else delete h.walls[act.edge];
      break;
    }
    case 'tile': {
      const room = roomOf(rooms(h), act.x, act.y)!;
      const per = TILES_PER_CELL * TILES.find((t) => t.id === act.tile)!.price;
      for (const c of room.cells) {
        if (h.floor[c] === act.tile) continue;
        // Lát đè: gạch cũ coi như hoàn lại cho người đã lát.
        const old = h.floorPaid[c]!;
        refund(old.by, old.paid);
        h.floor[c] = act.tile;
        h.floorPaid[c] = { by: seat, paid: per };
      }
      break;
    }
    case 'place':
      h.pieces.push({
        id: `p${h.nextId++}`,
        kind: act.kind,
        x: Math.round(act.x * 100) / 100,
        y: Math.round(act.y * 100) / 100,
        rot: act.rot,
        by: seat,
        paid: q.cost,
      });
      break;
    case 'remove': {
      const i = h.pieces.findIndex((p) => p.id === act.id);
      const p = h.pieces[i]!;
      refund(p.by, p.paid);
      h.pieces.splice(i, 1);
      break;
    }
    case 'rename':
      h.name = act.name.trim().slice(0, MAX_NAME);
      break;
  }
  if (act.a !== 'remove' && act.a !== 'erase-wall' && act.a !== 'rename') pay(q.cost);
  h.updated = now;
  return { ok: true, events: claimGoals(h) };
}

// ---------------------------------------------------------------------------
// Mục tiêu
// ---------------------------------------------------------------------------

/** Tiến độ một mục tiêu: [đã có, cần], tính theo phòng kín tốt nhất. */
export function goalProgress(h: House, goalId: string, rs = rooms(h)): [number, number] {
  const g = GOALS.find((q) => q.id === goalId)!;
  if (g.anywhere) {
    const n = h.pieces.filter((p) => p.kind === g.anywhere!.kind).length;
    return [Math.min(n, g.anywhere.count), g.anywhere.count];
  }
  const need = g.needs.length + (g.tiled ? 1 : 0);
  let best = 0;
  for (const r of rs) {
    if (!r.enclosed) continue;
    const kinds = new Set(h.pieces.filter((p) => roomOf(rs, p.x, p.y) === r).map((p) => p.kind));
    const have = g.needs.filter((k) => kinds.has(k)).length + (g.tiled && isTiled(h, r) ? 1 : 0);
    best = Math.max(best, have);
  }
  return [best, need];
}

/** Nhận thưởng các mục tiêu vừa xong (mỗi mục tiêu một lần). */
function claimGoals(h: House): GameEvent[] {
  const rs = rooms(h);
  const out: GameEvent[] = [];
  for (const g of GOALS) {
    if (h.goals.includes(g.id)) continue;
    const [have, need] = goalProgress(h, g.id, rs);
    if (have >= need) {
      h.goals.push(g.id);
      h.income += g.reward;
      out.push({ e: 'goal', id: g.id, reward: g.reward });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Kiểm tra dữ liệu nhận qua mạng hoặc đọc từ máy
// ---------------------------------------------------------------------------

const KINDS = new Set(Object.keys(ITEM));
const TILE_IDS = new Set(TILES.map((t) => t.id));

/** Lọc thao tác khách gửi: chỉ nhận đúng hình dạng, đúng kiểu. */
export function sanitizeAction(raw: unknown): Action | null {
  const o = raw as Record<string, unknown> | null;
  if (!o || typeof o !== 'object') return null;
  const num = (k: string) =>
    typeof o[k] === 'number' && Number.isFinite(o[k]) ? (o[k] as number) : null;
  const rot = num('rot');
  switch (o.a) {
    case 'wall': {
      const x1 = num('x1');
      const y1 = num('y1');
      const x2 = num('x2');
      const y2 = num('y2');
      return x1 !== null && y1 !== null && x2 !== null && y2 !== null
        ? { a: 'wall', x1, y1, x2, y2 }
        : null;
    }
    case 'open':
      return typeof o.edge === 'string' && (o.kind === 'door' || o.kind === 'window')
        ? { a: 'open', edge: o.edge, kind: o.kind }
        : null;
    case 'erase-wall':
      return typeof o.edge === 'string' ? { a: 'erase-wall', edge: o.edge } : null;
    case 'tile': {
      const x = num('x');
      const y = num('y');
      return x !== null && y !== null && TILE_IDS.has(o.tile as TileId)
        ? { a: 'tile', x, y, tile: o.tile as TileId }
        : null;
    }
    case 'place': {
      const x = num('x');
      const y = num('y');
      return x !== null &&
        y !== null &&
        KINDS.has(o.kind as string) &&
        (rot === 0 || rot === 1 || rot === 2 || rot === 3)
        ? { a: 'place', kind: o.kind as Kind, x, y, rot }
        : null;
    }
    case 'remove':
      return typeof o.id === 'string' ? { a: 'remove', id: o.id } : null;
    case 'rename':
      return typeof o.name === 'string' ? { a: 'rename', name: o.name.slice(0, MAX_NAME) } : null;
    default:
      return null;
  }
}
