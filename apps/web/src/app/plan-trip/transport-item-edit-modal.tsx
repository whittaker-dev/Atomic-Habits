'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/design-system/components/button';
import { TextInput } from '@/design-system/components/input';
import { cn } from '@/lib/utils';
import { TripAnimatedModal } from './trip-animated-modal';
import { arrayToLines, linesToArray, textareaClassName } from './trip-form-utils';
import type { TransportIcon, TransportItemData } from './trip-plan-types';

type TransportFormData = Omit<TransportItemData, 'id'>;

type TransportItemEditModalProps = {
  open: boolean;
  mode: 'add' | 'edit';
  initial?: TransportFormData;
  onClose: () => void;
  onSubmit: (data: TransportFormData) => void;
};

const ICONS: TransportIcon[] = ['car', 'ferry'];

const emptyForm: TransportFormData = {
  icon: 'car',
  title: '',
  description: '',
  details: [],
};

function CarIcon({ className }: { className?: string }) {
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
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2.7-3.6A2 2 0 0 0 13.7 5H10.3a2 2 0 0 0-1.6.9L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  );
}

export function TransportItemEditModal({
  open,
  mode,
  initial,
  onClose,
  onSubmit,
}: TransportItemEditModalProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<TransportFormData>(emptyForm);
  const [detailsText, setDetailsText] = useState('');

  useEffect(() => {
    if (!open) return;
    const next = initial ?? emptyForm;
    setForm(next);
    setDetailsText(arrayToLines(next.details));
  }, [open, initial]);

  const title =
    mode === 'add' ? t('planTrip.transport.addTitle') : t('planTrip.transport.editItemTitle');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) return;
    onSubmit({
      icon: form.icon,
      title: form.title.trim(),
      description: form.description.trim(),
      details: linesToArray(detailsText),
    });
    onClose();
  };

  const formId = 'trip-transport-form';

  return (
    <TripAnimatedModal
      open={open}
      onClose={onClose}
      title={title}
      description={t('planTrip.transport.editHint')}
      icon={<CarIcon />}
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
        <fieldset>
          <legend className="mb-sm font-sans text-body-sm font-medium">
            {t('planTrip.transport.fields.icon')}
          </legend>
          <div className="flex gap-sm">
            {ICONS.map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, icon }))}
                className={cn(
                  'flex-1 rounded-md border px-md py-sm font-sans text-body-sm transition-colors',
                  form.icon === icon
                    ? 'border-primary/40 bg-primary/10 text-ink'
                    : 'border-hairline bg-surface-2 text-ink-subtle hover:text-ink',
                )}
              >
                {t(`planTrip.transport.icons.${icon}`)}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="block">
          <span className="mb-xs block font-sans text-body-sm font-medium">
            {t('planTrip.edit.fields.title')}
            <span className="text-primary"> *</span>
          </span>
          <TextInput
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            required
            autoFocus
          />
        </label>

        <label className="block">
          <span className="mb-xs block font-sans text-body-sm font-medium">
            {t('planTrip.edit.fields.description')}
          </span>
          <TextInput
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          />
        </label>

        <label className="block">
          <span className="mb-xs block font-sans text-body-sm font-medium">
            {t('planTrip.edit.fields.details')}
          </span>
          <textarea
            className={textareaClassName}
            value={detailsText}
            onChange={(event) => setDetailsText(event.target.value)}
            placeholder={t('planTrip.edit.placeholders.details')}
          />
        </label>
      </form>
    </TripAnimatedModal>
  );
}
