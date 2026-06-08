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
import { Button, TextLink } from '@/design-system/components/button';
import { PasswordInput, TextInput } from '@/design-system/components/input';
import { registerWithEmail, resendRegistrationCode, verifyRegistration } from '@/lib/auth-api';
import {
  createOtpSchema,
  createRegisterSchema,
  type OtpFormValues,
  type RegisterFormValues,
} from '@/lib/register-schema';

const RESEND_COOLDOWN_SECONDS = 60;

function getRegisterErrorMessage(error: unknown, t: TFunction): string {
  if (error instanceof Error) {
    if (error.message === AuthErrorCode.EMAIL_ALREADY_EXISTS) {
      return t('register.errors.emailExists');
    }
    return error.message;
  }
  return t('register.errors.generic');
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

export function RegisterForm() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [step, setStep] = useState<'credentials' | 'verify'>('credentials');
  const [email, setEmail] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const registerSchema = useMemo(() => createRegisterSchema(t), [t]);
  const otpSchema = useMemo(() => createOtpSchema(t), [t]);

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
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

  const onRegisterSubmit = registerForm.handleSubmit(async (values) => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await registerWithEmail(values.email, values.password);
      setEmail(values.email.trim());
      setStep('verify');
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      otpForm.reset({ code: '' });
    } catch (error) {
      setSubmitError(getRegisterErrorMessage(error, t));
    } finally {
      setIsSubmitting(false);
    }
  });

  const onVerifySubmit = otpForm.handleSubmit(async (values) => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await verifyRegistration(email, values.code);
      router.push('/dashboard');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : t('register.errors.verifyFailed'));
    } finally {
      setIsSubmitting(false);
    }
  });

  async function handleResend() {
    if (resendCooldown > 0) return;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await resendRegistrationCode(email);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : t('register.errors.generic'));
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
            key={`register-${i18n.language}`}
            onSubmit={onRegisterSubmit}
            noValidate
            className="space-y-lg"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-center">
              <h1 className="font-sans text-display-md font-bold">{t('register.title')}</h1>
              <p className="mt-sm font-sans text-body text-ink-muted">{t('register.subtitle')}</p>
            </div>

            <div>
              <label
                htmlFor="register-email"
                className="mb-xs block font-sans text-body-sm text-ink-subtle"
              >
                {t('register.fields.email')}
              </label>
              <TextInput
                id="register-email"
                type="email"
                autoComplete="email"
                placeholder={t('register.placeholders.email')}
                aria-invalid={!!registerForm.formState.errors.email}
                aria-describedby={
                  registerForm.formState.errors.email ? 'register-email-error' : undefined
                }
                {...registerForm.register('email')}
              />
              <FieldError
                id="register-email-error"
                message={registerForm.formState.errors.email?.message}
              />
            </div>

            <div>
              <label
                htmlFor="register-password"
                className="mb-xs block font-sans text-body-sm text-ink-subtle"
              >
                {t('register.fields.password')}
              </label>
              <PasswordInput
                id="register-password"
                autoComplete="new-password"
                placeholder={t('register.placeholders.password')}
                showPasswordLabel={t('common.actions.showPassword')}
                hidePasswordLabel={t('common.actions.hidePassword')}
                aria-invalid={!!registerForm.formState.errors.password}
                aria-describedby={
                  registerForm.formState.errors.password ? 'register-password-error' : undefined
                }
                {...registerForm.register('password')}
              />
              <FieldError
                id="register-password-error"
                message={registerForm.formState.errors.password?.message}
              />
            </div>

            <div>
              <label
                htmlFor="register-confirm-password"
                className="mb-xs block font-sans text-body-sm text-ink-subtle"
              >
                {t('register.fields.confirmPassword')}
              </label>
              <PasswordInput
                id="register-confirm-password"
                autoComplete="new-password"
                placeholder={t('register.placeholders.confirmPassword')}
                showPasswordLabel={t('common.actions.showPassword')}
                hidePasswordLabel={t('common.actions.hidePassword')}
                aria-invalid={!!registerForm.formState.errors.confirmPassword}
                aria-describedby={
                  registerForm.formState.errors.confirmPassword
                    ? 'register-confirm-password-error'
                    : undefined
                }
                {...registerForm.register('confirmPassword')}
              />
              <FieldError
                id="register-confirm-password-error"
                message={registerForm.formState.errors.confirmPassword?.message}
              />
            </div>

            {submitError && (
              <p className="font-sans text-body-sm text-error" role="alert">
                {submitError}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? t('register.actions.creating') : t('register.actions.continue')}
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
              <h1 className="font-sans text-display-md font-bold">{t('register.verify.title')}</h1>
              <p className="mt-sm font-sans text-body text-ink-muted">
                {t('register.verify.subtitle', { email })}
              </p>
            </div>

            <div>
              <OtpInput
                id="register-otp"
                value={otpForm.watch('code')}
                onChange={(code) =>
                  otpForm.setValue('code', code, { shouldValidate: true, shouldDirty: true })
                }
                disabled={isSubmitting}
                aria-invalid={!!otpForm.formState.errors.code}
                aria-describedby={otpForm.formState.errors.code ? 'register-otp-error' : undefined}
              />
              <FieldError
                id="register-otp-error"
                message={otpForm.formState.errors.code?.message}
              />
            </div>

            {submitError && (
              <p className="text-center font-sans text-body-sm text-error" role="alert">
                {submitError}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || otpForm.watch('code').length !== 6}
            >
              {isSubmitting ? t('register.actions.verifying') : t('register.actions.verify')}
            </Button>

            <div className="text-center">
              {resendCooldown > 0 ? (
                <p className="font-sans text-body-sm text-ink-muted">
                  {t('register.verify.resendCountdown', { seconds: resendCooldown })}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isSubmitting}
                  className="font-sans text-body-sm text-primary hover:text-primary-hover disabled:opacity-50"
                >
                  {t('register.verify.resend')}
                </button>
              )}
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setStep('credentials');
                  setSubmitError(null);
                }}
                className="font-sans text-body-sm text-ink-subtle hover:text-ink"
              >
                {t('register.verify.back')}
              </button>
            </div>
          </motion.form>
        )}

        <p className="mt-lg text-center font-sans text-body-sm text-ink-muted">
          {t('register.signInPrompt')}{' '}
          <TextLink href="/login">{t('common.actions.signIn')}</TextLink>
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
