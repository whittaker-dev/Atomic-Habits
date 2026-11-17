'use client';

import { useEffect, useRef } from 'react';
import { HEARTS, LEG, type Topic } from '../du-lich/dictation';
import { IconBook, IconSound } from '../du-lich/icons';
import { History, type Summary } from '../du-lich/run';
import { CITIES, TOPICS, type City } from './data';
import { Button, Seal, Train } from './kit';
import { BRUSH, DISPLAY, HANZI } from './theme';

// Các màn của Du lịch Trung Hoa ngoài màn chơi chung: màn chính (vé tàu, chọn chủ đề, tuyến tàu tám
// ga), màn tới ga sau mỗi chặng (đóng dấu son) và màn hết chuyến (điểm, các con dấu, ôn lại).

/** Ga đích của chặng `leg` (đi hết tuyến thì vòng lại từ Bắc Kinh). */
export const cityOf = (leg: number) => CITIES[leg % CITIES.length]!;

export const ALL = 'all';
export const topicsFor = (id: string): Topic[] =>
  id === ALL ? TOPICS : TOPICS.filter((t) => t.id === id);

/** Chặng đầu khởi hành từ ga cửa khẩu Hữu Nghị Quan (Bằng Tường), nơi tàu từ Việt Nam sang. */
const BORDER: City = { id: 'pingxiang', name: '凭祥', pron: 'Píngxiáng', vi: 'Bằng Tường' };
const fromOf = (leg: number) => (leg === 0 ? BORDER : cityOf(leg - 1));

/** Nhãn chặng trong màn chơi: 凭祥 → 北京 · Bắc Kinh. */
export function LegLabel({ leg }: { leg: number }) {
  const to = cityOf(leg);
  return (
    <p className="flex min-w-0 items-center gap-2 text-sm text-[color:var(--dl-mute)]">
      <span className={HANZI}>{fromOf(leg).name}</span>
      <Train className="h-4 w-8 shrink-0 text-[color:var(--dl-accent)]" />
      <span className={`${HANZI} text-[color:var(--dl-accent)]`}>{to.name}</span>
      <span className="truncate">· {to.vi}</span>
    </p>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-xs font-semibold text-[color:var(--dl-mute)]">{label}</span>
      <span className="truncate font-semibold tabular-nums">{value}</span>
    </div>
  );
}

export function HomeScreen({
  topic,
  onTopic,
  onBoard,
  onGuide,
  muted,
  onMute,
}: {
  topic: string;
  onTopic: (id: string) => void;
  onBoard: () => void;
  onGuide: () => void;
  muted: boolean;
  onMute: () => void;
}) {
  const first = cityOf(0);
  const chosen = topic === ALL ? 'Tất cả chủ đề' : TOPICS.find((t) => t.id === topic)!.name;
  const chips: [string, string][] = [
    [ALL, 'Tất cả'],
    ...TOPICS.map((t): [string, string] => [t.id, t.name]),
  ];
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p
          className={`${BRUSH} text-[clamp(3rem,13vw,5.5rem)] leading-none text-[color:var(--dl-seal)]`}
          lang="zh-Hans"
        >
          中国之旅
        </p>
        <h1 className={`${DISPLAY} text-[clamp(2rem,7vw,3rem)] leading-tight`}>
          Du lịch Trung Hoa
        </h1>
        <p className="max-w-[48ch] text-lg text-[color:var(--dl-mute)]">
          Ngồi tàu qua tám thành phố Trung Quốc: nghe từ và câu tiếng Trung khi hỏi đường, gọi món,
          mua sắm… rồi gõ lại bằng pinyin. Mỗi {LEG} câu tới một ga, được đóng một con dấu son.
        </p>
      </header>

      {/* Vé tàu: đầu vé màu ngọc, ga đi – ga đến bằng chữ Hán, cuống vé đỏ son có nút lên tàu. */}
      <article
        aria-label={`Vé tàu từ ${BORDER.vi} tới ${first.vi}`}
        className="overflow-hidden rounded-[14px] bg-[color:var(--dl-card)] shadow-[inset_0_0_0_1.5px_var(--dl-line),0_22px_40px_-28px_rgb(31_26_20/0.6)]"
      >
        <div className="flex items-center justify-between bg-[color:var(--dl-accent)] px-5 py-2 text-sm font-semibold text-white">
          <span>Vé tàu · 车票</span>
          <span className="tabular-nums">G 2026</span>
        </div>
        <div className="flex flex-col gap-5 p-5 sm:p-6">
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
            <div className="flex flex-col">
              <span className={`${HANZI} text-4xl leading-none sm:text-5xl`} lang="zh-Hans">
                {BORDER.name}
              </span>
              <span className="text-sm font-semibold">{BORDER.pron}</span>
              <span className="text-sm text-[color:var(--dl-mute)]">{BORDER.vi}</span>
            </div>
            <Train className="mb-5 h-6 w-12 text-[color:var(--dl-accent)]" />
            <div className="flex flex-col items-end text-right">
              <span
                className={`${HANZI} text-4xl leading-none text-[color:var(--dl-accent)] sm:text-5xl`}
                lang="zh-Hans"
              >
                {first.name}
              </span>
              <span className="text-sm font-semibold">{first.pron}</span>
              <span className="text-sm text-[color:var(--dl-mute)]">{first.vi}</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 border-t border-dashed border-[color:var(--dl-line)] pt-4">
            <Field label="Toa · Ghế" value="01 · 05A" />
            <Field label="Mỗi chặng" value={`${LEG} câu`} />
            <Field label="Lượt sai" value={`${HEARTS} tim`} />
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-[color:var(--dl-mute)]">Chủ đề</span>
              <span className="text-lg font-semibold">{chosen}</span>
              <span className="text-sm text-[color:var(--dl-mute)]">
                Điểm tính trong chuyến này, tải lại trang là chuyến mới.
              </span>
            </div>
            <Button tone="seal" onClick={onBoard} className="w-full sm:w-auto">
              <Train className="h-5 w-9" />
              Lên tàu
            </Button>
          </div>
        </div>
      </article>

      <section aria-labelledby="zh-topic" className="flex flex-col gap-3">
        <h2 id="zh-topic" className={`${DISPLAY} text-2xl`}>
          Chủ đề
        </h2>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="zh-topic">
          {chips.map(([id, name]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={topic === id}
              onClick={() => onTopic(id)}
              className={`min-h-11 rounded-full px-4 text-[0.95rem] font-semibold transition-colors ${
                topic === id
                  ? 'bg-[color:var(--dl-accent)] text-white'
                  : 'bg-[color:var(--dl-tile)] shadow-[inset_0_0_0_1.5px_var(--dl-line)] hover:bg-white'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </section>

      {/* Tuyến tàu: các ga nối bằng một đường ray dọc như sơ đồ tuyến. */}
      <section aria-labelledby="zh-route" className="flex flex-col gap-3">
        <h2 id="zh-route" className={`${DISPLAY} text-2xl`}>
          Tuyến tàu
        </h2>
        <ol className="grid grid-cols-2 gap-x-6 sm:grid-cols-4">
          {CITIES.map((c, i) => (
            <li key={c.id} className="relative flex items-center gap-3 py-2 pl-6">
              <span
                aria-hidden
                className="absolute top-0 bottom-0 left-[7px] w-0.5 bg-[color:var(--dl-accent)] opacity-40"
              />
              <span
                aria-hidden
                className="absolute left-0 h-4 w-4 rounded-full border-[3px] border-[color:var(--dl-accent)] bg-[color:var(--dl-card)]"
              />
              <span className="flex flex-col">
                <span className={`${HANZI} text-xl`} lang="zh-Hans">
                  {c.name}
                </span>
                <span className="text-xs text-[color:var(--dl-mute)]">
                  {String(i + 1).padStart(2, '0')} · {c.vi}
                </span>
              </span>
            </li>
          ))}
        </ol>
        <p className="text-sm text-[color:var(--dl-mute)]">
          Tới Thượng Hải thì tàu vòng lại Bắc Kinh.
        </p>
      </section>

      <div className="flex flex-wrap gap-3">
        <Button tone="ghost" onClick={onGuide}>
          <IconBook className="h-5 w-5" />
          Cẩm nang · Cách chơi
        </Button>
        <Button tone="ghost" onClick={onMute}>
          <IconSound on={!muted} className="h-5 w-5" />
          {muted ? 'Bật hiệu ứng' : 'Tắt hiệu ứng'}
        </Button>
      </div>
    </div>
  );
}

/** Màn tới ga giữa hai chặng: con dấu son nện xuống sổ hành trình, rồi lên tàu đi tiếp. */
export function Arrival({ leg, onGo }: { leg: number; onGo: () => void }) {
  const city = cityOf(leg);
  const next = cityOf(leg + 1);
  const go = useRef<HTMLButtonElement>(null);
  useEffect(() => go.current?.focus(), []);
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-5 pt-6 text-center">
      <div className="zh-stamp">
        <Seal city={city} index={leg} size="lg" />
      </div>
      <h2 className={`${DISPLAY} text-4xl`}>
        Đã tới{' '}
        <span lang="zh-Hans" className={HANZI}>
          {city.name}
        </span>
      </h2>
      <p className="text-lg font-semibold">
        {city.pron} · {city.vi}
      </p>
      <p className="text-[color:var(--dl-mute)]">
        Sổ hành trình có thêm một con dấu, và bạn được hồi một tim (tối đa {HEARTS}). Ga tiếp theo:{' '}
        {next.vi}.
      </p>
      <button
        ref={go}
        type="button"
        onClick={onGo}
        className={`${DISPLAY} inline-flex min-h-14 items-center gap-2 rounded-[var(--dl-r)] bg-[color:var(--dl-accent)] px-7 text-lg text-white shadow-[0_4px_0_var(--dl-accentDeep)] active:translate-y-0.5 active:shadow-none`}
      >
        <Train className="h-5 w-9" />
        Lên tàu đi {next.vi}
      </button>
    </div>
  );
}

export function OverScreen({
  summary,
  onAgain,
  onHome,
}: {
  summary: Summary;
  onAgain: () => void;
  onHome: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  const right = summary.turns.filter((t) => t.result.verdict !== 'wrong').length;
  const tones = summary.turns.filter((t) => t.result.tones).length;
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 ref={heading} tabIndex={-1} className={`${DISPLAY} text-4xl outline-none`}>
          Xuống tàu!
        </h1>
        <p className={`${DISPLAY} text-7xl tabular-nums text-[color:var(--dl-seal)]`}>
          {summary.score}
        </p>
        <p className="text-[color:var(--dl-mute)]">
          điểm · qua {summary.legs} ga · viết đúng {right}/{summary.turns.length} câu
          {tones > 0 && <> · {tones} câu đúng cả thanh điệu</>}
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Button tone="seal" onClick={onAgain}>
            <Train className="h-5 w-9" />
            Đi chuyến mới
          </Button>
          <Button tone="ghost" onClick={onHome}>
            Về màn chính
          </Button>
        </div>
      </div>

      {summary.legs > 0 && (
        <section aria-labelledby="zh-seals" className="flex flex-col gap-3">
          <h2 id="zh-seals" className={`${DISPLAY} text-xl`}>
            Con dấu chuyến này
          </h2>
          <ul className="flex flex-wrap gap-4">
            {Array.from({ length: summary.legs }, (_, i) => (
              <li key={i}>
                <Seal city={cityOf(i)} index={i} size="sm" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="zh-review" className="flex flex-col gap-2">
        <h2 id="zh-review" className={`${DISPLAY} text-xl`}>
          Ôn lại
        </h2>
        <History turns={summary.turns} lang="zh" />
      </section>
    </div>
  );
}
