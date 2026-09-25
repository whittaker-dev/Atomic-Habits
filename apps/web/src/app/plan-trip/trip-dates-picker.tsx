'use client';

import type { PlanTripDayPart } from '@atomic-habits/shared';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useId, useRef, useState } from 'react';
import { DayPicker, type ChevronProps } from 'react-day-picker';
import { enGB, vi } from 'react-day-picker/locale';
import { useTranslation } from 'react-i18next';
import { Button } from '@/design-system/components/button';
import { cn } from '@/lib/utils';
import {
  DAY_PARTS,
  formatTripDates,
  formatTripDay,
  parseDateOnly,
  toDateOnly,
  type TripDates,
} from './trip-dates';

type TripDatesPickerProps = {
  value: TripDates;
  /** Legacy free-text label, shown until real dates are picked. */
  fallbackLabel: string;
  onChange: (value: TripDates) => void;
  labelledBy: string;
};

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="4.5" width="18" height="16.5" rx="2.5" />
      <path d="M3 9.5h18" />
      <path d="M8 2.5v4" />
      <path d="M16 2.5v4" />
    </svg>
  );
}

function Chevron({ className, orientation = 'down' }: ChevronProps) {
  const rotate = { up: 'rotate-180', down: '', left: 'rotate-90', right: '-rotate-90' }[
    orientation
  ];
  return (
    <svg
      className={cn('h-4 w-4', rotate, className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/**
 * First tap sets the leave day, second tap the return day, a third tap starts over.
 * react-day-picker's own range logic only ever moves the start earlier, which makes
 * re-picking a trip in a later month awkward.
 */
function nextRange(value: TripDates, day: string): TripDates {
  const awaitingReturn = value.startDate !== null && value.startDate === value.endDate;
  if (awaitingReturn && value.startDate && day > value.startDate) {
    return { ...value, endDate: day };
  }
  // A new trip starts clean — the old trip's parts of day would silently carry over.
  return { startDate: day, endDate: day, startDayPart: null, endDayPart: null };
}

// --color-primary is a hex token, so Tailwind's `bg-primary/10` opacity modifier emits nothing.
const rangeBand = 'bg-[color-mix(in_srgb,var(--color-primary)_14%,transparent)]';
const rangeBandHover =
  '[&>button]:hover:bg-[color-mix(in_srgb,var(--color-primary)_24%,transparent)]';
const rangeEndpoint = cn(
  '[&>button]:bg-primary [&>button]:font-semibold [&>button]:text-on-primary',
  '[&>button]:hover:bg-primary-hover',
);

function DayPartToggle({
  label,
  date,
  value,
  onChange,
}: {
  label: string;
  date: string;
  value: PlanTripDayPart | null;
  onChange: (value: PlanTripDayPart | null) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center justify-between gap-xs">
      <p className="min-w-0 font-sans text-body-sm">
        <span className="font-medium text-ink">{label}</span>
        <span className="text-ink-subtle"> · {date}</span>
      </p>
      <div className="flex rounded-pill bg-surface-2 p-0.5" role="group" aria-label={label}>
        {DAY_PARTS.map((part) => (
          <button
            key={part}
            type="button"
            // Tapping the active part again clears it — the part of day is optional.
            onClick={() => onChange(value === part ? null : part)}
            aria-pressed={value === part}
            className={cn(
              'min-h-8 rounded-pill px-sm font-sans text-caption font-medium transition-colors',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-focus/50',
              value === part
                ? 'panel-lift bg-surface-1 text-ink'
                : 'text-ink-subtle hover:text-ink',
            )}
          >
            {t(`planTrip.trip.dayParts.${part}`)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function TripDatesPicker({
  value,
  fallbackLabel,
  onChange,
  labelledBy,
}: TripDatesPickerProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  // The calendar opens below the fold of the modal body; bring it into view once expanded.
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      panelRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 240);
    return () => window.clearTimeout(timer);
  }, [open]);

  const label = formatTripDates(value, i18n.language, t) || fallbackLabel;
  const selected = value.startDate
    ? { from: parseDateOnly(value.startDate), to: parseDateOnly(value.endDate ?? value.startDate) }
    : undefined;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-labelledby={labelledBy}
        className={cn(
          'flex h-11 w-full items-center gap-sm rounded-md border border-hairline bg-surface-1 px-sm text-left',
          'font-sans text-body transition-colors hover:border-hairline-strong',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-focus/50',
          open && 'border-hairline-strong',
        )}
      >
        <CalendarIcon className="shrink-0 text-primary" />
        <span className={cn('min-w-0 flex-1 truncate', label ? 'text-ink' : 'text-ink-tertiary')}>
          {label || t('planTrip.trip.datesPicker.placeholder')}
        </span>
        <Chevron
          className={cn('shrink-0 text-ink-subtle transition-transform', open && 'rotate-180')}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            ref={panelRef}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-xs rounded-lg border border-hairline bg-surface-1 p-sm">
              <DayPicker
                mode="range"
                selected={selected}
                onSelect={(_range, day) => onChange(nextRange(value, toDateOnly(day)))}
                locale={i18n.language === 'vi' ? vi : enGB}
                defaultMonth={selected?.from}
                showOutsideDays
                components={{ Chevron }}
                classNames={{
                  root: 'relative',
                  months: 'relative',
                  month: 'space-y-xs',
                  month_caption: 'flex h-9 items-center px-xs',
                  caption_label: 'font-sans text-body-sm font-semibold capitalize text-ink',
                  nav: 'absolute right-0 top-0 z-10 flex items-center gap-xxs',
                  button_previous: cn(
                    'inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-subtle',
                    'transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-40',
                  ),
                  button_next: cn(
                    'inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-subtle',
                    'transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-40',
                  ),
                  month_grid: 'w-full border-collapse',
                  weekdays: '',
                  weekday: 'h-8 font-sans text-caption font-medium text-ink-tertiary',
                  week: '',
                  day: 'p-0 py-[2px] text-center',
                  day_button: cn(
                    'mx-auto flex h-10 w-full items-center justify-center rounded-md',
                    'font-sans text-body-sm text-ink transition-colors hover:bg-surface-2',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-focus/50',
                  ),
                  // Skip selected cells: same specificity as the endpoint text colour, so it could win.
                  today: '[&>button]:font-semibold [&:not([data-selected])>button]:text-primary',
                  outside: '[&>button]:text-ink-tertiary',
                  // Range styling sits on the cell so the band runs edge to edge between days.
                  range_middle: cn(rangeBand, rangeBandHover, '[&>button]:rounded-none'),
                  range_start: cn(rangeBand, 'rounded-l-md', rangeEndpoint),
                  range_end: cn(rangeBand, 'rounded-r-md', rangeEndpoint),
                }}
              />

              {value.startDate && value.endDate && (
                <div className="mt-sm space-y-xs border-t border-hairline pt-sm">
                  <DayPartToggle
                    label={t('planTrip.trip.datesPicker.leave')}
                    date={formatTripDay(value.startDate, i18n.language)}
                    value={value.startDayPart}
                    onChange={(startDayPart) => onChange({ ...value, startDayPart })}
                  />
                  {value.startDate === value.endDate && (
                    <p className="font-sans text-caption text-ink-subtle">
                      {t('planTrip.trip.datesPicker.pickReturn')}
                    </p>
                  )}
                  <DayPartToggle
                    label={t('planTrip.trip.datesPicker.return')}
                    date={formatTripDay(value.endDate, i18n.language)}
                    value={value.endDayPart}
                    onChange={(endDayPart) => onChange({ ...value, endDayPart })}
                  />
                </div>
              )}

              <div className="mt-sm flex items-center justify-between gap-sm">
                <Button
                  type="button"
                  variant="ghost"
                  className="px-xs"
                  disabled={!value.startDate}
                  onClick={() =>
                    onChange({
                      startDate: null,
                      endDate: null,
                      startDayPart: null,
                      endDayPart: null,
                    })
                  }
                >
                  {t('planTrip.trip.datesPicker.clear')}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                  {t('planTrip.trip.datesPicker.done')}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
