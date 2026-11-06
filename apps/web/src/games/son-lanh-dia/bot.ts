import { COLS, DIRS, idx, VEC, type Dir } from '../bong-bong-bum/map';
import {
  cellOf,
  isOpen,
  MAX_AMMO,
  SHOT_RANGE,
  type Input,
  type Match,
  type Player,
} from './engine';

// Bot Sơn Lãnh Địa: đi tìm vùng chưa phải màu phe mình gần nhất để sơn, gặp đối thủ đứng
// thẳng hàng trong tầm thì bắn. Độ khó chỉnh tốc độ suy nghĩ, độ chính xác và độ "tham".

export type Difficulty = 'easy' | 'medium' | 'hard';

const PROFILE: Record<Difficulty, { think: number; aim: number; spray: number; pick: number }> = {
  // think: giây giữa hai lần chọn đích · aim: xác suất bắn khi đối thủ thẳng hàng ·
  // spray: xác suất bắn để sơn đường khi đầy sơn · pick: chọn ngẫu nhiên trong bấy nhiêu đích gần nhất.
  easy: { think: 0.6, aim: 0.25, spray: 0.004, pick: 6 },
  medium: { think: 0.35, aim: 0.6, spray: 0.012, pick: 4 },
  hard: { think: 0.2, aim: 0.95, spray: 0.03, pick: 2 },
};

export type Brain = { diff: Difficulty; thinkT: number; path: number[] };

export function createBrain(diff: Difficulty): Brain {
  return { diff, thinkT: 0, path: [] };
}

/** Đường đi BFS từ ô của bot tới một trong những ô chưa thuộc phe mình gần nhất (chọn hơi ngẫu nhiên để các bot tản ra). */
function planPath(m: Match, p: Player, pick: number): number[] {
  const [sx, sy] = cellOf(p);
  const start = idx(sx, sy);
  const prev = new Map<number, number>([[start, -1]]);
  const queue = [start];
  const goals: number[] = [];
  // Ô đang có đồng đội đứng thì bỏ qua, để hai người cùng phe không giành nhau một chỗ.
  const mates = new Set(
    m.players.filter((o) => o.team === p.team && o.id !== p.id).map((o) => idx(...cellOf(o))),
  );
  while (queue.length && goals.length < pick) {
    const k = queue.shift()!;
    if (k !== start && m.paint[k] !== p.team && !mates.has(k)) goals.push(k);
    const x = k % COLS;
    const y = Math.floor(k / COLS);
    for (const d of DIRS) {
      const [dx, dy] = VEC[d];
      const nx = x + dx;
      const ny = y + dy;
      if (!isOpen(m, nx, ny)) continue;
      const nk = idx(nx, ny);
      if (prev.has(nk)) continue;
      prev.set(nk, k);
      queue.push(nk);
    }
  }
  const goal = goals[Math.floor(Math.random() * goals.length)];
  if (goal === undefined) return [];
  const path: number[] = [];
  for (let k = goal; k !== start; k = prev.get(k)!) path.unshift(k);
  return path;
}

/** Đối thủ đứng thẳng hàng phía trước trong tầm bắn, không có tường chắn. */
function enemyAhead(m: Match, p: Player, dir: Dir): boolean {
  const [x, y] = cellOf(p);
  const [dx, dy] = VEC[dir];
  for (let i = 1; i <= SHOT_RANGE; i++) {
    const cx = x + dx * i;
    const cy = y + dy * i;
    if (!isOpen(m, cx, cy)) return false;
    if (
      m.players.some(
        (o) =>
          o.team !== p.team &&
          o.stunT <= 0 &&
          o.safeT <= 0 &&
          cellOf(o)[0] === cx &&
          cellOf(o)[1] === cy,
      )
    )
      return true;
  }
  return false;
}

export function think(brain: Brain, m: Match, p: Player, dt: number): Input {
  if (p.stunT > 0) return { dir: null, fire: false };
  const prof = PROFILE[brain.diff];

  // Quay sang đối thủ đang thẳng hàng ở bất kỳ hướng nào rồi bắn.
  if (p.ammo >= 1 && p.cooldown <= 0) {
    for (const d of DIRS) {
      if (enemyAhead(m, p, d) && Math.random() < prof.aim * dt * 8) return { dir: d, fire: true };
    }
  }

  brain.thinkT -= dt;
  const nextGoal = brain.path[brain.path.length - 1];
  if (brain.thinkT <= 0 || nextGoal === undefined || m.paint[nextGoal] === p.team) {
    brain.thinkT = prof.think;
    brain.path = planPath(m, p, prof.pick);
  }

  // Bỏ các bước đã tới nơi.
  while (brain.path.length) {
    const k = brain.path[0]!;
    const tx = k % COLS;
    const ty = Math.floor(k / COLS);
    if (Math.abs(p.x - tx) + Math.abs(p.y - ty) > 0.08) break;
    brain.path.shift();
  }
  const k = brain.path[0];
  if (k === undefined) return { dir: null, fire: false };
  const tx = k % COLS;
  const ty = Math.floor(k / COLS);
  const dx = tx - p.x;
  const dy = ty - p.y;
  const dir: Dir =
    Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
  // Đầy sơn thì thỉnh thoảng bắn về phía trước để sơn đường nhanh hơn.
  const fire = p.ammo >= MAX_AMMO && Math.random() < prof.spray;
  return { dir, fire };
}
