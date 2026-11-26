// Đọc các mục "xem, chơi, ăn, uống, ngủ" trong mã nguồn bài Wikivoyage. Mỗi mục là một template dạng
// {{see | name=... | price=... | content=... }} (hoặc {{listing | type=see ...}}), có thể chứa link [[...]] và
// template lồng nhau, nên phải đếm ngoặc thay vì cắt bằng biểu thức chính quy.
// Mô tả template: https://en.wikivoyage.org/wiki/Template:Listing

export type ListingKind = 'see' | 'do' | 'eat' | 'drink' | 'sleep';

export type Listing = {
  kind: ListingKind;
  name: string;
  /** Tên khác, thường là tên tiếng địa phương (ví dụ "Bảo Tàng Chăm") */
  alt: string | null;
  price: string | null;
  hours: string | null;
  address: string | null;
  description: string | null;
  url: string | null;
  /** Ngày cộng đồng sửa mục này lần cuối, "YYYY-MM-DD" */
  updated: string | null;
};

const KINDS = new Set<string>(['see', 'do', 'eat', 'drink', 'sleep']);
const START = /\{\{\s*(see|do|eat|drink|sleep|buy|listing)\s*\|/gi;
const DESCRIPTION_LIMIT = 220;

/** Vị trí của "}}" đóng template mở ở `start`, hoặc -1 nếu template không đóng. */
function templateEnd(text: string, start: number): number {
  let depth = 0;
  for (let i = start; i < text.length - 1; i++) {
    if (text[i] === '{' && text[i + 1] === '{') {
      depth++;
      i++;
    } else if (text[i] === '}' && text[i + 1] === '}') {
      depth--;
      if (depth === 0) return i;
      i++;
    }
  }
  return -1;
}

/** Tách tham số theo dấu "|" nằm ngoài [[...]] và {{...}} lồng bên trong. */
function splitParams(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < body.length; i++) {
    const pair = body.slice(i, i + 2);
    if (pair === '{{' || pair === '[[') {
      depth++;
      current += pair;
      i++;
    } else if ((pair === '}}' || pair === ']]') && depth > 0) {
      depth--;
      current += pair;
      i++;
    } else if (body[i] === '|' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += body[i];
    }
  }
  parts.push(current);
  return parts;
}

/** Bỏ cú pháp wiki, chỉ giữ chữ đọc được; chuỗi rỗng thành null. */
export function cleanWikiText(value: string | undefined): string | null {
  if (!value) return null;
  const text = value
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<ref[\s\S]*?(<\/ref>|\/>)/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/\[https?:\/\/\S+\s+([^\]]+)\]/g, '$1')
    .replace(/\[https?:\/\/\S+\]/g, '')
    .replace(/'{2,}/g, '')
    // Template có tham số (ví dụ {{nowrap|to the}}) thì giữ tham số cuối để không mất chữ hay con số bên trong;
    // template không tham số thì bỏ.
    .replace(/\{\{[^{}|]*\|([^{}]*)\}\}/g, (_, args: string) => args.split('|').pop() ?? '')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text || null;
}

function shorten(text: string | null, limit: number): string | null {
  if (!text || text.length <= limit) return text;
  const cut = text.slice(0, limit);
  return `${cut.slice(0, cut.lastIndexOf(' ') > 0 ? cut.lastIndexOf(' ') : limit)}…`;
}

export function parseListings(wikitext: string): Listing[] {
  const listings: Listing[] = [];
  START.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = START.exec(wikitext))) {
    const end = templateEnd(wikitext, match.index);
    if (end < 0) break;
    START.lastIndex = end + 2;

    const params: Record<string, string> = {};
    for (const part of splitParams(wikitext.slice(match.index + 2, end)).slice(1)) {
      const eq = part.indexOf('=');
      if (eq > 0) params[part.slice(0, eq).trim().toLowerCase()] = part.slice(eq + 1).trim();
    }

    const tag = (match[1] ?? '').toLowerCase();
    const kind = tag === 'listing' ? (params.type ?? '').trim().toLowerCase() : tag;
    const name = cleanWikiText(params.name);
    if (!KINDS.has(kind) || !name) continue;

    const url = params.url?.trim();
    listings.push({
      kind: kind as ListingKind,
      name,
      alt: cleanWikiText(params.alt),
      price: cleanWikiText(params.price),
      hours: cleanWikiText(params.hours),
      address: cleanWikiText(params.address),
      description: shorten(cleanWikiText(params.content ?? params.description), DESCRIPTION_LIMIT),
      url: url && /^https?:\/\//.test(url) ? url : null,
      updated: /^\d{4}-\d{2}-\d{2}$/.test(params.lastedit?.trim() ?? '')
        ? params.lastedit!.trim()
        : null,
    });
  }
  return listings;
}
