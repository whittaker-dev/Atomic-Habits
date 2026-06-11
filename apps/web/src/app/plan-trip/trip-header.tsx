'use client';

import { useTranslation } from 'react-i18next';
import { Button } from '@/design-system/components/button';
import { SUPPORTED_LOCALES, type Locale } from '@/i18n/client';
import { cn } from '@/lib/utils';

type TripHeaderProps = {
  title: string;
  datesLabel: string;
  saving?: boolean;
  onEditTrip?: () => void;
};

export function TripHeader({ title, datesLabel, saving, onEditTrip }: TripHeaderProps) {
  const { t, i18n } = useTranslation();
  const current = (SUPPORTED_LOCALES as readonly string[]).includes(i18n.language)
    ? (i18n.language as Locale)
    : 'vi';

  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-surface-1/90 backdrop-blur-sm">
      <div className="container-content flex h-14 items-center justify-between gap-md">
        <div className="min-w-0">
          <p className="truncate font-sans text-body-sm font-medium text-ink">{title}</p>
          <p className="truncate font-sans text-caption text-ink-subtle">
            {datesLabel || t('planTrip.trip.noDates')}
            {saving ? ` · ${t('planTrip.trip.saving')}` : ''}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-sm">
          {onEditTrip && (
            <Button variant="secondary" className="hidden sm:inline-flex" onClick={onEditTrip}>
              {t('planTrip.trip.editButton')}
            </Button>
          )}

          <div
            className="panel-lift flex rounded-pill bg-surface-1 p-0.5"
            role="group"
            aria-label={t('common.language.label')}
          >
            {SUPPORTED_LOCALES.map((locale) => (
              <button
                key={locale}
                type="button"
                onClick={() => void i18n.changeLanguage(locale)}
                className={cn(
                  'min-h-8 rounded-pill px-sm font-sans text-caption font-medium transition-colors',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-focus/50',
                  current === locale ? 'bg-surface-3 text-ink' : 'text-ink-subtle hover:text-ink',
                )}
                aria-pressed={current === locale}
              >
                {t(`common.language.${locale}`)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
