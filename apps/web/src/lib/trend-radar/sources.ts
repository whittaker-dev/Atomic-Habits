// Mọi nguồn dữ liệu của /trend-radar nằm ở đây, chỉ chạy phía server: trình duyệt không gọi được thẳng
// các nguồn này (bị chặn CORS) và khoá YouTube không được lộ ra bundle. Đổi hay thêm nguồn chỉ sửa file này.

import { GAME_TOPICS, VN_CATEGORIES, type GameTopicId, type VnCategoryId } from './categories';
import { curatedCityName } from './destinations';
import { parseNewsRss, parseTrendsRss, type NewsItem, type TrendItem } from './rss';
import { parseListings, type Listing } from './wikivoyage';

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

/**
 * Chờ một nguồn tối đa bấy nhiêu mili giây. Trang chờ nguồn chậm nhất, nên không có giới hạn này thì một nguồn ì
 * (World Bank có lúc mất 5 giây trở lên) làm cả trang đứng; quá hạn thì khối đó báo lỗi riêng, khối khác vẫn hiện.
 */
const SOURCE_TIMEOUT_MS = 6000;

// Google Trends trả lỗi cho request không có User-Agent kiểu trình duyệt. Wikimedia (Wikipedia, Wikivoyage,
// Wikidata) thì ngược lại: chính sách của họ đòi User-Agent nói rõ ứng dụng, và siết chặt chuỗi giả trình duyệt.
// https://meta.wikimedia.org/wiki/User-Agent_policy
const BROWSER_LIKE_AGENT = 'Mozilla/5.0 (compatible; TrendRadar/1.0)';
const WIKIMEDIA_AGENT = 'TrendRadarVN/1.0 (personal news and travel dashboard)';
const WIKIMEDIA_HOST = /(^|\.)(wikipedia|wikivoyage|wikidata)\.org$/;

async function fetchText(url: string, revalidate = REFRESH_SECONDS): Promise<string> {
  const host = new URL(url).hostname;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
    next: { revalidate },
    headers: { 'user-agent': WIKIMEDIA_HOST.test(host) ? WIKIMEDIA_AGENT : BROWSER_LIKE_AGENT },
  });
  if (!res.ok) throw new Error(`${host} trả về ${res.status}`);
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
  population?: number;
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
  // Nguồn xếp theo độ giống tên, nên làng nhỏ trùng tên có thể đứng trước thành phố; đưa nơi đông dân lên trước.
  return (body.results ?? [])
    .filter((r) => r.feature_code?.startsWith('PPL'))
    .sort((a, b) => (b.population ?? 0) - (a.population ?? 0))
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
  // Tên gợi ý có sẵn (kể cả tên Hán Việt như "Bắc Kinh", "Đại Lý") đã là cách báo Việt viết, giữ nguyên dấu.
  return place.countryCode === 'VN' || curatedCityName(place.id)
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

// ---------------------------------------------------------------------------
// Du lịch: địa điểm nổi bật, ăn chơi ngủ kèm giá tham khảo, giá phòng khách sạn
// ---------------------------------------------------------------------------

export type Attraction = {
  title: string;
  description: string | null;
  url: string;
  thumbnail: string | null;
};

export type GuidePage = { title: string; url: string };

export type HotelRate = {
  name: string;
  url: string;
  image: string | null;
  rating: number | null;
  reviews: number | null;
  /** Giá một đêm theo từng trang đặt phòng, rẻ nhất trước */
  rates: { provider: string; price: number }[];
};

export type PlaceExtras = {
  attractions: Feed<Attraction>;
  /** Mục xem, chơi, ăn, uống, ngủ từ Wikivoyage, và các bài đã lấy */
  guide: Feed<Listing>;
  guidePages: GuidePage[];
  hotels: Feed<HotelRate>;
  /** Ngày nhận phòng của giá phòng, "YYYY-MM-DD" */
  checkIn: string;
  currency: string;
};

/**
 * Wikipedia gắn toạ độ cho mọi loại bài, nên bỏ những loại không phải chỗ để đi chơi: đơn vị hành chính,
 * trường học, công ty, sự kiện, nhà ga, sân bay, bệnh viện, đường sá.
 */
const NOT_ATTRACTION =
  /(phường|quận|xã|huyện|tỉnh|thị xã|thị trấn|thành phố|đơn vị hành chính|làng|thôn|ấp|đại học|trường|học viện|cơ sở giáo dục|công ty|tập đoàn|holdings|ngân hàng|vụ |sự kiện|trận |sân bay|nhà ga|\bga |tuyến|quốc lộ|bệnh viện|đại sứ quán)/i;

type WikiGeoPage = {
  title: string;
  description?: string;
  thumbnail?: { source: string };
  index?: number;
};

/** Bài Wikipedia tiếng Việt có toạ độ trong bán kính 10 km, bỏ đơn vị hành chính, bài có ảnh lên trước. */
/** `center`: tâm để tìm, mặc định toạ độ của nơi; dùng toạ độ bài Wikivoyage khi có, vì đó là khu du lịch. */
function attractions(place: Place, center: Coordinates | null): Promise<Feed<Attraction>> {
  const { lat, lon } = center ?? { lat: place.latitude, lon: place.longitude };
  return load(async () => {
    const params = new URLSearchParams({
      action: 'query',
      generator: 'geosearch',
      ggscoord: `${lat}|${lon}`,
      ggsradius: '10000',
      ggslimit: '30',
      prop: 'pageimages|description',
      piprop: 'thumbnail',
      pithumbsize: '400',
      format: 'json',
      formatversion: '2',
    });
    const body = JSON.parse(
      await fetchText(`https://vi.wikipedia.org/w/api.php?${params}`, ONE_DAY),
    ) as { query?: { pages?: WikiGeoPage[] } };
    return (body.query?.pages ?? [])
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
      .filter(
        (p) => p.title !== place.name && !NOT_ATTRACTION.test(`${p.title} ${p.description ?? ''}`),
      )
      .sort((a, b) => Number(Boolean(b.thumbnail)) - Number(Boolean(a.thumbnail)))
      .slice(0, 8)
      .map((p) => ({
        title: p.title,
        description: p.description ?? null,
        url: `https://vi.wikipedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, '_'))}`,
        thumbnail: p.thumbnail?.source ?? null,
      }));
  }, 'địa điểm từ Wikipedia');
}

const WIKIVOYAGE = 'https://en.wikivoyage.org';

/**
 * Mục ăn chơi ngủ từ Wikivoyage tiếng Anh (bản tiếng Việt không có mục có cấu trúc). Bài gần toạ độ nhất là bài
 * của thành phố; thành phố lớn (Tokyo, Paris…) để các mục ở bài con theo quận, nên lấy thêm 2 bài quận gần nhất.
 */
/** Tên bài Wikivoyage gần toạ độ nhất: bài thành phố trước, rồi tối đa 2 bài quận của nó. */
type Coordinates = { lat: number; lon: number };

function guidePage(title: string): GuidePage {
  return { title, url: `${WIKIVOYAGE}/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}` };
}

/** Tên tiếng Anh của địa điểm (ví dụ "Dali" cho Đại Lý), thường trùng tên bài Wikivoyage. */
async function englishName(place: Place): Promise<string | null> {
  const params = new URLSearchParams({ id: String(place.id), language: 'en' });
  const r = JSON.parse(
    await fetchText(`${GEOCODING}/get?${params}`, ONE_DAY),
  ) as Partial<GeoResult>;
  return r.name ? r.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : null;
}

/**
 * Bài Wikivoyage của nơi này: bài thành phố trước, rồi tối đa 2 bài quận của nó; kèm toạ độ của bài.
 * Tìm theo toạ độ trước (bán kính tối đa 10 km). Không ra thì tìm theo tên tiếng Anh, vì toạ độ trong nguồn địa
 * danh có khi là trung tâm hành chính xa khu du lịch: "Đại Lý" là thành phố mới Hạ Quan, còn bài "Dali" đặt ở
 * cổ trấn cách đó khoảng 14 km.
 */
async function wikivoyagePages(
  place: Place,
): Promise<{ pages: GuidePage[]; center: Coordinates | null }> {
  const params = new URLSearchParams({
    action: 'query',
    list: 'geosearch',
    gscoord: `${place.latitude}|${place.longitude}`,
    gsradius: '10000',
    gslimit: '10',
    format: 'json',
  });
  const body = JSON.parse(await fetchText(`${WIKIVOYAGE}/w/api.php?${params}`, ONE_DAY)) as {
    query?: { geosearch?: { title: string; lat: number; lon: number }[] };
  };
  const nearby = body.query?.geosearch ?? [];
  const main = nearby.find((r) => !r.title.includes('/'));
  if (main) {
    const districts = nearby.filter((r) => r.title.startsWith(`${main.title}/`)).slice(0, 2);
    return {
      pages: [main, ...districts].map((r) => guidePage(r.title)),
      center: { lat: main.lat, lon: main.lon },
    };
  }

  const name = await englishName(place);
  if (!name) return { pages: [], center: null };
  const byTitle = new URLSearchParams({
    action: 'query',
    titles: name,
    redirects: '1',
    prop: 'coordinates',
    format: 'json',
    formatversion: '2',
  });
  const found = JSON.parse(await fetchText(`${WIKIVOYAGE}/w/api.php?${byTitle}`, ONE_DAY)) as {
    query?: { pages?: { title: string; missing?: boolean; coordinates?: Coordinates[] }[] };
  };
  const page = found.query?.pages?.[0];
  const coords = page?.coordinates?.[0];
  // Cùng tên có thể là nơi khác hẳn (Paris ở Texas); chỉ nhận bài cách toạ độ của nơi đang xem dưới 50 km.
  if (
    !page ||
    page.missing ||
    !coords ||
    distanceKm(coords, { lat: place.latitude, lon: place.longitude }) > 50
  ) {
    return { pages: [], center: null };
  }
  return { pages: [guidePage(page.title)], center: coords };
}

function distanceKm(a: Coordinates, b: Coordinates): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

function guide(pages: GuidePage[]): Promise<Feed<Listing>> {
  return load(async () => {
    const texts = await Promise.all(
      pages.map((p) =>
        fetchText(
          `${WIKIVOYAGE}/w/index.php?title=${encodeURIComponent(p.title)}&action=raw`,
          ONE_DAY,
        ),
      ),
    );
    // Một chỗ có thể nằm ở cả bài chính lẫn bài quận; giữ lần xuất hiện đầu tiên.
    const unique = new Map(texts.flatMap(parseListings).map((l) => [`${l.kind}|${l.name}`, l]));
    return [...unique.values()];
  }, 'hướng dẫn từ Wikivoyage');
}

/**
 * Mã địa điểm TripAdvisor của nơi này, tra trên Wikidata theo hai đường: mã GeoNames, hoặc mục Wikidata của bài
 * Wikivoyage. Cần cả hai vì không đường nào đủ: Đà Nẵng chỉ có qua bài Wikivoyage, Tokyo chỉ có qua GeoNames.
 * null khi Wikidata không ghi mã.
 */
async function tripAdvisorId(
  place: Place,
  wikivoyageTitle: string | undefined,
): Promise<string | null> {
  const viaGuide = wikivoyageTitle
    ? `UNION { <${WIKIVOYAGE}/wiki/${encodeURIComponent(wikivoyageTitle.replace(/ /g, '_'))}> schema:about ?item . }`
    : '';
  const query = `SELECT ?ta WHERE { { ?item wdt:P1566 "${place.id}" . } ${viaGuide} ?item wdt:P3134 ?ta . } LIMIT 1`;
  const body = JSON.parse(
    await fetchText(
      `https://query.wikidata.org/sparql?${new URLSearchParams({ query, format: 'json' })}`,
      ONE_DAY,
    ),
  ) as { results: { bindings: { ta: { value: string } }[] } };
  const id = body.results.bindings[0]?.ta.value;
  return id && /^\d+$/.test(id) ? id : null;
}

type XoteloHotel = {
  name: string;
  key: string;
  url: string;
  image?: string;
  review_summary?: { rating?: number; count?: number };
};

/**
 * Giá phòng một đêm của vài khách sạn được đánh giá cao, lấy qua Xotelo (dịch vụ miễn phí, không chính thức,
 * đọc từ TripAdvisor). Có thể ngừng bất cứ lúc nào; khi đó khối này báo lỗi riêng.
 */
async function hotels(
  place: Place,
  wikivoyageTitle: string | undefined,
  checkIn: string,
  checkOut: string,
): Promise<Feed<HotelRate>> {
  let id: string | null;
  try {
    id = await tripAdvisorId(place, wikivoyageTitle);
  } catch (err) {
    console.error('[trend-radar] Wikidata', place.id, err);
    return { items: [], error: 'Không tra được mã khách sạn của nơi này lúc này.' };
  }
  if (!id) return { items: [], error: `Chưa có dữ liệu giá phòng cho ${place.name}.` };

  return load(async () => {
    const list = JSON.parse(
      await fetchText(
        `https://data.xotelo.com/api/list?location_key=g${id}&limit=6&sort=best_value`,
        ONE_DAY,
      ),
    ) as { result?: { list?: XoteloHotel[] } };
    const found = list.result?.list ?? [];

    const withRates = await Promise.all(
      found.map(async (h): Promise<HotelRate | null> => {
        try {
          const params = new URLSearchParams({
            hotel_key: h.key,
            chk_in: checkIn,
            chk_out: checkOut,
          });
          const body = JSON.parse(
            await fetchText(`https://data.xotelo.com/api/rates?${params}`),
          ) as { result?: { rates?: { name: string; rate: number }[] } };
          const rates = (body.result?.rates ?? [])
            .filter((r) => r.rate > 0)
            .map((r) => ({ provider: r.name, price: r.rate }))
            .sort((a, b) => a.price - b.price);
          return {
            name: h.name,
            url: h.url,
            image: h.image ?? null,
            rating: h.review_summary?.rating ?? null,
            reviews: h.review_summary?.count ?? null,
            rates,
          };
        } catch {
          // Một khách sạn lỗi giá thì bỏ khách sạn đó, các khách sạn khác vẫn hiện.
          return null;
        }
      }),
    );
    return withRates.filter((h): h is HotelRate => h !== null && h.rates.length > 0);
  }, 'giá phòng');
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function loadPlaceExtras(place: Place): Promise<PlaceExtras> {
  // Giá cho đêm mai (theo giờ UTC của server), đủ để so sánh mặt bằng giá giữa các khách sạn.
  const day = 86_400_000;
  const checkIn = isoDate(new Date(Date.now() + day));
  const checkOut = isoDate(new Date(Date.now() + 2 * day));

  const { pages, center } = await wikivoyagePages(place).catch((err: unknown) => {
    console.error('[trend-radar] Wikivoyage', place.id, err);
    return { pages: [] as GuidePage[], center: null };
  });
  const [attractionsFeed, guideFeed, hotelsFeed] = await Promise.all([
    attractions(place, center),
    pages.length ? guide(pages) : Promise.resolve({ items: [], error: null }),
    hotels(place, pages[0]?.title, checkIn, checkOut),
  ]);
  return {
    attractions: attractionsFeed,
    guide: guideFeed,
    guidePages: pages,
    hotels: hotelsFeed,
    checkIn,
    currency: 'USD',
  };
}
