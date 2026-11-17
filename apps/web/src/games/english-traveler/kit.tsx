'use client';

import type { ReactNode } from 'react';
import type { City } from './data';
import { DISPLAY, MONO, PALETTE, STAMP_INKS } from './theme';

// Bộ thành phần của English Traveler: nút, viền thư máy bay, máy bay, con dấu nhập cảnh. Mọi màn chỉ
// ghép từ đây và màn chơi chung (du-lich/run.tsx).

const TONES = {
  primary:
    'bg-[color:var(--dl-accent)] text-white shadow-[0_4px_0_var(--dl-accentDeep)] hover:brightness-110',
  red: 'bg-[color:var(--dl-airRed)] text-white shadow-[0_4px_0_#8f1d19] hover:brightness-110',
  ghost:
    'bg-[color:var(--dl-tile)] text-[color:var(--dl-ink)] shadow-[inset_0_0_0_1.5px_var(--dl-line),0_3px_0_var(--dl-line)] hover:bg-white',
} as const;

export function Button({
  children,
  tone = 'primary',
  onClick,
  className = '',
}: {
  children: ReactNode;
  tone?: keyof typeof TONES;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${DISPLAY} inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--dl-r)] px-5 text-[1.05rem] transition-[filter,transform,background-color] active:translate-y-0.5 active:shadow-none ${TONES[tone]} ${className}`}
    >
      {children}
    </button>
  );
}

/** Dải viền thư máy bay: sọc chéo đỏ – trắng – lam. */
export function Airmail({ className = 'h-2' }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={className}
      style={{
        backgroundImage: `repeating-linear-gradient(-45deg, ${PALETTE.airRed} 0 14px, #fff 14px 22px, ${PALETTE.accent} 22px 36px, #fff 36px 44px)`,
      }}
    />
  );
}

export function Plane({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M21.5 12c0-.8-.7-1.4-1.6-1.4h-5.3L9.9 3.2H7.8l2.3 7.4H5.6L3.9 8.3H2.3l1 3.7-1 3.7h1.6l1.7-2.3h4.5l-2.3 7.4h2.1l4.7-7.4h5.3c.9 0 1.6-.6 1.6-1.4Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Con dấu nhập cảnh của một thành phố: khung chữ nhật bo góc viền đôi, chữ ARRIVED, tên thành phố,
 * mã sân bay và số thứ tự chặng, nghiêng nhẹ như đóng tay; mực loang không đều nhờ mặt nạ nhiễu
 * (lớp .et-ink ở english-traveler.tsx).
 */
export function Stamp({
  city,
  index,
  size = 'md',
}: {
  city: City;
  index: number;
  size?: 'sm' | 'md' | 'lg';
}) {
  const ink = STAMP_INKS[index % STAMP_INKS.length]!;
  const tilt = [-7, 5, -3, 8, -5, 3, -8, 6][index % 8]!;
  const text = {
    sm: ['text-[0.5rem]', 'text-sm', 'text-[0.55rem]'],
    md: ['text-[0.6rem]', 'text-lg', 'text-[0.65rem]'],
    lg: ['text-sm', 'text-4xl', 'text-base'],
  }[size];
  return (
    <div
      className="et-ink flex aspect-[4/3] w-full p-1.5"
      style={{ color: ink, rotate: `${tilt}deg` }}
    >
      <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-lg border-[3px] border-current px-2 shadow-[0_0_0_2px_var(--dl-card),0_0_0_4px_currentColor]">
        <span className={`${MONO} ${text[0]} opacity-80`}>Arrived</span>
        <span className={`${DISPLAY} ${text[1]} uppercase leading-none`}>{city.name}</span>
        <span className={`${MONO} ${text[2]}`}>
          {city.code} · No.{String(index + 1).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
}
