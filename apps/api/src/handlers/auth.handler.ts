import type { NextFunction, Request, Response } from 'express';
import { clearSession, setSessionUser, type SessionRequest } from '../lib/session.js';
import {
  AuthMessages,
  AuthRouteStatus,
  authMeResponse,
  logoutOkResponse,
  registerPendingResponse,
  resendOkResponse,
  verifySuccessResponse,
} from '../responses/auth.js';
import {
  apiError,
  loginBodySchema,
  loginResendBodySchema,
  loginVerifyBodySchema,
  parseBody,
  registerBodySchema,
  registerResendBodySchema,
  registerVerifyBodySchema,
} from '../schemas/index.js';
import { authService } from '../services/auth.service.js';

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = parseBody(registerBodySchema, req.body);
    await authService.register(body.email, body.password);
    res.status(AuthRouteStatus.register.success).json(registerPendingResponse());
  } catch (error) {
    next(error);
  }
}

export async function verifyRegistration(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = parseBody(registerVerifyBodySchema, req.body);
    const user = await authService.verifyRegistration(body.email, body.code);
    setSessionUser(req as SessionRequest, user.id);
    res.status(AuthRouteStatus.registerVerify.success).json(verifySuccessResponse(user));
  } catch (error) {
    next(error);
  }
}

export async function resendRegistrationCode(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = parseBody(registerResendBodySchema, req.body);
    await authService.resendRegistrationCode(body.email);
    res.status(AuthRouteStatus.registerResend.success).json(resendOkResponse());
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = parseBody(loginBodySchema, req.body);
    const user = await authService.login(body.email, body.password);
    setSessionUser(req as SessionRequest, user.id);
    res.status(AuthRouteStatus.login.success).json(verifySuccessResponse(user));
  } catch (error) {
    next(error);
  }
}

export async function verifyLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = parseBody(loginVerifyBodySchema, req.body);
    const user = await authService.verifyLogin(body.email, body.code);
    setSessionUser(req as SessionRequest, user.id);
    res.status(AuthRouteStatus.loginVerify.success).json(verifySuccessResponse(user));
  } catch (error) {
    next(error);
  }
}

export async function resendLoginCode(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = parseBody(loginResendBodySchema, req.body);
    await authService.resendLoginCode(body.email);
    res.status(AuthRouteStatus.loginResend.success).json(resendOkResponse());
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    clearSession(req as SessionRequest);
    res.status(AuthRouteStatus.logout.success).json(logoutOkResponse());
  } catch (error) {
    next(error);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as SessionRequest).session?.userId;
    if (!userId) {
      throw apiError(AuthMessages.UNAUTHORIZED, AuthRouteStatus.me.unauthorized);
    }

    const user = await authService.getVerifiedUser(userId);
    res.status(AuthRouteStatus.me.success).json(
      authMeResponse({
        id: user.id,
        email: user.email,
        emailVerifiedAt: user.emailVerifiedAt,
      }),
    );
  } catch (error) {
    next(error);
  }
}
