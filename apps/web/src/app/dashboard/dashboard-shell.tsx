'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppLogo } from '@/components/brand/app-logo';
import { Button } from '@/design-system/components/button';
import { fetchCurrentUser, logout } from '@/lib/auth-api';

export function DashboardShell() {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchCurrentUser()
      .then((user) => {
        if (cancelled) return;
        if (!user) {
          router.replace('/register');
          return;
        }
        setEmail(user.email);
      })
      .catch(() => {
        if (!cancelled) router.replace('/register');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      router.replace('/');
    } catch {
      setLoggingOut(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas">
        <p className="font-sans text-body text-ink-muted">{t('register.actions.verifying')}</p>
      </main>
    );
  }

  if (!email) {
    return null;
  }

  return (
    <main className="min-h-screen bg-canvas px-md pb-xl pt-lg">
      <div className="container-content mx-auto max-w-2xl">
        <div className="mb-lg flex items-center justify-between gap-md">
          <AppLogo size="sm" />
          <div className="flex items-center gap-sm">
            <Link href="/">
              <Button variant="ghost">{t('common.actions.backHome')}</Button>
            </Link>
            <Button variant="secondary" onClick={handleLogout} disabled={loggingOut}>
              {loggingOut ? t('dashboard.actions.loggingOut') : t('dashboard.actions.logout')}
            </Button>
          </div>
        </div>

        <div className="panel-lift rounded-lg bg-surface-1 p-lg md:p-xl">
          <h1 className="font-sans text-display-md font-bold">{t('dashboard.title')}</h1>
          <p className="mt-sm font-sans text-body text-ink-muted">
            {t('dashboard.welcome', { email })}
          </p>
        </div>
      </div>
    </main>
  );
}
