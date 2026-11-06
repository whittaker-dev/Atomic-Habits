'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { GAME_FONT_URL } from '@/components/games/game-fonts';
import { onArtLoaded } from './art';
import { DEFAULT_VOLUME, loadVolume, setVolume, sfx, unlockAudio, type Volume } from './audio';
import type { CharacterDef } from './characters';
import {
  characterSprite,
  drawScene,
  drawTrapBubble,
  itemSprite,
  type Pose,
  type Scene,
} from './draw';
import type { ItemKind } from './engine';
import { COLS, ROWS, type Dir } from './map';
import { PALETTE, SEAT_COLORS } from './palette';

// Thành phần giao diện dùng chung giữa các màn hình.

export const FONT_URL = GAME_FONT_URL;
export const DISPLAY = "font-['Baloo_2',sans-serif]";
export const CARD =
  'rounded-2xl border-[3px] border-[color:var(--bb-ink)] bg-[color:var(--bb-cream)] shadow-[0_5px_0_var(--bb-ink)]';
/** Tiêu đề trong thẻ: đặt màu rõ ràng vì CSS chung của app tô h1–h4 màu sáng. */
export const HEADING = `${DISPLAY} text-[color:var(--bb-ink)]`;
const TONES = {
  sun: 'bg-[color:var(--bb-sun)]',
  sky: 'bg-[color:var(--bb-sky)]',
  coral: 'bg-[color:var(--bb-coral)] text-white',
  mint: 'bg-[color:var(--bb-mint)]',
  cream: 'bg-[color:var(--bb-cream)]',
} as const;

/** Số điểm ảnh của bản đồ cho mỗi ô trong trận: đủ lớn để hình 2D vẫn nét khi bản đồ phủ kín màn hình. */
export const ART_CELL = 64;
/** Ảnh nhỏ ở ô chọn bản đồ: vẽ nhỏ hơn cho đỡ tốn bộ nhớ (13 bản đồ cùng lúc). */
const THUMB_CELL = 24;

export function Btn({
  children,
  tone = 'sun',
  onClick,
  disabled,
  className = '',
  pressed,
}: {
  children: ReactNode;
  tone?: keyof typeof TONES;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={pressed}
      className={`rounded-xl border-[3px] border-[color:var(--bb-ink)] px-4 py-2 font-extrabold shadow-[0_4px_0_var(--bb-ink)] transition-transform hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-[0_1px_0_var(--bb-ink)] disabled:pointer-events-none disabled:opacity-50 ${TONES[tone]} ${className}`}
    >
      {children}
    </button>
  );
}

/** Vòng vẽ cho một canvas nhỏ có kích thước cố định (CSS co giãn theo chỗ hiển thị). */
function useSpriteLoop(
  w: number,
  h: number,
  animate: boolean,
  draw: (c: CanvasRenderingContext2D, frame: number) => void,
) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;
  useEffect(() => {
    const cv = ref.current;
    const c = cv?.getContext('2d');
    if (!cv || !c) return;
    cv.width = w;
    cv.height = h;
    c.imageSmoothingEnabled = true;
    let frame = 0;
    let raf = 0;
    const tick = () => {
      c.clearRect(0, 0, w, h);
      drawRef.current(c, frame++);
      if (animate) raf = requestAnimationFrame(tick);
    };
    tick();
    // Ảnh nhân vật tải xong sau lần vẽ đầu: canvas tĩnh vẽ lại một lần (canvas có hoạt ảnh tự cập nhật).
    const off = onArtLoaded(() => !animate && tick());
    return () => {
      cancelAnimationFrame(raf);
      off();
    };
  }, [w, h, animate]);
  return ref;
}

/** Cỡ ô (điểm ảnh) dùng cho ảnh nhân vật ngoài trận — đủ lớn để nét khi phóng to trên màn hình nét cao. */
const PORTRAIT_CELL = 72;

/** `fluid`: cao bằng khung chứa (giữ tỉ lệ) thay vì cỡ cố định — dùng cho ô vuông co giãn. */
export function CharCanvas({
  def,
  dir = 'down',
  pose = 'idle',
  size = 64,
  animate = true,
  trapped,
  seat = 1,
  fluid,
}: {
  def: CharacterDef;
  dir?: Dir;
  pose?: Pose;
  size?: number;
  animate?: boolean;
  trapped?: boolean;
  seat?: number;
  fluid?: boolean;
}) {
  const w = Math.round(PORTRAIT_CELL * 1.5);
  const h = Math.round(PORTRAIT_CELL * 1.75);
  const ref = useSpriteLoop(w, h, animate, (c, frame) => {
    const sp = characterSprite(def, dir, pose, frame, PORTRAIT_CELL, true);
    c.drawImage(sp.canvas, 0, 0);
    if (trapped)
      drawTrapBubble(
        c,
        sp.footX,
        sp.footY,
        sp.size,
        4 - ((frame / 60) % 4),
        frame,
        SEAT_COLORS[seat % SEAT_COLORS.length]!,
      );
  });
  const style: CSSProperties = fluid
    ? { height: '100%', width: 'auto', maxWidth: '100%', aspectRatio: `${w} / ${h}` }
    : { width: size, height: (size * h) / w };
  return <canvas ref={ref} style={style} aria-hidden />;
}

export function ItemIcon({ kind, size = 32 }: { kind: ItemKind; size?: number }) {
  const ref = useSpriteLoop(PORTRAIT_CELL, PORTRAIT_CELL, false, (c) =>
    c.drawImage(itemSprite(kind, PORTRAIT_CELL), 0, 0),
  );
  return <canvas ref={ref} style={{ width: size, height: size }} aria-hidden />;
}

/** Ảnh bản đồ tĩnh (ô chọn bản đồ). Trận đấu thật vẽ trong match.tsx. */
export function MapThumb({ scene, className = '' }: { scene: Scene; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    const c = cv?.getContext('2d');
    if (!cv || !c) return;
    cv.width = COLS * THUMB_CELL;
    cv.height = ROWS * THUMB_CELL;
    drawScene(c, scene, THUMB_CELL, 0);
  }, [scene]);
  return <canvas ref={ref} className={`block h-auto w-full ${className}`} aria-hidden />;
}

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <h1
      className={`${DISPLAY} relative inline-block text-center font-extrabold leading-[0.9] text-[color:var(--bb-sun)] [-webkit-text-stroke:3px_var(--bb-ink)] [paint-order:stroke_fill] ${small ? 'text-4xl' : 'text-6xl sm:text-7xl'}`}
      style={{ textShadow: `0 5px 0 ${PALETTE.ink}` }}
    >
      Bomb
      <span className="block text-[color:var(--bb-bubble)]">Arena!</span>
    </h1>
  );
}

export function Keycap({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-md border-2 border-[color:var(--bb-ink)] bg-white px-2 text-center font-bold">
      {children}
    </kbd>
  );
}

/** Mô tả vật phẩm hiện cho người chơi. Thứ tự = thứ tự hiện trong bảng. */
export const ITEM_INFO: { kind: ItemKind; name: string; effect: string }[] = [
  { kind: 'bomb', name: 'Bóng +1', effect: 'Đặt thêm được một quả bóng cùng lúc.' },
  { kind: 'range', name: 'Tăng sức', effect: 'Tầm nổ xa thêm một ô.' },
  { kind: 'superBomb', name: 'Bóng siêu', effect: 'Tầm nổ lên tối đa ngay lập tức.' },
  { kind: 'fireBomb', name: 'Bóng lửa', effect: 'Vụ nổ xuyên qua khối mềm, phá cả hàng.' },
  { kind: 'speed', name: 'Tăng tốc', effect: 'Chạy nhanh hơn (tối đa 3 lần).' },
  { kind: 'shield', name: 'Khiên', effect: 'Miễn nổ trong 3 giây.' },
  {
    kind: 'needle',
    name: 'Kim',
    effect: 'Bị nhốt thì bấm đặt bóng để tự chọc thủng bong bóng (mỗi kim một lần).',
  },
  { kind: 'life', name: 'Thêm mạng', effect: 'Bị loại thì sống lại ngay tại chỗ một lần.' },
  {
    kind: 'clone',
    name: 'Phân thân',
    effect: 'Gọi bản sao chạy giúp trong 8 giây, biết đặt bóng.',
  },
  { kind: 'teleport', name: 'Dịch chuyển', effect: 'Nhảy ngay tới một ô trống cách xa.' },
  {
    kind: 'hole',
    name: 'Hố Đen',
    effect: 'Nuốt mọi quả bóng đang chờ nổ trong vòng 3 ô quanh bạn.',
  },
];

const SKILL_INFO: [string, string][] = [
  ['Đặt bóng', 'Bóng nổ sau 2,5 giây theo hình chữ thập; dừng ở khối cứng, phá khối mềm rồi dừng.'],
  ['Nổ dây chuyền', 'Vụ nổ chạm quả bóng khác thì quả đó nổ theo ngay.'],
  ['Bị nhốt', 'Trúng nổ thì bị nhốt trong bong bóng 4 giây; hết giờ là bị loại.'],
  ['Cứu & hạ', 'Đồng đội chạm vào bong bóng là được cứu; đối thủ chạm vào là bị loại.'],
  ['Đột tử', 'Còn 30 giây thì khối cứng rơi dần từ mép vào giữa — đứng trúng là bị loại.'],
];

/** Bảng "Vật phẩm & kỹ năng": mở từ trang chủ, menu tạm dừng và nút ? trong trận. */
export function HelpDialog({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[color:var(--bb-ink)]/60 p-4"
      role="dialog"
      aria-modal
      aria-label="Vật phẩm và kỹ năng"
      onClick={onClose}
    >
      <div
        className={`${CARD} max-h-full w-full max-w-2xl overflow-y-auto p-5`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className={`${HEADING} text-3xl`}>Vật phẩm & kỹ năng</h2>
          <Btn tone="sun" className="px-3 py-1" onClick={onClose}>
            Đóng
          </Btn>
        </div>
        <h3 className={`${HEADING} mt-3 text-xl`}>Vật phẩm</h3>
        <p className="text-sm font-bold text-slate-600">
          Rơi ra ngẫu nhiên khi phá khối mềm — đi vào là nhặt.
        </p>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {ITEM_INFO.map((it) => (
            <li
              key={it.kind}
              className="flex items-center gap-3 rounded-xl border-[3px] border-[color:var(--bb-ink)] bg-white p-2"
            >
              <ItemIcon kind={it.kind} size={44} />
              <div className="min-w-0">
                <p className="font-extrabold">{it.name}</p>
                <p className="text-sm font-bold leading-snug text-slate-600">{it.effect}</p>
              </div>
            </li>
          ))}
        </ul>
        <h3 className={`${HEADING} mt-4 text-xl`}>Kỹ năng cơ bản</h3>
        <ul className="mt-2 grid gap-1.5">
          {SKILL_INFO.map(([name, text]) => (
            <li key={name} className="text-sm font-bold">
              <span className="font-extrabold text-[color:var(--bb-coral)]">{name}:</span>{' '}
              <span className="text-slate-700">{text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function SettingsDialog({
  onClose,
  actionLabel = 'Đặt bóng / dùng kim',
  actionButton = 'Bùm',
}: {
  onClose: () => void;
  /** Tên phím hành động và nút cảm ứng — game khác dùng chung hộp cài đặt này thì đổi lại. */
  actionLabel?: string;
  actionButton?: string;
}) {
  const [vol, setVol] = useState<Volume>(DEFAULT_VOLUME);
  useEffect(() => setVol(loadVolume()), []);
  const change = (k: keyof Volume, v: number) => {
    unlockAudio();
    const next = { ...vol, [k]: v };
    setVol(next);
    setVolume(next);
    if (k === 'sfx') sfx.pickup();
  };
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[color:var(--bb-ink)]/60 p-4"
      role="dialog"
      aria-modal
      aria-label="Cài đặt"
    >
      <div className={`${CARD} max-h-full w-full max-w-md overflow-y-auto p-5`}>
        <h2 className={`${HEADING} text-3xl`}>Cài đặt</h2>
        {(
          [
            ['music', 'Nhạc nền'],
            ['sfx', 'Hiệu ứng'],
          ] as const
        ).map(([k, label]) => (
          <label key={k} className="mt-3 flex items-center gap-3 font-bold">
            <span className="w-24">{label}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(vol[k] * 100)}
              onChange={(e) => change(k, Number(e.target.value) / 100)}
              className="flex-1 accent-[color:var(--bb-coral)]"
            />
            <span className="w-10 text-right tabular-nums">{Math.round(vol[k] * 100)}</span>
          </label>
        ))}
        <h3 className={`${HEADING} mt-5 text-xl`}>Phím điều khiển</h3>
        <div className="mt-2 grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-1.5 text-sm font-bold">
          <span />
          <span>Người 1</span>
          <span>Người 2</span>
          {[
            ['Di chuyển', 'W A S D', '↑ ← ↓ →'],
            [actionLabel, 'Space', 'Enter'],
            ['Tạm dừng', 'Esc', 'Esc'],
          ].map(([a, p1, p2]) => (
            <div key={a} className="contents">
              <span className="text-slate-600">{a}</span>
              <Keycap>{p1}</Keycap>
              <Keycap>{p2}</Keycap>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm font-bold text-slate-600">
          Chơi một mình thì dùng được cả phím mũi tên + Enter. Trên điện thoại có cần điều khiển và
          nút {actionButton}.
        </p>
        <div className="mt-5 flex justify-end">
          <Btn tone="sun" onClick={onClose}>
            Xong
          </Btn>
        </div>
      </div>
    </div>
  );
}
