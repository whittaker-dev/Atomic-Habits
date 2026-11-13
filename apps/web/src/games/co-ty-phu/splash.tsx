'use client';

import { useEffect, useRef, useState } from 'react';
import { BOARD, GROUPS, TOKENS } from './data';
import { portraitOf } from './portraits';
import { characterName, ROSTER } from './roster';
import { Rule } from './screens';
import { DISPLAY, FONT_URL } from './theme';

// Màn loading lúc mới vào Cờ tỷ phú: nắp hộp sơn mài với bàn cờ thu nhỏ, 40 miếng khảm được dát
// lần lượt từ Xuất phát theo tiến độ tải thật (từng kiểu chữ, từng ảnh nhân vật), một quân son nhảy
// ở ô đang dát. Xong thì mờ dần; hiện ít nhất một nhịp cho kịp nhìn, lâu nhất vài giây (mạng chậm
// thì vào trước, phần còn thiếu tự tải khi cần).

const MIN_MS = 1200;
const MAX_MS = 8000;
const FADE_MS = 450;

/** Đúng các kiểu chữ FONT_URL khai báo; chữ trên mặt bàn 3D vẽ bằng canvas cũng dùng chúng. */
const FACES = [
  '600 16px "Noto Serif Display"',
  '800 16px "Noto Serif Display"',
  '500 16px Montserrat',
  '600 16px Montserrat',
  '700 16px Montserrat',
];
// Google Fonts chia font theo bảng chữ (latin, vietnamese…): mẫu có dấu tiếng Việt để tải đủ cả hai.
const SAMPLE = 'Cờ tỷ phú Đà Nẵng ơ ư ă 0123';

/** Chờ bảng @font-face về trước: chưa có nó thì document.fonts.load() trả về ngay mà không tải gì. */
function fontSheet(): Promise<void> {
  const link = [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].find(
    (l) => l.getAttribute('href') === FONT_URL,
  );
  if (!link || link.sheet) return Promise.resolve();
  return new Promise((resolve) => {
    link.addEventListener('load', () => resolve(), { once: true });
    link.addEventListener('error', () => resolve(), { once: true });
  });
}

/**
 * Tải trước những gì màn chính và bàn cờ cần ngay: các kiểu chữ (để mặt bàn vẽ đúng chữ ngay lần
 * đầu) và ảnh đại diện của cả mười nhân vật (mỗi ảnh là một lần dựng và chụp mô hình 3D, làm lúc
 * vào màn chính thì khựng). Báo tiến độ 0..1 sau mỗi việc xong.
 */
function preload(onProgress: (p: number) => void, onStage: (text: string) => void) {
  const total = FACES.length + ROSTER.length;
  let done = 0;
  const step = () => onProgress(++done / total);

  const fonts = fontSheet().then(() =>
    Promise.all(
      FACES.map((face) =>
        document.fonts
          .load(face, SAMPLE)
          // Lỗi mạng thì chữ dùng font dự phòng: vẫn vào game.
          .catch(() => undefined)
          .then(step),
      ),
    ),
  );
  const figures = (async () => {
    for (const id of ROSTER) {
      onStage(`Nặn quân ${characterName(id)}`);
      // Mỗi ảnh chiếm luồng chính một lúc: nhường một khung hình để quân trên bàn còn nhảy.
      await new Promise((r) => setTimeout(r, 16));
      portraitOf(id);
      step();
    }
    onStage('Khắc chữ vàng');
  })();
  return Promise.all([fonts, figures]);
}

// Bàn thu nhỏ đúng tỉ lệ bàn thật (layout.ts): ô góc 1.5, chín ô cạnh 0.9.
const TRACK = '1.5fr repeat(9, 0.9fr) 1.5fr';

/** Ô thứ i trên lưới 11×11: ô 0 góc dưới phải, đi ngược chiều kim đồng hồ như bàn thật. */
function cellOf(i: number): { row: number; col: number; side: number } {
  const side = Math.floor(i / 10);
  const k = i % 10;
  if (side === 0) return { row: 11, col: 11 - k, side };
  if (side === 1) return { row: 11 - k, col: 1, side };
  if (side === 2) return { row: 1, col: 1 + k, side };
  return { row: 1 + k, col: 11, side };
}

/** Hướng từ mép trong ra mép ngoài của mỗi cạnh: dải màu vùng nằm ở mép trong như bàn thật. */
const OUTWARD = ['to bottom', 'to left', 'to top', 'to right'];
const IVORY = '#f1e7d0';

/** Mặt miếng khảm đã dát, theo màu từng loại ô trên bàn 3D (art.ts). */
function inlay(i: number): string {
  const s = BOARD[i]!;
  if (s.kind === 'land')
    return `linear-gradient(${OUTWARD[cellOf(i).side]}, ${GROUPS[s.group]!.color} 0 34%, ${IVORY} 34%)`;
  if (s.kind === 'gift' || s.kind === 'go' || s.kind === 'toJail') return 'var(--tp-cinnabar)';
  if (s.kind === 'rest') return IVORY;
  return 'radial-gradient(circle, var(--tp-gold) 0 14%, #1d120e 16%)';
}

export function Splash({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('Mở nắp hộp');
  const [leaving, setLeaving] = useState(false);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let alive = true;
    let real = 0;
    // Tiến độ thật đi theo bậc (15 việc); thanh đuổi theo cho mượt, giảm chuyển động thì nhảy thẳng.
    let raf = 0;
    const tick = () => {
      setProgress((p) => (reduce ? real : Math.min(real, p + Math.max(0.004, (real - p) * 0.18))));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const ready = Promise.all([
      preload(
        (p) => (real = p),
        (text) => alive && setStage(text),
      ),
      wait(MIN_MS),
    ]);
    void Promise.race([ready, wait(MAX_MS)]).then(() => {
      if (!alive) return;
      cancelAnimationFrame(raf);
      setProgress(1);
      setStage('Vào bàn');
      setLeaving(true);
      setTimeout(() => alive && done.current(), reduce ? 0 : FADE_MS);
    });
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, []);

  const pct = Math.round(progress * 100);
  // Số miếng đã dát; quân đứng ở miếng đang dát (dát xong cả bàn thì về lại Xuất phát).
  const laid = progress >= 1 ? BOARD.length : Math.floor(progress * BOARD.length);
  const head = laid % BOARD.length;
  return (
    <div
      className={`fixed inset-0 z-40 flex flex-col items-center justify-center gap-6 bg-[color:var(--tp-lacquer)] bg-[radial-gradient(110%_55%_at_50%_-10%,#3b120d_0%,transparent_62%)] px-4 transition-opacity duration-[450ms] motion-reduce:transition-none ${leaving ? 'opacity-0' : 'opacity-100'}`}
    >
      {/* Nắp hộp: thân son thẫm viền chỉ vàng, khe sơn đen giữa các miếng khảm. */}
      <div
        role="progressbar"
        aria-label="Đang bày bàn Cờ tỷ phú"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="grid aspect-square w-[min(84vw,340px)] gap-[2px] rounded-lg bg-[color:var(--tp-lacquer)] p-[7px] shadow-[inset_0_0_0_5px_var(--tp-cinnabarDeep),inset_0_0_0_6px_var(--tp-gold),0_30px_60px_-24px_rgb(0_0_0/0.95)]"
        style={{ gridTemplateColumns: TRACK, gridTemplateRows: TRACK }}
      >
        {BOARD.map((_, i) => {
          const { row, col } = cellOf(i);
          const on = i < laid;
          return (
            <span
              key={i}
              aria-hidden
              className={`relative rounded-[2px] ${
                on
                  ? 'tp-lay shadow-[inset_0_0_0_1px_rgb(212_167_58/0.85)]'
                  : 'bg-[#1a100c] shadow-[inset_0_0_0_1px_var(--tp-rule)]'
              }`}
              style={{ gridRow: row, gridColumn: col, background: on ? inlay(i) : undefined }}
            >
              {i === head && (
                <i
                  className="tp-hop absolute top-1/2 left-1/2 -mt-[7px] -ml-[7px] h-[14px] w-[14px] rounded-full shadow-[inset_0_0_0_2px_var(--tp-gold),0_3px_4px_rgb(0_0_0/0.6)]"
                  style={{ background: TOKENS[0].color }}
                />
              )}
            </span>
          );
        })}
        <div className="col-[2/11] row-[2/11] flex flex-col items-center justify-center gap-2 bg-[radial-gradient(circle,#26150f_0%,#0e0806_75%)]">
          <p
            className={`${DISPLAY} text-center text-[clamp(28px,9vw,40px)] leading-none text-[color:var(--tp-gold)]`}
          >
            Cờ tỷ phú
          </p>
          <Rule />
          <p className="text-sm font-bold text-[color:var(--tp-eggshell)] tabular-nums">{pct}%</p>
        </div>
      </div>

      <p className="min-h-5 text-center text-sm font-semibold tracking-[0.14em] text-[color:var(--tp-ash)] uppercase">
        {stage}…
      </p>
    </div>
  );
}
