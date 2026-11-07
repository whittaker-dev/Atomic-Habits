'use client';

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { EraserIcon, TrashIcon, UndoIcon } from './icons';
import { Tip } from './kit';
import { ERASER, H, paintStrokes, W, type DrawOp, type Ink, type Stroke } from './ink';
import { BRUSHES, INKS } from './theme';

// Ba kiểu bảng: bảng của người vẽ (bấm được, phát thao tác), bảng xem trực tiếp của người đoán
// (vẽ lại mỗi khi có nét mới) và ảnh nhỏ tĩnh cho màn đáp án / tổng kết.

/** Canvas nét theo toạ độ logic; độ phân giải thật nhân theo màn hình cho nét không bị nhoè. */
function useInkCanvas(draw: (c: CanvasRenderingContext2D) => void) {
  const ref = useRef<HTMLCanvasElement>(null);
  const ctx = useRef<CanvasRenderingContext2D | null>(null);
  useEffect(() => {
    const cv = ref.current;
    const c = cv?.getContext('2d');
    if (!cv || !c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr;
    cv.height = H * dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.current = c;
    draw(c);
    // Chỉ dựng canvas một lần; vẽ lại do nơi gọi chủ động.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { ref, ctx };
}

/** Khung vải đỏ viền đèn quanh mặt bảng — giống nhau ở mọi kiểu bảng. */
function Frame({ children, thin }: { children: ReactNode; thin?: boolean }) {
  return (
    <div
      className={
        thin
          ? 'rounded-lg bg-[color:var(--vd-red)] p-1'
          : 'rounded-[18px] bg-[color:var(--vd-red)] p-[7px] shadow-[0_0_0_2px_var(--vd-gold),0_14px_30px_-10px_rgb(0_0_0/0.7)]'
      }
    >
      {children}
    </div>
  );
}

const canvasClass = (thin?: boolean) =>
  `block aspect-[4/3] w-full bg-[color:var(--vd-board)] ${thin ? 'rounded-[5px]' : 'rounded-[11px]'}`;

/** Bảng xem trực tiếp: vẽ lại theo khung hình khi có nét mới (gộp nhiều gói trong một khung). */
export function InkView({ ink, label = 'Bảng vẽ' }: { ink: Ink; label?: string }) {
  const { ref, ctx } = useInkCanvas((c) => paintStrokes(c, ink.strokes));
  useEffect(() => {
    let raf = 0;
    const off = ink.subscribe(() => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (ctx.current) paintStrokes(ctx.current, ink.strokes);
      });
    });
    return () => {
      off();
      cancelAnimationFrame(raf);
    };
  }, [ink, ctx]);
  return (
    <Frame>
      <canvas ref={ref} role="img" aria-label={label} className={canvasClass()} />
    </Frame>
  );
}

/** Ảnh tĩnh của một bức vẽ đã xong. */
export function InkThumb({
  strokes,
  label,
  thin,
}: {
  strokes: Stroke[];
  label: string;
  thin?: boolean;
}) {
  const { ref } = useInkCanvas((c) => paintStrokes(c, strokes));
  return (
    <Frame thin={thin}>
      <canvas ref={ref} role="img" aria-label={label} className={canvasClass(thin)} />
    </Frame>
  );
}

/** Gom điểm của nét đang vẽ và gửi theo đợt ~20 lần mỗi giây thay vì mỗi lần ngón tay nhích. */
const FLUSH_MS = 50;

/** Tên ba cỡ bút, theo thứ tự `BRUSHES`. */
const BRUSH_LABEL = ['Bút nhỏ', 'Bút vừa', 'Bút to'];

/** Bảng của người vẽ: nét áp ngay vào bảng chung (thấy liền) và gửi đi qua `onOps`. */
export function DrawBoard({ ink, onOps }: { ink: Ink; onOps: (ops: DrawOp[]) => void }) {
  const [color, setColor] = useState<string>(INKS[0].hex);
  const [size, setSize] = useState<number>(BRUSHES[1]);
  const [eraser, setEraser] = useState(false);
  const [count, setCount] = useState(ink.strokes.length);
  const drawing = useRef(false);
  const pending = useRef<DrawOp[]>([]);
  const onOpsRef = useRef(onOps);
  onOpsRef.current = onOps;
  const { ref, ctx } = useInkCanvas((c) => paintStrokes(c, ink.strokes));

  useEffect(() => {
    const flush = () => {
      if (!pending.current.length) return;
      onOpsRef.current(pending.current);
      pending.current = [];
    };
    const t = setInterval(flush, FLUSH_MS);
    const off = ink.subscribe(() => {
      if (ctx.current) paintStrokes(ctx.current, ink.strokes);
      setCount(ink.strokes.length);
    });
    return () => {
      clearInterval(t);
      flush();
      off();
    };
  }, [ink, ctx]);

  const emit = (op: DrawOp) => {
    ink.apply([op]);
    // Gộp các 'to' liền nhau thành một thao tác để gói tin gọn.
    const last = pending.current[pending.current.length - 1];
    if (op.k === 'to' && last?.k === 'to') last.pts.push(...op.pts);
    else pending.current.push(op.k === 'to' ? { k: 'to', pts: [...op.pts] } : op);
  };

  const at = (e: PointerEvent<HTMLCanvasElement>): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect();
    return [
      Math.round(((e.clientX - r.left) / r.width) * W),
      Math.round(((e.clientY - r.top) / r.height) * H),
    ];
  };

  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const [x, y] = at(e);
    emit({ k: 'begin', color: eraser ? ERASER : color, size: eraser ? size * 2.2 : size, x, y });
  };
  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    if (drawing.current) emit({ k: 'to', pts: at(e) });
  };
  const up = () => {
    drawing.current = false;
  };

  const tool =
    'flex h-11 w-11 items-center justify-center rounded-full text-[color:var(--vd-bulb)] ring-2 ring-inset ring-[color:var(--vd-wire)] hover:ring-[color:var(--vd-mute)] disabled:opacity-40';

  return (
    <div className="flex flex-col gap-3">
      <Frame>
        <canvas
          ref={ref}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          aria-label="Bảng vẽ của bạn"
          className={`${canvasClass()} cursor-crosshair touch-none`}
        />
      </Frame>

      <div className="flex flex-wrap items-center justify-between gap-y-3">
        <div className="flex gap-1.5" role="radiogroup" aria-label="Màu bút">
          {INKS.map((ink) => {
            const on = !eraser && ink.hex === color;
            return (
              <Tip key={ink.hex} label={`Bút ${ink.name.toLowerCase()}`}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={ink.name}
                  onClick={() => {
                    setColor(ink.hex);
                    setEraser(false);
                  }}
                  className={`h-8 w-8 rounded-full shadow-[inset_0_-3px_0_rgb(0_0_0/0.25)] transition-transform ${
                    on
                      ? 'scale-110 ring-[3px] ring-[color:var(--vd-bulb)] ring-offset-2 ring-offset-[color:var(--vd-tarp)]'
                      : 'hover:scale-105'
                  }`}
                  style={{ background: ink.hex }}
                />
              </Tip>
            );
          })}
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex gap-1" role="radiogroup" aria-label="Cỡ bút">
            {BRUSHES.map((b, i) => (
              <Tip key={b} label={BRUSH_LABEL[i] ?? ''}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={b === size}
                  aria-label={BRUSH_LABEL[i]}
                  onClick={() => setSize(b)}
                  className={`flex h-11 w-11 items-center justify-center rounded-full ${
                    b === size
                      ? 'bg-[color:var(--vd-tarpHi)] ring-2 ring-[color:var(--vd-gold)]'
                      : ''
                  }`}
                >
                  <span
                    className="rounded-full bg-[color:var(--vd-bulb)]"
                    style={{ width: 4 + b * 0.8, height: 4 + b * 0.8 }}
                  />
                </button>
              </Tip>
            ))}
          </div>
          <Tip label="Tẩy">
            <button
              type="button"
              aria-pressed={eraser}
              aria-label="Tẩy"
              onClick={() => setEraser((v) => !v)}
              className={`${tool} ${eraser ? 'bg-[color:var(--vd-tarpHi)] ring-[color:var(--vd-gold)]' : ''}`}
            >
              <EraserIcon />
            </button>
          </Tip>
          <Tip label="Hoàn tác">
            <button
              type="button"
              aria-label="Hoàn tác"
              onClick={() => emit({ k: 'undo' })}
              disabled={!count}
              className={tool}
            >
              <UndoIcon />
            </button>
          </Tip>
          <Tip label="Xoá hết">
            <button
              type="button"
              aria-label="Xoá hết"
              onClick={() => emit({ k: 'clear' })}
              disabled={!count}
              className={tool}
            >
              <TrashIcon />
            </button>
          </Tip>
        </div>
      </div>
    </div>
  );
}
