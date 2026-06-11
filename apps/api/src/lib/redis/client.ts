import { Redis } from 'ioredis';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

const clientOptions = {
  maxRetriesPerRequest: null,
  lazyConnect: true,
} as const;

export const redis = new Redis(redisUrl, clientOptions);

/** Dedicated connection for publishing (Pub/Sub requires separate connections). */
export const redisPub = new Redis(redisUrl, clientOptions);

/** Dedicated connection for subscribing (blocks other commands while subscribed). */
export const redisSub = new Redis(redisUrl, clientOptions);

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
