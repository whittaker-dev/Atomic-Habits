// Khí của võ sĩ: mỗi bi nổ hay rơi nạp thêm khí, nổ liên tiếp nhanh (combo) nạp thêm nữa; khí tự
// tản dần theo thời gian, cấp càng cao tản càng nhanh. Khí vượt ngưỡng thì lên cấp (6 cấp), tụt
// xuống dưới ngưỡng một khoảng thì tụt cấp — bắn càng lẹ, phá càng nhiều thì càng lên cao.

/** Ngưỡng khí của từng cấp (cấp 1 là 0). */
export const THRESHOLDS = [0, 8, 18, 30, 44, 60] as const;
export const MAX_ENERGY = 72;
export const LEVELS = THRESHOLDS.length;
/** Tụt cấp khi khí thấp hơn ngưỡng cấp hiện tại chừng này (để không nhảy lên xuống liên tục). */
const HYSTERESIS = 4;
/** Hai lần nổ cách nhau dưới chừng này giây thì tính là combo. */
const COMBO_WINDOW = 4;

export type Power = {
  energy: number;
  /** Cấp hiện tại, 0..5 (hiển thị 1..6). */
  level: number;
  /** Cấp cao nhất đã đạt trong ván. */
  peak: number;
  combo: number;
  /** Thời điểm (giây trong ván) lần nổ gần nhất. */
  lastPop: number;
};

export const createPower = (): Power => ({ energy: 0, level: 0, peak: 0, combo: 0, lastPop: -99 });

function settle(p: Power) {
  while (p.level < LEVELS - 1 && p.energy >= THRESHOLDS[p.level + 1]!) p.level++;
  while (p.level > 0 && p.energy < THRESHOLDS[p.level]! - HYSTERESIS) p.level--;
  p.peak = Math.max(p.peak, p.level);
}

/** Nạp khí sau một phát nổ. `t`: giây trong ván. Trả về cấp trước đó (để biết vừa lên cấp). */
export function charge(p: Power, popped: number, dropped: number, t: number): number {
  const before = p.level;
  if (popped <= 0) {
    p.combo = 0;
    return before;
  }
  p.combo = t - p.lastPop <= COMBO_WINDOW ? p.combo + 1 : 1;
  p.lastPop = t;
  const gain = popped * 1.2 + dropped * 2 + (p.combo - 1) * 2.5;
  p.energy = Math.min(MAX_ENERGY, p.energy + gain);
  settle(p);
  return before;
}

/** Khí tản theo thời gian trôi `dt` giây. */
export function drain(p: Power, dt: number) {
  p.energy = Math.max(0, p.energy - dt * (0.9 + p.level * 0.45));
  settle(p);
}

/** Phần khí trong cấp hiện tại (0..1), cho thanh nạp. */
export function progress(p: Power) {
  if (p.level >= LEVELS - 1)
    return Math.min(1, (p.energy - THRESHOLDS[p.level]!) / (MAX_ENERGY - THRESHOLDS[p.level]!));
  const lo = THRESHOLDS[p.level]!;
  const hi = THRESHOLDS[p.level + 1]!;
  return Math.max(0, Math.min(1, (p.energy - lo) / (hi - lo)));
}
