import type { CSSProperties } from 'react';

// Bảng màu và font riêng của Bắn Bi Bá Khí: đấu trường khí công lúc chạng vạng — nền tím than, tấm
// kính tối viền sáng, khí xanh lơ làm màu hành động, hồng nộ khí làm màu nhấn. Cố ý không dùng font
// và bộ giao diện của các game khác. Giao diện đọc màu qua biến CSS (--bb-*) gắn ở thẻ gốc.

export const FONT_URL =
  'https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@600;700&family=Saira:wght@400;500;600;700&display=swap';

export const PALETTE = {
  night: '#0a0814', // nền
  panel: '#151127', // tấm kính tối
  panelHi: '#1e1838',
  line: '#3a2f63', // viền, đường kẻ
  text: '#efeaff',
  muted: '#9b93c4',
  ki: '#38e8ff', // khí: nút chính, thanh nạp
  rage: '#ff4d8d', // nộ khí: cảnh báo, nhấn
} as const;

/** Sáu màu bi: đỏ, lam, lục, vàng, tím, ngọc. */
export const BUBBLE_COLORS = [
  '#ff4d5e',
  '#3d8bff',
  '#3ddc84',
  '#ffd23f',
  '#b06bff',
  '#2fe0d0',
] as const;

export const VARS = Object.fromEntries(
  Object.entries(PALETTE).map(([k, v]) => [`--bb-${k}`, v]),
) as CSSProperties;

/** Chữ tiêu đề góc cạnh như bảng điểm võ đài; chữ thường dùng Saira. */
export const DISPLAY = "font-['Chakra_Petch',sans-serif] font-bold uppercase";
