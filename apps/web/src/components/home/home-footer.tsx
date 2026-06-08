'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button } from '@/design-system/components/button';

const linkMotion = {
  whileHover: { x: 4 },
  transition: { type: 'spring' as const, stiffness: 400, damping: 24 },
};

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <motion.div {...linkMotion}>
      <Link
        href={href}
        className="block font-sans text-body-sm text-ink-subtle transition-colors hover:text-primary"
      >
        {children}
      </Link>
    </motion.div>
  );
}

export function HomeFooter() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-hairline bg-surface-1">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-32 top-0 h-64 w-64 rounded-full bg-primary/8 blur-[100px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-32 bottom-0 h-64 w-64 rounded-full bg-primary/6 blur-[100px]"
        aria-hidden
      />

      <div className="container-content relative py-section">
        <div className="grid gap-xl lg:grid-cols-12 lg:gap-lg">
          <div className="lg:col-span-5">
            <Link href="/" className="inline-flex items-center gap-sm">
              <span
                aria-hidden
                className="flex h-9 w-9 items-center justify-center rounded-md bg-primary font-sans text-body-sm font-bold text-on-primary"
              >
                A
              </span>
              <span className="font-sans text-body font-bold text-ink">{t('common.appName')}</span>
            </Link>
            <p className="mt-md max-w-sm font-sans text-body-sm leading-relaxed text-ink-muted">
              {t('common.footer.tagline')}
            </p>
            <div className="mt-lg">
              <Link href="/#contact">
                <Button>{t('common.actions.getStartedFree')}</Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-xl sm:grid-cols-3 lg:col-span-7">
            <div>
              <p className="font-sans text-caption font-bold uppercase tracking-[0.1em] text-ink">
                {t('common.footer.product')}
              </p>
              <ul className="mt-md space-y-sm">
                <li>
                  <FooterLink href="/">{t('common.footer.missions')}</FooterLink>
                </li>
                <li>
                  <FooterLink href="/">{t('common.footer.streaks')}</FooterLink>
                </li>
                <li>
                  <FooterLink href="/">{t('common.footer.xp')}</FooterLink>
                </li>
              </ul>
            </div>

            <div>
              <p className="font-sans text-caption font-bold uppercase tracking-[0.1em] text-ink">
                {t('common.footer.resources')}
              </p>
              <ul className="mt-md space-y-sm">
                <li>
                  <FooterLink href="/design-system">{t('common.footer.designSystem')}</FooterLink>
                </li>
                <li>
                  <FooterLink href="/#contact">{t('nav.contact')}</FooterLink>
                </li>
              </ul>
            </div>

            <div>
              <p className="font-sans text-caption font-bold uppercase tracking-[0.1em] text-ink">
                {t('common.footer.company')}
              </p>
              <ul className="mt-md space-y-sm">
                <li>
                  <FooterLink href="/#contact">{t('common.footer.about')}</FooterLink>
                </li>
                <li>
                  <FooterLink href="/#contact">{t('common.footer.privacy')}</FooterLink>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-xl flex flex-col gap-md border-t border-hairline pt-lg sm:flex-row sm:items-center sm:justify-between">
          <p className="font-sans text-caption text-ink-tertiary">
            {t('common.footer.copyright', { year })}
          </p>
          <p className="font-sans text-caption text-ink-tertiary">{t('common.footer.builtWith')}</p>
        </div>
      </div>
    </footer>
  );
}
