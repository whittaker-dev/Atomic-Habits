// Bản đồ Việt Nam dát vàng giữa bàn Cờ tỷ phú: đường viền giản lược (vĩ độ, kinh độ) đủ nhận ra
// dáng chữ S, các đảo lớn, hai quần đảo Hoàng Sa và Trường Sa, và ghim của tám vùng trên bàn.
// Không cần đúng tới từng vịnh — đây là hình trang trí, không phải bản đồ dẫn đường.

export type LatLon = readonly [number, number];

/** Viền đất liền, đi từ Móng Cái dọc bờ biển xuống Cà Mau, lên Hà Tiên rồi theo biên giới về lại. */
export const OUTLINE: LatLon[] = [
  [21.53, 107.97],
  [21.2, 107.55],
  [20.95, 107.1],
  [20.8, 106.75],
  [20.45, 106.6],
  [20.2, 106.4],
  [19.8, 105.95],
  [19.25, 105.75],
  [18.7, 105.75],
  [18.3, 106.05],
  [17.8, 106.45],
  [17.45, 106.65],
  [17.0, 107.1],
  [16.5, 107.65],
  [16.15, 108.15],
  [15.85, 108.45],
  [15.3, 108.85],
  [14.6, 109.05],
  [13.8, 109.25],
  [13.1, 109.35],
  [12.6, 109.4],
  [12.2, 109.25],
  [11.75, 109.2],
  [11.4, 109.0],
  [11.0, 108.65],
  [10.75, 108.0],
  [10.4, 107.3],
  [10.3, 106.95],
  [9.95, 106.65],
  [9.55, 106.3],
  [9.2, 105.9],
  [8.75, 105.3],
  [8.58, 104.82],
  [8.95, 104.8],
  [9.6, 104.85],
  [10.0, 105.1],
  [10.38, 104.48],
  [10.75, 105.05],
  [10.95, 105.6],
  [11.1, 106.15],
  [11.65, 105.95],
  [12.05, 106.45],
  [12.3, 107.5],
  [13.1, 107.55],
  [14.0, 107.45],
  [14.7, 107.55],
  [15.3, 107.4],
  [16.0, 107.2],
  [16.4, 106.85],
  [16.9, 106.55],
  [17.5, 105.95],
  [17.95, 105.6],
  [18.4, 105.15],
  [18.85, 104.5],
  [19.25, 104.1],
  [19.65, 104.1],
  [19.95, 104.6],
  [20.4, 104.45],
  [20.75, 104.1],
  [21.1, 103.3],
  [21.45, 102.95],
  [21.8, 102.75],
  [22.4, 102.15],
  [22.7, 102.65],
  [22.45, 103.6],
  [22.65, 104.0],
  [22.85, 104.75],
  [23.25, 105.1],
  [23.38, 105.32],
  [23.05, 105.85],
  [22.85, 106.55],
  [22.55, 106.75],
  [22.0, 106.75],
  [21.7, 107.3],
];

/** Đảo: tâm và bán kính (độ). */
export const ISLANDS: { at: LatLon; r: number }[] = [
  { at: [10.25, 103.95], r: 0.22 }, // Phú Quốc
  { at: [8.7, 106.6], r: 0.1 }, // Côn Đảo
  { at: [20.78, 107.05], r: 0.09 }, // Cát Bà
  { at: [10.6, 103.6], r: 0.05 }, // Thổ Chu, Nam Du (giản lược)
];

/** Hai quần đảo: các chấm nhỏ. */
export const ARCHIPELAGOS: { name: string; label: LatLon; dots: LatLon[] }[] = [
  {
    name: 'Hoàng Sa',
    label: [17.2, 111.9],
    dots: [
      [16.55, 111.6],
      [16.45, 112.3],
      [16.85, 112.3],
      [16.2, 111.9],
      [16.95, 111.75],
    ],
  },
  {
    name: 'Trường Sa',
    label: [11.6, 113.2],
    dots: [
      [10.4, 114.3],
      [10.2, 113.6],
      [9.9, 114.1],
      [9.5, 113.0],
      [8.65, 111.9],
      [10.9, 114.5],
      [9.1, 113.6],
    ],
  },
];

/** Ghim trên bản đồ: địa danh và nhóm màu (chỉ số trong GROUPS). */
export const PINS: { name: string; at: LatLon; group: number }[] = [
  { name: 'Hà Giang', at: [22.82, 104.98], group: 0 },
  { name: 'Sa Pa', at: [22.34, 103.84], group: 0 },
  { name: 'Hạ Long', at: [20.95, 107.08], group: 1 },
  { name: 'Hà Nội', at: [21.03, 105.85], group: 2 },
  { name: 'Huế', at: [16.46, 107.59], group: 3 },
  { name: 'Hội An', at: [15.88, 108.33], group: 4 },
  { name: 'Đà Lạt', at: [11.94, 108.44], group: 5 },
  { name: 'Nha Trang', at: [12.24, 109.19], group: 5 },
  { name: 'Cần Thơ', at: [10.03, 105.78], group: 6 },
  { name: 'Phú Quốc', at: [10.22, 103.96], group: 6 },
  { name: 'Sài Gòn', at: [10.78, 106.7], group: 7 },
];

/** Khung bản đồ trong toạ độ bàn: tâm (0, 0), trục z hướng về người xem (phía nam). */
const CENTER: LatLon = [15.8, 108.2];
const SCALE = 0.43;
const LON_K = Math.cos((16 * Math.PI) / 180);

/** Toạ độ (x, z) trên bàn của một điểm (vĩ độ, kinh độ). */
export function project([lat, lon]: LatLon): [number, number] {
  return [(lon - CENTER[1]) * LON_K * SCALE, -(lat - CENTER[0]) * SCALE];
}

/** Bán kính đảo đổi sang đơn vị bàn. */
export const projectRadius = (deg: number) => deg * SCALE;
