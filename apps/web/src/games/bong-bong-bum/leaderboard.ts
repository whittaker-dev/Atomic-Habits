// Bảng xếp hạng lưu trong localStorage của từng máy: mỗi máy chỉ ghi kết quả của người chơi trên máy đó.

export type BoardEntry = {
  name: string;
  wins: number;
  score: number;
  kos: number;
  matches: number;
};
export type MatchRecord = { name: string; won: boolean; score: number; kos: number };

const KEY = 'bongbongbum.board';
export const BOARD_SIZE = 10;

function readAll(): BoardEntry[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    if (!Array.isArray(data)) return [];
    return data.filter(
      (e): e is BoardEntry =>
        typeof e?.name === 'string' &&
        [e.wins, e.score, e.kos, e.matches].every((n) => typeof n === 'number'),
    );
  } catch {
    return [];
  }
}

export function loadBoard(): BoardEntry[] {
  return readAll()
    .sort((a, b) => b.score - a.score || b.wins - a.wins)
    .slice(0, BOARD_SIZE);
}

export function recordMatch(records: MatchRecord[]): void {
  const all = readAll();
  for (const r of records) {
    const key = r.name.trim().toLocaleLowerCase('vi');
    let e = all.find((x) => x.name.trim().toLocaleLowerCase('vi') === key);
    if (!e) {
      e = { name: r.name.trim(), wins: 0, score: 0, kos: 0, matches: 0 };
      all.push(e);
    }
    e.matches++;
    e.wins += r.won ? 1 : 0;
    e.score += r.score;
    e.kos += r.kos;
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // Không lưu được (ẩn danh/đầy bộ nhớ): bỏ qua, trận vẫn kết thúc bình thường.
  }
}
