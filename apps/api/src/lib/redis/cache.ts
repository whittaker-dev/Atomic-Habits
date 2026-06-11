import type { DashboardSummary } from '@atomic-habits/shared';
import { REDIS_KEYS, REDIS_TTL } from '@atomic-habits/shared';
import { redis } from './client.js';

async function getJson<T>(key: string): Promise<T | null> {
  const raw = await redis.get(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    await redis.del(key);
    return null;
  }
}

async function setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
}

export async function getDashboardCache(userId: string): Promise<DashboardSummary | null> {
  return getJson<DashboardSummary>(REDIS_KEYS.dashboardCache(userId));
}

export async function setDashboardCache(
  userId: string,
  data: DashboardSummary,
  ttlSeconds = REDIS_TTL.dashboardCacheSeconds,
): Promise<void> {
  await setJson(REDIS_KEYS.dashboardCache(userId), data, ttlSeconds);
}

export async function invalidateDashboardCache(userId: string): Promise<void> {
  await redis.del(REDIS_KEYS.dashboardCache(userId));
}

export type StreakCache = {
  current: number;
  best: number;
};

export async function getStreakCache(userId: string): Promise<StreakCache | null> {
  const [currentRaw, bestRaw] = await redis.mget(
    REDIS_KEYS.streakCurrent(userId),
    REDIS_KEYS.streakBest(userId),
  );

  if (currentRaw === null || bestRaw === null) {
    return null;
  }

  const current = Number(currentRaw);
  const best = Number(bestRaw);

  if (!Number.isFinite(current) || !Number.isFinite(best)) {
    await invalidateStreakCache(userId);
    return null;
  }

  return { current, best };
}

export async function setStreakCache(
  userId: string,
  current: number,
  best: number,
  ttlSeconds = REDIS_TTL.dashboardCacheSeconds,
): Promise<void> {
  const pipeline = redis.pipeline();
  pipeline.set(REDIS_KEYS.streakCurrent(userId), String(current), 'EX', ttlSeconds);
  pipeline.set(REDIS_KEYS.streakBest(userId), String(best), 'EX', ttlSeconds);
  await pipeline.exec();
}

export async function invalidateStreakCache(userId: string): Promise<void> {
  await redis.del(REDIS_KEYS.streakCurrent(userId), REDIS_KEYS.streakBest(userId));
}
