'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { TopNav } from '@/components/top-nav';
import { Button } from '@/design-system/components/button';
import { SuccessBadge } from '@/design-system/components/badges';
import { WorkspaceMockupCard } from '@/design-system/components/cards';
import { ProgressBar } from '@/design-system/components/input';
import { AnimatedFeatureCard } from './animated-feature-card';
import { ScrollReveal } from './scroll-reveal';
import { ContactSection } from './contact-section';
import { TiltMockup } from './tilt-mockup';

const HeroScene = dynamic(() => import('./hero-scene').then((m) => ({ default: m.HeroScene })), {
  ssr: false,
  loading: () => (
    <div
      className="absolute inset-0 bg-gradient-to-br from-primary/10 via-canvas to-canvas"
      aria-hidden
    />
  ),
});

function SplitTitle({ text }: { text: string }) {
  return (
    <>
      {text.split(' ').map((word, i) => (
        <span key={i} className="hero-word inline-block overflow-hidden align-bottom">
          <span className="hero-word-inner inline-block">{word}</span>
          {i < text.split(' ').length - 1 ? '\u00a0' : null}
        </span>
      ))}
    </>
  );
}

const ctaMotion = {
  whileHover: { scale: 1.04, y: -2 },
  whileTap: { scale: 0.98 },
  transition: { type: 'spring' as const, stiffness: 400, damping: 20 },
};

export function AnimatedHome() {
  const heroRef = useRef<HTMLElement>(null);
  const { t } = useTranslation();

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.from('.hero-eyebrow', { y: 24, opacity: 0, duration: 0.6 })
        .from(
          '.hero-word-inner',
          { y: '110%', rotateX: -55, opacity: 0, stagger: 0.07, duration: 0.9 },
          '-=0.3',
        )
        .from('.hero-subtitle', { y: 32, opacity: 0, duration: 0.7 }, '-=0.5')
        .from('.hero-cta', { y: 24, opacity: 0, stagger: 0.12, duration: 0.6 }, '-=0.4')
        .from('.hero-glow', { scale: 0.6, opacity: 0, duration: 1.2, ease: 'power2.out' }, '-=0.8');
    },
    { scope: heroRef },
  );

  return (
    <>
      <motion.div
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <TopNav />
      </motion.div>

      <main className="overflow-x-hidden">
        <section
          ref={heroRef}
          className="relative min-h-[92vh] px-md pb-section pt-hero text-center md:px-lg"
        >
          <div className="hidden md:block">
            <HeroScene />
          </div>
          <div
            className="hero-glow pointer-events-none absolute left-1/2 top-1/3 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-primary/20 blur-[100px] md:h-[560px] md:w-[560px]"
            aria-hidden
          />

          <div className="container-content relative z-10">
            <p className="hero-eyebrow mb-md font-sans text-eyebrow text-ink-muted">
              {t('home.hero.eyebrow')}
            </p>
            <h1
              className="mx-auto max-w-4xl font-sans text-display-md font-semibold [perspective:1000px] md:text-display-lg lg:text-display-xl"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <SplitTitle text={t('home.hero.title')} />
            </h1>
            <p className="hero-subtitle mx-auto mt-lg max-w-xl font-sans text-body-lg text-ink-muted">
              {t('home.hero.subtitle')}
            </p>
            <div className="mt-xl flex flex-wrap items-center justify-center gap-md">
              <motion.div className="hero-cta" {...ctaMotion}>
                <Button>{t('common.actions.getStartedFree')}</Button>
              </motion.div>
              <motion.div className="hero-cta" {...ctaMotion}>
                <Button variant="secondary">{t('common.actions.requestDemo')}</Button>
              </motion.div>
            </div>

            <div className="mt-section flex justify-center">
              <TiltMockup className="w-full max-w-lg">
                <WorkspaceMockupCard title={t('home.mockup.title')}>
                  <div className="space-y-md text-left">
                    <div className="flex items-center justify-between border-b border-hairline pb-sm">
                      <span className="font-sans text-body-sm font-medium">
                        {t('home.mockup.missions')}
                      </span>
                      <motion.div
                        animate={{ scale: [1, 1.06, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <SuccessBadge>{t('home.mockup.streak')}</SuccessBadge>
                      </motion.div>
                    </div>
                    <div className="space-y-xs font-sans text-body-sm text-ink-subtle">
                      <motion.p
                        className="flex justify-between text-ink"
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.9 }}
                      >
                        <span>{t('home.mockup.missionEnglish')}</span>
                        <span className="font-mono text-caption text-primary">
                          {t('home.mockup.xp')}
                        </span>
                      </motion.p>
                      <motion.p
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.05 }}
                      >
                        {t('home.mockup.missionExercise')}
                      </motion.p>
                      <p className="text-ink-tertiary line-through">
                        {t('home.mockup.missionTicket')}
                      </p>
                    </div>
                    <div>
                      <p className="mb-xs font-sans text-caption text-ink-subtle">
                        {t('home.mockup.level')}
                      </p>
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: 1.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                        style={{ transformOrigin: 'left' }}
                      >
                        <ProgressBar value={68} />
                      </motion.div>
                    </div>
                  </div>
                </WorkspaceMockupCard>
              </TiltMockup>
            </div>
          </div>
        </section>

        <ScrollReveal className="py-section">
          <div className="container-content">
            <h2 data-reveal className="text-center">
              {t('home.features.title')}
            </h2>
            <p
              data-reveal
              className="mx-auto mt-md max-w-2xl text-center font-sans text-body-lg text-ink-muted"
            >
              {t('home.features.subtitle')}
            </p>
            <div className="mt-xl grid gap-lg md:grid-cols-3">
              <AnimatedFeatureCard
                index={0}
                tint="surface-1"
                title={t('home.features.english.title')}
                description={t('home.features.english.description')}
              />
              <AnimatedFeatureCard
                index={1}
                tint="surface-2"
                title={t('home.features.exercise.title')}
                description={t('home.features.exercise.description')}
              />
              <AnimatedFeatureCard
                index={2}
                tint="surface-1"
                title={t('home.features.deepWork.title')}
                description={t('home.features.deepWork.description')}
              />
            </div>
          </div>
        </ScrollReveal>

        <section className="py-section">
          <div className="container-content">
            <motion.div
              data-reveal
              className="panel-lift relative overflow-hidden rounded-lg bg-surface-1 p-xxl"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.8 }}
            >
              <motion.div
                className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl"
                animate={{ x: [0, 24, 0], y: [0, -16, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
              />
              <h2 className="relative font-sans text-headline font-semibold">
                {t('home.assistants.title')}
              </h2>
              <p className="relative mt-md font-sans text-body-lg text-ink-muted">
                {t('home.assistants.description')}
              </p>
              <div className="relative mt-lg">
                <Link href="/design-system">
                  <motion.span {...ctaMotion} className="inline-block">
                    <Button variant="secondary">{t('common.actions.exploreFeatures')}</Button>
                  </motion.span>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        <ScrollReveal className="py-section" stagger={0.12}>
          <div className="container-content">
            <h2 data-reveal className="text-center">
              {t('home.together.title')}
            </h2>
            <div className="mt-xl grid gap-lg md:grid-cols-3">
              <AnimatedFeatureCard
                index={0}
                tint="surface-1"
                title={t('home.together.heatmap.title')}
                description={t('home.together.heatmap.description')}
              />
              <AnimatedFeatureCard
                index={1}
                tint="surface-2"
                title={t('home.together.xp.title')}
                description={t('home.together.xp.description')}
              />
              <AnimatedFeatureCard
                index={2}
                tint="surface-1"
                title={t('home.together.reports.title')}
                description={t('home.together.reports.description')}
              />
            </div>
          </div>
        </ScrollReveal>

        <ContactSection />

        <motion.section
          className="border-t border-hairline py-section"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="container-content grid gap-lg md:grid-cols-4">
            <div>
              <p className="font-sans text-caption font-medium text-ink">
                {t('common.footer.product')}
              </p>
              <p className="mt-sm font-sans text-caption text-ink-subtle">
                {t('common.footer.missions')}
              </p>
              <p className="font-sans text-caption text-ink-subtle">{t('common.footer.streaks')}</p>
            </div>
            <div>
              <p className="font-sans text-caption font-medium text-ink">
                {t('common.footer.resources')}
              </p>
              <Link
                href="/design-system"
                className="mt-sm block font-sans text-caption text-ink-subtle hover:text-ink"
              >
                {t('common.footer.designSystem')}
              </Link>
            </div>
          </div>
          <p className="container-content mt-xl font-sans text-caption text-ink-subtle">
            {t('common.footer.copyright')}
          </p>
        </motion.section>
      </main>
    </>
  );
}
