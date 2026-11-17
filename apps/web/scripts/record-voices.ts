// Ghi sẵn giọng đọc cho hai game du lịch học tiếng (English Traveler, Du lịch Trung Hoa): mỗi từ, mỗi
// câu trong data.ts thành một file .m4a nhỏ trong public/games/<game>/voice/, tên file là mã băm của
// câu (du-lich/voice-file.ts). Game phát file này thay vì nhờ giọng đọc của trình duyệt, vốn chập chờn
// (có trình duyệt im lặng hẳn, máy không có giọng tiếng Trung...).
//
// Cần macOS (lệnh `say` với giọng Samantha và Tingting có sẵn) và ffmpeg. Chạy từ apps/web:
//   node --import ./scripts/ts-resolve.mjs --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/record-voices.ts
// Chỉ ghi những câu chưa có file, và xoá file của những câu đã bỏ khỏi data.ts.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Lang, Topic } from '../src/games/du-lich/dictation';
import { voiceId, voiceUrl } from '../src/games/du-lich/voice-file';
import { TOPICS as ZH } from '../src/games/du-lich-trung-hoa/data';
import { TOPICS as EN } from '../src/games/english-traveler/data';

// Tốc độ đọc (từ/phút của `say`): tiếng Anh chậm hơn mặc định một chút cho người mới học nghe rõ.
const VOICES: Record<Lang, { topics: Topic[]; voice: string; rate: number }> = {
  en: { topics: EN, voice: 'Samantha', rate: 160 },
  zh: { topics: ZH, voice: 'Tingting', rate: 170 },
};

const tmp = join(tmpdir(), 'record-voices.aiff');
let made = 0;
let removed = 0;

for (const [lang, { topics, voice, rate }] of Object.entries(VOICES) as [
  Lang,
  (typeof VOICES)['en'],
][]) {
  const texts = topics.flatMap((t) => [...t.words, ...t.sentences].map((i) => i.text));
  const dir = join('public', voiceUrl('x', lang).split('/').slice(0, -1).join('/'));
  mkdirSync(dir, { recursive: true });
  const keep = new Set(texts.map((t) => `${voiceId(t)}.m4a`));
  for (const text of texts) {
    const out = join('public', voiceUrl(text, lang));
    if (existsSync(out)) continue;
    execFileSync('say', ['-v', voice, '-r', String(rate), '-o', tmp, text]);
    // Một kênh, AAC 40 kb/s: khoảng 10 KB một câu, đủ rõ cho giọng nói.
    execFileSync('ffmpeg', [
      '-loglevel',
      'error',
      '-y',
      '-i',
      tmp,
      '-ac',
      '1',
      '-c:a',
      'aac',
      '-b:a',
      '40k',
      out,
    ]);
    made++;
  }
  for (const f of readdirSync(dir)) {
    if (f.endsWith('.m4a') && !keep.has(f)) {
      rmSync(join(dir, f));
      removed++;
    }
  }
}
rmSync(tmp, { force: true });
console.log(`Đã ghi ${made} file, xoá ${removed} file thừa.`);
