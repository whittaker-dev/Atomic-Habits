import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { checkPostgres } from './lib/prisma.js';
import { checkRedis } from './lib/redis.js';
import { startNotificationWorker } from './lib/queue.js';
import contactRouter from './routes/contact.js';
import authRouter from './routes/auth.js';
import dashboardRouter from './routes/dashboard.js';
import missionsRouter from './routes/missions.js';
import planTripRouter from './routes/plan-trip.js';
import { sessionMiddleware } from './lib/session.js';
import { HealthResponse } from '@atomic-habits/shared';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
const port = Number(process.env.API_PORT ?? 4000);

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:4001', credentials: true }));
app.use(express.json());
app.use(sessionMiddleware());

app.get('/health', async (_req, res) => {
  const [postgres, redisOk] = await Promise.all([checkPostgres(), checkRedis()]);
  const body: HealthResponse = { status: 'ok', postgres, redis: redisOk };
  res.json(body);
});

app.use('/contact', contactRouter);
app.use('/auth', authRouter);
app.use('/dashboard', dashboardRouter);
app.use('/missions', missionsRouter);
app.use('/plan-trips', planTripRouter);

app.use(notFoundHandler);
app.use(errorHandler);

startNotificationWorker().catch(console.error);

app.listen(port, () => {
  console.log(`[api] listening on http://localhost:${port}`);
});
