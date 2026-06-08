'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

const backdropMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const },
};

const panelMotion = {
  initial: { opacity: 0, scale: 0.92, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: 12 },
  transition: { type: 'spring' as const, stiffness: 420, damping: 32, mass: 0.8 },
};

const itemMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 6 },
};

export function LanguageModal() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { i18n, t } = useTranslation();
  const current = i18n.language as Locale;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    const timer = window.setTimeout(() => panelRef.current?.focus(), 50);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(timer);
    };
  }, [open]);

  const selectLocale = (locale: Locale) => {
    void i18n.changeLanguage(locale);
    setOpen(false);
  };

  const modal = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-md">
          <motion.button
            type="button"
            {...backdropMotion}
            className="absolute inset-0 bg-canvas/70 backdrop-blur-md"
            aria-label={t('common.actions.cancel')}
            onClick={() => setOpen(false)}
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="language-modal-title"
            tabIndex={-1}
            {...panelMotion}
            className="panel-lift relative z-10 w-full max-w-[360px] overflow-hidden rounded-xl border border-hairline bg-surface-1 shadow-[0_24px_80px_rgba(0,0,0,0.55)] outline-none"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-sm top-sm flex h-8 w-8 items-center justify-center rounded-md text-ink-subtle transition-colors hover:bg-surface-2 hover:text-ink"
              aria-label={t('common.actions.cancel')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="h-4 w-4"
                aria-hidden
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>

            <div className="flex flex-col items-center px-xl pb-xl pt-xxl text-center">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.08, type: 'spring', stiffness: 400, damping: 22 }}
                className="mb-lg flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary"
              >
                <GlobeIcon className="h-7 w-7" />
              </motion.div>

              <h2 id="language-modal-title" className="font-sans text-headline font-bold">
                {t('common.language.modalTitle')}
              </h2>
              <p className="mt-xs max-w-[260px] font-sans text-body-sm text-ink-muted">
                {t('common.language.modalDescription')}
              </p>
            </div>

            <ul className="space-y-xs px-lg pb-lg">
              {SUPPORTED_LOCALES.map((locale, index) => {
                const selected = current === locale;

                return (
                  <motion.li
                    key={locale}
                    {...itemMotion}
                    transition={{
                      delay: 0.12 + index * 0.06,
                      duration: 0.3,
                      ease: [0.22, 1, 0.36, 1] as const,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => selectLocale(locale)}
                      className={cn(
                        'flex w-full items-center gap-sm rounded-lg border px-md py-sm font-sans text-body transition-all duration-200',
                        selected
                          ? 'border-primary/40 bg-primary/10 text-ink shadow-[inset_0_0_0_1px_rgba(30,215,96,0.15)]'
                          : 'border-transparent bg-surface-2 text-ink-subtle hover:border-hairline hover:bg-surface-3 hover:text-ink',
                      )}
                      aria-pressed={selected}
                    >
                      <span
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-md font-sans text-caption font-bold uppercase',
                          selected ? 'bg-primary text-on-primary' : 'bg-surface-3 text-ink-muted',
                        )}
                      >
                        {locale}
                      </span>
                      <span className="flex-1 text-left">{t(`common.language.${locale}`)}</span>
                      <span
                        className={cn(
                          'flex h-6 w-6 items-center justify-center rounded-full transition-all duration-200',
                          selected ? 'bg-primary text-on-primary' : 'bg-transparent',
                        )}
                      >
                        {selected && <CheckIcon className="h-3.5 w-3.5" />}
                      </span>
                    </button>
                  </motion.li>
                );
              })}
            </ul>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

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

      {mounted && createPortal(modal, document.body)}
    </>
  );
}
