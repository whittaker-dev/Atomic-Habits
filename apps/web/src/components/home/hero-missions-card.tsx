'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Fireworks, buildFireworkBurst } from '@/components/fireworks';
import { SuccessBadge } from '@/design-system/components/badges';
import { cn } from '@/lib/utils';

type MissionState = 'done' | 'active' | 'pending';
type MissionId = 'english' | 'fitness' | 'work';

const MISSIONS: { id: MissionId; type: MissionId; labelKey: string; xpKey: string; xp: number }[] =
  [
    {
      id: 'english',
      type: 'english',
      labelKey: 'home.mockup.missionEnglish',
      xpKey: 'home.mockup.xpEnglish',
      xp: 25,
    },
    {
      id: 'fitness',
      type: 'fitness',
      labelKey: 'home.mockup.missionExercise',
      xpKey: 'home.mockup.xpExercise',
      xp: 15,
    },
    {
      id: 'work',
      type: 'work',
      labelKey: 'home.mockup.missionTicket',
      xpKey: 'home.mockup.xpTicket',
      xp: 25,
    },
  ];

const BASE_LEVEL_XP = 315;
const MAX_LEVEL_XP = 500;

const DAY_COMPLETE_FIREWORKS = [
  buildFireworkBurst('main', '50%', '40%', 0, 32, 220, 300),
  buildFireworkBurst('left', '28%', '48%', 0.18, 22, 170, 240),
  buildFireworkBurst('right', '72%', '46%', 0.28, 22, 170, 240),
  buildFireworkBurst('top', '50%', '22%', 0.42, 18, 140, 200),
];

function MissionIcon({ type }: { type: MissionId }) {
  const base = 'h-4 w-4';
  if (type === 'english') {
    return (
      <svg viewBox="0 0 24 24" className={base} fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 5h8M4 9h6M4 13h4" strokeLinecap="round" />
        <path d="M14 5l6 7-6 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === 'fitness') {
    return (
      <svg viewBox="0 0 24 24" className={base} fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 4v16M18 4v16M6 12h12" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={base} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 6h8v12H8z" strokeLinejoin="round" />
      <path d="M12 6V4M9 20h6" strokeLinecap="round" />
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

function MissionRow({
  type,
  label,
  xp,
  state,
  delay,
  onToggle,
}: {
  type: MissionId;
  label: string;
  xp: string;
  state: MissionState;
  delay: number;
  onToggle: () => void;
}) {
  const iconColors = {
    english: 'bg-primary/15 text-primary',
    fitness: 'bg-warning/15 text-warning',
    work: 'bg-info/15 text-info',
  };

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      onClick={onToggle}
      aria-pressed={state === 'done'}
      className={cn(
        'flex w-full items-center gap-sm rounded-lg border px-sm py-xs text-left transition-colors',
        'cursor-pointer hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        state === 'active' && 'border-primary/30 bg-primary/5',
        state === 'done' && 'border-hairline bg-surface-2/50',
        state === 'pending' && 'border-transparent bg-surface-2/30 hover:bg-surface-2/50',
        state === 'done' && 'opacity-80',
      )}
    >
      <CheckState state={state} />
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
          iconColors[type],
        )}
      >
        <MissionIcon type={type} />
      </span>
      <span
        className={cn(
          'min-w-0 flex-1 font-sans text-body-sm',
          state === 'pending' ? 'text-ink-subtle' : 'text-ink',
          state === 'done' && 'text-ink-tertiary line-through',
        )}
      >
        {label}
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
        {xp}
      </motion.span>
    </motion.button>
  );
}

export function HeroMissionsCard() {
  const { t } = useTranslation();
  const [done, setDone] = useState<Record<MissionId, boolean>>({
    english: false,
    fitness: false,
    work: true,
  });

  const activeId = MISSIONS.find((m) => !done[m.id])?.id;

  const { completedCount, currentXp, progressPercent, isDayComplete } = useMemo(() => {
    const earnedToday = MISSIONS.filter((m) => done[m.id]).reduce((sum, m) => sum + m.xp, 0);
    const count = MISSIONS.filter((m) => done[m.id]).length;
    const allDone = count === MISSIONS.length;
    const current = BASE_LEVEL_XP + earnedToday;

    return {
      completedCount: count,
      currentXp: allDone ? MAX_LEVEL_XP : current,
      progressPercent: allDone ? 100 : Math.min(100, (current / MAX_LEVEL_XP) * 100),
      isDayComplete: allDone,
    };
  }, [done]);

  function toggleMission(id: MissionId) {
    setDone((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <motion.div
      className={cn(
        'relative rounded-xl border bg-surface-1 shadow-[0_32px_80px_rgba(0,0,0,0.45)]',
        isDayComplete ? 'overflow-visible border-primary/50' : 'overflow-hidden border-hairline',
      )}
      animate={
        isDayComplete
          ? {
              boxShadow: [
                '0 32px 80px rgba(0,0,0,0.45)',
                '0 32px 80px rgba(30,215,96,0.18)',
                '0 32px 80px rgba(0,0,0,0.45)',
              ],
            }
          : { boxShadow: '0 32px 80px rgba(0,0,0,0.45)' }
      }
      transition={
        isDayComplete ? { duration: 2.2, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }
      }
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
        animate={
          isDayComplete
            ? { scale: [1, 1.25, 1], opacity: [0.35, 0.65, 0.35] }
            : { scale: 1, opacity: 0.35 }
        }
        transition={
          isDayComplete ? { duration: 2.2, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }
        }
      />

      <AnimatePresence>
        {isDayComplete && (
          <Fireworks key="day-complete-fireworks" bursts={DAY_COMPLETE_FIREWORKS} />
        )}
      </AnimatePresence>

      <div className="border-b border-hairline px-lg py-md">
        <div className="flex items-center justify-between gap-md">
          <div className="text-left">
            <p className="font-sans text-caption font-bold uppercase tracking-[0.1em] text-primary">
              {t('home.mockup.title')}
            </p>
            <p className="mt-xxs font-sans text-body-sm font-bold text-ink">
              {t('home.mockup.missions')}
            </p>
          </div>
          <motion.div
            animate={
              isDayComplete
                ? { scale: [1, 1.12, 1], rotate: [0, -2, 2, 0] }
                : { scale: [1, 1.05, 1] }
            }
            transition={
              isDayComplete
                ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 2.5, repeat: Infinity, ease: 'easeInOut' }
            }
          >
            <SuccessBadge>{t('home.mockup.streak')}</SuccessBadge>
          </motion.div>
        </div>
      </div>

      <div className="space-y-xs px-lg py-md">
        {MISSIONS.map((mission, index) => {
          const isDone = done[mission.id];
          const state: MissionState = isDone
            ? 'done'
            : mission.id === activeId
              ? 'active'
              : 'pending';
          return (
            <MissionRow
              key={mission.id}
              type={mission.type}
              label={t(mission.labelKey)}
              xp={t(mission.xpKey)}
              state={state}
              delay={0.85 + index * 0.15}
              onToggle={() => toggleMission(mission.id)}
            />
          );
        })}

        <AnimatePresence>
          {isDayComplete && (
            <motion.div
              key="day-complete-banner"
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 420, damping: 26 }}
              className="relative overflow-hidden rounded-lg border border-primary/40 bg-primary/10 px-sm py-xs text-center"
            >
              <motion.div
                className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent"
                animate={{ x: ['-120%', '120%'] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'linear', repeatDelay: 0.6 }}
                aria-hidden
              />
              <p className="relative font-sans text-body-sm font-bold text-primary">
                {t('home.mockup.dayComplete')}
              </p>
              <p className="relative mt-xxs font-sans text-caption text-ink-subtle">
                {t('home.mockup.dayCompleteHint')}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="border-t border-hairline bg-surface-2/40 px-lg py-md">
        <div className="mb-sm flex items-center justify-between font-sans text-caption">
          <motion.span
            className={cn(isDayComplete ? 'font-bold text-primary' : 'text-ink-subtle')}
            animate={isDayComplete ? { scale: [1, 1.04, 1] } : { scale: 1 }}
            transition={isDayComplete ? { duration: 1.2, repeat: Infinity } : { duration: 0.2 }}
          >
            {t('home.mockup.complete', { count: completedCount, total: MISSIONS.length })}
          </motion.span>
          <motion.span
            key={currentXp}
            initial={{ scale: 1.15 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.25 }}
            className="font-mono font-bold text-primary"
          >
            {t('home.mockup.progress', { current: currentXp, max: MAX_LEVEL_XP })}
          </motion.span>
        </div>
        <div className="flex items-center justify-between gap-md">
          <div className="min-w-0 flex-1">
            <p className="mb-xs font-sans text-caption text-ink-subtle">{t('home.mockup.level')}</p>
            <div className="relative h-2 overflow-hidden rounded-pill bg-surface-3">
              <motion.div
                className={cn(
                  'h-full rounded-pill bg-gradient-to-r from-primary-focus via-primary to-primary-hover',
                  isDayComplete && 'shadow-[0_0_12px_rgba(30,215,96,0.55)]',
                )}
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={
                  isDayComplete
                    ? { type: 'spring', stiffness: 260, damping: 22 }
                    : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }
                }
              />
              <AnimatePresence>
                {isDayComplete && (
                  <motion.div
                    key="progress-shimmer"
                    className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/35 to-transparent"
                    initial={{ x: '-100%', opacity: 0 }}
                    animate={{ x: '320%', opacity: [0, 1, 0] }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: 1.1,
                      repeat: Infinity,
                      repeatDelay: 0.8,
                      ease: 'easeInOut',
                    }}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
          <motion.div
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg font-sans text-body-sm font-bold',
              isDayComplete ? 'bg-primary text-on-primary' : 'bg-primary/15 text-primary',
            )}
            initial={{ scale: 0 }}
            animate={isDayComplete ? { scale: [1, 1.14, 1], rotate: [0, -4, 4, 0] } : { scale: 1 }}
            transition={
              isDayComplete
                ? { duration: 1.3, repeat: Infinity, ease: 'easeInOut' }
                : { delay: 1.5, type: 'spring', stiffness: 400, damping: 18 }
            }
          >
            7
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
