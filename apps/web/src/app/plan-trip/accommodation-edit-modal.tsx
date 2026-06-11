'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/design-system/components/button';
import { TextInput } from '@/design-system/components/input';
import { TripAnimatedModal } from './trip-animated-modal';
import { arrayToLines, linesToArray, textareaClassName } from './trip-form-utils';
import type { AccommodationPlanData } from './trip-plan-types';

type AccommodationEditModalProps = {
  open: boolean;
  initial: AccommodationPlanData;
  onClose: () => void;
  onSubmit: (data: AccommodationPlanData) => void;
};

function HomeIcon({ className }: { className?: string }) {
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
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

export function AccommodationEditModal({
  open,
  initial,
  onClose,
  onSubmit,
}: AccommodationEditModalProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState(initial);
  const [amenitiesText, setAmenitiesText] = useState(arrayToLines(initial.amenities));
  const [imagesText, setImagesText] = useState(arrayToLines(initial.images));

  useEffect(() => {
    if (open) {
      setForm(initial);
      setAmenitiesText(arrayToLines(initial.amenities));
      setImagesText(arrayToLines(initial.images));
    }
  }, [open, initial]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit({
      ...form,
      eyebrow: form.eyebrow.trim(),
      name: form.name.trim(),
      address: form.address.trim(),
      checkInTime: form.checkInTime.trim(),
      checkOutTime: form.checkOutTime.trim(),
      contactInfo: form.contactInfo.trim(),
      amenities: linesToArray(amenitiesText),
      images: linesToArray(imagesText),
      notes: form.notes.trim(),
    });
    onClose();
  };

  const formId = 'trip-accommodation-form';

  return (
    <TripAnimatedModal
      open={open}
      onClose={onClose}
      title={t('planTrip.villa.editTitle')}
      description={t('planTrip.villa.editHint')}
      icon={<HomeIcon />}
      className="max-w-lg"
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
            {t('planTrip.villa.fields.eyebrow')}
          </span>
          <TextInput
            value={form.eyebrow}
            onChange={(event) => setForm((prev) => ({ ...prev, eyebrow: event.target.value }))}
          />
        </label>
        <label className="block">
          <span className="mb-xs block font-sans text-body-sm font-medium">
            {t('planTrip.villa.fields.name')}
          </span>
          <TextInput
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
        </label>
        <label className="block">
          <span className="mb-xs block font-sans text-body-sm font-medium">
            {t('planTrip.villa.fields.address')}
          </span>
          <TextInput
            value={form.address}
            onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
          />
        </label>
        <div className="grid gap-md sm:grid-cols-2">
          <label className="block">
            <span className="mb-xs block font-sans text-body-sm font-medium">
              {t('planTrip.villa.checkIn')}
            </span>
            <TextInput
              value={form.checkInTime}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, checkInTime: event.target.value }))
              }
            />
          </label>
          <label className="block">
            <span className="mb-xs block font-sans text-body-sm font-medium">
              {t('planTrip.villa.checkOut')}
            </span>
            <TextInput
              value={form.checkOutTime}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, checkOutTime: event.target.value }))
              }
            />
          </label>
        </div>
        <label className="block">
          <span className="mb-xs block font-sans text-body-sm font-medium">
            {t('planTrip.villa.contact')}
          </span>
          <TextInput
            value={form.contactInfo}
            onChange={(event) => setForm((prev) => ({ ...prev, contactInfo: event.target.value }))}
          />
        </label>
        <label className="block">
          <span className="mb-xs block font-sans text-body-sm font-medium">
            {t('planTrip.villa.amenitiesLabel')}
          </span>
          <textarea
            className={textareaClassName}
            value={amenitiesText}
            onChange={(event) => setAmenitiesText(event.target.value)}
            placeholder={t('planTrip.edit.placeholders.details')}
          />
        </label>
        <label className="block">
          <span className="mb-xs block font-sans text-body-sm font-medium">
            {t('planTrip.villa.fields.images')}
          </span>
          <textarea
            className={textareaClassName}
            value={imagesText}
            onChange={(event) => setImagesText(event.target.value)}
            placeholder={t('planTrip.villa.placeholders.images')}
          />
        </label>
        <label className="block">
          <span className="mb-xs block font-sans text-body-sm font-medium">
            {t('planTrip.villa.fields.notes')}
          </span>
          <textarea
            className={textareaClassName}
            value={form.notes}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
          />
        </label>
      </form>
    </TripAnimatedModal>
  );
}
