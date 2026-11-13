'use client';

import type { ReactNode } from 'react';
import { FORMS } from './forms';
import { DISPLAY } from './theme';

// Bộ thành phần của Bắn Bi Bá Khí: tấm kính tối viền sáng mảnh, nút khí xanh lơ góc vát, thanh
// nạp khí sáu đốt. Mọi màn chỉ ghép từ đây.

// Góc vát chéo hai đầu như tấm bảng điểm võ đài.
const CUT =
  '[clip-path:polygon(10px_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%,0_10px)]';

const TONES = {
  ki: 'bg-[color:var(--bb-ki)] text-[color:var(--bb-night)] hover:brightness-110',
  rage: 'bg-[color:var(--bb-rage)] text-white hover:brightness-110',
  ghost:
    'bg-[#ffffff0d] text-[color:var(--bb-text)] shadow-[inset_0_0_0_1px_var(--bb-line)] hover:bg-[#ffffff1a]',
} as const;

export function Button({
  children,
  tone = 'ki',
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
      className={`${CUT} ${DISPLAY} inline-flex min-h-12 items-center justify-center gap-2 px-5 text-base tracking-wider transition-[filter,background-color] active:translate-y-px disabled:pointer-events-none disabled:opacity-40 ${TONES[tone]} ${className}`}
    >
      {children}
    </button>
  );
}

/** Tấm kính tối, viền sáng mảnh. */
export function Glass({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl bg-[#151127e6] shadow-[inset_0_0_0_1px_var(--bb-line),0_20px_40px_-24px_rgb(0_0_0/0.9)] backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  );
}

/** Thanh khí sáu đốt: các đốt đã qua sáng màu dạng của nó, đốt hiện tại nạp theo `progress`. */
export function KiBar({ level, progress }: { level: number; progress: number }) {
  return (
    <div
      className="flex gap-1"
      role="meter"
      aria-valuemin={1}
      aria-valuemax={6}
      aria-valuenow={level + 1}
      aria-label="Cấp khí"
    >
      {FORMS.map((f, i) => (
        <span
          key={f.name}
          className="relative h-2.5 flex-1 overflow-hidden rounded-sm bg-[#ffffff14]"
        >
          <span
            className="absolute inset-y-0 left-0 rounded-sm transition-[width] duration-150"
            style={{
              width: i < level ? '100%' : i === level ? `${Math.round(progress * 100)}%` : '0%',
              background: f.aura,
              boxShadow: i <= level ? `0 0 10px ${f.aura}` : undefined,
            }}
          />
        </span>
      ))}
    </div>
  );
}
