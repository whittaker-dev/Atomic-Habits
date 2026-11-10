import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  cellKind,
  FINISH,
  HOME,
  pointOf,
  spotOf,
  STABLE,
  startIndex,
  TRACK,
  TRACK_LEN,
  type House,
} from './board';

const key = ([c, r]: readonly [number, number]) => `${c},${r}`;

test('đường đi: 56 ô khác nhau, ô nào cũng sát ô kế tiếp (kể cả vòng lại ô đầu)', () => {
  assert.equal(TRACK.length, TRACK_LEN);
  assert.equal(new Set(TRACK.map(key)).size, TRACK_LEN);
  TRACK.forEach((a, i) => {
    const b = TRACK[(i + 1) % TRACK_LEN]!;
    assert.equal(Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]), 1, `${key(a)} → ${key(b)}`);
  });
});

test('đường về chuồng: 6 bậc mỗi nhà, không trùng đường đi, bậc 6 sát tâm', () => {
  const track = new Set(TRACK.map(key));
  for (const h of [0, 1, 2, 3] as House[]) {
    assert.equal(HOME[h]!.length, 6);
    for (const c of HOME[h]!) assert.ok(!track.has(key(c)));
    const [c, r] = HOME[h]![5]!;
    assert.equal(Math.abs(c - 7) + Math.abs(r - 7), 1);
    // Ô cuối trước đường về chuồng nằm ngay cạnh bậc 1.
    const last = TRACK[(startIndex(h) + TRACK_LEN - 2) % TRACK_LEN]!;
    const [hc, hr] = HOME[h]![0]!;
    assert.equal(Math.abs(last[0] - hc) + Math.abs(last[1] - hr), 1);
  }
});

test('chỗ của ngựa: chuồng, đường đi từ ô xuất quân, bậc về chuồng', () => {
  assert.deepEqual(spotOf(0, -1, 2), { kind: 'stable', slot: 2 });
  assert.deepEqual(pointOf(0, spotOf(0, 0, 0)), [1.5, 6.5]);
  assert.deepEqual(spotOf(1, 0, 0), { kind: 'track', index: startIndex(1) });
  assert.deepEqual(spotOf(0, FINISH, 0), { kind: 'home', step: 6 });
  assert.deepEqual(pointOf(2, { kind: 'stable', slot: 0 }), [13, 13]);
  assert.equal(STABLE.flat().length, 16);
});

test('mọi ô trên lưới có đúng một loại; ô xuất quân là ô màu của nhà đó', () => {
  const kinds = { yard: 0, track: 0, home: 0, goal: 0 };
  for (let r = 0; r < 15; r++) for (let c = 0; c < 15; c++) kinds[cellKind(c, r).kind]++;
  assert.deepEqual(kinds, { yard: 144, track: 56, home: 24, goal: 1 });
  const [sc, sr] = TRACK[startIndex(3)]!;
  assert.deepEqual(cellKind(sc, sr), { kind: 'track', start: 3 });
});
