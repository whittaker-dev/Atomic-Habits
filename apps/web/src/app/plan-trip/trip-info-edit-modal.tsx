'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/design-system/components/button';
import { TextInput } from '@/design-system/components/input';
import { TripAnimatedModal } from './trip-animated-modal';
import type { TripMeta } from './use-plan-trip';

type TripInfoEditModalProps = {
  open: boolean;
  initial: TripMeta;
  onClose: () => void;
  onSubmit: (data: TripMeta) => void;
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
      <path d="M3 6h18" />
      <path d="M3 10h18" />
      <path d="M3 14h18" />
      <path d="M3 18h18" />
      <path d="M8 6v12" />
      <path d="M16 6v12" />
    </svg>
  );
}

export function TripInfoEditModal({ open, initial, onClose, onSubmit }: TripInfoEditModalProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<TripMeta>(initial);

  useEffect(() => {
    if (open) setForm(initial);
  }, [open, initial]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) return;
    onSubmit({
      name,
      description: form.description.trim(),
      eyebrow: form.eyebrow.trim(),
      datesLabel: form.datesLabel.trim(),
    });
    onClose();
  };

  const formId = 'trip-info-form';

  return (
    <TripAnimatedModal
      open={open}
      onClose={onClose}
      title={t('planTrip.trip.editTitle')}
      description={t('planTrip.trip.editHint')}
      icon={<MapIcon />}
      className="max-w-md"
      footer={
        <div className="flex flex-col-reverse gap-sm sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.actions.cancel')}
          </Button>
          <Button type="submit" form={formId}>
            {t('planTrip.trip.save')}
          </Button>
        </div>
      }
    >
      <form id={formId} className="space-y-md" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-xs block font-sans text-body-sm font-medium">
            {t('planTrip.trip.fields.name')}
            <span className="text-primary"> *</span>
          </span>
          <TextInput
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            required
            autoFocus
          />
        </label>

        <label className="block">
          <span className="mb-xs block font-sans text-body-sm font-medium">
            {t('planTrip.trip.fields.description')}
          </span>
          <TextInput
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          />
        </label>

        <label className="block">
          <span className="mb-xs block font-sans text-body-sm font-medium">
            {t('planTrip.trip.fields.eyebrow')}
          </span>
          <TextInput
            value={form.eyebrow}
            onChange={(event) => setForm((prev) => ({ ...prev, eyebrow: event.target.value }))}
          />
        </label>

        <label className="block">
          <span className="mb-xs block font-sans text-body-sm font-medium">
            {t('planTrip.trip.fields.dates')}
          </span>
          <TextInput
            value={form.datesLabel}
            onChange={(event) => setForm((prev) => ({ ...prev, datesLabel: event.target.value }))}
          />
        </label>
      </form>
    </TripAnimatedModal>
  );
}
