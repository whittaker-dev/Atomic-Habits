import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TOPICS as EN } from '../english-traveler/data';
import { TOPICS as ZH } from '../du-lich-trung-hoa/data';
import {
  check,
  createDeck,
  draw,
  LEG,
  legPlan,
  normalizeEn,
  pattern,
  points,
  seeded,
  toneless,
  toneMarks,
  wordMarks,
  type Item,
} from './dictation';
import { voiceId, voiceUrl } from './voice-file';

test('dữ liệu: 12 chủ đề, mỗi chủ đề 25 từ và 17 câu, không trùng trong cả game', () => {
  for (const topics of [EN, ZH]) {
    assert.equal(topics.length, 12);
    const all = topics.flatMap((t) => [...t.words, ...t.sentences].map((i) => i.text));
    assert.equal(new Set(all).size, all.length, 'có từ hoặc câu trùng');
    for (const t of topics) {
      assert.equal(t.words.length, 25, t.id);
      assert.equal(t.sentences.length, 17, t.id);
    }
  }
  for (const t of ZH)
    for (const i of [...t.words, ...t.sentences]) {
      assert.ok(i.pron, i.text);
      // Mỗi chữ Hán một âm tiết: số âm tiết trong pinyin khớp số chữ (đếm theo nguyên âm có dấu
      // không được vì có thanh nhẹ, nên kiểm bằng số chữ ≤ số chữ cái pinyin).
      assert.ok(toneless(i.pron!).length >= [...i.text.replace(/[。！？，]/g, '')].length, i.text);
    }
});

test('bộ bài: rút hết một lượt không lặp, sang lượt mới không ra lại ngay lá vừa rút', () => {
  const rng = seeded(5);
  const deck = createDeck(EN, rng);
  const total = EN.reduce((s, t) => s + t.words.length, 0);
  const first = Array.from({ length: total }, () => draw(deck, EN, 'word', rng).text);
  assert.equal(new Set(first).size, total);
  const tail = first.slice(-8);
  const next = Array.from({ length: 8 }, () => draw(deck, EN, 'word', rng).text);
  assert.ok(!next.some((t) => tail.includes(t)), 'lặp ngay ở chỗ nối hai lượt xáo');
});

test('bộ bài theo một chủ đề chỉ ra từ của chủ đề đó', () => {
  const food = EN.filter((t) => t.id === 'food');
  const deck = createDeck(food, seeded(1));
  for (let i = 0; i < 30; i++) assert.equal(draw(deck, food, 'sentence').topic, 'food');
});

test('chặng: đủ câu, càng xa càng nhiều câu dài', () => {
  for (let leg = 0; leg < 12; leg++) assert.equal(legPlan(leg).length, LEG);
  const count = (leg: number) => legPlan(leg).filter((k) => k === 'sentence').length;
  assert.equal(count(0), 1);
  assert.ok(count(4) > count(0));
  assert.equal(count(20), 4);
});

test('tiếng Anh: hoa thường, dấu câu, viết tắt đều không tính lỗi', () => {
  const item: Item = { text: "I don't eat beef.", vi: '' };
  assert.equal(check('i dont eat beef', item, 'en').verdict, 'right');
  assert.equal(check('I do not eat beef', item, 'en').verdict, 'right');
  assert.equal(check('I don’t eat beef!', item, 'en').verdict, 'right');
  assert.equal(normalizeEn("It's seven o'clock."), 'it is seven oclock');
  assert.equal(
    check('It is 7 oclock', { text: "It is seven o'clock.", vi: '' }, 'en').verdict,
    'right',
  );
  assert.equal(
    check('It is 13 oclock', { text: "It is seven o'clock.", vi: '' }, 'en').verdict,
    'wrong',
  );
});

test('tiếng Anh: gõ nhầm một chữ là gần đúng, sai hẳn là sai', () => {
  const item: Item = { text: 'passport', vi: '' };
  assert.equal(check('pasport', item, 'en').verdict, 'close');
  assert.equal(check('ticket', item, 'en').verdict, 'wrong');
  assert.equal(
    check('bus', { text: 'bag', vi: '' }, 'en').verdict,
    'wrong',
    'từ ngắn không có gần đúng',
  );
  assert.equal(
    check('Where is the staton', { text: 'Where is the station?', vi: '' }, 'en').verdict,
    'close',
  );
});

test('tiếng Anh: đánh dấu từng từ đúng/sai', () => {
  const m = wordMarks('where the station', 'Where is the station?');
  assert.deepEqual(
    m.map((w) => w.ok),
    [true, false, true, true],
  );
  assert.deepEqual(
    wordMarks('I am from Vietnam', "I'm from Vietnam.").map((w) => w.ok),
    [true, true, true],
  );
});

test('tiếng Trung: pinyin có dấu, không dấu, số thanh, chữ Hán đều nhận', () => {
  const item: Item = { text: '你好', pron: 'nǐ hǎo', vi: '' };
  assert.deepEqual(check('ni hao', item, 'zh'), { verdict: 'right', tones: false });
  assert.deepEqual(check('nihao', item, 'zh'), { verdict: 'right', tones: false });
  assert.deepEqual(check('nǐ hǎo', item, 'zh'), { verdict: 'right', tones: true });
  assert.deepEqual(check('ni3 hao3', item, 'zh'), { verdict: 'right', tones: true });
  assert.deepEqual(check('ní hǎo', item, 'zh'), { verdict: 'right', tones: false });
  assert.deepEqual(check('你好', item, 'zh'), { verdict: 'right', tones: true });
  assert.equal(check('xie xie', item, 'zh').verdict, 'wrong');
  const lv: Item = { text: '旅游', pron: 'lǚyóu', vi: '' };
  assert.equal(check('lvyou', lv, 'zh').verdict, 'right');
  assert.equal(check('luyou', lv, 'zh').verdict, 'right');
  const s: Item = { text: '我要一杯咖啡。', pron: 'Wǒ yào yì bēi kāfēi.', vi: '' };
  assert.equal(check('wo yao yi bei kafei', s, 'zh').verdict, 'right');
  assert.equal(check('wo yao yi bei kafe', s, 'zh').verdict, 'close');
  assert.deepEqual(toneMarks('xièxie'), [4]);
});

test('điểm: từ 10, câu 20, gợi ý và gần đúng chia đôi, chuỗi đúng cộng thêm, đúng thanh thêm nửa', () => {
  const right = { verdict: 'right', tones: false } as const;
  assert.equal(points('word', right, false, 0), 10);
  assert.equal(points('sentence', right, false, 0), 20);
  assert.equal(points('word', right, true, 0), 5);
  assert.equal(points('word', { verdict: 'close', tones: false }, false, 0), 5);
  assert.equal(points('word', right, false, 3), 16);
  assert.equal(points('word', right, false, 99), 20);
  assert.equal(points('word', { verdict: 'right', tones: true }, false, 0), 15);
  assert.equal(points('sentence', { verdict: 'wrong', tones: false }, false, 4), 0);
});

test('gợi ý: khuôn chữ', () => {
  assert.equal(pattern({ text: 'Go home.', vi: '' }, 'en'), '_ _   _ _ _ _ .');
  assert.equal(pattern({ text: '你好吗？', pron: '', vi: '' }, 'zh'), '□ □ □');
});

test('giọng đọc: mọi từ và câu đều có file ghi sẵn, mã file không trùng', () => {
  const pub = fileURLToPath(new URL('../../../public', import.meta.url));
  for (const [lang, topics] of [
    ['en', EN],
    ['zh', ZH],
  ] as const) {
    const texts = topics.flatMap((t) => [...t.words, ...t.sentences].map((i) => i.text));
    assert.equal(new Set(texts.map(voiceId)).size, texts.length, 'hai câu trùng mã file');
    const missing = texts.filter((t) => !existsSync(pub + voiceUrl(t, lang)));
    // Thiếu file thì game vẫn đọc bằng giọng trình duyệt, nhưng kém ổn định: chạy scripts/record-voices.ts.
    assert.deepEqual(missing, [], 'thiếu file giọng đọc, chạy scripts/record-voices.ts');
  }
});
