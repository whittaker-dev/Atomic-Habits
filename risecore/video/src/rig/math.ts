export type V = {x: number; y: number};
export const v = (x: number, y: number): V => ({x, y});
export const add = (a: V, b: V) => v(a.x + b.x, a.y + b.y);
export const sub = (a: V, b: V) => v(a.x - b.x, a.y - b.y);
export const mul = (a: V, k: number) => v(a.x * k, a.y * k);
export const len = (a: V) => Math.hypot(a.x, a.y);
export const norm = (a: V) => {
  const l = len(a) || 1;
  return v(a.x / l, a.y / l);
};
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerpV = (a: V, b: V, t: number) => v(lerp(a.x, b.x, t), lerp(a.y, b.y, t));
export const polar = (o: V, ang: number, l: number) => v(o.x + Math.cos(ang) * l, o.y + Math.sin(ang) * l);

/** Two-bone IK. `pick` chooses between the two elbow solutions. */
export function ik(s: V, target: V, l1: number, l2: number, pick: (a: V, b: V) => V) {
  const d0 = sub(target, s);
  const d = Math.max(Math.abs(l1 - l2) + 0.5, Math.min(l1 + l2 - 0.5, len(d0)));
  const a = Math.atan2(d0.y, d0.x);
  const c = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
  const off = Math.acos(Math.max(-1, Math.min(1, c)));
  const e1 = polar(s, a + off, l1);
  const e2 = polar(s, a - off, l1);
  return {elbow: pick(e1, e2), hand: polar(s, a, d)};
}
export const lower = (a: V, b: V) => (a.y > b.y ? a : b);
export const upper = (a: V, b: V) => (a.y < b.y ? a : b);
export const righter = (a: V, b: V) => (a.x > b.x ? a : b);
export const lefter = (a: V, b: V) => (a.x < b.x ? a : b);

const ease = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * x);

/** One rep = top(0) -> bottom(1) -> top(0). Returns position and completed reps. */
export function rep(frame: number, start: number, period: number, downFrac = 0.55) {
  if (frame < start) return {v: 0, count: 0};
  const t = frame - start;
  const p = (t % period) / period;
  const val = p < downFrac ? ease(p / downFrac) : 1 - ease((p - downFrac) / (1 - downFrac));
  return {v: val, count: Math.floor(t / period)};
}
