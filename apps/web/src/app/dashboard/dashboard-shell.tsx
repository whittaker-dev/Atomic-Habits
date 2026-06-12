'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppLogo } from '@/components/brand/app-logo';
import { Button } from '@/design-system/components/button';
import { logout } from '@/lib/auth-api';
import { useCurrentUser } from '@/lib/use-auth';
import { MissionsCard } from './missions-card';

export function DashboardShell() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: user, error, isLoading, mutate } = useCurrentUser();
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!user || error) {
      router.replace('/login');
    }
  }, [user, error, isLoading, router]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      await mutate(null, false);
      router.refresh();
      router.replace('/login');
    } catch {
      setLoggingOut(false);
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas">
        <p className="font-sans text-body text-ink-muted">{t('dashboard.loading')}</p>
      </main>
    );
  }

  if (!user) {
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

        <MissionsCard />
      </div>
    </main>
  );
}
