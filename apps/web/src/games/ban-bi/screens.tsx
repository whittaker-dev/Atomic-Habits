'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { cleanName, NAME_MAX, nameError } from '../bong-bong-bum/name';
import { LEVELS } from './engine';
import { FORMS } from './forms';
import { Button, Glass } from './kit';
import { formatMs, scoresOf, TOP, type Score } from './scores';
import { DISPLAY } from './theme';

// Màn ngoài trận của Bắn Bi Bá Khí: vào game (tên, chọn màn, cách chơi), bảng xếp hạng từng màn và
// màn kết quả. Màn đấu nằm ở arena.tsx.

const field =
  'min-h-12 w-full rounded-lg bg-[#0a0814] px-4 text-base font-semibold text-[color:var(--bb-text)] shadow-[inset_0_0_0_1px_var(--bb-line)] placeholder:text-[color:var(--bb-muted)] focus:shadow-[inset_0_0_0_2px_var(--bb-ki)] focus:outline-none';

/** Sáu chấm màu dạng khí, dùng làm hoạ tiết tiêu đề. */
const FormDots = () => (
  <span className="flex gap-1.5" aria-hidden>
    {FORMS.map((f) => (
      <i
        key={f.name}
        className="h-2.5 w-6 rounded-sm"
        style={{ background: f.aura, boxShadow: `0 0 10px ${f.aura}` }}
      />
    ))}
  </span>
);

export function Leaderboard({ level, highlight }: { level: string; highlight?: number | null }) {
  const [rows, setRows] = useState<Score[]>([]);
  useEffect(() => setRows(scoresOf(level)), [level, highlight]);
  if (!rows.length)
    return (
      <p className="py-4 text-center text-sm text-[color:var(--bb-muted)]">
        Chưa ai phá sạch màn này. Bạn là người đầu tiên?
      </p>
    );
  return (
    <ol className="flex flex-col gap-1" aria-label={`Top ${TOP}`}>
      {rows.map((s, i) => (
        <li
          key={`${s.at}-${i}`}
          className={`flex min-h-10 items-center gap-3 rounded-lg px-3 ${
            highlight === i + 1
              ? 'bg-[#38e8ff26] shadow-[inset_0_0_0_1px_var(--bb-ki)]'
              : i % 2
                ? ''
                : 'bg-[#ffffff08]'
          }`}
        >
          <span
            className={`${DISPLAY} w-6 text-lg ${i < 3 ? 'text-[color:var(--bb-ki)]' : 'text-[color:var(--bb-muted)]'}`}
          >
            {i + 1}
          </span>
          <span className="min-w-0 flex-1 truncate font-semibold">{s.name}</span>
          <span
            className="hidden text-xs font-semibold sm:inline"
            style={{ color: FORMS[s.peak]!.aura }}
            title="Dạng khí cao nhất đạt được"
          >
            {FORMS[s.peak]!.name}
          </span>
          <span className={`${DISPLAY} text-lg tabular-nums`}>{formatMs(s.ms)}</span>
        </li>
      ))}
    </ol>
  );
}

function LevelTabs({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div className="flex gap-1" role="tablist" aria-label="Màn">
      {LEVELS.map((l) => (
        <button
          key={l.id}
          type="button"
          role="tab"
          aria-selected={value === l.id}
          onClick={() => onChange(l.id)}
          className={`${DISPLAY} min-h-10 flex-1 rounded-lg text-sm tracking-wider ${
            value === l.id
              ? 'bg-[color:var(--bb-ki)] text-[color:var(--bb-night)]'
              : 'text-[color:var(--bb-muted)] shadow-[inset_0_0_0_1px_var(--bb-line)] hover:text-[color:var(--bb-text)]'
          }`}
        >
          {l.name}
        </button>
      ))}
    </div>
  );
}

const Step = ({ n, children }: { n: number; children: ReactNode }) => (
  <li className="flex gap-3">
    <span
      className={`${DISPLAY} flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#38e8ff1f] text-[color:var(--bb-ki)]`}
    >
      {n}
    </span>
    <span className="text-[color:var(--bb-muted)]">{children}</span>
  </li>
);

export function HomeScreen({
  name,
  onName,
  level,
  onLevel,
  onStart,
}: {
  name: string;
  onName: (n: string) => void;
  level: string;
  onLevel: (id: string) => void;
  onStart: () => void;
}) {
  const [draft, setDraft] = useState(name);
  const [tried, setTried] = useState(false);
  useEffect(() => setDraft(name), [name]);
  const err = nameError(draft);
  const lv = LEVELS.find((l) => l.id === level)!;
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-8 md:grid-cols-[1.1fr_1fr] md:gap-12">
      <div className="flex flex-col gap-7">
        <div className="flex flex-col gap-3">
          <FormDots />
          <h1
            className={`${DISPLAY} text-[56px] leading-[0.9] text-[color:var(--bb-text)] md:text-[76px]`}
          >
            Bắn Bi
            <br />
            <span className="text-[color:var(--bb-ki)] [text-shadow:0_0_30px_rgb(56_232_255/0.6)]">
              Bá Khí
            </span>
          </h1>
          <p className="max-w-md text-lg text-[color:var(--bb-muted)]">
            Bắn cho ba bi cùng màu chạm nhau là nổ. Phá càng lẹ, võ sĩ càng nạp khí, qua sáu cấp
            biến hình. Phá sạch bàn nhanh nhất thì lên bảng.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="bb-name" className="text-sm font-semibold text-[color:var(--bb-muted)]">
            Tên trên bảng xếp hạng
          </label>
          <input
            id="bb-name"
            value={draft}
            maxLength={NAME_MAX}
            autoComplete="nickname"
            onChange={(e) => setDraft(e.target.value)}
            placeholder="VD: Tiểu Long"
            className={field}
            aria-invalid={tried && !!err}
          />
          {tried && err && (
            <p className="text-sm font-semibold text-[color:var(--bb-rage)]">{err}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-[color:var(--bb-muted)]">Màn</span>
          <LevelTabs value={level} onChange={onLevel} />
          <p className="text-sm text-[color:var(--bb-muted)]">
            {lv.rows} hàng bi, {lv.colors} màu, cứ {lv.dropEvery} phát thêm một hàng bi từ trên. Ai
            chơi màn này cũng gặp cùng thế bi.
          </p>
        </div>

        <Button
          className="w-full text-lg"
          onClick={() => {
            setTried(true);
            if (err) return;
            onName(cleanName(draft));
            onStart();
          }}
        >
          Vào trận · Màn {lv.name}
        </Button>

        <ol className="flex flex-col gap-2 text-sm">
          <Step n={1}>Rê chuột hay kéo ngón tay để ngắm; bi dội được vào tường hai bên.</Step>
          <Step n={2}>
            Bấm hoặc nhấc tay để bắn. Chạm vào bi nhỏ bên trái bệ (hoặc phím X) để đổi bi.
          </Step>
          <Step n={3}>Nổ liên tục để giữ khí; ngừng lâu khí tản và võ sĩ tụt cấp.</Step>
        </ol>
      </div>

      <Glass className="flex flex-col gap-4 p-4 md:p-5">
        <div className="flex items-baseline justify-between">
          <h2 className={`${DISPLAY} text-xl text-[color:var(--bb-text)]`}>Bảng xếp hạng</h2>
          <span className="text-xs text-[color:var(--bb-muted)]">Top {TOP} trên máy này</span>
        </div>
        <LevelTabs value={level} onChange={onLevel} />
        <Leaderboard level={level} />
      </Glass>
    </div>
  );
}

export function ResultScreen({
  level,
  won,
  ms,
  peak,
  rank,
  onAgain,
  onHome,
}: {
  level: string;
  won: boolean;
  ms: number;
  peak: number;
  rank: number | null;
  onAgain: () => void;
  onHome: () => void;
}) {
  const lv = LEVELS.find((l) => l.id === level)!;
  const form = FORMS[peak]!;
  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6 md:grid-cols-2">
      <Glass className="flex flex-col gap-4 p-6">
        <p className="text-sm font-semibold tracking-[0.2em] text-[color:var(--bb-muted)] uppercase">
          Màn {lv.name}
        </p>
        {won ? (
          <>
            <p
              className={`${DISPLAY} text-6xl leading-none tabular-nums text-[color:var(--bb-ki)] [text-shadow:0_0_24px_rgb(56_232_255/0.5)]`}
            >
              {formatMs(ms)}
            </p>
            <p className="text-lg font-semibold">
              {rank
                ? rank === 1
                  ? 'Kỷ lục mới của máy này!'
                  : `Hạng ${rank} trên bảng.`
                : 'Chưa lọt top 10, thử lại nhé.'}
            </p>
          </>
        ) : (
          <>
            <p className={`${DISPLAY} text-5xl leading-none text-[color:var(--bb-rage)]`}>
              Bi chạm vạch
            </p>
            <p className="text-lg text-[color:var(--bb-muted)]">
              Chưa phá sạch bàn nên chưa tính giờ.
            </p>
          </>
        )}
        <p className="text-sm text-[color:var(--bb-muted)]">
          Dạng khí cao nhất:{' '}
          <b style={{ color: form.aura, textShadow: `0 0 12px ${form.aura}` }}>
            Cấp {peak + 1} · {form.name}
          </b>
        </p>
        <div className="mt-2 flex flex-col gap-2">
          <Button onClick={onAgain}>Đấu lại màn {lv.name}</Button>
          <Button tone="ghost" onClick={onHome}>
            Về màn chính
          </Button>
        </div>
      </Glass>
      <Glass className="flex flex-col gap-4 p-5">
        <h2 className={`${DISPLAY} text-xl`}>Bảng xếp hạng · {lv.name}</h2>
        <Leaderboard level={level} highlight={rank} />
      </Glass>
    </div>
  );
}
