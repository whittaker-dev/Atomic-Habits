import type { NextFunction, Request, Response } from 'express';

export interface ApiError extends Error {
  status?: number;
}

export function errorHandler(
  err: ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const status = err.status ?? 500;
  const rawMessage =
    status === 500 && process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  const message = rawMessage?.trim() || 'Request failed';

  res.status(status).json({ message });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ message: 'Not found' });
}
