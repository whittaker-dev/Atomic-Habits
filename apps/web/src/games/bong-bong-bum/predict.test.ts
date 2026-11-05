import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMatch, NO_INPUT, step, type Match } from './engine';
import { EMPTY } from './map';
import { replayOwn, takeQueued, type Pending, type Queued } from './predict';

function openArena(): Match {
  const m = createMatch({
    theme: 'schoolyard',
    seed: 3,
    players: [
      { name: 'Chủ', charId: 'com', bot: false },
      { name: 'Khách', charId: 'mia', bot: false },
    ],
  });
  m.tiles.fill(EMPTY);
  m.players[1]!.x = 1;
  m.players[1]!.y = 6;
  return m;
}

/**
 * Giả lập một khách giữ phím qua mạng trễ `delay` nhịp mỗi chiều (+ dao động), chủ phòng gửi ảnh chụp
 * mỗi 3 nhịp. Trả về vị trí khách tự thấy ở từng nhịp và vị trí chuẩn cuối cùng.
 */
function simulate(
  delay: number,
  jitter: number,
  ticks: number,
  dirAt: (t: number) => Pending['dir'],
) {
  const host = openArena();
  const queue: Queued[] = [];
  let lastDir: Pending['dir'] = null;
  let ack = 0;
  const toHost: { at: number; q: Queued }[] = [];
  const toClient: { at: number; snap: Match; ack: number }[] = [];
  let seq = 0;
  let pending: Pending[] = [];
  let seen: Match = structuredClone(host);
  let seenAck = 0;
  const xs: number[] = [];
  let rng = 7;
  const rand = () => (rng = (rng * 1103515245 + 12345) % 2147483648) / 2147483648;
  let lastArrive = 0;

  for (let t = 0; t < ticks; t++) {
    // Khách: một phím mỗi nhịp. Kênh tin cậy giữ đúng thứ tự nên giờ tới không bao giờ lùi.
    const dir = dirAt(t);
    seq++;
    pending.push({ seq, dir });
    lastArrive = Math.max(lastArrive, t + delay + Math.floor(rand() * jitter));
    toHost.push({ at: lastArrive, q: { seq, input: { dir, bomb: false } } });

    // Chủ phòng: nhận phím đã tới, dùng một phím, chạy một nhịp.
    while (toHost.length && toHost[0]!.at <= t) queue.push(toHost.shift()!.q);
    const { input, seq: used } = takeQueued(queue, lastDir);
    if (used !== null) {
      ack = used;
      lastDir = input.dir;
    }
    step(host, [NO_INPUT, input]);
    if (t % 3 === 0) toClient.push({ at: t + delay, snap: structuredClone(host), ack });

    // Khách: nhận ảnh chụp đã tới, phát lại phần chưa xác nhận.
    while (toClient.length && toClient[0]!.at <= t) {
      const msg = toClient.shift()!;
      seen = msg.snap;
      seenAck = msg.ack;
    }
    pending = pending.filter((p) => p.seq > seenAck);
    xs.push(replayOwn(seen, 1, pending)!.x);
  }
  return { xs, hostX: host.players[1]!.x };
}

test('mạng trễ 200 ms: khách giữ phím chạy thì không bao giờ bị kéo lùi', () => {
  const { xs } = simulate(12, 4, 150, (t) => (t < 100 ? 'right' : null));
  for (let i = 1; i < xs.length; i++) {
    assert.ok(xs[i]! >= xs[i - 1]! - 1e-9, `nhịp ${i}: bị kéo lùi từ ${xs[i - 1]} về ${xs[i]}`);
  }
  assert.ok(xs[99]! > 5, 'đã chạy được một quãng dài');
});

test('mạng trễ: thả phím xong, vị trí khách thấy khớp đúng vị trí chuẩn của chủ phòng', () => {
  const { xs, hostX } = simulate(12, 4, 200, (t) => (t < 100 ? 'right' : null));
  assert.ok(
    Math.abs(xs[xs.length - 1]! - hostX) < 1e-6,
    `khách thấy ${xs[xs.length - 1]}, chủ phòng ${hostX}`,
  );
});

test('đổi hướng liên tục qua mạng trễ vẫn khớp vị trí chuẩn', () => {
  const pattern = ['right', 'right', 'down', 'left', null, 'up', 'right'] as const;
  const { xs, hostX } = simulate(9, 6, 260, (t) =>
    t < 200 ? pattern[Math.floor(t / 20) % pattern.length]! : null,
  );
  assert.ok(Math.abs(xs[xs.length - 1]! - hostX) < 1e-6);
});

test('hàng đợi quá dài thì gộp phím cũ nhưng không mất lần bấm đặt bóng', () => {
  const queue: Queued[] = Array.from({ length: 8 }, (_, i) => ({
    seq: i + 1,
    input: { dir: 'left', bomb: i === 1 },
  }));
  const { input, seq } = takeQueued(queue, null);
  assert.equal(input.bomb, true);
  assert.equal(seq, 4);
  assert.equal(queue.length, 4);
});

test('hàng đợi trống (mạng giật) thì đi tiếp theo hướng cũ', () => {
  assert.deepEqual(takeQueued([], 'up'), { input: { dir: 'up', bomb: false }, seq: null });
});
