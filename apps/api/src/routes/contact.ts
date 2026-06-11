import { Router } from 'express';
import { enqueueMailJob } from '../lib/queue.js';
import { buildContactMailHtml, buildContactMailText } from '../services/mailer/template/contact.js';
import type { ApiError } from '../middleware/error.js';

const contactRouter: Router = Router();

interface ContactBody {
  name?: string;
  email?: string;
  message?: string;
}

function validateContactBody(body: ContactBody) {
  const name = body.name?.trim() ?? '';
  const email = body.email?.trim() ?? '';
  const message = body.message?.trim() ?? '';

  if (!name || name.length > 100) {
    const err: ApiError = new Error('Invalid name');
    err.status = 400;
    throw err;
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const err: ApiError = new Error('Invalid email');
    err.status = 400;
    throw err;
  }

  if (!message || message.length > 2000) {
    const err: ApiError = new Error('Invalid message');
    err.status = 400;
    throw err;
  }

  return { name, email, message };
}

contactRouter.post('/', async (req, res, next) => {
  try {
    const payload = validateContactBody(req.body as ContactBody);
    const to = process.env.CONTACT_MAIL_TO;

    if (!to) {
      const err: ApiError = new Error('Contact recipient is not configured');
      err.status = 500;
      throw err;
    }

    await enqueueMailJob({
      to,
      subject: `[Atomic Habits] Contact from ${payload.name}`,
      text: buildContactMailText(payload),
      message: buildContactMailHtml(payload),
    });

    res.status(200).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default contactRouter;
