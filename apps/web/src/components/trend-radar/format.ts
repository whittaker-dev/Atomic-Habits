// Cách hiển thị thời gian và con số của /trend-radar. Giờ luôn theo giờ Việt Nam để server (thường chạy UTC)
// và trình duyệt in ra cùng một chuỗi, tránh lệch khi hydrate.

const TIME_ZONE = 'Asia/Ho_Chi_Minh';

const relative = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' });
const compact = new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 });

export function timeAgo(iso: string, now: number): string {
  const minutes = Math.round((now - Date.parse(iso)) / 60_000);
  if (minutes < 1) return 'vừa xong';
  if (minutes < 60) return relative.format(-minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (hours < 24) return relative.format(-hours, 'hour');
  return relative.format(-Math.round(hours / 24), 'day');
}

export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIME_ZONE,
  });
}

export function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    timeZone: TIME_ZONE,
  });
}

export function compactNumber(n: number): string {
  return compact.format(n);
}

/** "PT1H2M5S" → "1:02:05", "PT4M3S" → "4:03"; chuỗi rỗng nếu không đọc được (ví dụ video đang phát trực tiếp). */
export function videoDuration(iso: string): string {
  const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m || iso === 'PT') return '';
  const [h, min, s] = [m[1], m[2], m[3]].map((x) => Number(x ?? 0));
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${String(min).padStart(2, '0')}:${ss}` : `${min}:${ss}`;
}

/** Bỏ dấu và viết thường, để gõ "gia vang" vẫn khớp "giá vàng", gõ "da lat" vẫn khớp "Đà Lạt". */
export function foldText(text: string): string {
  return (
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      // đ không tách dấu được bằng NFD; ð là chữ Iceland mà dữ liệu địa danh đôi khi dùng thay cho đ.
      .replace(/[đð]/g, 'd')
  );
}

/**
 * Lọc theo chữ đang gõ (không phân biệt dấu) và xếp tên bắt đầu bằng chữ đó lên trước, rồi tới tên có một từ
 * bắt đầu bằng chữ đó, cuối cùng là tên chỉ chứa chữ đó ở giữa (gõ "han" thì Hàn Quốc trước Afghanistan).
 */
export function filterByQuery<T>(items: T[], name: (item: T) => string, query: string): T[] {
  const q = foldText(query.trim());
  if (!q) return items;
  // So thêm một dạng "lỏng": bỏ hết dấu cách (người gõ hay viết liền "hoian") và coi y như i (Lý/Lí; người gõ
  // "daili" để tìm Đại Lý, tên bính âm cũng là "Dali").
  const loose = (text: string) => text.replace(/\s+/g, '').replace(/y/g, 'i');
  const qCompact = loose(q);
  const rank = (text: string, compact: string) =>
    text.startsWith(q) || compact.startsWith(qCompact) ? 0 : text.includes(` ${q}`) ? 1 : 2;
  return items
    .map((item) => {
      const text = foldText(name(item));
      return { item, text, compact: loose(text) };
    })
    .filter(({ text, compact }) => text.includes(q) || compact.includes(qCompact))
    .sort((a, b) => rank(a.text, a.compact) - rank(b.text, b.compact))
    .map(({ item }) => item);
}
