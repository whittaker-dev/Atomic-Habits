// Mọi nguồn dữ liệu của /trend-radar nằm ở đây, chỉ chạy phía server: trình duyệt không gọi được thẳng
// các nguồn này (bị chặn CORS) và khoá YouTube không được lộ ra bundle. Đổi hay thêm nguồn chỉ sửa file này.

import { GAME_TOPICS, VN_CATEGORIES, type GameTopicId, type VnCategoryId } from './categories';
import { curatedCityName } from './destinations';
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
  /** Tin thị trường du lịch chung (VnExpress Du lịch). */
  travel: Feed<NewsItem>;
};

async function fetchText(url: string, revalidate = REFRESH_SECONDS): Promise<string> {
  const res = await fetch(url, {
    next: { revalidate },
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
 * Tin theo từ khoá từ Google News trong `days` ngày gần nhất. Đây là RSS công khai chứ không phải API chính thức,
 * nên Google có thể đổi định dạng; khi đó khối này báo lỗi riêng, các khối khác vẫn chạy.
 */
// Chữ chỉ tiếng Việt mới có; dùng để nhận ra tiêu đề tiếng Việt khi Google lẫn vào bài tiếng nước ngoài.
const VIETNAMESE_LETTERS = /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;

function googleNews(
  query: string,
  label: string,
  { days = 7, vietnameseOnly = false }: { days?: number; vietnameseOnly?: boolean } = {},
): Promise<Feed<NewsItem>> {
  const params = new URLSearchParams({
    q: `${query} when:${days}d`,
    hl: 'vi',
    gl: 'VN',
    ceid: 'VN:vi',
  });
  return load(async () => {
    const items = parseNewsRss(
      await fetchText(`https://news.google.com/rss/search?${params}`),
      'Google News',
    );
    // Google xếp theo độ liên quan; ở đây cần tin mới nhất lên đầu. Phần mô tả chỉ lặp lại tiêu đề nên bỏ.
    // Dù đã xin kết quả tiếng Việt, Google vẫn trả thêm bài tiếng Anh, Ba Lan… cho từ khoá là tên nước ngoài.
    return items
      .filter((item) => !vietnameseOnly || VIETNAMESE_LETTERS.test(item.title))
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
  const [vnFeeds, world, trends, videos, gameFeeds, gamingVideos, travel] = await Promise.all([
    Promise.all(VN_CATEGORIES.map((c) => vnexpress(c.feed))),
    vnexpress('the-gioi'),
    googleTrends(),
    youtubeTrending(),
    Promise.all(GAME_TOPICS.map((t) => (t.query ? googleNews(t.query, t.label) : gamek()))),
    youtubeTrending('20'),
    vnexpress('du-lich'),
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
    travel,
  };
}

// ---------------------------------------------------------------------------
// Du lịch: địa điểm, thời tiết, lượt khách theo nơi người xem chọn
// ---------------------------------------------------------------------------

export type Place = {
  /** Mã địa điểm của Open-Meteo (GeoNames), dùng trong URL ?noi= */
  id: number;
  name: string;
  /** Tỉnh, bang hoặc vùng; có thể trống */
  region: string | null;
  country: string;
  /** Mã nước 2 chữ, ví dụ "VN" */
  countryCode: string;
  latitude: number;
  longitude: number;
};

export type WeatherDay = {
  /** Ngày theo giờ địa phương, "YYYY-MM-DD" */
  date: string;
  code: number;
  max: number;
  min: number;
  /** Phần trăm khả năng mưa cao nhất trong ngày */
  rainChance: number | null;
};

export type Weather = {
  /** Giờ địa phương lúc đo, "YYYY-MM-DDTHH:mm" */
  localTime: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windKmh: number;
  precipitationMm: number;
  code: number;
  isDay: boolean;
  days: WeatherDay[];
};

export type YearValue = { year: number; value: number };

export type Destination = {
  weather: Weather | null;
  weatherError: string | null;
  placeNews: Feed<NewsItem>;
  countryNews: Feed<NewsItem>;
  arrivalsNews: Feed<NewsItem>;
  /** Lượt khách quốc tế theo năm của cả nước (World Bank), cũ nhất trước */
  arrivalsByYear: Feed<YearValue>;
};

const GEOCODING = 'https://geocoding-api.open-meteo.com/v1';
const ONE_DAY = 86_400;

type GeoResult = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  feature_code?: string;
  country_code?: string;
  country?: string;
  admin1?: string;
};

/** GeoNames ghi vài địa danh Việt bằng chữ Ð/ð của tiếng Iceland (ví dụ "Ðà Lạt"); đổi về Đ/đ tiếng Việt. */
function fixD(text: string): string {
  return text.replace(/\u00d0/g, 'Đ').replace(/\u00f0/g, 'đ');
}

function toPlace(r: GeoResult): Place {
  // Thành phố gợi ý dùng tên đã chọn sẵn (cách báo Việt hay viết), vì tên này còn là từ khoá tìm tin.
  const name = curatedCityName(r.id) ?? fixD(r.name);
  const region = r.admin1 ? fixD(r.admin1) : null;
  return {
    id: r.id,
    name,
    region: region && region !== name ? region : null,
    country: r.country ?? '',
    countryCode: r.country_code ?? '',
    latitude: r.latitude,
    longitude: r.longitude,
  };
}

/**
 * Tìm thành phố theo tên (gõ tiếng Việt có dấu hay không dấu đều được). Chỉ trả nơi có người ở: kết quả là
 * cả một quốc gia thì toạ độ nằm giữa lãnh thổ, thời tiết ở đó không nói lên gì.
 */
export async function searchPlaces(query: string, countryCode?: string): Promise<Place[]> {
  const params = new URLSearchParams({ name: query, count: '12', language: 'vi' });
  if (countryCode) params.set('countryCode', countryCode);
  const body = JSON.parse(await fetchText(`${GEOCODING}/search?${params}`, ONE_DAY)) as {
    results?: GeoResult[];
  };
  return (body.results ?? [])
    .filter((r) => r.feature_code?.startsWith('PPL'))
    .slice(0, 6)
    .map(toPlace);
}

/** Địa điểm theo mã; null khi mã không tồn tại (URL gõ sai hoặc đã cũ). */
export async function getPlace(id: number): Promise<Place | null> {
  try {
    const params = new URLSearchParams({ id: String(id), language: 'vi' });
    const r = JSON.parse(await fetchText(`${GEOCODING}/get?${params}`, ONE_DAY)) as GeoResult;
    return typeof r.id === 'number' && typeof r.latitude === 'number' ? toPlace(r) : null;
  } catch (err) {
    console.error('[trend-radar] địa điểm', id, err);
    return null;
  }
}

type OpenMeteoForecast = {
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
    precipitation: number;
    is_day: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: (number | null)[];
  };
};

async function weather(place: Place): Promise<Weather> {
  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current:
      'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,precipitation,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'auto',
    forecast_days: '7',
  });
  const { current: c, daily: d } = JSON.parse(
    await fetchText(`https://api.open-meteo.com/v1/forecast?${params}`),
  ) as OpenMeteoForecast;
  return {
    localTime: c.time,
    temperature: c.temperature_2m,
    feelsLike: c.apparent_temperature,
    humidity: c.relative_humidity_2m,
    windKmh: c.wind_speed_10m,
    precipitationMm: c.precipitation,
    code: c.weather_code,
    isDay: c.is_day === 1,
    days: d.time.map((date, i) => ({
      date,
      code: d.weather_code[i] ?? 0,
      max: d.temperature_2m_max[i] ?? 0,
      min: d.temperature_2m_min[i] ?? 0,
      rainChance: d.precipitation_probability_max[i] ?? null,
    })),
  };
}

/**
 * Lượt khách quốc tế đến cả nước theo năm (chỉ số ST.INT.ARVL của World Bank). World Bank cập nhật rất chậm:
 * cuối 2026 số mới nhất vẫn là 2019–2020, nên giao diện phải ghi rõ năm. Số theo tháng hay theo thành phố
 * không có nguồn mở nào, chỉ có trong thông cáo báo chí.
 */
function arrivalsByYear(countryCode: string): Promise<Feed<YearValue>> {
  return load(async () => {
    const url = `https://api.worldbank.org/v2/country/${countryCode}/indicator/ST.INT.ARVL?format=json&mrnev=6`;
    const body = JSON.parse(await fetchText(url, ONE_DAY)) as [
      unknown,
      { date: string; value: number | null }[] | null,
    ];
    return (body[1] ?? [])
      .filter((x): x is { date: string; value: number } => x.value !== null)
      .map((x) => ({ year: Number(x.date), value: Math.round(x.value) }))
      .sort((a, b) => a.year - b.year);
  }, 'số liệu World Bank');
}

/** Tên dùng để tìm tin: báo Việt viết "Kyoto" chứ không viết "Kyōto", nên tên nước ngoài được bỏ dấu phụ. */
function newsName(place: Place): string {
  return place.countryCode === 'VN'
    ? place.name
    : place.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export async function loadDestination(place: Place): Promise<Destination> {
  const city = newsName(place);
  // Tin lượt khách: thành phố Việt Nam thì báo có số theo tỉnh, thành; nơi ở nước ngoài thì báo Việt thường viết
  // theo cả nước (ví dụ "khách Việt đến Nhật Bản").
  const arrivalsSubject = place.countryCode === 'VN' ? city : place.country;

  const [w, placeNews, countryNews, arrivalsNews, byYear] = await Promise.all([
    weather(place).then(
      (value) => ({ value, error: null }),
      (err: unknown) => {
        console.error('[trend-radar] thời tiết', place.id, err);
        return { value: null, error: 'Không tải được thời tiết lúc này.' };
      },
    ),
    googleNews(`"du lịch" "${city}"`, `du lịch ${city}`, { vietnameseOnly: true }),
    googleNews(`"du lịch" "${place.country}"`, `du lịch ${place.country}`, {
      vietnameseOnly: true,
    }),
    googleNews(
      `"${arrivalsSubject}" ("lượt khách" OR "khách quốc tế" OR "khách du lịch" OR "lượng du khách")`,
      'tin lượt khách',
      { days: 30, vietnameseOnly: true },
    ),
    arrivalsByYear(place.countryCode),
  ]);

  return {
    weather: w.value,
    weatherError: w.error,
    placeNews,
    countryNews,
    arrivalsNews,
    arrivalsByYear: byYear,
  };
}
