'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/design-system/components/button';
import { TextInput } from '@/design-system/components/input';
import { TripAnimatedModal } from './trip-animated-modal';
import type { TripMember } from './trip-plan-types';

type MemberFormData = Omit<TripMember, 'id'>;

type MemberFormModalProps = {
  open: boolean;
  mode: 'add' | 'edit';
  initial?: MemberFormData;
  onClose: () => void;
  onSubmit: (data: MemberFormData) => void;
};

const emptyForm: MemberFormData = { name: '', role: '', phone: '', note: '' };

function UsersIcon({ className }: { className?: string }) {
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
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function MemberFormModal({ open, mode, initial, onClose, onSubmit }: MemberFormModalProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<MemberFormData>(emptyForm);

  useEffect(() => {
    if (open) {
      setForm(initial ?? emptyForm);
    }
  }, [open, initial]);

  const title = mode === 'add' ? t('planTrip.members.addTitle') : t('planTrip.members.editTitle');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) return;
    onSubmit({
      name,
      role: form.role.trim(),
      phone: form.phone.trim(),
      note: form.note.trim(),
    });
    onClose();
  };

  const formId = 'trip-member-form';

  return (
    <TripAnimatedModal
      open={open}
      onClose={onClose}
      title={title}
      description={t('planTrip.members.formHint')}
      icon={<UsersIcon />}
      className="max-w-md"
      footer={
        <div className="flex flex-col-reverse gap-sm sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.actions.cancel')}
          </Button>
          <Button type="submit" form={formId}>
            {t('planTrip.members.save')}
          </Button>
        </div>
      }
    >
      <form id={formId} className="space-y-md" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-xs block font-sans text-body-sm font-medium">
            {t('planTrip.members.fields.name')}
            <span className="text-primary"> *</span>
          </span>
          <TextInput
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder={t('planTrip.members.placeholders.name')}
            required
            autoFocus
          />
        </label>

        <label className="block">
          <span className="mb-xs block font-sans text-body-sm font-medium">
            {t('planTrip.members.fields.role')}
          </span>
          <TextInput
            value={form.role}
            onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
            placeholder={t('planTrip.members.placeholders.role')}
          />
        </label>

        <label className="block">
          <span className="mb-xs block font-sans text-body-sm font-medium">
            {t('planTrip.members.fields.phone')}
          </span>
          <TextInput
            type="tel"
            value={form.phone}
            onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
            placeholder={t('planTrip.members.placeholders.phone')}
          />
        </label>

        <label className="block">
          <span className="mb-xs block font-sans text-body-sm font-medium">
            {t('planTrip.members.fields.note')}
          </span>
          <TextInput
            value={form.note}
            onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
            placeholder={t('planTrip.members.placeholders.note')}
          />
        </label>
      </form>
    </TripAnimatedModal>
  );
}
