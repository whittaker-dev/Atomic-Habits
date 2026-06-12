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

  findActiveByUserIdWithCategory(userId: string) {
    return prisma.mission.findMany({
      where: { userId, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: { category: true },
    });
  },

  async findCompletedMissionIdsForDate(userId: string, completedDate: Date): Promise<string[]> {
    const rows = await prisma.missionCompletion.findMany({
      where: { userId, completedDate },
      select: { missionId: true },
    });
    return rows.map((row) => row.missionId);
  },

  findByIdAndUserId(missionId: string, userId: string) {
    return prisma.mission.findFirst({
      where: { id: missionId, userId, isActive: true },
    });
  },

  findCompletion(userId: string, missionId: string, completedDate: Date) {
    return prisma.missionCompletion.findUnique({
      where: {
        userId_missionId_completedDate: { userId, missionId, completedDate },
      },
    });
  },

  createCompletion(userId: string, missionId: string, completedDate: Date) {
    return prisma.missionCompletion.create({
      data: { userId, missionId, completedDate },
    });
  },

  countCompletionsForDate(userId: string, completedDate: Date): Promise<number> {
    return prisma.missionCompletion.count({ where: { userId, completedDate } });
  },
};
