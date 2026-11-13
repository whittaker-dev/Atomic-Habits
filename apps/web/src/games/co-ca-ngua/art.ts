import * as THREE from 'three';
import { cellKind, N, type House } from './board';
import { HOUSES } from './theme';

// Ảnh vẽ bằng canvas cho cảnh 3D của Cờ cá ngựa: mặt bàn đá khắc, nền đá lát bãi chiến trường,
// mặt xúc xắc xương, dáng chiến mã. Tách khỏi view3d.ts để file cảnh chỉ lo dựng cảnh.

/** Điểm ảnh cho mỗi ô của mặt bàn: đủ nét khi nhìn chếch trên điện thoại. */
export const CELL_PX = 96;

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

/** Số ngẫu nhiên có hạt giống: vân đá mỗi lần vẽ giống hệt nhau. */
function seeded(seed: number) {
  let t = seed | 0;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Một phiến đá: nền, mảng sáng tối lớn và đường vân (đủ to để thấy ở khoảng cách điện thoại), lấm
 * tấm hạt đá, vết mẻ, mép sáng trên trái và tối dưới phải. `stain` phủ một lớp màu nhà mỏng lên đá,
 * như sơn cờ đã mòn, thay vì tô cả phiến bằng màu thuần.
 */
function slab(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  base: string,
  seed: number,
  stain?: { color: string; alpha: number },
) {
  const rnd = seeded(seed);
  g.fillStyle = base;
  g.fillRect(x, y, s, s);
  g.save();
  g.beginPath();
  g.rect(x, y, s, s);
  g.clip();
  // Mỗi phiến một sắc độ hơi khác, cộng vài mảng loang lớn.
  g.fillStyle =
    rnd() < 0.5 ? `rgba(0,0,0,${0.06 + rnd() * 0.12})` : `rgba(255,255,255,${0.03 + rnd() * 0.06})`;
  g.fillRect(x, y, s, s);
  for (let i = 0; i < 3; i++) {
    const bx = x + rnd() * s;
    const by = y + rnd() * s;
    const br = s * (0.25 + rnd() * 0.35);
    const grad = g.createRadialGradient(bx, by, 0, bx, by, br);
    grad.addColorStop(0, rnd() < 0.5 ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.10)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(x, y, s, s);
  }
  if (stain) {
    g.globalAlpha = stain.alpha;
    g.fillStyle = stain.color;
    g.fillRect(x, y, s, s);
    g.globalAlpha = 1;
  }
  // Đường vân đá.
  g.strokeStyle = 'rgba(0,0,0,0.25)';
  g.lineWidth = 1.5;
  g.beginPath();
  let vx = x + rnd() * s;
  let vy = y;
  g.moveTo(vx, vy);
  for (let i = 0; i < 4; i++) {
    vx += (rnd() - 0.5) * s * 0.4;
    vy += s / 4;
    g.lineTo(vx, vy);
  }
  g.stroke();
  for (let i = 0; i < 90; i++) {
    g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.08)';
    const r = 2 + rnd() * 4;
    g.fillRect(x + rnd() * s, y + rnd() * s, r, r);
  }
  g.restore();
  // Vết mẻ ở một góc.
  g.fillStyle = 'rgba(0,0,0,0.18)';
  const cx = rnd() < 0.5 ? x : x + s;
  const cy = rnd() < 0.5 ? y : y + s;
  g.beginPath();
  g.arc(cx, cy, s * (0.06 + rnd() * 0.08), 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.10)';
  g.fillRect(x, y, s, s * 0.04);
  g.fillRect(x, y, s * 0.04, s);
  g.fillStyle = 'rgba(0,0,0,0.28)';
  g.fillRect(x, y + s * 0.96, s, s * 0.04);
  g.fillRect(x + s * 0.96, y, s * 0.04, s);
}

/** Mũi tên chữ V khắc trên ô xuất quân, chỉ chiều đi. */
function chevron(g: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  g.strokeStyle = color;
  g.lineWidth = s * 0.1;
  g.lineJoin = 'miter';
  for (const off of [-0.12, 0.12]) {
    g.beginPath();
    g.moveTo(x + s * (0.32 + off), y + s * 0.26);
    g.lineTo(x + s * (0.56 + off), y + s * 0.5);
    g.lineTo(x + s * (0.32 + off), y + s * 0.74);
    g.stroke();
  }
}

/** Đá đường đi: xám sẫm vừa đủ để quân sơn màu nổi lên trên. */
const STONE = '#6e737a';
const STONE_DARK = '#3a3f46';

/**
 * Mặt bàn: đường đi bằng phiến đá xám sẫm; ô xuất quân là đá nhuộm màu cờ có mũi tên khắc; bậc về
 * chuồng là đá có lõi sơn màu và số khắc; chuồng là sân đá sẫm nhuộm nhẹ màu nhà, viền màu nhà.
 */
export function drawFloor() {
  const s = CELL_PX;
  const [c, g] = canvas(N * s, N * s);
  g.fillStyle = STONE_DARK;
  g.fillRect(0, 0, N * s, N * s);
  for (let r = 0; r < N; r++)
    for (let col = 0; col < N; col++) {
      const k = cellKind(col, r);
      const x = col * s;
      const y = r * s;
      const seed = r * 31 + col * 7;
      if (k.kind === 'track') {
        slab(
          g,
          x,
          y,
          s,
          STONE,
          seed,
          k.start === null ? undefined : { color: HOUSES[k.start].hex, alpha: 0.78 },
        );
        if (k.start !== null) chevron(g, x, y, s, 'rgba(0,0,0,0.35)');
      } else if (k.kind === 'home') {
        slab(g, x, y, s, HOUSES[k.house].deep, seed);
        g.fillStyle = HOUSES[k.house].hex;
        g.fillRect(x + s * 0.12, y + s * 0.12, s * 0.76, s * 0.76);
      } else if (k.kind === 'yard') {
        slab(g, x, y, s, STONE_DARK, seed, { color: HOUSES[k.house].deep, alpha: 0.45 });
      }
    }

  // Số bậc về chuồng.
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `${s * 0.58}px Anton, sans-serif`;
  for (let r = 0; r < N; r++)
    for (let col = 0; col < N; col++) {
      const k = cellKind(col, r);
      if (k.kind !== 'home') continue;
      g.fillStyle = 'rgba(0,0,0,0.55)';
      g.fillText(String(k.step), col * s + s / 2, r * s + s * 0.55);
    }

  // Chuồng: sân đá sẫm viền sắt, bốn hố tròn cho bốn chiến mã, một lá cờ sơn chéo góc.
  const yards = [
    [0, 0],
    [9, 0],
    [9, 9],
    [0, 9],
  ] as const;
  yards.forEach(([yc, yr], h) => {
    const x = (yc + 1) * s;
    const y = (yr + 1) * s;
    const house = HOUSES[h]!;
    g.fillStyle = '#23272d';
    g.fillRect(x, y, 4 * s, 4 * s);
    g.strokeStyle = house.hex;
    g.lineWidth = s * 0.09;
    g.strokeRect(x + s * 0.1, y + s * 0.1, 4 * s - s * 0.2, 4 * s - s * 0.2);
    // Vạch chéo sơn màu nhà ở hai góc sân.
    g.fillStyle = house.hex;
    g.globalAlpha = 0.22;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + 1.6 * s, y);
    g.lineTo(x, y + 1.6 * s);
    g.fill();
    g.beginPath();
    g.moveTo(x + 4 * s, y + 4 * s);
    g.lineTo(x + 2.4 * s, y + 4 * s);
    g.lineTo(x + 4 * s, y + 2.4 * s);
    g.fill();
    g.globalAlpha = 1;
    for (const [px, py] of [
      [1, 1],
      [3, 1],
      [1, 3],
      [3, 3],
    ] as const) {
      const grad = g.createRadialGradient(
        x + px * s,
        y + py * s,
        s * 0.1,
        x + px * s,
        y + py * s,
        s * 0.62,
      );
      grad.addColorStop(0, '#0d0f12');
      grad.addColorStop(1, '#2f343b');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x + px * s, y + py * s, s * 0.62, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = house.hex;
      g.lineWidth = s * 0.05;
      g.stroke();
    }
  });

  // Tâm bàn: bốn mũi giáo màu bốn nhà chĩa vào một ngôi sao.
  const m = 6.5 * s;
  const e = 8.5 * s;
  const mid = 7.5 * s;
  const tri = (h: number, pts: number[]) => {
    g.fillStyle = HOUSES[h]!.hex;
    g.beginPath();
    g.moveTo(pts[0]!, pts[1]!);
    g.lineTo(pts[2]!, pts[3]!);
    g.lineTo(mid, mid);
    g.fill();
  };
  g.save();
  g.beginPath();
  g.rect(7 * s, 7 * s, s, s);
  g.clip();
  tri(0, [m, m, m, e]);
  tri(1, [m, m, e, m]);
  tri(2, [e, m, e, e]);
  tri(3, [m, e, e, e]);
  g.restore();
  g.fillStyle = '#ece8e1';
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? s * 0.11 : s * 0.27;
    g.lineTo(mid + Math.cos(a) * rr, mid + Math.sin(a) * rr);
  }
  g.fill();

  // Đường ron giữa các phiến đá.
  g.strokeStyle = '#15171a';
  g.lineWidth = 4;
  for (let i = 0; i <= N; i++) {
    g.beginPath();
    g.moveTo(i * s, 0);
    g.lineTo(i * s, N * s);
    g.moveTo(0, i * s);
    g.lineTo(N * s, i * s);
    g.stroke();
  }
  return c;
}

let floorDrawn: HTMLCanvasElement | null = null;

/**
 * Mặt bàn dùng chung cho mọi lần dựng cảnh: vẽ mặt bàn là việc nặng nhất khi dựng cảnh, nên màn
 * loading vẽ sẵn (sau khi font về) để vào ván không khựng. Chỉ giữ lại bản vẽ khi font Anton đã sẵn
 * sàng — số bậc về chuồng khắc bằng font này; vẽ sớm hơn thì lần gọi sau vẽ lại cho đúng chữ.
 */
export function boardFloor() {
  if (floorDrawn) return floorDrawn;
  const c = drawFloor();
  if (document.fonts.check(`${CELL_PX * 0.58}px Anton`)) floorDrawn = c;
  return c;
}

/** Ảnh nổi cho mặt bàn: phiến đá cao, đường ron trũng — lửa đuốc bắt mép từng phiến. */
export function drawBoardBump() {
  const s = CELL_PX;
  const [c, g] = canvas(N * s, N * s);
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, N * s, N * s);
  g.strokeStyle = '#000000';
  g.lineWidth = 7;
  for (let i = 0; i <= N; i++) {
    g.beginPath();
    g.moveTo(i * s, 0);
    g.lineTo(i * s, N * s);
    g.moveTo(0, i * s);
    g.lineTo(N * s, i * s);
    g.stroke();
  }
  return c;
}

/** Nền bãi chiến trường: đá lát lớn sẫm màu, lặp khắp mặt đất. */
export function drawGround() {
  const s = 256;
  const [c, g] = canvas(s * 2, s * 2);
  for (let r = 0; r < 2; r++)
    for (let col = 0; col < 2; col++)
      slab(g, col * s, r * s, s, r === col ? '#2b2f34' : '#26292e', 900 + r * 2 + col);
  g.strokeStyle = '#0b0c0e';
  g.lineWidth = 10;
  for (const i of [0, 1, 2]) {
    g.beginPath();
    g.moveTo(i * s, 0);
    g.lineTo(i * s, 2 * s);
    g.moveTo(0, i * s);
    g.lineTo(2 * s, i * s);
    g.stroke();
  }
  return c;
}

export function drawGroundBump() {
  const s = 256;
  const [c, g] = canvas(s * 2, s * 2);
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, s * 2, s * 2);
  g.strokeStyle = '#000000';
  g.lineWidth = 14;
  for (const i of [0, 1, 2]) {
    g.beginPath();
    g.moveTo(i * s, 0);
    g.lineTo(i * s, 2 * s);
    g.moveTo(0, i * s);
    g.lineTo(2 * s, i * s);
    g.stroke();
  }
  return c;
}

/** Mặt xúc xắc xương: chấm khắc sẫm, chấm 1 và 4 màu đỏ như xúc xắc ta. */
export function drawDieFace(value: number) {
  const S = 256;
  const [c, g] = canvas(S, S);
  g.fillStyle = '#e6dfd2';
  g.fillRect(0, 0, S, S);
  const grad = g.createRadialGradient(S / 2, S / 2, S * 0.2, S / 2, S / 2, S * 0.75);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(60,40,20,0.22)');
  g.fillStyle = grad;
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
    g.fillStyle = red ? '#c1121f' : '#1a1a1a';
    g.beginPath();
    g.arc(x * S, y * S, r, 0, Math.PI * 2);
    g.fill();
    // Mép lõm của chấm khắc.
    g.strokeStyle = 'rgba(255,255,255,0.35)';
    g.lineWidth = 3;
    g.beginPath();
    g.arc(x * S, y * S, r, Math.PI * 0.1, Math.PI * 0.9);
    g.stroke();
  }
  return c;
}

/** Dáng chiến mã nhìn nghiêng (đầu và cổ, như quân mã), cao 1 đơn vị, mõm quay sang phải. */
export function warhorseShape() {
  const s = new THREE.Shape();
  s.moveTo(-0.32, 0);
  s.lineTo(0.34, 0);
  // Ngực.
  s.bezierCurveTo(0.36, 0.18, 0.24, 0.3, 0.18, 0.4);
  // Hàm dưới tới mõm.
  s.bezierCurveTo(0.3, 0.44, 0.5, 0.45, 0.58, 0.55);
  s.bezierCurveTo(0.64, 0.63, 0.62, 0.71, 0.53, 0.75);
  // Sống mũi, trán.
  s.bezierCurveTo(0.42, 0.83, 0.32, 0.9, 0.22, 0.92);
  // Tai.
  s.lineTo(0.21, 1.05);
  s.lineTo(0.1, 0.94);
  // Sau gáy rồi bờm răng cưa chạy xuống cổ.
  s.bezierCurveTo(0.02, 0.93, -0.12, 0.87, -0.2, 0.76);
  s.lineTo(-0.3, 0.72);
  s.lineTo(-0.25, 0.64);
  s.lineTo(-0.37, 0.58);
  s.lineTo(-0.31, 0.5);
  s.lineTo(-0.42, 0.42);
  s.lineTo(-0.35, 0.34);
  // Gáy cong về đế.
  s.bezierCurveTo(-0.42, 0.2, -0.36, 0.08, -0.32, 0);
  return s;
}
