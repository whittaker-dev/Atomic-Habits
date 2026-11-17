'use client';

import { useEffect, useRef, useState } from 'react';
import { CITIES } from './data';
import { Rail, Train } from './kit';
import { BRUSH, DISPLAY, HANZI } from './theme';

// Màn loading lúc mới vào Du lịch Trung Hoa: tên game viết bút lông, đoàn tàu chạy trên đường ray
// theo tiến độ tải thật (font chữ Hán, font có dấu tiếng Việt, font bút lông); đi qua ga nào
// thì ga đó đóng dấu son. Hiện ít nhất 1,2 giây, lâu nhất 8 giây.

const MIN_MS = 1200;
const MAX_MS = 8000;
const FADE_MS = 450;

// Google Fonts chia font chữ Hán thành nhiều tệp theo dải chữ: đưa đúng các chữ màn đầu dùng (tên game,
// tên ga) để tải sẵn phần đó.
const HANZI_SAMPLE = `中国之旅${CITIES.map((c) => c.name).join('')}凭祥车票`;
const FACES: [string, string][] = [
  ["400 1em 'Ma Shan Zheng'", '中国之旅'],
  ["700 1em 'Noto Serif SC'", HANZI_SAMPLE],
  ["800 1em 'Noto Serif'", 'Du lịch Trung Hoa ạ'],
  ["400 1em 'Lexend'", 'Ngồi tàu qua tám thành phố ǎ ǐ ǒ ǔ ǚ'],
  ["600 1em 'Lexend'", 'Lên tàu ạ'],
];

export function Splash({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let alive = true;
    let finished = 0;
    const jobs: Promise<unknown>[] = [
      ...FACES.map(([face, text]) => document.fonts?.load(face, text) ?? Promise.resolve()),
    ].map((job) =>
      // Lỗi tải thì vẫn vào game: chữ dùng font dự phòng.
      job
        .catch(() => undefined)
        .then(() => {
          finished++;
        }),
    );

    const t0 = performance.now();
    let raf = 0;
    const tick = () => {
      const guess = 0.9 * (1 - Math.exp(-((performance.now() - t0) / 1000) * 1.2));
      setProgress((p) => Math.max(p, finished / jobs.length, guess));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const ready = Promise.all([...jobs, wait(reduce ? 200 : MIN_MS)]);
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

  const percent = Math.round(progress * 100);
  const stations = CITIES.slice(0, 5);
  return (
    <div
      className={`fixed inset-0 z-40 flex flex-col items-center justify-center gap-10 bg-[color:var(--dl-ground)] px-6 transition-opacity duration-[450ms] motion-reduce:transition-none ${leaving ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className="flex flex-col items-center gap-1 text-center">
        <p
          className={`${BRUSH} text-[clamp(3.5rem,16vw,6rem)] leading-none text-[color:var(--dl-seal)]`}
          lang="zh-Hans"
        >
          中国之旅
        </p>
        <p className={`${DISPLAY} text-2xl`}>Du lịch Trung Hoa</p>
      </div>

      <div className="w-full max-w-md">
        <div
          role="progressbar"
          aria-label="Đang tải Du lịch Trung Hoa"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="relative mx-6 h-24"
        >
          {/* Các ga: đi qua thì đóng dấu son. */}
          {stations.map((c, i) => {
            const at = i / (stations.length - 1);
            const on = progress >= at;
            return (
              <span
                key={c.id}
                aria-hidden
                className="absolute top-0 flex -translate-x-1/2 flex-col items-center gap-1"
                style={{ left: `${at * 100}%` }}
              >
                <span
                  className={`${HANZI} flex h-9 w-9 items-center justify-center rounded-md text-sm transition-colors duration-300 ${
                    on
                      ? 'zh-ink bg-[color:var(--dl-seal)] text-[#fbf7ee]'
                      : 'text-[color:var(--dl-mute)] shadow-[inset_0_0_0_1.5px_var(--dl-line)]'
                  }`}
                  lang="zh-Hans"
                >
                  {c.name}
                </span>
              </span>
            );
          })}
          <Rail className="absolute inset-x-0 bottom-3" />
          <span
            className="absolute bottom-[1.1rem] -translate-x-1/2 text-[color:var(--dl-accent)]"
            style={{ left: `${percent}%` }}
          >
            <Train className="h-7 w-14" />
          </span>
        </div>
        <p className="mt-2 text-center text-xs font-semibold tracking-[0.1em] text-[color:var(--dl-mute)] uppercase tabular-nums">
          Tàu sắp chạy {percent}%
        </p>
      </div>
    </div>
  );
}
