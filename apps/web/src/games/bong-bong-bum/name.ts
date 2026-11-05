// Tên hiển thị là dữ liệu duy nhất của người chơi rời khỏi máy (khi chơi qua mạng),
// nên mọi chỗ nhận tên đều đi qua cleanName.

export const NAME_MIN = 2;
export const NAME_MAX = 16;
const KEY = 'bongbongbum.name';

// Giữ chữ cái mọi thứ tiếng (kể cả dấu tiếng Việt tách rời), chữ số, khoảng trắng và vài dấu nối.
const DISALLOWED = /[^\p{L}\p{M}\p{N} _.\-]/gu;

export function cleanName(raw: string): string {
  return raw
    .normalize('NFC')
    .replace(DISALLOWED, '')
    .replace(/\s+/g, ' ')
    .trimStart()
    .slice(0, NAME_MAX);
}

export function nameError(name: string): string | null {
  return name.trim().length < NAME_MIN ? `Tên cần ít nhất ${NAME_MIN} ký tự.` : null;
}

export function loadName(): string {
  try {
    return cleanName(localStorage.getItem(KEY) ?? '');
  } catch {
    return '';
  }
}

export function saveName(name: string): void {
  try {
    localStorage.setItem(KEY, cleanName(name).trim());
  } catch {
    // Chế độ ẩn danh/chặn lưu trữ: vẫn chơi được, chỉ là lần sau phải nhập lại tên.
  }
}
