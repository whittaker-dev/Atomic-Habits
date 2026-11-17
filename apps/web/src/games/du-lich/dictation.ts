// Lõi chung của hai game du lịch học tiếng (English Traveler: tiếng Anh, vòng quanh thế giới; Du lịch
// Trung Hoa: tiếng Trung, đi tàu qua các thành phố Trung Quốc). Lối chơi là nghe rồi viết: máy đọc
// một từ hoặc một câu, người chơi gõ lại; tiếng Trung gõ pinyin (có hay không dấu thanh đều được,
// đúng cả thanh thì thêm điểm). Từ và câu chia theo chủ đề du lịch, rút từ bộ bài đã xáo để không lặp
// lại cho tới khi dùng hết. Chỉ có luật ở đây; hai game tự vẽ theo thế giới riêng.

export type Lang = 'en' | 'zh';

/** Một từ hoặc câu để nghe-viết. `pron` là pinyin có dấu thanh (chỉ tiếng Trung). */
export type Item = { text: string; pron?: string; vi: string };

export type Topic = { id: string; name: string; words: Item[]; sentences: Item[] };

export type Card = Item & { kind: 'word' | 'sentence'; topic: string };

/** Số lượt sai của cả chuyến; tới mỗi thành phố mới được hồi một lượt. */
export const HEARTS = 5;
/** Số câu của một chặng (giữa hai thành phố). */
export const LEG = 6;

export type Rng = () => number;

/** Bộ sinh số giả ngẫu nhiên có hạt giống, để kiểm thử dựng lại đúng một lượt rút. */
export function seeded(seed: number): Rng {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(list: readonly T[], rng: Rng): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

// ---------------------------------------------------------------------------
// Bộ bài: rút không lặp
// ---------------------------------------------------------------------------

/**
 * Hai chồng bài (từ, câu) của các chủ đề đã chọn, mỗi chồng xáo sẵn. Rút hết một chồng thì xáo lại,
 * và đẩy những lá vừa ra gần nhất xuống cuối để chỗ nối hai lượt xáo không ra lại ngay một từ.
 */
export type Deck = { words: Card[]; sentences: Card[]; recent: string[] };

function cards(topics: Topic[], kind: Card['kind']): Card[] {
  return topics.flatMap((t) =>
    (kind === 'word' ? t.words : t.sentences).map((i) => ({ ...i, kind, topic: t.id })),
  );
}

export function createDeck(topics: Topic[], rng: Rng = Math.random): Deck {
  return {
    words: shuffle(cards(topics, 'word'), rng),
    sentences: shuffle(cards(topics, 'sentence'), rng),
    recent: [],
  };
}

const RECENT = 8;

/** Rút một lá loại `kind`, đổi bộ bài tại chỗ. */
export function draw(
  deck: Deck,
  topics: Topic[],
  kind: Card['kind'],
  rng: Rng = Math.random,
): Card {
  const key = kind === 'word' ? 'words' : 'sentences';
  if (deck[key].length === 0) {
    const fresh = shuffle(cards(topics, kind), rng);
    const late = fresh.filter((c) => deck.recent.includes(c.text));
    deck[key] = [...fresh.filter((c) => !deck.recent.includes(c.text)), ...late];
  }
  const card = deck[key].shift()!;
  deck.recent = [...deck.recent, card.text].slice(-RECENT);
  return card;
}

/** Thứ tự từ/câu của một chặng: chặng đầu chủ yếu là từ, càng đi xa càng nhiều câu (tối đa 4/6). */
export function legPlan(leg: number): Card['kind'][] {
  const sentences = Math.min(1 + Math.floor(leg / 2), 4);
  const plan: Card['kind'][] = [];
  for (let i = 0; i < LEG; i++) plan.push(i >= LEG - sentences ? 'sentence' : 'word');
  return plan;
}

// ---------------------------------------------------------------------------
// Chấm bài
// ---------------------------------------------------------------------------

export type Verdict = 'right' | 'close' | 'wrong';

/** Khoảng cách sửa chữ (Levenshtein). */
export function distance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]!;
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const up = prev[j]!;
      prev[j] = Math.min(up + 1, prev[j - 1]! + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = up;
    }
  }
  return prev[b.length]!;
}

/** Sai một chút (gõ nhầm một chữ trên khoảng mười chữ) thì tính là gần đúng, không mất lượt. */
function closeEnough(input: string, answer: string): boolean {
  if (answer.length < 4) return false;
  return distance(input, answer) <= Math.max(1, Math.floor(answer.length / 10));
}

// Viết tắt và viết đủ đều đúng: "I'm" = "I am". Đổi cả hai bên về dạng viết đủ trước khi so.
const CONTRACTIONS: [RegExp, string][] = [
  [/\bi'm\b/g, 'i am'],
  [/\b(it|that|what|there|he|she|where|here)'s\b/g, '$1 is'],
  [/\b(\w+)'re\b/g, '$1 are'],
  [/\b(\w+)'ll\b/g, '$1 will'],
  [/\b(\w+)'ve\b/g, '$1 have'],
  [/\b(\w+)'d\b/g, '$1 would'],
  [/\bcan't\b/g, 'can not'],
  [/\bwon't\b/g, 'will not'],
  [/\b(\w+)n't\b/g, '$1 not'],
  [/\blet's\b/g, 'let us'],
  [/\bcannot\b/g, 'can not'],
];

// Người gõ trên điện thoại hay bỏ dấu nháy: "dont", "im". Chỉ những dạng không lẫn với từ khác
// (bỏ "ill", "its", "well", "were" vì đều là từ thật).
const BARE: Record<string, string> = {
  dont: 'do not',
  doesnt: 'does not',
  didnt: 'did not',
  isnt: 'is not',
  arent: 'are not',
  wasnt: 'was not',
  cant: 'can not',
  wont: 'will not',
  im: 'i am',
  ive: 'i have',
  youre: 'you are',
  theyre: 'they are',
  whats: 'what is',
  thats: 'that is',
  lets: 'let us',
};
// Số viết bằng chữ số cũng đúng: "gate 5" = "gate five".
const NUMBERS = 'zero one two three four five six seven eight nine ten eleven twelve'.split(' ');

/** Câu tiếng Anh về dạng để so: chữ thường, bỏ dấu câu, viết tắt thành viết đủ, một dấu cách. */
export function normalizeEn(s: string): string {
  let out = s.toLowerCase().replace(/[’‘`]/g, "'");
  for (const [re, to] of CONTRACTIONS) out = out.replace(re, to);
  return out
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/'/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => BARE[w] ?? NUMBERS[Number(w)] ?? w)
    .join(' ');
}

/**
 * Từng từ của đáp án và người chơi có viết đúng từ đó không (theo dãy con chung dài nhất). Một từ
 * viết tắt ("I'm") thành nhiều mảnh khi so; đúng hết các mảnh mới tính từ đó đúng.
 */
export function wordMarks(input: string, answer: string): { text: string; ok: boolean }[] {
  const said = answer.split(' ');
  const a: string[] = [];
  const owner: number[] = [];
  said.forEach((w, i) =>
    normalizeEn(w)
      .split(' ')
      .filter(Boolean)
      .forEach((t) => {
        a.push(t);
        owner.push(i);
      }),
  );
  const b = normalizeEn(input).split(' ').filter(Boolean);
  const L = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      L[i]![j] = a[i] === b[j] ? L[i + 1]![j + 1]! + 1 : Math.max(L[i + 1]![j]!, L[i]![j + 1]!);
  const hit = Array<boolean>(a.length).fill(false);
  for (let i = 0, j = 0; i < a.length && j < b.length; ) {
    if (a[i] === b[j]) {
      hit[i] = true;
      i++;
      j++;
    } else if (L[i + 1]![j]! >= L[i]![j + 1]!) i++;
    else j++;
  }
  return said.map((text, w) => ({
    text,
    ok: owner.includes(w) && owner.every((o, k) => o !== w || hit[k]),
  }));
}

// Pinyin: mỗi âm tiết có nhiều nhất một nguyên âm mang dấu thanh.
const MARKS: Record<string, string> = {
  a: 'āáǎà',
  e: 'ēéěè',
  i: 'īíǐì',
  o: 'ōóǒò',
  u: 'ūúǔù',
  ü: 'ǖǘǚǜ',
};
const TONE_OF = new Map<string, [string, number]>();
for (const [base, marks] of Object.entries(MARKS))
  [...marks].forEach((m, i) => TONE_OF.set(m, [base, i + 1]));

/** Pinyin bỏ thanh để so: bỏ dấu thanh, số thanh, dấu cách, dấu câu; ü / v / u: viết thế nào cũng được. */
export function toneless(s: string): string {
  return [...s.toLowerCase()]
    .map((c) => TONE_OF.get(c)?.[0] ?? c)
    .join('')
    .replace(/[üv]/g, 'u')
    .replace(/[^a-z]/g, '');
}

/** Dãy thanh điệu người chơi đã ghi: theo dấu (nǐ hǎo) hoặc theo số (ni3 hao3); thanh nhẹ bỏ qua. */
export function toneMarks(s: string): number[] {
  const out: number[] = [];
  for (const c of s.toLowerCase()) {
    const t = TONE_OF.get(c);
    if (t) out.push(t[1]);
    else if (c >= '1' && c <= '4') out.push(Number(c));
  }
  return out;
}

const HANZI = /\p{Script=Han}/u;
const bareHanzi = (s: string) => [...s].filter((c) => HANZI.test(c)).join('');

export type Check = { verdict: Verdict; tones: boolean; marks?: { text: string; ok: boolean }[] };

/** Chấm một câu trả lời. Tiếng Trung nhận pinyin (có/không dấu) hoặc gõ thẳng chữ Hán. */
export function check(input: string, card: Item, lang: Lang): Check {
  if (lang === 'en') {
    const a = normalizeEn(card.text);
    const b = normalizeEn(input);
    const verdict: Verdict = a === b ? 'right' : closeEnough(b, a) ? 'close' : 'wrong';
    return { verdict, tones: false, marks: wordMarks(input, card.text) };
  }
  if (HANZI.test(input)) {
    const ok = bareHanzi(input) === bareHanzi(card.text);
    return { verdict: ok ? 'right' : 'wrong', tones: ok };
  }
  const a = toneless(card.pron ?? '');
  const b = toneless(input);
  const verdict: Verdict = a === b ? 'right' : closeEnough(b, a) ? 'close' : 'wrong';
  const typed = toneMarks(input);
  const tones =
    verdict === 'right' && typed.length > 0 && typed.join() === toneMarks(card.pron ?? '').join();
  return { verdict, tones };
}

// ---------------------------------------------------------------------------
// Điểm
// ---------------------------------------------------------------------------

/**
 * Điểm của một câu: từ 10, câu 20; gần đúng hay đã xem gợi ý thì mỗi thứ chia đôi; đúng liên tiếp
 * cộng thêm 2 điểm mỗi nhịp (tối đa +10); tiếng Trung ghi đúng cả thanh điệu thêm một nửa điểm gốc.
 * Sai thì 0.
 */
export function points(kind: Card['kind'], c: Check, hinted: boolean, streak: number): number {
  if (c.verdict === 'wrong') return 0;
  let base = kind === 'word' ? 10 : 20;
  if (c.tones) base *= 1.5;
  if (c.verdict === 'close') base /= 2;
  if (hinted) base /= 2;
  return Math.round(base) + Math.min(streak, 5) * 2;
}

/** Gợi ý: số chữ của từng từ (tiếng Anh) hoặc số chữ Hán, mỗi chữ một âm tiết (tiếng Trung), như "_ _ _ _   _ _". */
export function pattern(card: Item, lang: Lang): string {
  if (lang === 'zh') return [...bareHanzi(card.text)].map(() => '□').join(' ');
  return card.text
    .split(' ')
    .map((w) =>
      w
        .replace(/[a-z0-9]/gi, '_')
        .split('')
        .join(' '),
    )
    .join('   ');
}
