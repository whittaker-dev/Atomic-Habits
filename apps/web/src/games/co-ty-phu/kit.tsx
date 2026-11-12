'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { BOARD, GROUPS, money, TOKENS } from './data';
import { houseCost, mortgageValue } from './engine';
import { portraitOf } from './portraits';
import { characterName } from './roster';
import { DISPLAY } from './theme';

// Bộ thành phần của Cờ tỷ phú, lấy từ đồ sơn mài: tấm sơn đen viền chỉ vàng, nút son đỏ chữ vàng,
// thẻ đất như tấm thiếp sơn mài, đồng xu vàng cho từng người. Mọi màn chỉ ghép từ đây.

const TONES = {
  cinnabar:
    'bg-[color:var(--tp-cinnabar)] text-[color:var(--tp-goldHi)] shadow-[inset_0_0_0_1px_rgb(212_167_58/0.6),inset_0_-3px_0_var(--tp-cinnabarDeep)] hover:brightness-110',
  gold: 'bg-[color:var(--tp-gold)] text-[color:var(--tp-lacquer)] shadow-[inset_0_-3px_0_rgb(0_0_0/0.25)] hover:brightness-105',
  ghost:
    'bg-transparent text-[color:var(--tp-gold)] shadow-[inset_0_0_0_1px_rgb(212_167_58/0.55)] hover:bg-[color:var(--tp-lacquerHi)]',
} as const;

export function Button({
  children,
  tone = 'cinnabar',
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
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-[15px] font-bold transition-[filter,transform] active:translate-y-px disabled:pointer-events-none disabled:opacity-35 ${TONES[tone]} ${className}`}
    >
      {children}
    </button>
  );
}

/** Tấm sơn mài: nền đen ấm, viền chỉ vàng mảnh. */
export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-lg bg-[color:var(--tp-lacquerHi)] shadow-[inset_0_0_0_1px_rgb(212_167_58/0.35),0_18px_40px_-20px_rgb(0_0_0/0.9)] ${className}`}
    >
      {children}
    </div>
  );
}

/** Đồng xu màu của một người chơi. */
export function Coin({ id, size = 14 }: { id: number; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-full shadow-[inset_0_0_0_2px_rgb(212_167_58/0.9)]"
      style={{ width: size, height: size, background: TOKENS[id]!.color }}
    />
  );
}

/** Ảnh nhân vật chụp từ mô hình 3D (chụp lần đầu cần tới, sau đó lấy lại bản đã chụp). */
export function Portrait({ character, className = '' }: { character: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => setUrl(portraitOf(character)), [character]);
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- ảnh chụp tại chỗ (data URL)
    <img src={url} alt={characterName(character)} className={className} draggable={false} />
  ) : (
    <span role="img" aria-label={characterName(character)} className={`block ${className}`} />
  );
}

/** Nhân vật trong vòng tròn, viền màu người chơi. */
export function Avatar({
  character,
  id,
  size = 28,
  className = '',
}: {
  character: string;
  id: number;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`relative inline-block shrink-0 overflow-hidden rounded-full bg-[radial-gradient(circle_at_50%_35%,#3a2418,#1f1310)] ${className}`}
      style={{ width: size, height: size }}
    >
      <Portrait
        character={character}
        className="h-full w-full origin-[50%_32%] scale-[1.45] object-cover"
      />
      <span
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{ boxShadow: `inset 0 0 0 ${Math.max(2, size / 14)}px ${TOKENS[id]!.color}` }}
      />
    </span>
  );
}

const PIPS: Record<number, number[]> = {
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

/** Mặt xúc xắc ngà: chấm 1 và 4 son đỏ. */
export function DieFace({ value, size = 34 }: { value: number | null; size?: number }) {
  const on = new Set(value ? PIPS[value] : []);
  const red = value === 1 || value === 4;
  return (
    <span
      className="grid shrink-0 grid-cols-3 grid-rows-3 rounded-md bg-[color:var(--tp-eggshell)] shadow-[inset_0_-3px_0_rgb(0_0_0/0.15)]"
      style={{ width: size, height: size, padding: size * 0.14 }}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <i
          key={i}
          className="place-self-center rounded-full"
          style={{
            width: size * (value === 1 ? 0.28 : 0.18),
            height: size * (value === 1 ? 0.28 : 0.18),
            background: on.has(i) ? (red ? '#a3201a' : '#1a120e') : 'transparent',
          }}
        />
      ))}
    </span>
  );
}

/** Thẻ đất: dải màu nhóm, tên, bảng tiền thuê, giá xây nhà, giá cầm cố. */
export function DeedCard({ square, className = '' }: { square: number; className?: string }) {
  const s = BOARD[square]!;
  const band =
    s.kind === 'land' ? GROUPS[s.group]!.color : s.kind === 'station' ? '#4a3426' : '#2f3a46';
  const rows: [string, number | string][] =
    s.kind === 'land'
      ? [
          ['Nhà tranh (vừa mua)', s.rent[0]!],
          ['Nhà tranh, đủ nhóm', s.rent[0]! * 2],
          ['Cấp 1 · nhà ngói', s.rent[1]!],
          ['Cấp 2 · nhà hai tầng', s.rent[2]!],
          ['Cấp 3 · nhà phố', s.rent[3]!],
          ['Cấp 4 · nhà bốn tầng', s.rent[4]!],
          ['Khách sạn', s.rent[5]!],
        ]
      : s.kind === 'station'
        ? [
            ['Có 1 ga', 250],
            ['Có 2 ga', 500],
            ['Có 3 ga', 1000],
            ['Có 4 ga', 2000],
          ]
        : [
            ['Có 1 trạm', '40 × tổng xúc xắc'],
            ['Có 2 trạm', '100 × tổng xúc xắc'],
          ];
  return (
    <div
      className={`w-64 overflow-hidden rounded-lg bg-[color:var(--tp-eggshell)] text-[color:var(--tp-lacquer)] shadow-[0_24px_50px_-20px_rgb(0_0_0/0.9)] ${className}`}
    >
      <div className="px-4 py-3 text-center text-white" style={{ background: band }}>
        <p className="text-[11px] font-bold tracking-[0.12em] uppercase opacity-85">
          {s.kind === 'land' ? GROUPS[s.group]!.name : s.kind === 'station' ? 'Nhà ga' : 'Dịch vụ'}
        </p>
        <p className={`${DISPLAY} text-2xl leading-tight`}>{s.name}</p>
      </div>
      <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 px-4 py-3 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt>{k}</dt>
            <dd className="text-right font-bold tabular-nums">
              {typeof v === 'number' ? money(v) : v}
            </dd>
          </div>
        ))}
      </dl>
      <p className="border-t border-black/15 px-4 py-2 text-xs">
        {s.kind === 'land' && <>Mỗi lần nâng cấp {money(houseCost(square))} · </>}
        Cầm cố {money(mortgageValue(square))}
      </p>
    </div>
  );
}

/** Công tắc bật/tắt hoặc chọn một trong vài giá trị. */
export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-[color:var(--tp-ash)]">{label}</span>
      <div className="flex gap-1" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={`min-h-10 flex-1 rounded-md px-2 text-sm font-bold disabled:opacity-60 ${
              value === o.value
                ? 'bg-[color:var(--tp-gold)] text-[color:var(--tp-lacquer)]'
                : 'text-[color:var(--tp-ash)] shadow-[inset_0_0_0_1px_var(--tp-rule)] hover:text-[color:var(--tp-eggshell)]'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
