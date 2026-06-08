import { z } from 'zod';
import type { TFunction } from 'i18next';

export function createContactSchema(t: TFunction) {
  return z.object({
    name: z.string().trim().min(1, t('validation.nameRequired')).max(100, t('validation.nameMax')),
    email: z
      .string()
      .trim()
      .min(1, t('validation.emailRequired'))
      .email(t('validation.emailInvalid')),
    message: z
      .string()
      .trim()
      .min(1, t('validation.messageRequired'))
      .max(2000, t('validation.messageMax')),
  });
}

export type ContactFormValues = z.infer<ReturnType<typeof createContactSchema>>;
