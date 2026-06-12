import type { DashboardSummary } from '@atomic-habits/shared';
import useSWR from 'swr';
import {
  applyOptimisticComplete,
  completeMission,
  DASHBOARD_KEY,
  fetchDashboard,
} from './dashboard-api';

export function useDashboard() {
  return useSWR(DASHBOARD_KEY, fetchDashboard);
}

export function useCompleteMission(mutate: ReturnType<typeof useDashboard>['mutate']) {
  return async function complete(missionId: string, current: DashboardSummary | undefined) {
    if (!current) {
      return;
    }

    const mission = current.missions.find((m) => m.id === missionId);
    if (!mission || mission.completedToday) {
      return;
    }

    await mutate(async () => completeMission(missionId), {
      optimisticData: applyOptimisticComplete(current, missionId),
      rollbackOnError: true,
      revalidate: false,
      populateCache: true,
    });
  };
}
