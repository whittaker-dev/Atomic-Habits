'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { AppLogo } from '@/components/brand/app-logo';
import { LanguageModal } from '@/components/language-modal';
import { PromoBanner } from '@/design-system/components/badges';
import { Button, TextLink } from '@/design-system/components/button';

export function TopNav() {
  const { t } = useTranslation();

  const navLinks = [
    { href: '/', label: t('nav.home') },
    { href: '/#contact', label: t('nav.contact') },
    { href: '/design-system', label: t('nav.designSystem') },
  ];

  return (
    <>
      <PromoBanner>
        {t('nav.promo')} <TextLink href="/design-system">{t('nav.seeDesignSystem')}</TextLink>
      </PromoBanner>
      <header className="sticky top-0 z-50 h-nav border-b border-hairline bg-canvas/95 backdrop-blur-sm">
        <div className="container-content flex h-full items-center justify-between">
          <AppLogo size="sm" />

          <nav className="hidden items-center gap-lg md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-sans text-body-sm text-ink-subtle hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-md">
            <Link href="/login">
              <Button variant="secondary" className="hidden sm:inline-flex">
                {t('common.actions.signIn')}
              </Button>
            </Link>
            <Link href="/register">
              <Button>{t('common.actions.getStarted')}</Button>
            </Link>
            <LanguageModal />
          </div>
        </div>
      </header>
    </>
  );
}
