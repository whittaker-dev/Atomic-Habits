import type { User } from '@prisma/client';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { normalizeEmail } from '../lib/normalize-email.js';
import { userRepository } from '../repositories/user.repository.js';
import { AuthMessages, AuthRouteStatus } from '../responses/auth.js';
import { apiError } from '../schemas/parse.js';
import { missionService } from './mission.service.js';
import { otpService } from './otp.service.js';

export const authService = {
  async register(email: string, password: string): Promise<void> {
    const normalized = normalizeEmail(email);
    const passwordHash = await hashPassword(password);
    const existing = await userRepository.findByEmail(normalized);

    if (existing?.emailVerifiedAt) {
      throw apiError(AuthMessages.EMAIL_ALREADY_EXISTS, AuthRouteStatus.register.emailExists);
    }

    const user = existing
      ? await userRepository.updatePassword(existing.id, passwordHash)
      : await userRepository.create({ email: normalized, passwordHash });

    await otpService.createAndSendSignupOtp(user);
  },

  async verifyRegistration(email: string, code: string): Promise<User> {
    const result = await otpService.verifySignupOtp(email, code);
    if (!result) {
      throw apiError(
        AuthMessages.INVALID_OR_EXPIRED_CODE,
        AuthRouteStatus.registerVerify.invalidCode,
      );
    }

    const user = await userRepository.markEmailVerified(result.user.id);
    await missionService.seedDefaultMissions(user.id);
    return user;
  },

  async resendRegistrationCode(email: string): Promise<void> {
    await otpService.resendSignupOtp(email);
  },

  async login(email: string, password: string): Promise<void> {
    const normalized = normalizeEmail(email);
    const user = await userRepository.findByEmail(normalized);

    if (!user) {
      throw apiError(AuthMessages.INVALID_CREDENTIALS, AuthRouteStatus.login.invalidCredentials);
    }

    const passwordValid = await verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      throw apiError(AuthMessages.INVALID_CREDENTIALS, AuthRouteStatus.login.invalidCredentials);
    }

    if (!user.emailVerifiedAt) {
      throw apiError(AuthMessages.EMAIL_NOT_VERIFIED, AuthRouteStatus.login.emailNotVerified);
    }

    await otpService.createAndSendLoginOtp(user);
  },

  async verifyLogin(email: string, code: string): Promise<User> {
    const result = await otpService.verifyLoginOtp(email, code);
    if (!result) {
      throw apiError(AuthMessages.INVALID_OR_EXPIRED_CODE, AuthRouteStatus.loginVerify.invalidCode);
    }

    return result.user;
  },

  async resendLoginCode(email: string): Promise<void> {
    await otpService.resendLoginOtp(email);
  },

  async getVerifiedUser(userId: string): Promise<User & { emailVerifiedAt: Date }> {
    const user = await userRepository.findById(userId);
    if (!user?.emailVerifiedAt) {
      throw apiError(AuthMessages.UNAUTHORIZED, AuthRouteStatus.me.unauthorized);
    }
    return user as User & { emailVerifiedAt: Date };
  },
};
