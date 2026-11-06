import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createBrain, think } from './bot';
import {
  coverage,
  createMatch,
  createTiles,
  floorCells,
  MATCH_TIME,
  MAX_AMMO,
  NO_INPUT,
  NONE,
  RELOAD,
  SHOT_RANGE,
  standings,
  step,
  STUN_TIME,
  TICK,
  type Input,
  type Match,
} from './engine';
import { COLS, EMPTY, HARD, idx, ROWS, SPAWNS } from '../bong-bong-bum/map';
import { ARENAS } from './arenas';

/** Sân trống trơn để test từng luật riêng rẽ; người chơi đứng ở các góc. */
function arena(players = 2, teams = false): Match {
  const m = createMatch({
    arena: 'plaza',
    teams,
    players: Array.from({ length: players }, (_, i) => ({
      name: `P${i + 1}`,
      charId: 'emberlark',
      bot: false,
    })),
  });
  m.tiles.fill(EMPTY);
  return m;
}

function run(m: Match, seconds: number, inputs: (Input | undefined)[] = []) {
  for (let t = 0; t < seconds; t += TICK) step(m, inputs);
}

test('mỗi sân đủ 13×15 ô, chỗ xuất phát trống, mọi ô sàn đi tới được', () => {
  for (const arena of ARENAS) {
    assert.equal(arena.rows.length, ROWS, arena.id);
    for (const row of arena.rows) assert.match(row, new RegExp(`^[.CPW~]{${COLS}}$`), arena.id);
    const tiles = createTiles(arena.id);
    for (const [x, y] of SPAWNS) assert.equal(tiles[idx(x, y)], EMPTY, `${arena.id} ${x},${y}`);
    // Loang từ chỗ xuất phát đầu tiên: số ô tới được phải bằng số ô sàn, không có góc bị vật cản cắt rời.
    const seen = new Set([idx(0, 0)]);
    const queue = [idx(0, 0)];
    while (queue.length) {
      const k = queue.pop()!;
      const x = k % COLS;
      const y = Math.floor(k / COLS);
      for (const [nx, ny] of [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ] as const) {
        const nk = idx(nx, ny);
        if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || tiles[nk] !== EMPTY || seen.has(nk))
          continue;
        seen.add(nk);
        queue.push(nk);
      }
    }
    assert.equal(seen.size, tiles.filter((t) => t === EMPTY).length, arena.id);
    assert.ok(
      tiles.some((t) => t === HARD),
      `${arena.id} có vật cản`,
    );
  }
});

test('đi tới đâu sơn tới đó', () => {
  const m = arena();
  run(m, 1, [{ dir: 'right', fire: false }]);
  const p = m.players[0]!;
  assert.ok(p.x > 3, `đã đi được ${p.x} ô`);
  for (let x = 0; x <= Math.floor(p.x); x++) assert.equal(m.paint[idx(x, 0)], 0, `ô ${x},0`);
  assert.equal(m.paint[idx(0, 1)], NONE);
  assert.equal(p.painted, Math.round(p.x) + 1);
});

test('bóng sơn bay tối đa SHOT_RANGE ô rồi vỡ thành hình dấu cộng', () => {
  const m = arena();
  const p = m.players[0]!;
  p.dir = 'right';
  step(m, [{ dir: null, fire: true }]);
  assert.equal(p.ammo, MAX_AMMO - 1);
  run(m, 1);
  assert.equal(m.shots.length, 0);
  for (let x = 0; x <= SHOT_RANGE; x++) assert.equal(m.paint[idx(x, 0)], 0, `vệt bay ô ${x}`);
  assert.equal(m.paint[idx(SHOT_RANGE + 1, 0)], 0, 'nhánh phải của dấu cộng');
  assert.equal(m.paint[idx(SHOT_RANGE, 1)], 0, 'nhánh dưới của dấu cộng');
  assert.equal(m.paint[idx(SHOT_RANGE + 2, 0)], NONE);
});

test('đụng tường thì vỡ ở ô trống cuối cùng', () => {
  const m = arena();
  m.tiles[idx(3, 0)] = HARD;
  m.players[0]!.dir = 'right';
  step(m, [{ dir: null, fire: true }]);
  run(m, 1);
  assert.equal(m.paint[idx(2, 0)], 0);
  assert.equal(m.paint[idx(2, 1)], 0, 'dấu cộng quanh ô 2,0');
  assert.equal(m.paint[idx(3, 0)], NONE, 'khối cố định không bị sơn');
});

test('hết sơn thì không bắn được, rồi hồi lại theo thời gian', () => {
  const m = arena();
  const p = m.players[0]!;
  m.players[1]!.x = 14;
  for (let i = 0; i < 10; i++) {
    step(m, [{ dir: null, fire: true }]);
    run(m, 0.3);
  }
  assert.ok(p.ammo < MAX_AMMO);
  run(m, RELOAD * MAX_AMMO + 0.1);
  assert.equal(p.ammo, MAX_AMMO);
});

test('trúng bóng sơn thì đứng hình, không chạy, không sơn; hết đứng hình được miễn trúng một lúc', () => {
  const m = arena();
  const a = m.players[0]!;
  const b = m.players[1]!;
  b.x = 3;
  b.y = 0;
  a.dir = 'right';
  step(m, [{ dir: null, fire: true }]);
  run(m, 0.4);
  assert.ok(b.stunT > 0, 'b đứng hình');
  assert.equal(a.hits, 1);
  const before = b.x;
  run(m, STUN_TIME - 0.5, [undefined, { dir: 'down', fire: false }]);
  assert.equal(b.x, before);
  assert.equal(b.y, 0, 'không đi được khi đứng hình');
  run(m, 0.6);
  assert.equal(b.stunT, 0);
  assert.ok(b.safeT > 0, 'được miễn trúng');
});

test('đồng đội không bắn trúng nhau', () => {
  const m = arena(3, true);
  const a = m.players[0]!;
  const mate = m.players[2]!;
  assert.equal(a.team, mate.team);
  mate.x = 3;
  mate.y = 0;
  a.dir = 'right';
  step(m, [{ dir: null, fire: true }]);
  run(m, 0.5);
  assert.equal(mate.stunT, 0);
  assert.equal(a.hits, 0);
});

test('hết giờ: phe phủ nhiều ô nhất thắng, xếp hạng theo lãnh địa', () => {
  const m = arena(3);
  m.paint.fill(NONE);
  for (let k = 0; k < 20; k++) m.paint[k] = 1;
  for (let k = 20; k < 30; k++) m.paint[k] = 0;
  m.time = TICK / 2;
  // Không ai di chuyển nên ô dưới chân vẫn là của họ; đặt cả ba vào ô đã có chủ.
  m.players[0]!.x = 5;
  m.players[0]!.y = 1;
  m.players[1]!.x = 2;
  m.players[1]!.y = 0;
  m.players[2]!.x = 3;
  m.players[2]!.y = 0;
  m.players[2]!.team = 1;
  step(m, []);
  assert.equal(m.over, true);
  assert.equal(m.winnerTeam, 1);
  const rows = standings(m);
  assert.equal(rows[0]!.player.team, 1);
  assert.equal(rows[2]!.player.id, 0);
  assert.equal(rows[0]!.cells, coverage(m).get(1));
  assert.ok(Math.abs(rows[0]!.share - 20 / floorCells(m)) < 1e-9);
});

test('hoà khi hai phe bằng ô', () => {
  const m = arena(2);
  m.paint.fill(NONE);
  m.paint[idx(0, 0)] = 0;
  m.paint[idx(14, 12)] = 1;
  m.players[1]!.x = 14;
  m.players[1]!.y = 12;
  m.time = TICK / 2;
  step(m, []);
  assert.equal(m.winnerTeam, null);
});

test('bot tự chạy đi sơn: sau 20 giây mỗi bot đã sơn nhiều ô và nửa sân có màu', () => {
  for (const diff of ['easy', 'medium', 'hard'] as const) {
    const m = createMatch({
      arena: 'plaza',
      players: Array.from({ length: 4 }, (_, i) => ({
        name: `B${i}`,
        charId: 'emberlark',
        bot: true,
      })),
    });
    const brains = m.players.map(() => createBrain(diff));
    for (let t = 0; t < 20; t += TICK)
      step(
        m,
        m.players.map((p) => think(brains[p.id]!, m, p, TICK)),
      );
    // Lãnh địa bị giành qua giành lại nên số ô cuối trận của từng bot dao động; đo số ô mỗi bot
    // đã sơn và tổng diện tích có màu thay vì lãnh địa còn giữ.
    for (const p of m.players)
      assert.ok(p.painted >= 20, `${diff} bot ${p.id}: sơn ${p.painted} ô`);
    const colored = [...coverage(m).values()].reduce((a, b) => a + b, 0);
    assert.ok(colored >= floorCells(m) / 2, `${diff}: ${colored}/${floorCells(m)} ô có màu`);
  }
});

test('trận kéo dài đúng MATCH_TIME', () => {
  const m = arena();
  run(m, MATCH_TIME - 1, [NO_INPUT, NO_INPUT]);
  assert.equal(m.over, false);
  run(m, 1.1);
  assert.equal(m.over, true);
});
