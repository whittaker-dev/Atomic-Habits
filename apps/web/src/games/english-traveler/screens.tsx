'use client';

import { useEffect, useRef } from 'react';
import { HEARTS, LEG, type Topic } from '../du-lich/dictation';
import { IconBook, IconSound } from '../du-lich/icons';
import { History, type Summary } from '../du-lich/run';
import { CITIES, TOPICS, type City } from './data';
import { Airmail, Button, Plane, Stamp } from './kit';
import { DISPLAY, MONO } from './theme';

// Các màn của English Traveler ngoài màn chơi chung: màn chính (chọn chủ đề, thẻ lên máy bay, lộ
// trình), màn tới nơi sau mỗi chặng (đóng dấu hộ chiếu) và màn hết chuyến (điểm, các con dấu, ôn lại).

const HOME: City = { id: 'hanoi', name: 'Hanoi', country: 'Việt Nam', code: 'HAN' };

/** Thành phố đích của chặng `leg` (đi hết lộ trình thì vòng lại). */
export const cityOf = (leg: number) => CITIES[leg % CITIES.length]!;
const fromOf = (leg: number) => (leg === 0 ? HOME : cityOf(leg - 1));

/** "Tất cả chủ đề" hoặc một chủ đề. */
export const ALL = 'all';
export const topicsFor = (id: string): Topic[] =>
  id === ALL ? TOPICS : TOPICS.filter((t) => t.id === id);

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-[0.7rem] font-semibold tracking-wide text-[color:var(--dl-mute)] uppercase">
        {label}
      </span>
      <span className={`${MONO} truncate text-[0.95rem]`}>{value}</span>
    </div>
  );
}

/** Nhãn chặng trong màn chơi: HAN ✈ TYO · Tokyo. */
export function LegLabel({ leg }: { leg: number }) {
  const to = cityOf(leg);
  return (
    <p className={`${MONO} flex min-w-0 items-center gap-2 text-sm text-[color:var(--dl-mute)]`}>
      <span>{fromOf(leg).code}</span>
      <Plane className="h-4 w-4 shrink-0 text-[color:var(--dl-accent)]" />
      <span className="text-[color:var(--dl-accent)]">{to.code}</span>
      <span className="truncate normal-case tracking-normal">· {to.name}</span>
    </p>
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
      <header className="flex flex-col gap-3">
        <h1 className={`${DISPLAY} text-[clamp(2.6rem,10vw,4.5rem)] leading-[0.9]`}>
          English Traveler
        </h1>
        <p className="max-w-[48ch] text-lg text-[color:var(--dl-mute)]">
          Du lịch vòng quanh thế giới bằng đôi tai: nghe từ và câu tiếng Anh người ta nói ở sân bay,
          khách sạn, quán ăn… rồi viết lại. Mỗi {LEG} câu là một chặng bay, tới nơi được đóng dấu hộ
          chiếu.
        </p>
      </header>

      <article
        aria-label={`Thẻ lên máy bay từ Hà Nội tới ${first.name}`}
        className="relative overflow-hidden rounded-[18px] bg-[color:var(--dl-card)] shadow-[0_1px_0_var(--dl-line),0_22px_40px_-26px_rgb(22_34_74/0.55)]"
      >
        <Airmail className="h-2.5" />
        <div className="flex flex-col sm:flex-row">
          <div className="flex flex-1 flex-col gap-5 p-5 sm:p-6">
            <span className={`${MONO} text-xs text-[color:var(--dl-mute)]`}>
              Boarding pass · Thẻ lên máy bay
            </span>
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-[color:var(--dl-mute)]">Từ</span>
                <span className={`${DISPLAY} text-4xl leading-none sm:text-5xl`}>{HOME.code}</span>
                <span className="truncate text-sm text-[color:var(--dl-mute)]">Hà Nội</span>
              </div>
              <div className="flex flex-col items-center pb-5 text-[color:var(--dl-accent)]">
                <Plane className="h-7 w-7" />
                <span
                  className="mt-1 h-0 w-16 border-t-2 border-dashed border-current opacity-50 sm:w-24"
                  aria-hidden
                />
              </div>
              <div className="flex flex-col items-end text-right">
                <span className="text-xs font-semibold text-[color:var(--dl-mute)]">Đến</span>
                <span
                  className={`${DISPLAY} text-4xl leading-none text-[color:var(--dl-accent)] sm:text-5xl`}
                >
                  {first.code}
                </span>
                <span className="truncate text-sm text-[color:var(--dl-mute)]">
                  {first.name}, {first.country}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 border-t border-[color:var(--dl-line)] pt-4">
              <Field label="Chuyến" value="ET 101" />
              <Field label="Mỗi chặng" value={`${LEG} câu`} />
              <Field label="Lượt sai" value={`${HEARTS} tim`} />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[0.7rem] font-semibold tracking-wide text-[color:var(--dl-mute)] uppercase">
                Chủ đề
              </span>
              <p className="text-lg font-semibold">{chosen}</p>
            </div>
          </div>

          {/* Cuống vé: đường xé răng cưa có hai khuyết tròn, nút lên máy bay. */}
          <div className="relative flex flex-col justify-center gap-3 border-t-2 border-dashed border-[color:var(--dl-line)] p-5 sm:w-56 sm:border-t-0 sm:border-l-2 sm:p-6">
            <span
              aria-hidden
              className="absolute -top-3 -left-3 h-6 w-6 rounded-full bg-[color:var(--dl-ground)]"
            />
            <span
              aria-hidden
              className="absolute -top-3 -right-3 h-6 w-6 rounded-full bg-[color:var(--dl-ground)] sm:top-auto sm:right-auto sm:-bottom-3 sm:-left-3"
            />
            <p className="text-sm text-[color:var(--dl-mute)]">
              Điểm tính trong chuyến này, tải lại trang là bay chuyến mới.
            </p>
            <Button tone="red" onClick={onBoard} className="w-full">
              <Plane className="h-5 w-5" />
              Lên máy bay
            </Button>
          </div>
        </div>
      </article>

      <section aria-labelledby="et-topic" className="flex flex-col gap-3">
        <h2 id="et-topic" className={`${DISPLAY} text-2xl`}>
          Chủ đề
        </h2>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="et-topic">
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

      <section aria-labelledby="et-route" className="flex flex-col gap-3">
        <h2 id="et-route" className={`${DISPLAY} text-2xl`}>
          Lộ trình
        </h2>
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
          {[HOME, ...CITIES].map((c, i) => (
            <li key={c.id} className="flex items-center gap-2">
              {i > 0 && (
                <span
                  className="h-0 w-4 border-t-2 border-dashed border-[color:var(--dl-line)]"
                  aria-hidden
                />
              )}
              <span className="flex flex-col items-center">
                <span className={`${MONO} text-sm text-[color:var(--dl-accent)]`}>{c.code}</span>
                <span className="text-xs text-[color:var(--dl-mute)]">{c.name}</span>
              </span>
            </li>
          ))}
          <li className="text-sm text-[color:var(--dl-mute)]">rồi vòng lại</li>
        </ol>
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

/** Màn tới nơi giữa hai chặng: con dấu nện xuống hộ chiếu, rồi bay tiếp. */
export function Arrival({ leg, onGo }: { leg: number; onGo: () => void }) {
  const city = cityOf(leg);
  const next = cityOf(leg + 1);
  const go = useRef<HTMLButtonElement>(null);
  useEffect(() => go.current?.focus(), []);
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-5 pt-6 text-center">
      <div className="et-stamp w-64">
        <Stamp city={city} index={leg} size="lg" />
      </div>
      <h2 className={`${DISPLAY} text-4xl`}>Đã tới {city.name}!</h2>
      <p className="text-[color:var(--dl-mute)]">
        Hộ chiếu có thêm một con dấu, và bạn được hồi một tim (tối đa {HEARTS}). Chặng tiếp:{' '}
        {city.code} → {next.code}.
      </p>
      <button
        ref={go}
        type="button"
        onClick={onGo}
        className={`${DISPLAY} inline-flex min-h-14 items-center gap-2 rounded-[var(--dl-r)] bg-[color:var(--dl-airRed)] px-7 text-lg text-white shadow-[0_4px_0_#8f1d19] active:translate-y-0.5 active:shadow-none`}
      >
        <Plane className="h-5 w-5" />
        Bay tiếp tới {next.name}
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
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 ref={heading} tabIndex={-1} className={`${DISPLAY} text-4xl outline-none`}>
          Hạ cánh!
        </h1>
        <p className={`${DISPLAY} text-7xl tabular-nums text-[color:var(--dl-accent)]`}>
          {summary.score}
        </p>
        <p className="text-[color:var(--dl-mute)]">
          điểm · bay qua {summary.legs} thành phố · viết đúng {right}/{summary.turns.length} câu
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Button tone="red" onClick={onAgain}>
            <Plane className="h-5 w-5" />
            Bay chuyến mới
          </Button>
          <Button tone="ghost" onClick={onHome}>
            Về màn chính
          </Button>
        </div>
      </div>

      {summary.legs > 0 && (
        <section aria-labelledby="et-stamps" className="flex flex-col gap-3">
          <h2 id="et-stamps" className={`${DISPLAY} text-xl`}>
            Con dấu chuyến này
          </h2>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {Array.from({ length: summary.legs }, (_, i) => (
              <li key={i}>
                <Stamp city={cityOf(i)} index={i} size="sm" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="et-review" className="flex flex-col gap-2">
        <h2 id="et-review" className={`${DISPLAY} text-xl`}>
          Ôn lại
        </h2>
        <History turns={summary.turns} lang="en" />
      </section>
    </div>
  );
}
