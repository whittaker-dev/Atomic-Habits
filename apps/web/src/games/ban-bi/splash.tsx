'use client';

import { useEffect, useRef, useState } from 'react';
import { loadHero } from './hero-asset';
import { KiBar } from './kit';
import { DISPLAY } from './theme';

// Màn loading lúc mới vào game: viên ngọc khí trong vòng khí xoay, tên game, thanh nạp khí sáu đốt
// chạy theo tiến độ tải thật (model nhân vật, font). Tải xong thì mờ dần; hiện ít nhất một nhịp cho
// kịp nhìn, lâu nhất vài giây (mạng chậm thì vào trước, cảnh võ sĩ tự thay khi model về).

const MIN_MS = 1200;
const MAX_MS = 8000;
const FADE_MS = 450;

export function Splash({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let alive = true;
    let real = 0;
    const t0 = performance.now();
    // Máy chủ không báo dung lượng thì chưa có tiến độ thật: thanh tự nhích dần, dừng ở 90%.
    let raf = 0;
    const tick = () => {
      const guess = 0.9 * (1 - Math.exp(-((performance.now() - t0) / 1000) * 1.2));
      setProgress((p) => Math.max(p, real, guess));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const ready = Promise.all([
      document.fonts?.ready ?? Promise.resolve(),
      // Lỗi tải thì vẫn vào game: cảnh dùng võ sĩ dựng bằng khối.
      loadHero((p) => (real = p)).catch(() => undefined),
      wait(reduce ? 200 : MIN_MS),
    ]);
    void Promise.race([ready, wait(MAX_MS)]).then(() => {
      if (!alive) return;
      cancelAnimationFrame(raf);
      setProgress(1);
      setLeaving(true);
      setTimeout(() => alive && done.current(), reduce ? 0 : FADE_MS);
    });
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, []);

  const level = Math.min(5, Math.floor(progress * 6));
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Đang nạp khí ${Math.round(progress * 100)}%`}
      className={`fixed inset-0 z-40 flex flex-col items-center justify-center gap-8 bg-[color:var(--bb-night)] bg-[radial-gradient(90%_60%_at_80%_-10%,#3b1d6e_0%,transparent_60%),radial-gradient(70%_50%_at_0%_110%,#0f3a4a_0%,transparent_60%)] px-6 transition-opacity duration-[450ms] ${leaving ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className="relative size-40" aria-hidden>
        {/* Vòng khí xoay quanh viên ngọc. */}
        <div className="bb-spin absolute inset-0 rounded-full [background:conic-gradient(from_0deg,transparent_0deg,#38e8ff_80deg,transparent_170deg,#ff4d8d_260deg,transparent_350deg)] [mask:radial-gradient(farthest-side,transparent_calc(100%-5px),#000_calc(100%-4px))]" />
        <div className="bb-spin-rev absolute inset-3 rounded-full [background:conic-gradient(from_90deg,transparent_0deg,#b06bff_70deg,transparent_160deg,#38e8ff_250deg,transparent_340deg)] opacity-70 [mask:radial-gradient(farthest-side,transparent_calc(100%-3px),#000_calc(100%-2px))]" />
        {/* Viên ngọc khí: thân pha lê, lõi sáng, vệt phản chiếu. */}
        <div className="bb-breathe absolute inset-8 rounded-full shadow-[0_0_44px_12px_rgb(56_232_255/0.45)] [background:radial-gradient(circle_at_50%_58%,#ffffff_0%,#bff8ff_14%,#38e8ff_40%,#1a5c96_74%,#0a0814_100%)]">
          <div className="absolute top-[14%] left-[20%] h-[18%] w-[34%] -rotate-[30deg] rounded-full bg-white/80 blur-[1px]" />
        </div>
      </div>

      <h1
        className={`${DISPLAY} text-center text-5xl leading-[0.9] text-[color:var(--bb-text)] sm:text-6xl`}
      >
        Bắn Bi
        <br />
        <span className="text-[color:var(--bb-ki)] [text-shadow:0_0_30px_rgb(56_232_255/0.6)]">
          Bá Khí
        </span>
      </h1>

      <div className="flex w-full max-w-xs flex-col gap-2">
        <KiBar level={level} progress={level === 5 && progress >= 1 ? 1 : (progress * 6) % 1} />
        <p className="text-center text-sm font-semibold tracking-[0.2em] text-[color:var(--bb-muted)] uppercase tabular-nums">
          Nạp khí {Math.round(progress * 100)}%
        </p>
      </div>
    </div>
  );
}
