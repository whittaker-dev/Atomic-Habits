import type { DashboardSummary, Mission, MissionCategorySlug } from '@atomic-habits/shared';
import type { MissionCategory, Mission as PrismaMission } from '@prisma/client';
import { progressInLevel } from '../lib/xp.js';
import {
  getDashboardCache,
  getStreakCache,
  setDashboardCache,
  setStreakCache,
} from '../lib/redis/cache.js';
import { dateStringToUtcDate, getTodayDateString } from '../lib/user-date.js';
import { missionRepository } from '../repositories/mission.repository.js';
import { userRepository } from '../repositories/user.repository.js';

type MissionWithCategory = PrismaMission & { category: MissionCategory };

function mapCategory(category: MissionCategory) {
  return {
    id: category.id,
    slug: category.slug as MissionCategorySlug,
    nameKey: category.nameKey,
    icon: category.icon,
    defaultXpReward: category.defaultXpReward,
    sortOrder: category.sortOrder,
  };
}

function mapMission(mission: MissionWithCategory, completedToday: boolean): Mission {
  return {
    id: mission.id,
    title: mission.title,
    categoryId: mission.categoryId,
    category: mapCategory(mission.category),
    xpReward: mission.xpReward,
    completedToday,
  };
}

async function resolveStreak(userId: string, fallbackCurrent: number, fallbackBest: number) {
  const cached = await getStreakCache(userId);
  if (cached) {
    return cached;
  }

  const streak = { current: fallbackCurrent, best: fallbackBest };
  await setStreakCache(userId, streak.current, streak.best);
  return streak;
}

export const dashboardService = {
  async getSummary(userId: string): Promise<DashboardSummary> {
    const cached = await getDashboardCache(userId);
    if (cached) {
      return cached;
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const todayString = getTodayDateString(user.timezone);
    const todayDate = dateStringToUtcDate(todayString);

    const [missions, completedMissionIds, streak] = await Promise.all([
      missionRepository.findActiveByUserIdWithCategory(userId),
      missionRepository.findCompletedMissionIdsForDate(userId, todayDate),
      resolveStreak(userId, user.currentStreak, user.bestStreak),
    ]);

    const completedSet = new Set(completedMissionIds);
    const mappedMissions = missions.map((mission) =>
      mapMission(mission, completedSet.has(mission.id)),
    );
    const todayCompleted = mappedMissions.filter((m) => m.completedToday).length;

    const summary: DashboardSummary = {
      streak: { current: streak.current, best: streak.best },
      xp: {
        total: user.totalXp,
        level: user.level,
        progress: progressInLevel(user.totalXp, user.level),
      },
      today: { completed: todayCompleted, total: mappedMissions.length },
      missions: mappedMissions,
    };

    await setDashboardCache(userId, summary);
    return summary;
  },
};
