// Mọi nguồn dữ liệu của /trend-radar nằm ở đây, chỉ chạy phía server: trình duyệt không gọi được thẳng
// các nguồn này (bị chặn CORS) và khoá YouTube không được lộ ra bundle. Đổi hay thêm nguồn chỉ sửa file này.

import { GAME_TOPICS, VN_CATEGORIES, type GameTopicId, type VnCategoryId } from './categories';
import { parseNewsRss, parseTrendsRss, type NewsItem, type TrendItem } from './rss';

/** Lấy lại dữ liệu nguồn tối đa mỗi 15 phút; mọi người xem dùng chung một bản. */
export const REFRESH_SECONDS = 900;

export type Feed<T> = { items: T[]; error: string | null };

export type VideoItem = {
  id: string;
  title: string;
  channel: string;
  url: string;
  thumbnail: string;
  views: number;
  /** ISO 8601, ví dụ "PT4M13S" */
  duration: string;
  /** ISO 8601 */
  publishedAt: string;
};

export type TrendRadarData = {
  fetchedAt: string;
  vietnam: Record<VnCategoryId, Feed<NewsItem>>;
  world: Feed<NewsItem>;
  trends: Feed<TrendItem>;
  videos: Feed<VideoItem>;
  games: Record<GameTopicId, Feed<NewsItem>>;
  gamingVideos: Feed<VideoItem>;
};

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    next: { revalidate: REFRESH_SECONDS },
    // Google Trends trả lỗi cho request không có User-Agent của trình duyệt.
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; TrendRadar/1.0)' },
  });
  if (!res.ok) throw new Error(`${new URL(url).hostname} trả về ${res.status}`);
  return res.text();
}

async function load<T>(task: () => Promise<T[]>, sourceName: string): Promise<Feed<T>> {
  try {
    return { items: await task(), error: null };
  } catch (err) {
    console.error(`[trend-radar] ${sourceName}:`, err);
    return { items: [], error: `Không tải được ${sourceName} lúc này.` };
  }
}

function vnexpress(feed: string): Promise<Feed<NewsItem>> {
  return load(
    async () => parseNewsRss(await fetchText(`https://vnexpress.net/rss/${feed}.rss`), 'VnExpress'),
    'tin VnExpress',
  );
}

// Chỉ các chuyên mục game của GameK. Không dùng home.rss vì lẫn nhiều tin mạng xã hội; và GameK trả về
// chính home.rss cho mọi đường dẫn sai, nên thêm chuyên mục mới phải kiểm tra tin trả về có khác trang chủ không.
const GAMEK_FEEDS = ['game-online', 'esport', 'pc-console'];

function gamek(): Promise<Feed<NewsItem>> {
  return load(async () => {
    const feeds = await Promise.all(
      GAMEK_FEEDS.map(async (f) =>
        parseNewsRss(await fetchText(`https://gamek.vn/${f}.rss`), 'GameK'),
      ),
    );
    // Một bài có thể nằm ở nhiều chuyên mục; gộp theo đường dẫn rồi xếp mới nhất lên đầu.
    const unique = new Map(feeds.flat().map((item) => [item.url, item]));
    return [...unique.values()].sort(
      (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
    );
  }, 'tin GameK');
}

/**
 * Tin theo từ khoá từ Google News, chỉ lấy 7 ngày gần nhất. Đây là RSS công khai chứ không phải API chính thức,
 * nên Google có thể đổi định dạng; khi đó khối này báo lỗi riêng, các khối khác vẫn chạy.
 */
function googleNews(query: string, label: string): Promise<Feed<NewsItem>> {
  const params = new URLSearchParams({ q: `${query} when:7d`, hl: 'vi', gl: 'VN', ceid: 'VN:vi' });
  return load(async () => {
    const items = parseNewsRss(
      await fetchText(`https://news.google.com/rss/search?${params}`),
      'Google News',
    );
    // Google xếp theo độ liên quan; ở đây cần tin mới nhất lên đầu. Phần mô tả chỉ lặp lại tiêu đề nên bỏ.
    return items
      .map((item) => ({ ...item, summary: '' }))
      .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  }, `tin ${label}`);
}

function googleTrends(): Promise<Feed<TrendItem>> {
  return load(
    async () => parseTrendsRss(await fetchText('https://trends.google.com/trending/rss?geo=VN')),
    'Google Trends',
  );
}

type YouTubeVideo = {
  id: string;
  snippet: {
    title: string;
    channelTitle: string;
    publishedAt: string;
    thumbnails: Record<string, { url: string } | undefined>;
  };
  statistics?: { viewCount?: string };
  contentDetails?: { duration?: string };
};

/** Video thịnh hành tại Việt Nam; `categoryId` lọc theo thể loại của YouTube (20 là Gaming). */
async function youtubeTrending(categoryId?: string): Promise<Feed<VideoItem>> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key)
    return { items: [], error: 'Chưa cấu hình YOUTUBE_API_KEY nên chưa có video thịnh hành.' };

  return load(async () => {
    const params = new URLSearchParams({
      part: 'snippet,statistics,contentDetails',
      chart: 'mostPopular',
      regionCode: 'VN',
      maxResults: '24',
      key,
    });
    if (categoryId) params.set('videoCategoryId', categoryId);
    const body = JSON.parse(
      await fetchText(`https://www.googleapis.com/youtube/v3/videos?${params}`),
    ) as { items?: YouTubeVideo[] };
    return (body.items ?? []).map((v) => {
      const t = v.snippet.thumbnails;
      return {
        id: v.id,
        title: v.snippet.title,
        channel: v.snippet.channelTitle,
        url: `https://www.youtube.com/watch?v=${v.id}`,
        thumbnail: (t.high ?? t.medium ?? t.default)?.url ?? '',
        views: Number(v.statistics?.viewCount ?? 0),
        duration: v.contentDetails?.duration ?? '',
        publishedAt: v.snippet.publishedAt,
      };
    });
  }, 'YouTube thịnh hành');
}

export async function loadTrendRadar(): Promise<TrendRadarData> {
  const [vnFeeds, world, trends, videos, gameFeeds, gamingVideos] = await Promise.all([
    Promise.all(VN_CATEGORIES.map((c) => vnexpress(c.feed))),
    vnexpress('the-gioi'),
    googleTrends(),
    youtubeTrending(),
    Promise.all(GAME_TOPICS.map((t) => (t.query ? googleNews(t.query, t.label) : gamek()))),
    youtubeTrending('20'),
  ]);

  const vietnam = Object.fromEntries(VN_CATEGORIES.map((c, i) => [c.id, vnFeeds[i]])) as Record<
    VnCategoryId,
    Feed<NewsItem>
  >;

  const games = Object.fromEntries(GAME_TOPICS.map((t, i) => [t.id, gameFeeds[i]])) as Record<
    GameTopicId,
    Feed<NewsItem>
  >;

  return {
    fetchedAt: new Date().toISOString(),
    vietnam,
    world,
    trends,
    videos,
    games,
    gamingVideos,
  };
}
