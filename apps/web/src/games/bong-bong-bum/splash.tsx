'use client';

import { useEffect, useRef, useState } from 'react';
import { loadCharacterArt } from './art';
import { characterById } from './characters';
import { drawBomb } from './draw';
import { FUSE } from './engine';
import { SEAT_COLORS } from './palette';
import { CARD, CharCanvas, DISPLAY, Logo } from './ui';

// Màn loading lúc mới vào game: logo Bomb Arena, một nhân vật chạy dọc sợi ngòi về phía quả bóng nổ
// theo tiến độ tải thật (đếm ảnh nhân vật đã xong, rồi chờ font). Tải xong thì mờ dần; hiện ít nhất
// một nhịp cho kịp nhìn, lâu nhất vài giây (mạng chậm thì vào trước, ảnh về sau sẽ tự thay hình vẽ bằng code).

const MIN_MS = 1200;
const MAX_MS = 8000;
const FADE_MS = 400;
/** Người chạy là nhân vật vẽ bằng code (không có ảnh) nên không bị đổi hình giữa chừng khi ảnh tải xong. */
const RUNNER = characterById('mia');
/** Cỡ canvas quả bóng (điểm ảnh thật); CSS thu lại còn 56px cho nét trên màn hình mật độ cao. */
const BOMB_PX = 96;

/** Quả bóng ở cuối ngòi: dùng đúng hình vẽ trong trận, ngòi càng cháy gần thì càng rung, sắp xong thì loé. */
function FuseBomb({ progress, still }: { progress: number; still: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current?.getContext('2d');
    if (!c) return;
    c.clearRect(0, 0, BOMB_PX, BOMB_PX);
    drawBomb(c, BOMB_PX / 2, BOMB_PX * 0.56, BOMB_PX, SEAT_COLORS[0], still ? 0 : progress * FUSE);
  }, [progress, still]);
  return (
    <canvas
      ref={ref}
      width={BOMB_PX}
      height={BOMB_PX}
      className="absolute bottom-[2px] right-0 h-14 w-14"
      aria-hidden
    />
  );
}

export function Splash({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [still, setStill] = useState(false);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    setStill(reduce);
    let alive = true;
    let real = 0;
    const t0 = performance.now();
    // Ảnh về theo từng đợt nên số đếm thật hay đứng yên một lúc: thanh nhích dần theo thời gian
    // (dừng ở 90%) và lấy số lớn hơn, để không bao giờ trông như bị treo. Ảnh xong hết vẫn còn chờ
    // font nên số thật chỉ tới 95%; 100% chỉ hiện đúng lúc vào game.
    let raf = 0;
    const tick = () => {
      const guess = 0.9 * (1 - Math.exp(-((performance.now() - t0) / 1000) * 1.2));
      setProgress((p) => Math.max(p, Math.min(real, 0.95), guess));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    // Font chờ sau cùng: lúc trang vừa mở có thể chưa chữ nào cần font nên `fonts.ready` xong ngay;
    // sau nhịp tối thiểu thì logo và chữ trên màn này đã kích hoạt việc tải Baloo 2 và Nunito.
    const ready = Promise.all([
      loadCharacterArt((p) => (real = p)),
      wait(reduce ? 200 : MIN_MS),
    ]).then(() => document.fonts?.ready);
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
      role="status"
      aria-live="polite"
      aria-label={`Đang tải Bomb Arena ${pct}%`}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-[linear-gradient(180deg,#7fd8f7_0%,#4cc3f0_55%,#2a8fd6_100%)] px-4 transition-opacity duration-[400ms] motion-reduce:transition-none ${leaving ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {[
          [10, 14, 70],
          [82, 20, 46],
          [70, 72, 88],
          [16, 80, 54],
        ].map(([l, t, s], i) => (
          <span
            key={i}
            className="absolute rounded-full border-[3px] border-white/50 bg-white/15"
            style={{ left: `${l}%`, top: `${t}%`, width: s, height: s }}
          />
        ))}
      </div>

      <Logo />

      <div className={`${CARD} relative w-full max-w-sm px-4 pb-3 pt-2`}>
        <div className="relative h-[84px]" aria-hidden>
          {/* Sợi ngòi: phần đã cháy tô vàng, chui vào dưới quả bóng ở mép phải. */}
          <div className="absolute bottom-[18px] left-0 right-[40px] h-4 overflow-hidden rounded-full border-[3px] border-[color:var(--bb-ink)] bg-white">
            <div className="h-full bg-[color:var(--bb-sun)]" style={{ width: `${pct}%` }} />
          </div>
          <div
            className="absolute bottom-[30px]"
            style={{ left: `calc(${progress} * (100% - 96px))` }}
          >
            <CharCanvas
              def={RUNNER}
              dir="right"
              pose={still ? 'idle' : 'walk'}
              animate={!still}
              size={44}
            />
          </div>
          <FuseBomb progress={progress} still={still} />
        </div>
        <p className={`${DISPLAY} text-center text-xl tabular-nums`}>Đang thổi bóng… {pct}%</p>
      </div>
    </div>
  );
}
