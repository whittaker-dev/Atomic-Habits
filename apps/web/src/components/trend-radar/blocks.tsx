'use client';

// Các khối hiển thị tin, từ khoá và video, dùng chung cho trang tổng hợp và trang riêng từng mục.

import Image from 'next/image';
import type { NewsItem, TrendItem } from '@/lib/trend-radar/rss';
import type { VideoItem } from '@/lib/trend-radar/sources';
import { cn } from '@/lib/utils';
import { useTrendRadar } from './context';
import { compactNumber, timeAgo, videoDuration } from './format';
import { FOCUS, IconClock } from './ui';

export const ROW_HOVER = 'rounded-xl transition-colors hover:bg-[color:var(--tr-ground)]';

export const TREND_TABS = [
  { id: 'top', label: 'Tìm nhiều nhất' },
  { id: 'new', label: 'Mới nổi lên' },
] as const;

export type TrendTab = (typeof TREND_TABS)[number]['id'];

export function sortTrends(items: TrendItem[], tab: TrendTab): TrendItem[] {
  return [...items].sort((a, b) =>
    tab === 'top'
      ? b.trafficValue - a.trafficValue
      : Date.parse(b.startedAt) - Date.parse(a.startedAt),
  );
}

export function Thumb({
  src,
  className,
  sizes,
}: {
  src: string | null;
  className: string;
  sizes: string;
}) {
  return (
    <div
      className={cn('relative shrink-0 overflow-hidden bg-[color:var(--tr-blue-wash)]', className)}
    >
      {src && <Image src={src} alt="" fill sizes={sizes} className="object-cover" />}
    </div>
  );
}

export function TimeAgo({
  iso,
  className,
  withIcon,
}: {
  iso: string;
  className?: string;
  withIcon?: boolean;
}) {
  const { now } = useTrendRadar();
  return (
    <time
      dateTime={iso}
      className={cn('flex items-center gap-1 text-[12.5px] tabular-nums', className)}
    >
      {withIcon && <IconClock />}
      {timeAgo(iso, now)}
    </time>
  );
}

function External({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cn(className, FOCUS)}>
      {children}
    </a>
  );
}

/** Dòng tin gọn: ảnh nhỏ (nếu nguồn có), tiêu đề, giờ đăng bên phải. */
export function CompactNewsRow({ item, withSource }: { item: NewsItem; withSource?: boolean }) {
  return (
    <li>
      <External href={item.url} className={cn('flex items-center gap-3 p-2', ROW_HOVER)}>
        {item.image && (
          <Thumb
            src={item.image}
            sizes="112px"
            className="aspect-[16/10] w-[96px] rounded-lg sm:w-[112px]"
          />
        )}
        <span className="flex-1">
          <span className="line-clamp-2 text-[14.5px] font-medium leading-snug text-[color:var(--tr-ink)]">
            {item.title}
          </span>
          {withSource && (
            <span className="mt-0.5 block text-[12.5px] text-[color:var(--tr-ink-faint)]">
              {item.source}
            </span>
          )}
        </span>
        <TimeAgo
          iso={item.publishedAt}
          className="hidden w-[84px] shrink-0 justify-end text-[color:var(--tr-ink-faint)] sm:flex"
        />
      </External>
    </li>
  );
}

/** Dòng tin nhỏ có giờ đăng dưới tiêu đề, cho cột hẹp. */
export function SideNewsRow({ item }: { item: NewsItem }) {
  return (
    <li>
      <External href={item.url} className={cn('flex gap-3 p-2', ROW_HOVER)}>
        <Thumb src={item.image} sizes="80px" className="aspect-[4/3] w-[80px] rounded-lg" />
        <span className="flex min-w-0 flex-col justify-between gap-1">
          <span className="line-clamp-2 text-[14px] font-medium leading-snug text-[color:var(--tr-ink)]">
            {item.title}
          </span>
          <TimeAgo iso={item.publishedAt} withIcon className="text-[color:var(--tr-ink-faint)]" />
        </span>
      </External>
    </li>
  );
}

/** Dòng tin đầy đủ: ảnh, tiêu đề, tóm tắt, nguồn và giờ. */
export function FullNewsRow({ item }: { item: NewsItem }) {
  return (
    <li>
      <External href={item.url} className={cn('flex gap-4 p-3', ROW_HOVER)}>
        {item.image && (
          <Thumb
            src={item.image}
            sizes="(min-width: 640px) 176px, 112px"
            className="aspect-[16/10] w-[112px] rounded-lg sm:w-[176px]"
          />
        )}
        <span className="flex min-w-0 flex-col gap-1">
          <span className="line-clamp-2 text-[15.5px] font-semibold leading-snug text-[color:var(--tr-ink)] sm:text-[16.5px]">
            {item.title}
          </span>
          {item.summary && (
            <span className="hidden text-[14px] leading-relaxed text-[color:var(--tr-ink-soft)] sm:line-clamp-2">
              {item.summary}
            </span>
          )}
          <span className="mt-auto flex items-center gap-1.5 text-[12.5px] text-[color:var(--tr-ink-faint)]">
            {item.source} · <TimeAgo iso={item.publishedAt} />
          </span>
        </span>
      </External>
    </li>
  );
}

/** Tin nổi bật: ảnh lớn, tiêu đề đè lên phần dưới ảnh. */
export function LeadStory({
  item,
  sizes,
  className,
}: {
  item: NewsItem;
  sizes: string;
  className?: string;
}) {
  return (
    <External
      href={item.url}
      className={cn(
        'group relative block min-h-[240px] overflow-hidden rounded-xl bg-[color:var(--tr-ink)]',
        className,
      )}
    >
      {item.image && (
        <Image
          src={item.image}
          alt=""
          fill
          sizes={sizes}
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        />
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-4 pt-16 sm:p-5 sm:pt-20">
        <h3 className="text-[17px] font-semibold leading-snug text-white sm:text-[19px]">
          {item.title}
        </h3>
        <TimeAgo iso={item.publishedAt} withIcon className="mt-1.5 text-white/80" />
      </div>
    </External>
  );
}

/** Thẻ tin dạng lưới: ảnh trên, chữ dưới. */
export function NewsCard({ item }: { item: NewsItem }) {
  return (
    <li>
      <External href={item.url} className="group block rounded-xl">
        <Thumb
          src={item.image}
          sizes="(min-width: 1280px) 300px, (min-width: 768px) 45vw, 100vw"
          className="aspect-video w-full rounded-xl"
        />
        <span className="mt-2.5 line-clamp-2 text-[15.5px] font-semibold leading-snug text-[color:var(--tr-ink)] group-hover:text-[color:var(--tr-blue-deep)]">
          {item.title}
        </span>
        <span className="mt-1 line-clamp-2 text-[13.5px] leading-relaxed text-[color:var(--tr-ink-soft)]">
          {item.summary}
        </span>
        <TimeAgo
          iso={item.publishedAt}
          withIcon
          className="mt-1.5 text-[color:var(--tr-ink-faint)]"
        />
      </External>
    </li>
  );
}

export function TrendList({
  items,
  selectedId,
  onSelect,
  maxTraffic,
}: {
  items: TrendItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  maxTraffic: number;
}) {
  return (
    <ol role="tabpanel" className="-mx-1 flex flex-col">
      {items.map((t, i) => {
        const active = t.id === selectedId;
        return (
          <li key={t.id}>
            <button
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(t.id)}
              className={cn(
                'grid w-full grid-cols-[22px_1fr_auto] items-center gap-x-2.5 rounded-lg px-2 py-2 text-left transition-colors',
                active ? 'bg-[color:var(--tr-blue-wash)]' : 'hover:bg-[color:var(--tr-ground)]',
                FOCUS,
              )}
            >
              <span className="text-[13px] font-semibold tabular-nums text-[color:var(--tr-ink-faint)]">
                {i + 1}
              </span>
              <span className="line-clamp-2 text-[14px] font-medium leading-snug first-letter:uppercase text-[color:var(--tr-ink)]">
                {t.keyword}
              </span>
              <span className="text-[12.5px] font-semibold tabular-nums text-[color:var(--tr-up)]">
                {t.traffic}
              </span>
              <span className="col-start-2 col-end-4 mt-1.5 h-1 overflow-hidden rounded-full bg-[color:var(--tr-line)]">
                <span
                  className="block h-full rounded-full bg-[color:var(--tr-blue)]"
                  // Thang log: lượt tìm chênh nhau hàng trăm lần, thang thường làm hết các thanh gần như rỗng.
                  style={{
                    width: `${Math.max(6, (Math.log10(t.trafficValue + 1) / Math.log10(maxTraffic + 1)) * 100)}%`,
                  }}
                />
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function TrendDetail({ trend, className }: { trend: TrendItem; className?: string }) {
  return (
    <div
      className={cn('rounded-xl bg-[color:var(--tr-ground)] p-3.5', className)}
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <Thumb src={trend.image} sizes="56px" className="h-14 w-14 rounded-lg" />
        <div className="min-w-0">
          <p className="text-[15px] font-semibold leading-snug first-letter:uppercase text-[color:var(--tr-ink)]">
            {trend.keyword}
          </p>
          <p className="mt-0.5 flex flex-wrap gap-x-1 text-[12.5px] text-[color:var(--tr-ink-soft)]">
            {trend.traffic} lượt tìm · nổi lên <TimeAgo iso={trend.startedAt} />
          </p>
        </div>
      </div>
      <p className="mb-1 mt-3 text-[12.5px] font-medium text-[color:var(--tr-ink-soft)]">
        Vì sao được tìm
      </p>
      <ul className="flex flex-col">
        {trend.news.map((n) => (
          <li key={n.url}>
            <External
              href={n.url}
              className="-mx-2 block rounded-lg px-2 py-1.5 transition-colors hover:bg-white"
            >
              <span className="line-clamp-2 text-[13.5px] leading-snug text-[color:var(--tr-ink)]">
                {n.title}
              </span>
              <span className="text-[12px] text-[color:var(--tr-ink-faint)]">{n.source}</span>
            </External>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function VideoCard({ video }: { video: VideoItem }) {
  const duration = videoDuration(video.duration);
  return (
    <li>
      <External href={video.url} className="group block rounded-xl">
        <div className="relative aspect-video overflow-hidden rounded-xl bg-[color:var(--tr-blue-wash)]">
          {video.thumbnail && (
            <Image
              src={video.thumbnail}
              alt=""
              fill
              sizes="(min-width: 1024px) 280px, 50vw"
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            />
          )}
          {duration && (
            <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[11.5px] font-medium tabular-nums text-white">
              {duration}
            </span>
          )}
        </div>
        <p className="mt-2 line-clamp-2 text-[13.5px] font-medium leading-snug text-[color:var(--tr-ink)]">
          {video.title}
        </p>
        <p className="mt-1 flex gap-1 truncate text-[12px] text-[color:var(--tr-ink-faint)]">
          {compactNumber(video.views)} lượt xem ·{' '}
          <TimeAgo iso={video.publishedAt} className="text-[12px]" />
        </p>
        <p className="truncate text-[12px] text-[color:var(--tr-ink-faint)]">{video.channel}</p>
      </External>
    </li>
  );
}
