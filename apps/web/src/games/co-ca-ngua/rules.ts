import { FINISH, HORSES, LAST_TRACK_STEP, spotOf, type House } from './board';

// Luật đi quân của Cờ cá ngựa, thuần dữ liệu: với một lần đổ, con nào đi được và tới đâu; đi xong
// thì đá con nào về chuồng. Vị trí mỗi con là số bước đã đi (xem board.ts: -1 là còn trong chuồng).

export type Rules = {
  /** Đổ mấy thì được ra quân. */
  enterOn: 'six' | 'oneOrSix';
  /** Đổ 6 được đổ thêm một lần. */
  bonusOnSix: boolean;
  /** Đi trúng ô có ngựa nhà khác thì đá con đó về chuồng. */
  kick: boolean;
  /** Trên đường về chuồng phải đổ đúng số của bậc kế tiếp mới được leo lên. */
  exactHome: boolean;
};

export const DEFAULT_RULES: Rules = {
  enterOn: 'oneOrSix',
  bonusOnSix: true,
  kick: true,
  exactHome: true,
};

/** Vị trí ngựa: horses[nhà][con] = số bước đã đi. */
export type Horses = number[][];
export type Move = { house: House; slot: number; to: number };

const canEnter = (roll: number, rules: Rules) =>
  roll === 6 || (rules.enterOn === 'oneOrSix' && roll === 1);

/** Ô tuyệt đối trên đường đi (để so ngựa các nhà với nhau), hoặc null nếu không ở đường đi. */
function trackIndex(house: House, progress: number): number | null {
  const s = spotOf(house, progress, 0);
  return s.kind === 'track' ? s.index : null;
}

/** Số bước con ngựa tới được với lần đổ này, hoặc null nếu không đi được. */
function target(progress: number, roll: number, rules: Rules): number | null {
  if (progress < 0) return null;
  if (progress >= FINISH) return null;
  if (progress > LAST_TRACK_STEP) {
    // Đang trên đường về chuồng: bậc hiện tại là progress - LAST_TRACK_STEP.
    const step = progress - LAST_TRACK_STEP;
    if (rules.exactHome) return roll === step + 1 ? progress + 1 : null;
    return progress + roll <= FINISH ? progress + roll : null;
  }
  const to = progress + roll;
  return to <= FINISH ? to : null;
}

export function legalMoves(horses: Horses, house: House, roll: number, rules: Rules): Move[] {
  const own = horses[house]!;
  const moves: Move[] = [];
  // Hai con cùng nhà không đứng chung một ô, trừ ô đích: cả bốn con đều phải về được đó.
  const ownAt = (to: number, except: number) =>
    to < FINISH && own.some((p, k) => k !== except && p === to && p >= 0);
  let enteredOne = false;
  for (let slot = 0; slot < HORSES; slot++) {
    const p = own[slot]!;
    if (p < 0) {
      // Mọi con trong chuồng như nhau: chỉ đưa ra một lựa chọn ra quân cho gọn.
      if (enteredOne || !canEnter(roll, rules) || ownAt(0, slot)) continue;
      enteredOne = true;
      moves.push({ house, slot, to: 0 });
      continue;
    }
    const to = target(p, roll, rules);
    if (to === null || ownAt(to, slot)) continue;
    moves.push({ house, slot, to });
  }
  return moves;
}

/** Các bước liên tiếp con ngựa đi qua (để vẽ nhảy từng ô). */
export function stepsBetween(from: number, to: number): number[] {
  if (from < 0) return [0];
  return Array.from({ length: to - from }, (_, i) => from + i + 1);
}

/** Con ngựa nhà khác đứng ở ô vừa tới (sẽ bị đá về chuồng), nếu có. */
export function kickedBy(
  horses: Horses,
  move: Move,
  rules: Rules,
): { house: House; slot: number } | null {
  if (!rules.kick) return null;
  const at = trackIndex(move.house, move.to);
  if (at === null) return null;
  for (let h = 0; h < 4; h++) {
    if (h === move.house) continue;
    const slot = horses[h]!.findIndex((p) => trackIndex(h as House, p) === at);
    if (slot >= 0) return { house: h as House, slot };
  }
  return null;
}

/** Số con đã về đích của một nhà. */
export const finished = (horses: Horses, house: House) =>
  horses[house]!.filter((p) => p >= FINISH).length;
