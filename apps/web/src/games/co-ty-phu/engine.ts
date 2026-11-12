import {
  BOARD,
  GIFT,
  GO_SALARY,
  GROUPS,
  groupSquares,
  HOTEL,
  isOwnable,
  JAIL,
  JAIL_FINE,
  LUCK,
  priceOf,
  SIZE,
  STATIONS,
  UTILITIES,
  type Card,
} from './data';

// Ván Cờ tỷ phú, thuần dữ liệu: mọi thao tác đi qua act(), bên giữ ván (một máy, hoặc chủ phòng
// online) bốc số xúc xắc và gọi act() cho mọi người. Mỗi thao tác hợp lệ tăng `seq` và ghi lại các
// sự kiện vừa xảy ra (`events`) — màn hình dựa vào đó diễn hoạt cảnh (xúc xắc, quân đi, trả tiền,
// rút thẻ) trước khi hiện thế cờ mới.

export type SeatKind = 'human' | 'bot' | 'empty';
export type Seat = {
  id: number;
  name: string;
  kind: SeatKind;
  connected: boolean;
  /** Nhân vật làm quân (roster.ts); luật chơi không dùng tới. Ván lưu cũ có thể thiếu. */
  character?: string;
};

/** full: đánh tới khi còn một người; rounds: đủ số vòng; timed: hết giờ. Hết thì ai giàu nhất thắng. */
export type Settings = {
  mode: 'full' | 'rounds' | 'timed';
  rounds: number;
  minutes: number;
  startCash: number;
};
export const DEFAULT_SETTINGS: Settings = {
  mode: 'rounds',
  rounds: 20,
  minutes: 30,
  startCash: 15000,
};

export type Player = {
  id: number;
  cash: number;
  pos: number;
  inJail: boolean;
  /** Số lần đã thử đổ đôi trong lúc bị tạm giữ. */
  jailTries: number;
  freeCards: number;
  bankrupt: boolean;
};
export type Deed = { owner: number | null; houses: number; mortgaged: boolean };
export type Offer = {
  from: number;
  to: number;
  giveCash: number;
  giveProps: number[];
  takeCash: number;
  takeProps: number[];
};

/** Ván đang chờ gì. `then`: sau khi xong việc này thì về chờ đổ (được đổ thêm) hay chờ kết thúc lượt. */
export type Pending =
  | { kind: 'roll' }
  | { kind: 'buy'; square: number }
  | {
      kind: 'auction';
      square: number;
      bid: number;
      leader: number | null;
      /** Người còn trong cuộc đấu giá, theo thứ tự trả giá. */
      order: number[];
      at: number;
    }
  | { kind: 'debt'; amount: number; to: number[]; then: 'roll' | 'end' }
  | { kind: 'end' }
  | { kind: 'over' };

export type GameEvent =
  | { k: 'roll'; p: number; dice: [number, number] }
  | { k: 'move'; p: number; path: number[]; jump?: boolean }
  | { k: 'cash'; p: number; amount: number; why: string }
  | { k: 'card'; p: number; deck: 'luck' | 'gift'; text: string }
  | { k: 'buy'; p: number; square: number; price: number }
  | { k: 'auction'; square: number; winner: number | null; price: number }
  | { k: 'jail'; p: number }
  | { k: 'free'; p: number }
  | { k: 'build'; p: number; square: number; houses: number }
  | { k: 'mortgage'; p: number; square: number; on: boolean }
  | { k: 'trade'; offer: Offer; accepted: boolean }
  | { k: 'bankrupt'; p: number; to: number | null }
  | { k: 'over'; winner: number };

export type Game = {
  seats: Seat[];
  settings: Settings;
  players: Player[];
  deeds: Record<number, Deed>;
  turn: number;
  pending: Pending;
  doubles: number;
  lastDice: [number, number] | null;
  trade: Offer | null;
  round: number;
  endsAt: number | null;
  winner: number | null;
  seq: number;
  events: GameEvent[];
  luck: number[];
  gift: number[];
  rng: number;
};

export type Action =
  | { a: 'roll' }
  | { a: 'buy' }
  | { a: 'decline' }
  | { a: 'bid'; amount: number }
  | { a: 'pass' }
  | { a: 'build'; square: number }
  | { a: 'sell'; square: number }
  | { a: 'mortgage'; square: number }
  | { a: 'unmortgage'; square: number }
  | { a: 'payJail' }
  | { a: 'useCard' }
  | { a: 'settle' }
  | { a: 'bankrupt' }
  | { a: 'end' }
  | { a: 'offer'; offer: Offer }
  | { a: 'respond'; accept: boolean }
  | { a: 'cancelOffer' };

/** Bên giữ ván cấp số xúc xắc (để có thể bốc ngẫu nhiên thật, hay cố định khi test) và giờ hiện tại. */
export type Ctx = { die: () => number; now: number };

function random(g: Game) {
  let t = (g.rng = (g.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function shuffled(g: Game, n: number) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(random(g) * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function createGame(seats: Seat[], settings: Settings, now: number, seed: number): Game {
  const active = seats.filter((s) => s.kind !== 'empty');
  if (active.length < 2) throw new Error('Cần ít nhất hai người chơi');
  const g: Game = {
    seats,
    settings,
    players: seats.map((s) => ({
      id: s.id,
      cash: settings.startCash,
      pos: 0,
      inJail: false,
      jailTries: 0,
      freeCards: 0,
      bankrupt: s.kind === 'empty',
    })),
    deeds: Object.fromEntries(
      BOARD.map((s, i) => [i, s] as const)
        .filter(([, s]) => isOwnable(s))
        .map(([i]) => [i, { owner: null, houses: 0, mortgaged: false }]),
    ),
    turn: active[0]!.id,
    pending: { kind: 'roll' },
    doubles: 0,
    lastDice: null,
    trade: null,
    round: 1,
    endsAt: settings.mode === 'timed' ? now + settings.minutes * 60_000 : null,
    winner: null,
    seq: 0,
    events: [],
    luck: [],
    gift: [],
    rng: seed | 0,
  };
  g.luck = shuffled(g, LUCK.length);
  g.gift = shuffled(g, GIFT.length);
  return g;
}

// ---------------------------------------------------------------- tra cứu

export const playerOf = (g: Game, id: number) => g.players.find((p) => p.id === id)!;
export const seatOf = (g: Game, id: number) => g.seats.find((s) => s.id === id)!;
export const inGame = (g: Game) => g.players.filter((p) => !p.bankrupt).map((p) => p.id);
export const ownedBy = (g: Game, id: number) =>
  Object.entries(g.deeds)
    .filter(([, d]) => d.owner === id)
    .map(([sq]) => Number(sq));

export const ownsGroup = (g: Game, id: number, group: number) =>
  groupSquares(group).every((sq) => g.deeds[sq]!.owner === id);

/** Người đang phải ra quyết định: người được mời đổi đất, người tới lượt trả giá, hay người tới lượt. */
export function actor(g: Game): number | null {
  if (g.pending.kind === 'over') return null;
  if (g.trade) return g.trade.to;
  if (g.pending.kind === 'auction') return g.pending.order[g.pending.at] ?? null;
  return g.turn;
}

export function rentFor(g: Game, square: number, dice: [number, number] | null): number {
  const s = BOARD[square]!;
  const d = g.deeds[square];
  if (!d || d.owner === null || d.mortgaged) return 0;
  if (s.kind === 'land') {
    if (d.houses > 0) return s.rent[d.houses]!;
    const full = ownsGroup(g, d.owner, s.group);
    const anyMortgaged = groupSquares(s.group).some((sq) => g.deeds[sq]!.mortgaged);
    return s.rent[0]! * (full && !anyMortgaged ? 2 : 1);
  }
  if (s.kind === 'station') {
    const n = STATIONS.filter((sq) => g.deeds[sq]!.owner === d.owner).length;
    return 250 * 2 ** (n - 1);
  }
  if (s.kind === 'utility') {
    const n = UTILITIES.filter((sq) => g.deeds[sq]!.owner === d.owner).length;
    const sum = dice ? dice[0] + dice[1] : 7;
    return sum * (n === 2 ? 100 : 40);
  }
  return 0;
}

export const houseCost = (square: number) => {
  const s = BOARD[square]!;
  return s.kind === 'land' ? GROUPS[s.group]!.house : 0;
};
export const mortgageValue = (square: number) => Math.floor(priceOf(BOARD[square]!) / 2);
export const unmortgageCost = (square: number) => Math.ceil(mortgageValue(square) * 1.1);

/** Giá trị tài sản: tiền mặt + giá đất (đang cầm cố thì nửa giá) + tiền xây nhà. */
export function netWorth(g: Game, id: number) {
  const p = playerOf(g, id);
  if (p.bankrupt) return 0;
  return ownedBy(g, id).reduce((sum, sq) => {
    const d = g.deeds[sq]!;
    return sum + (d.mortgaged ? mortgageValue(sq) : priceOf(BOARD[sq]!)) + d.houses * houseCost(sq);
  }, p.cash);
}

export function standings(g: Game) {
  return g.seats
    .filter((s) => s.kind !== 'empty')
    .map((s) => ({ ...s, worth: netWorth(g, s.id), bankrupt: playerOf(g, s.id).bankrupt }))
    .sort((a, b) => (a.id === g.winner ? -1 : b.id === g.winner ? 1 : b.worth - a.worth));
}

/** Có xây thêm nhà ở ô này được không (đủ nhóm, không cầm cố, xây đều, đủ tiền). */
export function canBuild(g: Game, id: number, square: number) {
  const s = BOARD[square]!;
  const d = g.deeds[square];
  if (s.kind !== 'land' || !d || d.owner !== id || d.houses >= HOTEL) return false;
  if (!ownsGroup(g, id, s.group)) return false;
  const group = groupSquares(s.group).map((sq) => g.deeds[sq]!);
  if (group.some((x) => x.mortgaged)) return false;
  if (d.houses > Math.min(...group.map((x) => x.houses))) return false;
  return playerOf(g, id).cash >= houseCost(square);
}

export function canSell(g: Game, id: number, square: number) {
  const s = BOARD[square]!;
  const d = g.deeds[square];
  if (s.kind !== 'land' || !d || d.owner !== id || d.houses === 0) return false;
  const group = groupSquares(s.group).map((sq) => g.deeds[sq]!);
  return d.houses >= Math.max(...group.map((x) => x.houses));
}

export function canMortgage(g: Game, id: number, square: number) {
  const s = BOARD[square]!;
  const d = g.deeds[square];
  if (!d || d.owner !== id || d.mortgaged) return false;
  if (s.kind === 'land') return groupSquares(s.group).every((sq) => g.deeds[sq]!.houses === 0);
  return true;
}

export const canUnmortgage = (g: Game, id: number, square: number) => {
  const d = g.deeds[square];
  return !!d && d.owner === id && d.mortgaged && playerOf(g, id).cash >= unmortgageCost(square);
};

// ---------------------------------------------------------------- việc nội bộ

function emit(g: Game, e: GameEvent) {
  g.events.push(e);
}

function gain(g: Game, id: number, amount: number, why: string) {
  playerOf(g, id).cash += amount;
  emit(g, { k: 'cash', p: id, amount, why });
}

/** Sau khi xong việc ở ô vừa tới: đổ đôi (và không bị tạm giữ) thì đổ tiếp, không thì chờ kết thúc. */
const after = (g: Game): 'roll' | 'end' =>
  g.doubles > 0 && !playerOf(g, g.turn).inJail ? 'roll' : 'end';

/** Bán nhà rồi cầm cố đất (rẻ trước) cho tới khi đủ tiền; trả về có đủ không. Dùng cho máy và người bị trừ tiền ngoài lượt. */
export function autoRaise(g: Game, id: number, amount: number): boolean {
  const p = playerOf(g, id);
  for (let guard = 0; p.cash < amount && guard < 200; guard++) {
    const owned = ownedBy(g, id).sort((a, b) => houseCost(b) - houseCost(a));
    const sell = owned.find((sq) => canSell(g, id, sq));
    if (sell !== undefined) {
      g.deeds[sell]!.houses--;
      p.cash += houseCost(sell) / 2;
      emit(g, { k: 'build', p: id, square: sell, houses: g.deeds[sell]!.houses });
      continue;
    }
    const mort = owned
      .filter((sq) => canMortgage(g, id, sq))
      .sort((a, b) => priceOf(BOARD[a]!) - priceOf(BOARD[b]!))[0];
    if (mort === undefined) break;
    g.deeds[mort]!.mortgaged = true;
    p.cash += mortgageValue(mort);
    emit(g, { k: 'mortgage', p: id, square: mort, on: true });
  }
  return p.cash >= amount;
}

/** Phá sản: tài sản về chủ nợ (một người) hoặc trả về ngân hàng; nhà bị dỡ. */
function goBankrupt(g: Game, id: number, to: number | null) {
  const p = playerOf(g, id);
  for (const sq of ownedBy(g, id)) {
    const d = g.deeds[sq]!;
    if (to === null) Object.assign(d, { owner: null, houses: 0, mortgaged: false });
    else {
      p.cash += d.houses * (houseCost(sq) / 2);
      Object.assign(d, { owner: to, houses: 0 });
    }
  }
  if (to !== null && p.cash > 0) playerOf(g, to).cash += p.cash;
  p.cash = 0;
  p.bankrupt = true;
  emit(g, { k: 'bankrupt', p: id, to });
  if (g.trade && (g.trade.from === id || g.trade.to === id)) g.trade = null;
}

/**
 * Trả tiền. Người đang tới lượt thiếu tiền thì ván chuyển sang chờ trả nợ (tự bán nhà, cầm cố hoặc
 * tuyên bố phá sản). Người khác (bị trừ qua thẻ) thiếu tiền thì tự bán/cầm cố; vẫn thiếu thì phá sản.
 * Trả về true nếu đã trả xong ngay.
 */
function pay(g: Game, id: number, amount: number, to: number[], why: string): boolean {
  if (amount <= 0) return true;
  const p = playerOf(g, id);
  if (p.cash < amount && id !== g.turn && !autoRaise(g, id, amount)) {
    goBankrupt(g, id, to.length === 1 ? to[0]! : null);
    return true;
  }
  if (p.cash < amount) {
    g.pending = { kind: 'debt', amount, to, then: after(g) };
    return false;
  }
  p.cash -= amount;
  emit(g, { k: 'cash', p: id, amount: -amount, why });
  const share = Math.floor(amount / Math.max(1, to.length));
  for (const t of to) gain(g, t, share, why);
  return true;
}

function sendToJail(g: Game, id: number) {
  const p = playerOf(g, id);
  p.pos = JAIL;
  p.inJail = true;
  p.jailTries = 0;
  if (id === g.turn) g.doubles = 0;
  emit(g, { k: 'jail', p: id });
}

/** Đi tới (bước dương) hoặc lui (bước âm); đi qua Xuất phát thì nhận lương. */
function walk(g: Game, id: number, steps: number) {
  const p = playerOf(g, id);
  const path: number[] = [];
  let passedGo = false;
  for (let i = 0; i < Math.abs(steps); i++) {
    p.pos = (p.pos + (steps > 0 ? 1 : SIZE - 1)) % SIZE;
    path.push(p.pos);
    if (steps > 0 && p.pos === 0) passedGo = true;
  }
  emit(g, { k: 'move', p: id, path });
  if (passedGo) gain(g, id, GO_SALARY, 'Qua Xuất phát');
}

const stepsTo = (from: number, to: number) => (to - from + SIZE) % SIZE;

/** Tới ô hiện tại và xử lý: mua, trả thuê, rút thẻ, nộp thuế, bị tạm giữ. */
function land(g: Game, id: number) {
  const p = playerOf(g, id);
  const s = BOARD[p.pos]!;
  if (isOwnable(s)) {
    const d = g.deeds[p.pos]!;
    if (d.owner === null) {
      g.pending = { kind: 'buy', square: p.pos };
      return;
    }
    if (d.owner !== id && !d.mortgaged && !playerOf(g, d.owner).bankrupt) {
      const rent = rentFor(g, p.pos, g.lastDice);
      if (!pay(g, id, rent, [d.owner], `Tiền thuê ${s.name}`)) return;
    }
  } else if (s.kind === 'tax') {
    if (!pay(g, id, s.amount, [], s.name)) return;
  } else if (s.kind === 'toJail') {
    sendToJail(g, id);
  } else if (s.kind === 'luck' || s.kind === 'gift') {
    if (!drawCard(g, id, s.kind)) return;
    if (g.pending.kind === 'buy') return;
  }
  if (!p.bankrupt) g.pending = { kind: after(g) };
  else nextTurn(g);
}

/** Rút và làm theo một thẻ. Trả về false nếu ván đang chờ trả nợ. */
function drawCard(g: Game, id: number, deck: 'luck' | 'gift'): boolean {
  const order = deck === 'luck' ? g.luck : g.gift;
  const idx = order.shift()!;
  order.push(idx);
  const card: Card = (deck === 'luck' ? LUCK : GIFT)[idx]!;
  emit(g, { k: 'card', p: id, deck, text: card.text });
  const p = playerOf(g, id);
  const e = card.effect;
  const why = deck === 'luck' ? 'Thẻ Vận may' : 'Thẻ Lì xì';
  switch (e.t) {
    case 'money':
      if (e.amount >= 0) gain(g, id, e.amount, why);
      else return pay(g, id, -e.amount, [], why);
      return true;
    case 'moveTo':
      walk(g, id, stepsTo(p.pos, e.square));
      land(g, id);
      return g.pending.kind !== 'debt';
    case 'moveBy':
      walk(g, id, e.steps);
      land(g, id);
      return g.pending.kind !== 'debt';
    case 'nearest': {
      const list = e.kind === 'station' ? STATIONS : UTILITIES;
      const target = list.map((sq) => stepsTo(p.pos, sq)).sort((a, b) => a - b)[0]!;
      walk(g, id, target);
      land(g, id);
      return g.pending.kind !== 'debt';
    }
    case 'jail':
      sendToJail(g, id);
      return true;
    case 'freeJail':
      p.freeCards++;
      return true;
    case 'repairs': {
      const cost = ownedBy(g, id).reduce((sum, sq) => {
        const h = g.deeds[sq]!.houses;
        return sum + (h === HOTEL ? e.hotel : h * e.house);
      }, 0);
      return pay(g, id, cost, [], 'Sửa nhà');
    }
    case 'each': {
      const others = inGame(g).filter((o) => o !== id);
      if (e.amount > 0) {
        for (const o of others) pay(g, o, e.amount, [id], why);
        return true;
      }
      return pay(g, id, -e.amount * others.length, others, why);
    }
  }
}

function finish(g: Game) {
  const ranked = inGame(g).sort((a, b) => netWorth(g, b) - netWorth(g, a));
  g.winner = ranked[0] ?? null;
  g.pending = { kind: 'over' };
  g.trade = null;
  if (g.winner !== null) emit(g, { k: 'over', winner: g.winner });
}

function nextTurn(g: Game) {
  const alive = inGame(g);
  if (alive.length <= 1) return finish(g);
  const order = g.players.map((p) => p.id);
  let i = order.indexOf(g.turn);
  for (let k = 0; k < order.length; k++) {
    i = (i + 1) % order.length;
    if (i === 0) g.round++;
    if (!playerOf(g, order[i]!).bankrupt) break;
  }
  g.turn = order[i]!;
  g.doubles = 0;
  g.pending = { kind: 'roll' };
  if (g.settings.mode === 'rounds' && g.round > g.settings.rounds) finish(g);
}

function endAuction(g: Game) {
  const a = g.pending as Extract<Pending, { kind: 'auction' }>;
  if (a.leader !== null) {
    const p = playerOf(g, a.leader);
    p.cash -= a.bid;
    g.deeds[a.square]!.owner = a.leader;
    emit(g, { k: 'cash', p: a.leader, amount: -a.bid, why: `Đấu giá ${BOARD[a.square]!.name}` });
  }
  emit(g, { k: 'auction', square: a.square, winner: a.leader, price: a.bid });
  g.pending = { kind: after(g) };
}

function validOffer(g: Game, o: Offer) {
  const from = playerOf(g, o.from);
  const to = playerOf(g, o.to);
  if (!from || !to || from.bankrupt || to.bankrupt || o.from === o.to) return false;
  if (o.giveCash < 0 || o.takeCash < 0 || o.giveCash > from.cash || o.takeCash > to.cash)
    return false;
  if (!o.giveProps.length && !o.takeProps.length && !o.giveCash && !o.takeCash) return false;
  const free = (owner: number) => (sq: number) => g.deeds[sq]?.owner === owner && groupFree(g, sq);
  return o.giveProps.every(free(o.from)) && o.takeProps.every(free(o.to));
}

/** Đất có nhà (trong cả nhóm) phải bán nhà trước rồi mới đổi. */
export function groupFree(g: Game, sq: number) {
  const s = BOARD[sq]!;
  return s.kind !== 'land' || groupSquares(s.group).every((x) => g.deeds[x]!.houses === 0);
}

// ---------------------------------------------------------------- thao tác

/** Một người chơi làm một thao tác. Hợp lệ thì đổi ván, tăng seq và trả về true. */
export function act(g: Game, id: number, action: Action, ctx: Ctx): boolean {
  if (g.pending.kind === 'over') return false;
  const p = playerOf(g, id);
  if (!p || p.bankrupt) return false;
  const pend = g.pending;
  const myTurn = id === g.turn && !g.trade;
  const events: GameEvent[] = [];
  const saved = g.events;
  g.events = events;
  let ok = true;

  switch (action.a) {
    case 'roll': {
      if (!myTurn || pend.kind !== 'roll') {
        ok = false;
        break;
      }
      const dice: [number, number] = [ctx.die(), ctx.die()];
      g.lastDice = dice;
      emit(g, { k: 'roll', p: id, dice });
      const isDouble = dice[0] === dice[1];
      if (p.inJail) {
        if (isDouble) {
          p.inJail = false;
          p.jailTries = 0;
          g.doubles = 0;
          emit(g, { k: 'free', p: id });
        } else {
          p.jailTries++;
          if (p.jailTries < 3) {
            g.pending = { kind: 'end' };
            break;
          }
          // Lần thứ ba không ra đôi: buộc nộp phạt rồi đi.
          p.inJail = false;
          p.jailTries = 0;
          if (!pay(g, id, JAIL_FINE, [], 'Phí ra tạm giữ')) break;
        }
      } else if (isDouble) {
        g.doubles++;
        if (g.doubles === 3) {
          sendToJail(g, id);
          g.pending = { kind: 'end' };
          break;
        }
      } else g.doubles = 0;
      walk(g, id, dice[0] + dice[1]);
      land(g, id);
      break;
    }
    case 'buy': {
      const price = pend.kind === 'buy' ? priceOf(BOARD[pend.square]!) : 0;
      if (!myTurn || pend.kind !== 'buy' || p.cash < price) {
        ok = false;
        break;
      }
      p.cash -= price;
      g.deeds[pend.square]!.owner = id;
      emit(g, { k: 'buy', p: id, square: pend.square, price });
      g.pending = { kind: after(g) };
      break;
    }
    case 'decline': {
      if (!myTurn || pend.kind !== 'buy') {
        ok = false;
        break;
      }
      const ids = g.players.map((x) => x.id);
      const start = ids.indexOf(id);
      const order = [...ids.slice(start), ...ids.slice(0, start)].filter(
        (x) => !playerOf(g, x).bankrupt,
      );
      g.pending = { kind: 'auction', square: pend.square, bid: 0, leader: null, order, at: 0 };
      break;
    }
    case 'bid':
    case 'pass': {
      if (pend.kind !== 'auction' || pend.order[pend.at] !== id || g.trade) {
        ok = false;
        break;
      }
      if (action.a === 'bid') {
        if (action.amount <= pend.bid || action.amount > p.cash) {
          ok = false;
          break;
        }
        pend.bid = action.amount;
        pend.leader = id;
        pend.at = (pend.at + 1) % pend.order.length;
      } else {
        pend.order.splice(pend.at, 1);
        if (pend.at >= pend.order.length) pend.at = 0;
      }
      // Hết người hoặc chỉ còn người đang trả giá cao nhất thì chốt.
      const left = pend.order;
      if (left.length === 0 || (left.length === 1 && pend.leader === left[0])) endAuction(g);
      break;
    }
    case 'build':
    case 'sell':
    case 'mortgage':
    case 'unmortgage': {
      const sq = action.square;
      const allowed =
        myTurn &&
        (pend.kind === 'roll' ||
          pend.kind === 'end' ||
          (pend.kind === 'debt' && (action.a === 'sell' || action.a === 'mortgage')));
      const d = g.deeds[sq];
      if (!allowed || !d) {
        ok = false;
        break;
      }
      if (action.a === 'build' && canBuild(g, id, sq)) {
        p.cash -= houseCost(sq);
        d.houses++;
        emit(g, { k: 'build', p: id, square: sq, houses: d.houses });
      } else if (action.a === 'sell' && canSell(g, id, sq)) {
        d.houses--;
        p.cash += houseCost(sq) / 2;
        emit(g, { k: 'build', p: id, square: sq, houses: d.houses });
      } else if (action.a === 'mortgage' && canMortgage(g, id, sq)) {
        d.mortgaged = true;
        p.cash += mortgageValue(sq);
        emit(g, { k: 'mortgage', p: id, square: sq, on: true });
      } else if (action.a === 'unmortgage' && canUnmortgage(g, id, sq)) {
        d.mortgaged = false;
        p.cash -= unmortgageCost(sq);
        emit(g, { k: 'mortgage', p: id, square: sq, on: false });
      } else ok = false;
      break;
    }
    case 'payJail':
    case 'useCard': {
      if (!myTurn || pend.kind !== 'roll' || !p.inJail) {
        ok = false;
        break;
      }
      if (action.a === 'payJail') {
        if (p.cash < JAIL_FINE) {
          ok = false;
          break;
        }
        p.cash -= JAIL_FINE;
        emit(g, { k: 'cash', p: id, amount: -JAIL_FINE, why: 'Phí ra tạm giữ' });
      } else {
        if (p.freeCards < 1) {
          ok = false;
          break;
        }
        p.freeCards--;
      }
      p.inJail = false;
      p.jailTries = 0;
      emit(g, { k: 'free', p: id });
      break;
    }
    case 'settle': {
      if (!myTurn || pend.kind !== 'debt' || p.cash < pend.amount) {
        ok = false;
        break;
      }
      const { amount, to, then } = pend;
      g.pending = { kind: then };
      pay(g, id, amount, to, 'Trả nợ');
      break;
    }
    case 'bankrupt': {
      if (!myTurn || pend.kind !== 'debt') {
        ok = false;
        break;
      }
      goBankrupt(g, id, pend.to.length === 1 ? pend.to[0]! : null);
      nextTurn(g);
      break;
    }
    case 'end': {
      if (!myTurn || pend.kind !== 'end') {
        ok = false;
        break;
      }
      nextTurn(g);
      // nextTurn có thể đã kết thúc ván (đủ vòng); TypeScript không biết pending đã đổi.
      if ((g.pending as Pending).kind !== 'over' && g.endsAt !== null && ctx.now >= g.endsAt)
        finish(g);
      break;
    }
    case 'offer': {
      const o = action.offer;
      if (
        !myTurn ||
        (pend.kind !== 'roll' && pend.kind !== 'end') ||
        o.from !== id ||
        !validOffer(g, o)
      ) {
        ok = false;
        break;
      }
      g.trade = { ...o, giveProps: [...o.giveProps], takeProps: [...o.takeProps] };
      break;
    }
    case 'cancelOffer': {
      if (!g.trade || g.trade.from !== id) {
        ok = false;
        break;
      }
      emit(g, { k: 'trade', offer: g.trade, accepted: false });
      g.trade = null;
      break;
    }
    case 'respond': {
      const o = g.trade;
      if (!o || o.to !== id) {
        ok = false;
        break;
      }
      g.trade = null;
      const accepted = action.accept && validOffer(g, o);
      if (accepted) {
        const a = playerOf(g, o.from);
        const b = playerOf(g, o.to);
        a.cash += o.takeCash - o.giveCash;
        b.cash += o.giveCash - o.takeCash;
        for (const sq of o.giveProps) g.deeds[sq]!.owner = o.to;
        for (const sq of o.takeProps) g.deeds[sq]!.owner = o.from;
      }
      emit(g, { k: 'trade', offer: o, accepted });
      break;
    }
  }

  g.events = ok ? events : saved;
  if (ok) g.seq++;
  return ok;
}

/** Hết giờ (chế độ có giờ): kết thúc ngay khi không đang giữa đấu giá hay trả nợ. */
export function checkTime(g: Game, now: number): boolean {
  if (g.endsAt === null || now < g.endsAt || g.pending.kind === 'over') return false;
  if (g.pending.kind === 'auction' || g.pending.kind === 'debt' || g.trade) return false;
  g.events = [];
  finish(g);
  g.seq++;
  return true;
}

export const setConnected = (g: Game, id: number, on: boolean) => {
  const s = seatOf(g, id);
  // Không tăng seq: đổi kết nối không có gì để diễn.
  if (s) s.connected = on;
};
