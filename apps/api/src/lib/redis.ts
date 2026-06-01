import { Redis } from 'ioredis';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

export async function checkRedis(): Promise<boolean> {
  try {
    if (redis.status !== 'ready') {
      await redis.connect();
    }
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}
