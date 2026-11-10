import type { CSSProperties } from 'react';

// Bảng màu và font riêng của Cờ cá ngựa: bãi chiến trường Tây Sơn về đêm — đá sẫm, sắt rèn, lửa
// đuốc, bốn màu cờ trận. Cố ý không dùng font và bộ giao diện của ba game kia.
// Giao diện React đọc màu qua biến CSS (--cc-*) gắn ở thẻ gốc; cảnh 3D đọc thẳng PALETTE.

export const FONT_URL =
  'https://fonts.googleapis.com/css2?family=Anton&family=Barlow+Semi+Condensed:wght@500;600;700;800&display=swap';

export const PALETTE = {
  night: '#0e1013', // nền: đêm trên bãi đá
  stone: '#1c2025', // tấm giáp: khung chứa
  stoneHi: '#2a3038', // tấm giáp sáng hơn, ô đang chọn
  iron: '#4a525c', // viền sắt, đường kẻ
  ash: '#9aa2ab', // chữ phụ
  bone: '#ece8e1', // chữ chính
  ember: '#ff6a1a', // lửa: nút chính, nhấn mạnh
  emberDeep: '#b8420e',
} as const;

/** Bốn nhà theo chiều kim đồng hồ từ góc trên trái; mỗi nhà một màu cờ trận. */
export const HOUSES = [
  { name: 'Đỏ', hex: '#e5383b', deep: '#8f1d20' },
  { name: 'Lục', hex: '#2fbf71', deep: '#17703f' },
  { name: 'Vàng', hex: '#f6b81a', deep: '#9c6f06' },
  { name: 'Lam', hex: '#3a86ff', deep: '#1c4cad' },
] as const;

export const VARS = {
  ...Object.fromEntries(Object.entries(PALETTE).map(([k, v]) => [`--cc-${k}`, v])),
  ...Object.fromEntries(HOUSES.map((h, i) => [`--cc-h${i}`, h.hex])),
} as CSSProperties;

/** Chữ khắc khổ đứng như bảng hiệu chiến trận; chữ thường dùng Barlow Semi Condensed. */
export const DISPLAY = "font-['Anton',sans-serif] font-normal uppercase tracking-[0.03em]";

/** Góc vát của tấm giáp (khung, nút): cắt chéo hai góc đối nhau. */
export const CHAMFER =
  '[clip-path:polygon(12px_0,100%_0,100%_calc(100%-12px),calc(100%-12px)_100%,0_100%,0_12px)]';
