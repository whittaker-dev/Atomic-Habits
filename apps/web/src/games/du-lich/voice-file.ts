import type { Lang } from './dictation';

// Đường dẫn file giọng đọc ghi sẵn của một từ/câu. Tên file là mã băm của chính câu chữ, nên sửa câu
// trong data.ts thì file mới tự có tên mới (chạy lại scripts/record-voices.ts để ghi). Dùng chung cho
// game (phát) và script (ghi), nên file này không được import gì của React hay trình duyệt.

const DIR: Record<Lang, string> = {
  en: '/games/english-traveler/voice',
  zh: '/games/du-lich-trung-hoa/voice',
};

/** FNV-1a 32 bit, đủ để vài trăm câu mỗi tiếng không trùng (kiểm thử canh chuyện này). */
export function voiceId(text: string): string {
  let h = 0x811c9dc5;
  for (const c of text) {
    h ^= c.codePointAt(0)!;
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export const voiceUrl = (text: string, lang: Lang) => `${DIR[lang]}/${voiceId(text)}.m4a`;
