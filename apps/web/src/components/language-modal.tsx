'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { SUPPORTED_LOCALES, type Locale } from '@/i18n/client';

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 1 4 10 14.5 14.5 0 0 1-4 10 14.5 14.5 0 0 1-4-10 14.5 14.5 0 0 1 4-10z" />
      <path d="M2 12h20" />
    </svg>
  );
}

export function LanguageModal() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { i18n, t } = useTranslation();
  const current = i18n.language as Locale;

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    panelRef.current?.focus();

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const selectLocale = (locale: Locale) => {
    void i18n.changeLanguage(locale);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-md text-ink-subtle transition-colors hover:bg-surface-1 hover:text-ink"
        aria-label={t('common.language.label')}
      >
        <GlobeIcon className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-md">
          <button
            type="button"
            className="absolute inset-0 bg-canvas/80 backdrop-blur-sm"
            aria-label={t('common.actions.cancel')}
            onClick={() => setOpen(false)}
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="language-modal-title"
            tabIndex={-1}
            className="panel-lift relative w-full max-w-sm rounded-lg bg-surface-1 p-lg outline-none"
          >
            <h2 id="language-modal-title" className="font-sans text-headline font-semibold">
              {t('common.language.modalTitle')}
            </h2>
            <p className="mt-xs font-sans text-body-sm text-ink-muted">
              {t('common.language.modalDescription')}
            </p>

            <ul className="mt-lg space-y-xs">
              {SUPPORTED_LOCALES.map((locale) => (
                <li key={locale}>
                  <button
                    type="button"
                    onClick={() => selectLocale(locale)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-md px-sm py-xs font-sans text-body transition-colors',
                      current === locale
                        ? 'bg-primary/15 text-ink'
                        : 'text-ink-subtle hover:bg-surface-2 hover:text-ink',
                    )}
                    aria-pressed={current === locale}
                  >
                    <span>{t(`common.language.${locale}`)}</span>
                    {current === locale && (
                      <span className="font-sans text-caption font-medium text-primary">
                        {locale.toUpperCase()}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
