'use client';

import { motion } from 'framer-motion';
import type { Mission, MissionCategorySlug } from '@atomic-habits/shared';
import { cn } from '@/lib/utils';

type MissionState = 'done' | 'active' | 'pending';

function MissionIcon({ slug }: { slug: MissionCategorySlug }) {
  const base = 'h-4 w-4';
  if (slug === 'english' || slug === 'reading') {
    return (
      <svg viewBox="0 0 24 24" className={base} fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 5h8M4 9h6M4 13h4" strokeLinecap="round" />
        <path d="M14 5l6 7-6 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (slug === 'fitness') {
    return (
      <svg viewBox="0 0 24 24" className={base} fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 4v16M18 4v16M6 12h12" strokeLinecap="round" />
      </svg>
    );
  }
  if (slug === 'coding') {
    return (
      <svg viewBox="0 0 24 24" className={base} fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8 9l-4 4 4 4M16 9l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (slug === 'work') {
    return (
      <svg viewBox="0 0 24 24" className={base} fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8 6h8v12H8z" strokeLinejoin="round" />
        <path d="M12 6V4M9 20h6" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={base} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" strokeLinecap="round" />
    </svg>
  );
}

function CheckState({ state }: { state: MissionState }) {
  if (state === 'done') {
    return (
      <motion.span
        className="flex h-5 w-5 items-center justify-center rounded-md bg-primary text-on-primary"
        initial={{ scale: 0.6 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 22 }}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-3 w-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        >
          <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.span>
    );
  }
  if (state === 'active') {
    return (
      <motion.span
        className="flex h-5 w-5 items-center justify-center rounded-md border-2 border-primary bg-primary/10"
        animate={{
          boxShadow: [
            '0 0 0 0 rgba(30,215,96,0.4)',
            '0 0 0 6px rgba(30,215,96,0)',
            '0 0 0 0 rgba(30,215,96,0)',
          ],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    );
  }
  return <span className="h-5 w-5 rounded-md border border-hairline-strong bg-surface-2" />;
}

const iconColors: Record<MissionCategorySlug, string> = {
  english: 'bg-primary/15 text-primary',
  fitness: 'bg-warning/15 text-warning',
  work: 'bg-info/15 text-info',
  reading: 'bg-primary/15 text-primary',
  coding: 'bg-info/15 text-info',
  meditation: 'bg-warning/15 text-warning',
  wellness: 'bg-success/15 text-success',
  custom: 'bg-surface-3 text-ink-muted',
};

export function MissionRow({
  mission,
  state,
  xpLabel,
  disabled,
  onComplete,
}: {
  mission: Mission;
  state: MissionState;
  xpLabel: string;
  disabled?: boolean;
  onComplete: () => void;
}) {
  const slug = mission.category.slug;

  return (
    <motion.button
      type="button"
      disabled={disabled || state === 'done'}
      onClick={onComplete}
      aria-pressed={state === 'done'}
      className={cn(
        'flex w-full items-center gap-sm rounded-lg border px-sm py-xs text-left transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        state === 'done' && 'cursor-default opacity-80',
        state !== 'done' && 'cursor-pointer hover:border-primary/40',
        state === 'active' && 'border-primary/30 bg-primary/5',
        state === 'done' && 'border-hairline bg-surface-2/50',
        state === 'pending' && 'border-transparent bg-surface-2/30 hover:bg-surface-2/50',
        disabled && state !== 'done' && 'pointer-events-none opacity-60',
      )}
    >
      <CheckState state={state} />
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
          iconColors[slug] ?? iconColors.custom,
        )}
      >
        <MissionIcon slug={slug} />
      </span>
      <span
        className={cn(
          'min-w-0 flex-1 font-sans text-body-sm',
          state === 'pending' ? 'text-ink-subtle' : 'text-ink',
          state === 'done' && 'text-ink-tertiary line-through',
        )}
      >
        {mission.title}
      </span>
      <motion.span
        key={state}
        initial={state === 'done' ? { scale: 1.2 } : false}
        animate={{ scale: 1 }}
        className={cn(
          'shrink-0 rounded-pill px-xs py-xxs font-mono text-caption',
          state === 'done' ? 'bg-primary/20 text-primary' : 'bg-surface-3 text-primary',
        )}
      >
        {xpLabel}
      </motion.span>
    </motion.button>
  );
}
