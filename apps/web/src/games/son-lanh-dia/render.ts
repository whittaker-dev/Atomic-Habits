import { cellHash, COLS, idx, ROWS, VEC } from '../bong-bong-bum/map';
import { NONE, SPLASH_TIME, type Match } from './engine';

// Lớp sơn trên mặt sàn, vẽ vào tấm ảnh sàn của sân 3D (view3d.ts). Chỉ đọc trạng thái trận.

type Ctx = CanvasRenderingContext2D;
const TAU = Math.PI * 2;

function circle(c: Ctx, x: number, y: number, r: number) {
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.fill();
}

/**
 * Mỗi ô có sơn là một mảng tròn cạnh tràn ra ô bên cạnh nên các ô cùng màu liền thành vũng.
 * Ở mép giáp ô khác màu thì thêm vài giọt văng (vị trí cố định theo ô) cho vệt sơn có hình dạng tự nhiên.
 */
export function drawPaint(
  c: Ctx,
  m: Pick<Match, 'paint' | 'splashes'>,
  s: number,
  colors: readonly string[],
) {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const team = m.paint[idx(x, y)]!;
      if (team === NONE) continue;
      const h = cellHash(x, y);
      c.fillStyle = colors[team] ?? '#888';
      c.globalAlpha = 0.9;
      c.beginPath();
      c.roundRect(x * s - s * 0.06, y * s - s * 0.06, s * 1.12, s * 1.12, s * 0.38);
      c.fill();
      for (const [i, [dx, dy]] of Object.values(VEC).entries()) {
        const nx = x + dx;
        const ny = y + dy;
        const same = nx >= 0 && ny >= 0 && nx < COLS && ny < ROWS && m.paint[idx(nx, ny)] === team;
        if (same || (h >> i) % 3 === 0) continue;
        const along = (((h >> (i * 2)) % 7) / 7 - 0.43) * s;
        const cx = (x + 0.5 + dx * 0.62) * s + (dy !== 0 ? along : 0);
        const cy = (y + 0.5 + dy * 0.62) * s + (dx !== 0 ? along : 0);
        circle(c, cx, cy, s * (0.1 + ((h >> i) % 4) * 0.025));
      }
      // Ánh bóng ướt trên một phần ba số ô.
      if (h % 3 === 0) {
        c.globalAlpha = 0.28;
        c.fillStyle = '#ffffff';
        c.beginPath();
        c.ellipse((x + 0.32) * s, (y + 0.3) * s, s * 0.14, s * 0.07, -0.5, 0, TAU);
        c.fill();
      }
    }
  }
  // Vòng giọt sơn bung ra lúc bóng vỡ.
  for (const sp of m.splashes) {
    const k = 1 - sp.t / SPLASH_TIME;
    c.globalAlpha = 1 - k;
    c.fillStyle = colors[sp.team] ?? '#888';
    const cx = (sp.x + 0.5) * s;
    const cy = (sp.y + 0.5) * s;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + sp.x;
      const r = s * (0.3 + k * 1.1);
      circle(c, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8, s * 0.12 * (1 - k * 0.6));
    }
  }
  c.globalAlpha = 1;
}
