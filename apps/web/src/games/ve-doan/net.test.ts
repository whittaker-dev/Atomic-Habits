import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGame, pickWord, submitGuess, type Game, type Phase } from './engine';
import { applyOps, sanitize, type Stroke } from './ink';
import { viewFor } from './net';

/** Pha hiện tại, đúng loại mong đợi (sai loại thì test hỏng ngay với thông báo rõ). */
function phase<K extends Phase['kind']>(g: Game, kind: K): Extract<Phase, { kind: K }> {
  const p = g.phase;
  if (p.kind !== kind) throw new Error(`đang ở pha ${p.kind}, cần ${kind}`);
  return p as Extract<Phase, { kind: K }>;
}

function drawing() {
  const g = createGame({ turns: 3, drawTime: 80, pack: 'animals' }, ['An', 'Bình', 'Chi'], 0, 5);
  const drawer = phase(g, 'pick').drawer;
  const [a, b] = [0, 1, 2].filter((i) => i !== drawer) as [number, number];
  pickWord(g, drawer, 0, 0);
  return { g, drawer, a, b, word: phase(g, 'draw').word };
}

/** Mọi chuỗi trong gói tin gửi cho một máy, để dò xem đáp án có lọt ra không. */
const wire = (v: unknown) => JSON.stringify(v);

test('người đoán không nhận được đáp án, kể cả qua câu đúng của người khác', () => {
  const { g, drawer, a, b, word } = drawing();
  submitGuess(g, a, word, 5000);
  const forB = viewFor(g, b, 6000);
  assert.ok(!wire(forB).includes(word), 'đáp án lọt sang người chưa đoán ra');
  assert.equal(forB.phase.kind === 'draw' && forB.phase.word, undefined);
  assert.equal(forB.feed.at(-1)?.verdict, 'correct');
  // Người vẽ và người đã đoán ra thì thấy.
  assert.ok(wire(viewFor(g, drawer, 6000)).includes(word));
  assert.ok(wire(viewFor(g, a, 6000)).includes(word));
});

test('câu gần đúng chỉ người gõ thấy chữ; câu sai ai cũng thấy', () => {
  const { g, a, b, word } = drawing();
  submitGuess(g, a, `${word}x`, 1000);
  submitGuess(g, a, 'zzzz', 2000);
  const forB = viewFor(g, b, 3000);
  assert.equal(forB.feed[0]?.verdict, 'near');
  assert.equal(forB.feed[0]?.text, undefined);
  assert.equal(forB.feed[1]?.text, 'zzzz');
  assert.equal(viewFor(g, a, 3000).feed[0]?.text, `${word}x`);
});

test('chỉ người vẽ thấy ba từ để chọn; thời gian còn lại tính theo lúc gửi', () => {
  const g = createGame({ turns: 3, drawTime: 80, pack: 'food' }, ['An', 'Bình'], 0, 9);
  const drawer = phase(g, 'pick').drawer;
  const v = viewFor(g, drawer, 2000);
  assert.equal(v.phase.kind === 'pick' && v.phase.choices?.length, 3);
  assert.equal(v.leftMs, 10_000);
  const other = viewFor(g, 1 - drawer, 2000);
  assert.equal(other.phase.kind === 'pick' && other.phase.choices, undefined);
});

test('áp thao tác vẽ: đặt bút, thêm điểm, hoàn tác, xoá', () => {
  const s: Stroke[] = [];
  applyOps(s, [
    { k: 'begin', color: '#2a1f3d', size: 9, x: 1, y: 2 },
    { k: 'to', pts: [3, 4, 5, 6] },
    { k: 'begin', color: '#d7263d', size: 4, x: 9, y: 9 },
  ]);
  assert.deepEqual(s[0]?.points, [1, 2, 3, 4, 5, 6]);
  applyOps(s, [{ k: 'undo' }]);
  assert.equal(s.length, 1);
  applyOps(s, [{ k: 'clear' }]);
  assert.equal(s.length, 0);
});

test('lọc thao tác của khách: bỏ màu lạ, cỡ lạ, kẹp toạ độ trong bảng', () => {
  const ops = sanitize([
    { k: 'begin', color: 'red; background:url(x)', size: 9, x: 0, y: 0 },
    { k: 'begin', color: '#2a1f3d', size: 9999, x: 0, y: 0 },
    { k: 'begin', color: '#2a1f3d', size: 9, x: -50, y: 9000 },
    { k: 'to', pts: [700.4, -3, 'x', 10, 5] },
    { k: 'hack' },
  ]);
  assert.deepEqual(ops, [
    { k: 'begin', color: '#2a1f3d', size: 9, x: 0, y: 480 },
    { k: 'to', pts: [640, 0, 0, 10] },
  ]);
  assert.deepEqual(sanitize('không phải mảng'), []);
});
