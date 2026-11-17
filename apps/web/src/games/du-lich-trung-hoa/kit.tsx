'use client';

import type { ReactNode } from 'react';
import type { City } from './data';
import { DISPLAY, HANZI } from './theme';

// Bộ thành phần của Du lịch Trung Hoa: nút, đoàn tàu, con dấu son của từng ga, đường ray. Mọi màn chỉ
// ghép từ đây và màn chơi chung (du-lich/run.tsx).

const TONES = {
  jade: 'bg-[color:var(--dl-accent)] text-white shadow-[0_4px_0_var(--dl-accentDeep)] hover:brightness-110',
  seal: 'bg-[color:var(--dl-seal)] text-white shadow-[0_4px_0_var(--dl-sealDeep)] hover:brightness-110',
  ghost:
    'bg-[color:var(--dl-tile)] text-[color:var(--dl-ink)] shadow-[inset_0_0_0_1.5px_var(--dl-line),0_3px_0_var(--dl-line)] hover:bg-white',
} as const;

export function Button({
  children,
  tone = 'jade',
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

/** Đoàn tàu cao tốc nhìn ngang: đầu thuôn, dải cửa sổ, hai bánh. */
export function Train({ className = 'h-6 w-10' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 20" className={className} aria-hidden>
      <path
        d="M2 15V7.5C2 5.6 3.6 4 5.5 4H27c6 0 10.5 4.2 11 9.5.1.8-.5 1.5-1.3 1.5Z"
        fill="currentColor"
      />
      <path
        d="M6 7.5h4.5v3.5H6zM13 7.5h4.5v3.5H13zM20 7.5h4.5v3.5H20zM27 7.5h3c2.6 0 4.8 1.5 5.6 3.5H27z"
        fill="#fbf7ee"
      />
      <path d="M2 13h36" stroke="#c23a22" strokeWidth="1.4" />
      <circle cx="9" cy="17" r="1.8" fill="currentColor" />
      <circle cx="30" cy="17" r="1.8" fill="currentColor" />
    </svg>
  );
}

/**
 * Con dấu son của một ga: ô vuông đỏ son, hai chữ Hán tên thành phố khắc trắng (kiểu ấn âm văn), viền
 * trong mảnh; mực không đều nhờ mặt nạ nhiễu (lớp .zh-ink ở du-lich-trung-hoa.tsx), nghiêng nhẹ. Chữ
 * xếp ngang trái sang phải chứ không theo lối ấn cổ (cột phải đọc trước), để người mới học không đọc
 * ngược tên thành phố.
 */
export function Seal({
  city,
  index,
  size = 'md',
}: {
  city: City;
  index: number;
  size?: 'sm' | 'md' | 'lg';
}) {
  const box = { sm: 'h-16 w-16 text-2xl', md: 'h-24 w-24 text-4xl', lg: 'h-40 w-40 text-6xl' }[
    size
  ];
  const tilt = [-4, 3, -2, 5, -3, 2, -5, 4][index % 8]!;
  return (
    <div
      className={`zh-ink ${box} flex shrink-0 items-center justify-center rounded-[14%] bg-[color:var(--dl-seal)] p-[7%]`}
      style={{ rotate: `${tilt}deg` }}
      aria-label={`Dấu ga ${city.vi}`}
    >
      <div className="flex h-full w-full flex-col items-center justify-center rounded-[10%] shadow-[inset_0_0_0_2px_#fbf7ee]">
        <span className={`${HANZI} leading-none text-[#fbf7ee]`}>{city.name}</span>
      </div>
    </div>
  );
}

/** Đường ray ngang có tà vẹt, dùng làm thanh tiến độ ở màn loading. */
export function Rail({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`h-3 ${className}`}
      style={{
        backgroundImage:
          'linear-gradient(var(--dl-ink),var(--dl-ink)),linear-gradient(var(--dl-ink),var(--dl-ink)),repeating-linear-gradient(90deg,var(--dl-line) 0 3px,transparent 3px 12px)',
        backgroundSize: '100% 2px,100% 2px,100% 100%',
        backgroundPosition: '0 1px,0 calc(100% - 1px),0 0',
        backgroundRepeat: 'no-repeat',
      }}
    />
  );
}
