'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import type { NewsItem } from '@/lib/trend-radar/rss';
import type { TrendRadarData } from '@/lib/trend-radar/sources';
import { cn } from '@/lib/utils';
import { TrendRadarProvider, useTrendRadar } from './context';
import { timeAgo } from './format';
import {
  FlagVN,
  FOCUS,
  IconBack,
  IconGamepad,
  IconPlane,
  IconBulb,
  IconClose,
  IconGlobe,
  IconHome,
  IconSearch,
  IconTrend,
  IconVideo,
  Logo,
} from './ui';

// Khung chung của /trend-radar theo mẫu chủ dự án đưa: thanh điều hướng trái (trên điện thoại là thanh
// trên cùng), ô tìm kiếm, rồi nội dung của mục đang mở. Mỗi mục là một trang riêng; trang chủ là bản tổng hợp.
// Nền sáng, xanh dương, khác hẳn giao diện tối của app chính, đúng như mẫu; màu đặt thành biến CSS ở thẻ gốc
// để mọi phần đọc cùng một nguồn.

const VARS = {
  '--tr-ground': '#f2f6fc',
  '--tr-line': '#e3e9f2',
  '--tr-line-strong': '#c9d4e4',
  '--tr-ink': '#0e1a33',
  '--tr-ink-soft': '#4b5a75',
  '--tr-ink-faint': '#66748d',
  '--tr-blue': '#1f62f0',
  '--tr-blue-deep': '#164bc0',
  '--tr-blue-wash': '#e8effd',
  '--tr-up': '#14833b',
  '--tr-red': '#e8231b',
} as CSSProperties;

export const ROUTES = {
  home: '/trend-radar',
  vietnam: '/trend-radar/viet-nam',
  world: '/trend-radar/the-gioi',
  trends: '/trend-radar/google-trends',
  youtube: '/trend-radar/youtube',
  game: '/trend-radar/game',
  travel: '/trend-radar/du-lich',
} as const;

const NAV = [
  { href: ROUTES.home, label: 'Trang chủ', icon: <IconHome /> },
  { href: ROUTES.vietnam, label: 'Tin Việt Nam', icon: <FlagVN /> },
  { href: ROUTES.world, label: 'Tin thế giới', icon: <IconGlobe /> },
  { href: ROUTES.trends, label: 'Google Trends', icon: <IconTrend className="h-5 w-5" /> },
  { href: ROUTES.youtube, label: 'YouTube thịnh hành', icon: <IconVideo /> },
  { href: ROUTES.game, label: 'Game', icon: <IconGamepad /> },
  { href: ROUTES.travel, label: 'Du lịch', icon: <IconPlane /> },
] as const;

/** Bỏ dấu để gõ "gia vang" vẫn ra "giá vàng". */
function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

export function TrendRadarShell({ data, children }: { data: TrendRadarData; children: ReactNode }) {
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  const searching = query.trim().length >= 2;

  // Chuyển sang mục khác thì bỏ tìm kiếm, để trang vừa bấm hiện ra ngay.
  useEffect(() => setQuery(''), [pathname]);

  return (
    <TrendRadarProvider data={data}>
      <div
        style={VARS}
        className="min-h-screen bg-[color:var(--tr-ground)] text-[color:var(--tr-ink)] selection:bg-[color:var(--tr-blue)] selection:text-white lg:grid lg:grid-cols-[264px_minmax(0,1fr)]"
      >
        <Sidebar pathname={pathname} />
        <MobileHeader pathname={pathname} />

        <main className="mx-auto w-full max-w-[1240px] px-4 pb-16 pt-4 sm:px-6 lg:px-8 lg:pt-6">
          <SearchBar value={query} onChange={setQuery} />
          {searching ? (
            <SearchResults query={query.trim()} onClear={() => setQuery('')} />
          ) : (
            children
          )}
          <div className="mt-6 lg:hidden">
            <SourcesNote />
          </div>
        </main>
      </div>
    </TrendRadarProvider>
  );
}

// ---------------------------------------------------------------------------
// Điều hướng
// ---------------------------------------------------------------------------

function Brand() {
  return (
    <Link href={ROUTES.home} className={cn('block rounded-lg', FOCUS)}>
      <span className="flex items-center gap-2">
        <Logo />
        <span className="text-[19px] font-bold leading-tight tracking-[-0.02em]">
          TrendRadar VN
        </span>
      </span>
      <span className="mt-1 hidden whitespace-nowrap text-[12px] text-[color:var(--tr-ink-faint)] lg:block">
        Quét xu hướng · Bắt nhịp thế giới
      </span>
    </Link>
  );
}

function SourcesNote() {
  return (
    <aside className="rounded-2xl bg-[color:var(--tr-blue-wash)] p-4 text-[12.5px] leading-relaxed text-[color:var(--tr-ink-soft)]">
      <span className="mb-2 block text-[color:var(--tr-blue)]">
        <IconBulb />
      </span>
      <p>
        Tin lấy từ RSS VnExpress và GameK, tin theo game và theo nơi từ Google News, từ khoá từ
        Google Trends Việt Nam, video từ YouTube, thời tiết từ Open-Meteo, lượt khách theo năm từ
        World Bank. Dữ liệu làm mới mỗi 15 phút.
      </p>
      <p className="mt-2">
        TikTok, Facebook và Instagram chưa có vì các nền tảng này không mở dữ liệu xu hướng.
      </p>
    </aside>
  );
}

function NavLink({
  href,
  label,
  icon,
  active,
  compact,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  active: boolean;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex shrink-0 items-center gap-3 rounded-xl text-[14px] font-medium transition-colors',
        compact ? 'px-3 py-1.5' : 'px-3 py-2.5',
        active
          ? 'bg-[color:var(--tr-blue-wash)] text-[color:var(--tr-blue-deep)]'
          : 'text-[color:var(--tr-ink-soft)] hover:bg-[color:var(--tr-ground)] hover:text-[color:var(--tr-ink)]',
        FOCUS,
      )}
    >
      <span className="grid h-5 w-5 place-items-center">{icon}</span>
      {label}
    </Link>
  );
}

function Sidebar({ pathname }: { pathname: string }) {
  return (
    <div className="sticky top-0 hidden h-screen p-4 pr-0 lg:block">
      <div className="flex h-full flex-col rounded-2xl border border-[color:var(--tr-line)] bg-white p-4">
        <div className="px-1 pb-6 pt-1">
          <Brand />
        </div>
        <nav aria-label="Các mục" className="flex flex-col gap-1">
          {NAV.map((n) => (
            <NavLink key={n.href} {...n} active={pathname === n.href} />
          ))}
        </nav>
        <div className="mt-6 border-t border-[color:var(--tr-line)] pt-4">
          <Link
            href="/"
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium text-[color:var(--tr-ink-soft)] transition-colors hover:bg-[color:var(--tr-ground)] hover:text-[color:var(--tr-ink)]',
              FOCUS,
            )}
          >
            <IconBack />
            Về Atomic Habits
          </Link>
        </div>
        <div className="mt-auto">
          <SourcesNote />
        </div>
      </div>
    </div>
  );
}

function MobileHeader({ pathname }: { pathname: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-[color:var(--tr-line)] bg-white lg:hidden">
      <div className="flex items-center justify-between px-4 pb-2 pt-3 sm:px-6">
        <Brand />
        <Link
          href="/"
          aria-label="Về Atomic Habits"
          className={cn(
            'grid h-10 w-10 place-items-center rounded-xl text-[color:var(--tr-ink-soft)] hover:bg-[color:var(--tr-ground)]',
            FOCUS,
          )}
        >
          <IconBack />
        </Link>
      </div>
      <nav
        aria-label="Các mục"
        className="flex gap-1 overflow-x-auto px-3 pb-2 [scrollbar-width:none] sm:px-5"
      >
        {NAV.map((n) => (
          <NavLink key={n.href} {...n} active={pathname === n.href} compact />
        ))}
      </nav>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Tìm kiếm
// ---------------------------------------------------------------------------

function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div role="search" className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[color:var(--tr-ink-faint)]">
        <IconSearch className="h-[18px] w-[18px]" />
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Tìm trong tin hôm nay, từ khoá hot… (ví dụ: giá vàng, bóng đá)"
        aria-label="Tìm trong tin và xu hướng hôm nay"
        className="h-12 w-full rounded-xl border border-[color:var(--tr-line)] bg-white pl-11 pr-11 text-[14.5px] text-[color:var(--tr-ink)] caret-[color:var(--tr-blue)] outline-none transition-shadow placeholder:text-[color:var(--tr-ink-faint)] focus:border-[color:var(--tr-blue)] focus:shadow-[0_0_0_3px_rgba(31,98,240,0.15)] [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Xoá tìm kiếm"
          className={cn(
            'absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-[color:var(--tr-ink-faint)] hover:bg-[color:var(--tr-ground)] hover:text-[color:var(--tr-ink)]',
            FOCUS,
          )}
        >
          <IconClose />
        </button>
      )}
    </div>
  );
}

function SearchResults({ query, onClear }: { query: string; onClear: () => void }) {
  const { data, now } = useTrendRadar();
  const allNews = useMemo(() => {
    const seen = new Set<string>();
    const list: NewsItem[] = [];
    const feeds = [
      ...Object.values(data.vietnam),
      data.world,
      ...Object.values(data.games),
      data.travel,
    ];
    for (const item of feeds.flatMap((f) => f.items)) {
      if (seen.has(item.url)) continue;
      seen.add(item.url);
      list.push(item);
    }
    return list.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  }, [data]);

  const q = fold(query);
  const news = allNews.filter((n) => fold(`${n.title} ${n.summary}`).includes(q)).slice(0, 30);
  const trends = data.trends.items.filter((t) => fold(t.keyword).includes(q));
  // Một video có thể nằm ở cả hai bảng thịnh hành (chung và Gaming); gộp theo id để không hiện hai lần.
  const allVideos = [
    ...new Map([...data.videos.items, ...data.gamingVideos.items].map((v) => [v.id, v])).values(),
  ];
  const videos = allVideos.filter((v) => fold(`${v.title} ${v.channel}`).includes(q));
  const total = news.length + trends.length + videos.length;

  return (
    <section
      aria-live="polite"
      className="mt-4 rounded-2xl border border-[color:var(--tr-line)] bg-white p-4 sm:p-5"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-[color:var(--tr-ink)]">
          {total > 0 ? `${total} kết quả cho “${query}”` : `Không có gì khớp với “${query}”`}
        </h2>
        <button
          type="button"
          onClick={onClear}
          className={cn(
            'shrink-0 rounded-md px-2 py-1 text-[13px] font-medium text-[color:var(--tr-blue)] hover:bg-[color:var(--tr-blue-wash)]',
            FOCUS,
          )}
        >
          Đóng tìm kiếm
        </button>
      </div>
      {total === 0 && (
        <p className="text-[14px] text-[color:var(--tr-ink-soft)]">
          Thử từ ngắn hơn, hoặc gõ không dấu như “gia vang”. Tìm kiếm chỉ trong tin và xu hướng đang
          có trên trang.
        </p>
      )}
      {trends.length > 0 && (
        <ResultGroup title="Từ khoá đang được tìm">
          {trends.map((t) => (
            <li key={t.id} className="flex items-baseline justify-between gap-3 px-2 py-2">
              <span className="text-[14.5px] font-medium first-letter:uppercase">{t.keyword}</span>
              <span className="text-[12.5px] font-semibold tabular-nums text-[color:var(--tr-up)]">
                {t.traffic} lượt tìm
              </span>
            </li>
          ))}
        </ResultGroup>
      )}
      {news.length > 0 && (
        <ResultGroup title="Tin">
          {news.map((n) => (
            <ResultLink
              key={n.id}
              href={n.url}
              title={n.title}
              meta={`${n.source} · ${timeAgo(n.publishedAt, now)}`}
            />
          ))}
        </ResultGroup>
      )}
      {videos.length > 0 && (
        <ResultGroup title="Video">
          {videos.map((v) => (
            <ResultLink key={v.id} href={v.url} title={v.title} meta={v.channel} />
          ))}
        </ResultGroup>
      )}
    </section>
  );
}

function ResultGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-4 first:mt-0">
      <h3 className="mb-1 text-[13px] font-semibold text-[color:var(--tr-ink-soft)]">{title}</h3>
      <ul className="-mx-2 divide-y divide-[color:var(--tr-line)]">{children}</ul>
    </div>
  );
}

function ResultLink({ href, title, meta }: { href: string; title: string; meta: string }) {
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'block rounded-lg px-2 py-2.5 transition-colors hover:bg-[color:var(--tr-ground)]',
          FOCUS,
        )}
      >
        <span className="block text-[14.5px] font-medium leading-snug">{title}</span>
        <span className="mt-0.5 block text-[12.5px] text-[color:var(--tr-ink-faint)]">{meta}</span>
      </a>
    </li>
  );
}
