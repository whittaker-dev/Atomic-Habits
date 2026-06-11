import { REDIS_KEYS } from '@atomic-habits/shared';
import { redis } from './client.js';

export type LeaderboardEntry = {
  userId: string;
  score: number;
};

export async function addWeeklyXp(userId: string, xp: number): Promise<number> {
  const score = await redis.zincrby(REDIS_KEYS.leaderboardWeekly, xp, userId);
  return Number(score);
}

export async function getWeeklyScore(userId: string): Promise<number> {
  const score = await redis.zscore(REDIS_KEYS.leaderboardWeekly, userId);
  return score === null ? 0 : Number(score);
}

export async function getWeeklyRank(userId: string): Promise<number | null> {
  const rank = await redis.zrevrank(REDIS_KEYS.leaderboardWeekly, userId);
  return rank === null ? null : rank + 1;
}

export async function getWeeklyTop(limit: number): Promise<LeaderboardEntry[]> {
  const rows = await redis.zrevrange(REDIS_KEYS.leaderboardWeekly, 0, limit - 1, 'WITHSCORES');

  const entries: LeaderboardEntry[] = [];
  for (let i = 0; i < rows.length; i += 2) {
    const userId = rows[i];
    const scoreRaw = rows[i + 1];
    if (!userId || scoreRaw === undefined) {
      continue;
    }
    entries.push({ userId, score: Number(scoreRaw) });
  }

  return entries;
}

export async function resetWeeklyLeaderboard(): Promise<void> {
  await redis.del(REDIS_KEYS.leaderboardWeekly);
}
