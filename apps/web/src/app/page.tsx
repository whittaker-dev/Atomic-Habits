import Link from 'next/link';
import { Button } from '@/design-system/components/button';
import {
  FeatureCard,
  FeatureCardYellowBold,
  HeroBandDark,
  WorkspaceMockupCard,
} from '@/design-system/components/cards';
import { SuccessBadge } from '@/design-system/components/badges';
import { ProgressBar } from '@/design-system/components/input';
import { TopNav } from '@/components/top-nav';

export default function HomePage() {
  return (
    <>
      <TopNav />
      <main>
        <HeroBandDark
          eyebrow="Personal Growth OS"
          title="Meet your daily streak."
          subtitle="Track missions, level up with XP, and keep your habits alive — English, fitness, coding, and more."
          actions={
            <>
              <Button>Get started free</Button>
              <Button variant="secondary">Request a demo</Button>
            </>
          }
          mockup={
            <WorkspaceMockupCard title="Today's HQ">
              <div className="space-y-md text-left">
                <div className="flex items-center justify-between border-b border-hairline pb-sm">
                  <span className="font-sans text-body-sm font-medium">Today&apos;s missions</span>
                  <SuccessBadge>28-day streak</SuccessBadge>
                </div>
                <div className="space-y-xs font-sans text-body-sm text-ink-subtle">
                  <p className="flex justify-between text-ink">
                    <span>Learn 10 English words</span>
                    <span className="font-mono text-caption text-primary">+20 XP</span>
                  </p>
                  <p>Exercise 20 mins</p>
                  <p className="text-ink-tertiary line-through">Finish ticket TRY-44</p>
                </div>
                <div>
                  <p className="mb-xs font-sans text-caption text-ink-subtle">Level 7</p>
                  <ProgressBar value={68} />
                </div>
              </div>
            </WorkspaceMockupCard>
          }
        />

        <section className="py-section">
          <div className="container-content">
            <h2 className="text-center">Keep work moving 24/7</h2>
            <p className="mx-auto mt-md max-w-2xl text-center font-sans text-body-lg text-ink-muted">
              Daily missions across categories — one workspace for your growth.
            </p>
            <div className="mt-xl grid gap-lg md:grid-cols-3">
              <FeatureCard
                tint="surface-1"
                title="Learn English"
                description="Daily vocabulary + mini quiz. +25 XP."
              />
              <FeatureCard
                tint="surface-2"
                title="Exercise"
                description="20 min workout check-in. +15 XP."
              />
              <FeatureCard
                tint="surface-1"
                title="Deep work"
                description="Finish a ticket or coding session. +25 XP."
              />
            </div>
          </div>
        </section>

        <section className="py-section">
          <div className="container-content">
            <FeatureCardYellowBold
              title="Ask your on-demand assistants"
              description="Daily English challenges powered by your streak data — come back every day."
              action={
                <Link href="/design-system">
                  <Button variant="secondary">Explore features</Button>
                </Link>
              }
            />
          </div>
        </section>

        <section className="py-section">
          <div className="container-content">
            <h2 className="text-center">Bring all your work together</h2>
            <div className="mt-xl grid gap-lg md:grid-cols-3">
              <FeatureCard
                tint="surface-1"
                title="Heatmap"
                description="See your consistency at a glance."
              />
              <FeatureCard
                tint="surface-2"
                title="XP & levels"
                description="Gamification that keeps you going."
              />
              <FeatureCard
                tint="surface-1"
                title="Weekly reports"
                description="82% consistency — reflect and improve."
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-hairline py-section">
        <div className="container-content grid gap-lg md:grid-cols-4">
          <div>
            <p className="font-sans text-caption font-medium text-ink">Product</p>
            <p className="mt-sm font-sans text-caption text-ink-subtle">Missions</p>
            <p className="font-sans text-caption text-ink-subtle">Streaks</p>
          </div>
          <div>
            <p className="font-sans text-caption font-medium text-ink">Resources</p>
            <Link
              href="/design-system"
              className="mt-sm block font-sans text-caption text-ink-subtle hover:text-ink"
            >
              Design system
            </Link>
          </div>
        </div>
        <p className="container-content mt-xl font-sans text-caption text-ink-subtle">
          © Atomic Habits
        </p>
      </footer>
    </>
  );
}
