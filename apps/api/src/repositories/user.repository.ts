import type { User } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export const userRepository = {
  findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  },

  findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },

  create(data: { email: string; passwordHash: string }): Promise<User> {
    return prisma.user.create({ data });
  },

  updatePassword(id: string, passwordHash: string): Promise<User> {
    return prisma.user.update({ where: { id }, data: { passwordHash } });
  },

  markEmailVerified(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { emailVerifiedAt: new Date() },
    });
  },
};
