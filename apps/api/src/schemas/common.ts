import { z } from 'zod';

export const emailField = z.string().trim().email();

export const passwordField = z.string().min(8, 'Password must be at least 8 characters');

export const otpCodeField = z.string().regex(/^\d{6}$/, 'Code must be 6 digits');
