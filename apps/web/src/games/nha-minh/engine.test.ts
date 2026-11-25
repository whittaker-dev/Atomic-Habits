import assert from 'node:assert/strict';
import { test } from 'node:test';
import { START_FUND, WALL_PRICE, TILES_PER_CELL, ITEM } from './catalog';
import {
  apply,
  createHouse,
  goalProgress,
  left,
  nearestEdge,
  placeError,
  quote,
  roomName,
  rooms,
  sanitizeAction,
  LOT,
  type Action,
  type House,
} from './engine';
import { TILES } from './tiles';

const fresh = () => createHouse('h1', 'ABCDEF', 'Lan', 0);
const ok = (h: House, act: Action, seat: 0 | 1 = 0) => {
  const r = apply(h, seat, act, 1);
  assert.ok(r.ok, r.ok ? '' : r.reason);
  return r;
};

test('nhà mới: một phòng kín bằng cả lô, có cửa chính, quỹ đủ', () => {
  const h = fresh();
  const rs = rooms(h);
  assert.equal(rs.length, 1);
  assert.equal(rs[0]!.cells.length, LOT.w * LOT.d);
  assert.ok(rs[0]!.enclosed, 'cửa vẫn tính là tường ngăn phòng');
  assert.equal(Object.values(h.walls).filter((w) => w.kind === 'door').length, 1);
  assert.equal(left(h), START_FUND);
});

test('xây vách chia đôi nhà thành hai phòng kín, tính tiền theo mét mới', () => {
  const h = fresh();
  assert.deepEqual(quote(h, { a: 'wall', x1: 5, y1: 0, x2: 5, y2: 8 }), { cost: 8 * WALL_PRICE });
  ok(h, { a: 'wall', x1: 5, y1: 0, x2: 5, y2: 8 });
  const rs = rooms(h);
  assert.equal(rs.length, 2);
  assert.ok(rs.every((r) => r.enclosed));
  assert.equal(h.spent[0], 8 * WALL_PRICE);
  // Vẽ đè lên đoạn đã có chỉ trả phần mới.
  assert.deepEqual(quote(h, { a: 'wall', x1: 5, y1: 4, x2: 5, y2: 8 }), {
    error: 'Đoạn này đã có tường.',
  });
  assert.ok(
    'error' in quote(h, { a: 'wall', x1: 1, y1: 1, x2: 3, y2: 3 }),
    'tường chéo bị từ chối',
  );
});

test('vách hở một đầu thì không thành phòng riêng', () => {
  const h = fresh();
  ok(h, { a: 'wall', x1: 5, y1: 0, x2: 5, y2: 6 });
  assert.equal(rooms(h).length, 1);
});

test('lát sàn: cả phòng một lần, đúng số viên, lát đè hoàn tiền người lát trước', () => {
  const h = fresh();
  ok(h, { a: 'wall', x1: 5, y1: 0, x2: 5, y2: 8 });
  const hoa = TILES.find((t) => t.id === 'hoa-thi')!;
  const sao = TILES.find((t) => t.id === 'sao')!;
  ok(h, { a: 'tile', x: 1.5, y: 1.5, tile: 'hoa-thi' }, 1);
  assert.equal(h.spent[1], 5 * 8 * TILES_PER_CELL * hoa.price);
  assert.equal(h.floor.filter((t) => t === 'hoa-thi').length, 40);
  ok(h, { a: 'tile', x: 1.5, y: 1.5, tile: 'sao' }, 0);
  assert.equal(h.spent[1], 0, 'gạch cũ hoàn cho người đã lát');
  assert.equal(h.spent[0], 8 * WALL_PRICE + 40 * TILES_PER_CELL * sao.price);
});

test('phòng chưa kín thì chưa lát được', () => {
  const h = fresh();
  ok(h, { a: 'erase-wall', edge: 'h:6:8' }); // cửa chính trên tường bao: trở lại thành tường
  assert.equal(h.walls['h:6:8']!.kind, 'wall');
  // Mở một khoảng trống trong vách trong thì vẫn chung phòng; khung bao không gỡ được.
  assert.ok('error' in quote(h, { a: 'erase-wall', edge: 'h:0:0' }));
});

test('đặt đồ: trong lô, không vắt qua tường, không chồng nhau; thảm thì được', () => {
  const h = fresh();
  ok(h, { a: 'wall', x1: 5, y1: 0, x2: 5, y2: 8 });
  assert.equal(placeError(h, 'sofa', 0.5, 1, 0), 'Món đồ lọt ra ngoài lô đất.');
  assert.equal(placeError(h, 'sofa', 5, 2, 0), 'Món đồ vắt qua tường.');
  ok(h, { a: 'place', kind: 'sofa', x: 2.5, y: 1, rot: 0 });
  assert.match(placeError(h, 'coffee', 2.5, 1.2, 0) ?? '', /^Chồng lên sofa/);
  assert.equal(placeError(h, 'rug', 2.5, 1.5, 0), null, 'thảm nằm dưới sofa được');
  // Xoay 90° đổi chiều mặt bằng.
  assert.equal(placeError(h, 'bed1', 0.5, 4, 1), 'Món đồ lọt ra ngoài lô đất.');
  assert.equal(placeError(h, 'bed1', 1, 4, 1), null);
});

test('tường mới không được cắt ngang đồ đang đặt', () => {
  const h = fresh();
  ok(h, { a: 'place', kind: 'dining', x: 5, y: 3, rot: 0 });
  assert.match(
    (quote(h, { a: 'wall', x1: 5, y1: 0, x2: 5, y2: 8 }) as { error: string }).error,
    /cắt ngang/,
  );
});

test('quỹ chung: hết tiền thì không mua được, gỡ đồ hoàn đúng người mua', () => {
  const h = fresh();
  ok(h, { a: 'place', kind: 'fridge', x: 1, y: 1, rot: 0 }, 1);
  assert.equal(h.spent[1], ITEM.fridge.price);
  const id = h.pieces[0]!.id;
  ok(h, { a: 'remove', id }, 0);
  assert.equal(h.spent[1], 0);
  assert.equal(h.spent[0], 0);
  h.spent[0] = START_FUND - 100;
  const r = apply(h, 0, { a: 'place', kind: 'fridge', x: 1, y: 1, rot: 0 }, 2);
  assert.deepEqual(r, { ok: false, reason: 'Quỹ chung không đủ tiền.' });
  assert.equal(h.pieces.length, 0);
});

test('mục tiêu: tính theo phòng kín, nhận thưởng một lần, cộng vào quỹ', () => {
  const h = fresh();
  ok(h, { a: 'wall', x1: 5, y1: 0, x2: 5, y2: 8 });
  ok(h, { a: 'place', kind: 'bed2', x: 2, y: 5, rot: 0 });
  assert.deepEqual(goalProgress(h, 'bo-me'), [1, 3]);
  ok(h, { a: 'place', kind: 'wardrobe', x: 2, y: 0.5, rot: 0 });
  const before = left(h);
  const r = ok(h, { a: 'tile', x: 1, y: 1, tile: 'sao' });
  assert.deepEqual(r.events, [{ e: 'goal', id: 'bo-me', reward: 12000 }]);
  assert.deepEqual(goalProgress(h, 'bo-me'), [3, 3]);
  const tiles = 40 * TILES_PER_CELL * TILES.find((t) => t.id === 'sao')!.price;
  assert.equal(left(h), before - tiles + 12000);
  // Đổi gạch lần nữa không nhận thưởng lại.
  assert.deepEqual(ok(h, { a: 'tile', x: 1, y: 1, tile: 'hoa-thi' }).events, []);
  const room = rooms(h).find((q) => q.cells.includes(0))!;
  assert.equal(roomName(h, room), 'Phòng bố mẹ');
});

test('mục tiêu cây xanh đếm cả nhà, không cần phòng', () => {
  const h = fresh();
  for (const [x, y] of [
    [0.5, 0.5],
    [9.5, 0.5],
    [0.5, 7.5],
  ] as const)
    ok(h, { a: 'place', kind: 'plant', x, y, rot: 0 });
  assert.deepEqual(goalProgress(h, 'xanh'), [3, 4]);
  assert.deepEqual(ok(h, { a: 'place', kind: 'plant', x: 9.5, y: 7.5, rot: 0 }).events, [
    { e: 'goal', id: 'xanh', reward: 5000 },
  ]);
});

test('trổ cửa trên tường có sẵn, chạm gần tường thì bắt đúng cạnh', () => {
  const h = fresh();
  assert.equal(nearestEdge(3.4, 0.1), 'h:3:0');
  assert.equal(nearestEdge(9.92, 2.5), 'v:10:2');
  assert.equal(nearestEdge(4.5, 4.5), null);
  ok(h, { a: 'open', edge: 'h:3:0', kind: 'window' });
  assert.equal(h.walls['h:3:0']!.kind, 'window');
  assert.ok(
    'error' in quote(h, { a: 'open', edge: 'h:3:3', kind: 'door' }),
    'không có tường thì không trổ cửa',
  );
});

test('lọc thao tác nhận qua mạng', () => {
  assert.equal(sanitizeAction({ a: 'place', kind: 'tank', x: 1, y: 1, rot: 0 }), null);
  assert.equal(sanitizeAction({ a: 'place', kind: 'sofa', x: '1', y: 1, rot: 0 }), null);
  assert.equal(sanitizeAction({ a: 'place', kind: 'sofa', x: 1, y: 1, rot: 5 }), null);
  assert.equal(sanitizeAction({ a: 'tile', x: 1, y: 1, tile: 'vang' }), null);
  assert.equal(sanitizeAction(null), null);
  assert.deepEqual(sanitizeAction({ a: 'wall', x1: 1, y1: 0, x2: 1, y2: 3, extra: 1 }), {
    a: 'wall',
    x1: 1,
    y1: 0,
    x2: 1,
    y2: 3,
  });
});
