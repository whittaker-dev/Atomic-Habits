import type { Seat } from './engine';

// Nhân vật làm quân của Cờ tỷ phú: bộ nhân vật riêng của game, dựng 3D bằng code trong figures.ts
// (không mượn nhân vật của game khác). Ở đây chỉ có danh sách và tên, để giao diện và luật chọn
// nhân vật không phải kéo theo three.js.

export const CAST = [
  { id: 'sen', name: 'Cô Sen' },
  { id: 'phuc', name: 'Ông Phúc' },
  { id: 'do', name: 'Cụ Đồ' },
  { id: 'ti', name: 'Bé Tí' },
  { id: 'lan', name: 'Bé Lân' },
  { id: 'bien', name: 'Anh Biển' },
  { id: 'hoa', name: 'Chị Hoa' },
  { id: 'tu', name: 'Bà Tư' },
  { id: 'meo', name: 'Mèo Vàng' },
  { id: 'trau', name: 'Trâu Con' },
] as const;

export const ROSTER: string[] = CAST.map((c) => c.id);
const NAMES = new Map<string, string>(CAST.map((c) => [c.id, c.name]));
const known = new Set(ROSTER);

export const characterName = (id: string) => NAMES.get(id) ?? NAMES.get(ROSTER[0]!)!;

/** Nhân vật của một ghế; ván lưu từ trước (chưa có nhân vật, hay nhân vật cũ đã bỏ) thì lấy theo số ghế. */
export const characterOf = (seat: Pick<Seat, 'id' | 'character'>) =>
  seat.character && known.has(seat.character) ? seat.character : ROSTER[seat.id % ROSTER.length]!;

/** Một nhân vật chưa ai chọn (máy lấy ngẫu nhiên, người mới vào phòng lấy cái đầu tiên còn trống). */
export function freeCharacter(taken: (string | undefined)[], random = false): string {
  const free = ROSTER.filter((id) => !taken.includes(id));
  if (!free.length) return ROSTER[0]!;
  return random ? free[Math.floor(Math.random() * free.length)]! : free[0]!;
}

const SAVE_KEY = 'cotyphu.character';

/** Nhân vật người chơi chọn lần trước trên máy này (dùng cho phòng online và chơi với máy). */
export function loadCharacter(): string {
  try {
    const id = localStorage.getItem(SAVE_KEY);
    if (id && known.has(id)) return id;
  } catch {
    // Không đọc được bộ nhớ thì lấy nhân vật đầu danh sách.
  }
  return ROSTER[0]!;
}

export function saveCharacter(id: string) {
  try {
    localStorage.setItem(SAVE_KEY, id);
  } catch {
    // Không lưu được thì chỉ áp dụng cho lần này.
  }
}
