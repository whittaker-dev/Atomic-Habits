import { Queue } from 'bullmq';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

export const notificationQueue = new Queue('notifications', {
  connection: { url: redisUrl },
});

export async function startNotificationWorkerStub(): Promise<void> {
  // Worker stub — full BullMQ worker in TRY-62
  console.log('[bullmq] notification queue ready');
}
