import type { DashboardSummary } from '@atomic-habits/shared';
import { levelFromXp, progressInLevel } from '@atomic-habits/shared';
import { isAxiosError } from 'axios';
import { apiClient, getErrorMessage } from './api-client';

export const DASHBOARD_KEY = '/dashboard';

export async function fetchDashboard(): Promise<DashboardSummary> {
  try {
    const { data } = await apiClient.get<DashboardSummary>(DASHBOARD_KEY);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function completeMission(missionId: string): Promise<DashboardSummary> {
  try {
    const { data } = await apiClient.post<DashboardSummary>(`/missions/${missionId}/complete`);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export function applyOptimisticComplete(
  summary: DashboardSummary,
  missionId: string,
): DashboardSummary {
  const mission = summary.missions.find((m) => m.id === missionId);
  if (!mission || mission.completedToday) {
    return summary;
  }

  const missions = summary.missions.map((m) =>
    m.id === missionId ? { ...m, completedToday: true } : m,
  );
  const wasFirstToday = summary.today.completed === 0;
  const newTotalXp = summary.xp.total + mission.xpReward;
  const newLevel = levelFromXp(newTotalXp);
  const newStreakCurrent = wasFirstToday
    ? summary.streak.current > 0
      ? summary.streak.current + 1
      : 1
    : summary.streak.current;

  return {
    streak: {
      current: newStreakCurrent,
      best: Math.max(summary.streak.best, newStreakCurrent),
    },
    xp: {
      total: newTotalXp,
      level: newLevel,
      progress: progressInLevel(newTotalXp, newLevel),
    },
    today: {
      completed: summary.today.completed + 1,
      total: summary.today.total,
    },
    missions,
  };
}

export function isDashboardAuthError(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 401;
}
