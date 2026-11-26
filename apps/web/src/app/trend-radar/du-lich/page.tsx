import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TravelPage } from '@/components/trend-radar/travel';
import { TravelExtras, TravelExtrasSkeleton } from '@/components/trend-radar/travel-extras';
import { DEFAULT_PLACE_ID } from '@/lib/trend-radar/destinations';
import { getPlace, loadDestination } from '@/lib/trend-radar/sources';

type Props = { searchParams: Promise<{ noi?: string }> };

/** Nơi trong URL (?noi=<mã>), hoặc nơi mặc định khi URL không có hay mã không còn đúng. */
async function resolvePlace(searchParams: Props['searchParams']) {
  const requested = Number((await searchParams).noi);
  const place = Number.isInteger(requested) && requested > 0 ? await getPlace(requested) : null;
  return {
    place: place ?? (await getPlace(DEFAULT_PLACE_ID)),
    missing: Boolean((await searchParams).noi) && !place,
  };
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { place } = await resolvePlace(searchParams);
  const name = place ? `${place.name}, ${place.country}` : 'du lịch';
  return {
    title: `Du lịch ${name} — TrendRadar VN`,
    description: `Thời tiết hiện tại, dự báo 7 ngày, tin du lịch và lượt khách của ${name}.`,
  };
}

export default async function Page({ searchParams }: Props) {
  const { place, missing } = await resolvePlace(searchParams);
  const destination = place ? await loadDestination(place) : null;
  return (
    <TravelPage
      place={place}
      destination={destination}
      missingPlace={missing}
      extras={
        place && (
          // key: đổi nơi thì hiện lại khung chờ, thay vì giữ dữ liệu của nơi cũ trong lúc tải nơi mới.
          <Suspense key={place.id} fallback={<TravelExtrasSkeleton />}>
            <TravelExtras place={place} />
          </Suspense>
        )
      }
    />
  );
}
