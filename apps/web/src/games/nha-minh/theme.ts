import type { CSSProperties } from 'react';

// Bảng màu và font riêng của Nhà Mình: nhà phố lát gạch bông. Nền xi măng, tường quét vôi, gạch đỏ
// rượu, xanh rêu và vàng nghệ. Người chơi A luôn là đỏ rượu, B luôn là xanh rêu, ở mọi màn. Vàng nghệ
// dành cho tiền và đúng một nút hành động chính mỗi màn.
// Giao diện React đọc màu qua biến CSS (--nm-*) gắn ở thẻ gốc; cảnh 3D đọc thẳng PALETTE.

export const FONT_URL =
  'https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@600;700&family=Mulish:wght@500;600;700;800;900&display=swap';

export const PALETTE = {
  cement: '#d9d4cb', // nền: sàn xi măng
  cementDeep: '#bfb7aa', // viền nền, đường kẻ trên xi măng
  lime: '#f2efe9', // bảng thao tác: tường quét vôi
  limeDeep: '#e4dfd5', // ô phụ trên bảng
  ox: '#8c2f2b', // gạch đỏ rượu: người chơi A
  oxDeep: '#5f1d1a',
  teal: '#1f5f5b', // gạch xanh rêu: người chơi B
  tealDeep: '#123d3a',
  ochre: '#d4a039', // vàng nghệ: tiền và nút chính
  ochreDeep: '#9c7220',
  ink: '#26221f', // chữ
  inkSoft: '#5e554c', // chữ phụ trên nền sáng
} as const;

export const VARS = Object.fromEntries(
  Object.entries(PALETTE).map(([k, v]) => [`--nm-${k}`, v]),
) as CSSProperties;

/** Chữ biển hiệu nhà phố cho tiêu đề và số tiền; chữ thường dùng Mulish. */
export const DISPLAY = "font-['Josefin_Sans',sans-serif] font-bold";

/** Màu của từng người chơi theo ghế: ghế 0 (A) bên trái, ghế 1 (B) bên phải, ở mọi màn. */
export const SEAT = [
  { color: PALETTE.ox, deep: PALETTE.oxDeep },
  { color: PALETTE.teal, deep: PALETTE.tealDeep },
] as const;
