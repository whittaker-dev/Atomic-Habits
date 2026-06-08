import cookieSession from 'cookie-session';
import type { Express, RequestHandler } from 'express';

export interface SessionData {
  userId?: string;
}

export type SessionRequest = Express.Request & { session: SessionData | null | undefined };

export function sessionMiddleware(): RequestHandler {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET is not configured');
  }

  return cookieSession({
    name: 'ah_session',
    keys: [secret],
    maxAge: 30 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
}

export function setSessionUser(req: SessionRequest, userId: string): void {
  if (!req.session) {
    throw new Error('Session is not available');
  }
  req.session.userId = userId;
}

export function clearSession(req: SessionRequest): void {
  req.session = null;
}
