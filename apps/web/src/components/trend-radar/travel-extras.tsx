import Image from 'next/image';
import { POPULAR_DESTINATIONS } from '@/lib/trend-radar/destinations';
import {
  loadPlaceExtras,
  type HotelRate,
  type Place,
  type PlaceExtras,
} from '@/lib/trend-radar/sources';
import { cn } from '@/lib/utils';
import { foldText } from './format';
import { GuideList } from './guide-list';
import { FOCUS, IconArrow, IconPlane, Panel, SourceNotice } from './ui';

// Phần dưới của trang Du lịch: địa điểm nổi bật, giá phòng, ăn chơi ngủ kèm giá tham khảo, link đặt tour.
// Component server chạy trong <Suspense> (page.tsx): các nguồn này chậm hơn (có nơi tới vài giây), nên thời tiết
// và tin ở phần trên hiện trước, phần này hiện khi có dữ liệu.

export async function TravelExtras({ place }: { place: Place }) {
  const extras = await loadPlaceExtras(place);
  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Attractions place={place} extras={extras} />
        <Hotels place={place} extras={extras} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Panel id="an-choi-ngu" title="Ăn, chơi, ngủ: giá tham khảo" icon={<IconPlane />}>
          {extras.guide.error || extras.guide.items.length === 0 ? (
            <SourceNotice>
              {extras.guide.error ?? `Wikivoyage chưa có hướng dẫn cho ${place.name}.`}
            </SourceNotice>
          ) : (
            <>
              <GuideList listings={extras.guide.items} />
              <p className="mt-3 text-[12px] leading-relaxed text-[color:var(--tr-ink-faint)]">
                Nguồn: Wikivoyage tiếng Anh (
                {extras.guidePages.map((p, i) => (
                  <span key={p.url}>
                    {i > 0 && ', '}
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2"
                    >
                      {p.title}
                    </a>
                  </span>
                ))}
                ), do cộng đồng viết. Giá có thể đã cũ, xem năm cập nhật bên cạnh từng mục.
              </p>
            </>
          )}
        </Panel>
        <Tours place={place} />
      </div>
    </>
  );
}

export function TravelExtrasSkeleton() {
  return (
    <div
      aria-hidden
      className="grid grid-cols-1 gap-4 lg:gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]"
    >
      {[0, 1].map((i) => (
        <div
          key={i}
          className="min-w-0 rounded-2xl border border-[color:var(--tr-line)] bg-white p-5"
        >
          <div className="h-5 w-40 animate-pulse rounded bg-[color:var(--tr-ground)]" />
          <div className="mt-5 flex flex-col gap-3">
            {[0, 1, 2, 3].map((j) => (
              <div key={j} className="flex gap-3">
                <div className="h-14 w-14 shrink-0 animate-pulse rounded-lg bg-[color:var(--tr-ground)]" />
                <div className="flex-1">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-[color:var(--tr-ground)]" />
                  <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-[color:var(--tr-ground)]" />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[12.5px] text-[color:var(--tr-ink-faint)]">
            {i === 0 ? 'Đang tìm địa điểm nổi bật…' : 'Đang lấy giá phòng…'}
          </p>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------

function Attractions({ place, extras }: { place: Place; extras: PlaceExtras }) {
  const { attractions } = extras;
  return (
    <Panel id="dia-diem" title="Địa điểm nổi bật" icon={<IconPlane />}>
      {attractions.error || attractions.items.length === 0 ? (
        <SourceNotice>
          {attractions.error ?? `Wikipedia tiếng Việt chưa có bài về địa điểm quanh ${place.name}.`}
        </SourceNotice>
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-4">
            {attractions.items.map((a) => (
              <li key={a.url}>
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn('group block rounded-xl', FOCUS)}
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[color:var(--tr-blue-wash)]">
                    {a.thumbnail && (
                      <Image
                        src={a.thumbnail}
                        alt=""
                        fill
                        sizes="(min-width: 1280px) 160px, (min-width: 640px) 25vw, 50vw"
                        className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                      />
                    )}
                  </div>
                  <p className="mt-2 line-clamp-2 text-[14px] font-semibold leading-snug text-[color:var(--tr-ink)] group-hover:text-[color:var(--tr-blue-deep)]">
                    {a.title}
                  </p>
                  {a.description && (
                    <p className="mt-0.5 line-clamp-2 text-[12.5px] text-[color:var(--tr-ink-faint)]">
                      {a.description}
                    </p>
                  )}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] text-[color:var(--tr-ink-faint)]">
            Nguồn: Wikipedia tiếng Việt, các bài có toạ độ trong bán kính 10 km.
          </p>
        </>
      )}
    </Panel>
  );
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function HotelRow({ hotel }: { hotel: HotelRate }) {
  const [best, ...others] = hotel.rates;
  return (
    <li className="flex gap-3 py-3">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[color:var(--tr-blue-wash)]">
        {hotel.image && (
          <Image src={hotel.image} alt="" fill sizes="64px" className="object-cover" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <a
          href={hotel.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'line-clamp-2 rounded text-[14.5px] font-semibold leading-snug text-[color:var(--tr-ink)] hover:text-[color:var(--tr-blue-deep)] hover:underline',
            FOCUS,
          )}
        >
          {hotel.name}
        </a>
        {hotel.rating !== null && (
          <p className="mt-0.5 text-[12.5px] text-[color:var(--tr-ink-faint)]">
            <span className="font-semibold text-[color:var(--tr-ink-soft)]">
              {hotel.rating.toLocaleString('vi-VN')}
            </span>
            /5
            {hotel.reviews !== null && ` · ${hotel.reviews.toLocaleString('vi-VN')} đánh giá`}
          </p>
        )}
        {others.length > 0 && (
          <p className="mt-0.5 truncate text-[12px] text-[color:var(--tr-ink-faint)]">
            {others
              .map((r) => `${r.provider.replace(/\.com$/, '')} $${Math.round(r.price)}`)
              .join(' · ')}
          </p>
        )}
      </div>
      {best && (
        <div className="shrink-0 text-right">
          <p className="text-[19px] font-bold leading-none tabular-nums text-[color:var(--tr-ink)]">
            ${Math.round(best.price)}
          </p>
          <p className="mt-1 text-[11.5px] text-[color:var(--tr-ink-faint)]">
            {best.provider.replace(/\.com$/, '')}
          </p>
        </div>
      )}
    </li>
  );
}

function Hotels({ place, extras }: { place: Place; extras: PlaceExtras }) {
  const { hotels } = extras;
  return (
    <Panel id="gia-phong" title="Giá phòng một đêm" icon={<IconPlane />}>
      {hotels.error || hotels.items.length === 0 ? (
        <SourceNotice>{hotels.error ?? `Chưa lấy được giá phòng cho ${place.name}.`}</SourceNotice>
      ) : (
        <>
          <p className="text-[13px] text-[color:var(--tr-ink-soft)]">
            Nhận phòng {formatDate(extras.checkIn)}, giá rẻ nhất tìm được cho 1 phòng 1 đêm (đơn vị{' '}
            {extras.currency}).
          </p>
          <ul className="divide-y divide-[color:var(--tr-line)]">
            {hotels.items.map((h) => (
              <HotelRow key={h.url} hotel={h} />
            ))}
          </ul>
          <p className="mt-2 text-[12px] leading-relaxed text-[color:var(--tr-ink-faint)]">
            Nguồn: Xotelo, đọc giá từ TripAdvisor. Đây là dịch vụ miễn phí, không chính thức; giá có
            thể chưa gồm thuế phí và đổi theo giờ.
          </p>
        </>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Link đặt tour ở công ty Việt Nam. TrendRadar không đọc giá từ các trang này (họ không có API, và bóc trang
// dễ vi phạm điều khoản, lại hỏng mỗi lần họ đổi giao diện), nên chỉ dẫn sang đúng trang của nơi đang chọn.
// ---------------------------------------------------------------------------

function slug(text: string): string {
  return foldText(text)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Trang Vietravel đặt tên khác tên hiển thị ở đây (kiểm tra tay trên travel.com.vn).
const VIETRAVEL_SLUG_BY_PLACE: Record<number, string> = { 1566083: 'ho-chi-minh' };
const VIETRAVEL_SLUG_BY_COUNTRY: Record<string, string> = { AE: 'dubai' };

function tourLinks(place: Place) {
  const domestic = place.countryCode === 'VN';
  const country = POPULAR_DESTINATIONS[place.countryCode]?.name ?? place.country;
  // Trong nước Vietravel có trang theo thành phố (du-lich-da-nang.aspx); nước ngoài thì theo nước (du-lich-nhat-ban.aspx).
  const vietravel = domestic
    ? (VIETRAVEL_SLUG_BY_PLACE[place.id] ?? slug(place.name))
    : (VIETRAVEL_SLUG_BY_COUNTRY[place.countryCode] ?? slug(country));
  const keyword = domestic ? place.name : country;

  return [
    {
      name: 'Vietravel',
      note: domestic ? `Tour ${place.name}` : `Tour ${country}`,
      url: `https://travel.com.vn/du-lich-${vietravel}.aspx`,
    },
    {
      name: 'TST tourist',
      note: `Tìm tour “${keyword}”`,
      url: `https://www.tsttourist.com/search?q=${encodeURIComponent(keyword)}`,
    },
    {
      name: 'So sánh trên Google',
      note: `Tour ${place.name} của các công ty khác`,
      url: `https://www.google.com/search?q=${encodeURIComponent(`tour ${place.name} giá`)}`,
    },
  ];
}

function Tours({ place }: { place: Place }) {
  return (
    <Panel id="dat-tour" title="Đặt tour ở Việt Nam" icon={<IconPlane />}>
      <ul className="-mx-2 flex flex-col">
        {tourLinks(place).map((t) => (
          <li key={t.name}>
            <a
              href={t.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'flex items-center justify-between gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-[color:var(--tr-ground)]',
                FOCUS,
              )}
            >
              <span>
                <span className="block text-[14.5px] font-semibold text-[color:var(--tr-ink)]">
                  {t.name}
                </span>
                <span className="block text-[12.5px] text-[color:var(--tr-ink-faint)]">
                  {t.note}
                </span>
              </span>
              <span className="text-[color:var(--tr-blue)]">
                <IconArrow />
              </span>
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[12px] leading-relaxed text-[color:var(--tr-ink-faint)]">
        Giá tour xem trực tiếp trên trang của từng công ty; TrendRadar không lấy giá từ các trang
        này.
      </p>
    </Panel>
  );
}
