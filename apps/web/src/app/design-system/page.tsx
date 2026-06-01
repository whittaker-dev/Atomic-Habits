import Link from 'next/link';
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

export default function DesignSystemPage() {
  return (
    <>
      <TopNav />
      <main>
        <section className="container-content py-section">
          <Eyebrow className="mb-md block">Design system</Eyebrow>
          <h1>Dark theme · Spotify Green</h1>
          <p className="mt-md max-w-2xl font-sans text-body-lg text-ink-muted">
            Reference implementation for{' '}
            <code className="rounded-sm bg-surface-1 px-1 font-mono text-mono text-ink">
              DESIGN.md
            </code>
            . Spotify palette in{' '}
            <code className="rounded-sm bg-surface-1 px-1 font-mono text-mono text-ink">
              src/design-system/tokens/
            </code>
            .
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
                  ← Back home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
