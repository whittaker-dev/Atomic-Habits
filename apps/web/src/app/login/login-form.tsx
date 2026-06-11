'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { AuthErrorCode } from '@atomic-habits/shared';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { AppLogo } from '@/components/brand/app-logo';
import { useToast } from '@/components/toast/toast-provider';
import { Button, TextLink } from '@/design-system/components/button';
import { PasswordInput, TextInput } from '@/design-system/components/input';
import { loginWithEmail } from '@/lib/auth-api';
import { createLoginSchema, type LoginFormValues } from '@/lib/login-schema';

function getLoginErrorMessage(error: unknown, t: TFunction): string {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message === AuthErrorCode.EMAIL_NOT_VERIFIED) {
      return t('login.errors.emailNotVerified');
    }
    if (message === AuthErrorCode.INVALID_CREDENTIALS) {
      return t('login.errors.invalidCredentials');
    }
    if (message) {
      return message;
    }
  }
  return t('login.errors.generic');
}

function getFirstFormErrorMessage(
  errors: { email?: { message?: string }; password?: { message?: string } },
  t: TFunction,
): string {
  return (
    errors.email?.message?.trim() || errors.password?.message?.trim() || t('login.errors.generic')
  );
}

function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <motion.p
      id={id}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-xs font-sans text-body-sm text-error"
      role="alert"
    >
      {message}
    </motion.p>
  );
}

export function LoginForm() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loginSchema = useMemo(() => createLoginSchema(t), [t]);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onBlur',
  });

  const onLoginSubmit = loginForm.handleSubmit(
    async (values) => {
      setIsSubmitting(true);
      try {
        await loginWithEmail(values.email, values.password);
        router.refresh();
        router.push('/dashboard');
      } catch (error) {
        const message = getLoginErrorMessage(error, t);
        toast.error(message);
        if (error instanceof Error && error.message === AuthErrorCode.EMAIL_NOT_VERIFIED) {
          router.push('/register');
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    (errors) => {
      toast.error(getFirstFormErrorMessage(errors, t));
    },
  );

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-xl flex justify-center">
        <AppLogo size="lg" />
      </div>

      <div className="panel-lift rounded-lg bg-surface-1 p-lg md:p-xl">
        <motion.form
          key={`login-${i18n.language}`}
          onSubmit={onLoginSubmit}
          noValidate
          className="space-y-lg"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-center">
            <h1 className="font-sans text-display-md font-bold">{t('login.title')}</h1>
            <p className="mt-sm font-sans text-body text-ink-muted">{t('login.subtitle')}</p>
          </div>

          <div>
            <label
              htmlFor="login-email"
              className="mb-xs block font-sans text-body-sm text-ink-subtle"
            >
              {t('login.fields.email')}
            </label>
            <TextInput
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder={t('login.placeholders.email')}
              aria-invalid={!!loginForm.formState.errors.email}
              aria-describedby={loginForm.formState.errors.email ? 'login-email-error' : undefined}
              {...loginForm.register('email')}
            />
            <FieldError
              id="login-email-error"
              message={loginForm.formState.errors.email?.message}
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="mb-xs block font-sans text-body-sm text-ink-subtle"
            >
              {t('login.fields.password')}
            </label>
            <PasswordInput
              id="login-password"
              autoComplete="current-password"
              placeholder={t('login.placeholders.password')}
              showPasswordLabel={t('common.actions.showPassword')}
              hidePasswordLabel={t('common.actions.hidePassword')}
              aria-invalid={!!loginForm.formState.errors.password}
              aria-describedby={
                loginForm.formState.errors.password ? 'login-password-error' : undefined
              }
              {...loginForm.register('password')}
            />
            <FieldError
              id="login-password-error"
              message={loginForm.formState.errors.password?.message}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? t('login.actions.signingIn') : t('common.actions.signIn')}
          </Button>
        </motion.form>

        <p className="mt-lg text-center font-sans text-body-sm text-ink-muted">
          {t('login.signUpPrompt')}{' '}
          <TextLink href="/register">{t('common.actions.signUp')}</TextLink>
        </p>
      </div>

      <p className="mt-lg text-center">
        <Link href="/" className="font-sans text-body-sm text-ink-subtle hover:text-ink">
          {t('common.actions.backHome')}
        </Link>
      </p>
    </div>
  );
}
