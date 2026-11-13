'use client';

import { useEffect, useRef, useState } from 'react';
import { loadMuted, setHum, setMuted, sfx, unlockAudio } from './audio';
import { createBoard, type BoardView } from './board';
import { bubbleCount, HEIGHT, levelOf, WIDTH } from './engine';
import { createFighterView, type FighterView } from './fighter';
import { FORMS } from './forms';
import { Glass, KiBar } from './kit';
import { charge, drain, progress } from './power';
import { formatMs, saveRun, type Run } from './scores';
import { DISPLAY } from './theme';

// Màn đấu: bàn bắn bi và võ sĩ nạp khí đứng cạnh nhau (điện thoại: võ sĩ ở trên, bàn ở dưới), đồng
// hồ đếm từ lúc hết đếm ngược tới khi phá sạch bi. Mỗi lần nổ bi nạp khí cho võ sĩ, khí tự tản nên
// phải bắn lẹ mới lên cao. Rời tab thì đồng hồ dừng; ván được lưu sau mỗi phát để F5 không mất.

export type Finish = { won: boolean; ms: number; peak: number };

const TURN_STEP = (2.2 * Math.PI) / 180;

export function Arena({
  run,
  onFinish,
  onQuit,
}: {
  run: Run;
  onFinish: (f: Finish) => void;
  onQuit: () => void;
}) {
  const boardCv = useRef<HTMLCanvasElement>(null);
  const fighterCv = useRef<HTMLCanvasElement>(null);
  const fighterBox = useRef<HTMLDivElement>(null);
  const boardRef = useRef<BoardView | null>(null);
  const fighterRef = useRef<FighterView | null>(null);
  const runRef = useRef<Run>(run);
  /** Đồng hồ: ms đã chơi, mốc lần cập nhật cuối; chạy khi `running`. */
  const clock = useRef({ elapsed: run.elapsed, last: 0, running: false });
  const doneRef = useRef(false);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const [count, setCount] = useState<number | null>(3);
  const [shown, setShown] = useState({
    ms: run.elapsed,
    level: run.power.level,
    prog: 0,
    left: bubbleCount(run.game),
    shots: run.game.shots,
  });
  const [result, setResult] = useState<'won' | 'lost' | null>(null);
  const [muted, setMute] = useState(false);
  const lv = levelOf(run.level);

  useEffect(() => setMute(loadMuted()), []);

  // Cảnh võ sĩ.
  useEffect(() => {
    const canvas = fighterCv.current;
    const box = fighterBox.current;
    if (!canvas || !box) return;
    const f = createFighterView(canvas);
    fighterRef.current = f;
    f.setLevel(runRef.current.power.level);
    f.onZap(() => Math.random() < 0.35 && sfx.zap());
    const ro = new ResizeObserver(([e]) =>
      f.resize(Math.floor(e!.contentRect.width), Math.floor(e!.contentRect.height)),
    );
    ro.observe(box);
    return () => {
      ro.disconnect();
      f.dispose();
      fighterRef.current = null;
    };
  }, []);

  // Bàn bi.
  useEffect(() => {
    const canvas = boardCv.current;
    if (!canvas) return;
    const save = () => saveRun({ ...runRef.current, elapsed: clock.current.elapsed });
    const b = createBoard(canvas, {
      onFire: () => sfx.shoot(),
      onBounce: () => sfx.bounce(),
      onSwap: () => sfx.stick(),
      onShot: (res, game) => {
        const r = runRef.current;
        r.game = game;
        const t = clock.current.elapsed / 1000;
        const before = charge(r.power, res.popped.length, res.dropped.length, t);
        if (res.popped.length) {
          sfx.pop(res.popped.length, r.power.combo);
          fighterRef.current?.pulse(res.popped.length + res.dropped.length);
        } else sfx.stick();
        if (res.dropped.length) sfx.drop(res.dropped.length);
        if (res.rowAdded) sfx.push();
        if (r.power.level !== before) {
          fighterRef.current?.setLevel(r.power.level);
          if (r.power.level > before) sfx.levelUp(r.power.level);
          setHum(r.power.level);
        }
        if (game.status !== 'play') {
          const won = game.status === 'won';
          clock.current.running = false;
          doneRef.current = true;
          setHum(-1);
          fighterRef.current?.finish(won);
          if (won) sfx.win();
          else sfx.lose();
          setResult(game.status);
          saveRun(null);
          setTimeout(
            () => onFinishRef.current({ won, ms: clock.current.elapsed, peak: r.power.peak }),
            won ? 2200 : 1800,
          );
          return;
        }
        save();
      },
    });
    b.setGame(runRef.current.game);
    b.setPaused(true);
    boardRef.current = b;
    const ro = new ResizeObserver(() => b.resize());
    ro.observe(canvas);
    const onHide = () => {
      if (document.visibilityState === 'hidden' && !doneRef.current) save();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', save);
    return () => {
      ro.disconnect();
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', save);
      b.dispose();
      boardRef.current = null;
      setHum(-1);
    };
  }, []);

  // Đếm ngược 3-2-1 rồi mới chạy đồng hồ.
  useEffect(() => {
    if (count === null) return;
    if (count === 0) {
      sfx.countdown(true);
      clock.current.running = true;
      clock.current.last = performance.now();
      boardRef.current?.setPaused(false);
      setHum(runRef.current.power.level);
      const t = setTimeout(() => setCount(null), 600);
      return () => clearTimeout(t);
    }
    sfx.countdown(false);
    const t = setTimeout(() => setCount(count - 1), 700);
    return () => clearTimeout(t);
  }, [count]);

  // Đồng hồ và khí tản theo thời gian; dừng khi rời tab.
  useEffect(() => {
    let raf = 0;
    let lastPaint = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const c = clock.current;
      const hidden = document.hidden;
      if (c.running && !hidden) {
        const dt = now - c.last;
        c.elapsed += dt;
        const r = runRef.current;
        const before = r.power.level;
        drain(r.power, dt / 1000);
        if (r.power.level !== before) {
          fighterRef.current?.setLevel(r.power.level);
          setHum(r.power.level);
        }
      }
      c.last = now;
      boardRef.current?.setPaused(!c.running || hidden);
      if (now - lastPaint > 60) {
        lastPaint = now;
        const r = runRef.current;
        setShown({
          ms: c.elapsed,
          level: r.power.level,
          prog: progress(r.power),
          left: bubbleCount(r.game),
          shots: r.game.shots,
        });
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Bàn phím: trái/phải xoay nòng, cách/lên/Enter bắn, X hoặc Shift đổi bi.
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const b = boardRef.current;
      if (!b) return;
      if (e.key === 'ArrowLeft') b.turn(TURN_STEP);
      else if (e.key === 'ArrowRight') b.turn(-TURN_STEP);
      else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'Enter') b.fire();
      else if (e.key === 'x' || e.key === 'X' || e.key === 'Shift') b.swap();
      else return;
      e.preventDefault();
      unlockAudio();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);

  const form = FORMS[shown.level]!;
  const untilDrop = lv.dropEvery - (shown.shots % lv.dropEvery);

  return (
    <div
      className="fixed inset-0 z-20 flex flex-col overflow-hidden bg-[color:var(--bb-night)] md:flex-row-reverse"
      onPointerDown={unlockAudio}
    >
      {/* Võ sĩ nạp khí: điện thoại ở trên, máy tính ở bên phải. */}
      <div ref={fighterBox} className="relative h-[34dvh] shrink-0 md:h-auto md:flex-1">
        <canvas
          ref={fighterCv}
          className="absolute inset-0 h-full w-full"
          aria-label={`Võ sĩ dạng ${form.name}`}
          role="img"
        />
        <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-col gap-2 md:inset-x-6 md:bottom-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] text-[color:var(--bb-muted)] uppercase">
                Cấp {shown.level + 1}/6
              </p>
              <p
                key={shown.level}
                className={`${DISPLAY} bb-rise text-3xl leading-none md:text-5xl`}
                style={{ color: form.aura, textShadow: `0 0 18px ${form.aura}` }}
              >
                {form.name}
              </p>
            </div>
          </div>
          <KiBar level={shown.level} progress={shown.prog} />
        </div>
      </div>

      {/* Bàn bi và đồng hồ. */}
      {/* Máy tính: cột bàn rộng vừa đủ để bàn cao trọn màn; điện thoại: chiếm phần dưới võ sĩ. */}
      <div
        className="relative flex min-h-0 flex-1 flex-col items-center gap-2 px-2 pt-2 pb-[max(8px,env(safe-area-inset-bottom))] md:flex-none md:px-4 md:py-4 md:[width:var(--bb-col)]"
        style={
          {
            '--bb-col': `min(52vw, calc((100dvh - 120px) * ${WIDTH / HEIGHT} + 32px))`,
          } as React.CSSProperties
        }
      >
        <div className="flex w-full max-w-[520px] items-center justify-between gap-2">
          <button
            type="button"
            onClick={onQuit}
            className="min-h-10 rounded-lg px-3 text-sm font-semibold text-[color:var(--bb-muted)] shadow-[inset_0_0_0_1px_var(--bb-line)] hover:text-[color:var(--bb-text)]"
          >
            Thoát
          </button>
          <div className="text-center">
            <p
              className={`${DISPLAY} text-3xl leading-none tabular-nums text-[color:var(--bb-text)] md:text-4xl`}
            >
              {formatMs(shown.ms)}
            </p>
            <p className="text-[11px] font-semibold text-[color:var(--bb-muted)]">
              {lv.name} · còn {shown.left} bi · thêm hàng sau {untilDrop} phát
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              unlockAudio();
              setMuted(!muted);
              setMute(!muted);
            }}
            className="min-h-10 rounded-lg px-3 text-sm font-semibold text-[color:var(--bb-muted)] shadow-[inset_0_0_0_1px_var(--bb-line)] hover:text-[color:var(--bb-text)]"
          >
            {muted ? 'Bật tiếng' : 'Tắt tiếng'}
          </button>
        </div>
        {/* Bàn co theo đúng khoảng trống còn lại (container query), giữ tỉ lệ sân. */}
        <div className="relative min-h-0 w-full flex-1 [container-type:size]">
          <div
            className="relative mx-auto overflow-hidden rounded-xl shadow-[0_0_0_1px_var(--bb-line),0_0_40px_-10px_rgb(56_232_255/0.35)]"
            style={{
              aspectRatio: `${WIDTH} / ${HEIGHT}`,
              width: `min(100cqw, calc(100cqh * ${WIDTH / HEIGHT}))`,
            }}
          >
            <canvas
              ref={boardCv}
              className="absolute inset-0 h-full w-full touch-none select-none"
              aria-label="Bàn bắn bi: rê hoặc kéo để ngắm, bấm hoặc nhấc tay để bắn, chạm bi kế để đổi"
            />
            {count !== null && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
                <span
                  key={count}
                  className={`${DISPLAY} bb-pop text-8xl text-[color:var(--bb-ki)] [text-shadow:0_0_30px_var(--bb-ki)]`}
                >
                  {count === 0 ? 'Bắn!' : count}
                </span>
              </div>
            )}
            {result && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50">
                <Glass className="bb-pop px-6 py-5 text-center">
                  <p
                    className={`${DISPLAY} text-4xl ${result === 'won' ? 'text-[color:var(--bb-ki)]' : 'text-[color:var(--bb-rage)]'}`}
                  >
                    {result === 'won' ? 'Phá sạch!' : 'Bi chạm vạch'}
                  </p>
                  {result === 'won' && (
                    <p className="mt-1 text-lg font-semibold tabular-nums">{formatMs(shown.ms)}</p>
                  )}
                </Glass>
              </div>
            )}
          </div>
        </div>
        <p className="hidden text-xs text-[color:var(--bb-muted)] md:block">
          Rê chuột để ngắm, bấm để bắn · ← → xoay, Space bắn, X đổi bi
        </p>
      </div>
      {result === null && count === null && (
        <span className="sr-only" aria-live="polite">
          Cấp {shown.level + 1}, {form.name}
        </span>
      )}
    </div>
  );
}
