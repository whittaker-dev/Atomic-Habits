import {
  COLS,
  createMap,
  EMPTY,
  HARD,
  idx,
  nextRandom,
  ROWS,
  SOFT,
  SPAWNS,
  themeById,
  VEC,
  type Dir,
  type ThemeId,
  type Tile,
} from './map';

// Logic trận đấu thuần: không đụng canvas, DOM hay mạng. Trạng thái là dữ liệu thường
// (số, mảng, object) để chủ phòng gửi được qua mạng và test chạy được trong Node.
// Toạ độ người chơi tính theo ô: tâm ô (x, y) nằm đúng ở số nguyên x, y.

export const TICK = 1 / 60;
export const FUSE = 2.5;
export const BLAST_TIME = 0.5;
export const TRAP_TIME = 4;
export const SHIELD_TIME = 3;
export const MATCH_TIME = 180;
export const SUDDEN_AT = 30;
/** Mỗi bao lâu một khối cố định rơi xuống khi đột tử; đủ chậm để lấp gần hết bản đồ trong 30 giây. */
export const SUDDEN_STEP = 0.18;
/** Sau khi được cứu hoặc tự chọc bong bóng: miễn nổ chừng này giây để không bị nhốt lại ngay. */
export const SAFE_AFTER_FREE = 1;
export const BASE_SPEED = 3.4;
export const SPEED_STEP = 0.7;
export const MAX_SPEED_UPS = 3;
export const TRAPPED_SPEED = 0.8;
export const MAX_BOMBS = 8;
export const MAX_RANGE = 8;
export const DROP_CHANCE = 0.32;
/** Lệch khỏi hàng quá chừng này (tính theo ô) thì được trượt sang hàng bên cạnh khi bị chặn — "cua góc" kiểu game xưa. */
const CORNER_ASSIST = 0.3;
/** Hai người cách nhau dưới chừng này ô thì tính là chạm nhau. */
const TOUCH = 0.7;

export type ItemKind =
  | 'bomb'
  | 'range'
  | 'speed'
  | 'needle'
  | 'shield'
  | 'superBomb'
  | 'fireBomb'
  | 'clone'
  | 'teleport'
  | 'life'
  | 'hole';
const ITEM_WEIGHTS: [ItemKind, number][] = [
  ['bomb', 22],
  ['range', 18],
  ['speed', 14],
  ['needle', 8],
  ['shield', 8],
  ['superBomb', 5],
  ['fireBomb', 6],
  ['clone', 5],
  ['teleport', 7],
  ['life', 4],
  ['hole', 5],
];
/** Phân thân tồn tại chừng này giây rồi tự tan. */
export const CLONE_TIME = 8;
export const MAX_LIVES = 2;
export const HOLE_RADIUS = 3;
export const HOLE_TIME = 0.8;
/** Sau khi dùng mạng phụ để sống lại: miễn nổ lâu hơn một chút để kịp chạy. */
export const SAFE_AFTER_REVIVE = 2;

export type Input = { dir: Dir | null; bomb: boolean };
export const NO_INPUT: Input = { dir: null, bomb: false };

export type PlayerState = 'alive' | 'trapped' | 'out';
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
  state: PlayerState;
  trapT: number;
  /** Ai đặt quả bóng đã nhốt người này — để tính "đã hạ". */
  trappedBy: number | null;
  safeT: number;
  shieldT: number;
  bombs: number;
  range: number;
  speedUps: number;
  needles: number;
  /** Bóng lửa: vụ nổ xuyên qua khối mềm. */
  pierce: boolean;
  /** Mạng phụ: bị loại thì sống lại tại chỗ, dùng hết mới bị loại thật. */
  lives: number;
  /** Có giá trị nếu người này là phân thân của người chơi khác (id chủ). */
  cloneOf: number | null;
  cloneT: number;
  kos: number;
  items: number;
  /** Thời điểm (giây từ đầu trận) bị loại; dùng để xếp hạng. */
  outAt: number | null;
};
export type Bomb = {
  id: number;
  x: number;
  y: number;
  owner: number;
  range: number;
  pierce: boolean;
  t: number;
  passers: number[];
};
export type Blast = {
  x: number;
  y: number;
  up: number;
  down: number;
  left: number;
  right: number;
  owner: number;
  cells: number[];
  t: number;
};
export type Item = { x: number; y: number; kind: ItemKind };
export type Hole = { x: number; y: number; t: number };

export type Match = {
  theme: ThemeId;
  tiles: Tile[];
  players: Player[];
  bombs: Bomb[];
  blasts: Blast[];
  items: Item[];
  /** Hố Đen đang xoáy (chỉ để vẽ hiệu ứng): vị trí và thời gian còn lại. */
  holes: Hole[];
  /** Thời gian còn lại của trận. */
  time: number;
  elapsed: number;
  teams: boolean;
  dropChance: number;
  suddenIdx: number;
  suddenT: number;
  nextId: number;
  rng: number;
  over: boolean;
  /** Đội thắng; null là hoà. Chỉ có nghĩa khi over = true. */
  winnerTeam: number | null;
};

export type PlayerSetup = { name: string; charId: string; bot: boolean };
export type MatchSetup = {
  theme: ThemeId;
  seed: number;
  players: PlayerSetup[];
  teams?: boolean;
  dropChance?: number;
};

export function createMatch(setup: MatchSetup): Match {
  if (setup.players.length > SPAWNS.length) throw new Error(`Tối đa ${SPAWNS.length} người`);
  const teams = setup.teams ?? false;
  return {
    theme: setup.theme,
    tiles: createMap(setup.seed, themeById(setup.theme)),
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
        state: 'alive',
        trapT: 0,
        trappedBy: null,
        safeT: 0,
        shieldT: 0,
        bombs: 1,
        range: 1,
        speedUps: 0,
        needles: 0,
        pierce: false,
        lives: 0,
        cloneOf: null,
        cloneT: 0,
        kos: 0,
        items: 0,
        outAt: null,
      };
    }),
    bombs: [],
    blasts: [],
    items: [],
    holes: [],
    time: MATCH_TIME,
    elapsed: 0,
    teams,
    dropChance: setup.dropChance ?? DROP_CHANCE,
    suddenIdx: 0,
    suddenT: 0,
    nextId: 1,
    rng: (setup.seed ^ 0x9e3779b9) >>> 0,
    over: false,
    winnerTeam: null,
  };
}

function rand(m: Match): number {
  const [v, next] = nextRandom(m.rng);
  m.rng = next;
  return v;
}

export const cellOf = (p: { x: number; y: number }) => [Math.round(p.x), Math.round(p.y)] as const;
export const bombAt = (m: Match, x: number, y: number) =>
  m.bombs.find((b) => b.x === x && b.y === y);
export const speedOf = (p: Player) =>
  p.state === 'trapped' ? TRAPPED_SPEED : BASE_SPEED + p.speedUps * SPEED_STEP;

/** Ô người này đi vào được: trong bản đồ, trống, không có bóng — trừ bóng họ còn đang đứng đè lên. */
export function canEnter(m: Match, p: Player, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return false;
  if (m.tiles[idx(x, y)] !== EMPTY) return false;
  const b = bombAt(m, x, y);
  return !b || b.passers.includes(p.id);
}

// ---------------------------------------------------------------------------
// Di chuyển theo làn: luôn có ít nhất một trục nằm đúng tâm ô, giống game đặt bom cổ điển.
// ---------------------------------------------------------------------------

/** Xuất ra để máy khách mạng tự đoán trước chuyển động của chính mình bằng đúng luật này. */
export function movePlayer(m: Match, p: Player, dir: Dir, dt: number) {
  const [dx, dy] = VEC[dir];
  const horizontal = dx !== 0;
  const d = horizontal ? dx : dy;
  let dist = speedOf(p) * dt;
  let pos = horizontal ? p.x : p.y;
  let lane = horizontal ? p.y : p.x;
  const enter = (along: number, across: number) =>
    horizontal ? canEnter(m, p, along, across) : canEnter(m, p, across, along);

  // 1) Chưa thẳng làn: trượt về làn gần nhất trước (hoặc làn bên cạnh nếu làn gần bị chặn mà làn kia mở).
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

  // 2) Đã thẳng làn: tiến dọc làn tới khi gặp ô không vào được.
  if (dist > 0 && Number.isInteger(lane)) {
    const next = d > 0 ? Math.floor(pos + 1e-9) + 1 : Math.ceil(pos - 1e-9) - 1;
    if (enter(next, lane)) {
      pos += d * dist;
      // Vượt quá tâm ô kế tiếp mà ô sau nữa bị chặn thì dừng ở tâm.
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
// Bóng nổ
// ---------------------------------------------------------------------------

function activeBombs(m: Match, owner: number) {
  return m.bombs.reduce((n, b) => n + (b.owner === owner ? 1 : 0), 0);
}

function placeBomb(m: Match, p: Player) {
  const [x, y] = cellOf(p);
  if (bombAt(m, x, y) || activeBombs(m, p.id) >= p.bombs) return;
  const passers = m.players
    .filter((o) => o.state !== 'out' && Math.abs(o.x - x) < 1 && Math.abs(o.y - y) < 1)
    .map((o) => o.id);
  m.bombs.push({
    id: m.nextId++,
    x,
    y,
    owner: p.id,
    range: p.range,
    pierce: p.pierce,
    t: FUSE,
    passers,
  });
  // Quả bóng nằm giữa vụ nổ đang cháy thì nổ luôn.
  if (m.blasts.some((bl) => bl.cells.includes(idx(x, y)))) explode(m, m.bombs[m.bombs.length - 1]!);
}

/** Nổ một quả bóng và mọi quả nó chạm tới (dây chuyền). Khối mềm bị phá sau cùng để các nhánh cùng lúc đều dừng ở đó. */
export function explode(m: Match, first: Bomb) {
  const queue = [first];
  m.bombs = m.bombs.filter((b) => b !== first);
  const broken = new Set<number>();
  while (queue.length) {
    const b = queue.shift()!;
    const cells = [idx(b.x, b.y)];
    const arm = (dir: Dir) => {
      const [dx, dy] = VEC[dir];
      let len = 0;
      for (let i = 1; i <= b.range; i++) {
        const x = b.x + dx * i;
        const y = b.y + dy * i;
        if (x < 0 || y < 0 || x >= COLS || y >= ROWS) break;
        const k = idx(x, y);
        if (m.tiles[k] === HARD) break;
        len = i;
        cells.push(k);
        if (m.tiles[k] === SOFT) {
          broken.add(k);
          if (b.pierce) continue;
          break;
        }
        const other = bombAt(m, x, y);
        if (other) {
          m.bombs = m.bombs.filter((o) => o !== other);
          queue.push(other);
          break;
        }
        const item = m.items.findIndex((it) => it.x === x && it.y === y);
        if (item >= 0) {
          m.items.splice(item, 1);
          break;
        }
      }
      return len;
    };
    const up = arm('up');
    const down = arm('down');
    const left = arm('left');
    const right = arm('right');
    m.blasts.push({ x: b.x, y: b.y, up, down, left, right, owner: b.owner, cells, t: BLAST_TIME });
  }
  for (const k of broken) {
    m.tiles[k] = EMPTY;
    const kind = rollDrop(m);
    if (kind) m.items.push({ x: k % COLS, y: Math.floor(k / COLS), kind });
  }
}

export function rollDrop(m: Match): ItemKind | null {
  if (rand(m) >= m.dropChance) return null;
  const total = ITEM_WEIGHTS.reduce((s, [, w]) => s + w, 0);
  let r = rand(m) * total;
  for (const [kind, w] of ITEM_WEIGHTS) {
    r -= w;
    if (r < 0) return kind;
  }
  return ITEM_WEIGHTS[0]![0];
}

function applyItem(m: Match, p: Player, kind: ItemKind) {
  p.items++;
  switch (kind) {
    case 'bomb':
      p.bombs = Math.min(MAX_BOMBS, p.bombs + 1);
      break;
    case 'range':
      p.range = Math.min(MAX_RANGE, p.range + 1);
      break;
    case 'superBomb':
      p.range = MAX_RANGE;
      break;
    case 'fireBomb':
      p.pierce = true;
      break;
    case 'speed':
      p.speedUps = Math.min(MAX_SPEED_UPS, p.speedUps + 1);
      break;
    case 'needle':
      p.needles = Math.min(3, p.needles + 1);
      break;
    case 'shield':
      p.shieldT = SHIELD_TIME;
      break;
    case 'life':
      p.lives = Math.min(MAX_LIVES, p.lives + 1);
      break;
    case 'teleport':
      teleport(m, p);
      break;
    case 'clone':
      spawnClone(m, p);
      break;
    case 'hole':
      blackHole(m, p);
      break;
  }
}

/**
 * Hố Đen: nuốt mọi quả bóng đang chờ nổ trong vùng HOLE_RADIUS ô quanh người nhặt (tính theo cạnh hình vuông),
 * không nổ, không phá gì — vật phẩm thoát hiểm khi bị vây giữa nhiều bóng.
 */
function blackHole(m: Match, p: Player) {
  const [px, py] = cellOf(p);
  m.bombs = m.bombs.filter((b) => Math.max(Math.abs(b.x - px), Math.abs(b.y - py)) > HOLE_RADIUS);
  m.holes.push({ x: px, y: py, t: HOLE_TIME });
}

/** Ô trống, không bóng, không vật phẩm, không nằm trong vụ nổ. */
function freeCells(m: Match): number[] {
  const out: number[] = [];
  for (let k = 0; k < m.tiles.length; k++) {
    const x = k % COLS;
    const y = Math.floor(k / COLS);
    if (m.tiles[k] !== EMPTY || bombAt(m, x, y) || m.items.some((it) => it.x === x && it.y === y))
      continue;
    if (m.blasts.some((bl) => bl.cells.includes(k))) continue;
    out.push(k);
  }
  return out;
}

/** Dịch chuyển tới một ô trống ngẫu nhiên, ưu tiên ô cách xa ít nhất 5 bước. */
function teleport(m: Match, p: Player) {
  const [px, py] = cellOf(p);
  const cells = freeCells(m);
  const far = cells.filter(
    (k) => Math.abs((k % COLS) - px) + Math.abs(Math.floor(k / COLS) - py) >= 5,
  );
  const pool = far.length ? far : cells;
  const k = pool[Math.floor(rand(m) * pool.length)];
  if (k === undefined) return;
  p.x = k % COLS;
  p.y = Math.floor(k / COLS);
  p.moving = false;
}

/** Phân thân: một bot cùng đội đứng tại chỗ người nhặt, tự tan sau CLONE_TIME giây. Không tính vào thắng thua. */
function spawnClone(m: Match, owner: Player) {
  const id = m.players.length;
  m.players.push({
    ...owner,
    id,
    name: `${owner.name} (bản sao)`,
    bot: true,
    cloneOf: owner.id,
    cloneT: CLONE_TIME,
    state: 'alive',
    trapT: 0,
    trappedBy: null,
    safeT: SAFE_AFTER_FREE,
    shieldT: 0,
    bombs: 1,
    range: owner.range,
    needles: 0,
    lives: 0,
    kos: 0,
    items: 0,
    outAt: null,
  });
}

// ---------------------------------------------------------------------------
// Bị nhốt / được cứu / bị loại
// ---------------------------------------------------------------------------

function trap(m: Match, p: Player, by: number) {
  if (p.state !== 'alive' || p.shieldT > 0 || p.safeT > 0) return;
  if (p.cloneOf !== null) {
    // Phân thân trúng nổ thì vỡ luôn, không có bong bóng.
    eliminate(m, p, by);
    return;
  }
  p.state = 'trapped';
  p.trapT = TRAP_TIME;
  p.trappedBy = by;
  p.moving = false;
}

function free(p: Player) {
  p.state = 'alive';
  p.trapT = 0;
  p.trappedBy = null;
  p.safeT = SAFE_AFTER_FREE;
}

/** Người được tính công khi `id` hạ ai đó: phân thân ghi công cho chủ của nó. */
const creditOf = (m: Match, id: number) => {
  const p = m.players[id];
  return p && p.cloneOf !== null ? m.players[p.cloneOf] : p;
};

function eliminate(m: Match, p: Player, by: number | null, crushed = false) {
  if (p.lives > 0 && !crushed) {
    p.lives--;
    free(p);
    p.safeT = SAFE_AFTER_REVIVE;
    return;
  }
  p.state = 'out';
  p.outAt = m.elapsed;
  p.moving = false;
  if (p.cloneOf !== null) return;
  const killer = by === null ? undefined : creditOf(m, by);
  if (killer && killer.id !== p.id && killer.team !== p.team) killer.kos++;
}

// ---------------------------------------------------------------------------
// Đột tử: khối cố định rơi theo vòng xoắn từ mép vào giữa
// ---------------------------------------------------------------------------

export const SPIRAL: number[] = (() => {
  const out: number[] = [];
  let [x0, y0, x1, y1] = [0, 0, COLS - 1, ROWS - 1];
  while (x0 <= x1 && y0 <= y1) {
    for (let x = x0; x <= x1; x++) out.push(idx(x, y0));
    for (let y = y0 + 1; y <= y1; y++) out.push(idx(x1, y));
    if (y0 < y1) for (let x = x1 - 1; x >= x0; x--) out.push(idx(x, y1));
    if (x0 < x1) for (let y = y1 - 1; y > y0; y--) out.push(idx(x0, y));
    x0++;
    y0++;
    x1--;
    y1--;
  }
  return out;
})();

function dropBlock(m: Match) {
  while (m.suddenIdx < SPIRAL.length && m.tiles[SPIRAL[m.suddenIdx]!] === HARD) m.suddenIdx++;
  const k = SPIRAL[m.suddenIdx++];
  if (k === undefined) return;
  const x = k % COLS;
  const y = Math.floor(k / COLS);
  m.tiles[k] = HARD;
  m.bombs = m.bombs.filter((b) => b.x !== x || b.y !== y);
  m.items = m.items.filter((it) => it.x !== x || it.y !== y);
  for (const p of m.players) {
    const [px, py] = cellOf(p);
    if (p.state !== 'out' && px === x && py === y) eliminate(m, p, null, true);
  }
}

// ---------------------------------------------------------------------------
// Một bước mô phỏng
// ---------------------------------------------------------------------------

export function step(m: Match, inputs: readonly (Input | undefined)[], dt = TICK) {
  if (m.over) return;
  m.elapsed += dt;
  m.time = Math.max(0, m.time - dt);

  for (const p of m.players) {
    if (p.state === 'out') continue;
    const input = inputs[p.id] ?? NO_INPUT;
    p.shieldT = Math.max(0, p.shieldT - dt);
    p.safeT = Math.max(0, p.safeT - dt);
    if (p.cloneOf !== null) {
      p.cloneT -= dt;
      if (p.cloneT <= 0) {
        eliminate(m, p, null);
        continue;
      }
    }
    if (input.dir) p.dir = input.dir;
    if (p.state === 'trapped') {
      p.trapT -= dt;
      if (input.bomb && p.needles > 0) {
        p.needles--;
        free(p);
      } else if (p.trapT <= 0) {
        eliminate(m, p, p.trappedBy);
        continue;
      }
    } else if (input.bomb) {
      placeBomb(m, p);
    }
    if (input.dir) movePlayer(m, p, input.dir, dt);
    else p.moving = false;
  }

  for (const b of m.bombs) {
    b.passers = b.passers.filter((id) => {
      const p = m.players[id];
      return !!p && p.state !== 'out' && Math.abs(p.x - b.x) < 1 && Math.abs(p.y - b.y) < 1;
    });
  }

  for (const b of [...m.bombs]) {
    b.t -= dt;
    if (b.t <= 0 && m.bombs.includes(b)) explode(m, b);
  }

  for (const h of m.holes) h.t -= dt;
  m.holes = m.holes.filter((h) => h.t > 0);
  for (const bl of m.blasts) bl.t -= dt;
  m.blasts = m.blasts.filter((bl) => bl.t > 0);
  for (const bl of m.blasts) {
    for (const p of m.players) {
      const [px, py] = cellOf(p);
      if (bl.cells.includes(idx(px, py))) trap(m, p, bl.owner);
    }
  }

  // Chạm vào người đang bị nhốt: đồng đội thì cứu, đối thủ thì loại.
  for (const t of m.players) {
    if (t.state !== 'trapped') continue;
    const toucher = m.players.find(
      (o) =>
        o.state === 'alive' &&
        o.id !== t.id &&
        Math.abs(o.x - t.x) < TOUCH &&
        Math.abs(o.y - t.y) < TOUCH,
    );
    if (!toucher) continue;
    if (toucher.team === t.team) free(t);
    else eliminate(m, t, toucher.id);
  }

  for (const p of m.players) {
    if (p.state !== 'alive') continue;
    const [px, py] = cellOf(p);
    const i = m.items.findIndex((it) => it.x === px && it.y === py);
    if (i >= 0) applyItem(m, p, m.items.splice(i, 1)[0]!.kind);
  }

  if (m.time <= SUDDEN_AT) {
    m.suddenT -= dt;
    while (m.suddenT <= 0 && m.suddenIdx < SPIRAL.length) {
      dropBlock(m);
      m.suddenT += SUDDEN_STEP;
    }
  }

  const teamsLeft = new Set(
    m.players.filter((p) => p.state !== 'out' && p.cloneOf === null).map((p) => p.team),
  );
  if (teamsLeft.size <= 1 || m.time <= 0) {
    m.over = true;
    m.winnerTeam = teamsLeft.size === 1 ? [...teamsLeft][0]! : null;
  }
}

// ---------------------------------------------------------------------------
// Kết quả
// ---------------------------------------------------------------------------

export type Standing = { player: Player; rank: number; won: boolean; score: number };

export const scoreOf = (p: Player, won: boolean) => p.kos * 100 + p.items * 10 + (won ? 300 : 0);

/** Đội thắng đứng đầu; còn lại ai trụ lâu hơn xếp trên, bằng nhau thì xét điểm. */
export function standings(m: Match): Standing[] {
  const rows = m.players
    .filter((p) => p.cloneOf === null)
    .map((p) => {
      const won = m.winnerTeam !== null && p.team === m.winnerTeam;
      return { player: p, won, score: scoreOf(p, won), rank: 0 };
    });
  const survived = (p: Player) => p.outAt ?? Infinity;
  rows.sort(
    (a, b) =>
      Number(b.won) - Number(a.won) || survived(b.player) - survived(a.player) || b.score - a.score,
  );
  rows.forEach((r, i) => (r.rank = i + 1));
  return rows;
}
