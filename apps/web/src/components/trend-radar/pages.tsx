'use client';

import { useState } from 'react';
import {
  GAME_TOPICS,
  VN_CATEGORIES,
  type GameTopicId,
  type VnCategoryId,
} from '@/lib/trend-radar/categories';
import type { NewsItem } from '@/lib/trend-radar/rss';
import {
  FullNewsRow,
  LeadStory,
  NewsCard,
  SideNewsRow,
  sortTrends,
  TREND_TABS,
  TrendDetail,
  TrendList,
  VideoCard,
  type TrendTab,
} from './blocks';
import { useTrendRadar } from './context';
import { clockTime } from './format';
import {
  FlagVN,
  IconGamepad,
  IconGlobe,
  IconTrend,
  IconVideo,
  LoadMoreButton,
  PageHeader,
  SourceNotice,
  Tabs,
} from './ui';

// Trang riêng của từng mục: cùng dữ liệu với trang tổng hợp nhưng hiện đầy đủ.

const RETRY = 'Trang sẽ tự thử lại sau ít phút.';
const PAGE_SIZE = 20;

const SHEET = 'min-w-0 rounded-2xl border border-[color:var(--tr-line)] bg-white p-3 sm:p-5';

/** Tin chính ảnh lớn bên trái, ba tin kế tiếp xếp cột bên phải. */
function LeadGroup({ lead, side }: { lead: NewsItem; side: NewsItem[] }) {
  return (
    <div className="grid gap-4 pb-3 md:grid-cols-[1.45fr_1fr]">
      <LeadStory
        item={lead}
        sizes="(min-width: 768px) 600px, 100vw"
        className="min-h-[280px] md:min-h-[340px]"
      />
      <ul className="-mx-2 flex flex-col justify-between">
        {side.map((item) => (
          <SideNewsRow key={item.id} item={item} />
        ))}
      </ul>
    </div>
  );
}

function Updated({ source }: { source: string }) {
  const { data } = useTrendRadar();
  return (
    <>
      {source} · cập nhật lúc{' '}
      <time dateTime={data.fetchedAt} className="tabular-nums">
        {clockTime(data.fetchedAt)}
      </time>
    </>
  );
}

export function VietnamPage() {
  const { data } = useTrendRadar();
  const [tab, setTab] = useState<VnCategoryId>('latest');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const feed = data.vietnam[tab];
  const [lead, ...rest] = feed.items;
  const list = rest.slice(3);
  const shown = list.slice(0, limit);

  return (
    <>
      <PageHeader
        icon={<FlagVN />}
        title="Tin Việt Nam"
        description={<Updated source="Nguồn: VnExpress" />}
      />
      <div className={SHEET}>
        <Tabs
          label="Chuyên mục tin Việt Nam"
          tabs={VN_CATEGORIES}
          value={tab}
          onChange={(id) => {
            setTab(id);
            setLimit(PAGE_SIZE);
          }}
        />
        {feed.error || !lead ? (
          <SourceNotice>
            {feed.error ?? 'Chuyên mục này chưa có tin.'} {RETRY}
          </SourceNotice>
        ) : (
          <div role="tabpanel" className="pt-2">
            <LeadGroup lead={lead} side={rest.slice(0, 3)} />
            <ul className="-mx-1 mt-3 divide-y divide-[color:var(--tr-line)] border-t border-[color:var(--tr-line)]">
              {shown.map((item) => (
                <FullNewsRow key={item.id} item={item} />
              ))}
            </ul>
            {list.length > limit && (
              <LoadMoreButton
                remaining={Math.min(PAGE_SIZE, list.length - limit)}
                onClick={() => setLimit(limit + PAGE_SIZE)}
              />
            )}
          </div>
        )}
      </div>
    </>
  );
}

export function WorldPage() {
  const { data } = useTrendRadar();
  const [limit, setLimit] = useState(18);
  const [lead, ...rest] = data.world.items;
  const list = rest.slice(3);
  const shown = list.slice(0, limit);

  return (
    <>
      <PageHeader
        icon={<IconGlobe />}
        title="Tin thế giới"
        description={<Updated source="Nguồn: VnExpress Thế giới" />}
      />
      {data.world.error || !lead ? (
        <SourceNotice>
          {data.world.error ?? 'Chưa có tin thế giới.'} {RETRY}
        </SourceNotice>
      ) : (
        <div className={SHEET}>
          <LeadGroup lead={lead} side={rest.slice(0, 3)} />
          <ul className="mt-6 grid gap-x-5 gap-y-7 border-t border-[color:var(--tr-line)] pt-6 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((item) => (
              <NewsCard key={item.id} item={item} />
            ))}
          </ul>
          {list.length > limit && (
            <LoadMoreButton
              remaining={Math.min(18, list.length - limit)}
              onClick={() => setLimit(limit + 18)}
            />
          )}
        </div>
      )}
    </>
  );
}

export function TrendsPage() {
  const { data } = useTrendRadar();
  const [tab, setTab] = useState<TrendTab>('top');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const sorted = sortTrends(data.trends.items, tab);
  const selected = sorted.find((t) => t.id === selectedId) ?? sorted[0];

  return (
    <>
      <PageHeader
        icon={<IconTrend className="h-6 w-6" />}
        title="Google Trends Việt Nam"
        description={<Updated source="Từ khoá đang được tìm nhiều nhất trên Google tại Việt Nam" />}
      />
      <div className={SHEET}>
        <Tabs label="Cách xếp từ khoá" tabs={TREND_TABS} value={tab} onChange={setTab} />
        {data.trends.error || !selected ? (
          <SourceNotice>
            {data.trends.error ?? 'Google chưa có từ khoá nổi bật nào.'} {RETRY}
          </SourceNotice>
        ) : (
          <div className="grid gap-5 pt-2 lg:grid-cols-[1fr_1fr] lg:items-start">
            <TrendList
              items={sorted}
              selectedId={selected.id}
              onSelect={setSelectedId}
              maxTraffic={Math.max(1, ...data.trends.items.map((t) => t.trafficValue))}
            />
            <TrendDetail trend={selected} className="lg:sticky lg:top-6 lg:p-5" />
          </div>
        )}
      </div>
      <p className="mt-3 text-[12.5px] text-[color:var(--tr-ink-faint)]">
        Google chỉ công bố khoảng lượt tìm (ví dụ “200+”), không có số chính xác hay biểu đồ theo
        ngày.
      </p>
    </>
  );
}

export function YouTubePage() {
  const { data } = useTrendRadar();
  const videos = data.videos.items;

  return (
    <>
      <PageHeader
        icon={<IconVideo />}
        title="YouTube thịnh hành"
        description={<Updated source="Video phổ biến nhất trên YouTube tại Việt Nam" />}
      />
      {data.videos.error || videos.length === 0 ? (
        <SourceNotice>{data.videos.error ?? 'YouTube chưa trả về video nào.'}</SourceNotice>
      ) : (
        <ul className={`${SHEET} grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3 xl:grid-cols-4`}>
          {videos.map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </ul>
      )}
    </>
  );
}

export function GamePage() {
  const { data } = useTrendRadar();
  const [topic, setTopic] = useState<GameTopicId>('all');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const feed = data.games[topic];
  const shown = feed.items.slice(0, limit);
  const videos = data.gamingVideos.items.slice(0, 12);

  return (
    <>
      <PageHeader
        icon={<IconGamepad />}
        title="Game"
        description={
          <Updated source="Nguồn: GameK, Google News (7 ngày gần nhất), YouTube Gaming" />
        }
      />
      <div className={SHEET}>
        <Tabs
          label="Chủ đề game"
          tabs={GAME_TOPICS}
          value={topic}
          onChange={(id) => {
            setTopic(id);
            setLimit(PAGE_SIZE);
          }}
        />
        {feed.error || feed.items.length === 0 ? (
          <SourceNotice>
            {feed.error ?? 'Chưa có tin nào trong 7 ngày qua.'} {RETRY}
          </SourceNotice>
        ) : (
          <div role="tabpanel">
            <ul className="-mx-1 divide-y divide-[color:var(--tr-line)]">
              {shown.map((item) => (
                <FullNewsRow key={item.id} item={item} />
              ))}
            </ul>
            {feed.items.length > limit && (
              <LoadMoreButton
                remaining={Math.min(PAGE_SIZE, feed.items.length - limit)}
                onClick={() => setLimit(limit + PAGE_SIZE)}
              />
            )}
          </div>
        )}
      </div>

      <h2 className="mb-3 mt-8 flex items-center gap-2.5 text-[20px] font-semibold tracking-[-0.015em] text-[color:var(--tr-ink)]">
        <IconVideo />
        Video game thịnh hành
      </h2>
      {data.gamingVideos.error || videos.length === 0 ? (
        <SourceNotice>
          {data.gamingVideos.error ?? 'YouTube chưa trả về video game nào.'}
        </SourceNotice>
      ) : (
        <ul className={`${SHEET} grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3 xl:grid-cols-4`}>
          {videos.map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </ul>
      )}
    </>
  );
}
