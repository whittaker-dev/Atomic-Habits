import type { ZodType } from 'zod';
import type { ApiError } from '../middleware/error.js';
import { AuthMessages } from '../responses/auth.js';
import { HttpStatus } from '../responses/http-status.js';

export function parseBody<T>(schema: ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const err: ApiError = new Error(
      parsed.error.issues[0]?.message ?? AuthMessages.INVALID_REQUEST,
    );
    err.status = HttpStatus.BAD_REQUEST;
    throw err;
  }
  return parsed.data;
}

export function apiError(message: string, status: number): ApiError {
  const err: ApiError = new Error(message);
  err.status = status;
  return err;
}
