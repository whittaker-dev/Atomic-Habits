'use client';

import { useEffect, useRef, useState } from 'react';
import { CITIES } from './data';
import { Airmail, Plane } from './kit';
import { DISPLAY, MONO } from './theme';

// Màn loading lúc mới vào English Traveler: bảng giờ bay lật chữ của sân bay, mỗi phần tải xong lật
// thêm một chuyến sang "BOARDING", dưới là máy bay bay dọc đường bay chấm theo tiến độ thật (font
// chữ, gồm phần chữ có dấu tiếng Việt). Hiện ít nhất 1,2 giây, lâu nhất 8 giây.

const MIN_MS = 1200;
const MAX_MS = 8000;
const FADE_MS = 450;

const FACES = [
  "800 1em 'Bricolage Grotesque'",
  "700 1em 'Bricolage Grotesque'",
  "400 1em 'IBM Plex Sans'",
  "600 1em 'IBM Plex Sans'",
  "600 1em 'IBM Plex Mono'",
];
// Google Fonts tách chữ có dấu ra tệp riêng, chỉ tải khi trang cần: mẫu có dấu để tải luôn phần đó.
const SAMPLE = 'English Traveler Hộ chiếu ạ';

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
      ...FACES.map((face) => document.fonts?.load(face, SAMPLE) ?? Promise.resolve()),
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
  const rows = CITIES.slice(1, 7);
  return (
    <div
      className={`fixed inset-0 z-40 flex flex-col items-center justify-center gap-8 bg-[color:var(--dl-ground)] px-5 transition-opacity duration-[450ms] motion-reduce:transition-none ${leaving ? 'opacity-0' : 'opacity-100'}`}
    >
      <Airmail className="absolute inset-x-0 top-0 h-2.5" />
      <p
        className={`${DISPLAY} text-center text-[clamp(2.4rem,9vw,4rem)] leading-[0.9] text-[color:var(--dl-ink)]`}
      >
        English Traveler
      </p>

      {/* Bảng giờ bay: mỗi dòng lật sang BOARDING khi tiến độ vượt qua nó. */}
      <div
        aria-hidden
        className="w-full max-w-md rounded-xl bg-[#0f1733] p-3 shadow-[0_24px_40px_-24px_rgb(15_23_51/0.8)]"
      >
        <div className={`${MONO} mb-2 flex justify-between px-1 text-[0.65rem] text-[#8d9bc7]`}>
          <span>Departures</span>
          <span>Giờ bay</span>
        </div>
        <ul className="flex flex-col gap-1.5">
          {rows.map((c, i) => {
            const on = progress >= (i + 1) / (rows.length + 1);
            return (
              <li key={c.id} className={`${MONO} grid grid-cols-[3.2rem_1fr_6.5rem] gap-2 text-sm`}>
                <span className="rounded bg-[#1b2650] px-1.5 py-1 text-center text-[#ffd26a]">
                  {c.code}
                </span>
                <span className="truncate rounded bg-[#1b2650] px-2 py-1 text-[#f1f4ff]">
                  {c.name}
                </span>
                <span
                  key={on ? 'on' : 'off'}
                  className={`et-flap rounded px-2 py-1 text-center ${on ? 'bg-[#1f8a55] text-white' : 'bg-[#1b2650] text-[#8d9bc7]'}`}
                >
                  {on ? 'Boarding' : 'On time'}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex w-full max-w-md flex-col gap-2">
        <div
          role="progressbar"
          aria-label="Đang tải English Traveler"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="relative mx-4 h-8"
        >
          <span className="absolute inset-x-0 top-1/2 border-t-2 border-dashed border-[color:var(--dl-line)]" />
          <span
            className="absolute inset-y-0 left-0 top-1/2 h-0 border-t-2 border-[color:var(--dl-accent)]"
            style={{ width: `${percent}%` }}
          />
          <span
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-[color:var(--dl-accent)]"
            style={{ left: `${percent}%` }}
          >
            <Plane className="h-7 w-7" />
          </span>
        </div>
        <p className={`${MONO} text-center text-xs text-[color:var(--dl-mute)] tabular-nums`}>
          Chuẩn bị cất cánh {percent}%
        </p>
      </div>
    </div>
  );
}
