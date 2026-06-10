import type { AuthMeResponse, AuthUser, RegisterResponse } from '@atomic-habits/shared';
import { HttpStatus } from './http-status.js';

export const AuthMessages = {
  INVALID_REQUEST: 'Invalid request',
  INVALID_OR_EXPIRED_CODE: 'Invalid or expired verification code',
  UNAUTHORIZED: 'Unauthorized',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
} as const;

export const AuthRouteStatus = {
  register: {
    success: HttpStatus.OK,
    emailExists: HttpStatus.CONFLICT,
  },
  registerVerify: {
    success: HttpStatus.OK,
    invalidCode: HttpStatus.BAD_REQUEST,
  },
  registerResend: {
    success: HttpStatus.OK,
  },
  login: {
    success: HttpStatus.OK,
    invalidCredentials: HttpStatus.UNAUTHORIZED,
    emailNotVerified: HttpStatus.FORBIDDEN,
  },
  loginVerify: {
    success: HttpStatus.OK,
    invalidCode: HttpStatus.BAD_REQUEST,
  },
  loginResend: {
    success: HttpStatus.OK,
  },
  me: {
    success: HttpStatus.OK,
    unauthorized: HttpStatus.UNAUTHORIZED,
  },
  logout: {
    success: HttpStatus.OK,
  },
} as const;

export function registerPendingResponse(): RegisterResponse {
  return { pending: true };
}

export function resendOkResponse(): { ok: true } {
  return { ok: true };
}

export function logoutOkResponse(): { ok: true } {
  return { ok: true };
}

export function toAuthUser(user: {
  id: string;
  email: string;
  emailVerifiedAt: Date | null;
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
  };
}

export function authMeResponse(user: {
  id: string;
  email: string;
  emailVerifiedAt: Date;
}): AuthMeResponse {
  return {
    user: {
      id: user.id,
      email: user.email,
      emailVerifiedAt: user.emailVerifiedAt.toISOString(),
    },
  };
}

export function verifySuccessResponse(user: {
  id: string;
  email: string;
  emailVerifiedAt: Date | null;
}): AuthMeResponse {
  return { user: toAuthUser(user) };
}
