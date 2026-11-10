import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FINISH, startIndex, TRACK_LEN } from './board';
import { botChoice, createGame, pickHorse, rollDie, standings, type Seat } from './engine';
import { DEFAULT_RULES } from './rules';

const seats = (): Seat[] => [
  { house: 0, name: 'An', kind: 'human', connected: true },
  { house: 1, name: 'Bình', kind: 'bot', connected: true },
  { house: 2, name: '', kind: 'empty', connected: true },
  { house: 3, name: 'Chi', kind: 'human', connected: true },
];

test('chỉ nhà đang đi được đổ; không đi được con nào thì qua lượt ngay, bỏ qua ghế trống', () => {
  const g = createGame(seats(), DEFAULT_RULES);
  assert.equal(g.turn, 0);
  assert.equal(rollDie(g, 1, 6), false);
  assert.equal(rollDie(g, 0, 3), true);
  assert.deepEqual(g.event, { kind: 'roll', house: 0, value: 3, passed: true });
  assert.equal(g.turn, 1);
  rollDie(g, 1, 2);
  assert.equal(g.turn, 3, 'nhà 2 để trống nên tới nhà 3');
});

test('ra quân bằng 1, chọn con nào trong chuồng cũng được; đổ 6 được đổ thêm', () => {
  const g = createGame(seats(), DEFAULT_RULES);
  rollDie(g, 0, 1);
  assert.equal(g.moves.length, 1);
  assert.equal(pickHorse(g, 0, 3), true);
  assert.equal(g.horses[0]![g.event.kind === 'move' ? g.event.move.slot : -1], 0);
  assert.equal(g.turn, 1);
  const h = createGame(seats(), DEFAULT_RULES);
  rollDie(h, 0, 6);
  pickHorse(h, 0, 0);
  assert.equal(h.turn, 0);
  assert.equal(h.roll, null);
  assert.equal(h.event.kind === 'move' && h.event.again, true);
});

test('đá ngựa ghi vào sự kiện và đưa con bị đá về chuồng', () => {
  const g = createGame(seats(), DEFAULT_RULES);
  g.horses[0]![0] = 4;
  const at = (startIndex(0) + 6) % TRACK_LEN;
  g.horses[1]![0] = (at - startIndex(1) + TRACK_LEN) % TRACK_LEN;
  rollDie(g, 0, 2);
  assert.equal(botChoice(g)?.to, 6);
  pickHorse(g, 0, 0);
  assert.deepEqual(g.event.kind === 'move' && g.event.kicked, { house: 1, slot: 0 });
  assert.equal(g.horses[1]![0], -1);
});

test('bốn con về đích là thắng; không ai đi tiếp được', () => {
  const g = createGame(seats(), DEFAULT_RULES);
  g.horses[0] = [FINISH, FINISH, FINISH, FINISH - 1];
  rollDie(g, 0, 6);
  pickHorse(g, 0, 3);
  assert.equal(g.winner, 0);
  assert.equal(rollDie(g, 0, 6), false);
  assert.equal(standings(g)[0]!.house, 0);
});
