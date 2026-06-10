import type { EmailOtp, User } from '@prisma/client';
import {
  OTP_EXPIRY_MINUTES,
  OTP_MAX_SENDS_PER_HOUR,
  OTP_MAX_VERIFY_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SECONDS,
} from '../lib/config.js';
import { normalizeEmail } from '../lib/normalize-email.js';
import type { OtpPurpose } from '../lib/otp-purpose.js';
import { generateOtpCode, hashOtpCode, verifyOtpCode } from '../lib/otp-crypto.js';
import { redis } from '../lib/redis.js';
import { emailOtpRepository } from '../repositories/email-otp.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { HttpStatus } from '../responses/http-status.js';
import { apiError } from '../schemas/parse.js';
import mailer from './mailer/index.js';
import {
  buildLoginVerificationMailHtml,
  buildLoginVerificationMailText,
} from './mailer/template/login-verification.js';
import {
  buildSignupVerificationMailHtml,
  buildSignupVerificationMailText,
} from './mailer/template/signup-verification.js';

export type { OtpPurpose };

function sendRateLimitKey(email: string): string {
  return `otp:send:${normalizeEmail(email)}`;
}

function resendCooldownKey(email: string): string {
  return `otp:resend:${normalizeEmail(email)}`;
}

async function assertSendRateLimit(email: string): Promise<void> {
  const key = sendRateLimitKey(email);
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 3600);
  }
  if (count > OTP_MAX_SENDS_PER_HOUR) {
    throw apiError(
      'Too many verification codes sent. Try again later.',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

async function assertResendCooldown(email: string): Promise<void> {
  const exists = await redis.get(resendCooldownKey(email));
  if (exists) {
    throw apiError('Please wait before requesting another code.', HttpStatus.TOO_MANY_REQUESTS);
  }
}

async function markResendCooldown(email: string): Promise<void> {
  await redis.set(resendCooldownKey(email), '1', 'EX', OTP_RESEND_COOLDOWN_SECONDS);
}

export const otpService = {
  async createAndSendSignupOtp(user: User): Promise<void> {
    await assertSendRateLimit(user.email);
    await assertResendCooldown(user.email);

    const code = generateOtpCode();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await emailOtpRepository.replaceForUser(user.id, 'signup', {
      codeHash: hashOtpCode(code),
      expiresAt,
    });

    await mailer.sendMail({
      to: user.email,
      subject: 'Verify your Atomic Habits account',
      text: buildSignupVerificationMailText({ code, expiresMinutes: OTP_EXPIRY_MINUTES }),
      message: buildSignupVerificationMailHtml({ code, expiresMinutes: OTP_EXPIRY_MINUTES }),
    });

    await markResendCooldown(user.email);
  },

  async resendSignupOtp(email: string): Promise<void> {
    const normalized = normalizeEmail(email);
    const user = await userRepository.findByEmail(normalized);

    if (!user || user.emailVerifiedAt) {
      return;
    }

    await otpService.createAndSendSignupOtp(user);
  },

  async verifySignupOtp(
    email: string,
    code: string,
  ): Promise<{ user: User; otp: EmailOtp } | null> {
    return verifyOtpForPurpose(email, code, 'signup', (user) => !user.emailVerifiedAt);
  },

  async createAndSendLoginOtp(user: User): Promise<void> {
    await assertSendRateLimit(user.email);
    await assertResendCooldown(user.email);

    const code = generateOtpCode();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await emailOtpRepository.replaceForUser(user.id, 'login', {
      codeHash: hashOtpCode(code),
      expiresAt,
    });

    await mailer.sendMail({
      to: user.email,
      subject: 'Your sign-in code for Atomic Habits',
      text: buildLoginVerificationMailText({ code, expiresMinutes: OTP_EXPIRY_MINUTES }),
      message: buildLoginVerificationMailHtml({ code, expiresMinutes: OTP_EXPIRY_MINUTES }),
    });

    await markResendCooldown(user.email);
  },

  async resendLoginOtp(email: string): Promise<void> {
    const normalized = normalizeEmail(email);
    const user = await userRepository.findByEmail(normalized);

    if (!user?.emailVerifiedAt) {
      return;
    }

    await otpService.createAndSendLoginOtp(user);
  },

  async verifyLoginOtp(email: string, code: string): Promise<{ user: User; otp: EmailOtp } | null> {
    return verifyOtpForPurpose(email, code, 'login', (user) => !!user.emailVerifiedAt);
  },
};

async function verifyOtpForPurpose(
  email: string,
  code: string,
  purpose: OtpPurpose,
  isEligible: (user: User) => boolean,
): Promise<{ user: User; otp: EmailOtp } | null> {
  const normalized = normalizeEmail(email);
  const user = await userRepository.findByEmail(normalized);
  if (!user || !isEligible(user)) {
    return null;
  }

  const otp = await emailOtpRepository.findLatestByUserAndPurpose(user.id, purpose);
  if (!otp) {
    return null;
  }

  if (otp.expiresAt.getTime() < Date.now()) {
    await emailOtpRepository.deleteById(otp.id);
    return null;
  }

  if (otp.attempts >= OTP_MAX_VERIFY_ATTEMPTS) {
    await emailOtpRepository.deleteById(otp.id);
    return null;
  }

  if (!verifyOtpCode(code, otp.codeHash)) {
    await emailOtpRepository.incrementAttempts(otp.id);
    return null;
  }

  await emailOtpRepository.deleteById(otp.id);
  return { user, otp };
}
