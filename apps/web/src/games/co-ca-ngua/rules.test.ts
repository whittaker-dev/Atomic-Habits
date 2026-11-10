import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FINISH, LAST_TRACK_STEP, startIndex, TRACK_LEN } from './board';
import { DEFAULT_RULES, kickedBy, legalMoves, stepsBetween, type Horses } from './rules';

const empty = (): Horses => [0, 1, 2, 3].map(() => [-1, -1, -1, -1]);

test('ra quân bằng 1 hoặc 6 (mặc định); chỉ bằng 6 khi đổi luật', () => {
  const h = empty();
  assert.deepEqual(legalMoves(h, 0, 1, DEFAULT_RULES), [{ house: 0, slot: 0, to: 0 }]);
  assert.equal(legalMoves(h, 0, 3, DEFAULT_RULES).length, 0);
  assert.equal(legalMoves(h, 0, 1, { ...DEFAULT_RULES, enterOn: 'six' }).length, 0);
  assert.equal(legalMoves(h, 0, 6, { ...DEFAULT_RULES, enterOn: 'six' }).length, 1);
});

test('không đi vào ô đang có ngựa nhà mình; ô xuất quân bị chiếm thì không ra quân', () => {
  const h = empty();
  h[0] = [0, 3, -1, -1];
  const moves = legalMoves(h, 0, 3, DEFAULT_RULES);
  assert.deepEqual(moves, [{ house: 0, slot: 1, to: 6 }]);
  assert.ok(!legalMoves(h, 0, 6, DEFAULT_RULES).some((m) => m.to === 0));
});

test('đá ngựa: tới đúng ô của ngựa nhà khác trên đường đi', () => {
  const h = empty();
  h[0] = [4, -1, -1, -1];
  // Ngựa nhà 1 đứng ở ô tuyệt đối mà ngựa nhà 0 tới sau 3 bước.
  const at = (startIndex(0) + 7) % TRACK_LEN;
  h[1] = [(at - startIndex(1) + TRACK_LEN) % TRACK_LEN, -1, -1, -1];
  assert.deepEqual(kickedBy(h, { house: 0, slot: 0, to: 7 }, DEFAULT_RULES), { house: 1, slot: 0 });
  assert.equal(kickedBy(h, { house: 0, slot: 0, to: 7 }, { ...DEFAULT_RULES, kick: false }), null);
});

test('về chuồng: vào đường về không quá bậc 6, rồi phải đổ đúng số bậc kế tiếp', () => {
  const h = empty();
  h[0] = [LAST_TRACK_STEP - 1, LAST_TRACK_STEP + 2, -1, -1];
  const moves = legalMoves(h, 0, 4, DEFAULT_RULES);
  // Con 0 từ ô cuối - 1 đi 4 bước vào bậc 3; con 1 ở bậc 2 chỉ leo bằng đúng số 3.
  assert.deepEqual(moves, [{ house: 0, slot: 0, to: LAST_TRACK_STEP + 3 }]);
  assert.deepEqual(legalMoves(h, 0, 3, DEFAULT_RULES).at(-1), {
    house: 0,
    slot: 1,
    to: LAST_TRACK_STEP + 3,
  });
  h[0] = [FINISH, -1, -1, -1];
  assert.equal(legalMoves(h, 0, 5, DEFAULT_RULES).length, 0);
});

test('các bước nhảy từng ô', () => {
  assert.deepEqual(stepsBetween(-1, 0), [0]);
  assert.deepEqual(stepsBetween(3, 6), [4, 5, 6]);
});
