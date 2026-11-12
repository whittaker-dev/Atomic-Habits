import assert from 'node:assert/strict';
import { test } from 'node:test';
import { botAction } from './bot';
import { BOARD, JAIL } from './data';
import {
  act,
  canBuild,
  createGame,
  netWorth,
  playerOf,
  rentFor,
  type Ctx,
  type Game,
  type Pending,
  type Seat,
  type Settings,
} from './engine';

const seats = (n: number, kind: Seat['kind'] = 'human'): Seat[] =>
  Array.from({ length: n }, (_, id) => ({ id, name: `P${id}`, kind, connected: true }));
const FULL: Settings = { mode: 'full', rounds: 20, minutes: 30, startCash: 15000 };

/** Xúc xắc cố định theo danh sách. */
const dice = (...faces: number[]): Ctx => {
  let i = 0;
  return { die: () => faces[i++ % faces.length]!, now: 0 };
};

test('đổ, đi, tới đất trống thì chờ mua; mua thì trừ tiền và thành chủ', () => {
  const g = createGame(seats(2), FULL, 0, 1);
  assert.ok(act(g, 0, { a: 'roll' }, dice(1, 2)));
  assert.equal(playerOf(g, 0).pos, 3);
  assert.deepEqual(g.pending, { kind: 'buy', square: 3 });
  assert.ok(act(g, 0, { a: 'buy' }, dice(1)));
  assert.equal(playerOf(g, 0).cash, 15000 - 600);
  assert.equal(g.deeds[3]!.owner, 0);
  assert.equal(g.pending.kind, 'end');
  assert.equal(act(g, 1, { a: 'roll' }, dice(1, 2)), false, 'chưa tới lượt');
});

test('tiền thuê: đủ nhóm thì gấp đôi; có nhà theo bảng; ga tính theo số ga đang có', () => {
  const g = createGame(seats(2), FULL, 0, 1);
  g.deeds[1]!.owner = 0;
  assert.equal(rentFor(g, 1, null), 20);
  g.deeds[3]!.owner = 0;
  assert.equal(rentFor(g, 1, null), 40);
  g.deeds[1]!.houses = 2;
  assert.equal(rentFor(g, 1, null), 300);
  g.deeds[5]!.owner = 1;
  g.deeds[15]!.owner = 1;
  assert.equal(rentFor(g, 5, null), 500);
  g.deeds[12]!.owner = 1;
  assert.equal(rentFor(g, 12, [3, 4]), 7 * 40);
});

test('trả tiền thuê cho chủ đất; thiếu tiền thì chờ trả nợ, bán nhà/cầm cố rồi trả được', () => {
  const g = createGame(seats(2), FULL, 0, 1);
  g.deeds[3]!.owner = 1;
  act(g, 0, { a: 'roll' }, dice(1, 2));
  assert.equal(playerOf(g, 0).cash, 15000 - 40);
  assert.equal(playerOf(g, 1).cash, 15000 + 40);
  const h = createGame(seats(2), FULL, 0, 1);
  h.deeds[39]!.owner = 1;
  h.deeds[39]!.houses = 5;
  h.deeds[1]!.owner = 0;
  playerOf(h, 0).cash = 100;
  playerOf(h, 0).pos = 36;
  act(h, 0, { a: 'roll' }, dice(1, 2));
  assert.equal(h.pending.kind, 'debt');
  assert.equal(act(h, 0, { a: 'settle' }, dice(1)), false, 'chưa đủ tiền');
  assert.ok(act(h, 0, { a: 'mortgage', square: 1 }, dice(1)));
  assert.ok(act(h, 0, { a: 'bankrupt' }, dice(1)));
  assert.equal(playerOf(h, 0).bankrupt, true);
  assert.equal(h.deeds[1]!.owner, 1, 'tài sản về chủ nợ');
  assert.equal(h.pending.kind, 'over');
  assert.equal(h.winner, 1);
});

test('đổ đôi được đổ tiếp; ba lần đôi liền thì bị tạm giữ; trong tạm giữ ra bằng đôi', () => {
  const g = createGame(seats(2), FULL, 0, 1);
  act(g, 0, { a: 'roll' }, dice(2, 2));
  act(g, 0, { a: 'decline' }, dice(1));
  // Đấu giá: cả hai bỏ, đất vẫn trống.
  act(g, 0, { a: 'pass' }, dice(1));
  act(g, 1, { a: 'pass' }, dice(1));
  assert.equal(g.pending.kind, 'roll', 'đôi nên đổ tiếp');
  act(g, 0, { a: 'roll' }, dice(3, 3));
  if ((g.pending as Pending).kind === 'buy') act(g, 0, { a: 'buy' }, dice(1));
  act(g, 0, { a: 'roll' }, dice(1, 1));
  assert.equal(playerOf(g, 0).pos, JAIL);
  assert.equal(playerOf(g, 0).inJail, true);
  assert.equal(g.pending.kind, 'end');
});

test('đấu giá: người trả cao nhất thắng khi những người khác bỏ', () => {
  const g = createGame(seats(3), FULL, 0, 1);
  act(g, 0, { a: 'roll' }, dice(1, 2));
  act(g, 0, { a: 'decline' }, dice(1));
  assert.ok(act(g, 0, { a: 'bid', amount: 100 }, dice(1)));
  assert.ok(act(g, 1, { a: 'bid', amount: 300 }, dice(1)));
  assert.ok(act(g, 2, { a: 'pass' }, dice(1)));
  assert.ok(act(g, 0, { a: 'pass' }, dice(1)));
  assert.equal(g.deeds[3]!.owner, 1);
  assert.equal(playerOf(g, 1).cash, 15000 - 300);
});

test('xây nhà phải đủ nhóm và xây đều', () => {
  const g = createGame(seats(2), FULL, 0, 1);
  g.deeds[1]!.owner = 0;
  assert.equal(canBuild(g, 0, 1), false);
  g.deeds[3]!.owner = 0;
  assert.ok(act(g, 0, { a: 'build', square: 1 }, dice(1)));
  assert.equal(canBuild(g, 0, 1), false, 'phải xây ô kia trước');
  assert.ok(act(g, 0, { a: 'build', square: 3 }, dice(1)));
  assert.ok(canBuild(g, 0, 1));
});

test('đổi đất: người được mời đồng ý thì đất và tiền đổi chủ', () => {
  const g = createGame(seats(2), FULL, 0, 1);
  g.deeds[1]!.owner = 0;
  g.deeds[3]!.owner = 1;
  const offer = { from: 0, to: 1, giveCash: 500, giveProps: [1], takeCash: 0, takeProps: [3] };
  assert.ok(act(g, 0, { a: 'offer', offer }, dice(1)));
  assert.equal(act(g, 0, { a: 'roll' }, dice(1, 2)), false, 'đang chờ trả lời');
  assert.ok(act(g, 1, { a: 'respond', accept: true }, dice(1)));
  assert.equal(g.deeds[1]!.owner, 1);
  assert.equal(g.deeds[3]!.owner, 0);
  assert.equal(playerOf(g, 0).cash, 14500);
});

test('chế độ số vòng: đủ vòng thì kết thúc, người giàu nhất thắng', () => {
  const g = createGame(seats(2), { ...FULL, mode: 'rounds', rounds: 1 }, 0, 1);
  playerOf(g, 1).cash = 20000;
  act(g, 0, { a: 'roll' }, dice(1, 2));
  act(g, 0, { a: 'decline' }, dice(1));
  act(g, 0, { a: 'pass' }, dice(1));
  act(g, 1, { a: 'pass' }, dice(1));
  act(g, 0, { a: 'end' }, dice(1));
  act(g, 1, { a: 'roll' }, dice(5, 6));
  while (g.pending.kind === 'buy' || g.pending.kind === 'auction') {
    const b = botAction(g)!;
    act(g, b.id, b.action, dice(1));
  }
  act(g, 1, { a: 'end' }, dice(1));
  assert.equal(g.pending.kind, 'over');
  assert.equal(g.winner, 1);
});

/** Cho máy chơi tới khi xong hoặc hết số bước; mỗi bước đều phải có người hành động được. */
function playBots(g: Game, seed: number, maxSteps: number) {
  let s = seed;
  const rnd = () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return 1 + (s % 6);
  };
  let steps = 0;
  while (g.pending.kind !== 'over' && steps < maxSteps) {
    const b = botAction(g);
    assert.ok(b, `không ai hành động được ở ${JSON.stringify(g.pending)}`);
    assert.ok(act(g, b.id, b.action, { die: rnd, now: 0 }), JSON.stringify(b));
    for (const p of g.players) assert.ok(p.cash >= 0, `tiền âm: ${p.cash}`);
    steps++;
  }
  return steps;
}

test('đánh tới cùng: máy chơi lâu không kẹt, không âm tiền', () => {
  for (const seed of [1, 2, 3]) playBots(createGame(seats(4, 'bot'), FULL, 0, seed), seed, 8000);
});

test('theo số vòng: máy chơi tới hết vòng thì kết thúc, có người thắng', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const g = createGame(seats(4, 'bot'), { ...FULL, mode: 'rounds', rounds: 30 }, 0, seed);
    playBots(g, seed, 20000);
    assert.equal(g.pending.kind, 'over', `seed ${seed}`);
    assert.ok(netWorth(g, g.winner!) > 0);
  }
});

test('mọi ô trên bàn đều có tên, 40 ô', () => {
  assert.equal(BOARD.length, 40);
  assert.ok(BOARD.every((s) => s.name.length > 0));
});
