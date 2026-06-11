'use client';

import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

const HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, '0'));

const selectClassName = cn(
  'h-11 w-full rounded-md border border-hairline bg-surface-1 px-sm',
  'font-sans text-body text-ink',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-focus/50',
);

export function parseTime(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return { hour: '09', minute: '00' };
  const hour = Math.min(23, Math.max(0, Number(match[1])))
    .toString()
    .padStart(2, '0');
  const rawMinute = Math.min(59, Math.max(0, Number(match[2])));
  const minute = (Math.round(rawMinute / 5) * 5).toString().padStart(2, '0');
  return { hour, minute: minute === '60' ? '55' : minute };
}

export function formatTime(hour: string, minute: string) {
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
}

type TimePickerProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function TimePicker({ value, onChange, className }: TimePickerProps) {
  const { t } = useTranslation();
  const { hour, minute } = parseTime(value);

  return (
    <div className={cn('grid grid-cols-2 gap-sm', className)}>
      <label className="block">
        <span className="mb-xs block font-sans text-caption font-medium text-ink-subtle">
          {t('planTrip.itinerary.fields.hour')}
        </span>
        <select
          className={selectClassName}
          value={hour}
          onChange={(event) => onChange(formatTime(event.target.value, minute))}
        >
          {HOURS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-xs block font-sans text-caption font-medium text-ink-subtle">
          {t('planTrip.itinerary.fields.minute')}
        </span>
        <select
          className={selectClassName}
          value={minute}
          onChange={(event) => onChange(formatTime(hour, event.target.value))}
        >
          {MINUTES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
