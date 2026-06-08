'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { LogoIcon } from '@/components/brand/logo-icon';
import { cn } from '@/lib/utils';

type AppLogoProps = {
  href?: string;
  showName?: boolean;
  size?: 'sm' | 'md' | 'lg';
  nameClassName?: string;
  className?: string;
};

export function AppLogo({
  href = '/',
  showName = true,
  size = 'md',
  nameClassName,
  className,
}: AppLogoProps) {
  const { t } = useTranslation();

  const nameSizes = {
    sm: 'text-body-sm font-medium',
    md: 'text-body-sm font-medium',
    lg: 'text-body font-bold',
  } as const;

  const content = (
    <>
      <LogoIcon size={size} />
      {showName && (
        <span className={cn('font-sans text-ink', nameSizes[size], nameClassName)}>
          {t('common.appName')}
        </span>
      )}
    </>
  );

  const classes = cn('inline-flex items-center gap-sm', className);

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return <span className={classes}>{content}</span>;
}
