'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Button, TextLink } from '@/design-system/components/button';
import { PromoBanner } from '@/design-system/components/badges';
import { LanguageModal } from '@/components/language-modal';

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
          <Link
            href="/"
            className="flex items-center gap-sm font-sans text-body-sm font-medium text-ink"
          >
            <span
              aria-hidden
              className="flex h-6 w-6 items-center justify-center rounded-sm bg-primary text-xs font-bold text-on-primary"
            >
              A
            </span>
            {t('common.appName')}
          </Link>

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
            <Button variant="secondary" className="hidden sm:inline-flex">
              {t('common.actions.signIn')}
            </Button>
            <Button>{t('common.actions.getStarted')}</Button>
            <LanguageModal />
          </div>
        </div>
      </header>
    </>
  );
}
