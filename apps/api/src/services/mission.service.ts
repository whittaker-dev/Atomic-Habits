import { invalidateDashboardCache, setStreakCache } from '../lib/redis/cache.js';
import { levelFromXp } from '../lib/xp.js';
import {
  dateStringToUtcDate,
  getTodayDateString,
  getYesterdayDateString,
} from '../lib/user-date.js';
import { missionRepository } from '../repositories/mission.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { apiError } from '../schemas/parse.js';
import { dashboardService } from './dashboard.service.js';

const DEFAULT_MISSIONS = [
  { categorySlug: 'english', title: 'Learn 10 English words', sortOrder: 1 },
  { categorySlug: 'fitness', title: 'Exercise 20 mins', sortOrder: 2 },
  { categorySlug: 'work', title: 'Finish one work task', sortOrder: 3 },
] as const;

export const missionService = {
  async seedDefaultMissions(userId: string): Promise<void> {
    const existing = await missionRepository.countByUserId(userId);
    if (existing > 0) {
      return;
    }

    const slugs = DEFAULT_MISSIONS.map((m) => m.categorySlug);
    const categories = await missionRepository.findCategoriesBySlugs([...slugs]);
    const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

    await missionRepository.createMany(
      DEFAULT_MISSIONS.flatMap((mission) => {
        const category = categoryBySlug.get(mission.categorySlug);
        if (!category) return [];
        return [
          {
            userId,
            categoryId: category.id,
            title: mission.title,
            xpReward: category.defaultXpReward,
            sortOrder: mission.sortOrder,
          },
        ];
      }),
    );
  },

  async completeMission(userId: string, missionId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw apiError('User not found', 404);
    }

    const mission = await missionRepository.findByIdAndUserId(missionId, userId);
    if (!mission) {
      throw apiError('Mission not found', 404);
    }

    const todayDate = dateStringToUtcDate(getTodayDateString(user.timezone));
    const existing = await missionRepository.findCompletion(userId, missionId, todayDate);
    if (existing) {
      await invalidateDashboardCache(userId);
      return dashboardService.getSummary(userId);
    }

    const completionsBefore = await missionRepository.countCompletionsForDate(userId, todayDate);
    await missionRepository.createCompletion(userId, missionId, todayDate);

    const newTotalXp = user.totalXp + mission.xpReward;
    const newLevel = levelFromXp(newTotalXp);

    let newStreak = user.currentStreak;
    if (completionsBefore === 0) {
      const yesterdayDate = dateStringToUtcDate(getYesterdayDateString(user.timezone));
      const hadYesterday =
        (await missionRepository.countCompletionsForDate(userId, yesterdayDate)) > 0;
      newStreak = hadYesterday ? user.currentStreak + 1 : 1;
    }

    const newBest = Math.max(user.bestStreak, newStreak);

    await userRepository.updateGamification(userId, {
      totalXp: newTotalXp,
      level: newLevel,
      currentStreak: newStreak,
      bestStreak: newBest,
    });

    await invalidateDashboardCache(userId);
    await setStreakCache(userId, newStreak, newBest);

    return dashboardService.getSummary(userId);
  },
};
