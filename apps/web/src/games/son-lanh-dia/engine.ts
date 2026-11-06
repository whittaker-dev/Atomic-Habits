import {
  COLS,
  EMPTY,
  HARD,
  idx,
  ROWS,
  SPAWNS,
  VEC,
  type Dir,
  type Tile,
} from '../bong-bong-bum/map';
import { arenaById, propAt, type ArenaId } from './arenas';

// Luật Sơn Lãnh Địa, thuần dữ liệu như engine của Bomb Arena: không đụng canvas, DOM hay mạng.
// Dùng chung lưới 15×13 và chỗ xuất phát với Bomb Arena; sân riêng nằm trong arenas.ts.
// Toạ độ người chơi tính theo ô, tâm ô (x, y) nằm ở số nguyên x, y.

export const TICK = 1 / 60;
export const MATCH_TIME = 120;
/** 10 giây cuối: đồng hồ đỏ và nhấp nháy để mọi người dốc sức. */
export const FINAL_AT = 10;
export const BASE_SPEED = 3.6;
export const MAX_AMMO = 3;
/** Giây để hồi một viên sơn. */
export const RELOAD = 1.2;
export const FIRE_COOLDOWN = 0.25;
export const SHOT_SPEED = 10;
export const SHOT_RANGE = 5;
/** Bị trúng bóng sơn: đứng hình chừng này giây, sau đó miễn trúng thêm một lúc để không bị khoá liên tục. */
export const STUN_TIME = 1.2;
export const SAFE_AFTER_STUN = 1.5;
/** Hai bên bóng sơn và người cách nhau dưới chừng này ô thì tính là trúng. */
const HIT_DIST = 0.55;
const CORNER_ASSIST = 0.3;

export const NONE = -1;

export type Input = { dir: Dir | null; fire: boolean };
export const NO_INPUT: Input = { dir: null, fire: false };

export type Player = {
  id: number;
  name: string;
  charId: string;
  team: number;
  bot: boolean;
  x: number;
  y: number;
  dir: Dir;
  moving: boolean;
  ammo: number;
  reloadT: number;
  cooldown: number;
  stunT: number;
  safeT: number;
  /** Số ô chính người này sơn sang màu phe mình (kể cả ô giành lại từ đối thủ). */
  painted: number;
  /** Số lần bắn trúng đối thủ. */
  hits: number;
};

export type Shot = {
  id: number;
  owner: number;
  team: number;
  x: number;
  y: number;
  dir: Dir;
  /** Quãng đường đã bay (ô). */
  flown: number;
};

/** Vệt sơn vừa văng ra, chỉ để vẽ hiệu ứng; tự hết sau `t` giây. */
export type Splash = { x: number; y: number; team: number; t: number };
export const SPLASH_TIME = 0.35;

export type Match = {
  arena: ArenaId;
  tiles: Tile[];
  /** Phe đang giữ từng ô (NONE = chưa sơn). Cùng chỉ số với `tiles`. */
  paint: number[];
  players: Player[];
  shots: Shot[];
  splashes: Splash[];
  time: number;
  elapsed: number;
  teams: boolean;
  nextId: number;
  over: boolean;
  /** Phe phủ nhiều ô nhất; null là hoà. Chỉ có nghĩa khi over = true. */
  winnerTeam: number | null;
};

export type PlayerSetup = { name: string; charId: string; bot: boolean };
export type MatchSetup = {
  arena: ArenaId;
  players: PlayerSetup[];
  teams?: boolean;
};

/** Ô có vật cản (bất kể loại nào) là HARD: chặn người và bóng sơn, không sơn được. */
export function createTiles(id: ArenaId): Tile[] {
  const arena = arenaById(id);
  const tiles: Tile[] = [];
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++) tiles.push(propAt(arena, x, y) ? HARD : EMPTY);
  return tiles;
}

export function createMatch(setup: MatchSetup): Match {
  if (setup.players.length > SPAWNS.length) throw new Error(`Tối đa ${SPAWNS.length} người`);
  const teams = setup.teams ?? false;
  const tiles = createTiles(setup.arena);
  const m: Match = {
    arena: setup.arena,
    tiles,
    paint: tiles.map(() => NONE),
    players: setup.players.map((p, i) => {
      const [x, y] = SPAWNS[i]!;
      return {
        id: i,
        name: p.name,
        charId: p.charId,
        team: teams ? i % 2 : i,
        bot: p.bot,
        x,
        y,
        dir: 'down',
        moving: false,
        ammo: MAX_AMMO,
        reloadT: 0,
        cooldown: 0,
        stunT: 0,
        safeT: 0,
        painted: 0,
        hits: 0,
      };
    }),
    shots: [],
    splashes: [],
    time: MATCH_TIME,
    elapsed: 0,
    teams,
    nextId: 1,
    over: false,
    winnerTeam: null,
  };
  return m;
}

export const cellOf = (p: { x: number; y: number }) => [Math.round(p.x), Math.round(p.y)] as const;
export const isOpen = (m: Match, x: number, y: number) =>
  x >= 0 && y >= 0 && x < COLS && y < ROWS && m.tiles[idx(x, y)] === EMPTY;

/** Sơn một ô cho phe của `by`; ghi công khi ô thật sự đổi màu. */
function paintCell(m: Match, x: number, y: number, by: Player) {
  if (!isOpen(m, x, y)) return;
  const k = idx(x, y);
  if (m.paint[k] === by.team) return;
  m.paint[k] = by.team;
  by.painted++;
}

// ---------------------------------------------------------------------------
// Di chuyển theo làn — cùng cách điều khiển với Bomb Arena để người chơi quen tay.
// ---------------------------------------------------------------------------

export function movePlayer(m: Match, p: Player, dir: Dir, dt: number) {
  const [dx, dy] = VEC[dir];
  const horizontal = dx !== 0;
  const d = horizontal ? dx : dy;
  let dist = BASE_SPEED * dt;
  let pos = horizontal ? p.x : p.y;
  let lane = horizontal ? p.y : p.x;
  const enter = (along: number, across: number) =>
    horizontal ? isOpen(m, along, across) : isOpen(m, across, along);

  const near = Math.round(lane);
  const off = lane - near;
  if (Math.abs(off) > 1e-6) {
    const cur = Math.round(pos);
    let target = near;
    const other = near + Math.sign(off);
    if (!enter(cur + d, near) && Math.abs(off) >= CORNER_ASSIST && enter(cur + d, other))
      target = other;
    const stepLen = Math.min(Math.abs(target - lane), dist);
    lane += Math.sign(target - lane) * stepLen;
    dist -= stepLen;
    if (Math.abs(target - lane) < 1e-6) lane = target;
  } else {
    lane = near;
  }

  if (dist > 0 && Number.isInteger(lane)) {
    const next = d > 0 ? Math.floor(pos + 1e-9) + 1 : Math.ceil(pos - 1e-9) - 1;
    if (enter(next, lane)) {
      pos += d * dist;
      if ((d > 0 ? pos > next : pos < next) && !enter(next + d, lane)) pos = next;
    }
  }

  const nx = horizontal ? pos : lane;
  const ny = horizontal ? lane : pos;
  p.moving = Math.abs(nx - p.x) > 1e-6 || Math.abs(ny - p.y) > 1e-6;
  p.x = nx;
  p.y = ny;
}

// ---------------------------------------------------------------------------
// Bóng sơn
// ---------------------------------------------------------------------------

function fire(m: Match, p: Player) {
  if (p.ammo < 1 || p.cooldown > 0) return;
  p.ammo--;
  p.cooldown = FIRE_COOLDOWN;
  const [x, y] = cellOf(p);
  m.shots.push({ id: m.nextId++, owner: p.id, team: p.team, x, y, dir: p.dir, flown: 0 });
}

/** Bóng vỡ: sơn ô trúng và bốn ô kề (hình dấu cộng), trừ ô khối cố định. */
function burst(m: Match, s: Shot, x: number, y: number) {
  const owner = m.players[s.owner]!;
  paintCell(m, x, y, owner);
  for (const [dx, dy] of Object.values(VEC)) paintCell(m, x + dx, y + dy, owner);
  m.splashes.push({ x, y, team: s.team, t: SPLASH_TIME });
}

function stepShot(m: Match, s: Shot, dt: number): boolean {
  const [dx, dy] = VEC[s.dir];
  const owner = m.players[s.owner]!;
  const move = Math.min(SHOT_SPEED * dt, SHOT_RANGE - s.flown);
  const prev = cellOf(s);
  s.x += dx * move;
  s.y += dy * move;
  s.flown += move;
  const [cx, cy] = cellOf(s);
  if (!isOpen(m, cx, cy)) {
    // Đụng tường: vỡ ở ô trống cuối cùng nó đi qua.
    burst(m, s, prev[0], prev[1]);
    return false;
  }
  // Bóng bay qua ô nào thì để lại vệt sơn ô đó.
  paintCell(m, cx, cy, owner);
  const victim = m.players.find(
    (o) =>
      o.team !== s.team &&
      o.stunT <= 0 &&
      o.safeT <= 0 &&
      Math.abs(o.x - s.x) < HIT_DIST &&
      Math.abs(o.y - s.y) < HIT_DIST,
  );
  if (victim) {
    victim.stunT = STUN_TIME;
    victim.moving = false;
    owner.hits++;
    burst(m, s, cx, cy);
    return false;
  }
  if (s.flown >= SHOT_RANGE - 1e-9) {
    burst(m, s, cx, cy);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Một bước mô phỏng
// ---------------------------------------------------------------------------

export function step(m: Match, inputs: readonly (Input | undefined)[], dt = TICK) {
  if (m.over) return;
  m.elapsed += dt;
  m.time = Math.max(0, m.time - dt);

  for (const p of m.players) {
    const input = inputs[p.id] ?? NO_INPUT;
    p.cooldown = Math.max(0, p.cooldown - dt);
    if (p.stunT > 0) {
      p.stunT -= dt;
      if (p.stunT <= 0) {
        p.stunT = 0;
        p.safeT = SAFE_AFTER_STUN;
      }
      continue;
    }
    p.safeT = Math.max(0, p.safeT - dt);
    if (p.ammo < MAX_AMMO) {
      p.reloadT += dt;
      if (p.reloadT >= RELOAD) {
        p.reloadT -= RELOAD;
        p.ammo++;
      }
    } else {
      p.reloadT = 0;
    }
    if (input.dir) p.dir = input.dir;
    if (input.fire) fire(m, p);
    if (input.dir) movePlayer(m, p, input.dir, dt);
    else p.moving = false;
    const [x, y] = cellOf(p);
    paintCell(m, x, y, p);
  }

  m.shots = m.shots.filter((s) => stepShot(m, s, dt));
  for (const sp of m.splashes) sp.t -= dt;
  m.splashes = m.splashes.filter((sp) => sp.t > 0);

  if (m.time <= 0) {
    m.over = true;
    const cover = coverage(m);
    const best = Math.max(...cover.values());
    const leaders = [...cover].filter(([, n]) => n === best);
    m.winnerTeam = leaders.length === 1 && best > 0 ? leaders[0]![0] : null;
  }
}

// ---------------------------------------------------------------------------
// Đếm lãnh địa và xếp hạng
// ---------------------------------------------------------------------------

/** Số ô sàn (không tính khối cố định) — mẫu số của phần trăm lãnh địa. */
export const floorCells = (m: Match) =>
  m.tiles.reduce<number>((n, t) => n + (t === EMPTY ? 1 : 0), 0);

/** Số ô mỗi phe đang giữ, đủ mặt mọi phe trong trận (phe chưa sơn được ô nào là 0). */
export function coverage(m: Match): Map<number, number> {
  const out = new Map<number, number>();
  for (const p of m.players) out.set(p.team, 0);
  for (const team of m.paint) if (team !== NONE) out.set(team, (out.get(team) ?? 0) + 1);
  return out;
}

export type Standing = { player: Player; rank: number; won: boolean; cells: number; share: number };

/** Phe nhiều ô xếp trên; cùng phe (chơi hai đội) thì ai sơn nhiều hơn xếp trên. */
export function standings(m: Match): Standing[] {
  const cover = coverage(m);
  const total = floorCells(m);
  const rows = m.players.map((p) => {
    const cells = cover.get(p.team) ?? 0;
    return {
      player: p,
      won: m.winnerTeam !== null && p.team === m.winnerTeam,
      cells,
      share: total ? cells / total : 0,
      rank: 0,
    };
  });
  rows.sort((a, b) => b.cells - a.cells || b.player.painted - a.player.painted);
  rows.forEach((r, i) => (r.rank = i + 1));
  return rows;
}
