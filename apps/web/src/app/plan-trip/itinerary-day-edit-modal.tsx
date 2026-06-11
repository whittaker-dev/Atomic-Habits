'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/design-system/components/button';
import { TextInput } from '@/design-system/components/input';
import { cn } from '@/lib/utils';
import { TimePicker } from './time-picker';
import { TripAnimatedModal } from './trip-animated-modal';
import type { ItineraryDayData, ItineraryEntryType } from './trip-plan-types';

type ItineraryDayFormData = Omit<ItineraryDayData, 'id'>;

type ItineraryDayEditModalProps = {
  open: boolean;
  mode: 'add' | 'edit';
  initial?: ItineraryDayFormData;
  onClose: () => void;
  onSubmit: (data: ItineraryDayFormData) => void;
};

const ENTRY_TYPES: ItineraryEntryType[] = ['activity', 'meal', 'travel'];

function createEntry() {
  return {
    id: crypto.randomUUID(),
    time: '09:00',
    title: '',
    location: '',
    meal: '',
    type: 'activity' as ItineraryEntryType,
  };
}

const emptyDay: ItineraryDayFormData = {
  label: '',
  entries: [],
};

function MapIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" />
      <path d="M15 5.764v15" />
      <path d="M9 3.236v15" />
    </svg>
  );
}

export function ItineraryDayEditModal({
  open,
  mode,
  initial,
  onClose,
  onSubmit,
}: ItineraryDayEditModalProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<ItineraryDayFormData>(emptyDay);

  useEffect(() => {
    if (!open) return;
    const next = initial ?? emptyDay;
    setForm({
      label: next.label,
      entries: next.entries.map((entry) => ({
        ...entry,
        id: entry.id || crypto.randomUUID(),
      })),
    });
  }, [open, initial]);

  const title =
    mode === 'add' ? t('planTrip.itinerary.addDayTitle') : t('planTrip.itinerary.editDayTitle');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.label.trim()) return;
    onSubmit({
      label: form.label.trim(),
      entries: form.entries
        .map((entry) => ({
          ...entry,
          time: entry.time.trim(),
          title: entry.title.trim(),
          location: entry.location.trim(),
          meal: entry.meal?.trim() || undefined,
        }))
        .filter((entry) => entry.title && entry.time),
    });
    onClose();
  };

  const updateEntry = (
    entryId: string,
    field: keyof ItineraryDayFormData['entries'][0],
    value: string,
  ) => {
    setForm((prev) => ({
      ...prev,
      entries: prev.entries.map((entry) =>
        entry.id === entryId ? { ...entry, [field]: value } : entry,
      ),
    }));
  };

  const formId = 'trip-itinerary-day-form';

  return (
    <TripAnimatedModal
      open={open}
      onClose={onClose}
      title={title}
      description={t('planTrip.itinerary.editDayHint')}
      icon={<MapIcon />}
      className="max-w-2xl"
      footer={
        <div className="flex flex-col-reverse gap-sm sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.actions.cancel')}
          </Button>
          <Button type="submit" form={formId}>
            {t('planTrip.edit.save')}
          </Button>
        </div>
      }
    >
      <form id={formId} className="space-y-md" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-xs block font-sans text-body-sm font-medium">
            {t('planTrip.itinerary.fields.dayLabel')}
            <span className="text-primary"> *</span>
          </span>
          <TextInput
            value={form.label}
            onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
            placeholder={t('planTrip.itinerary.placeholders.dayLabel')}
            required
            autoFocus
          />
        </label>

        <div className="space-y-md">
          {form.entries.map((entry) => (
            <div
              key={entry.id}
              className="space-y-sm rounded-md border border-hairline bg-surface-2/40 p-sm"
            >
              <TimePicker
                value={entry.time}
                onChange={(value) => updateEntry(entry.id, 'time', value)}
              />

              <label className="block">
                <span className="mb-xs block font-sans text-caption font-medium">
                  {t('planTrip.itinerary.fields.type')}
                </span>
                <select
                  value={entry.type}
                  onChange={(event) => updateEntry(entry.id, 'type', event.target.value)}
                  className={cn(
                    'h-11 w-full rounded-md border border-hairline bg-surface-1 px-sm',
                    'font-sans text-body text-ink',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-focus/50',
                  )}
                >
                  {ENTRY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {t(`planTrip.itinerary.types.${type}`)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-xs block font-sans text-caption font-medium">
                  {t('planTrip.itinerary.fields.title')}
                </span>
                <TextInput
                  value={entry.title}
                  onChange={(event) => updateEntry(entry.id, 'title', event.target.value)}
                  required
                />
              </label>

              <label className="block">
                <span className="mb-xs block font-sans text-caption font-medium">
                  {t('planTrip.itinerary.fields.location')}
                </span>
                <TextInput
                  value={entry.location}
                  onChange={(event) => updateEntry(entry.id, 'location', event.target.value)}
                />
              </label>

              <label className="block">
                <span className="mb-xs block font-sans text-caption font-medium">
                  {t('planTrip.itinerary.fields.meal')}
                </span>
                <TextInput
                  value={entry.meal ?? ''}
                  onChange={(event) => updateEntry(entry.id, 'meal', event.target.value)}
                />
              </label>

              <Button
                type="button"
                variant="ghost"
                className="text-error hover:text-error"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    entries: prev.entries.filter((item) => item.id !== entry.id),
                  }))
                }
              >
                {t('planTrip.itinerary.removeEntry')}
              </Button>
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            setForm((prev) => ({ ...prev, entries: [...prev.entries, createEntry()] }))
          }
        >
          {t('planTrip.itinerary.addEntry')}
        </Button>
      </form>
    </TripAnimatedModal>
  );
}
