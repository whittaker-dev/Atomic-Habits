'use client';

import Link from 'next/link';
import { Trans, useTranslation } from 'react-i18next';
import { Eyebrow } from '@/design-system/components/badges';
import {
  ButtonsSection,
  CardsSection,
  ElevationSection,
  FormsSection,
  PaletteSection,
  ResponsiveSection,
  ShowcaseNav,
  SpacingSection,
  TypographySection,
} from '@/design-system/showcase/sections';
import { TopNav } from '@/components/top-nav';

export function DesignSystemPage() {
  const { t } = useTranslation();

  return (
    <>
      <TopNav />
      <main>
        <section className="container-content py-section">
          <Eyebrow className="mb-md block">{t('designSystem.eyebrow')}</Eyebrow>
          <h1>{t('designSystem.title')}</h1>
          <p className="mt-md max-w-2xl font-sans text-body-lg text-ink-muted">
            <Trans
              i18nKey="designSystem.intro"
              components={{
                code: (
                  <code className="rounded-sm bg-surface-1 px-1 font-mono text-mono text-ink" />
                ),
              }}
            />
          </p>
        </section>

        <div className="container-content pb-section">
          <div className="flex flex-col gap-0 lg:flex-row lg:gap-xl">
            <ShowcaseNav />
            <div className="min-w-0 flex-1">
              <PaletteSection />
              <TypographySection />
              <ButtonsSection />
              <CardsSection />
              <FormsSection />
              <SpacingSection />
              <ElevationSection />
              <ResponsiveSection />

              <div className="border-t border-hairline py-section text-center">
                <Link href="/" className="font-sans text-caption text-ink-subtle hover:text-ink">
                  {t('common.actions.backHome')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
