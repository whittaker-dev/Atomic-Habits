import { Queue, Worker } from 'bullmq';
import mailer from '../services/mailer/index.js';
import type { IDataSendMail } from '../services/mailer/interface.js';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const connection = { url: redisUrl };

export type MailJobData = IDataSendMail;

export type MissionCompleteNotificationData = {
  userId: string;
  missionId: string;
  xpAwarded: number;
};

export type NotificationJobData =
  | { kind: 'mail'; data: MailJobData }
  | { kind: 'mission-complete'; data: MissionCompleteNotificationData };

export const notificationQueue = new Queue<NotificationJobData>('notifications', { connection });

export async function enqueueMailJob(data: MailJobData): Promise<void> {
  await enqueueNotificationJob({ kind: 'mail', data });
}

export async function enqueueMissionCompleteNotification(
  data: MissionCompleteNotificationData,
): Promise<void> {
  await enqueueNotificationJob({ kind: 'mission-complete', data });
}

export async function enqueueNotificationJob(job: NotificationJobData): Promise<void> {
  const name = job.kind === 'mail' ? 'send-mail' : 'mission-complete';

  await notificationQueue.add(name, job, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: true,
    removeOnFail: 100,
  });
}

let notificationWorker: Worker<NotificationJobData> | null = null;

async function processNotificationJob(job: NotificationJobData): Promise<void> {
  if (job.kind === 'mail') {
    await mailer.sendMail(job.data);
    return;
  }

  console.log(
    `[bullmq] mission-complete notification stub user=${job.data.userId} mission=${job.data.missionId} xp=${job.data.xpAwarded}`,
  );
}

export async function startNotificationWorker(): Promise<void> {
  if (notificationWorker) {
    return;
  }

  notificationWorker = new Worker<NotificationJobData>(
    'notifications',
    async (job) => {
      await processNotificationJob(job.data);
    },
    { connection },
  );

  notificationWorker.on('completed', (job) => {
    console.log(`[bullmq] notification job completed (${job.name})`);
  });

  notificationWorker.on('failed', (job, error) => {
    console.error(`[bullmq] notification job ${job?.id ?? 'unknown'} failed:`, error);
  });

  console.log('[bullmq] notification worker started');
}

/** @deprecated Use `startNotificationWorker` */
export const startMailWorker = startNotificationWorker;
