import { missionRepository } from '../repositories/mission.repository.js';

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
};
