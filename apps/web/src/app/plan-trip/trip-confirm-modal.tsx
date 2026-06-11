'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/design-system/components/button';
import { cn } from '@/lib/utils';

const backdropMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const },
};

const panelMotion = {
  initial: { opacity: 0, scale: 0.94, y: 16 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.97, y: 8 },
  transition: { type: 'spring' as const, stiffness: 440, damping: 34, mass: 0.75 },
};

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  );
}

type TripConfirmModalProps = {
  open: boolean;
  itemName: string;
  hint: string;
  onClose: () => void;
  onConfirm: () => void;
};

export function TripConfirmModal({
  open,
  itemName,
  hint,
  onClose,
  onConfirm,
}: TripConfirmModalProps) {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    const timer = window.setTimeout(() => panelRef.current?.focus(), 50);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(timer);
    };
  }, [open, onClose]);

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const modal = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-md">
          <motion.button
            type="button"
            {...backdropMotion}
            className="absolute inset-0 bg-[rgba(18,28,18,0.2)] backdrop-blur-[6px] backdrop-saturate-[1.05]"
            aria-label={t('common.actions.cancel')}
            onClick={onClose}
          />

          <motion.div
            ref={panelRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="trip-confirm-title"
            aria-describedby="trip-confirm-desc"
            tabIndex={-1}
            {...panelMotion}
            className={cn(
              'trip-light panel-lift relative z-10 w-full max-w-[20rem] overflow-hidden rounded-2xl',
              'border border-hairline bg-surface-1 text-ink shadow-[0_20px_60px_rgba(0,0,0,0.18)] outline-none sm:max-w-xs',
            )}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-lg pb-md pt-xl text-center">
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.06, type: 'spring', stiffness: 420, damping: 22 }}
                className="mx-auto mb-md flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-2xl bg-gradient-to-br from-error/15 to-error/5 ring-1 ring-error/20"
              >
                <TrashIcon className="text-error" />
              </motion.div>

              <h2 id="trip-confirm-title" className="font-sans text-card-title font-bold">
                {t('planTrip.confirm.title')}
              </h2>

              <div className="mt-md rounded-xl border border-error/15 bg-gradient-to-b from-error/[0.06] to-surface-2/40 px-md py-sm text-left">
                <p className="truncate font-sans text-body font-semibold text-ink">{itemName}</p>
                <p
                  id="trip-confirm-desc"
                  className="mt-1 font-sans text-caption leading-relaxed text-ink-muted"
                >
                  {hint}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-sm border-t border-hairline bg-surface-1/95 p-md backdrop-blur-sm">
              <Button type="button" variant="secondary" className="w-full" onClick={onClose}>
                {t('common.actions.cancel')}
              </Button>
              <Button
                type="button"
                className="w-full border border-error/25 bg-error/10 text-error hover:bg-error/15 active:bg-error/20"
                onClick={handleConfirm}
              >
                {t('planTrip.confirm.delete')}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (!mounted) return null;
  return createPortal(modal, document.body);
}
