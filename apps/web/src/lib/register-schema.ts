import { z } from 'zod';
import type { TFunction } from 'i18next';

export function createRegisterSchema(t: TFunction) {
  return z
    .object({
      email: z
        .string()
        .trim()
        .min(1, t('validation.emailRequired'))
        .email(t('validation.emailInvalid')),
      password: z.string().min(8, t('validation.passwordMin')),
      confirmPassword: z.string().min(1, t('validation.confirmPasswordRequired')),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('validation.passwordMismatch'),
      path: ['confirmPassword'],
    });
}

export type RegisterFormValues = z.infer<ReturnType<typeof createRegisterSchema>>;

export function createOtpSchema(t: TFunction) {
  return z.object({
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, t('validation.otpInvalid')),
  });
}

export type OtpFormValues = z.infer<ReturnType<typeof createOtpSchema>>;
