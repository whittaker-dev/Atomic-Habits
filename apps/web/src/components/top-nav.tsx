'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { AppLogo } from '@/components/brand/app-logo';
import { LanguageModal } from '@/components/language-modal';
import { MobileMenu } from '@/components/mobile-menu';
import { PromoBanner } from '@/design-system/components/badges';
import { Button, TextLink } from '@/design-system/components/button';

export function TopNav() {
  const { t } = useTranslation();

  const navLinks = [
    { href: '/', label: t('nav.home') },
    { href: '/games', label: t('nav.games') },
    { href: '/trend-radar', label: t('nav.trendRadar') },
    { href: '/plan-trip', label: t('nav.planTrip') },
    { href: '/#contact', label: t('nav.contact') },
    { href: '/design-system', label: t('nav.designSystem') },
  ];

  return (
    <>
      <PromoBanner>
        {t('nav.promo')} <TextLink href="/design-system">{t('nav.seeDesignSystem')}</TextLink>
      </PromoBanner>
      <header className="sticky top-0 z-50 h-nav border-b border-hairline bg-canvas/95 backdrop-blur-sm">
        <div className="container-content flex h-full items-center justify-between gap-md">
          <AppLogo size="sm" />

          {/* Sáu link chỉ vừa một hàng từ lg; màn nhỏ hơn đã có các thẻ lối vào ngay dưới hero. */}
          <nav className="hidden items-center gap-lg lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="whitespace-nowrap font-sans text-body-sm text-ink-subtle hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Ẩn cả thẻ Link (không chỉ nút bên trong) để nó không giữ một khoảng gap; trên điện thoại hàng
              này phải đủ chỗ cho logo, nút Bắt đầu, nút ngôn ngữ và nút ☰ trên một dòng. */}
          <div className="flex items-center gap-sm sm:gap-md">
            <Link href="/login" className="hidden sm:block">
              <Button variant="secondary">{t('common.actions.signIn')}</Button>
            </Link>
            <Link href="/register">
              <Button className="whitespace-nowrap">{t('common.actions.getStarted')}</Button>
            </Link>
            <LanguageModal />
            {/* Nút Đăng nhập bị ẩn dưới sm, nên menu có thêm link này. */}
            <MobileMenu
              links={[...navLinks, { href: '/login', label: t('common.actions.signIn') }]}
            />
          </div>
        </div>
      </header>
    </>
  );
}
