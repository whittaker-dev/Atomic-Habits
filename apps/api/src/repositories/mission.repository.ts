import { prisma } from '../lib/prisma.js';

export const missionRepository = {
  countByUserId(userId: string): Promise<number> {
    return prisma.mission.count({ where: { userId } });
  },

  findCategoriesBySlugs(slugs: string[]) {
    return prisma.missionCategory.findMany({
      where: { slug: { in: slugs } },
    });
  },

  createMany(
    data: Array<{
      userId: string;
      categoryId: string;
      title: string;
      xpReward: number;
      sortOrder: number;
    }>,
  ): Promise<{ count: number }> {
    return prisma.mission.createMany({ data });
  },
};
