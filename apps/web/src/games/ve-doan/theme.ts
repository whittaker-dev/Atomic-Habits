import type { CSSProperties } from 'react';

// Bảng màu và font riêng của Vẽ Đoán: đêm hội chợ lô tô — bạt sân khấu tím than, vải đỏ, đèn vàng,
// vé giấy in. Cố ý không dùng Baloo 2 / Nunito và bộ thẻ kem viền mực của hai game kia.
// Giao diện React đọc màu qua biến CSS (--vd-*) gắn ở thẻ gốc, canvas đọc thẳng PALETTE.

export const FONT_URL =
  'https://fonts.googleapis.com/css2?family=Lalezar&family=Be+Vietnam+Pro:wght@500;600;700;800&display=swap';

export const PALETTE = {
  tarp: '#1b1440', // nền: bạt sân khấu ban đêm
  tarpHi: '#2b2060', // quầng sáng phía trên sân khấu, ô trên nền tối
  wire: '#4a3d80', // dây đèn, viền mờ trên nền tối
  red: '#d7263d', // vải sân khấu: khung bảng vẽ, thanh nhập
  redDeep: '#8f1427',
  gold: '#ffc93c', // nút chính, gần đúng, thẻ chữ được lật
  goldDeep: '#b8841a',
  leaf: '#1f9e5a', // đoán đúng
  bulb: '#fff3c4', // bóng đèn sáng, chữ trên nền tối
  paper: '#fff8e6', // giấy vé lô tô
  rule: '#c9b88f', // nét in trên vé
  ink: '#2a1f3d', // chữ trên giấy
  inkSoft: '#6f6350', // chữ phụ trên giấy
  mute: '#b9acd9', // chữ phụ trên nền tối
  board: '#fffdf6', // mặt bảng vẽ
} as const;

export const VARS = Object.fromEntries(
  Object.entries(PALETTE).map(([k, v]) => [`--vd-${k}`, v]),
) as CSSProperties;

/** Chữ biển hiệu sơn tay cho tiêu đề, số và vé; chữ thường dùng Be Vietnam Pro. */
export const DISPLAY = "font-['Lalezar',sans-serif] font-normal";

/** Bảng màu bút: tám màu phấn hội chợ, đủ tách nhau trên mặt bảng sáng. */
export const INKS = [
  { hex: '#2a1f3d', name: 'Đen' },
  { hex: '#d7263d', name: 'Đỏ' },
  { hex: '#ff8a1f', name: 'Cam' },
  { hex: '#ffc93c', name: 'Vàng' },
  { hex: '#1f9e5a', name: 'Xanh lá' },
  { hex: '#2b7de9', name: 'Xanh dương' },
  { hex: '#8e44c9', name: 'Tím' },
  { hex: '#8a5a2b', name: 'Nâu' },
] as const;

export const BRUSHES = [4, 9, 18] as const;
