'use client';

import Link from 'next/link';
import { useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageModal } from '@/components/language-modal';
import { ART_BASE, ART_IDS } from '@/games/bong-bong-bum/art';
import { CHARACTERS, characterById } from '@/games/bong-bong-bum/characters';
import { MAX_PLAYERS, THEMES } from '@/games/bong-bong-bum/map';
import { cn } from '@/lib/utils';
import { GAME_FONT_URL } from './game-fonts';
import { GAMES, type GameEntry, type GameStatus } from './games-catalog';

// Trang thư viện game /games: bố cục cổng game quen thuộc (game nổi bật trên cùng, thư viện thẻ game bên dưới),
// mang bản sắc vui tươi của khu Games thay vì giao diện tối của app chính. Sáng và mát vì người chơi
// thường mở link bạn gửi trên điện thoại giữa ban ngày; tranh nhân vật là thứ dẫn dắt mắt nhìn.

type Filter = 'all' | GameStatus;
type Control = { keys: string; label: string };

/** Màu của khu Games, đặt thành biến CSS ở thẻ gốc để mọi phần đọc cùng một nguồn. */
const VARS = {
  '--gx-ink': '#1d2147',
  '--gx-ink-soft': '#4a5180',
  '--gx-ground': '#eef4fb',
  '--gx-sky': '#4cc3f0',
  '--gx-sky-deep': '#2a8fd6',
  '--gx-sun': '#ffd23f',
  '--gx-coral': '#ff6b6b',
  '--gx-grass': '#7cc95a',
} as CSSProperties;

const DISPLAY = "font-['Baloo_2',sans-serif]";
const FOCUS =
  'outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--gx-sky)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--gx-ground)]';

// ---------------------------------------------------------------------------
// Biểu tượng vẽ bằng SVG, cùng nét 2px bo tròn
// ---------------------------------------------------------------------------

function Icon({ children, className = 'h-5 w-5' }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}
const IconPlay = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
    <path
      d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z"
      fill="currentColor"
    />
  </svg>
);
const IconUsers = () => (
  <Icon>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" />
    <circle cx="17" cy="9" r="2.4" />
    <path d="M16 14.2c2.3.2 4 1.8 4.5 4.3" />
  </Icon>
);
const IconLink = () => (
  <Icon>
    <path d="M10 14a4 4 0 0 0 5.66 0l3.17-3.17a4 4 0 0 0-5.66-5.66L12 6.34" />
    <path d="M14 10a4 4 0 0 0-5.66 0l-3.17 3.17a4 4 0 0 0 5.66 5.66L12 17.66" />
  </Icon>
);
const IconStar = () => (
  <Icon>
    <path d="m12 3.5 2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8Z" />
  </Icon>
);
const IconMap = () => (
  <Icon>
    <path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6Z" />
    <path d="M9 4v14M15 6v14" />
  </Icon>
);
const IconBack = () => (
  <Icon className="h-4 w-4">
    <path d="M15 5 8 12l7 7" />
  </Icon>
);
const IconKeys = () => (
  <Icon>
    <rect x="3" y="6" width="18" height="12" rx="2.5" />
    <path d="M7 10h.01M11 10h.01M15 10h.01M8 14h8" />
  </Icon>
);
const IconPlus = () => (
  <Icon className="h-7 w-7">
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

/** Dấu hiệu khu Games: quả bóng nổ có ngòi lấp lánh, vẽ tay bằng SVG. */
function Mark() {
  return (
    <svg viewBox="0 0 40 40" className="h-9 w-9" aria-hidden>
      <circle cx="18" cy="23" r="13" fill="#ff6b6b" stroke="#1d2147" strokeWidth="3" />
      <ellipse cx="13" cy="18" rx="4" ry="2.6" fill="#fff" opacity=".8" />
      <path
        d="M26 13c2-3 4-4 7-4"
        stroke="#1d2147"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path d="m34 4 1.2 2.6L38 8l-2.8 1.4L34 12l-1.2-2.6L30 8l2.8-1.4Z" fill="#ffd23f" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Sân khấu nhân vật: đứng trên nền ô lưới giống sàn trong game
// ---------------------------------------------------------------------------

/** Sàn ô cỏ hai màu như bản đồ trong game. */
const GROUND: CSSProperties = {
  backgroundColor: '#7cc95a',
  backgroundImage: 'repeating-conic-gradient(#86d163 0% 25%, #74c052 0% 50%)',
  backgroundSize: '44px 44px',
  boxShadow: 'inset 0 6px 0 rgba(255,255,255,.25)',
};

function Clouds() {
  return (
    <svg
      viewBox="0 0 1200 400"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    >
      <g fill="#fff">
        <g opacity=".85">
          <ellipse cx="180" cy="90" rx="90" ry="34" />
          <ellipse cx="240" cy="72" rx="60" ry="36" />
          <ellipse cx="130" cy="78" rx="44" ry="26" />
        </g>
        <g opacity=".7">
          <ellipse cx="980" cy="70" rx="110" ry="30" />
          <ellipse cx="1040" cy="52" rx="64" ry="34" />
        </g>
        <g opacity=".55">
          <ellipse cx="640" cy="40" rx="70" ry="20" />
          <ellipse cx="680" cy="28" rx="40" ry="20" />
        </g>
      </g>
    </svg>
  );
}

/**
 * Đội hình trên sân khấu, trái sang phải: người đầu danh sách cast đứng giữa, to nhất và ở trước;
 * hai người bên cạnh nhỏ hơn, lùi lên một chút cho có chiều sâu. Chỉ ba người để không chen chúc.
 */
const LINEUP: { left: number; size: number; cast: number; delay: number }[] = [
  { left: 21, size: 0.84, cast: 1, delay: 0.2 },
  { left: 50, size: 1, cast: 0, delay: 0 },
  { left: 79, size: 0.84, cast: 2, delay: 0.35 },
];

function Stage({ game, height }: { game: GameEntry; height: number }) {
  return (
    <div className="relative w-full" style={{ height }} aria-hidden>
      {LINEUP.map((spot) => {
        const id = game.cast.ids[spot.cast % game.cast.ids.length]!;
        return (
          // eslint-disable-next-line @next/next/no-img-element -- PNG nhân vật cỡ sẵn, đặt theo chiều cao; tối ưu ảnh của Next không giúp thêm
          <img
            key={id}
            src={`${game.cast.base}/${id}.png`}
            alt=""
            className="gx-bob absolute -translate-x-1/2 select-none drop-shadow-[0_10px_8px_rgba(29,33,71,0.25)]"
            style={{
              left: `${spot.left}%`,
              bottom: (1 - spot.size) * height * 0.3,
              height: height * 0.9 * spot.size,
              zIndex: spot.size === 1 ? 2 : 1,
              animationDelay: `${spot.delay}s, ${spot.delay * 4}s`,
            }}
            draggable={false}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Khối giao diện
// ---------------------------------------------------------------------------

function PlayButton({
  href,
  children,
  size = 'lg',
}: {
  href: string;
  children: ReactNode;
  size?: 'lg' | 'md';
}) {
  return (
    <Link
      href={href}
      className={cn(
        DISPLAY,
        FOCUS,
        'inline-flex items-center justify-center gap-2 rounded-full bg-[color:var(--gx-sun)] font-bold text-[color:var(--gx-ink)] shadow-[0_6px_16px_-6px_rgba(29,33,71,0.45),inset_0_-3px_0_rgba(29,33,71,0.18)] transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_12px_22px_-8px_rgba(29,33,71,0.5),inset_0_-3px_0_rgba(29,33,71,0.18)] active:translate-y-0',
        size === 'lg' ? 'h-14 px-8 text-[1.35rem]' : 'h-11 px-6 text-lg',
      )}
    >
      <IconPlay />
      {children}
    </Link>
  );
}

function Featured({ game }: { game: GameEntry }) {
  const { t } = useTranslation();
  const [showControls, setShowControls] = useState(false);
  const controls = t(`games.${game.id}.controls`, { returnObjects: true }) as Control[];
  const [from, to] = game.cover;
  const features: [ReactNode, string][] = [
    [<IconUsers key="u" />, t(`games.${game.id}.features.players`, { count: MAX_PLAYERS })],
    [<IconLink key="l" />, t(`games.${game.id}.features.invite`)],
    [<IconStar key="s" />, t(`games.${game.id}.features.cast`, { count: CHARACTERS.length })],
    [<IconMap key="m" />, t(`games.${game.id}.features.maps`, { count: THEMES.length })],
  ];

  return (
    <section
      aria-labelledby="featured-title"
      className="relative overflow-hidden rounded-[2rem] shadow-[0_24px_48px_-28px_rgba(29,33,71,0.55)]"
      style={{ background: `linear-gradient(180deg, ${from} 0%, ${to} 100%)` }}
    >
      <Clouds />
      <div className="relative grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.1fr)]">
        <div className="z-10 px-6 pb-2 pt-8 sm:px-10 sm:pt-12 lg:pb-[7.5rem] lg:pt-14">
          <h1
            id="featured-title"
            className={cn(
              DISPLAY,
              'text-balance text-[clamp(3rem,7.5vw,5.25rem)] font-extrabold leading-[0.92] tracking-[-0.01em] text-[color:var(--gx-sun)] [-webkit-text-stroke:4px_var(--gx-ink)] [paint-order:stroke_fill]',
            )}
            style={{ textShadow: '0 6px 0 var(--gx-ink)' }}
          >
            {t(`games.${game.id}.title`)}
          </h1>
          <p className="mt-5 max-w-[34rem] text-[1.08rem] font-bold leading-relaxed text-[color:var(--gx-ink)]">
            {t(`games.${game.id}.description`)}
          </p>
          <ul className="mt-6 grid max-w-[34rem] grid-cols-2 gap-2">
            {features.map(([icon, label]) => (
              <li
                key={label}
                className="flex items-center gap-2 rounded-2xl bg-white/80 px-3 py-2 text-[0.85rem] font-extrabold leading-snug text-[color:var(--gx-ink)] shadow-[0_4px_12px_-8px_rgba(29,33,71,0.5)] sm:gap-2.5 sm:px-3.5 sm:py-2.5 sm:text-[0.95rem]"
              >
                <span className="shrink-0 text-[color:var(--gx-sky-deep)]">{icon}</span>
                {label}
              </li>
            ))}
          </ul>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <PlayButton href={game.href}>{t('games.play')}</PlayButton>
            <button
              type="button"
              onClick={() => setShowControls((v) => !v)}
              aria-expanded={showControls}
              aria-controls="featured-controls"
              className={cn(
                DISPLAY,
                FOCUS,
                'inline-flex h-14 items-center gap-2 rounded-full bg-white px-6 text-lg font-bold text-[color:var(--gx-ink)] shadow-[0_6px_16px_-8px_rgba(29,33,71,0.4)] transition-transform duration-200 ease-out hover:-translate-y-0.5',
              )}
            >
              <IconKeys />
              {t('games.howToPlay')}
            </button>
          </div>
          {showControls && (
            <dl
              id="featured-controls"
              className="mt-4 grid max-w-[34rem] grid-cols-1 gap-x-6 gap-y-2 rounded-2xl bg-white p-4 shadow-[0_8px_20px_-12px_rgba(29,33,71,0.5)] sm:grid-cols-2"
            >
              {controls.map((c) => (
                <div key={c.label} className="flex items-center justify-between gap-3">
                  <dt className="text-sm font-bold text-[color:var(--gx-ink-soft)]">{c.label}</dt>
                  <dd>
                    <kbd className="inline-flex min-w-9 justify-center rounded-lg border-2 border-[color:var(--gx-ink)] bg-[color:var(--gx-ground)] px-2 py-0.5 text-sm font-extrabold text-[color:var(--gx-ink)] shadow-[inset_0_-2px_0_rgba(29,33,71,0.2)]">
                      {c.keys}
                    </kbd>
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {/* Sân khấu: điện thoại thì ở dưới, màn rộng thì bên phải; nhân vật đứng trên sàn ô cỏ. */}
        <div className="relative lg:absolute lg:inset-y-0 lg:right-0 lg:w-[56%]">
          <div
            className="absolute inset-x-0 bottom-0 h-16 sm:h-20 lg:h-[7.5rem]"
            style={GROUND}
            aria-hidden
          />
          <div className="relative px-2 pb-6 pt-2 sm:pb-8 lg:absolute lg:inset-x-0 lg:bottom-[3.5rem] lg:px-6 lg:pb-0">
            <div className="block lg:hidden">
              <Stage game={game} height={210} />
            </div>
            <div className="hidden lg:block">
              <Stage game={game} height={360} />
            </div>
          </div>
        </div>
        <div
          className="absolute inset-x-0 bottom-0 hidden h-[7.5rem] lg:block lg:w-[44%]"
          style={GROUND}
          aria-hidden
        />
      </div>
    </section>
  );
}

/** Ảnh bìa thẻ game: banner vẽ sẵn của game, đã có tên game trong ảnh. */
function Cover({ game }: { game: GameEntry }) {
  return (
    <div className="relative aspect-video overflow-hidden bg-[color:var(--gx-ground)]" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element -- banner cỡ sẵn cho thẻ; tối ưu ảnh của Next không giúp thêm */}
      <img
        src={game.banner}
        alt=""
        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        draggable={false}
      />
    </div>
  );
}

function GameCard({ game }: { game: GameEntry }) {
  const { t } = useTranslation();
  const playable = game.status === 'playable';
  const tags = t(`games.${game.id}.tags`, { returnObjects: true }) as string[];
  return (
    <li className="group flex flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-[0_14px_30px_-20px_rgba(29,33,71,0.55)] transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_22px_40px_-22px_rgba(29,33,71,0.6)]">
      <Cover game={game} />
      <div className="flex flex-1 flex-col p-5">
        <h3
          className={cn(
            DISPLAY,
            'text-[1.6rem] font-extrabold leading-tight text-[color:var(--gx-ink)]',
          )}
        >
          {t(`games.${game.id}.title`)}
        </h3>
        <p className="mt-0.5 text-[0.95rem] font-bold text-[color:var(--gx-ink-soft)]">
          {t(`games.${game.id}.genre`)}
        </p>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <li
              key={tag}
              className="rounded-full bg-[color:var(--gx-ground)] px-2.5 py-1 text-xs font-extrabold text-[color:var(--gx-ink-soft)]"
            >
              {tag}
            </li>
          ))}
        </ul>
        <div className="mt-5 flex items-center justify-between gap-3 pt-1 md:mt-auto">
          {playable ? (
            <PlayButton href={game.href} size="md">
              {t('games.play')}
            </PlayButton>
          ) : (
            <span
              className={cn(
                DISPLAY,
                'inline-flex h-11 items-center rounded-full bg-[color:var(--gx-ground)] px-5 text-lg font-bold text-[color:var(--gx-ink-soft)]',
              )}
            >
              {t('games.soon')}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

function Library() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<Filter>('all');
  const visible = GAMES.filter((g) => filter === 'all' || g.status === filter);
  const playableCount = GAMES.filter((g) => g.status === 'playable').length;
  return (
    <section aria-labelledby="library-title" className="mt-16 sm:mt-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2
            id="library-title"
            className={cn(
              DISPLAY,
              'text-[2.4rem] font-extrabold leading-none text-[color:var(--gx-ink)]',
            )}
          >
            {t('games.library')}
          </h2>
          <p className="mt-2 text-[0.95rem] font-bold text-[color:var(--gx-ink-soft)]">
            {t('games.playableCount', { count: playableCount })}
          </p>
        </div>
        <div
          className="flex gap-1 rounded-full bg-white p-1 shadow-[0_6px_16px_-12px_rgba(29,33,71,0.5)]"
          role="tablist"
          aria-label={t('games.library')}
        >
          {(['all', 'playable', 'soon'] as const).map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={cn(
                FOCUS,
                'rounded-full px-4 py-2 text-sm font-extrabold transition-colors duration-200',
                filter === f
                  ? 'bg-[color:var(--gx-ink)] text-white'
                  : 'text-[color:var(--gx-ink-soft)] hover:bg-[color:var(--gx-ground)]',
              )}
            >
              {t(`games.filters.${f}`)}
            </button>
          ))}
        </div>
      </div>
      <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((g) => (
          <GameCard key={g.id} game={g} />
        ))}
        {filter !== 'playable' && (
          <li className="flex min-h-[14rem] flex-col items-center justify-center gap-2 rounded-[1.5rem] border-[3px] border-dashed border-[rgba(74,81,128,0.3)] p-6 text-center text-[color:var(--gx-ink-soft)]">
            <IconPlus />
            <p className={cn(DISPLAY, 'text-xl font-bold')}>{t('games.empty')}</p>
          </li>
        )}
      </ul>
    </section>
  );
}

/** Dải nhân vật kéo ngang: toàn bộ nhân vật có tranh của Bomb Arena. */
function Cast() {
  const { t } = useTranslation();
  const game = GAMES.find((g) => g.id === 'bongBongBum');
  if (!game) return null;
  return (
    <section aria-labelledby="cast-title" className="mt-16 sm:mt-20">
      <h2
        id="cast-title"
        className={cn(
          DISPLAY,
          'text-[2.4rem] font-extrabold leading-none text-[color:var(--gx-ink)]',
        )}
      >
        {t('games.meetCast')}
      </h2>
      <p className="mt-2 text-[0.95rem] font-bold text-[color:var(--gx-ink-soft)]">
        {t('games.castCount', { count: CHARACTERS.length })}
      </p>
      <ul className="gx-scroll -mx-4 mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6">
        {ART_IDS.map((id) => (
          <li
            key={id}
            className="w-36 shrink-0 snap-start overflow-hidden rounded-[1.25rem] bg-white shadow-[0_10px_24px_-18px_rgba(29,33,71,0.6)]"
          >
            <div className="flex h-40 items-end justify-center bg-[linear-gradient(180deg,#d7f1fc,#a9dcf5)]">
              {/* eslint-disable-next-line @next/next/no-img-element -- PNG nhân vật 256px đã nhỏ sẵn, đặt theo chiều cao; tối ưu ảnh của Next không giúp thêm */}
              <img
                src={`${ART_BASE}/${id}.png`}
                alt=""
                loading="lazy"
                className="h-[92%] w-auto object-contain object-bottom drop-shadow-[0_6px_5px_rgba(29,33,71,0.22)]"
                draggable={false}
              />
            </div>
            <p
              className={cn(
                DISPLAY,
                'truncate px-3 py-2 text-center text-lg font-bold text-[color:var(--gx-ink)]',
              )}
            >
              {characterById(id).name}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function GamesHome() {
  const { t } = useTranslation();
  const featured = GAMES.find((g) => g.status === 'playable') ?? GAMES[0];

  return (
    <div
      style={VARS}
      className="gx-root min-h-screen bg-[color:var(--gx-ground)] font-['Nunito',sans-serif] text-[color:var(--gx-ink)]"
    >
      <link rel="stylesheet" href={GAME_FONT_URL} precedence="default" />
      <style>{`
        .gx-root ::selection { background: var(--gx-sun); color: var(--gx-ink); }
        .gx-scroll { scrollbar-width: thin; scrollbar-color: var(--gx-sky) transparent; }
        .gx-scroll::-webkit-scrollbar { height: 8px; }
        .gx-scroll::-webkit-scrollbar-thumb { background: var(--gx-sky); border-radius: 999px; }
        @keyframes gx-rise { from { opacity: 0; transform: translate(-50%, 24px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes gx-idle { 0%, 100% { translate: 0 0; } 50% { translate: 0 -6px; } }
        .gx-bob { animation: gx-rise .7s cubic-bezier(.16,1,.3,1) both, gx-idle 3.2s ease-in-out .8s infinite; }
        @media (prefers-reduced-motion: reduce) { .gx-bob { animation: none; } }
      `}</style>

      <header className="sticky top-0 z-40 border-b border-[rgba(29,33,71,0.1)] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/games" className={cn(FOCUS, 'flex items-center gap-2 rounded-xl')}>
            <Mark />
            <span
              className={cn(
                DISPLAY,
                'text-[1.6rem] font-extrabold leading-none text-[color:var(--gx-ink)]',
              )}
            >
              {t('games.title')}
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className={cn(
                FOCUS,
                'hidden items-center gap-1 rounded-full px-3 py-2 text-sm font-extrabold text-[color:var(--gx-ink-soft)] hover:bg-[color:var(--gx-ground)] hover:text-[color:var(--gx-ink)] sm:inline-flex',
              )}
            >
              <IconBack />
              {t('games.backToApp')}
            </Link>
            <LanguageModal />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
        {featured && <Featured game={featured} />}
        <Library />
        <Cast />
      </main>

      <footer className="border-t border-[rgba(29,33,71,0.1)] bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm font-bold text-[color:var(--gx-ink-soft)] sm:px-6">
          <span>{t('games.footer')}</span>
          <Link
            href="/"
            className={cn(
              FOCUS,
              'inline-flex items-center gap-1 rounded-full hover:text-[color:var(--gx-ink)]',
            )}
          >
            <IconBack />
            {t('games.backToApp')}
          </Link>
        </div>
      </footer>
    </div>
  );
}
