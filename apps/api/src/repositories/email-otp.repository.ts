import type { EmailOtp } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import type { OtpPurpose } from '../lib/otp-purpose.js';

export const emailOtpRepository = {
  replaceForUser(
    userId: string,
    purpose: OtpPurpose,
    data: { codeHash: string; expiresAt: Date },
  ): Promise<EmailOtp> {
    return prisma.$transaction(async (tx) => {
      await tx.emailOtp.deleteMany({ where: { userId, purpose } });
      return tx.emailOtp.create({
        data: { userId, purpose, codeHash: data.codeHash, expiresAt: data.expiresAt },
      });
    });
  },

  findLatestByUserAndPurpose(userId: string, purpose: OtpPurpose): Promise<EmailOtp | null> {
    return prisma.emailOtp.findFirst({
      where: { userId, purpose },
      orderBy: { createdAt: 'desc' },
    });
  },

  deleteById(id: string): Promise<EmailOtp> {
    return prisma.emailOtp.delete({ where: { id } });
  },

  incrementAttempts(id: string): Promise<EmailOtp> {
    return prisma.emailOtp.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    });
  },
};
