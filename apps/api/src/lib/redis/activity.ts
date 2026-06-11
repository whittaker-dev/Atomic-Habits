import type { ActivityEvent } from '@atomic-habits/shared';
import { REDIS_KEYS, REDIS_TTL } from '@atomic-habits/shared';
import { redis, redisPub, redisSub } from './client.js';

export async function markDailyActive(
  userId: string,
  date: string,
  ttlSeconds = REDIS_TTL.dailyActiveSeconds,
): Promise<void> {
  await redis.set(REDIS_KEYS.dailyActive(userId, date), '1', 'EX', ttlSeconds);
}

export async function isDailyActive(userId: string, date: string): Promise<boolean> {
  const value = await redis.get(REDIS_KEYS.dailyActive(userId, date));
  return value === '1';
}

export async function clearDailyActive(userId: string, date: string): Promise<void> {
  await redis.del(REDIS_KEYS.dailyActive(userId, date));
}

export async function setStreakAtRisk(
  userId: string,
  ttlSeconds = REDIS_TTL.streakAtRiskSeconds,
): Promise<void> {
  await redis.set(REDIS_KEYS.streakAtRisk(userId), '1', 'EX', ttlSeconds);
}

export async function clearStreakAtRisk(userId: string): Promise<void> {
  await redis.del(REDIS_KEYS.streakAtRisk(userId));
}

export async function isStreakAtRisk(userId: string): Promise<boolean> {
  const value = await redis.get(REDIS_KEYS.streakAtRisk(userId));
  return value === '1';
}

export async function publishActivity(event: ActivityEvent): Promise<void> {
  await redisPub.publish(REDIS_KEYS.activityChannel, JSON.stringify(event));
}

export async function subscribeActivity(
  handler: (event: ActivityEvent) => void,
): Promise<() => Promise<void>> {
  if (redisSub.status !== 'ready') {
    await redisSub.connect();
  }

  const onMessage = (_channel: string, message: string) => {
    try {
      handler(JSON.parse(message) as ActivityEvent);
    } catch (error) {
      console.error('[redis] failed to parse activity event:', error);
    }
  };

  redisSub.on('message', onMessage);
  await redisSub.subscribe(REDIS_KEYS.activityChannel);

  return async () => {
    redisSub.off('message', onMessage);
    await redisSub.unsubscribe(REDIS_KEYS.activityChannel);
  };
}
