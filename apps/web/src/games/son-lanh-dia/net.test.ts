import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMatch, NONE, step } from './engine';
import { fromSnapshot, replayOwn, takeQueued, toSnapshot } from './net';

const twoPlayers = () =>
  createMatch({
    arena: 'plaza',
    players: [
      { name: 'A', charId: 'mochi', bot: false },
      { name: 'B', charId: 'bin', bot: false },
    ],
  });

test('ảnh chụp nén rồi giải nén ra đúng trận cũ (kể cả sơn và bản đồ)', () => {
  const m = twoPlayers();
  for (let i = 0; i < 40; i++)
    step(m, [
      { dir: 'right', fire: i === 5 },
      { dir: 'up', fire: false },
    ]);
  assert.ok(m.paint.some((t) => t !== NONE));
  const back = fromSnapshot(JSON.parse(JSON.stringify(toSnapshot(m))));
  assert.deepEqual(back, m);
});

test('hàng đợi phím: trống thì đi tiếp hướng cũ, dài quá thì gộp nhưng giữ lần bóp cò', () => {
  assert.deepEqual(takeQueued([], 'left'), { input: { dir: 'left', fire: false }, seq: null });
  const q = Array.from({ length: 8 }, (_, i) => ({
    seq: i + 1,
    input: { dir: 'down' as const, fire: i === 1 },
  }));
  const got = takeQueued(q, null);
  assert.equal(got.input.fire, true);
  assert.equal(q.length, 4);
});

test('máy khách đoán vị trí của mình đúng bằng luật của chủ phòng', () => {
  const host = twoPlayers();
  // Qua mạng ảnh chụp luôn được sao chép (JSON), nên ở đây cũng sao chép để không dùng chung object.
  const snap = fromSnapshot(JSON.parse(JSON.stringify(toSnapshot(host))));
  const pending = Array.from({ length: 30 }, (_, i) => ({ seq: i + 1, dir: 'right' as const }));
  for (let i = 0; i < 30; i++) step(host, [{ dir: 'right', fire: false }]);
  const me = replayOwn(snap, 0, pending)!;
  assert.ok(Math.abs(me.x - host.players[0]!.x) < 1e-9);
  assert.equal(me.y, host.players[0]!.y);
});

test('đang đứng hình thì máy khách không tự cho mình chạy', () => {
  const m = twoPlayers();
  m.players[0]!.stunT = 1;
  const me = replayOwn(m, 0, [{ seq: 1, dir: 'right' }])!;
  assert.equal(me.x, 0);
});
