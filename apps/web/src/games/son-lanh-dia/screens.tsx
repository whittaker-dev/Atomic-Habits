'use client';

/* eslint-disable @next/next/no-img-element -- ảnh nhân vật tĩnh, cỡ nhỏ, không cần tối ưu của next/image */
import { useEffect, useRef } from 'react';
import { Btn, CARD, DISPLAY } from '../bong-bong-bum/ui';
import { ARENAS, propAt, type Arena, type ArenaId, type Prop } from './arenas';
import type { Difficulty } from './bot';
import type { MatchOutcome } from './match';
import { SQUAD, squadImage, teamColors } from './squad';

// Mảnh giao diện dùng chung giữa chơi trên máy (son-lanh-dia.tsx) và phòng online (online.tsx).

export const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: 'easy', label: 'Dễ' },
  { id: 'medium', label: 'Vừa' },
  { id: 'hard', label: 'Khó' },
];

/** Tên game viết to, viền mực dày: dùng ở sảnh và màn loading cho hai màn liền mạch. */
export function Title() {
  return (
    <h1
      className={`${DISPLAY} text-center text-5xl leading-none text-[color:var(--bb-sun)] [-webkit-text-stroke:4px_var(--bb-ink)] [paint-order:stroke_fill] [text-shadow:0_6px_0_var(--bb-ink)] sm:text-6xl`}
    >
      Sơn Lãnh Địa
    </h1>
  );
}

/**
 * Chân dung nhân vật (ảnh render mặt trước). `win`: ảnh nhảy nhẹ cho người thắng trên bục.
 * `alt` để trống khi tên nhân vật đã nằm ngay cạnh ảnh.
 */
export function SquadImg({
  id,
  pose = 'idle',
  className = '',
  alt = '',
}: {
  id: string;
  pose?: 'idle' | 'win';
  className?: string;
  alt?: string;
}) {
  return (
    <img
      src={squadImage(id)}
      alt={alt}
      draggable={false}
      className={`pointer-events-none select-none object-contain ${pose === 'win' ? 'animate-bounce' : ''} ${className}`}
    />
  );
}

export function SquadGrid({
  value,
  onPick,
  taken,
}: {
  value: string;
  onPick: (id: string) => void;
  /** Nhân vật người khác đã chọn: không chọn trùng được. */
  taken?: readonly string[];
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {SQUAD.map((d) => {
        const on = value === d.id;
        return (
          <button
            key={d.id}
            type="button"
            disabled={taken?.includes(d.id)}
            onClick={() => onPick(d.id)}
            aria-pressed={on}
            className={`flex aspect-[4/5] flex-col overflow-hidden rounded-xl border-[3px] border-[color:var(--bb-ink)] bg-white transition-transform disabled:opacity-30 ${on ? '-translate-y-1 ring-4 ring-[color:var(--bb-sun)]' : 'hover:-translate-y-0.5'}`}
            style={{
              background: `radial-gradient(circle at 50% 60%, #ffffff 0%, ${d.color}55 75%)`,
            }}
          >
            <span className="flex min-h-0 flex-1 items-end justify-center px-1 pt-1">
              <SquadImg id={d.id} className="h-full w-full" />
            </span>
            <span
              className="flex h-7 w-full shrink-0 items-center justify-center text-sm font-extrabold text-[color:var(--bb-ink)]"
              style={{ background: d.color }}
            >
              {d.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export const PROP_COLOR: Record<Prop, string> = {
  crate: '#c98a4b',
  pillar: '#9aa3b2',
  wall: '#7d8698',
  pool: '#35b4ef',
};

/** Ảnh nhỏ nhìn từ trên xuống của một sân: sàn gạch sáng, vật cản theo màu của nó. */
export function ArenaThumb({ arena }: { arena: Arena }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current?.getContext('2d');
    if (!c) return;
    const s = 10;
    c.fillStyle = '#566074';
    c.fillRect(0, 0, 17 * s, 15 * s);
    arena.rows.forEach((row, y) =>
      [...row].forEach((_, x) => {
        const prop = propAt(arena, x, y);
        c.fillStyle = prop ? PROP_COLOR[prop] : (x + y) % 2 ? '#dfe3ea' : '#d3d8e0';
        c.fillRect((x + 1) * s, (y + 1) * s, s, s);
      }),
    );
  }, [arena]);
  return <canvas ref={ref} width={170} height={150} className="block w-full" />;
}

export function ArenaPicker({
  value,
  onPick,
}: {
  value: ArenaId | 'random';
  onPick: (v: ArenaId | 'random') => void;
}) {
  const cls = (on: boolean) =>
    `overflow-hidden rounded-xl border-[3px] border-[color:var(--bb-ink)] bg-white text-left ${on ? 'ring-4 ring-[color:var(--bb-sun)]' : 'opacity-75 hover:opacity-100'}`;
  return (
    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
      {ARENAS.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => onPick(a.id)}
          aria-pressed={value === a.id}
          className={cls(value === a.id)}
        >
          <ArenaThumb arena={a} />
          <span className="block truncate px-1.5 py-0.5 text-xs font-extrabold">{a.name}</span>
        </button>
      ))}
      <button
        type="button"
        onClick={() => onPick('random')}
        aria-pressed={value === 'random'}
        className={`flex min-h-20 flex-col items-center justify-center ${cls(value === 'random')}`}
      >
        <span className={`${DISPLAY} text-3xl`}>?</span>
        <span className="text-xs font-extrabold">Ngẫu nhiên</span>
      </button>
    </div>
  );
}

const PODIUM = [
  { place: 2, height: 'h-16' },
  { place: 1, height: 'h-24' },
  { place: 3, height: 'h-10' },
];

export function ResultScreen({
  outcome,
  teams,
  onAgain,
  onSetup,
  setupLabel = 'Đổi cài đặt',
}: {
  outcome: MatchOutcome;
  teams: boolean;
  /** Không truyền thì ẩn nút "Chơi lại" (khách trong phòng online chờ chủ phòng bắt đầu). */
  onAgain?: () => void;
  onSetup: () => void;
  setupLabel?: string;
}) {
  const { standings, humanIds, winnerTeam } = outcome;
  const colors = teamColors({ teams, players: standings.map((s) => s.player) });
  const humanWon = standings.some((s) => s.won && humanIds.includes(s.player.id));
  const headline = winnerTeam === null ? 'Hoà!' : humanWon ? 'Lãnh địa của bạn!' : 'Thua rồi!';
  // Mỗi phe một khúc trên thanh lãnh địa: chơi hai đội thì gộp hai người cùng đội.
  const byTeam = [...new Map(standings.map((s) => [s.player.team, s])).values()];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h2
        className={`${DISPLAY} text-center text-5xl text-[color:var(--bb-sun)] [-webkit-text-stroke:3px_var(--bb-ink)] [paint-order:stroke_fill]`}
      >
        {headline}
      </h2>

      <section className={`${CARD} p-4`} aria-label="Bục trao giải">
        <div className="flex items-end justify-center gap-3">
          {PODIUM.map(({ place, height }) => {
            const s = standings[place - 1];
            if (!s) return <div key={place} className="w-24" />;
            return (
              <div key={place} className="flex w-24 flex-col items-center">
                <SquadImg
                  id={s.player.charId}
                  pose={place === 1 && s.won ? 'win' : 'idle'}
                  className={place === 1 ? 'h-28' : 'h-24'}
                />
                <p className="w-full truncate text-center text-xs font-extrabold">
                  {s.player.name}
                </p>
                <div
                  className={`${height} mt-1 flex w-full items-start justify-center rounded-t-lg border-[3px] border-[color:var(--bb-ink)] pt-1`}
                  style={{ background: colors[s.player.team] }}
                >
                  <span className={`${DISPLAY} text-2xl`}>{place}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className={`${CARD} p-4`} aria-label="Lãnh địa">
        <div className="flex h-8 overflow-hidden rounded-full border-[3px] border-[color:var(--bb-ink)] bg-white">
          {byTeam.map((s) => (
            <span
              key={s.player.team}
              className="flex items-center justify-center text-xs font-extrabold"
              style={{ width: `${s.share * 100}%`, background: colors[s.player.team] }}
            >
              {s.share >= 0.06 && `${Math.round(s.share * 100)}%`}
            </span>
          ))}
        </div>
        <ol className="mt-3 flex flex-col gap-1.5">
          {standings.map((s) => (
            <li
              key={s.player.id}
              className="flex items-center gap-2 rounded-xl border-[3px] border-[color:var(--bb-ink)] bg-white px-2 py-1 text-sm font-bold"
            >
              <span className={`${DISPLAY} w-6 text-center text-xl`}>{s.rank}</span>
              <span
                className="h-3 w-3 shrink-0 rounded-full border-2 border-[color:var(--bb-ink)]"
                style={{ background: colors[s.player.team] }}
              />
              <span className="min-w-0 flex-1 truncate">
                {s.player.name}
                {humanIds.includes(s.player.id) && <span className="text-slate-500"> (bạn)</span>}
              </span>
              <span className="text-xs text-slate-600">
                sơn {s.player.painted} ô · trúng {s.player.hits}
              </span>
              {!teams && (
                <span className="w-12 text-right font-extrabold tabular-nums">
                  {Math.round(s.share * 100)}%
                </span>
              )}
            </li>
          ))}
        </ol>
      </section>

      <div className={`grid gap-3 ${onAgain ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {onAgain && (
          <Btn tone="sun" className="py-3 text-xl" onClick={onAgain}>
            Chơi lại
          </Btn>
        )}
        <Btn tone="cream" className="py-3 text-xl" onClick={onSetup}>
          {setupLabel}
        </Btn>
      </div>
    </div>
  );
}
