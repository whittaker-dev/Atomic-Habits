'use client';

import { useMemo, useState } from 'react';
import { CHARACTERS, characterById } from './characters';
import type { Scene } from './draw';
import type { Standing } from './engine';
import { createMap, THEMES, type ThemeId } from './map';
import { PALETTE, SEAT_COLORS } from './palette';
import { Btn, CARD, CharCanvas, DISPLAY, MapThumb } from './ui';

// Khối giao diện dùng chung cho chơi trên máy (bong-bong-bum.tsx) và phòng online (online.tsx).

export type ResultData = { standings: Standing[]; humanIds: number[]; winnerTeam: number | null };

/** Mỗi trang 8 nhân vật (4×2) để thẻ đủ to kể cả khi lưới nằm trong cột hẹp. */
const PAGE_SIZE = 8;

export function CharacterGrid({
  value,
  onPick,
  taken,
}: {
  value: string;
  onPick: (id: string) => void;
  taken?: string;
}) {
  const pages = Math.ceil(CHARACTERS.length / PAGE_SIZE);
  // Mở ra là đứng ở trang có nhân vật đang chọn.
  const [page, setPage] = useState(() =>
    Math.max(0, Math.floor(CHARACTERS.findIndex((c) => c.id === value) / PAGE_SIZE)),
  );
  const shown = CHARACTERS.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pageBtn =
    'h-9 min-w-9 rounded-lg border-[3px] border-[color:var(--bb-ink)] px-2 font-extrabold shadow-[0_3px_0_var(--bb-ink)] disabled:opacity-40';
  return (
    <div>
      <div className="grid grid-cols-4 gap-2">
        {shown.map((d) => {
          const disabled = d.id === taken;
          const on = value === d.id;
          return (
            <button
              key={d.id}
              type="button"
              disabled={disabled}
              onClick={() => onPick(d.id)}
              aria-pressed={on}
              title={d.name}
              className={`flex aspect-square flex-col overflow-hidden rounded-xl border-[3px] border-[color:var(--bb-ink)] bg-gradient-to-b from-[#7fd8f7] via-[#3f8fe0] to-[#2a4fb0] shadow-[inset_0_0_0_2px_rgba(255,255,255,0.35)] transition-transform disabled:opacity-30 ${on ? '-translate-y-1 ring-4 ring-[color:var(--bb-sun)]' : 'hover:-translate-y-0.5'}`}
            >
              {/* Thẻ luôn vuông: nhân vật co theo phần còn lại, tên tối đa 2 dòng trong ô cao cố định. */}
              <span className="flex min-h-0 flex-1 items-end justify-center bg-[radial-gradient(circle_at_50%_60%,rgba(255,255,255,0.55),transparent_62%)] px-1 pt-1">
                <CharCanvas def={d} pose={on ? 'win' : 'idle'} animate={on} fluid />
              </span>
              <span className="line-clamp-2 flex h-[2.6em] w-full shrink-0 items-center justify-center bg-[color:var(--bb-ink)] px-1 text-center text-xs font-extrabold leading-tight text-white sm:text-sm">
                {d.name}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-center gap-1.5" aria-label="Trang nhân vật">
        <button
          type="button"
          className={`${pageBtn} bg-white`}
          disabled={page === 0}
          onClick={() => setPage((p) => p - 1)}
          aria-label="Trang trước"
        >
          ‹
        </button>
        {Array.from({ length: pages }, (_, i) => (
          <button
            key={i}
            type="button"
            className={`${pageBtn} ${i === page ? 'bg-[color:var(--bb-sun)]' : 'bg-white'}`}
            aria-current={i === page ? 'page' : undefined}
            onClick={() => setPage(i)}
          >
            {i + 1}
          </button>
        ))}
        <button
          type="button"
          className={`${pageBtn} bg-white`}
          disabled={page === pages - 1}
          onClick={() => setPage((p) => p + 1)}
          aria-label="Trang sau"
        >
          ›
        </button>
      </div>
    </div>
  );
}

export function Stepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Btn
        tone="cream"
        className="px-3 py-1"
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
      >
        −
      </Btn>
      <span className={`${DISPLAY} w-8 text-center text-3xl`}>{value}</span>
      <Btn
        tone="cream"
        className="px-3 py-1"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        +
      </Btn>
    </div>
  );
}

/** Ô chọn bản đồ: mọi chủ đề + Ngẫu nhiên. `readOnly` cho máy khách xem lựa chọn của chủ phòng. */
export function MapPicker({
  value,
  onPick,
  readOnly,
}: {
  value: ThemeId | 'random';
  onPick?: (v: ThemeId | 'random') => void;
  readOnly?: boolean;
}) {
  const thumbs = useMemo(
    () =>
      THEMES.map(
        (t, i): Scene => ({
          theme: t,
          tiles: createMap(11 + i, t),
          bombs: [],
          blasts: [],
          items: [],
          players: [],
        }),
      ),
    [],
  );
  const cls = (on: boolean) =>
    `overflow-hidden rounded-xl border-[3px] border-[color:var(--bb-ink)] bg-white text-left ${on ? 'ring-4 ring-[color:var(--bb-sun)]' : readOnly ? 'opacity-40' : 'opacity-75 hover:opacity-100'}`;
  return (
    <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-7">
      {THEMES.map((t, i) => (
        <button
          key={t.id}
          type="button"
          disabled={readOnly}
          onClick={() => onPick?.(t.id)}
          aria-pressed={value === t.id}
          className={cls(value === t.id)}
        >
          <MapThumb scene={thumbs[i]!} />
          <span className="block truncate px-1.5 py-0.5 text-xs font-extrabold">{t.name}</span>
        </button>
      ))}
      <button
        type="button"
        disabled={readOnly}
        onClick={() => onPick?.('random')}
        aria-pressed={value === 'random'}
        className={`flex min-h-20 flex-col items-center justify-center ${cls(value === 'random')}`}
      >
        <span className={`${DISPLAY} text-3xl`}>?</span>
        <span className="text-xs font-extrabold">Ngẫu nhiên</span>
      </button>
    </div>
  );
}

export function ResultScreen({
  outcome,
  teams,
  onAgain,
  onHome,
  homeLabel = 'Về sảnh',
}: {
  outcome: ResultData;
  teams: boolean;
  onAgain?: () => void;
  onHome: () => void;
  homeLabel?: string;
}) {
  const { standings, humanIds, winnerTeam } = outcome;
  const humanWon = standings.some((s) => s.won && humanIds.includes(s.player.id));
  const hero = standings.find((s) => s.won) ?? standings[0]!;
  const title = winnerTeam === null ? 'Hoà!' : humanWon ? 'Chiến thắng!' : 'Thua rồi!';
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-4">
      <p
        className={`${DISPLAY} text-6xl font-extrabold [-webkit-text-stroke:3px_var(--bb-ink)] [paint-order:stroke_fill] ${humanWon ? 'text-[color:var(--bb-sun)]' : 'text-white'}`}
        style={{ textShadow: `0 5px 0 ${PALETTE.ink}` }}
      >
        {title}
      </p>
      <CharCanvas
        def={characterById(hero.player.charId)}
        pose={winnerTeam === null ? 'idle' : 'win'}
        size={110}
      />
      <p className="font-extrabold">
        {winnerTeam === null
          ? 'Không ai trụ lại tới cuối.'
          : teams
            ? `Đội ${winnerTeam === 0 ? 'Xanh' : 'Đỏ'} thắng!`
            : `${hero.player.name} là người cuối cùng còn trụ!`}
      </p>
      <div className={`${CARD} w-full overflow-x-auto`}>
        <table className="w-full text-left text-sm font-bold">
          <thead className="bg-[color:var(--bb-ink)] text-white">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Người chơi</th>
              <th className="px-3 py-2 text-right">Đã hạ</th>
              <th className="px-3 py-2 text-right">Vật phẩm</th>
              <th className="px-3 py-2 text-right">Điểm</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((r) => (
              <tr key={r.player.id} className={r.won ? 'bg-[#fff1b8]' : 'odd:bg-white/60'}>
                <td className={`${DISPLAY} px-3 py-1 text-xl`}>{r.rank}</td>
                <td className="px-3 py-1">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full border-2 border-[color:var(--bb-ink)]"
                      style={{ background: SEAT_COLORS[r.player.id] }}
                    />
                    <span className="truncate">{r.player.name}</span>
                    {humanIds.includes(r.player.id) && (
                      <span className="text-slate-500">(bạn)</span>
                    )}
                  </span>
                </td>
                <td className="px-3 py-1 text-right tabular-nums">{r.player.kos}</td>
                <td className="px-3 py-1 text-right tabular-nums">{r.player.items}</td>
                <td className="px-3 py-1 text-right tabular-nums">{r.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-3">
        {onAgain && (
          <Btn tone="sun" className="px-8 text-xl" onClick={onAgain}>
            Chơi lại
          </Btn>
        )}
        <Btn tone="sky" className="text-xl" onClick={onHome}>
          {homeLabel}
        </Btn>
      </div>
    </div>
  );
}
