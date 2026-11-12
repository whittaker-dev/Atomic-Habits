import type { CSSProperties } from 'react';

// Bảng màu và font riêng của Cờ tỷ phú: hộp sơn mài — nền đen bóng, son đỏ, vàng dát, vỏ trứng
// khảm. Cố ý không dùng font và bộ giao diện của các game khác.
// Giao diện React đọc màu qua biến CSS (--tp-*) gắn ở thẻ gốc; cảnh 3D đọc thẳng PALETTE.

export const FONT_URL =
  'https://fonts.googleapis.com/css2?family=Noto+Serif+Display:wght@600;800&family=Montserrat:wght@500;600;700&display=swap';

export const PALETTE = {
  lacquer: '#120b09', // nền: sơn mài đen
  lacquerHi: '#1f1310', // tấm sơn mài sáng hơn
  cinnabar: '#a3201a', // son đỏ: nút chính, khung
  cinnabarDeep: '#6e130f',
  gold: '#d4a73a', // vàng dát: chữ tiêu đề, viền
  goldHi: '#f0cf72',
  eggshell: '#efe6d2', // vỏ trứng: chữ thường
  ash: '#a8998a', // chữ phụ
  rule: '#4a3426', // đường kẻ trên nền sơn mài
} as const;

export const VARS = Object.fromEntries(
  Object.entries(PALETTE).map(([k, v]) => [`--tp-${k}`, v]),
) as CSSProperties;

/** Chữ có chân nét thanh nét đậm, như chữ khắc vàng trên hộp sơn mài; chữ thường dùng Montserrat. */
export const DISPLAY = "font-['Noto_Serif_Display',serif] font-extrabold";
