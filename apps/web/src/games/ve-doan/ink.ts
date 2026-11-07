import { BRUSHES, INKS, PALETTE } from './theme';

// Nét vẽ dưới dạng dữ liệu. Người vẽ không gửi ảnh mà gửi từng thao tác nhỏ (đặt bút, thêm điểm,
// hoàn tác, xoá) theo toạ độ logic 640×480; mọi máy áp cùng thao tác lên cùng danh sách nét nên
// bảng vẽ giống hệt nhau, và gói tin chỉ vài trăm byte mỗi lần gửi.

export const W = 640;
export const H = 480;

export type Stroke = { color: string; size: number; points: number[] };

export type DrawOp =
  | { k: 'begin'; color: string; size: number; x: number; y: number }
  /** Thêm điểm vào nét cuối: mảng phẳng [x0, y0, x1, y1, …]. */
  | { k: 'to'; pts: number[] }
  | { k: 'undo' }
  | { k: 'clear' };

/** Cục tẩy là nét màu mặt bảng, to hơn bút. */
export const ERASER = PALETTE.board;
const COLORS = new Set<string>([...INKS.map((i) => i.hex), ERASER]);
const MAX_SIZE = Math.max(...BRUSHES) * 2.5;
/** Giới hạn để một máy gửi bậy không làm các máy khác treo vì vẽ quá nhiều. */
const MAX_POINTS = 60_000;

const clampX = (v: number) => Math.round(Math.min(W, Math.max(0, v)));
const clampY = (v: number) => Math.round(Math.min(H, Math.max(0, v)));

/** Chủ phòng lọc thao tác của khách trước khi chuyển tiếp: màu lạ, cỡ lạ, toạ độ ngoài bảng. */
export function sanitize(ops: unknown): DrawOp[] {
  if (!Array.isArray(ops)) return [];
  const out: DrawOp[] = [];
  for (const op of ops.slice(0, 200) as Partial<DrawOp>[]) {
    if (op?.k === 'begin') {
      const o = op as Extract<DrawOp, { k: 'begin' }>;
      if (!COLORS.has(o.color) || !(o.size > 0 && o.size <= MAX_SIZE)) continue;
      out.push({ k: 'begin', color: o.color, size: o.size, x: clampX(o.x), y: clampY(o.y) });
    } else if (op?.k === 'to') {
      const pts = (op as Extract<DrawOp, { k: 'to' }>).pts;
      if (!Array.isArray(pts)) continue;
      const clean = pts
        .slice(0, 400)
        .map((v, i) => (i % 2 ? clampY(Number(v) || 0) : clampX(Number(v) || 0)));
      if (clean.length % 2) clean.pop();
      out.push({ k: 'to', pts: clean });
    } else if (op?.k === 'undo' || op?.k === 'clear') out.push({ k: op.k });
  }
  return out;
}

const countPoints = (strokes: Stroke[]) => strokes.reduce((n, s) => n + s.points.length, 0);

/** Áp thao tác lên danh sách nét (sửa tại chỗ — bảng vẽ chạy nhiều lần mỗi giây). */
export function applyOps(strokes: Stroke[], ops: DrawOp[]): Stroke[] {
  for (const op of ops) {
    if (op.k === 'begin') strokes.push({ color: op.color, size: op.size, points: [op.x, op.y] });
    else if (op.k === 'to') {
      const last = strokes[strokes.length - 1];
      if (last && countPoints(strokes) < MAX_POINTS) last.points.push(...op.pts);
    } else if (op.k === 'undo') strokes.pop();
    else strokes.length = 0;
  }
  return strokes;
}

/** Vẽ toàn bộ nét lên canvas đang ở hệ toạ độ logic. */
export function paintStrokes(c: CanvasRenderingContext2D, strokes: Stroke[]) {
  c.fillStyle = PALETTE.board;
  c.fillRect(0, 0, W, H);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  for (const s of strokes) {
    const p = s.points;
    c.strokeStyle = s.color;
    c.fillStyle = s.color;
    c.lineWidth = s.size;
    if (p.length < 4) {
      // Chấm một cái: nét dài 0 không hiện nên vẽ chấm tròn.
      c.beginPath();
      c.arc(p[0] ?? 0, p[1] ?? 0, s.size / 2, 0, Math.PI * 2);
      c.fill();
      continue;
    }
    c.beginPath();
    c.moveTo(p[0]!, p[1]!);
    for (let i = 2; i < p.length; i += 2) c.lineTo(p[i]!, p[i + 1]!);
    c.stroke();
  }
}

/**
 * Bảng nét dùng chung trong một phòng: nhận thao tác từ người vẽ (của mình hoặc qua mạng) và báo
 * cho các canvas đang hiển thị vẽ lại.
 */
export type Ink = {
  strokes: Stroke[];
  apply: (ops: DrawOp[]) => void;
  reset: (strokes?: Stroke[]) => void;
  subscribe: (fn: () => void) => () => void;
};

export function createInk(): Ink {
  const listeners = new Set<() => void>();
  const ink: Ink = {
    strokes: [],
    apply: (ops) => {
      applyOps(ink.strokes, ops);
      listeners.forEach((fn) => fn());
    },
    reset: (strokes = []) => {
      ink.strokes = cloneStrokes(strokes);
      listeners.forEach((fn) => fn());
    },
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
  return ink;
}

export const cloneStrokes = (strokes: Stroke[]): Stroke[] =>
  strokes.map((s) => ({ ...s, points: [...s.points] }));
