import type { CSSProperties } from 'react';

// Bảng màu và font của English Traveler: trang thị thực của một cuốn hộ chiếu — nền giấy bảo an
// xanh nhạt có hoa văn sóng mảnh, mực xanh than của hộ chiếu, viền thư máy bay đỏ–lam, con dấu
// nhập cảnh mỗi nước một màu mực. Sáng vì người chơi học lúc rảnh, thường trên điện thoại ban ngày.
// Màn chơi chung (du-lich/stage.tsx) đọc màu qua các biến --dl-*.

export const FONT_URL =
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=IBM+Plex+Mono:wght@500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap';

export const PALETTE = {
  ground: '#e9f1ee', // giấy bảo an
  card: '#fbfcf8', // trang giấy trắng
  tile: '#ffffff',
  line: '#c5d3cf',
  ink: '#16224a', // mực hộ chiếu
  mute: '#52607c',
  accent: '#1d3f9e', // xanh thư máy bay: nút chính
  accentDeep: '#122a6c',
  onAccent: '#ffffff',
  accentInk: '#1d3f9e',
  airRed: '#d4342f', // đỏ thư máy bay
  good: '#1f8a55',
  goodSoft: '#dcf2e5',
  goodInk: '#14643d',
  bad: '#d4342f',
  badSoft: '#fbe4e1',
  badInk: '#9e1f1b',
} as const;

/** Màu mực con dấu của tám thành phố, theo thứ tự hành trình. */
export const STAMP_INKS = [
  '#c8312c',
  '#6b46c1',
  '#1f8a55',
  '#1d5fbf',
  '#d0661a',
  '#13808a',
  '#b5287a',
  '#7a5a2e',
];

export const VARS = {
  ...Object.fromEntries(Object.entries(PALETTE).map(([k, v]) => [`--dl-${k}`, v])),
  '--dl-r': '14px',
  '--dl-display': "'Bricolage Grotesque', system-ui, sans-serif",
  '--dl-target': "'Bricolage Grotesque', system-ui, sans-serif",
} as CSSProperties;

export const DISPLAY = '[font-family:var(--dl-display)] font-extrabold tracking-[-0.02em]';
/** Chữ in trên thẻ lên máy bay: mã sân bay, số hiệu chuyến, cửa, ghế. */
export const MONO = "font-['IBM_Plex_Mono',monospace] font-semibold uppercase tracking-[0.06em]";

/** Hoa văn giấy bảo an: các đường sóng mảnh chồng lệch nhau, vẽ một lần thành ảnh nền SVG. */
export const GUILLOCHE = (() => {
  const paths: string[] = [];
  for (let k = 0; k < 8; k++) {
    let d = `M0 ${8 + k * 7}`;
    for (let x = 0; x <= 240; x += 6) {
      const y = 8 + k * 7 + Math.sin((x / 240) * Math.PI * 4 + k * 0.7) * 4;
      d += ` L${x} ${y.toFixed(1)}`;
    }
    paths.push(`<path d='${d}' fill='none' stroke='%23d2e1dc' stroke-width='0.6'/>`);
  }
  return `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='72'>${paths.join('')}</svg>")`;
})();
