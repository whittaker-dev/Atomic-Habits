import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createBrain, dangerMap, think } from './bot';
import {
  CLONE_TIME,
  createMatch,
  explode,
  FUSE,
  NO_INPUT,
  SPIRAL,
  step,
  standings,
  SUDDEN_AT,
  TICK,
  TRAP_TIME,
  type Bomb,
  type Input,
  type Match,
} from './engine';
import { createMap, EMPTY, HARD, idx, SOFT, SPAWNS, THEMES } from './map';

/** Bản đồ trống trơn (không cột, không khối) để test từng luật riêng rẽ. Người chơi đứng ở các góc. */
function arena(players = 2, teams = false, dropChance = 0): Match {
  const m = createMatch({
    theme: 'schoolyard',
    seed: 1,
    teams,
    dropChance,
    players: Array.from({ length: players }, (_, i) => ({
      name: `P${i + 1}`,
      charId: 'com',
      bot: false,
    })),
  });
  m.tiles.fill(EMPTY);
  return m;
}

function put(m: Match, id: number, x: number, y: number) {
  m.players[id]!.x = x;
  m.players[id]!.y = y;
}

function addBomb(m: Match, x: number, y: number, range: number, owner = 0, t = FUSE): Bomb {
  const b: Bomb = { id: m.nextId++, x, y, owner, range, pierce: false, t, passers: [] };
  m.bombs.push(b);
  return b;
}

function run(m: Match, seconds: number, inputs: (Input | undefined)[] = []) {
  for (let t = 0; t < seconds; t += TICK) step(m, inputs);
}

test('nổ chữ thập: dừng trước khối cố định, phá khối mềm rồi dừng', () => {
  const m = arena();
  m.tiles[idx(9, 6)] = HARD;
  m.tiles[idx(7, 4)] = SOFT;
  m.tiles[idx(7, 3)] = SOFT;
  explode(m, addBomb(m, 7, 6, 2));
  const [bl] = m.blasts;
  assert.deepEqual(
    { up: bl!.up, down: bl!.down, left: bl!.left, right: bl!.right },
    { up: 2, down: 2, left: 2, right: 1 },
  );
  assert.equal(m.tiles[idx(7, 4)], EMPTY, 'khối mềm đầu tiên bị phá');
  assert.equal(m.tiles[idx(7, 3)], SOFT, 'khối mềm phía sau còn nguyên');
  assert.equal(m.tiles[idx(9, 6)], HARD);
  assert.equal(m.bombs.length, 0);
});

test('nổ dây chuyền: quả trúng nổ cùng lúc, kể cả khi chưa hết giờ', () => {
  const m = arena();
  addBomb(m, 3, 6, 3, 0, TICK / 2);
  addBomb(m, 5, 6, 1, 1, FUSE);
  addBomb(m, 9, 6, 1, 1, FUSE);
  step(m, []);
  assert.equal(m.blasts.length, 2);
  assert.ok(m.blasts.some((b) => b.x === 5 && b.y === 6));
  assert.deepEqual(
    m.bombs.map((b) => [b.x, b.y]),
    [[9, 6]],
    'quả ngoài tầm không nổ',
  );
});

test('trúng nổ thì bị nhốt; đối thủ chạm vào là bị loại và được tính một lần hạ', () => {
  const m = arena();
  put(m, 1, 7, 6);
  addBomb(m, 6, 6, 1, 0, TICK / 2);
  step(m, []);
  assert.equal(m.players[1]!.state, 'trapped');
  assert.equal(m.players[1]!.trappedBy, 0);

  m.blasts = [];
  put(m, 0, 7, 6);
  step(m, []);
  assert.equal(m.players[1]!.state, 'out');
  assert.equal(m.players[0]!.kos, 1);
  assert.equal(m.over, true);
  assert.equal(m.winnerTeam, 0);
});

test('đồng đội chạm vào người bị nhốt thì cứu được', () => {
  const m = arena(3, true); // P1 và P3 cùng đội 0, P2 đội 1
  put(m, 2, 7, 6);
  addBomb(m, 6, 6, 1, 1, TICK / 2);
  step(m, []);
  assert.equal(m.players[2]!.state, 'trapped');
  m.blasts = [];
  put(m, 0, 7, 6);
  step(m, []);
  assert.equal(m.players[2]!.state, 'alive');
  assert.equal(m.players[0]!.kos, 0);
});

test('hết 4 giây trong bong bóng thì bị loại, người đặt bóng được tính hạ', () => {
  const m = arena(3);
  put(m, 1, 7, 6);
  addBomb(m, 6, 6, 1, 0, TICK / 2);
  step(m, []);
  run(m, TRAP_TIME - 0.1);
  assert.equal(m.players[1]!.state, 'trapped');
  run(m, 0.2);
  assert.equal(m.players[1]!.state, 'out');
  assert.equal(m.players[0]!.kos, 1);
});

test('kim: bấm nút đặt bóng khi bị nhốt để tự thoát, dùng một lần', () => {
  const m = arena(3);
  put(m, 1, 7, 6);
  m.players[1]!.needles = 1;
  addBomb(m, 6, 6, 1, 0, TICK / 2);
  step(m, []);
  m.blasts = [];
  step(m, [undefined, { dir: null, bomb: true }]);
  assert.equal(m.players[1]!.state, 'alive');
  assert.equal(m.players[1]!.needles, 0);
});

test('khiên chặn vụ nổ', () => {
  const m = arena();
  put(m, 1, 7, 6);
  m.players[1]!.shieldT = 3;
  addBomb(m, 6, 6, 1, 0, TICK / 2);
  step(m, []);
  assert.equal(m.players[1]!.state, 'alive');
});

test('rơi vật phẩm: khối mềm vỡ để lại vật phẩm, đi vào là nhặt', () => {
  const m = arena(2, false, 1);
  m.tiles[idx(5, 6)] = SOFT;
  explode(m, addBomb(m, 4, 6, 1));
  assert.equal(m.items.length, 1);
  const item = m.items[0]!;
  assert.deepEqual([item.x, item.y], [5, 6]);

  m.blasts = [];
  put(m, 0, 5, 6);
  const before = { ...m.players[0]! };
  step(m, []);
  const p = m.players[0]!;
  assert.equal(m.items.length, 0);
  assert.equal(p.items, 1);
  const gained =
    p.bombs -
    before.bombs +
    p.range -
    before.range +
    p.speedUps -
    before.speedUps +
    p.needles -
    before.needles +
    (p.shieldT > 0 ? 1 : 0);
  assert.equal(gained, 1);
});

test('không có tỉ lệ rơi thì không có vật phẩm', () => {
  const m = arena(2, false, 0);
  m.tiles[idx(5, 6)] = SOFT;
  explode(m, addBomb(m, 4, 6, 1));
  assert.equal(m.items.length, 0);
});

test('được đi ra khỏi quả vừa đặt dưới chân, nhưng không quay lại xuyên qua nó', () => {
  const m = arena();
  put(m, 0, 3, 6);
  step(m, [{ dir: null, bomb: true }]);
  assert.equal(m.bombs.length, 1);
  run(m, 0.6, [{ dir: 'right', bomb: false }]);
  assert.ok(m.players[0]!.x >= 4, 'đã rời khỏi ô có bóng');
  run(m, 0.6, [{ dir: 'left', bomb: false }]);
  assert.equal(m.players[0]!.x, 4, 'bị quả bóng chặn lại');
});

test('người khác không đi xuyên qua bóng', () => {
  const m = arena();
  put(m, 1, 6, 6);
  addBomb(m, 5, 6, 1, 0);
  run(m, 0.5, [undefined, { dir: 'left', bomb: false }]);
  assert.equal(m.players[1]!.x, 6);
});

test('cua góc: hơi lệch làn khi rẽ thì tự trượt vào lối mở bên cạnh', () => {
  const m = arena();
  m.tiles[idx(4, 5)] = HARD; // ngay phía trên
  put(m, 0, 4.35, 6); // lệch sang phải 0,35 ô, phía trên ô (5,5) đang mở
  run(m, 0.6, [{ dir: 'up', bomb: false }]);
  assert.equal(m.players[0]!.x, 5);
  assert.ok(m.players[0]!.y < 6);
});

test('đột tử: khối rơi từ mép vào và đè trúng người thì bị loại', () => {
  const m = arena(3);
  const first = SPIRAL[0]!;
  put(m, 2, first % 15, Math.floor(first / 15));
  put(m, 0, 7, 6);
  m.time = SUDDEN_AT;
  step(m, []);
  assert.equal(m.tiles[first], HARD);
  assert.equal(m.players[2]!.state, 'out');
});

test('bóng lửa: nổ xuyên qua khối mềm', () => {
  const m = arena();
  m.tiles[idx(5, 6)] = SOFT;
  m.tiles[idx(6, 6)] = SOFT;
  const b = addBomb(m, 4, 6, 3);
  b.pierce = true;
  explode(m, b);
  assert.equal(m.tiles[idx(5, 6)], EMPTY);
  assert.equal(m.tiles[idx(6, 6)], EMPTY);
  assert.equal(m.blasts[0]!.right, 3);
});

test('thêm mạng: hết giờ trong bong bóng thì sống lại thay vì bị loại', () => {
  const m = arena(3);
  put(m, 1, 7, 6);
  m.players[1]!.lives = 1;
  addBomb(m, 6, 6, 1, 0, TICK / 2);
  step(m, []);
  run(m, TRAP_TIME + 0.1);
  assert.equal(m.players[1]!.state, 'alive');
  assert.equal(m.players[1]!.lives, 0);
  assert.equal(m.players[0]!.kos, 0);
});

test('dịch chuyển: nhặt xong đứng ở ô trống cách xa', () => {
  const m = arena(2, false);
  put(m, 0, 7, 6);
  m.items.push({ x: 7, y: 6, kind: 'teleport' });
  step(m, []);
  const p = m.players[0]!;
  assert.ok(Math.abs(p.x - 7) + Math.abs(p.y - 6) >= 5);
  assert.equal(m.tiles[idx(p.x, p.y)], EMPTY);
});

test('phân thân: xuất hiện cùng đội, tự tan, không tính vào thắng thua', () => {
  const m = arena(2);
  put(m, 0, 7, 6);
  m.items.push({ x: 7, y: 6, kind: 'clone' });
  step(m, []);
  const clone = m.players[2]!;
  assert.equal(clone.cloneOf, 0);
  assert.equal(clone.team, m.players[0]!.team);
  assert.equal(clone.bot, true);

  // Người thật P2 bị loại → P1 thắng dù phân thân vẫn còn; bảng xếp hạng không có phân thân.
  put(m, 1, 12, 6);
  m.players[1]!.state = 'trapped';
  m.players[1]!.trapT = TICK / 2;
  step(m, []);
  assert.equal(m.over, true);
  assert.equal(m.winnerTeam, m.players[0]!.team);
  assert.equal(standings(m).length, 2);
});

test('phân thân tự tan sau 8 giây', () => {
  const m = arena(3);
  put(m, 0, 7, 6);
  m.items.push({ x: 7, y: 6, kind: 'clone' });
  step(m, []);
  run(m, CLONE_TIME + 0.1);
  assert.equal(m.players[3]!.state, 'out');
});

test('mọi bản đồ: chỗ xuất phát không bị chặn và mọi chỗ xuất phát thông nhau (bỏ qua khối mềm)', () => {
  assert.ok(THEMES.length >= 10);
  for (const theme of THEMES) {
    const tiles = createMap(7, theme);
    for (const [x, y] of SPAWNS)
      assert.equal(tiles[idx(x, y)], EMPTY, `${theme.name}: chỗ xuất phát (${x},${y}) bị chặn`);
    // Khối mềm phá được nên chỉ khối cố định mới có thể chia cắt bản đồ.
    const seen = new Set([idx(SPAWNS[0]![0], SPAWNS[0]![1])]);
    const queue = [...seen];
    while (queue.length) {
      const k = queue.pop()!;
      const x = k % 15;
      const y = Math.floor(k / 15);
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const nx = x + dx;
        const ny = y + dy;
        const n = idx(nx, ny);
        if (nx < 0 || ny < 0 || nx >= 15 || ny >= 13 || tiles[n] === HARD || seen.has(n)) continue;
        seen.add(n);
        queue.push(n);
      }
    }
    for (const [x, y] of SPAWNS)
      assert.ok(seen.has(idx(x, y)), `${theme.name}: không tới được (${x},${y})`);
    // Mỗi chỗ xuất phát phải có ít nhất một ô trống kề bên để né quả bóng đầu tiên.
    for (const [x, y] of SPAWNS) {
      const exits = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].filter(
        ([dx, dy]) =>
          tiles[idx(x + dx!, y + dy!)] === EMPTY &&
          x + dx! >= 0 &&
          x + dx! < 15 &&
          y + dy! >= 0 &&
          y + dy! < 13,
      );
      assert.ok(exits.length > 0, `${theme.name}: (${x},${y}) không có lối né`);
    }
  }
});

test('hố đen: nuốt mọi quả bóng trong vùng 3 ô quanh người nhặt, quả ở xa vẫn còn', () => {
  const m = arena(2);
  put(m, 0, 7, 6);
  addBomb(m, 9, 4, 2, 1); // cách 2 ô — bị nuốt
  addBomb(m, 10, 9, 2, 1); // cách đúng 3 ô — bị nuốt
  addBomb(m, 11, 6, 2, 1); // cách 4 ô — còn
  m.items.push({ x: 7, y: 6, kind: 'hole' });
  step(m, []);
  assert.deepEqual(
    m.bombs.map((b) => [b.x, b.y]),
    [[11, 6]],
  );
  assert.equal(m.blasts.length, 0, 'bóng bị nuốt không nổ');
  assert.equal(m.holes.length, 1);
  run(m, 1);
  assert.equal(m.holes.length, 0, 'hiệu ứng tự tắt');
});

test('bot: đứng trong tầm nổ thì chạy ra ô an toàn', () => {
  const m = arena(2);
  put(m, 1, 7, 6);
  addBomb(m, 7, 6, 2, 0, 1.5);
  m.bombs[0]!.passers = [1];
  const brain = createBrain('medium');
  for (let t = 0; t < 1.4; t += TICK)
    step(m, [NO_INPUT, think(brain, m, m.players[1]!, TICK, () => 0.5)]);
  const danger = dangerMap(m);
  const p = m.players[1]!;
  assert.equal(danger[idx(Math.round(p.x), Math.round(p.y))], Infinity);
  run(m, 0.3);
  assert.equal(p.state, 'alive');
});
