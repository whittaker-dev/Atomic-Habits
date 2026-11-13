'use client';

import { useEffect, useRef, useState } from 'react';
import { cellHash } from '../bong-bong-bum/map';
import { CARD } from '../bong-bong-bum/ui';
import { loadSquadArt } from './assets';
import { Title } from './screens';
import { squadById } from './squad';

// Màn loading lúc mới vào game: một khoảnh sân gạch nhỏ được bốn nhân vật sơn dần từ bốn góc (như
// chỗ xuất phát trong trận), bên dưới là thanh lãnh địa y như thanh trên màn trận. Tiến độ là tiến
// độ tải thật (ảnh đội sơn, font). Tải xong thì mờ dần; hiện ít nhất một nhịp cho kịp nhìn sân được
// sơn kín, lâu nhất vài giây (mạng chậm thì vào trước, ảnh còn thiếu tự về sau).

const MIN_MS = 1200;
const MAX_MS = 8000;
const FADE_MS = 450;
/** Màn giảm chuyển động: không có hoạt ảnh để xem nên chỉ chờ một thoáng cho khỏi chớp. */
const REDUCED_MIN_MS = 200;

const W = 9;
const H = 5;
/** Bốn nhân vật ở sảnh, mỗi người một góc sân. */
const PAINTERS = [
  { id: 'mochi', x: 0, y: 0 },
  { id: 'bin', x: W - 1, y: 0 },
  { id: 'kem', x: 0, y: H - 1 },
  { id: 'bo', x: W - 1, y: H - 1 },
].map((p) => ({ ...p, color: squadById(p.id).color }));

/**
 * Mỗi ô thuộc về góc gần nhất và được sơn theo thứ tự xa dần góc đó; một chút lệch theo ô (cùng
 * cellHash với sân thật) cho vệt sơn loang không đều như người chạy thật.
 */
const CELLS = (() => {
  const cells: { x: number; y: number; who: number; order: number; gloss: boolean }[] = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const h = cellHash(x, y);
      const dist = PAINTERS.map((p) => Math.abs(p.x - x) + Math.abs(p.y - y));
      const near = Math.min(...dist);
      const tied = PAINTERS.map((_, i) => i).filter((i) => dist[i] === near);
      cells.push({
        x,
        y,
        who: tied[h % tied.length]!,
        order: near + (h % 10) / 11,
        gloss: h % 3 === 0,
      });
    }
  const rank = [...cells].sort((a, b) => a.order - b.order);
  return cells.map((c) => ({ ...c, rank: rank.indexOf(c) }));
})();

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
    // Ảnh chỉ báo xong từng tấm, có lúc vài tấm về cùng lúc: thanh tự nhích dần để không đứng im,
    // nhưng dừng ở 90% cho tới khi tải xong thật. Tiến độ thật cũng chặn dưới 100% vì còn chờ font
    // và thời gian tối thiểu — thanh đầy rồi mà chưa vào được thì trông như bị treo.
    let raf = 0;
    const tick = () => {
      const guess = 0.9 * (1 - Math.exp(-((performance.now() - t0) / 1000) * 1.2));
      setProgress((p) => Math.max(p, Math.min(real, 0.95), guess));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const ready = Promise.all([
      document.fonts?.ready ?? Promise.resolve(),
      loadSquadArt((p) => (real = p)),
      wait(reduce ? REDUCED_MIN_MS : MIN_MS),
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

  const painted = Math.floor(progress * CELLS.length);
  const shares = PAINTERS.map(
    (_, i) => CELLS.filter((c) => c.who === i && c.rank < painted).length / CELLS.length,
  );
  const percent = Math.round(progress * 100);

  return (
    <div
      aria-busy={!leaving}
      className={`fixed inset-0 z-40 flex flex-col items-center justify-center gap-7 bg-[linear-gradient(180deg,#7fd8f7_0%,#4cc3f0_55%,#2a8fd6_100%)] px-6 transition-opacity duration-[450ms] motion-reduce:transition-none ${leaving ? 'opacity-0' : 'opacity-100'}`}
    >
      <Title />

      {/* Khoảnh sân: viền tường đá sẫm như tường bao trong trận, gạch sáng xen kẽ như ảnh sân nhỏ. */}
      <div
        className="grid w-full max-w-xs gap-[3px] rounded-2xl border-[3px] border-[color:var(--bb-ink)] bg-[#566074] p-2 shadow-[0_5px_0_var(--bb-ink)]"
        style={{ gridTemplateColumns: `repeat(${W}, minmax(0, 1fr))` }}
        aria-hidden
      >
        {CELLS.map((c) => {
          const on = c.rank < painted;
          return (
            <span
              key={`${c.x}-${c.y}`}
              className="relative aspect-square rounded-[4px]"
              style={{ background: (c.x + c.y) % 2 ? '#dfe3ea' : '#d3d8e0' }}
            >
              <span
                className={`absolute -inset-[2px] rounded-[38%] transition-transform duration-300 ease-out motion-reduce:transition-none ${on ? 'scale-100' : 'scale-0'}`}
                style={{ background: PAINTERS[c.who]!.color, opacity: 0.9 }}
              >
                {/* Ánh bóng ướt trên một phần ba số ô, như lớp sơn trên sân 3D. */}
                {c.gloss && (
                  <span className="absolute left-[18%] top-[20%] h-[16%] w-[32%] -rotate-[28deg] rounded-full bg-white/30" />
                )}
              </span>
            </span>
          );
        })}
      </div>

      <div className="flex w-full max-w-xs flex-col gap-2">
        {/* Thanh lãnh địa: cùng hình với thanh trên màn trận, mỗi màu là phần sân một người đã sơn. */}
        <div
          role="progressbar"
          aria-label="Đang tải Sơn Lãnh Địa"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="flex h-8 overflow-hidden rounded-full border-[3px] border-[color:var(--bb-ink)] bg-white shadow-[0_3px_0_var(--bb-ink)]"
        >
          {PAINTERS.map((p, i) => (
            <span
              key={p.id}
              className="transition-[width] duration-300 motion-reduce:transition-none"
              style={{ width: `${shares[i]! * 100}%`, background: p.color }}
            />
          ))}
        </div>
        <p className={`${CARD} self-center px-3 py-0.5 text-sm font-extrabold tabular-nums`}>
          Đang sơn sân… {percent}%
        </p>
      </div>
    </div>
  );
}
