import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createGame,
  finishDrawing,
  maskWord,
  pickWord,
  PICK_TIME,
  REVEAL_TIME,
  setConnected,
  standings,
  submitGuess,
  tick,
  type Game,
  type Phase,
} from './engine';

/** Pha hiện tại, đúng loại mong đợi (sai loại thì test hỏng ngay với thông báo rõ). */
function phase<K extends Phase['kind']>(g: Game, kind: K): Extract<Phase, { kind: K }> {
  const p = g.phase;
  if (p.kind !== kind) throw new Error(`đang ở pha ${p.kind}, cần ${kind}`);
  return p as Extract<Phase, { kind: K }>;
}

const SETTINGS = { turns: 3, drawTime: 80, pack: 'food' as const };

/** Ván ba người đã sang phần vẽ; trả về người vẽ, hai người đoán và từ. */
function drawing(seed = 7) {
  const g = createGame(SETTINGS, ['An', 'Bình', 'Chi'], 0, seed);
  const drawer = phase(g, 'pick').drawer;
  assert.ok(pickWord(g, drawer, 1, 0));
  const [a, b] = [0, 1, 2].filter((i) => i !== drawer) as [number, number];
  return { g, drawer, a, b, word: phase(g, 'draw').word };
}

test('chọn từ: ba từ khác nhau, chỉ người vẽ được chọn, hết giờ thì máy lấy từ đầu', () => {
  const g = createGame(SETTINGS, ['An', 'Bình', 'Chi'], 0, 1);
  const { drawer, choices } = phase(g, 'pick');
  assert.equal(new Set(choices).size, 3);
  assert.equal(pickWord(g, (drawer + 1) % 3, 0, 0), false);
  assert.equal(tick(g, PICK_TIME - 1), false);
  assert.equal(tick(g, PICK_TIME), true);
  assert.equal(phase(g, 'draw').word, choices[0]);
});

test('người vẽ không đoán được; đoán đúng được điểm theo thời gian và không đoán lại được', () => {
  const { g, drawer, a, b, word } = drawing();
  assert.equal(submitGuess(g, drawer, word, 1000), null);
  const early = submitGuess(g, a, word, 0);
  assert.equal(early?.verdict, 'correct');
  assert.equal(early?.points, 200);
  assert.equal(submitGuess(g, a, 'gì đó', 1000), null);
  const late = submitGuess(g, b, word, 79_000);
  assert.ok(late?.points && late.points >= 50 && late.points < 60);
});

test('cả phòng đoán ra thì hết lượt ngay; người vẽ được điểm theo tỉ lệ', () => {
  const { g, drawer, a, b, word } = drawing();
  submitGuess(g, a, word, 10_000);
  phase(g, 'draw');
  submitGuess(g, b, word, 20_000);
  const r = phase(g, 'reveal');
  assert.equal(r.results.find((x) => x.id === drawer)?.points, 200);
  assert.equal(g.seats[drawer]!.score, 200);
});

test('hết giờ: người chưa đoán ra 0 điểm, câu gần đúng được ghi làm lý do', () => {
  const { g, drawer, a, b, word } = drawing();
  submitGuess(g, a, word, 5000);
  assert.equal(submitGuess(g, b, `${word}x`, 6000)?.verdict, 'near');
  assert.equal(tick(g, 80_000), true);
  const r = phase(g, 'reveal');
  const rb = r.results.find((x) => x.id === b)!;
  assert.equal(rb.points, 0);
  assert.match(rb.why, /Gần đúng/);
  assert.equal(r.results.find((x) => x.id === drawer)?.points, 100);
});

test('gợi ý lật ở nửa thời gian và ba phần tư (từ đủ dài), không lật trùng', () => {
  const g = createGame({ ...SETTINGS, pack: 'things' }, ['An', 'Bình'], 0, 3);
  const pick = phase(g, 'pick');
  // Ép một từ dài để có hai gợi ý.
  pick.choices = ['bàn chải đánh răng', 'x', 'y'];
  pickWord(g, pick.drawer, 0, 0);
  tick(g, 39_000);
  assert.equal(phase(g, 'draw').hints.length, 0);
  tick(g, 40_000);
  tick(g, 60_000);
  const { hints } = phase(g, 'draw');
  assert.equal(hints.length, 2);
  assert.notEqual(hints[0], hints[1]);
});

test('người vẽ bấm Vẽ xong: hết lượt ngay, người chưa đoán ra 0 điểm; người khác không bấm được', () => {
  const { g, drawer, a, b, word } = drawing();
  submitGuess(g, a, word, 5000);
  assert.equal(finishDrawing(g, a, 6000), false);
  phase(g, 'draw');
  assert.equal(finishDrawing(g, drawer, 6000), true);
  const r = phase(g, 'reveal');
  assert.equal(r.results.find((x) => x.id === b)?.points, 0);
  assert.equal(r.results.find((x) => x.id === drawer)?.points, 100);
  assert.equal(r.endsAt, 6000 + REVEAL_TIME);
  assert.equal(finishDrawing(g, drawer, 7000), false);
});

test('maskWord giữ dấu cách và chữ đã lật', () => {
  assert.equal(maskWord('bánh chưng', [0, 4]), 'b___ c____');
  assert.equal(maskWord('phở', []), '___');
});

test('người vẽ rời phòng: bỏ lượt, không ai được điểm; ván đi tiếp sang người còn lại', () => {
  const { g, drawer } = drawing();
  setConnected(g, drawer, false, 1000);
  phase(g, 'reveal');
  assert.equal(
    g.seats.reduce((s, x) => s + x.score, 0),
    0,
  );
  tick(g, 1000 + REVEAL_TIME);
  assert.notEqual(phase(g, 'pick').drawer, drawer);
  assert.equal(g.turn, 2);
});

test('người đoán cuối cùng còn lại rời phòng: hết lượt luôn', () => {
  const { g, a, b, word } = drawing();
  submitGuess(g, a, word, 1000);
  setConnected(g, b, false, 2000);
  phase(g, 'reveal');
});

test('đủ số lượt thì kết thúc; người vẽ đi vòng; bảng xếp hạng theo điểm', () => {
  const g = createGame(SETTINGS, ['An', 'Bình', 'Chi'], 0, 11);
  const drawers: number[] = [];
  let now = 0;
  for (let guard = 0; g.phase.kind !== 'final' && guard < 100; guard++) {
    const p: Phase = g.phase;
    if (p.kind === 'pick') {
      drawers.push(p.drawer);
      now = p.endsAt;
    } else if (p.kind === 'draw') {
      for (const i of [0, 1, 2]) if (i !== p.drawer) submitGuess(g, i, p.word, now + 1000);
    } else if (p.kind === 'reveal') now = p.endsAt;
    tick(g, now);
  }
  phase(g, 'final');
  assert.equal(drawers.length, 3);
  assert.equal(new Set(drawers).size, 3);
  const s = standings(g);
  assert.ok(s[0]!.score >= s[1]!.score && s[1]!.score >= s[2]!.score);
});

test('còn dưới hai người thì kết thúc ván sau lượt đang chơi', () => {
  const { g, a, b } = drawing();
  setConnected(g, a, false, 1000);
  setConnected(g, b, false, 1000);
  phase(g, 'reveal');
  tick(g, 1000 + REVEAL_TIME);
  phase(g, 'final');
});
