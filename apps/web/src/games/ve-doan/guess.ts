// Chấm một câu đoán. Gõ không dấu vẫn tính đúng: bàn phím điện thoại nhiều người không bật Telex,
// và trò này thưởng cho tốc độ chứ không phải chính tả.

export type Verdict = 'correct' | 'near' | 'wrong';

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cur = row[j]!;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
  }
  return row[b.length]!;
}

// Loại từ đứng đầu ("con mèo", "cái ô", "quả xoài"): người đoán hay gõ thiếu, vẫn tính là đúng.
const CLASSIFIER = /^(con|cai|qua|chiec|cay|doi|chum|quyen) (?=\S)/;
const bare = (s: string) => s.replace(CLASSIFIER, '');

export function judgeGuess(guess: string, word: string): Verdict {
  const g = fold(guess);
  const w = fold(word);
  if (!g) return 'wrong';
  if (g === w || bare(g) === bare(w)) return 'correct';
  // Gần đúng: sai một chữ cái (từ dài: hai), hoặc trúng một tiếng của đáp án ("bánh tét" cho
  // "bánh chưng"). So trên dạng đã bỏ loại từ để "con chó" không sát "con mèo".
  const [bg, bw] = [bare(g), bare(w)];
  if (distance(bg, bw) <= (bw.length > 5 ? 2 : 1)) return 'near';
  // So tiếng sau khi bỏ loại từ: "con chó" không được tính gần đúng với "con mèo" chỉ vì chữ "con".
  const words = new Set(bw.split(' '));
  return bg.split(' ').some((t) => t.length > 1 && words.has(t)) ? 'near' : 'wrong';
}

/** Số chữ cái (không tính dấu cách) — hiện dưới hàng ô gợi ý. */
export const letterCount = (word: string) => word.replace(/\s/g, '').length;
