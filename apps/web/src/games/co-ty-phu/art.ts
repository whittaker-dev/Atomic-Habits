import * as THREE from 'three';
import { BOARD, GROUPS, money } from './data';
import { ALL, BOARD_SIZE, isCorner, rectOf } from './layout';
import { ARCHIPELAGOS, project } from './map';
import { drawMotif, type Ink } from './motifs';
import { PALETTE } from './theme';

// Ảnh vẽ bằng canvas cho cảnh 3D của Cờ tỷ phú. Mặt bàn là một tấm ảnh lớn: 40 ô mặt ngà (mỗi ô
// một miếng khảm nổi trong view3d.ts lấy đúng phần ảnh của mình), chữ đứng thẳng về phía người xem
// vì camera cố định ở cạnh dưới; giữa bàn là nền sơn đen có sóng khảm trai, viền mảnh trai, tên game
// và bảng tám vùng (bản đồ chữ S dát vàng là khối 3D đặt lên trên). Thêm: mặt bàn trà gỗ, mặt xúc
// xắc ngà, mặt tiền nhà, nhãn chữ nổi.

/** Điểm ảnh cho mỗi đơn vị cảnh. */
export const PX = 200;
/** Khe sơn đen giữa các miếng khảm (đơn vị cảnh). */
export const GAP = 0.04;

export function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!] as const;
}

export function texture(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Xuống dòng theo bề rộng (tên ô dài như "Phố Nguyễn Huệ"). */
function wrap(g: CanvasRenderingContext2D, text: string, width: number) {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (g.measureText(next).width > width && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

const GOLD = PALETTE.gold;
const EGG = PALETTE.eggshell;
const IVORY = '#f1e7d0';
const INK = '#2a1610';
const LACQUER_TILE = '#1d120e';
const MOTIF_INK: Ink = {
  line: '#4a2c18',
  gold: '#b8862f',
  red: PALETTE.cinnabar,
  soft: 'rgba(184,134,47,0.22)',
};

/** Biểu tượng cho các ô đặc biệt, tâm (0, 0), cỡ khoảng s. */
function glyph(g: CanvasRenderingContext2D, kind: string, s: number, color: string) {
  g.save();
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = s * 0.07;
  g.lineJoin = 'round';
  g.lineCap = 'round';
  switch (kind) {
    case 'station': {
      // Đầu tàu: thân, cabin, ống khói, hai bánh.
      g.strokeRect(-s * 0.45, -s * 0.15, s * 0.7, s * 0.35);
      g.strokeRect(s * 0.05, -s * 0.42, s * 0.25, s * 0.27);
      g.fillRect(-s * 0.35, -s * 0.38, s * 0.12, s * 0.23);
      for (const x of [-0.28, 0.12]) {
        g.beginPath();
        g.arc(x * s, s * 0.3, s * 0.12, 0, Math.PI * 2);
        g.stroke();
      }
      break;
    }
    case 'power':
      g.beginPath();
      g.moveTo(s * 0.08, -s * 0.48);
      g.lineTo(-s * 0.22, s * 0.05);
      g.lineTo(s * 0.02, s * 0.05);
      g.lineTo(-s * 0.08, s * 0.48);
      g.lineTo(s * 0.24, -s * 0.06);
      g.lineTo(0, -s * 0.06);
      g.closePath();
      g.fill();
      break;
    case 'water':
      g.beginPath();
      g.moveTo(0, -s * 0.45);
      g.bezierCurveTo(s * 0.35, -s * 0.05, s * 0.35, s * 0.42, 0, s * 0.42);
      g.bezierCurveTo(-s * 0.35, s * 0.42, -s * 0.35, -s * 0.05, 0, -s * 0.45);
      g.fill();
      break;
    case 'gift':
      // Bao lì xì có đồng vàng.
      g.strokeRect(-s * 0.3, -s * 0.42, s * 0.6, s * 0.84);
      g.beginPath();
      g.moveTo(-s * 0.3, -s * 0.42);
      g.lineTo(0, -s * 0.16);
      g.lineTo(s * 0.3, -s * 0.42);
      g.stroke();
      g.beginPath();
      g.arc(0, s * 0.1, s * 0.14, 0, Math.PI * 2);
      g.fill();
      break;
    case 'luck':
      g.beginPath();
      g.arc(0, 0, s * 0.42, 0, Math.PI * 2);
      g.stroke();
      g.font = `800 ${s * 0.62}px "Noto Serif Display", serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('?', 0, s * 0.04);
      break;
    case 'tax':
      // Đồng xu có lỗ vuông.
      g.beginPath();
      g.arc(0, 0, s * 0.4, 0, Math.PI * 2);
      g.stroke();
      g.strokeRect(-s * 0.12, -s * 0.12, s * 0.24, s * 0.24);
      break;
    case 'jail':
      for (let i = -2; i <= 2; i++) {
        g.beginPath();
        g.moveTo(i * s * 0.17, -s * 0.42);
        g.lineTo(i * s * 0.17, s * 0.42);
        g.stroke();
      }
      g.strokeRect(-s * 0.42, -s * 0.42, s * 0.84, s * 0.84);
      break;
    case 'toJail':
      // Tay chỉ đường vào ô tạm giữ: mũi tên gập về phía trái.
      g.beginPath();
      g.moveTo(s * 0.4, -s * 0.3);
      g.lineTo(s * 0.4, s * 0.1);
      g.lineTo(-s * 0.3, s * 0.1);
      g.moveTo(-s * 0.08, -s * 0.12);
      g.lineTo(-s * 0.3, s * 0.1);
      g.lineTo(-s * 0.08, s * 0.32);
      g.stroke();
      break;
    case 'rest':
      // Chén trà bốc khói.
      g.beginPath();
      g.moveTo(-s * 0.35, -s * 0.02);
      g.lineTo(s * 0.35, -s * 0.02);
      g.lineTo(s * 0.22, s * 0.35);
      g.lineTo(-s * 0.22, s * 0.35);
      g.closePath();
      g.fill();
      for (const x of [-0.12, 0.12]) {
        g.beginPath();
        g.moveTo(x * s, -s * 0.15);
        g.bezierCurveTo(x * s + s * 0.1, -s * 0.28, x * s - s * 0.1, -s * 0.36, x * s, -s * 0.48);
        g.stroke();
      }
      break;
    case 'go':
      g.beginPath();
      g.moveTo(s * 0.45, 0);
      g.lineTo(-s * 0.3, 0);
      g.moveTo(-s * 0.05, -s * 0.25);
      g.lineTo(-s * 0.3, 0);
      g.lineTo(-s * 0.05, s * 0.25);
      g.stroke();
      break;
  }
  g.restore();
}

type Look = { bg: string; text: string; accent: string; glyph: string };

/** Màu từng loại ô: đất mặt ngà; ga, dịch vụ, vận may, thuế sơn đen; lì xì và hai góc son đỏ. */
function lookOf(kind: string): Look {
  switch (kind) {
    case 'land':
      return { bg: IVORY, text: INK, accent: PALETTE.cinnabar, glyph: GOLD };
    case 'rest':
      return { bg: IVORY, text: INK, accent: PALETTE.cinnabar, glyph: '#8a5a2b' };
    case 'gift':
    case 'go':
    case 'toJail':
      return {
        bg: PALETTE.cinnabar,
        text: PALETTE.goldHi,
        accent: PALETTE.goldHi,
        glyph: PALETTE.goldHi,
      };
    default:
      return { bg: LACQUER_TILE, text: EGG, accent: GOLD, glyph: GOLD };
  }
}

function setFont(g: CanvasRenderingContext2D, weight: number, px: number, serif = false) {
  g.font = serif
    ? `${weight} ${px}px "Noto Serif Display", serif`
    : `${weight} ${px}px Montserrat, sans-serif`;
}

/** Vẽ chữ nhiều dòng căn giữa, trả về đáy khối chữ. */
function lines(
  g: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  w: number,
  lh: number,
) {
  const ls = wrap(g, text, w).slice(0, 2);
  ls.forEach((l, k) => g.fillText(l, x, y + k * lh));
  return y + ls.length * lh;
}

/** Một miếng khảm: (x, y, w, h) là khung ô trong ảnh, `inner` là cạnh hướng vào giữa bàn. */
function drawTile(
  g: CanvasRenderingContext2D,
  i: number,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const s = BOARD[i]!;
  const side = rectOf(i).side;
  const look = lookOf(s.kind);
  g.save();
  // Mặt miếng khảm: sáng ở góc trên trái như có đèn chiếu.
  const grad = g.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, look.bg);
  grad.addColorStop(1, s.kind === 'land' || s.kind === 'rest' ? '#e2d3b2' : look.bg);
  g.fillStyle = grad;
  g.fillRect(x, y, w, h);
  g.strokeStyle =
    s.kind === 'land' || s.kind === 'rest' ? 'rgba(138,90,43,0.55)' : 'rgba(240,207,114,0.65)';
  g.lineWidth = 2;
  g.strokeRect(x + 7, y + 7, w - 14, h - 14);
  g.textAlign = 'center';
  g.textBaseline = 'top';

  // Dải màu vùng ở cạnh phía trong của ô đất.
  let cx = x;
  let cy = y;
  let cw = w;
  let ch = h;
  if (s.kind === 'land') {
    const band = side % 2 === 0 ? h * 0.2 : w * 0.18;
    g.fillStyle = GROUPS[s.group]!.color;
    const bx = side === 3 ? x : side === 1 ? x + w - band : x;
    const by = side === 0 ? y : side === 2 ? y + h - band : y;
    const bw = side % 2 === 0 ? w : band;
    const bh = side % 2 === 0 ? band : h;
    g.fillRect(bx, by, bw, bh);
    g.fillStyle = 'rgba(255,255,255,0.14)';
    g.fillRect(bx, by, bw, Math.min(bh, 6));
    g.strokeStyle = GOLD;
    g.lineWidth = 3;
    g.beginPath();
    if (side === 0) (g.moveTo(x, y + band), g.lineTo(x + w, y + band));
    if (side === 2) (g.moveTo(x, y + h - band), g.lineTo(x + w, y + h - band));
    if (side === 1) (g.moveTo(x + w - band, y), g.lineTo(x + w - band, y + h));
    if (side === 3) (g.moveTo(x + band, y), g.lineTo(x + band, y + h));
    g.stroke();
    if (side === 0) ((cy += band), (ch -= band));
    if (side === 2) ch -= band;
    if (side === 1) cw -= band;
    if (side === 3) ((cx += band), (cw -= band));
  }
  const pad = 12;
  cx += pad;
  cy += pad;
  cw -= pad * 2;
  ch -= pad * 2;
  const mid = cx + cw / 2;

  const price =
    s.kind === 'land' || s.kind === 'station' || s.kind === 'utility'
      ? money(s.price)
      : s.kind === 'tax'
        ? `Nộp ${money(s.amount)}`
        : s.kind === 'go'
          ? `Nhận ${money(2000)}`
          : '';
  const iconKind =
    s.kind === 'station'
      ? 'station'
      : s.kind === 'utility'
        ? s.name === 'Điện lực'
          ? 'power'
          : 'water'
        : s.kind;

  if (isCorner(i)) {
    // Ô góc: tên lớn kiểu chữ khắc, biểu tượng to ở giữa.
    g.fillStyle = look.text;
    setFont(g, 800, 40, true);
    g.fillText(s.name.toUpperCase(), mid, cy + 6);
    g.save();
    g.translate(mid, cy + ch * 0.56);
    glyph(g, iconKind, Math.min(cw, ch) * 0.5, look.glyph);
    g.restore();
    if (price) {
      setFont(g, 700, 30);
      g.fillStyle = look.accent;
      g.textBaseline = 'bottom';
      g.fillText(price, mid, cy + ch);
    }
    g.restore();
    return;
  }

  const row = side % 2 === 0;
  if (row) {
    // Hàng trên/dưới (ô hẹp, cao): tên trên, hình giữa, giá dưới.
    g.fillStyle = look.text;
    setFont(g, 800, 30);
    const nameBottom = lines(g, s.name, mid, cy, cw, 33);
    const priceH = price ? 34 : 0;
    const room = cy + ch - priceH - nameBottom;
    const size = Math.min(cw * 0.95, room * 1.3);
    g.save();
    g.translate(mid, nameBottom + room / 2 + 4);
    if (s.kind === 'land') drawMotif(g, s.name, size, MOTIF_INK);
    else glyph(g, iconKind, Math.min(cw, room) * 0.7, look.glyph);
    g.restore();
    if (price) {
      setFont(g, 700, 26);
      g.fillStyle = look.accent;
      g.textBaseline = 'bottom';
      g.fillText(price, mid, cy + ch);
    }
  } else {
    // Cột trái/phải (ô rộng, thấp): tên trên, hình bên trái, giá bên phải.
    g.fillStyle = look.text;
    setFont(g, 800, 30);
    const nameBottom = lines(g, s.name, mid, cy - 2, cw, 33);
    const room = cy + ch - nameBottom;
    const size = Math.min(cw * 0.5, room * 1.35);
    g.save();
    g.translate(cx + size * 0.5 + 2, nameBottom + room / 2 + 2);
    if (s.kind === 'land') drawMotif(g, s.name, size, MOTIF_INK);
    else glyph(g, iconKind, Math.min(size, room) * 0.75, look.glyph);
    g.restore();
    if (price) {
      setFont(g, 700, 26);
      g.fillStyle = look.accent;
      g.textAlign = 'right';
      g.textBaseline = 'bottom';
      g.fillText(price, cx + cw, cy + ch);
    }
  }
  g.restore();
}

/** Mảnh trai khảm: tứ giác lệch, ánh hồng ngả xanh. */
function pearlChip(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  rnd: () => number,
) {
  const pts = Array.from({ length: 4 }, (_, k) => {
    const a = (k / 4) * Math.PI * 2 + rnd() * 0.9;
    const d = r * (0.6 + rnd() * 0.5);
    return [x + Math.cos(a) * d, y + Math.sin(a) * d] as const;
  });
  const grad = g.createLinearGradient(x - r, y - r, x + r, y + r);
  grad.addColorStop(0, 'rgba(246,236,246,0.85)');
  grad.addColorStop(0.5, 'rgba(214,236,232,0.75)');
  grad.addColorStop(1, 'rgba(236,222,196,0.8)');
  g.fillStyle = grad;
  g.beginPath();
  pts.forEach(([px, py], k) => (k ? g.lineTo(px, py) : g.moveTo(px, py)));
  g.closePath();
  g.fill();
}

/** Mây vàng cuộn ở góc tranh. */
function cloud(g: CanvasRenderingContext2D, x: number, y: number, s: number, flip: number) {
  g.save();
  g.translate(x, y);
  g.scale(flip, 1);
  g.strokeStyle = 'rgba(212,167,58,0.55)';
  g.lineWidth = s * 0.05;
  g.lineCap = 'round';
  for (const [cx, cy, r] of [
    [0, 0, 0.3],
    [0.42, -0.08, 0.22],
    [0.74, 0.04, 0.16],
  ] as const) {
    g.beginPath();
    g.arc(cx * s, cy * s, r * s, Math.PI * 0.9, Math.PI * 2.3);
    g.stroke();
    g.beginPath();
    g.arc(cx * s, cy * s, r * s * 0.45, Math.PI * 1.2, Math.PI * 2.4);
    g.stroke();
  }
  g.beginPath();
  g.moveTo(-0.3 * s, 0.1 * s);
  g.lineTo(0.95 * s, 0.1 * s);
  g.stroke();
  g.restore();
}

/** Toạ độ ảnh của một điểm trên bàn. */
const toPx = (v: number) => (v + BOARD_SIZE / 2) * PX;

/** Mặt bàn: khe sơn đen, 40 miếng khảm, tranh giữa bàn. */
export function drawBoard() {
  const S = Math.round(BOARD_SIZE * PX);
  const [c, g] = canvas(S, S);
  g.fillStyle = PALETTE.lacquer;
  g.fillRect(0, 0, S, S);

  // --- Giữa bàn ---
  const o = 1.5 * PX;
  const inner = S - o * 2;
  g.save();
  g.beginPath();
  g.rect(o, o, inner, inner);
  g.clip();
  const bg = g.createRadialGradient(S / 2, S / 2, inner * 0.1, S / 2, S / 2, inner * 0.75);
  bg.addColorStop(0, '#26150f');
  bg.addColorStop(1, '#0e0806');
  g.fillStyle = bg;
  g.fillRect(o, o, inner, inner);
  // Sóng nước khảm trai mờ: vảy sóng xếp so le.
  g.strokeStyle = 'rgba(206,228,232,0.09)';
  g.lineWidth = 2;
  const R = 26;
  for (let row = 0; row * R * 0.9 < inner + R; row++) {
    for (let col = -1; col * R * 2 < inner + R * 2; col++) {
      const x = o + col * R * 2 + (row % 2 ? R : 0);
      const y = o + row * R * 0.9;
      g.beginPath();
      g.arc(x, y, R, Math.PI, Math.PI * 2);
      g.stroke();
    }
  }
  // Mây vàng bốn góc.
  cloud(g, o + 120, o + 140, 150, 1);
  cloud(g, o + inner - 120, o + inner - 150, 150, -1);
  g.restore();

  // Viền khảm: hai chỉ vàng kẹp một dải mảnh trai.
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  g.strokeStyle = GOLD;
  g.lineWidth = 4;
  g.strokeRect(o + 24, o + 24, inner - 48, inner - 48);
  g.lineWidth = 2;
  g.strokeRect(o + 58, o + 58, inner - 116, inner - 116);
  for (let t = 0; t < (inner - 82) * 4; t += 26) {
    const L = inner - 82;
    const sideIdx = Math.floor(t / L);
    const d = t % L;
    const [px, py] =
      sideIdx === 0
        ? [o + 41 + d, o + 41]
        : sideIdx === 1
          ? [o + inner - 41, o + 41 + d]
          : sideIdx === 2
            ? [o + inner - 41 - d, o + inner - 41]
            : [o + 41, o + inner - 41 - d];
    pearlChip(g, px, py, 9, rnd);
  }

  // Tên game ở góc trên phải (vùng biển phía bắc Vịnh Bắc Bộ).
  g.save();
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.shadowColor = 'rgba(0,0,0,0.7)';
  g.shadowBlur = 12;
  g.fillStyle = GOLD;
  setFont(g, 800, 128, true);
  g.fillText('Cờ tỷ phú', toPx(2.25), toPx(-2.75));
  g.shadowBlur = 0;
  g.fillStyle = EGG;
  setFont(g, 600, 34);
  g.fillText('Hà Giang → Phú Quốc', toPx(2.25), toPx(-2.4));
  g.restore();

  // Bảng tám vùng ở góc dưới trái.
  g.save();
  g.textBaseline = 'middle';
  g.fillStyle = GOLD;
  setFont(g, 800, 36, true);
  g.fillText('Tám vùng', toPx(-3.75), toPx(0.62));
  GROUPS.forEach((gr, k) => {
    const y = toPx(0.98 + k * 0.33);
    g.fillStyle = gr.color;
    g.fillRect(toPx(-3.75), y - 13, 26, 26);
    g.strokeStyle = GOLD;
    g.lineWidth = 2;
    g.strokeRect(toPx(-3.75), y - 13, 26, 26);
    g.fillStyle = EGG;
    setFont(g, 600, 27);
    g.fillText(gr.name, toPx(-3.75) + 40, y + 1);
  });
  g.restore();

  // Tên hai quần đảo.
  g.save();
  g.fillStyle = 'rgba(239,230,210,0.85)';
  g.textAlign = 'center';
  setFont(g, 600, 26);
  for (const a of ARCHIPELAGOS) {
    const [x, z] = project(a.label);
    g.fillText(`QĐ. ${a.name}`, toPx(x), toPx(z));
  }
  g.restore();

  // --- 40 miếng khảm ---
  const gap = (GAP / 2) * PX;
  for (const i of ALL) {
    const r = rectOf(i);
    drawTile(
      g,
      i,
      toPx(r.x - r.w / 2) + gap,
      toPx(r.z - r.d / 2) + gap,
      r.w * PX - gap * 2,
      r.d * PX - gap * 2,
    );
  }
  return c;
}

/** Mặt bàn trà gỗ dưới hộp sơn mài: vân gỗ sẫm. */
export function drawWood() {
  const [c, g] = canvas(512, 512);
  g.fillStyle = '#2a170e';
  g.fillRect(0, 0, 512, 512);
  let seed = 3;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 90; i++) {
    g.strokeStyle = `rgba(${rnd() < 0.5 ? '0,0,0' : '120,70,40'},${0.08 + rnd() * 0.12})`;
    g.lineWidth = 1 + rnd() * 3;
    const y = rnd() * 512;
    g.beginPath();
    g.moveTo(0, y);
    for (let x = 0; x <= 512; x += 32) g.lineTo(x, y + Math.sin(x / 60 + i) * 6);
    g.stroke();
  }
  return c;
}

/** Mặt tiền nhà: tường vôi, cửa sổ chớp xanh, mỗi ảnh là một tầng (lặp theo số tầng). */
export function drawFacade(wall: string) {
  const [c, g] = canvas(128, 128);
  g.fillStyle = wall;
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = 'rgba(0,0,0,0.12)';
  g.fillRect(0, 118, 128, 10);
  for (const x of [22, 74]) {
    g.fillStyle = '#2a1610';
    g.fillRect(x, 34, 32, 52);
    // Cửa chớp xanh rêu như phố cổ Hội An (son đỏ trên tường vôi trông ngả hồng khi nhìn xa).
    g.fillStyle = '#2f6f5e';
    g.fillRect(x - 9, 34, 9, 52);
    g.fillRect(x + 32, 34, 9, 52);
    g.fillStyle = 'rgba(240,207,114,0.5)';
    g.fillRect(x + 4, 40, 24, 18);
  }
  return c;
}

/** Nhãn chữ nổi (tên địa danh trên bản đồ, "Cấp 2" khi xây nhà): viên sơn đen chữ vàng. */
export function drawLabel(text: string, opts: { size?: number; color?: string; bg?: string } = {}) {
  const size = opts.size ?? 44;
  const [, m] = canvas(8, 8);
  setFont(m, 800, size);
  const w = Math.ceil(m.measureText(text).width + size * 1.1);
  const h = Math.ceil(size * 1.7);
  const [c, g] = canvas(w, h);
  g.fillStyle = opts.bg ?? 'rgba(18,11,9,0.88)';
  g.beginPath();
  g.roundRect(2, 2, w - 4, h - 4, h / 2);
  g.fill();
  g.strokeStyle = 'rgba(212,167,58,0.8)';
  g.lineWidth = 3;
  g.stroke();
  setFont(g, 800, size);
  g.fillStyle = opts.color ?? PALETTE.goldHi;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + size * 0.04);
  return c;
}

/** Mặt xúc xắc ngà: chấm sẫm, chấm 1 và 4 màu son. */
export function drawDieFace(value: number) {
  const S = 256;
  const [c, g] = canvas(S, S);
  g.fillStyle = '#efe6d2';
  g.fillRect(0, 0, S, S);
  const at: Record<number, [number, number][]> = {
    1: [[0.5, 0.5]],
    2: [
      [0.27, 0.27],
      [0.73, 0.73],
    ],
    3: [
      [0.25, 0.25],
      [0.5, 0.5],
      [0.75, 0.75],
    ],
    4: [
      [0.28, 0.28],
      [0.72, 0.28],
      [0.28, 0.72],
      [0.72, 0.72],
    ],
    5: [
      [0.25, 0.25],
      [0.75, 0.25],
      [0.5, 0.5],
      [0.25, 0.75],
      [0.75, 0.75],
    ],
    6: [
      [0.28, 0.22],
      [0.72, 0.22],
      [0.28, 0.5],
      [0.72, 0.5],
      [0.28, 0.78],
      [0.72, 0.78],
    ],
  };
  const red = value === 1 || value === 4;
  const r = value === 1 ? S * 0.15 : S * 0.085;
  for (const [x, y] of at[value]!) {
    g.fillStyle = red ? PALETTE.cinnabar : '#1a120e';
    g.beginPath();
    g.arc(x * S, y * S, r, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}
