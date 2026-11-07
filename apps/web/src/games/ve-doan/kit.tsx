'use client';

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { CheckIcon, PencilIcon } from './icons';
import type { Seat } from './engine';
import type { FeedView } from './net';
import { DISPLAY } from './theme';

// Bộ thành phần của Vẽ Đoán, lấy từ sân khấu lô tô: dây bóng đèn đếm giờ, vé giấy có ô chữ,
// thẻ tròn lật chữ, biển đèn chạy viền. Mọi màn hình chỉ ghép từ đây để cùng một giọng.

const TONES = {
  gold: 'bg-[color:var(--vd-gold)] text-[color:var(--vd-ink)] shadow-[inset_0_-4px_0_var(--vd-goldDeep),0_6px_14px_-4px_rgb(0_0_0/0.5)] hover:brightness-105',
  red: 'bg-[color:var(--vd-red)] text-[color:var(--vd-bulb)] shadow-[inset_0_-4px_0_var(--vd-redDeep),0_6px_14px_-4px_rgb(0_0_0/0.5)] hover:brightness-110',
  ghost:
    'bg-transparent text-[color:var(--vd-bulb)] ring-2 ring-inset ring-[color:var(--vd-wire)] hover:ring-[color:var(--vd-mute)]',
} as const;

export function Button({
  children,
  tone = 'gold',
  onClick,
  disabled,
  className = '',
  type = 'button',
}: {
  children: ReactNode;
  tone?: keyof typeof TONES;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${DISPLAY} inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 pt-1 text-2xl leading-none transition-[transform,filter] active:translate-y-0.5 disabled:pointer-events-none disabled:opacity-45 ${TONES[tone]} ${className}`}
    >
      {children}
    </button>
  );
}

/** Bao lâu nhãn còn hiện sau một lần chạm trên điện thoại. */
const TIP_TOUCH_MS = 1400;

/**
 * Nhãn nổi cho thứ chỉ có hình (nút công cụ, ô màu, huy hiệu). Rê chuột hoặc Tab tới thì hiện;
 * điện thoại không có rê chuột nên chạm vào là hiện một lúc rồi tự tắt, không chặn cú chạm.
 * Nút bên trong vẫn phải có aria-label riêng: nhãn này chỉ để nhìn nên ẩn khỏi trình đọc màn hình.
 */
export function Tip({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [shift, setShift] = useState(0);
  const bubble = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Nút sát mép màn hình (ô màu đầu, nút xoá cuối) thì nhãn căn giữa sẽ tràn ra ngoài: đẩy nó vào trong.
  useLayoutEffect(() => {
    const el = bubble.current;
    if (!open || !el) return;
    const r = el.getBoundingClientRect();
    const pad = 8;
    const left = r.left - shift;
    const right = r.right - shift;
    setShift(
      left < pad
        ? pad - left
        : right > window.innerWidth - pad
          ? window.innerWidth - pad - right
          : 0,
    );
    // Chỉ đo lại khi vừa mở; `shift` đã được trừ ra ở trên.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const hover = (on: boolean) => (e: PointerEvent) => {
    if (e.pointerType === 'mouse') setOpen(on);
  };
  const touch = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    setOpen(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), TIP_TOUCH_MS);
  };

  return (
    <span
      className="relative inline-flex"
      onPointerEnter={hover(true)}
      onPointerLeave={hover(false)}
      onPointerDown={touch}
      onFocus={(e) => setOpen(e.target.matches(':focus-visible'))}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          ref={bubble}
          aria-hidden
          className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 whitespace-nowrap rounded-md bg-[color:var(--vd-bulb)] px-2 py-1 text-xs font-bold leading-none text-[color:var(--vd-ink)] shadow-[0_6px_14px_-4px_rgb(0_0_0/0.6)]"
          style={{ transform: `translateX(calc(-50% + ${shift}px))` }}
        >
          {label}
        </span>
      )}
    </span>
  );
}

/**
 * Dây bóng đèn đếm giờ: mỗi bóng là một giây, còn bao nhiêu giây thì sáng bấy nhiêu bóng.
 * Bóng sắp tắt nhấp nháy để mắt tự tìm ra chỗ "kim đồng hồ" mà không cần đọc số.
 */
export function BulbString({
  total,
  lit,
  perRow = 40,
  className = '',
}: {
  total: number;
  lit: number;
  perRow?: number;
  className?: string;
}) {
  return (
    <div
      role="timer"
      aria-label={`Còn ${lit} giây`}
      className={`grid gap-y-2 ${className}`}
      // Sợi dây điện chạy ngang giữa mỗi hàng bóng (hàng cao 12px + khe 8px).
      style={{
        gridTemplateColumns: `repeat(${perRow}, minmax(0, 1fr))`,
        background:
          'linear-gradient(to bottom, transparent 5.5px, var(--vd-wire) 5.5px, var(--vd-wire) 6.5px, transparent 6.5px) 0 0 / 100% 20px repeat-y',
      }}
    >
      {Array.from({ length: total }, (_, i) => {
        const on = i < lit;
        const last = on && i === lit - 1;
        return (
          <span key={i} className="flex h-3 items-center justify-center">
            <span
              className={`h-[7px] w-[7px] rounded-full transition-[background-color,box-shadow] duration-500 ${
                on
                  ? 'bg-[color:var(--vd-bulb)] shadow-[0_0_6px_2px_rgb(255_201_60/0.55)]'
                  : 'bg-[color:var(--vd-tarpHi)] ring-1 ring-[color:var(--vd-wire)]'
              } ${last ? 'motion-safe:animate-[vd-flicker_1s_ease-in-out_infinite]' : ''}`}
            />
          </span>
        );
      })}
    </div>
  );
}

/** Một ô vé lô tô; chữ đã lật nằm trên thẻ tròn vàng như người hô vừa thả thẻ xuống. */
function TicketSquare({
  letter,
  open,
  size,
  delay,
}: {
  letter: string;
  open: boolean;
  size: 'md' | 'lg';
  delay?: number;
}) {
  // Cỡ lớn chỉ từ màn rộng trở lên: trên điện thoại 9–10 ô cỡ lớn sẽ rớt dòng.
  const box =
    size === 'lg' ? 'h-11 w-8 text-[26px] sm:h-14 sm:w-11 sm:text-[34px]' : 'h-11 w-8 text-[26px]';
  const token = size === 'lg' ? 'h-7 w-7 sm:h-10 sm:w-10' : 'h-7 w-7';
  return (
    <span
      className={`${box} flex items-center justify-center rounded-[4px] border border-[color:var(--vd-rule)] bg-[color:var(--vd-paper)] shadow-[inset_0_-3px_0_rgb(42_31_61/0.07)]`}
    >
      {open && (
        <span
          className={`${DISPLAY} ${token} flex items-center justify-center rounded-full bg-[color:var(--vd-gold)] pt-1 leading-none text-[color:var(--vd-ink)] shadow-[inset_0_-2px_0_var(--vd-goldDeep),0_2px_4px_rgb(0_0_0/0.25)] ${
            delay !== undefined
              ? 'motion-safe:animate-[vd-drop_420ms_cubic-bezier(.2,.9,.3,1.25)_both]'
              : ''
          }`}
          style={delay !== undefined ? { animationDelay: `${delay}ms` } : undefined}
        >
          {letter}
        </span>
      )}
    </span>
  );
}

/**
 * Hàng ô chữ của từ cần đoán. `pattern`: chữ đã biết giữ nguyên, chữ chưa lật là "_", dấu cách tách
 * tiếng ("b___ c____"). `drop` cho thẻ rơi lần lượt từng chữ — dùng ở màn lộ đáp án.
 */
export function Ticket({
  pattern,
  size = 'md',
  drop,
}: {
  pattern: string;
  size?: 'md' | 'lg';
  drop?: boolean;
}) {
  let index = 0;
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2" aria-hidden>
      {pattern
        .toUpperCase()
        .split(' ')
        .map((part, w) => (
          <span key={w} className="flex gap-[3px]">
            {[...part].map((ch) => {
              const i = index++;
              return (
                <TicketSquare
                  key={i}
                  letter={ch}
                  open={ch !== '_'}
                  size={size}
                  delay={drop ? 250 + i * 110 : undefined}
                />
              );
            })}
          </span>
        ))}
    </div>
  );
}

/** Dải thông báo duy nhất: trên điện thoại mỗi lúc chỉ nói một việc tiếp theo của bạn. */
export function StatusBand({ meta, message }: { meta: ReactNode; message: ReactNode }) {
  return (
    <header className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs font-bold tracking-[0.08em] text-[color:var(--vd-gold)] uppercase">
        {meta}
      </div>
      <h2
        aria-live="polite"
        className={`${DISPLAY} pt-1 text-[32px] leading-[1.05] text-[color:var(--vd-bulb)]`}
      >
        {message}
      </h2>
    </header>
  );
}

const SEAT = [
  '#7c5cd6',
  '#2b7de9',
  '#e8742a',
  '#c2459b',
  '#3a9fa0',
  '#8a5a2b',
  '#5b6bd6',
  '#b0476a',
];

export function Avatar({
  player,
  seat,
  state,
  you,
  size = 'md',
}: {
  player: Pick<Seat, 'name' | 'connected'>;
  seat: number;
  state?: 'drawing' | 'solved';
  you?: boolean;
  size?: 'md' | 'lg';
}) {
  const dim = size === 'lg' ? 'h-14 w-14 text-[28px]' : 'h-11 w-11 text-[22px]';
  const bg =
    state === 'drawing'
      ? 'var(--vd-red)'
      : state === 'solved'
        ? 'var(--vd-leaf)'
        : (SEAT[seat % SEAT.length] ?? SEAT[0]);
  return (
    <span
      className={`${DISPLAY} ${dim} relative flex shrink-0 items-center justify-center rounded-full pt-1 leading-none text-white ${
        player.connected ? '' : 'opacity-40 grayscale'
      } ${
        you
          ? 'ring-[3px] ring-[color:var(--vd-gold)] ring-offset-2 ring-offset-[color:var(--vd-tarp)]'
          : ''
      }`}
      style={{ background: bg }}
    >
      {player.name.slice(0, 1)}
      {state && (
        <span
          className={`absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full ${
            state === 'drawing'
              ? 'bg-[color:var(--vd-gold)] text-[color:var(--vd-ink)]'
              : 'bg-[color:var(--vd-bulb)] text-[color:var(--vd-leaf)]'
          }`}
        >
          <Tip label={state === 'drawing' ? 'Đang vẽ' : 'Đã đoán ra'}>
            {state === 'drawing' ? (
              <PencilIcon className="h-3 w-3" />
            ) : (
              <CheckIcon className="h-3 w-3" />
            )}
          </Tip>
        </span>
      )}
    </span>
  );
}

/** Hàng người chơi trong lượt: ai đang vẽ, ai đã đoán ra, điểm hiện tại. */
export function PlayerRow({
  seats,
  drawer,
  solved,
  you,
}: {
  seats: Seat[];
  drawer: number;
  solved: number[];
  you: number;
}) {
  return (
    <ul className="flex flex-wrap justify-center gap-x-1 gap-y-3" aria-label="Người chơi">
      {seats.map((p, i) => {
        const state = i === drawer ? 'drawing' : solved.includes(i) ? 'solved' : undefined;
        return (
          <li key={i} className="flex w-16 flex-col items-center gap-1 text-center">
            <Avatar player={p} seat={i} state={state} you={i === you} />
            <span className="w-full truncate text-[13px] font-bold text-[color:var(--vd-bulb)]">
              {i === you ? 'Bạn' : p.name}
            </span>
            <span className={`${DISPLAY} -mt-1 text-lg leading-none text-[color:var(--vd-gold)]`}>
              {p.score}
            </span>
            <span className="sr-only">
              {state === 'drawing' ? 'đang vẽ' : state === 'solved' ? 'đã đoán ra' : ''}
              {p.connected ? '' : ', đã rời phòng'}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Dòng câu đoán như cuống vé: sai thì giấy trắng, gần đúng thì nhuộm vàng, đúng thì xanh có dấu tích.
 * Mỗi trạng thái chỉ đổi một thứ — màu giấy — để đọc liếc là biết. Câu nào làm lộ đáp án thì
 * chủ phòng không gửi chữ (`text` trống) và dòng chỉ báo kết quả.
 */
export function GuessFeed({ feed, nameOf }: { feed: FeedView[]; nameOf: (id: number) => string }) {
  if (!feed.length)
    return (
      <p className="rounded-md px-3 py-2 text-sm text-[color:var(--vd-mute)] ring-1 ring-[color:var(--vd-wire)] ring-inset">
        Chưa ai đoán. Câu đoán sẽ hiện ở đây.
      </p>
    );
  return (
    <ol className="flex flex-col gap-1.5" aria-label="Câu đoán" aria-live="polite">
      {feed.map((g, i) => (
        <li
          key={i}
          className={`flex min-h-10 items-center justify-between gap-3 rounded-md px-3 py-1.5 text-[15px] ${
            g.verdict === 'correct'
              ? 'bg-[color:var(--vd-leaf)] font-bold text-white'
              : g.verdict === 'near'
                ? 'bg-[color:var(--vd-gold)] text-[color:var(--vd-ink)]'
                : 'bg-[color:var(--vd-paper)] text-[color:var(--vd-ink)]'
          }`}
        >
          {g.verdict === 'correct' ? (
            <>
              <span className="flex min-w-0 items-center gap-2">
                <CheckIcon className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {nameOf(g.by)} đoán đúng!{g.text ? ` (${g.text})` : ''}
                </span>
              </span>
              {g.points !== undefined && (
                <span className={`${DISPLAY} shrink-0 pt-1 text-xl leading-none`}>+{g.points}</span>
              )}
            </>
          ) : (
            <>
              <span className="min-w-0 truncate">
                <b className="font-bold">{nameOf(g.by)}</b>
                {g.text !== undefined ? `: ${g.text}` : ' đoán gì đó…'}
              </span>
              {g.verdict === 'near' && (
                <span className="shrink-0 text-[13px] font-extrabold">gần đúng!</span>
              )}
            </>
          )}
        </li>
      ))}
    </ol>
  );
}

/**
 * Biển hiệu đèn chạy viền: chữ sơn tay trên bảng đỏ, viền một hàng bóng sáng đuổi nhau.
 * Đây là khoảnh khắc chuyển động chính của game — chỉ dùng ở tiêu đề và màn thắng.
 */
export function Marquee({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`relative rounded-[22px] bg-[color:var(--vd-red)] p-[20px] shadow-[0_18px_40px_-14px_rgb(0_0_0/0.8)] ${className}`}
    >
      <div aria-hidden className="vd-chase pointer-events-none absolute inset-1 rounded-[18px]" />
      <div className="relative rounded-[10px] bg-[color:var(--vd-redDeep)] px-6 py-4 text-center shadow-[inset_0_2px_10px_rgb(0_0_0/0.35)]">
        {children}
      </div>
    </div>
  );
}
