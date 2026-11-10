'use client';

import type { ReactNode } from 'react';
import type { House } from './board';
import { CHAMFER, DISPLAY, HOUSES } from './theme';

// Bộ thành phần của Cờ cá ngựa, lấy từ chiến trường: tấm giáp sắt vát góc, nút như lưỡi đao,
// cờ đuôi nheo cho từng nhà, xúc xắc xương. Mọi màn hình chỉ ghép từ đây để cùng một giọng.

const TONES = {
  ember:
    'bg-[color:var(--cc-ember)] text-[color:var(--cc-night)] shadow-[inset_0_-4px_0_var(--cc-emberDeep)] hover:brightness-110',
  steel:
    'bg-[color:var(--cc-stoneHi)] text-[color:var(--cc-bone)] shadow-[inset_0_0_0_1px_var(--cc-iron)] hover:brightness-125',
} as const;

/** Chữ trên nền màu nhà: lục và vàng đủ sáng để chữ sẫm dễ đọc hơn chữ trắng (trắng trên lục chỉ 2,4:1). */
export const onHouse = (h: House) => (h === 1 || h === 2 ? 'var(--cc-night)' : '#ffffff');

export function Button({
  children,
  tone = 'ember',
  house,
  onClick,
  disabled,
  className = '',
  type = 'button',
}: {
  children: ReactNode;
  tone?: keyof typeof TONES;
  /** Tô nút bằng màu cờ của một nhà (nút Đổ của người đang đi). */
  house?: House;
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
      className={`${DISPLAY} ${CHAMFER} inline-flex min-h-12 items-center justify-center gap-2 px-6 text-xl leading-none transition-[filter,transform] active:translate-y-px disabled:pointer-events-none disabled:opacity-35 ${
        house === undefined
          ? TONES[tone]
          : 'shadow-[inset_0_-4px_0_rgb(0_0_0/0.3)] hover:brightness-110'
      } ${className}`}
      style={
        house === undefined ? undefined : { background: HOUSES[house].hex, color: onHouse(house) }
      }
    >
      {children}
    </button>
  );
}

/** Tấm giáp: khung chứa mặc định, sắt sẫm viền mảnh, vát hai góc. */
export function Plate({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`${CHAMFER} bg-[color:var(--cc-stone)] shadow-[inset_0_0_0_1px_var(--cc-iron)] ${className}`}
    >
      {children}
    </div>
  );
}

/** Cờ đuôi nheo màu một nhà trên cán sắt. */
export function Banner({ house, size = 28 }: { house: House; size?: number }) {
  const h = HOUSES[house];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="shrink-0">
      <rect x="3" y="2" width="2" height="21" fill="#9aa2ab" />
      <path d="M5 3h16l-4 5.5 4 5.5H5z" fill={h.hex} stroke={h.deep} strokeWidth="1" />
      <path
        d="M9 6l2.5 2.5L9 11"
        fill="none"
        stroke={house === 2 ? '#0e1013' : '#ffffff'}
        strokeWidth="1.6"
      />
    </svg>
  );
}

/** Chấm xúc xắc theo vị trí trên lưới 3×3. */
const PIPS: Record<number, number[]> = {
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

/** Mặt xúc xắc xương: chấm khắc sẫm, chấm 1 và 4 đỏ như xúc xắc ta. */
export function DieFace({ value, size = 56 }: { value: number | null; size?: number }) {
  const on = new Set(value ? PIPS[value] : []);
  const red = value === 1 || value === 4;
  const pip = size * (value === 1 ? 0.3 : 0.17);
  return (
    <span
      role="img"
      aria-label={value ? `Xúc xắc: ${value}` : 'Chưa đổ'}
      className="grid shrink-0 grid-cols-3 grid-rows-3 rounded-[9px] bg-[#e6dfd2] shadow-[inset_0_-5px_0_rgb(60_40_20/0.25),0_8px_18px_-8px_rgb(0_0_0/0.8)]"
      style={{ width: size, height: size, padding: size * 0.14 }}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <i
          key={i}
          className="place-self-center rounded-full"
          style={{
            width: pip,
            height: pip,
            background: on.has(i) ? (red ? '#c1121f' : '#1a1a1a') : 'transparent',
          }}
        />
      ))}
    </span>
  );
}

/** Công tắc bật/tắt một luật. */
export function Toggle({
  label,
  hint,
  on,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  on: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 py-2 has-[:disabled]:cursor-default">
      <span className="flex flex-col">
        <span className="font-bold">{label}</span>
        {hint && <span className="text-sm text-[color:var(--cc-ash)]">{hint}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={on}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="relative h-7 w-12 shrink-0 bg-[color:var(--cc-iron)] transition-colors peer-checked:bg-[color:var(--cc-ember)] peer-focus-visible:ring-2 peer-focus-visible:ring-[color:var(--cc-bone)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[color:var(--cc-night)] peer-disabled:opacity-50 after:absolute after:top-1 after:left-1 after:h-5 after:w-5 after:bg-[color:var(--cc-bone)] after:transition-transform peer-checked:after:translate-x-5"
      />
    </label>
  );
}
