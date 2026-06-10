'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { AuthErrorCode } from '@atomic-habits/shared';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { OtpInput } from '@/components/auth/otp-input';
import { AppLogo } from '@/components/brand/app-logo';
import { useToast } from '@/components/toast/toast-provider';
import { Button, TextLink } from '@/design-system/components/button';
import { PasswordInput, TextInput } from '@/design-system/components/input';
import { loginWithEmail, resendLoginCode, verifyLogin } from '@/lib/auth-api';
import { createLoginSchema, type LoginFormValues } from '@/lib/login-schema';
import { createOtpSchema, type OtpFormValues } from '@/lib/register-schema';

const RESEND_COOLDOWN_SECONDS = 60;

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
  const [step, setStep] = useState<'credentials' | 'verify'>('credentials');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const loginSchema = useMemo(() => createLoginSchema(t), [t]);
  const otpSchema = useMemo(() => createOtpSchema(t), [t]);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onBlur',
  });

  const otpForm = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { code: '' },
    mode: 'onChange',
  });

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const onLoginSubmit = loginForm.handleSubmit(
    async (values) => {
      setIsSubmitting(true);
      try {
        await loginWithEmail(values.email, values.password);
        setEmail(values.email.trim());
        setStep('verify');
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
        otpForm.reset({ code: '' });
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

  const onVerifySubmit = otpForm.handleSubmit(async (values) => {
    setIsSubmitting(true);
    try {
      await verifyLogin(email, values.code);
      router.push('/dashboard');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('login.errors.verifyFailed'));
    } finally {
      setIsSubmitting(false);
    }
  });

  async function handleResend() {
    if (resendCooldown > 0) return;
    setIsSubmitting(true);
    try {
      await resendLoginCode(email);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('login.errors.generic'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-xl flex justify-center">
        <AppLogo size="lg" />
      </div>

      <div className="panel-lift rounded-lg bg-surface-1 p-lg md:p-xl">
        {step === 'credentials' ? (
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
                aria-describedby={
                  loginForm.formState.errors.email ? 'login-email-error' : undefined
                }
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
              {isSubmitting ? t('login.actions.signingIn') : t('login.actions.continue')}
            </Button>
          </motion.form>
        ) : (
          <motion.form
            key={`verify-${i18n.language}`}
            onSubmit={onVerifySubmit}
            noValidate
            className="space-y-lg"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-center">
              <h1 className="font-sans text-display-md font-bold">{t('login.verify.title')}</h1>
              <p className="mt-sm font-sans text-body text-ink-muted">
                {t('login.verify.subtitle', { email })}
              </p>
            </div>

            <div>
              <OtpInput
                id="login-otp"
                value={otpForm.watch('code')}
                onChange={(code) =>
                  otpForm.setValue('code', code, { shouldValidate: true, shouldDirty: true })
                }
                disabled={isSubmitting}
                aria-invalid={!!otpForm.formState.errors.code}
                aria-describedby={otpForm.formState.errors.code ? 'login-otp-error' : undefined}
              />
              <FieldError id="login-otp-error" message={otpForm.formState.errors.code?.message} />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || otpForm.watch('code').length !== 6}
            >
              {isSubmitting ? t('login.actions.verifying') : t('login.actions.verify')}
            </Button>

            <div className="text-center">
              {resendCooldown > 0 ? (
                <p className="font-sans text-body-sm text-ink-muted">
                  {t('login.verify.resendCountdown', { seconds: resendCooldown })}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isSubmitting}
                  className="font-sans text-body-sm text-primary hover:text-primary-hover disabled:opacity-50"
                >
                  {t('login.verify.resend')}
                </button>
              )}
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setStep('credentials');
                }}
                className="font-sans text-body-sm text-ink-subtle hover:text-ink"
              >
                {t('login.verify.back')}
              </button>
            </div>
          </motion.form>
        )}

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
