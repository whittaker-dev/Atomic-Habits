import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { checkPostgres } from './lib/prisma.js';
import { checkRedis } from './lib/redis.js';
import { startNotificationWorkerStub } from './lib/queue.js';
import { HealthResponse } from '@atomic-habits/shared';

const app = express();
const port = Number(process.env.API_PORT ?? 4000);

app.use(helmet());
app.use(cors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:4001', credentials: true }));
app.use(express.json());

app.get('/health', async (_req, res) => {
  const [postgres, redisOk] = await Promise.all([checkPostgres(), checkRedis()]);
  const body: HealthResponse = { status: 'ok', postgres, redis: redisOk };
  res.json(body);
});

app.use(notFoundHandler);
app.use(errorHandler);

startNotificationWorkerStub().catch(console.error);

app.listen(port, () => {
  console.log(`[api] listening on http://localhost:${port}`);
});
