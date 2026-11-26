'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition, type ReactNode } from 'react';
import { allCountries, POPULAR_DESTINATIONS, type Country } from '@/lib/trend-radar/destinations';
import type { NewsItem } from '@/lib/trend-radar/rss';
import type { Destination, Feed, Place, Weather, YearValue } from '@/lib/trend-radar/sources';
import { describeWeather, type WeatherKind } from '@/lib/trend-radar/weather';
import { cn } from '@/lib/utils';
import { CompactNewsRow, TimeAgo } from './blocks';
import { useTrendRadar } from './context';
import { Combobox, type ComboGroup } from './combobox';
import { compactNumber, filterByQuery } from './format';
import { ROUTES } from './shell';
import { FOCUS, IconPlane, PageHeader, Panel, SourceNotice, Tabs } from './ui';

// Trang /trend-radar/du-lich: người xem chọn một thành phố (lưu trong URL ?noi= để gửi link cho nhau),
// trang hiện thời tiết, lượt khách và tin du lịch của nơi đó. Dữ liệu theo nơi do server tải (page.tsx);
// tin thị trường du lịch chung lấy từ dữ liệu chung của layout.

const RETRY = 'Trang sẽ tự thử lại sau ít phút.';

export function TravelPage({
  place,
  destination,
  missingPlace,
  extras,
}: {
  place: Place | null;
  destination: Destination | null;
  missingPlace: boolean;
  /** Phần tải chậm (địa điểm, giá phòng, ăn chơi ngủ, tour), do page.tsx bọc trong Suspense */
  extras?: ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const go = (id: number) =>
    startTransition(() => router.push(`${ROUTES.travel}?noi=${id}`, { scroll: false }));

  return (
    <>
      <PageHeader
        icon={<IconPlane />}
        title="Du lịch"
        description="Thời tiết, tin du lịch và lượt khách theo nơi bạn chọn"
      />
      <PlacePicker place={place} onPick={go} pending={pending} />
      {missingPlace && place && (
        <p className="mt-3 text-[13.5px] text-[color:var(--tr-ink-soft)]">
          Không tìm thấy nơi trong đường dẫn, đang hiện {place.name}.
        </p>
      )}

      {!place || !destination ? (
        <div className="mt-4">
          <SourceNotice>Không tải được thông tin địa điểm lúc này. {RETRY}</SourceNotice>
        </div>
      ) : (
        <div
          aria-busy={pending}
          className={cn(
            'mt-4 flex flex-col gap-4 transition-opacity duration-200 lg:mt-5 lg:gap-5',
            pending && 'opacity-50',
          )}
        >
          <div className="grid grid-cols-1 gap-4 lg:gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <WeatherCard
              place={place}
              weather={destination.weather}
              error={destination.weatherError}
            />
            <ArrivalsCard place={place} destination={destination} />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <PlaceNews key={place.id} place={place} destination={destination} />
            <MarketNews />
          </div>
          {extras}
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Chọn nơi: quốc gia trước, rồi thành phố trong nước đó
// ---------------------------------------------------------------------------

type Suggestion = Pick<Place, 'id' | 'name' | 'region' | 'country'>;

function PlacePicker({
  place,
  onPick,
  pending,
}: {
  place: Place | null;
  onPick: (id: number) => void;
  pending: boolean;
}) {
  // Nước đang chọn trong ô. Có thể khác nước của thành phố đang hiện khi người xem chọn một nước chưa có
  // thành phố gợi ý: trang giữ nguyên nơi cũ cho tới khi họ tìm và chọn một thành phố của nước mới.
  const [country, setCountry] = useState(place?.countryCode ?? 'VN');
  const [countryQuery, setCountryQuery] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const [results, setResults] = useState<Suggestion[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cityInput = useRef<HTMLInputElement>(null);

  // Danh sách mọi quốc gia chỉ dựng sau khi trang đã hydrate (xem allCountries); trước đó chỉ có các nước
  // gợi ý và nước của nơi đang hiện, tên lấy từ dữ liệu server nên server và trình duyệt vẽ giống nhau.
  const [others, setOthers] = useState<Country[] | null>(null);
  useEffect(() => setOthers(allCountries()), []);

  // Đổi sang nơi khác (bấm link, nút lùi của trình duyệt) thì ô nước đi theo nước của nơi đó. Theo dõi mã nơi,
  // không theo đối tượng place: server có thể gửi lại cùng nơi dưới một đối tượng mới, và khi đó không được
  // ghi đè nước người xem vừa chọn mà chưa chọn thành phố.
  const placeId = place?.id;
  const placeCountry = place?.countryCode;
  useEffect(() => {
    if (placeCountry) setCountry(placeCountry);
  }, [placeId, placeCountry]);

  const cities = POPULAR_DESTINATIONS[country]?.cities ?? [];
  const countryLabel =
    POPULAR_DESTINATIONS[country]?.name ??
    others?.find((c) => c.code === country)?.name ??
    (country === place?.countryCode ? place.country : country);

  // Nước gợi ý đã có ở nhóm "Hay đi" nên không lặp lại ở nhóm dưới.
  const otherCountries = (
    others ?? (place ? [{ code: place.countryCode, name: place.country }] : [])
  ).filter((c) => !POPULAR_DESTINATIONS[c.code]);
  const countryGroups: ComboGroup[] = [
    {
      label: 'Hay đi',
      options: filterByQuery(
        Object.entries(POPULAR_DESTINATIONS),
        ([, d]) => d.name,
        countryQuery,
      ).map(([code, d]) => ({ id: code, label: d.name })),
    },
    {
      label: 'Tất cả quốc gia',
      options: filterByQuery(otherCountries, (c) => c.name, countryQuery).map((c) => ({
        id: c.code,
        label: c.name,
      })),
    },
  ];

  // Thành phố gợi ý lọc ngay trên máy; từ 2 chữ trở lên thì hỏi thêm server để tìm cả nơi ngoài danh sách gợi ý,
  // chờ 300 ms sau phím cuối để không gọi nguồn ở mỗi phím.
  const trimmedCity = cityQuery.trim();
  useEffect(() => {
    setResults(null);
    setError(null);
    if (trimmedCity.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({ q: trimmedCity, country });
        const res = await fetch(`${ROUTES.travel}/tim?${params}`, { signal: controller.signal });
        const body = (await res.json()) as { places: Suggestion[]; error?: string };
        setResults(body.places);
        setError(body.error ?? null);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setError('Không tìm được địa điểm lúc này.');
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
      setSearching(false);
    };
  }, [trimmedCity, country]);

  const curatedIds = new Set(cities.map((c) => c.id));
  const cityGroups: ComboGroup[] = [
    {
      label: `Gợi ý ở ${countryLabel}`,
      options: filterByQuery([...cities], (c) => c.name, cityQuery).map((c) => ({
        id: String(c.id),
        label: c.name,
      })),
    },
    {
      label: 'Kết quả tìm',
      options: (results ?? [])
        .filter((r) => !curatedIds.has(r.id))
        .map((r) => ({ id: String(r.id), label: r.name, hint: r.region ?? undefined })),
    },
  ];
  const cityEmpty = error
    ? error
    : searching || (trimmedCity.length >= 2 && results === null)
      ? 'Đang tìm…'
      : trimmedCity.length >= 2
        ? `Không tìm thấy thành phố nào tên “${trimmedCity}” ở ${countryLabel}.`
        : `Gõ tên một thành phố ở ${countryLabel}.`;

  const changeCountry = (code: string) => {
    setCountry(code);
    setCityQuery('');
    const first = POPULAR_DESTINATIONS[code]?.cities[0];
    // Nước có thành phố gợi ý thì mở ngay thành phố đầu tiên; nước nào cũng chuyển tiêu điểm sang ô thành phố
    // để chọn tiếp bằng bàn phím.
    if (first && first.id !== place?.id) onPick(first.id);
    cityInput.current?.focus();
  };

  const cityLabel = country === place?.countryCode ? place.name : '';

  return (
    <div className="min-w-0 rounded-2xl border border-[color:var(--tr-line)] bg-white p-3 sm:p-4">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
        <Combobox
          label="1. Quốc gia"
          selectedLabel={countryLabel}
          selectedId={country}
          placeholder="Chọn quốc gia"
          query={countryQuery}
          onQueryChange={setCountryQuery}
          groups={countryGroups}
          onSelect={(o) => changeCountry(o.id)}
          emptyText={`Không có quốc gia nào tên “${countryQuery.trim()}”.`}
        />
        <Combobox
          label="2. Thành phố"
          inputRef={cityInput}
          selectedLabel={cityLabel}
          selectedId={place ? String(place.id) : undefined}
          placeholder={`Chọn thành phố ở ${countryLabel}`}
          query={cityQuery}
          onQueryChange={setCityQuery}
          groups={cityGroups}
          onSelect={(o) => onPick(Number(o.id))}
          emptyText={cityEmpty}
        />
      </div>

      {cities.length > 0 && (
        <div
          className="mt-3 flex flex-wrap gap-1.5"
          aria-label={`Thành phố gợi ý ở ${countryLabel}`}
        >
          {cities.map((c) => {
            const active = c.id === place?.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onPick(c.id)}
                aria-pressed={active}
                disabled={pending && !active}
                className={cn(
                  'h-8 rounded-full border px-3 text-[13px] font-medium transition-colors disabled:cursor-wait',
                  active
                    ? 'border-[color:var(--tr-blue)] bg-[color:var(--tr-blue)] text-white'
                    : 'border-[color:var(--tr-line)] bg-white text-[color:var(--tr-ink-soft)] hover:border-[color:var(--tr-blue)] hover:text-[color:var(--tr-blue-deep)]',
                  FOCUS,
                )}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Thời tiết
// ---------------------------------------------------------------------------

function WeatherIcon({
  kind,
  isDay = true,
  className,
}: {
  kind: WeatherKind;
  isDay?: boolean;
  className: string;
}) {
  const sun = <circle cx="24" cy="24" r="9" fill="#f6b23c" />;
  const moon = <path d="M30 15a10 10 0 1 0 6 14 8 8 0 0 1-6-14z" fill="#8aa0c4" />;
  const cloud = (fill: string, dx = 0, dy = 0) => (
    <path
      transform={`translate(${dx} ${dy})`}
      d="M15 37h20a7 7 0 0 0 .8-14 10 10 0 0 0-19 2.5A6 6 0 0 0 15 37z"
      fill={fill}
    />
  );
  const drops = (count: number, color: string) =>
    Array.from({ length: count }, (_, i) => (
      <path
        key={i}
        d={`M${17 + i * 7} 40l-2 5`}
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    ));

  let art: ReactNode;
  switch (kind) {
    case 'clear':
      art = isDay ? (
        <>
          {sun}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <path
              key={a}
              d="M24 8v4"
              stroke="#f6b23c"
              strokeWidth="2.6"
              strokeLinecap="round"
              transform={`rotate(${a} 24 24)`}
            />
          ))}
        </>
      ) : (
        moon
      );
      break;
    case 'partly':
      art = (
        <>
          <g transform="translate(-5 -6)">{isDay ? sun : moon}</g>
          {cloud('#d7e0ec', 3, 2)}
        </>
      );
      break;
    case 'cloudy':
      art = (
        <>
          {cloud('#c3cedd', -5, -5)}
          {cloud('#9eadc2', 2, 1)}
        </>
      );
      break;
    case 'fog':
      art = (
        <>
          {cloud('#c3cedd', 0, -6)}
          {[34, 39, 44].map((y) => (
            <path
              key={y}
              d={`M12 ${y}h24`}
              stroke="#9eadc2"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          ))}
        </>
      );
      break;
    case 'drizzle':
      art = (
        <>
          {cloud('#aebbd0', 0, -5)}
          {drops(3, '#5b8def')}
        </>
      );
      break;
    case 'rain':
      art = (
        <>
          {cloud('#8d9db5', 0, -5)}
          {drops(4, '#1f62f0')}
        </>
      );
      break;
    case 'snow':
      art = (
        <>
          {cloud('#c3cedd', 0, -5)}
          {[17, 24, 31].map((x) => (
            <circle key={x} cx={x} cy="42" r="2.2" fill="#8aa0c4" />
          ))}
        </>
      );
      break;
    case 'storm':
      art = (
        <>
          {cloud('#6f7f98', 0, -5)}
          <path d="M25 33l-5 8h5l-2 6 7-9h-5l2-5z" fill="#f6b23c" />
        </>
      );
      break;
  }
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      {art}
    </svg>
  );
}

function weekday(date: string, index: number): string {
  if (index === 0) return 'Hôm nay';
  // Ngày Open-Meteo trả về đã là ngày theo giờ địa phương của nơi đó; đọc theo UTC để không bị lệch ngày.
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('vi-VN', {
    weekday: 'short',
    timeZone: 'UTC',
  });
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/70 px-3 py-2">
      <dt className="text-[12px] text-[color:var(--tr-ink-soft)]">{label}</dt>
      <dd className="text-[15px] font-semibold tabular-nums text-[color:var(--tr-ink)]">{value}</dd>
    </div>
  );
}

function WeatherCard({
  place,
  weather,
  error,
}: {
  place: Place;
  weather: Weather | null;
  error: string | null;
}) {
  const where = [place.region, place.country].filter(Boolean).join(', ');

  return (
    <section
      aria-labelledby="thoi-tiet-title"
      className="min-w-0 rounded-2xl bg-[linear-gradient(150deg,#eef4ff_0%,#dce8ff_60%,#cddffd_100%)] p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            id="thoi-tiet-title"
            className="truncate text-[24px] font-bold leading-tight tracking-[-0.02em] text-[color:var(--tr-ink)] sm:text-[28px]"
          >
            {place.name}
          </h2>
          <p className="text-[13.5px] text-[color:var(--tr-ink-soft)]">{where}</p>
        </div>
        {weather && (
          <p className="shrink-0 text-right text-[12.5px] text-[color:var(--tr-ink-soft)]">
            Giờ địa phương
            <span className="block text-[17px] font-semibold tabular-nums text-[color:var(--tr-ink)]">
              {weather.localTime.slice(11, 16)}
            </span>
          </p>
        )}
      </div>

      {!weather ? (
        <div className="mt-4">
          <SourceNotice>
            {error ?? 'Chưa có dữ liệu thời tiết.'} {RETRY}
          </SourceNotice>
        </div>
      ) : (
        <>
          <div className="mt-4 flex items-center gap-4">
            <WeatherIcon
              kind={describeWeather(weather.code).kind}
              isDay={weather.isDay}
              className="h-20 w-20 shrink-0"
            />
            <div>
              <p className="text-[52px] font-bold leading-none tracking-[-0.04em] tabular-nums text-[color:var(--tr-ink)]">
                {Math.round(weather.temperature)}°
              </p>
              <p className="mt-1 text-[15px] font-medium text-[color:var(--tr-ink-soft)]">
                {describeWeather(weather.code).label}
              </p>
            </div>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Cảm giác như" value={`${Math.round(weather.feelsLike)}°`} />
            <Stat label="Độ ẩm" value={`${weather.humidity}%`} />
            <Stat label="Gió" value={`${Math.round(weather.windKmh)} km/h`} />
            <Stat label="Lượng mưa" value={`${weather.precipitationMm} mm`} />
          </dl>

          <h3 className="mb-2 mt-5 text-[13px] font-semibold text-[color:var(--tr-ink-soft)]">
            Dự báo 7 ngày
          </h3>
          <ol className="relative -mx-1 flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none]">
            {weather.days.map((d, i) => {
              const { label, kind } = describeWeather(d.code);
              return (
                <li
                  key={d.date}
                  title={label}
                  className="flex min-w-[64px] flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-center first:bg-white/70"
                >
                  <span className="text-[12.5px] font-medium text-[color:var(--tr-ink-soft)]">
                    {weekday(d.date, i)}
                  </span>
                  <WeatherIcon kind={kind} className="h-8 w-8" />
                  <span className="sr-only">{label}</span>
                  <span className="text-[13.5px] font-semibold tabular-nums text-[color:var(--tr-ink)]">
                    {Math.round(d.max)}°
                    <span className="ml-1 font-normal text-[color:var(--tr-ink-faint)]">
                      {Math.round(d.min)}°
                    </span>
                  </span>
                  {d.rainChance !== null && (
                    <span className="text-[11.5px] tabular-nums text-[color:var(--tr-blue-deep)]">
                      mưa {d.rainChance}%
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
          <p className="mt-2 text-[11.5px] text-[color:var(--tr-ink-faint)]">Nguồn: Open-Meteo</p>
        </>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Lượt khách
// ---------------------------------------------------------------------------

function YearBars({ data }: { data: YearValue[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ol className="flex flex-col gap-1.5">
      {data.map((d) => (
        <li key={d.year} className="grid grid-cols-[38px_1fr_56px] items-center gap-2.5">
          <span className="text-[12.5px] tabular-nums text-[color:var(--tr-ink-soft)]">
            {d.year}
          </span>
          <span className="h-2.5 overflow-hidden rounded-full bg-[color:var(--tr-ground)]">
            <span
              className="block h-full rounded-full bg-[color:var(--tr-blue)]"
              style={{ width: `${Math.max(2, (d.value / max) * 100)}%` }}
            />
          </span>
          <span className="text-right text-[12.5px] font-semibold tabular-nums text-[color:var(--tr-ink)]">
            {compactNumber(d.value)}
          </span>
        </li>
      ))}
    </ol>
  );
}

function ArrivalsCard({ place, destination }: { place: Place; destination: Destination }) {
  const { arrivalsByYear: byYear, arrivalsNews: news } = destination;
  const latest = byYear.items.at(-1);
  const subject = place.countryCode === 'VN' ? place.name : place.country;

  return (
    <Panel id="luot-khach" title="Lượng khách" icon={<IconPlane />}>
      <h3 className="text-[13px] font-semibold text-[color:var(--tr-ink-soft)]">
        Khách quốc tế đến {place.country} theo năm
      </h3>
      <div className="mt-2">
        {byYear.error || !latest ? (
          <SourceNotice>
            {byYear.error ?? `World Bank chưa có số liệu cho ${place.country}.`}
          </SourceNotice>
        ) : (
          <>
            <YearBars data={byYear.items} />
            <p className="mt-2 text-[12px] leading-relaxed text-[color:var(--tr-ink-faint)]">
              Nguồn: World Bank. Số mới nhất là năm {latest.year}; World Bank chưa công bố các năm
              sau, còn số theo tháng chỉ có trong thông cáo báo chí bên dưới.
            </p>
          </>
        )}
      </div>

      <h3 className="mb-1 mt-5 text-[13px] font-semibold text-[color:var(--tr-ink-soft)]">
        Tin về lượt khách {subject} (30 ngày)
      </h3>
      {news.error || news.items.length === 0 ? (
        <SourceNotice>{news.error ?? 'Chưa có bài nào trong 30 ngày qua.'}</SourceNotice>
      ) : (
        <ul className="-mx-2">
          {news.items.slice(0, 5).map((item) => (
            <CompactNewsRow key={item.id} item={item} withSource />
          ))}
        </ul>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Tin du lịch
// ---------------------------------------------------------------------------

function NewsList({ feed, empty }: { feed: Feed<NewsItem>; empty: string }) {
  if (feed.error || feed.items.length === 0) {
    return (
      <SourceNotice>
        {feed.error ?? empty} {feed.error ? RETRY : ''}
      </SourceNotice>
    );
  }
  return (
    <ul role="tabpanel" className="-mx-2">
      {feed.items.slice(0, 8).map((item) => (
        <li key={item.id}>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'block rounded-xl px-2 py-2.5 transition-colors hover:bg-[color:var(--tr-ground)]',
              FOCUS,
            )}
          >
            <span className="line-clamp-2 text-[14.5px] font-medium leading-snug text-[color:var(--tr-ink)]">
              {item.title}
            </span>
            <span className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-[color:var(--tr-ink-faint)]">
              {item.source} · <TimeAgo iso={item.publishedAt} />
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function PlaceNews({ place, destination }: { place: Place; destination: Destination }) {
  const tabs = [
    { id: 'city', label: place.name },
    { id: 'country', label: `Cả ${place.country}` },
  ] as const;
  // Thành phố và quốc gia trùng nhau (Singapore) thì một tab là đủ.
  const sameName = place.name === place.country;
  const shownTabs = sameName ? tabs.slice(1) : tabs;
  const [tab, setTab] = useState<(typeof tabs)[number]['id']>(sameName ? 'country' : 'city');
  const feed = tab === 'city' ? destination.placeNews : destination.countryNews;

  return (
    <Panel id="tin-noi-den" title={`Tin du lịch ${place.name}`} icon={<IconPlane />}>
      <Tabs label="Phạm vi tin" tabs={shownTabs} value={tab} onChange={setTab} />
      <NewsList feed={feed} empty="Chưa có tin du lịch nào trong 7 ngày qua." />
    </Panel>
  );
}

function MarketNews() {
  const { data } = useTrendRadar();
  return (
    <Panel id="thi-truong" title="Thị trường du lịch" icon={<IconPlane />}>
      {data.travel.error || data.travel.items.length === 0 ? (
        <SourceNotice>
          {data.travel.error ?? 'Chưa có tin du lịch.'} {RETRY}
        </SourceNotice>
      ) : (
        <ul className="-mx-2">
          {data.travel.items.slice(0, 6).map((item) => (
            <CompactNewsRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </Panel>
  );
}
