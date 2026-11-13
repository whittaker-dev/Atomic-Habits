import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  advance,
  bubbleCount,
  cellPos,
  COLS,
  createGame,
  LAUNCH,
  LEVELS,
  levelOf,
  MAX_ANGLE,
  MIN_ANGLE,
  rowLen,
  rowSeconds,
  shoot,
  SPEEDUP_HALF_LIFE,
  trace,
  type Game,
} from './engine';
import { charge, createPower, drain, THRESHOLDS } from './power';

/** Ván dựng tay: `rows` là các hàng màu (-1 trống). */
function board(rows: number[][], current: number): Game {
  const g = createGame('de', 1);
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

test('mỗi ván xáo thế bi mới (cùng hạt giống thì cùng thế bi)', () => {
  for (const lv of LEVELS) {
    const a = createGame(lv.id, 42);
    assert.deepEqual(a.grid, createGame(lv.id, 42).grid);
    assert.notDeepEqual(a.grid, createGame(lv.id, 43).grid);
    assert.equal(a.grid.length, lv.rows);
    assert.ok(a.grid.flat().every((v) => v >= 0 && v < lv.colors));
    assert.equal(a.incoming.length, rowLen(a, -1), 'hàng chờ đúng độ dài');
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
  // Chơi vô tận: sạch bàn vẫn chơi tiếp, hàng mới vẫn trôi xuống.
  assert.equal(bubbleCount(g), 0);
  assert.equal(g.status, 'play');
});

test('bắn chéo thì dội tường rồi mới dính', () => {
  const g = createGame('de');
  const { path } = trace(g, MIN_ANGLE);
  assert.ok(path.length >= 3, 'có ít nhất một điểm dội tường');
  // Góc ngoài giới hạn bị kẹp lại, không bắn ngang.
  assert.deepEqual(trace(g, 0), trace(g, MIN_ANGLE));
  assert.deepEqual(trace(g, Math.PI), trace(g, MAX_ANGLE));
});

test('mảng bi trôi xuống theo thời gian, đủ một hàng thì hàng chờ chen vào, nhanh dần', () => {
  const g = createGame('de', 7);
  const secs = rowSeconds(g);
  assert.equal(secs, levelOf('de').rowSeconds);
  const top = [...g.grid[0]!];
  const incoming = [...g.incoming];
  assert.equal(advance(g, secs * 0.5), 0);
  assert.ok(Math.abs(g.offset - 0.5) < 0.01, 'trôi được nửa hàng');
  assert.equal(advance(g, secs * 0.6), 1);
  assert.deepEqual(g.grid[0], incoming, 'hàng chờ thành hàng 0');
  assert.deepEqual(g.grid[1], top, 'hàng cũ lùi xuống, giữ nguyên bi và độ lệch');
  assert.equal(g.incoming.length, rowLen(g, -1));
  // Tốc độ gấp đôi sau mỗi SPEEDUP_HALF_LIFE giây, không nhanh quá mức của màn.
  assert.ok(Math.abs(rowSeconds({ level: 'de', time: SPEEDUP_HALF_LIFE }) - secs / 2) < 1e-9);
  assert.equal(rowSeconds({ level: 'de', time: 1e6 }), levelOf('de').minRowSeconds);
});

test('bi trôi chạm vạch dưới là thua, thua rồi không bắn được nữa', () => {
  const g = createGame('kho', 3);
  for (let i = 0; i < 1000 && g.status === 'play'; i++) advance(g, 0.5);
  assert.equal(g.status, 'lost');
  assert.equal(advance(g, 1), 0);
  assert.equal(shoot(g, Math.PI / 2), null);
});

test('chơi ngẫu nhiên thì ván luôn kết thúc, không lỗi, bi mới luôn là màu còn trên sân', () => {
  for (const lv of LEVELS)
    for (let seed = 1; seed <= 20; seed++) {
      const g = createGame(lv.id, seed);
      let s = seed;
      for (let i = 0; i < 2000 && g.status === 'play'; i++) {
        s = (s * 16807) % 2147483647;
        shoot(g, MIN_ANGLE + (s / 2147483647) * (MAX_ANGLE - MIN_ANGLE));
        advance(g, 0.6);
        const left = new Set(g.grid.flat().filter((v) => v >= 0));
        if (g.status === 'play' && left.size)
          assert.ok(left.has(g.current) || !left.size, 'bi đang cầm có màu trên sân');
      }
      assert.equal(g.status, 'lost', `${lv.id} seed ${seed} kết thúc`);
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
