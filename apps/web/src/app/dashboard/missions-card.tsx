'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { xpInCurrentLevel } from '@atomic-habits/shared';
import { Fireworks, buildFireworkBurst } from '@/components/fireworks';
import { SuccessBadge } from '@/design-system/components/badges';
import { Button } from '@/design-system/components/button';
import { useCompleteMission, useDashboard } from '@/lib/use-dashboard';
import { cn } from '@/lib/utils';
import { MissionRow } from './mission-row';

const DAY_COMPLETE_FIREWORKS = [
  buildFireworkBurst('main', '50%', '40%', 0, 32, 220, 300),
  buildFireworkBurst('left', '28%', '48%', 0.18, 22, 170, 240),
  buildFireworkBurst('right', '72%', '46%', 0.28, 22, 170, 240),
  buildFireworkBurst('top', '50%', '22%', 0.42, 18, 140, 200),
];

export function MissionsCard() {
  const { t } = useTranslation();
  const { data, error, isLoading, mutate } = useDashboard();
  const completeMission = useCompleteMission(mutate);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const isDayComplete = data
    ? data.today.completed === data.today.total && data.today.total > 0
    : false;

  const activeMissionId = useMemo(() => {
    if (!data) return undefined;
    return data.missions.find((m) => !m.completedToday)?.id;
  }, [data]);

  const xpDisplay = useMemo(() => {
    if (!data) return { current: 0, toNext: 100 };
    return xpInCurrentLevel(data.xp.total, data.xp.level);
  }, [data]);

  async function handleComplete(missionId: string) {
    if (!data || completingId) return;
    const mission = data.missions.find((m) => m.id === missionId);
    if (!mission?.completedToday) {
      setCompletingId(missionId);
      try {
        await completeMission(missionId, data);
      } finally {
        setCompletingId(null);
      }
    }
  }

  if (isLoading) {
    return (
      <div className="panel-lift rounded-xl border border-hairline bg-surface-1 p-lg">
        <p className="font-sans text-body text-ink-muted">{t('dashboard.loading')}</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="panel-lift rounded-xl border border-hairline bg-surface-1 p-lg text-center">
        <p className="font-sans text-body text-ink-muted">{t('dashboard.error')}</p>
        <Button variant="secondary" className="mt-md" onClick={() => mutate()}>
          {t('dashboard.retry')}
        </Button>
      </div>
    );
  }

  const streakLabel =
    data.streak.current > 0
      ? t('dashboard.streak', { count: data.streak.current })
      : t('dashboard.streakEmpty');

  return (
    <motion.div
      className={cn(
        'panel-lift relative rounded-xl border bg-surface-1',
        isDayComplete ? 'overflow-visible border-primary/50' : 'overflow-hidden border-hairline',
      )}
      animate={
        isDayComplete
          ? {
              boxShadow: [
                '0 8px 32px rgba(0,0,0,0.25)',
                '0 8px 32px rgba(30,215,96,0.18)',
                '0 8px 32px rgba(0,0,0,0.25)',
              ],
            }
          : undefined
      }
      transition={
        isDayComplete ? { duration: 2.2, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }
      }
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
        aria-hidden
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
              {t('dashboard.eyebrow')}
            </p>
            <p className="mt-xxs font-sans text-body-sm font-bold text-ink">
              {t('dashboard.missionsTitle')}
            </p>
          </div>
          <motion.div
            animate={
              isDayComplete
                ? { scale: [1, 1.12, 1], rotate: [0, -2, 2, 0] }
                : data.streak.current > 0
                  ? { scale: [1, 1.05, 1] }
                  : { scale: 1 }
            }
            transition={
              isDayComplete || data.streak.current > 0
                ? { duration: isDayComplete ? 1.4 : 2.5, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 0.2 }
            }
          >
            <SuccessBadge>
              {data.streak.current > 0 ? `🔥 ${streakLabel}` : streakLabel}
            </SuccessBadge>
          </motion.div>
        </div>
      </div>

      <div className="space-y-xs px-lg py-md">
        {data.missions.length === 0 ? (
          <p className="py-sm text-center font-sans text-body-sm text-ink-muted">
            {t('dashboard.empty')}
          </p>
        ) : (
          data.missions.map((mission) => {
            const state = mission.completedToday
              ? 'done'
              : mission.id === activeMissionId
                ? 'active'
                : 'pending';
            return (
              <MissionRow
                key={mission.id}
                mission={mission}
                state={state}
                xpLabel={t('dashboard.xpReward', { xp: mission.xpReward })}
                disabled={completingId !== null}
                onComplete={() => handleComplete(mission.id)}
              />
            );
          })
        )}

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
              <p className="relative font-sans text-body-sm font-bold text-primary">
                {t('dashboard.dayComplete')}
              </p>
              <p className="relative mt-xxs font-sans text-caption text-ink-subtle">
                {t('dashboard.dayCompleteHint')}
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
            {t('dashboard.complete', {
              count: data.today.completed,
              total: data.today.total,
            })}
          </motion.span>
          <motion.span
            key={data.xp.total}
            initial={{ scale: 1.15 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.25 }}
            className="font-mono font-bold text-primary"
          >
            {t('dashboard.progress', {
              current: xpDisplay.current,
              max: xpDisplay.toNext,
            })}
          </motion.span>
        </div>
        <div className="flex items-center justify-between gap-md">
          <div className="min-w-0 flex-1">
            <p className="mb-xs font-sans text-caption text-ink-subtle">
              {t('dashboard.level', { level: data.xp.level })}
            </p>
            <div className="relative h-2 overflow-hidden rounded-pill bg-surface-3">
              <motion.div
                className={cn(
                  'h-full rounded-pill bg-gradient-to-r from-primary-focus via-primary to-primary-hover',
                  isDayComplete && 'shadow-[0_0_12px_rgba(30,215,96,0.55)]',
                )}
                initial={false}
                animate={{ width: `${data.xp.progress}%` }}
                transition={
                  isDayComplete
                    ? { type: 'spring', stiffness: 260, damping: 22 }
                    : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }
                }
              />
            </div>
          </div>
          <motion.div
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg font-sans text-body-sm font-bold',
              isDayComplete ? 'bg-primary text-on-primary' : 'bg-primary/15 text-primary',
            )}
            animate={isDayComplete ? { scale: [1, 1.14, 1], rotate: [0, -4, 4, 0] } : { scale: 1 }}
            transition={
              isDayComplete
                ? { duration: 1.3, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 0.2 }
            }
          >
            {data.xp.level}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
