import type { CharacterDef } from './characters';
import type { Dir } from './map';

// Vẽ nhân vật bằng ảnh (bộ đấu trường vẽ tay và bộ đặc vụ 3D). Ảnh chỉ có một tư thế nên mọi cử động
// làm bằng biến hình: nhún, nghiêng, nén, rung, nhuộm màu. Hướng:
//   xuống = ảnh mặt trước · trái/phải = mặt trước, sang trái thì lật gương · lên = ảnh sau lưng nếu có.
// Hàm vẽ trong hệ "đơn vị" (ô 48, gốc ở giữa hai bàn chân) — người gọi đã đặt sẵn phép phóng.

type Ctx = CanvasRenderingContext2D;

/**
 * walk: đang chạy · hit: vừa trúng nổ (bị nhốt hoặc mất một mạng) · bomb: vừa đặt bom ·
 * trapped: trong bong bóng · win: ăn mừng.
 */
export type Pose = 'idle' | 'walk' | 'hit' | 'bomb' | 'trapped' | 'win';

/** Chiều cao ảnh nhân vật tính theo đơn vị vẽ (ô 48): khoảng 1,5 ô, ngang với hình vẽ bằng code. */
const ART_HEIGHT = 72;
const ART_MAX_WIDTH = 84;
const SHADOW = 'rgba(29,33,71,0.25)';
const HIT_TINT = '#ff3b3b';

/** Nhân vật biết bay lơ lửng cao hơn mặt đất và nhấp nhô; còn lại đứng trên mặt đất. */
export const hoverOf = (d: CharacterDef, frame: number) =>
  d.flies ? 8 + Math.sin(frame * 0.12) * 2.5 : 0;

function ellipse(c: Ctx, x: number, y: number, rx: number, ry: number, fill: string) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fillStyle = fill;
  c.fill();
}

/** Bóng dưới đất: người bay có bóng nhỏ và nhạt hơn để thấy rõ là đang lơ lửng. */
export function groundShadow(c: Ctx, d: CharacterDef, lift: number, rx: number, ry: number) {
  if (d.flies) ellipse(c, 0, -1, rx * 0.65, ry * 0.7, 'rgba(29,33,71,0.14)');
  else ellipse(c, 0, -1, Math.max(rx * 0.55, rx - lift * 0.5), ry, SHADOW);
}

/** Bản nhuộm một màu của ảnh (giữ hình dáng theo kênh trong suốt) để chớp đỏ lúc trúng nổ. */
const tints = new WeakMap<HTMLImageElement, HTMLCanvasElement>();
function tinted(img: HTMLImageElement): HTMLCanvasElement {
  let out = tints.get(img);
  if (!out) {
    out = document.createElement('canvas');
    out.width = img.width;
    out.height = img.height;
    const c = out.getContext('2d')!;
    c.drawImage(img, 0, 0);
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = HIT_TINT;
    c.fillRect(0, 0, img.width, img.height);
    tints.set(img, out);
  }
  return out;
}

type Motion = {
  lift: number;
  tilt: number;
  squash: number;
  shrink: number;
  shakeX: number;
  flash: number;
  aura: number;
};

function motionOf(pose: Pose, frame: number): Motion {
  const m: Motion = { lift: 0, tilt: 0, squash: 1, shrink: 1, shakeX: 0, flash: 0, aura: 0 };
  switch (pose) {
    case 'walk': {
      // Chạy: nảy theo bước, nghiêng qua lại, nén nhẹ lúc chạm đất.
      const ph = frame * 0.28;
      const up = Math.abs(Math.sin(ph));
      m.lift = up * 3.5;
      m.tilt = Math.sin(ph) * 0.07;
      m.squash = 1 - (1 - up) * 0.04;
      break;
    }
    case 'hit': {
      // Trúng nổ: rung ngang, bẹp xuống, chớp đỏ.
      const ph = frame * 1.3;
      m.shakeX = Math.sin(ph) * 2.2;
      m.squash = 0.9;
      m.tilt = Math.sin(ph) * 0.05;
      m.flash = 0.35 + Math.sin(ph) * 0.25;
      break;
    }
    case 'bomb': {
      // Đặt bom: khom người xuống rồi bật lên, vòng sáng màu kỹ năng loé dưới chân.
      const ph = Math.abs(Math.sin(frame * 0.35));
      m.squash = 1 - ph * 0.1;
      m.aura = 0.35 + ph * 0.45;
      break;
    }
    case 'trapped':
      m.lift = 6 + Math.sin(frame * 0.1) * 2;
      m.tilt = Math.sin(frame * 0.07) * 0.1;
      m.shrink = 0.8; // vừa trong bong bóng
      break;
    case 'win': {
      const j = Math.abs(Math.sin(frame * 0.12));
      m.lift = j * 10;
      m.squash = 1 + (1 - j) * 0.05;
      break;
    }
    case 'idle':
      m.squash = 1 + Math.sin(frame * 0.08) * 0.018; // thở
      break;
  }
  return m;
}

/** `front`/`back`: ảnh mặt trước và ảnh sau lưng (không có thì truyền lại ảnh mặt trước). */
export function drawArtCharacter(
  c: Ctx,
  d: CharacterDef,
  front: HTMLImageElement,
  back: HTMLImageElement,
  dir: Dir,
  pose: Pose,
  frame: number,
) {
  const m = motionOf(pose, frame);
  const img = dir === 'up' ? back : front;
  if (m.aura > 0 && d.aura) {
    c.save();
    c.globalAlpha = m.aura;
    ellipse(c, 0, -1, 19, 6, d.aura);
    c.globalAlpha = m.aura * 0.6;
    ellipse(c, 0, -1, 12, 3.6, '#ffffff');
    c.restore();
  }
  groundShadow(c, d, m.lift, 15, 4.5);
  let h = ART_HEIGHT * m.shrink;
  let w = (img.width / img.height) * h;
  if (w > ART_MAX_WIDTH * m.shrink) {
    w = ART_MAX_WIDTH * m.shrink;
    h = (img.height / img.width) * w;
  }
  c.translate(m.shakeX, -m.lift - hoverOf(d, frame));
  c.rotate(d.flies ? m.tilt * 0.4 : m.tilt);
  c.scale(dir === 'left' ? -1 : 1, m.squash);
  c.drawImage(img, -w / 2, -h, w, h);
  if (m.flash > 0) {
    c.globalAlpha = m.flash;
    c.drawImage(tinted(img), -w / 2, -h, w, h);
    c.globalAlpha = 1;
  }
}
