// Đọc RSS của VnExpress và Google Trends. Hai nguồn này có cấu trúc phẳng, ổn định, nên đọc bằng
// biểu thức chính quy là đủ và không phải thêm thư viện XML. Nếu sau này thêm nguồn có XML phức tạp
// hơn (namespace lồng nhau, thẻ trùng tên ở nhiều cấp) thì nên đổi sang một trình đọc XML thật.

export type NewsItem = {
  id: string;
  title: string;
  url: string;
  summary: string;
  image: string | null;
  /** ISO 8601 */
  publishedAt: string;
  source: string;
};

export type TrendNews = { title: string; url: string; source: string };

export type TrendItem = {
  id: string;
  keyword: string;
  /** Nguyên văn từ Google, ví dụ "50K+" */
  traffic: string;
  /** Số để sắp xếp, ví dụ 50000 */
  trafficValue: number;
  /** ISO 8601 */
  startedAt: string;
  image: string | null;
  news: TrendNews[];
};

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === '#') {
      const n =
        code[1] === 'x' || code[1] === 'X'
          ? parseInt(code.slice(2), 16)
          : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

/** Nội dung của thẻ đầu tiên tên `tag` trong `xml`, đã bỏ CDATA; null nếu không có. */
function tagText(xml: string, tag: string): string | null {
  const escaped = tag.replace(':', '\\:');
  const m = xml.match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)</${escaped}>`));
  if (!m) return null;
  const raw = (m[1] ?? '').trim();
  const cdata = raw.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return decodeEntities(cdata ? (cdata[1] ?? '').trim() : raw);
}

function blocks(xml: string, tag: string): string[] {
  const escaped = tag.replace(':', '\\:');
  return xml.match(new RegExp(`<${escaped}(?:\\s[^>]*)?>[\\s\\S]*?</${escaped}>`, 'g')) ?? [];
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toIso(date: string | null): string | null {
  if (!date) return null;
  const t = Date.parse(date);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

/** "200+", "2K+", "1M+" → 200, 2000, 1000000 */
export function parseTraffic(traffic: string): number {
  const m = traffic.replace(/[,.\s]/g, '').match(/^(\d+)([KM]?)/i);
  if (!m) return 0;
  const unit = (m[2] ?? '').toUpperCase();
  return Number(m[1]) * (unit === 'M' ? 1_000_000 : unit === 'K' ? 1_000 : 1);
}

export function parseNewsRss(xml: string, source: string): NewsItem[] {
  const items: NewsItem[] = [];
  for (const block of blocks(xml, 'item')) {
    const title = tagText(block, 'title');
    const url = tagText(block, 'link');
    const publishedAt = toIso(tagText(block, 'pubDate'));
    if (!title || !url || !publishedAt) continue;

    // Google News ghi tên báo trong <source> và gắn " - Tên báo" vào cuối tiêu đề; tách ra cho gọn.
    const outlet = tagText(block, 'source');
    const cleanTitle =
      outlet && title.endsWith(` - ${outlet}`) ? title.slice(0, -(outlet.length + 3)) : title;
    const description = tagText(block, 'description') ?? '';
    const enclosure = block.match(/<enclosure[^>]*\surl="([^"]+)"/);
    const inlineImage = description.match(/<img[^>]*\ssrc="([^"]+)"/);
    const image = enclosure?.[1] ? decodeEntities(enclosure[1]) : (inlineImage?.[1] ?? null);

    items.push({
      id: url,
      title: cleanTitle,
      url,
      summary: stripHtml(description),
      image,
      publishedAt,
      source: outlet ?? source,
    });
  }
  return items;
}

export function parseTrendsRss(xml: string): TrendItem[] {
  const items: TrendItem[] = [];
  for (const block of blocks(xml, 'item')) {
    const keyword = tagText(block, 'title');
    const startedAt = toIso(tagText(block, 'pubDate'));
    if (!keyword || !startedAt) continue;

    const traffic = tagText(block, 'ht:approx_traffic') ?? '';
    const news = blocks(block, 'ht:news_item').flatMap((n) => {
      const title = tagText(n, 'ht:news_item_title');
      const url = tagText(n, 'ht:news_item_url');
      return title && url ? [{ title, url, source: tagText(n, 'ht:news_item_source') ?? '' }] : [];
    });

    items.push({
      id: `${keyword}|${startedAt}`,
      keyword,
      traffic,
      trafficValue: parseTraffic(traffic),
      startedAt,
      image: tagText(block, 'ht:picture'),
      news,
    });
  }
  return items;
}
