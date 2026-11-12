import { BOARD, groupSquares, priceOf } from './data';
import {
  actor,
  canBuild,
  canMortgage,
  canSell,
  canUnmortgage,
  houseCost,
  ownedBy,
  playerOf,
  unmortgageCost,
  type Action,
  type Game,
} from './engine';

// Máy chơi Cờ tỷ phú: mua khi còn đủ tiền dự phòng hoặc khi đất gom đủ nhóm, trả giá đấu giá tới
// mức đáng, xây nhà khi rủng rỉnh, nhận đổi đất khi lợi rõ. Cũng dùng để đi thay người chơi online
// đang rớt mạng. Mỗi lần gọi trả về một thao tác (hoặc null nếu không phải lượt máy quyết định).

/** Tiền mặt máy luôn muốn giữ lại để trả thuê. */
const RESERVE = 2000;

/** Đất này có giúp người chơi gom đủ nhóm không. */
function completesGroup(g: Game, id: number, square: number) {
  const s = BOARD[square]!;
  if (s.kind !== 'land') return false;
  return groupSquares(s.group).every((sq) => sq === square || g.deeds[sq]!.owner === id);
}

/** Giá trị máy gán cho một ô đất khi đổi chác. */
function worth(g: Game, id: number, square: number) {
  return priceOf(BOARD[square]!) * (completesGroup(g, id, square) ? 1.8 : 1);
}

export function botAction(g: Game): { id: number; action: Action } | null {
  const id = actor(g);
  if (id === null) return null;
  const me = playerOf(g, id);
  const pend = g.pending;

  if (g.trade && g.trade.to === id) {
    const o = g.trade;
    const gets = o.giveProps.reduce((s, sq) => s + worth(g, id, sq), 0) + o.giveCash;
    // Mất đất thì tính cả việc người kia gom được nhóm.
    const loses = o.takeProps.reduce((s, sq) => s + worth(g, o.from, sq), 0) + o.takeCash;
    return { id, action: { a: 'respond', accept: gets >= loses * 1.1 } };
  }

  if (pend.kind === 'auction') {
    const price = priceOf(BOARD[pend.square]!);
    const limit = Math.min(
      price * (completesGroup(g, id, pend.square) ? 1.5 : 0.9),
      me.cash - RESERVE / 2,
    );
    const next = pend.bid + (pend.bid < price / 2 ? 100 : 50);
    return {
      id,
      action: next <= limit && pend.leader !== id ? { a: 'bid', amount: next } : { a: 'pass' },
    };
  }

  if (id !== g.turn) return null;

  if (pend.kind === 'debt') {
    if (me.cash >= pend.amount) return { id, action: { a: 'settle' } };
    const owned = ownedBy(g, id);
    const sell = owned.find((sq) => canSell(g, id, sq));
    if (sell !== undefined) return { id, action: { a: 'sell', square: sell } };
    const mort = owned.find((sq) => canMortgage(g, id, sq));
    if (mort !== undefined) return { id, action: { a: 'mortgage', square: mort } };
    return { id, action: { a: 'bankrupt' } };
  }

  if (pend.kind === 'buy') {
    const price = priceOf(BOARD[pend.square]!);
    const want =
      me.cash >= price && (me.cash - price >= RESERVE || completesGroup(g, id, pend.square));
    return { id, action: { a: want ? 'buy' : 'decline' } };
  }

  if (pend.kind === 'roll' || pend.kind === 'end') {
    // Rủng rỉnh thì chuộc đất, rồi xây nhà rẻ trước.
    const owned = ownedBy(g, id);
    const redeem = owned.find(
      (sq) => canUnmortgage(g, id, sq) && me.cash - unmortgageCost(sq) > RESERVE * 2,
    );
    if (redeem !== undefined) return { id, action: { a: 'unmortgage', square: redeem } };
    const build = owned
      .filter((sq) => canBuild(g, id, sq) && me.cash - houseCost(sq) > RESERVE)
      .sort((a, b) => houseCost(a) - houseCost(b))[0];
    if (build !== undefined) return { id, action: { a: 'build', square: build } };
  }

  if (pend.kind === 'roll') {
    if (me.inJail && me.freeCards > 0) return { id, action: { a: 'useCard' } };
    if (me.inJail && me.cash > 6000) return { id, action: { a: 'payJail' } };
    return { id, action: { a: 'roll' } };
  }
  if (pend.kind === 'end') return { id, action: { a: 'end' } };
  return null;
}
