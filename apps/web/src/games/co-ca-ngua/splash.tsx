'use client';

import { useEffect, useRef, useState } from 'react';
import { preloadAssets } from './preload';
import { Slash } from './screens';
import { DISPLAY, HOUSES } from './theme';

// Màn loading lúc mới vào Cờ cá ngựa — điểm binh trước trận: bốn cột cờ sắt trên bệ đá, mỗi lá cờ
// trận được kéo lên đỉnh cột khi một phần tư việc nạp xong (font, rồi vẽ sẵn mặt bàn), tàn lửa bay
// lên từ đáy màn. Nạp xong thì mờ dần; hiện ít nhất một nhịp cho kịp nhìn, lâu nhất vài giây (mạng
// chậm thì vào trước, chữ tự đổi font khi font về).

const MIN_MS = 1200;
const MAX_MS = 8000;
const FADE_MS = 450;

/** Chiều cao cột cờ và lá cờ (px): lá cờ chạy từ chân cột lên đỉnh cột. */
const POLE = 132;
const FLAG = 25;

/** Tàn lửa: vị trí ngang (%), độ trễ và thời gian bay (giây). Cố định để máy chủ và trình duyệt vẽ giống nhau. */
const EMBERS = [
  [8, 0.2, 3.4],
  [19, 1.4, 2.8],
  [31, 0.6, 3.8],
  [46, 2.1, 3.1],
  [57, 0.9, 2.6],
  [69, 1.7, 3.5],
  [81, 0.3, 3],
  [92, 1.1, 3.6],
] as const;

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
    // Tiến độ thật chỉ nhảy theo từng việc xong: giữa hai việc, cờ tự nhích dần (dừng ở 90%) để
    // không đứng im như treo.
    let raf = 0;
    const tick = () => {
      const guess = 0.9 * (1 - Math.exp(-((performance.now() - t0) / 1000) * 1.2));
      setProgress((p) => Math.max(p, real, guess));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const ready = Promise.all([
      preloadAssets((p) => (real = p)).catch(() => undefined),
      wait(MIN_MS),
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

  const pct = Math.round(progress * 100);
  return (
    <div
      role="progressbar"
      aria-label="Đang điểm binh"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={`fixed inset-0 z-40 flex flex-col items-center justify-center gap-7 overflow-hidden bg-[color:var(--cc-night)] bg-[radial-gradient(90%_55%_at_50%_108%,#4a230f_0%,transparent_65%)] px-6 transition-opacity duration-[450ms] motion-reduce:transition-none ${leaving ? 'opacity-0' : 'opacity-100'}`}
    >
      {/* Tàn lửa từ các lò đuốc ngoài màn bay lên; giảm chuyển động thì bỏ hẳn. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 motion-reduce:hidden">
        {EMBERS.map(([left, delay, dur]) => (
          <i
            key={left}
            className="cc-ember absolute bottom-0 h-1 w-1 bg-[#ffb15c] shadow-[0_0_8px_2px_rgb(255_106_26/0.7)]"
            style={{ left: `${left}%`, animationDelay: `${delay}s`, animationDuration: `${dur}s` }}
          />
        ))}
      </div>

      <div aria-hidden className="flex flex-col items-center">
        <div className="flex items-end gap-6">
          {HOUSES.map((h, i) => {
            const f = Math.min(1, Math.max(0, progress * 4 - i));
            return (
              <div key={h.name} className="relative w-10" style={{ height: POLE }}>
                {/* Cán sắt, đầu cán vuông. */}
                <span className="absolute top-0 bottom-0 left-0 w-[3px] bg-[color:var(--cc-ash)]" />
                <span className="absolute -top-1 -left-[2px] h-[7px] w-[7px] bg-[color:var(--cc-ash)]" />
                <span
                  className="absolute top-0 left-[3px] block"
                  style={{
                    transform: `translateY(${(1 - f) * (POLE - FLAG)}px)`,
                    opacity: 0.35 + f * 0.65,
                  }}
                >
                  <svg
                    width={36}
                    height={FLAG}
                    viewBox="0 0 16 11"
                    className={f >= 1 ? 'cc-wave' : undefined}
                  >
                    <path
                      d="M0 0h16l-4 5.5 4 5.5H0z"
                      fill={h.hex}
                      stroke={h.deep}
                      strokeWidth="0.6"
                    />
                    <path
                      d="M4 3l2.5 2.5L4 8"
                      fill="none"
                      stroke={i === 2 ? '#0e1013' : '#ffffff'}
                      strokeWidth="1.3"
                    />
                  </svg>
                </span>
              </div>
            );
          })}
        </div>
        {/* Bệ đá cắm cờ. */}
        <span className="-mt-px block h-3 w-[230px] bg-[color:var(--cc-stoneHi)] shadow-[inset_0_1px_0_var(--cc-iron)] [clip-path:polygon(6px_0,calc(100%-6px)_0,100%_100%,0_100%)]" />
      </div>

      <div className="flex flex-col items-center gap-3">
        <h1 className={`${DISPLAY} text-center text-[56px] leading-[0.9]`}>Cờ cá ngựa</h1>
        <Slash />
      </div>

      <p className="text-sm font-bold tracking-[0.2em] text-[color:var(--cc-ash)] uppercase tabular-nums">
        Điểm binh {pct}%
      </p>
    </div>
  );
}
