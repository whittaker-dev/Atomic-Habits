'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

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

type TripAnimatedModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  align?: 'center' | 'bottom';
};

export function TripAnimatedModal({
  open,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  className,
  align = 'center',
}: TripAnimatedModalProps) {
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

  const modal = (
    <AnimatePresence>
      {open && (
        <div
          className={cn(
            'fixed inset-0 z-[200] flex p-md',
            align === 'bottom' ? 'items-end sm:items-center' : 'items-center justify-center',
          )}
        >
          <motion.button
            type="button"
            {...backdropMotion}
            className="absolute inset-0 bg-[rgba(18,28,18,0.18)] backdrop-blur-[6px] backdrop-saturate-[1.1]"
            aria-label={t('common.actions.cancel')}
            onClick={onClose}
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="trip-modal-title"
            tabIndex={-1}
            {...panelMotion}
            className={cn(
              'trip-light panel-lift relative z-10 flex w-full max-h-[min(90vh,100%)] flex-col overflow-hidden rounded-xl',
              'border border-hairline bg-surface-1 text-ink outline-none shadow-[0_24px_80px_rgba(0,0,0,0.16)]',
              className,
            )}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-sm top-sm z-10 flex h-8 w-8 items-center justify-center rounded-md text-ink-subtle transition-colors hover:bg-surface-2 hover:text-ink"
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

            <div className="shrink-0 px-xl pb-md pt-xxl text-center">
              {icon && (
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.08, type: 'spring', stiffness: 400, damping: 22 }}
                  className="mx-auto mb-md flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary"
                >
                  {icon}
                </motion.div>
              )}
              <h2 id="trip-modal-title" className="font-sans text-card-title font-bold">
                {title}
              </h2>
              {description && (
                <p className="mx-auto mt-xs max-w-md font-sans text-body-sm text-ink-muted">
                  {description}
                </p>
              )}
            </div>

            <div
              className={cn(
                'min-h-0 flex-1 overflow-y-auto overscroll-contain px-lg',
                footer ? 'pb-md' : 'pb-lg',
              )}
            >
              {children}
            </div>

            {footer && (
              <div className="shrink-0 border-t border-hairline bg-surface-1/95 px-lg py-md backdrop-blur-sm">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (!mounted) return null;
  return createPortal(modal, document.body);
}
