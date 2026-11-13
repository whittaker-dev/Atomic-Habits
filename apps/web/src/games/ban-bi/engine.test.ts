import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  bubbleCount,
  cellPos,
  COLS,
  createGame,
  DEATH_ROW,
  LAUNCH,
  LEVELS,
  levelOf,
  MAX_ANGLE,
  MIN_ANGLE,
  shoot,
  trace,
  type Game,
} from './engine';
import { charge, createPower, drain, THRESHOLDS } from './power';

/** Ván dựng tay: `rows` là các hàng màu (-1 trống). */
function board(rows: number[][], current: number): Game {
  const g = createGame('de');
  g.grid = rows.map((r, i) => {
    const len = i % 2 ? COLS - 1 : COLS;
    return [...r, ...Array(len).fill(-1)].slice(0, len);
  });
  g.parity = 0;
  g.current = current;
  g.next = current;
  return g;
}

/** Góc bắn thẳng vào tâm ô (r, c) từ bệ bắn. */
const aimAt = (g: Game, r: number, c: number) => {
  const p = cellPos(g, r, c);
  return Math.atan2(LAUNCH.y - p.y, p.x - LAUNCH.x);
};

test('cùng một màn thì ai cũng gặp cùng thế bi', () => {
  for (const lv of LEVELS) {
    const a = createGame(lv.id);
    const b = createGame(lv.id);
    assert.deepEqual(a.grid, b.grid);
    assert.equal(a.grid.length, lv.rows);
    assert.ok(a.grid.flat().every((v) => v >= 0 && v < lv.colors));
  }
});

test('ba bi cùng màu liền nhau thì nổ', () => {
  // Hàng 0: hai bi màu 1 ở cột 3, 4. Bắn màu 1 vào ngay dưới.
  const g = board([[0, 0, 0, 1, 1, 0, 0, 0]], 1);
  const res = shoot(g, aimAt(g, 1, 3))!;
  assert.equal(res.popped.length, 3);
  assert.ok(res.popped.every((p) => p.color === 1));
  assert.equal(bubbleCount(g), 6);
});

test('bi mất chỗ bám lên trần thì rơi theo', () => {
  // Bi màu 2 ở hàng 1 chỉ treo vào cặp bi màu 1; phá cặp đó thì bi màu 2 rơi.
  const g = board(
    [
      [0, 0, 0, 1, 1, 0, 0, 0],
      [-1, -1, -1, 2, -1, -1, -1],
    ],
    1,
  );
  g.grid[0] = [-1, -1, -1, 1, 1, -1, -1, -1, -1, -1];
  const res = shoot(g, aimAt(g, 1, 4))!;
  assert.equal(res.popped.length, 3);
  assert.deepEqual(
    res.dropped.map((p) => [p.r, p.c, p.color]),
    [[1, 3, 2]],
  );
  assert.equal(g.status, 'won');
});

test('bắn chéo thì dội tường rồi mới dính', () => {
  const g = createGame('de');
  const { path } = trace(g, MIN_ANGLE);
  assert.ok(path.length >= 3, 'có ít nhất một điểm dội tường');
  // Góc ngoài giới hạn bị kẹp lại, không bắn ngang.
  assert.deepEqual(trace(g, 0), trace(g, MIN_ANGLE));
  assert.deepEqual(trace(g, Math.PI), trace(g, MAX_ANGLE));
});

test('cứ vài phát thêm một hàng bi từ trên, dồn cả mảng xuống; bi chạm vạch dưới là thua', () => {
  const g = createGame('kho');
  const every = levelOf('kho').dropEvery;
  // Bắn toàn bộ vào góc trái cho bi chồng xuống.
  let res = null;
  for (let i = 0; i < every - 1; i++) res = shoot(g, MAX_ANGLE);
  assert.equal(res?.rowAdded, false);
  const before = g.grid.map((row) => [...row]);
  res = shoot(g, MAX_ANGLE);
  assert.ok(res?.rowAdded);
  // Hàng mới đầy bi, chỉ mang màu còn trên sân; các hàng cũ (sau phát bắn) lùi xuống một hàng.
  const left = new Set(before.flat().filter((v) => v >= 0));
  assert.equal(g.grid[0]!.length, g.parity === 0 ? COLS : COLS - 1);
  assert.ok(g.grid[0]!.every((v) => left.has(v)));
  assert.equal(g.grid[1]!.length, before[0]!.length, 'hàng cũ giữ đúng độ lệch');
  for (let i = 0; i < 400 && g.status === 'play'; i++) shoot(g, MAX_ANGLE);
  assert.equal(g.status, 'lost');
  assert.equal(shoot(g, Math.PI / 2), null);
});

test('chơi ngẫu nhiên thì ván luôn kết thúc, không lỗi, bi mới luôn là màu còn trên sân', () => {
  for (const lv of LEVELS)
    for (let seed = 1; seed <= 20; seed++) {
      const g = createGame(lv.id);
      let s = seed;
      for (let i = 0; i < 800 && g.status === 'play'; i++) {
        s = (s * 16807) % 2147483647;
        shoot(g, MIN_ANGLE + (s / 2147483647) * (MAX_ANGLE - MIN_ANGLE));
        const left = new Set(g.grid.flat().filter((v) => v >= 0));
        if (g.status === 'play') assert.ok(left.has(g.current), 'bi đang cầm có màu trên sân');
      }
      assert.notEqual(g.status, 'play', `${lv.id} seed ${seed} kết thúc`);
      if (g.status === 'lost') assert.ok(g.grid.length > DEATH_ROW - 1);
    }
});

test('nổ nhanh liên tiếp thì lên cấp, chậm thì khí tản và tụt cấp', () => {
  const p = createPower();
  let t = 0;
  for (let i = 0; i < 6; i++) {
    t += 1.5;
    charge(p, 4, 2, t);
  }
  assert.ok(p.level >= 3, `lên cấp ${p.level}`);
  assert.equal(p.peak, p.level);
  const peak = p.level;
  drain(p, 60);
  assert.equal(p.energy, 0);
  assert.equal(p.level, 0);
  assert.equal(p.peak, peak, 'giữ cấp cao nhất đã đạt');
  // Bắn trượt (không nổ) thì đứt combo.
  charge(p, 3, 0, 100);
  charge(p, 0, 0, 101);
  assert.equal(p.combo, 0);
  assert.equal(THRESHOLDS.length, 6);
});
