'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import {
  GAME_TOPICS,
  VN_CATEGORIES,
  type GameTopicId,
  type VnCategoryId,
} from '@/lib/trend-radar/categories';
import { cn } from '@/lib/utils';
import {
  CompactNewsRow,
  LeadStory,
  SideNewsRow,
  sortTrends,
  TREND_TABS,
  TrendDetail,
  TrendList,
  VideoCard,
  type TrendTab,
} from './blocks';
import { useTrendRadar } from './context';
import { clockTime, longDate } from './format';
import { ROUTES } from './shell';
import {
  FlagVN,
  FOCUS,
  IconArrow,
  IconGamepad,
  IconGlobe,
  IconTrend,
  IconVideo,
  Panel,
  SeeAllLink,
  SourceNotice,
  Tabs,
} from './ui';

// Trang chủ /trend-radar: bản tổng hợp, mỗi nguồn một khối gọn; "Xem thêm" dẫn sang trang riêng của nguồn đó.

const RETRY = 'Trang sẽ tự thử lại sau ít phút.';

export function Overview() {
  return (
    <div className="mt-4 flex flex-col gap-4 lg:mt-5 lg:gap-5">
      <Hero />
      <div className="grid gap-4 lg:gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <VietnamBlock />
        <WorldBlock />
      </div>
      <div className="grid gap-4 lg:gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <TrendsBlock />
        <YouTubeBlock />
      </div>
      <GameBlock />
    </div>
  );
}

function Hero() {
  const { data } = useTrendRadar();
  return (
    <section
      aria-labelledby="tong-quan-title"
      className="relative overflow-hidden rounded-2xl bg-[linear-gradient(118deg,#eef4ff_0%,#dce8ff_48%,#c4d8fb_100%)]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -right-16 h-[260px] w-[260px] md:bottom-auto md:right-[4%] md:top-1/2 md:h-[270px] md:w-[270px] md:-translate-y-1/2 2xl:h-[330px] 2xl:w-[330px]"
      >
        <svg
          viewBox="-200 -200 400 400"
          className="absolute -inset-[30%] h-[160%] w-[160%] motion-safe:animate-[spin_120s_linear_infinite]"
        >
          <ellipse
            rx="190"
            ry="62"
            fill="none"
            stroke="#fff"
            strokeOpacity="0.9"
            strokeWidth="1.2"
            transform="rotate(-18)"
          />
          <ellipse
            rx="175"
            ry="96"
            fill="none"
            stroke="#fff"
            strokeOpacity="0.55"
            strokeWidth="1"
            transform="rotate(24)"
          />
        </svg>
        {/* Ảnh "The Blue Marble" của NASA (Apollo 17, 1972), thuộc phạm vi công cộng, đã tách nền. */}
        <Image
          src="/trend-radar/earth.png"
          alt=""
          width={720}
          height={720}
          priority
          sizes="(min-width: 1536px) 330px, 270px"
          className="relative h-full w-full drop-shadow-[0_24px_40px_rgba(23,73,196,0.35)]"
        />
      </div>

      <div className="relative max-w-[560px] px-5 pb-36 pt-6 sm:px-8 sm:pt-8 md:max-w-[min(560px,calc(100%-300px))] md:pb-9 2xl:max-w-[min(560px,calc(100%-360px))]">
        <h1
          id="tong-quan-title"
          className="text-[30px] font-bold leading-[1.12] tracking-[-0.03em] text-[color:var(--tr-ink)] sm:text-[38px]"
        >
          Cập nhật xu hướng,
          <br />
          nắm bắt thế giới
        </h1>
        <p className="mt-3 max-w-[460px] text-[15px] leading-relaxed text-[color:var(--tr-ink-soft)]">
          Tin Việt Nam và thế giới, từ khoá được tìm nhiều trên Google, video thịnh hành trên
          YouTube, tất cả trong một trang.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link
            href={ROUTES.vietnam}
            className={cn(
              'inline-flex h-11 items-center gap-2 rounded-xl bg-[color:var(--tr-blue)] px-5 text-[14.5px] font-semibold text-white transition-colors hover:bg-[color:var(--tr-blue-deep)]',
              FOCUS,
            )}
          >
            Xem tin hôm nay
            <IconArrow />
          </Link>
          <p className="text-[13px] text-[color:var(--tr-ink-soft)]">
            {longDate(data.fetchedAt)} · cập nhật lúc{' '}
            <time dateTime={data.fetchedAt} className="tabular-nums">
              {clockTime(data.fetchedAt)}
            </time>
          </p>
        </div>
      </div>
    </section>
  );
}

function VietnamBlock() {
  const { data } = useTrendRadar();
  const [tab, setTab] = useState<VnCategoryId>('latest');
  const feed = data.vietnam[tab];

  return (
    <Panel
      id="tin-viet-nam"
      title="Tin Việt Nam"
      icon={<FlagVN />}
      action={<SeeAllLink href={ROUTES.vietnam} label="Xem tất cả tin Việt Nam" />}
    >
      <Tabs label="Chuyên mục tin Việt Nam" tabs={VN_CATEGORIES} value={tab} onChange={setTab} />
      {feed.error ? (
        <SourceNotice>
          {feed.error} {RETRY}
        </SourceNotice>
      ) : (
        <ul role="tabpanel" className="-mx-2">
          {feed.items.slice(0, 4).map((item) => (
            <CompactNewsRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function WorldBlock() {
  const { data } = useTrendRadar();
  const [lead, ...rest] = data.world.items;

  return (
    <Panel
      id="tin-the-gioi"
      title="Tin thế giới"
      icon={<IconGlobe />}
      action={<SeeAllLink href={ROUTES.world} label="Xem tất cả tin thế giới" />}
    >
      {data.world.error || !lead ? (
        <SourceNotice>
          {data.world.error ?? 'Chưa có tin thế giới.'} {RETRY}
        </SourceNotice>
      ) : (
        <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
          <LeadStory
            item={lead}
            sizes="(min-width: 1280px) 380px, (min-width: 768px) 50vw, 100vw"
          />
          <ul className="-mx-2 flex flex-col">
            {rest.slice(0, 3).map((item) => (
              <SideNewsRow key={item.id} item={item} />
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

function TrendsBlock() {
  const { data } = useTrendRadar();
  const [tab, setTab] = useState<TrendTab>('top');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const shown = sortTrends(data.trends.items, tab).slice(0, 5);
  const selected = shown.find((t) => t.id === selectedId) ?? shown[0];

  return (
    <Panel
      id="google-trends"
      title="Google Trends Việt Nam"
      icon={<IconTrend className="h-5 w-5" />}
      action={<SeeAllLink href={ROUTES.trends} label="Xem tất cả từ khoá" />}
    >
      <Tabs label="Cách xếp từ khoá" tabs={TREND_TABS} value={tab} onChange={setTab} />
      {data.trends.error || !selected ? (
        <SourceNotice>
          {data.trends.error ?? 'Google chưa có từ khoá nổi bật nào.'} {RETRY}
        </SourceNotice>
      ) : (
        <div className="grid gap-4 sm:grid-cols-[1.1fr_1fr]">
          <TrendList
            items={shown}
            selectedId={selected.id}
            onSelect={setSelectedId}
            maxTraffic={Math.max(1, ...data.trends.items.map((t) => t.trafficValue))}
          />
          <TrendDetail trend={selected} />
        </div>
      )}
    </Panel>
  );
}

function YouTubeBlock() {
  const { data } = useTrendRadar();
  const videos = data.videos.items.slice(0, 4);

  return (
    <Panel
      id="youtube"
      title="YouTube thịnh hành"
      icon={<IconVideo />}
      action={
        videos.length > 0 && (
          <SeeAllLink href={ROUTES.youtube} label="Xem tất cả video thịnh hành" />
        )
      }
    >
      {data.videos.error || videos.length === 0 ? (
        <SourceNotice>{data.videos.error ?? 'YouTube chưa trả về video nào.'}</SourceNotice>
      ) : (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-4 lg:grid-cols-4">
          {videos.map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function GameBlock() {
  const { data } = useTrendRadar();
  const [topic, setTopic] = useState<GameTopicId>('all');
  const feed = data.games[topic];
  const videos = data.gamingVideos.items.slice(0, 4);

  return (
    <Panel
      id="game"
      title="Game"
      icon={<IconGamepad />}
      action={<SeeAllLink href={ROUTES.game} label="Xem tất cả tin game" />}
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <Tabs label="Chủ đề game" tabs={GAME_TOPICS} value={topic} onChange={setTopic} />
          {feed.error || feed.items.length === 0 ? (
            <SourceNotice>
              {feed.error ?? 'Chưa có tin nào trong 7 ngày qua.'} {RETRY}
            </SourceNotice>
          ) : (
            <ul role="tabpanel" className="-mx-2">
              {feed.items.slice(0, 5).map((item) => (
                <CompactNewsRow key={item.id} item={item} withSource={!item.image} />
              ))}
            </ul>
          )}
        </div>
        <div className="min-w-0">
          <h3 className="mb-3 text-[13px] font-semibold text-[color:var(--tr-ink-soft)]">
            Video game đang hot
          </h3>
          {data.gamingVideos.error || videos.length === 0 ? (
            <SourceNotice>
              {data.gamingVideos.error ?? 'YouTube chưa trả về video game nào.'}
            </SourceNotice>
          ) : (
            <ul className="grid grid-cols-2 gap-x-3 gap-y-4">
              {videos.map((v) => (
                <VideoCard key={v.id} video={v} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </Panel>
  );
}
