import type { CSSProperties } from 'react';

// Bảng màu chung của Bong Bóng Bùm. Canvas đọc trực tiếp; giao diện React đọc qua biến CSS
// (PALETTE_VARS gắn ở thẻ gốc) để màu trên bản đồ và màu trên nút bấm không bao giờ lệch nhau.

export const PALETTE = {
  ink: '#1d2147', // viền dày và chữ đậm — "nét mực" của cả game
  night: '#2b3270', // nền khung, bảng điều khiển
  sky: '#4cc3f0', // nền trời, nút phụ
  skyDeep: '#2a8fd6',
  foam: '#e9f8ff', // bọt nổ, chữ trên nền tối
  sun: '#ffd23f', // nút chính, điểm nhấn
  coral: '#ff6b6b', // nguy hiểm, thua, đột tử
  bubble: '#ff8fc7', // bong bóng nhốt người
  mint: '#4fd1a5', // sẵn sàng, thắng
  cream: '#fff6e0', // nền thẻ
} as const;

export type PaletteKey = keyof typeof PALETTE;

/** Vai trò của từng màu, hiện ở trang bảng màu để giữ cách dùng nhất quán. */
export const PALETTE_ROLES: Record<PaletteKey, string> = {
  ink: 'Viền, chữ đậm',
  night: 'Khung, bảng',
  sky: 'Nền trời, nút phụ',
  skyDeep: 'Bóng đổ của trời',
  foam: 'Bọt nổ, chữ sáng',
  sun: 'Nút chính, điểm nhấn',
  coral: 'Nguy hiểm, đột tử',
  bubble: 'Bong bóng nhốt',
  mint: 'Sẵn sàng, thắng',
  cream: 'Nền thẻ',
};

export const PALETTE_VARS = Object.fromEntries(
  Object.entries(PALETTE).map(([k, v]) => [`--bb-${k}`, v]),
) as CSSProperties;

/** Màu riêng của từng chỗ (P1–P6): quả bóng nổ, viền ô người chơi, mũi tên trên đầu. */
export const SEAT_COLORS = [
  '#ff6b6b',
  '#4cc3f0',
  '#4fd1a5',
  '#ffb22e',
  '#b57cff',
  '#ff7ac8',
] as const;
