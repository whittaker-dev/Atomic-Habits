import {
  cellPos,
  DEATH_ROW,
  HEIGHT,
  LAUNCH,
  MAX_ANGLE,
  MIN_ANGLE,
  R,
  ROW_H,
  shoot,
  swap,
  trace,
  WIDTH,
  type Game,
  type ShotResult,
} from './engine';
import { BUBBLE_COLORS, PALETTE } from './theme';

// Bàn bắn bi vẽ bằng canvas 2D: bi là viên ngọc pha lê có lõi khí sáng, đường ngắm chấm dội tường,
// bóng mờ chỗ bi sẽ dính, bi bay có vệt sáng, nổ ra mảnh và vòng sóng, bi rơi theo trọng lực; mảng bi
// trôi xuống liên tục, hàng chờ lộ dần ở mép trên.
// Giữ một ván (engine.ts, cùng một đối tượng với bên ngoài) và tự gọi shoot() khi người chơi bắn;
// diễn xong mới báo onShot để bên ngoài nạp khí, tính điểm, phát tiếng. Bên ngoài cho mảng bi trôi
// (advance) khi bàn không có bi đang bay (busy).

export type BoardView = {
  setGame: (g: Game) => void;
  /** Bắn theo góc đang ngắm (hoặc góc truyền vào). false nếu đang diễn phát trước hay ván đã xong. */
  fire: (angle?: number) => boolean;
  swap: () => void;
  /** Xoay nòng (bàn phím): cộng thêm `delta` radian. */
  turn: (delta: number) => void;
  setPaused: (p: boolean) => void;
  /** Đang có bi bay: bên ngoài tạm ngừng cho mảng bi trôi để bi dính đúng chỗ đã ngắm. */
  busy: () => boolean;
  resize: () => void;
  dispose: () => void;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
  kind: 'shard' | 'ring' | 'drop';
};

const cloneGame = (g: Game): Game => JSON.parse(JSON.stringify(g)) as Game;
const FLY_SPEED = 46; // đơn vị/giây
const NEXT = { x: LAUNCH.x - 3.6 * R, y: LAUNCH.y + 0.15 };

export function createBoard(
  canvas: HTMLCanvasElement,
  handlers: {
    onFire: () => void;
    onBounce: () => void;
    /** Bi đã dính (và nổ/rơi nếu có); `game` là thế cờ sau phát bắn. */
    onShot: (res: ShotResult, game: Game) => void;
    onSwap: () => void;
  },
): BoardView {
  const g2 = canvas.getContext('2d')!;
  let game: Game | null = null;
  /** Thế cờ trước phát bắn, vẽ trong lúc bi bay (ván thật đã đổi ngay khi bắn). */
  let shown: Game | null = null;
  let angle = Math.PI / 2;
  let scale = 1;
  let dpr = 1;
  let paused = false;
  let flight: null | {
    res: ShotResult;
    t0: number;
    lengths: number[];
    total: number;
    bounces: number;
  } = null;
  /** Lúc vừa bắn (ms): hàm rồng bật mở rồi khép lại. */
  let firedAt = 0;
  let particles: Particle[] = [];
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  // Ảnh bi vẽ sẵn theo cỡ điểm ảnh, đỡ phải vẽ gradient mỗi khung hình.
  const sprites = new Map<string, HTMLCanvasElement>();
  const sprite = (color: number, px: number) => {
    const key = `${color}|${px}`;
    let c = sprites.get(key);
    if (c) return c;
    c = document.createElement('canvas');
    const size = Math.ceil(px * 2 + 8);
    c.width = c.height = size;
    const g = c.getContext('2d')!;
    const m = size / 2;
    const base = BUBBLE_COLORS[color]!;
    // Quầng sáng ngoài.
    const glow = g.createRadialGradient(m, m, px * 0.7, m, m, px + 4);
    glow.addColorStop(0, `${base}66`);
    glow.addColorStop(1, `${base}00`);
    g.fillStyle = glow;
    g.fillRect(0, 0, size, size);
    // Viên ngọc pha lê: thân trong, giữa sáng hơn, mép sẫm dần như khối thuỷ tinh dày.
    const r = px * 0.96;
    g.save();
    g.beginPath();
    g.arc(m, m, r, 0, Math.PI * 2);
    g.clip();
    g.fillStyle = base;
    g.fillRect(0, 0, size, size);
    const depth = g.createRadialGradient(m, m + px * 0.12, px * 0.1, m, m, r);
    depth.addColorStop(0, 'rgba(255,255,255,0.25)');
    depth.addColorStop(0.55, 'rgba(255,255,255,0)');
    depth.addColorStop(1, 'rgba(8,6,20,0.6)');
    g.fillStyle = depth;
    g.fillRect(0, 0, size, size);
    // Lõi khí phát sáng giữa viên ngọc.
    const core = g.createRadialGradient(m, m + px * 0.1, 0, m, m + px * 0.1, px * 0.5);
    core.addColorStop(0, 'rgba(255,255,255,0.95)');
    core.addColorStop(0.35, `${base}cc`);
    core.addColorStop(1, `${base}00`);
    g.fillStyle = core;
    g.fillRect(0, 0, size, size);
    // Ánh sáng khúc xạ dồn về đáy (phía ngược nguồn sáng).
    g.strokeStyle = 'rgba(255,255,255,0.5)';
    g.lineWidth = Math.max(1, px * 0.12);
    g.lineCap = 'round';
    g.beginPath();
    g.arc(m, m, r * 0.74, Math.PI * 0.2, Math.PI * 0.8);
    g.stroke();
    g.restore();
    // Viền: mép sáng mảnh bên trong, nét sẫm bên ngoài cho viên ngọc tách khỏi nền.
    g.lineWidth = Math.max(1, px * 0.06);
    g.strokeStyle = 'rgba(8,6,20,0.7)';
    g.beginPath();
    g.arc(m, m, r, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.35)';
    g.beginPath();
    g.arc(m, m, r * 0.9, Math.PI * 1.05, Math.PI * 1.6);
    g.stroke();
    // Vệt phản chiếu trên trái và tia lấp lánh bốn cánh.
    const spec = g.createRadialGradient(
      m - px * 0.34,
      m - px * 0.44,
      0,
      m - px * 0.34,
      m - px * 0.44,
      px * 0.34,
    );
    spec.addColorStop(0, 'rgba(255,255,255,0.95)');
    spec.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = spec;
    g.beginPath();
    g.ellipse(m - px * 0.34, m - px * 0.44, px * 0.34, px * 0.2, -0.6, 0, Math.PI * 2);
    g.fill();
    const sx = m - px * 0.42;
    const sy = m - px * 0.5;
    const sl = px * 0.26;
    const sw = px * 0.05;
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.moveTo(sx, sy - sl);
    g.lineTo(sx + sw, sy - sw);
    g.lineTo(sx + sl, sy);
    g.lineTo(sx + sw, sy + sw);
    g.lineTo(sx, sy + sl);
    g.lineTo(sx - sw, sy + sw);
    g.lineTo(sx - sl, sy);
    g.lineTo(sx - sw, sy - sw);
    g.closePath();
    g.fill();
    sprites.set(key, c);
    return c;
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    scale = canvas.width / WIDTH;
    sprites.clear();
  };

  const toUnits = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * WIDTH,
      y: ((e.clientY - rect.top) / rect.height) * HEIGHT,
    };
  };
  const aimAt = (p: { x: number; y: number }) => {
    const a = Math.atan2(LAUNCH.y - p.y, p.x - LAUNCH.x);
    angle = Math.min(
      MAX_ANGLE,
      Math.max(MIN_ANGLE, a < 0 ? (p.x < LAUNCH.x ? MAX_ANGLE : MIN_ANGLE) : a),
    );
  };
  const onNext = (p: { x: number; y: number }) => Math.hypot(p.x - NEXT.x, p.y - NEXT.y) < R * 1.6;

  // Chuột: rê để ngắm, bấm để bắn. Cảm ứng: kéo để ngắm, nhấc tay để bắn.
  const down = (e: PointerEvent) => {
    const p = toUnits(e);
    if (onNext(p)) {
      api.swap();
      return;
    }
    if (e.pointerType !== 'mouse') {
      canvas.setPointerCapture(e.pointerId);
      aimAt(p);
    }
  };
  const move = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' || canvas.hasPointerCapture(e.pointerId)) aimAt(toUnits(e));
  };
  const up = (e: PointerEvent) => {
    const p = toUnits(e);
    if (onNext(p)) return;
    if (e.pointerType === 'mouse') {
      aimAt(p);
      api.fire();
    } else if (canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
      aimAt(p);
      api.fire();
    }
  };
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);

  const burst = (res: ShotResult, at: Game) => {
    for (const p of res.popped) {
      const c = cellPos(at, p.r, p.c);
      const color = BUBBLE_COLORS[p.color]!;
      particles.push({
        x: c.x,
        y: c.y,
        vx: 0,
        vy: 0,
        life: 0,
        max: 0.45,
        color,
        size: R,
        kind: 'ring',
      });
      for (let k = 0; k < 9; k++) {
        const a = Math.random() * Math.PI * 2;
        const v = 4 + Math.random() * 9;
        particles.push({
          x: c.x,
          y: c.y,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v,
          life: 0,
          max: 0.35 + Math.random() * 0.35,
          color: Math.random() < 0.3 ? '#ffffff' : color,
          size: 0.12 + Math.random() * 0.2,
          kind: 'shard',
        });
      }
    }
    for (const p of res.dropped) {
      const c = cellPos(at, p.r, p.c);
      particles.push({
        x: c.x,
        y: c.y,
        vx: (Math.random() - 0.5) * 6,
        vy: -4 - Math.random() * 4,
        life: 0,
        max: 1.4,
        color: String(p.color),
        size: R,
        kind: 'drop',
      });
    }
  };

  const land = () => {
    if (!flight) return;
    const { res } = flight;
    const before = shown!;
    flight = null;
    shown = null;
    burst(res, before);
    handlers.onShot(res, game!);
  };

  const api: BoardView = {
    setGame: (g) => {
      game = g;
      shown = null;
      flight = null;
    },
    fire: (a) => {
      if (!game || flight || paused || game.status !== 'play') return false;
      if (a !== undefined) angle = a;
      const before = cloneGame(game);
      const res = shoot(game, angle);
      if (!res) return false;
      shown = before;
      const lengths = res.path
        .slice(1)
        .map((p, i) => Math.hypot(p.x - res.path[i]!.x, p.y - res.path[i]!.y));
      flight = {
        res,
        t0: performance.now(),
        lengths,
        total: lengths.reduce((s, l) => s + l, 0),
        bounces: 0,
      };
      firedAt = performance.now();
      handlers.onFire();
      if (reduce) land();
      return true;
    },
    swap: () => {
      if (!game || flight || game.status !== 'play') return;
      swap(game);
      handlers.onSwap();
    },
    turn: (d) => {
      angle = Math.min(MAX_ANGLE, Math.max(MIN_ANGLE, angle + d));
    },
    setPaused: (p) => {
      paused = p;
    },
    busy: () => flight !== null,
    resize,
    dispose: () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
    },
  };

  // ------------------------------------------------------------------ vẽ

  const P = (v: number) => v * scale;

  const drawBubble = (color: number, x: number, y: number, alpha = 1, r = R) => {
    const px = Math.round(P(r));
    const s = sprite(color, px);
    g2.globalAlpha = alpha;
    g2.drawImage(s, P(x) - s.width / 2, P(y) - s.height / 2);
    g2.globalAlpha = 1;
  };

  /**
   * Nòng bắn: đầu rồng ngậm ngọc (bi đang cầm nằm giữa hai hàm), nhìn từ trên xuống nên hai bên đối
   * xứng, ngắm hướng nào cũng không lộn ngược. Toạ độ tính theo bán kính bi, gốc ở tâm viên ngọc, +x
   * là hướng bắn. Bắn thì hai hàm bật mở rồi khép; râu và bờm đung đưa.
   */
  const drawDragon = (now: number) => {
    const open = firedAt ? Math.max(0, 1 - (now - firedAt) / 260) : 0;
    const sway = reduce ? 0 : Math.sin(now / 380);
    g2.save();
    g2.translate(P(LAUNCH.x), P(LAUNCH.y));
    g2.rotate(-angle);
    g2.scale(P(R), P(R));
    g2.lineJoin = 'round';
    g2.lineCap = 'round';
    const ink = '#140f22';
    const gold = g2.createLinearGradient(-2.8, 0, 0.8, 0);
    gold.addColorStop(0, '#8a5a12');
    gold.addColorStop(0.55, '#e6b03a');
    gold.addColorStop(1, '#ffe08a');

    // Râu rồng: hai sợi dài uốn lượn ra sau.
    g2.strokeStyle = `${PALETTE.ki}cc`;
    g2.lineWidth = 0.09;
    for (const s of [-1, 1]) {
      g2.beginPath();
      g2.moveTo(-1.05, s * 1.05);
      g2.bezierCurveTo(
        -1.7,
        s * (1.9 + sway * 0.15),
        -2.3,
        s * (0.9 - sway * 0.2),
        -2.9,
        s * (1.55 + sway * 0.2),
      );
      g2.stroke();
    }
    // Bờm lửa sau gáy.
    const mane = g2.createRadialGradient(-2.1, 0, 0.2, -2.1, 0, 1.6);
    mane.addColorStop(0, `${PALETTE.rage}ee`);
    mane.addColorStop(1, `${PALETTE.rage}00`);
    g2.fillStyle = mane;
    g2.beginPath();
    g2.moveTo(-1.6, -1.05);
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      const a = Math.PI * (0.62 + t * 0.76);
      const flick = reduce ? 0 : Math.sin(now / 160 + i * 1.7) * 0.12;
      g2.lineTo(-1.9 + Math.cos(a) * (1.25 + flick), Math.sin(a) * 1.45);
      g2.lineTo(-1.9 + Math.cos(a + 0.12) * 0.75, Math.sin(a + 0.12) * 0.95);
    }
    g2.lineTo(-1.6, 1.05);
    g2.closePath();
    g2.fill();
    // Sừng ngà vuốt ra sau.
    g2.lineWidth = 0.07;
    g2.strokeStyle = ink;
    for (const s of [-1, 1]) {
      g2.fillStyle = '#f3e3b0';
      g2.beginPath();
      g2.moveTo(-1.45, s * 0.5);
      g2.quadraticCurveTo(-2.25, s * 0.62, -2.85, s * 1.3);
      g2.quadraticCurveTo(-2.3, s * 0.95, -1.7, s * 0.28);
      g2.closePath();
      g2.fill();
      g2.stroke();
    }
    // Đầu: trán rộng, gò má hai bên, thon về phía mõm (mõm khuất sau viên ngọc).
    g2.fillStyle = gold;
    g2.beginPath();
    g2.moveTo(-0.7, 0);
    for (const s of [1, -1]) {
      g2.bezierCurveTo(-0.7, s * 0.75, -1.05, s * 1.25, -1.55, s * 1.2);
      g2.bezierCurveTo(-2.05, s * 1.15, -2.35, s * 0.6, -2.35, 0);
    }
    g2.closePath();
    g2.fill();
    g2.stroke();
    // Vảy trên trán: ba vòng cung.
    g2.strokeStyle = '#8a5a12';
    g2.lineWidth = 0.05;
    for (const x of [-1.35, -1.7, -2.05]) {
      g2.beginPath();
      g2.arc(x, 0, 0.32, -Math.PI / 2.4, Math.PI / 2.4);
      g2.stroke();
    }
    // Mắt sáng màu khí.
    for (const s of [-1, 1]) {
      const eye = g2.createRadialGradient(-1.3, s * 0.82, 0, -1.3, s * 0.82, 0.32);
      eye.addColorStop(0, '#ffffff');
      eye.addColorStop(0.45, PALETTE.ki);
      eye.addColorStop(1, `${PALETTE.ki}00`);
      g2.fillStyle = eye;
      g2.beginPath();
      g2.arc(-1.3, s * 0.82, 0.32, 0, Math.PI * 2);
      g2.fill();
      g2.fillStyle = ink;
      g2.beginPath();
      g2.ellipse(-1.3, s * 0.82, 0.05, 0.13, 0, 0, Math.PI * 2);
      g2.fill();
    }
    // Hai hàm ôm lấy viên ngọc, mỗi bên một hàng răng; bắn thì bật mở ra.
    g2.lineWidth = 0.07;
    for (const s of [-1, 1]) {
      g2.save();
      g2.translate(-0.85, s * 0.8);
      g2.rotate(s * open * 0.35);
      g2.translate(0.85, -s * 0.8);
      g2.fillStyle = gold;
      g2.strokeStyle = ink;
      g2.beginPath();
      g2.moveTo(-1.0, s * 0.72);
      g2.quadraticCurveTo(-0.15, s * 1.55, 0.72, s * 1.1);
      g2.lineTo(0.55, s * 0.95);
      g2.quadraticCurveTo(-0.1, s * 1.18, -0.78, s * 0.55);
      g2.closePath();
      g2.fill();
      g2.stroke();
      g2.fillStyle = '#fbf6e8';
      for (const t of [0.2, 0.45, 0.7]) {
        const x = -0.78 + (0.55 + 0.78) * t;
        const y = s * (0.55 + (0.95 - 0.55) * t + 0.2 * Math.sin(t * Math.PI));
        g2.beginPath();
        g2.moveTo(x - 0.09, y);
        g2.lineTo(x + 0.09, y);
        g2.lineTo(x, y - s * 0.2);
        g2.closePath();
        g2.fill();
      }
      g2.restore();
    }
    g2.restore();
  };

  let last = performance.now();
  let raf = 0;
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const W = canvas.width;
    const H = canvas.height;
    g2.clearRect(0, 0, W, H);

    // Nền kính tối, lưới lục giác mờ.
    const bg = g2.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#120e26');
    bg.addColorStop(1, '#07050f');
    g2.fillStyle = bg;
    g2.fillRect(0, 0, W, H);
    g2.strokeStyle = 'rgba(56,232,255,0.05)';
    g2.lineWidth = 1;
    for (let y = 0; y < HEIGHT; y += ROW_H)
      for (let x = (Math.round(y / ROW_H) % 2) * R; x < WIDTH; x += 2 * R) {
        g2.beginPath();
        g2.arc(P(x + R), P(y + R), P(R) * 0.9, 0, Math.PI * 2);
        g2.stroke();
      }

    const g = flight ? shown : game;
    if (g) {
      // Mép trên: dải khí sáng nơi hàng bi mới chen vào.
      const lip = g2.createLinearGradient(0, 0, 0, P(R * 0.8));
      lip.addColorStop(0, `${PALETTE.ki}55`);
      lip.addColorStop(1, `${PALETTE.ki}00`);
      g2.fillStyle = lip;
      g2.fillRect(0, 0, W, P(R * 0.8));
      // Vạch thua.
      const dy = P(R + DEATH_ROW * ROW_H - ROW_H / 2);
      g2.strokeStyle = `${PALETTE.rage}aa`;
      g2.setLineDash([P(0.5), P(0.4)]);
      g2.lineWidth = Math.max(1, P(0.08));
      g2.beginPath();
      g2.moveTo(0, dy);
      g2.lineTo(W, dy);
      g2.stroke();
      g2.setLineDash([]);

      // Bi trên sân, và hàng chờ đang lộ dần ở mép trên (hàng -1).
      g.incoming.forEach((v, c) => {
        const p = cellPos(g, -1, c);
        drawBubble(v, p.x, p.y);
      });
      g.grid.forEach((row, r) =>
        row.forEach((v, c) => {
          if (v < 0) return;
          const p = cellPos(g, r, c);
          drawBubble(v, p.x, p.y);
        }),
      );

      // Đường ngắm và chỗ bi sẽ dính.
      if (!flight && g.status === 'play' && game) {
        const t = trace(game, angle);
        g2.fillStyle = 'rgba(255,255,255,0.75)';
        let carry = 0;
        for (let i = 1; i < t.path.length; i++) {
          const a = t.path[i - 1]!;
          const b = t.path[i]!;
          const len = Math.hypot(b.x - a.x, b.y - a.y);
          for (let d = carry; d < len; d += 0.7) {
            const k = d / len;
            const phase = (now / 400 + d) % 1;
            g2.globalAlpha = 0.35 + 0.4 * phase;
            g2.beginPath();
            g2.arc(P(a.x + (b.x - a.x) * k), P(a.y + (b.y - a.y) * k), P(0.11), 0, Math.PI * 2);
            g2.fill();
          }
          carry = 0;
        }
        g2.globalAlpha = 1;
        const ghost = cellPos(game, t.cell.r, t.cell.c);
        drawBubble(game.current, ghost.x, ghost.y, 0.28);
        g2.strokeStyle = 'rgba(255,255,255,0.6)';
        g2.lineWidth = Math.max(1, P(0.06));
        g2.beginPath();
        g2.arc(P(ghost.x), P(ghost.y), P(R * 0.95), 0, Math.PI * 2);
        g2.stroke();
      }

      // Bệ bắn: quầng khí, đầu rồng ngậm ngọc (bi đang cầm), bi kế.
      const lx = P(LAUNCH.x);
      const ly = P(LAUNCH.y);
      const ring = g2.createRadialGradient(lx, ly, P(R), lx, ly, P(R * 2.4));
      ring.addColorStop(0, `${PALETTE.ki}44`);
      ring.addColorStop(1, `${PALETTE.ki}00`);
      g2.fillStyle = ring;
      g2.beginPath();
      g2.arc(lx, ly, P(R * 2.4), 0, Math.PI * 2);
      g2.fill();
      drawDragon(now);
      if (!flight) drawBubble(g.current, LAUNCH.x, LAUNCH.y);
      drawBubble(g.next, NEXT.x, NEXT.y, 0.9, R * 0.75);
      g2.fillStyle = PALETTE.muted;
      g2.font = `600 ${Math.round(P(0.55))}px Saira, sans-serif`;
      g2.textAlign = 'center';
      g2.fillText('Đổi', P(NEXT.x), P(NEXT.y + R * 1.5));
    }

    // Bi đang bay.
    if (flight) {
      const { res } = flight;
      const dist = ((now - flight.t0) / 1000) * FLY_SPEED;
      if (dist >= flight.total) land();
      else {
        let d = dist;
        let i = 0;
        while (i < flight.lengths.length - 1 && d > flight.lengths[i]!) d -= flight.lengths[i++]!;
        if (i > flight.bounces && i < res.path.length - 1) {
          flight.bounces = i;
          handlers.onBounce();
        }
        const a = res.path[i]!;
        const b = res.path[i + 1]!;
        const k = d / flight.lengths[i]!;
        const x = a.x + (b.x - a.x) * k;
        const y = a.y + (b.y - a.y) * k;
        const dx = (b.x - a.x) / flight.lengths[i]!;
        const dy = (b.y - a.y) / flight.lengths[i]!;
        for (let t = 5; t >= 1; t--)
          drawBubble(
            res.color,
            x - dx * t * 0.5,
            y - dy * t * 0.5,
            0.12 * (6 - t),
            R * (1 - t * 0.1),
          );
        drawBubble(res.color, x, y);
      }
    }

    // Mảnh nổ, vòng sóng, bi rơi.
    if (particles.length) {
      const live: Particle[] = [];
      for (const p of particles) {
        p.life += dt;
        if (p.life >= p.max) continue;
        const k = p.life / p.max;
        if (p.kind === 'ring') {
          g2.strokeStyle = p.color;
          g2.globalAlpha = 1 - k;
          g2.lineWidth = Math.max(1, P(0.15 * (1 - k)));
          g2.beginPath();
          g2.arc(P(p.x), P(p.y), P(p.size * (1 + k * 1.6)), 0, Math.PI * 2);
          g2.stroke();
        } else if (p.kind === 'shard') {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vx *= 0.9;
          p.vy *= 0.9;
          g2.fillStyle = p.color;
          g2.globalAlpha = 1 - k;
          g2.beginPath();
          g2.arc(P(p.x), P(p.y), P(p.size * (1 - k * 0.5)), 0, Math.PI * 2);
          g2.fill();
        } else {
          p.vy += 40 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          g2.globalAlpha = 1;
          drawBubble(Number(p.color), p.x, p.y, 1 - k * k);
        }
        g2.globalAlpha = 1;
        live.push(p);
      }
      particles = live;
    }
  };
  resize();
  raf = requestAnimationFrame(frame);
  return api;
}
