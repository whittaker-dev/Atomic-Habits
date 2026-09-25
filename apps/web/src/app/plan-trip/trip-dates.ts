import type { PlanTripDayPart } from '@atomic-habits/shared';
import type { TFunction } from 'i18next';
import type { TripMeta } from './use-plan-trip';

export type TripDates = Pick<TripMeta, 'startDate' | 'endDate' | 'startDayPart' | 'endDayPart'>;

export const DAY_PARTS: PlanTripDayPart[] = ['morning', 'afternoon', 'evening'];

/**
 * Trip dates are calendar days with no time zone. Build them from local parts —
 * `new Date('2026-05-03')` parses as UTC midnight and shows the previous day west of UTC.
 */
export function parseDateOnly(value: string): Date {
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  return new Date(year, month - 1, day);
}

export function toDateOnly(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function formatTripDay(value: string, locale: string, withYear = false) {
  const date = parseDateOnly(value);
  if (locale === 'vi') {
    return new Intl.DateTimeFormat('vi', {
      weekday: 'short',
      day: 'numeric',
      month: 'numeric',
      year: withYear ? 'numeric' : undefined,
    }).format(date);
  }
  // en-GB gives "Sun 3 May" (en-US would say "Sun, May 3"), but it adds a comma after the
  // weekday once a year is included — so append the year by hand to keep both ends alike.
  const day = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date);
  return withYear ? `${day} ${date.getFullYear()}` : day;
}

function withDayPart(date: string, part: PlanTripDayPart | null, t: TFunction) {
  if (!part) return date;
  return t('planTrip.trip.dateWithPart', { date, part: t(`planTrip.trip.dayParts.${part}`) });
}

/** Human label for the trip dates, or '' when no dates are picked. */
export function formatTripDates(dates: TripDates, locale: string, t: TFunction): string {
  const { startDate, endDate, startDayPart, endDayPart } = dates;
  if (!startDate || !endDate) return '';

  // Print the year once at the end unless the trip crosses New Year.
  const sameYear = startDate.slice(0, 4) === endDate.slice(0, 4);
  const start = withDayPart(formatTripDay(startDate, locale, !sameYear), startDayPart, t);
  const end = withDayPart(formatTripDay(endDate, locale, true), endDayPart, t);
  return `${start} – ${end}`;
}

/** What the page shows for the dates: picked dates, else the legacy free-text label. */
export function tripDatesText(meta: TripMeta, locale: string, t: TFunction): string {
  return formatTripDates(meta, locale, t) || meta.datesLabel || t('planTrip.trip.noDates');
}
