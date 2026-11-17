import type { CSSProperties } from 'react';

// Bảng màu và font của Du lịch Trung Hoa: sổ hành trình bằng giấy dó, mực đen nâu, mỗi ga tàu đóng
// một con dấu son, màu ngọc bích cho nút hành động như toa tàu cao tốc. Sáng, ấm, khác hẳn trang hộ
// chiếu xanh lạnh của English Traveler. Màn chơi chung (du-lich/run.tsx) đọc màu qua các biến --dl-*.
// Chữ Hán dùng Noto Serif SC (nét chuẩn, dễ nhìn cho người mới học); tên game viết bút lông Ma Shan
// Zheng, chỉ dùng cho bốn chữ 中国之旅.

export const FONT_URL =
  'https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700&family=Ma+Shan+Zheng&family=Noto+Serif:wght@700;800&family=Noto+Serif+SC:wght@600;700&display=swap';

export const PALETTE = {
  ground: '#f3ecdf', // giấy dó
  card: '#fbf7ee',
  tile: '#fffdf8',
  line: '#dccdb4',
  ink: '#1f1a14', // mực
  mute: '#6a5e4e',
  accent: '#1f6b5c', // ngọc bích: nút chính
  accentDeep: '#134a3f',
  onAccent: '#ffffff',
  accentInk: '#1d6455',
  seal: '#c23a22', // son
  sealDeep: '#8f2716',
  good: '#2e7d4f',
  goodSoft: '#e2eedc',
  goodInk: '#1f5a37',
  bad: '#c23a22',
  badSoft: '#f6e0d6',
  badInk: '#8f2716',
} as const;

export const VARS = {
  ...Object.fromEntries(Object.entries(PALETTE).map(([k, v]) => [`--dl-${k}`, v])),
  '--dl-r': '10px',
  '--dl-display': "'Noto Serif', Georgia, serif",
  '--dl-target': "'Noto Serif SC', 'Noto Serif', serif",
} as CSSProperties;

export const DISPLAY = '[font-family:var(--dl-display)] font-extrabold tracking-[-0.01em]';
export const HANZI = "[font-family:'Noto_Serif_SC',serif] font-bold";
export const BRUSH = "font-['Ma_Shan_Zheng',serif] font-normal";
