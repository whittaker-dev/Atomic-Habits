import {
  bombAt,
  canEnter,
  cellOf,
  FUSE,
  speedOf,
  SPIRAL,
  SUDDEN_AT,
  SUDDEN_STEP,
  TRAP_TIME,
  type Input,
  type Match,
  type Player,
} from './engine';
import { COLS, DIRS, HARD, idx, ROWS, SOFT, VEC, type Dir } from './map';

// Bot chạy trên cùng trạng thái trận với người thật và chỉ trả về phím bấm (Input),
// nên chủ phòng mạng có thể cho bot chơi thay chỗ trống hoặc người rớt mạng.
// Ưu tiên mỗi lần suy nghĩ: thoát bong bóng → né vùng sắp nổ → hạ người bị nhốt → cứu đồng đội
// → nhặt vật phẩm → đặt bóng (chỉ khi có đường thoát) → đi tìm khối mềm / đối thủ.

export type Difficulty = 'easy' | 'medium' | 'hard';

const PROFILE: Record<
  Difficulty,
  { think: number; reach: number; chase: boolean; mistakes: number; needleWait: number }
> = {
  easy: { think: 0.45, reach: 4, chase: false, mistakes: 0.25, needleWait: 2.2 },
  medium: { think: 0.2, reach: 8, chase: true, mistakes: 0.08, needleWait: 0.8 },
  hard: { think: 0.08, reach: 14, chase: true, mistakes: 0, needleWait: 0.2 },
};

/** Thời gian chừa thêm khi tính đường thoát (rẽ góc phải thẳng làn mất thêm chút thời gian). */
const SAFETY = 0.15;

export type Brain = { diff: Difficulty; thinkT: number; path: number[]; wantBomb: boolean };

export function createBrain(diff: Difficulty): Brain {
  return { diff, thinkT: 0, path: [], wantBomb: false };
}

/** Thời gian (giây) tới khi mỗi ô bị nổ; Infinity là an toàn. Tính cả nổ dây chuyền. */
export function dangerMap(
  m: Match,
  extra?: { x: number; y: number; range: number; pierce: boolean },
): Float64Array {
  const danger = new Float64Array(COLS * ROWS).fill(Infinity);
  for (const bl of m.blasts) for (const k of bl.cells) danger[k] = 0;

  const bombs = m.bombs.map((b) => ({ x: b.x, y: b.y, range: b.range, pierce: b.pierce, t: b.t }));
  if (extra) bombs.push({ ...extra, t: FUSE });
  const crossOf = (b: (typeof bombs)[number]) => {
    const cells = [idx(b.x, b.y)];
    for (const dir of DIRS) {
      const [dx, dy] = VEC[dir];
      for (let i = 1; i <= b.range; i++) {
        const x = b.x + dx * i;
        const y = b.y + dy * i;
        if (x < 0 || y < 0 || x >= COLS || y >= ROWS || m.tiles[idx(x, y)] === HARD) break;
        cells.push(idx(x, y));
        // Bóng lửa nổ xuyên khối mềm — tính sai chỗ này thì bot tưởng an toàn và tự đứng vào tầm nổ.
        if ((m.tiles[idx(x, y)] === SOFT && !b.pierce) || bombs.some((o) => o.x === x && o.y === y))
          break;
      }
    }
    return cells;
  };
  const crosses = bombs.map(crossOf);
  // Dây chuyền: quả nằm trong tầm quả khác thì nổ sớm theo quả đó. Lặp tới khi ổn định.
  for (let changed = true; changed; ) {
    changed = false;
    bombs.forEach((a, i) => {
      for (const b of bombs) {
        if (b !== a && b.t > a.t && crosses[i]!.includes(idx(b.x, b.y))) {
          b.t = a.t;
          changed = true;
        }
      }
    });
  }
  bombs.forEach((b, i) => {
    for (const k of crosses[i]!) danger[k] = Math.min(danger[k]!, b.t);
  });

  // Đột tử: vài ô sắp bị khối rơi trúng cũng là nguy hiểm.
  if (m.time <= SUDDEN_AT) {
    let t = Math.max(0, m.suddenT);
    for (let i = m.suddenIdx, n = 0; i < SPIRAL.length && n < 10; i++) {
      const k = SPIRAL[i]!;
      if (m.tiles[k] === HARD) continue;
      danger[k] = Math.min(danger[k]!, t);
      t += SUDDEN_STEP;
      n++;
    }
  }
  return danger;
}

type Search = { dist: Int32Array; prev: Int32Array };

/** BFS từ ô hiện tại. Chỉ bước vào ô mà lúc tới nơi vẫn chưa bị nổ (chừa 0,2 giây). */
function search(m: Match, me: Player, danger: Float64Array, avoidDanger: boolean): Search {
  const dist = new Int32Array(COLS * ROWS).fill(-1);
  const prev = new Int32Array(COLS * ROWS).fill(-1);
  const [sx, sy] = cellOf(me);
  const start = idx(sx, sy);
  const perCell = 1 / speedOf(me);
  dist[start] = 0;
  const queue = [start];
  while (queue.length) {
    const k = queue.shift()!;
    const x = k % COLS;
    const y = Math.floor(k / COLS);
    for (const dir of DIRS) {
      const [dx, dy] = VEC[dir];
      const nx = x + dx;
      const ny = y + dy;
      if (!canEnter(m, me, nx, ny) || (bombAt(m, nx, ny) && idx(nx, ny) !== start)) continue;
      const n = idx(nx, ny);
      if (dist[n]! >= 0) continue;
      // Người còn tính là đứng trong một ô tới khi đi quá nửa ô kế tiếp, nên phải RỜI ô trước lúc nó nổ
      // (không chỉ tới kịp) — bỏ chỗ này là bot chạy xuyên qua ô sắp nổ và tự bị nhốt.
      const leave = (dist[k]! + 1.5) * perCell + SAFETY;
      if (danger[n] === 0) continue;
      if (avoidDanger ? danger[n]! < Infinity : danger[n]! < leave) continue;
      dist[n] = dist[k]! + 1;
      prev[n] = k;
      queue.push(n);
    }
  }
  return { dist, prev };
}

function pathTo(s: Search, goal: number): number[] {
  const path: number[] = [];
  for (let k = goal; s.dist[k]! > 0; k = s.prev[k]!) path.unshift(k);
  return path;
}

/** Ô gần nhất (trong `reach` bước) thoả điều kiện. */
function nearest(s: Search, reach: number, ok: (k: number) => boolean): number | null {
  let best: number | null = null;
  for (let k = 0; k < s.dist.length; k++) {
    const d = s.dist[k]!;
    if (d < 0 || d > reach || !ok(k)) continue;
    if (best === null || d < s.dist[best]!) best = k;
  }
  return best;
}

/** Đặt bóng ở đây có trúng khối mềm / đối thủ không. */
function bombHits(m: Match, me: Player, x: number, y: number, chase: boolean): boolean {
  for (const dir of DIRS) {
    const [dx, dy] = VEC[dir];
    for (let i = 1; i <= me.range; i++) {
      const cx = x + dx * i;
      const cy = y + dy * i;
      if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS || m.tiles[idx(cx, cy)] === HARD) break;
      if (m.tiles[idx(cx, cy)] === SOFT) return true;
      if (
        chase &&
        m.players.some(
          (o) =>
            o.state === 'alive' &&
            o.team !== me.team &&
            Math.round(o.x) === cx &&
            Math.round(o.y) === cy,
        )
      )
        return true;
    }
  }
  return false;
}

/**
 * Đặt bóng ở (x, y) có thoát được không. Đòi ít nhất 2 ô an toàn tới được: đo bằng mô phỏng, gần như mọi
 * lần bot tự nhốt là do bot khác đặt thêm bóng chặn mất đúng một lối thoát duy nhất.
 */
function hasEscape(m: Match, me: Player, x: number, y: number): boolean {
  const danger = dangerMap(m, { x, y, range: me.range, pierce: me.pierce });
  const s = search(m, me, danger, false);
  let safe = 0;
  for (let k = 0; k < s.dist.length && safe < 2; k++)
    if (s.dist[k]! >= 0 && danger[k] === Infinity) safe++;
  return safe >= 2;
}

function plan(brain: Brain, m: Match, me: Player, rnd: () => number) {
  const prof = PROFILE[brain.diff];
  const danger = dangerMap(m);
  const [cx, cy] = cellOf(me);
  const here = idx(cx, cy);
  brain.wantBomb = false;

  if (danger[here]! < Infinity) {
    const s = search(m, me, danger, false);
    const safe = nearest(s, 99, (k) => danger[k] === Infinity);
    if (safe !== null) {
      brain.path = pathTo(s, safe);
      return;
    }
    // Không còn ô an toàn tuyệt đối: chạy tới ô nổ muộn nhất thay vì đứng yên chịu trận
    // (thường vẫn kịp thoát khi vụ nổ trước tắt, hoặc ít nhất kéo dài thời gian cho đồng đội cứu).
    let best = here;
    for (let k = 0; k < s.dist.length; k++)
      if (s.dist[k]! > 0 && danger[k]! > danger[best]!) best = k;
    brain.path = best === here ? [] : pathTo(s, best);
    return;
  }

  const s = search(m, me, danger, true);
  const enemies = m.players.filter((o) => o.team !== me.team && o.state !== 'out');
  const at = (k: number) => (o: Player) => idx(Math.round(o.x), Math.round(o.y)) === k;

  const goals: (number | null)[] = [
    prof.chase
      ? nearest(s, prof.reach, (k) => enemies.some((o) => o.state === 'trapped' && at(k)(o)))
      : null,
    nearest(s, prof.reach, (k) =>
      m.players.some(
        (o) => o.team === me.team && o.id !== me.id && o.state === 'trapped' && at(k)(o),
      ),
    ),
    nearest(s, prof.reach, (k) => m.items.some((it) => idx(it.x, it.y) === k)),
  ];
  const goal = goals.find((g) => g !== null);
  if (goal !== undefined && goal !== null) {
    brain.path = pathTo(s, goal);
    return;
  }

  const ready = m.bombs.filter((b) => b.owner === me.id).length < me.bombs && !bombAt(m, cx, cy);
  if (
    ready &&
    rnd() > prof.mistakes &&
    bombHits(m, me, cx, cy, prof.chase) &&
    hasEscape(m, me, cx, cy)
  ) {
    brain.wantBomb = true;
    // Về đúng tâm ô rồi mới đặt (think chỉ bấm khi đã ở tâm).
    brain.path = [here];
    return;
  }

  // Đi tới chỗ đặt bóng được tiếp theo: ưu tiên đứng thẳng hàng với đối thủ (khi đuổi), không thì cạnh khối mềm.
  const spot = nearest(s, 99, (k) => {
    const x = k % COLS;
    const y = Math.floor(k / COLS);
    return k !== here && !bombAt(m, x, y) && bombHits(m, me, x, y, prof.chase);
  });
  if (spot !== null) {
    brain.path = pathTo(s, spot);
    return;
  }
  // Không còn gì để làm: đi lang thang một ô an toàn ngẫu nhiên.
  const options = DIRS.map((d) => [cx + VEC[d][0], cy + VEC[d][1]] as const).filter(
    ([x, y]) => s.dist[idx(x, y)] === 1,
  );
  const pick = options[Math.floor(rnd() * options.length)];
  brain.path = pick ? [idx(pick[0], pick[1])] : [];
}

export function think(
  brain: Brain,
  m: Match,
  me: Player,
  dt: number,
  rnd: () => number = Math.random,
): Input {
  if (me.state === 'out') return { dir: null, bomb: false };
  const prof = PROFILE[brain.diff];
  if (me.state === 'trapped') {
    return { dir: null, bomb: me.needles > 0 && TRAP_TIME - me.trapT >= prof.needleWait };
  }

  brain.thinkT -= dt;
  if (brain.thinkT <= 0) {
    brain.thinkT = prof.think;
    plan(brain, m, me, rnd);
  }

  // Đặt bóng chỉ khi đứng gần tâm ô, để tính đường thoát khớp với thực tế.
  const [cx, cy] = cellOf(me);
  const centered = Math.abs(me.x - cx) < 0.15 && Math.abs(me.y - cy) < 0.15;
  if (brain.wantBomb && centered) {
    brain.wantBomb = false;
    brain.thinkT = 0;
    // Kiểm tra lại ngay lúc bấm: từ lúc lên kế hoạch có thể đã có bóng mới chặn mất đường thoát.
    if (!hasEscape(m, me, cx, cy)) return { dir: null, bomb: false };
    return { dir: null, bomb: true };
  }

  while (brain.path.length) {
    const k = brain.path[0]!;
    const tx = k % COLS;
    const ty = Math.floor(k / COLS);
    const ddx = tx - me.x;
    const ddy = ty - me.y;
    if (Math.abs(ddx) < 0.05 && Math.abs(ddy) < 0.05) {
      brain.path.shift();
      continue;
    }
    // Thẳng làn trước rồi mới đi tiếp, để khớp kiểu di chuyển theo làn của engine.
    const dir: Dir = Math.abs(ddx) >= 0.05 ? (ddx > 0 ? 'right' : 'left') : ddy > 0 ? 'down' : 'up';
    return { dir, bomb: false };
  }
  return { dir: null, bomb: false };
}
