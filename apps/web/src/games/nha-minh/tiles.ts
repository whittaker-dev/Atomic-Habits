import { PALETTE } from './theme';

// Hoa văn gạch bông, vẽ bằng canvas. Mỗi viên đối xứng bốn góc nên lát liền nhau thì hoa văn nối thành
// mảng lớn như gạch thật. Cùng một hàm vẽ dùng cho mặt sàn 3D (view3d.ts) và ô mẫu trên giao diện,
// nên phòng nào trên màn cũng mang đúng viên gạch đang lát trong nhà.

export type TileId = 'hoa-thi' | 'ban-co' | 'sao' | 'qua-tram' | 'xi-mang';

export const TILES: { id: TileId; name: string; price: number }[] = [
  { id: 'hoa-thi', name: 'Hoa thị', price: 220 },
  { id: 'sao', name: 'Sao tám cánh', price: 240 },
  { id: 'ban-co', name: 'Bàn cờ', price: 160 },
  { id: 'qua-tram', name: 'Quả trám', price: 180 },
  { id: 'xi-mang', name: 'Xi măng trơn', price: 60 },
];

const { ox, teal, ochre, lime, cement, cementDeep } = PALETTE;

/** Một cánh hoa: hình lá nhọn từ tâm (cx, cy) theo góc `a`, dài `r`. */
function petal(
  c: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  a: number,
  r: number,
  w: number,
) {
  const tx = cx + Math.cos(a) * r;
  const ty = cy + Math.sin(a) * r;
  const nx = -Math.sin(a) * w;
  const ny = Math.cos(a) * w;
  const mx = cx + Math.cos(a) * r * 0.5;
  const my = cy + Math.sin(a) * r * 0.5;
  c.beginPath();
  c.moveTo(cx, cy);
  c.quadraticCurveTo(mx + nx, my + ny, tx, ty);
  c.quadraticCurveTo(mx - nx, my - ny, cx, cy);
  c.fill();
}

function star(c: CanvasRenderingContext2D, cx: number, cy: number, r: number, inner: number) {
  c.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8 - Math.PI / 2;
    const rr = i % 2 ? inner : r;
    c[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  c.closePath();
  c.fill();
}

/** Hoa thị trên nền `ground`, sao giữa viên màu `heart`. */
function hoaThi(c: CanvasRenderingContext2D, s: number, ground: string, heart: string) {
  c.fillStyle = ground;
  c.fillRect(0, 0, s, s);
  c.fillStyle = ochre;
  for (const [x, y] of [
    [0, 0],
    [s, 0],
    [0, s],
    [s, s],
  ] as const)
    for (let i = 0; i < 4; i++) petal(c, x, y, (i * Math.PI) / 2 + Math.PI / 4, s * 0.42, s * 0.13);
  c.fillStyle = heart;
  star(c, s / 2, s / 2, s * 0.2, s * 0.09);
  c.fillStyle = lime;
  c.beginPath();
  c.arc(s / 2, s / 2, s * 0.05, 0, Math.PI * 2);
  c.fill();
}

const DRAW: Record<TileId, (c: CanvasRenderingContext2D, s: number) => void> = {
  // Nền đỏ rượu, góc là bốn phần tư bông vàng nghệ: lát bốn viên thì thành một bông hoa thị trọn.
  'hoa-thi': (c, s) => hoaThi(c, s, ox, teal),
  // Nền vàng nghệ, sao đỏ rượu giữa viên, bốn góc là phần tư vòng xanh rêu.
  sao: (c, s) => {
    c.fillStyle = ochre;
    c.fillRect(0, 0, s, s);
    c.fillStyle = teal;
    for (const [x, y] of [
      [0, 0],
      [s, 0],
      [0, s],
      [s, s],
    ] as const) {
      c.beginPath();
      c.arc(x, y, s * 0.24, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = ox;
    star(c, s / 2, s / 2, s * 0.4, s * 0.2);
    c.fillStyle = lime;
    star(c, s / 2, s / 2, s * 0.14, s * 0.07);
  },
  // Bàn cờ xoay 45°: xanh rêu và vôi.
  'ban-co': (c, s) => {
    c.fillStyle = lime;
    c.fillRect(0, 0, s, s);
    c.fillStyle = teal;
    const h = s / 2;
    c.beginPath();
    c.moveTo(h, 0);
    c.lineTo(s, h);
    c.lineTo(h, s);
    c.lineTo(0, h);
    c.closePath();
    c.fill();
    c.fillStyle = lime;
    c.beginPath();
    c.moveTo(h, s * 0.25);
    c.lineTo(s * 0.75, h);
    c.lineTo(h, s * 0.75);
    c.lineTo(s * 0.25, h);
    c.closePath();
    c.fill();
  },
  // Nền vôi, quả trám đỏ rượu nối từ cạnh sang cạnh, chấm vàng ở giao điểm.
  'qua-tram': (c, s) => {
    c.fillStyle = lime;
    c.fillRect(0, 0, s, s);
    c.strokeStyle = ox;
    c.lineWidth = s * 0.07;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(s, s);
    c.moveTo(s, 0);
    c.lineTo(0, s);
    c.stroke();
    c.fillStyle = ochre;
    for (const [x, y] of [
      [s / 2, s / 2],
      [0, 0],
      [s, 0],
      [0, s],
      [s, s],
    ] as const) {
      c.beginPath();
      c.arc(x, y, s * 0.09, 0, Math.PI * 2);
      c.fill();
    }
  },
  'xi-mang': (c, s) => {
    c.fillStyle = cement;
    c.fillRect(0, 0, s, s);
  },
};

/** Vẽ một viên gạch `id` cỡ `size` px, có ron mạch vữa mảnh ở mép. */
export function drawTile(c: CanvasRenderingContext2D, id: TileId, size: number) {
  DRAW[id](c, size);
  c.strokeStyle = cementDeep;
  c.lineWidth = Math.max(1, size * 0.02);
  c.strokeRect(0, 0, size, size);
}

const cache = new Map<string, string>();

/** Ảnh data URL của một viên gạch, dùng làm nền ô mẫu trên giao diện (lặp bằng background-size). */
export function tileUrl(id: TileId, size = 96): string {
  const key = `${id}:${size}`;
  let url = cache.get(key);
  if (!url) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    drawTile(cv.getContext('2d')!, id, size);
    url = cv.toDataURL();
    cache.set(key, url);
  }
  return url;
}

/**
 * Viên gạch hoa thị theo màu người chơi, cho hàng gạch quỹ chung: A nền đỏ rượu tim xanh rêu, B nền
 * xanh rêu tim đỏ rượu. Mỗi viên đã tiêu là một viên gạch thật được lát, không phải ô màu trơn.
 */
export function seatTileUrl(seat: 0 | 1, size = 48): string {
  const key = `seat${seat}:${size}`;
  let url = cache.get(key);
  if (!url) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const c = cv.getContext('2d')!;
    hoaThi(c, size, seat ? teal : ox, seat ? ox : teal);
    url = cv.toDataURL();
    cache.set(key, url);
  }
  return url;
}
