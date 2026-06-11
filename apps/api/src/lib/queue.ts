import { Queue, Worker } from 'bullmq';
import mailer from '../services/mailer/index.js';
import type { IDataSendMail } from '../services/mailer/interface.js';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const connection = { url: redisUrl };

export type MailJobData = IDataSendMail;

export const notificationQueue = new Queue<MailJobData>('notifications', { connection });

export async function enqueueMailJob(data: MailJobData): Promise<void> {
  await notificationQueue.add('send-mail', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: true,
    removeOnFail: 100,
  });
}

let mailWorker: Worker<MailJobData> | null = null;

export async function startMailWorker(): Promise<void> {
  if (mailWorker) {
    return;
  }

  mailWorker = new Worker<MailJobData>(
    'notifications',
    async (job) => {
      await mailer.sendMail(job.data);
    },
    { connection },
  );

  mailWorker.on('completed', (job) => {
    console.log(`[bullmq] mail sent to ${job.data.to}`);
  });

  mailWorker.on('failed', (job, error) => {
    console.error(`[bullmq] mail job ${job?.id ?? 'unknown'} failed:`, error);
  });

  console.log('[bullmq] mail worker started');
}
