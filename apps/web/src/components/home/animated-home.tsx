'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { TopNav } from '@/components/top-nav';
import { Button } from '@/design-system/components/button';
import { AssistantsSection } from './assistants-section';
import { AnimatedFeatureCard } from './animated-feature-card';
import { HeroMissionsCard } from './hero-missions-card';
import { ScrollReveal } from './scroll-reveal';
import { ContactSection } from './contact-section';
import { HomeFooter } from './home-footer';
import { SectionHeader } from './section-header';
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
          <span className="hero-word-inner inline-block font-bold">{word}</span>
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
              className="mx-auto max-w-4xl font-sans text-display-md font-bold [perspective:1000px] md:text-display-lg lg:text-display-xl"
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
                <HeroMissionsCard />
              </TiltMockup>
            </div>
          </div>
        </section>

        <ScrollReveal className="relative py-section">
          <div
            className="pointer-events-none absolute inset-x-0 top-1/2 h-[480px] -translate-y-1/2 bg-gradient-to-b from-primary/5 via-transparent to-primary/5"
            aria-hidden
          />
          <div className="container-content relative">
            <SectionHeader
              eyebrow={t('home.features.eyebrow')}
              title={t('home.features.title')}
              subtitle={t('home.features.subtitle')}
            />
            <div className="mt-xl grid gap-lg md:grid-cols-3">
              <AnimatedFeatureCard
                index={0}
                tint="surface-1"
                icon="english"
                title={t('home.features.english.title')}
                description={t('home.features.english.description')}
                badge={t('home.features.english.badge')}
              />
              <AnimatedFeatureCard
                index={1}
                tint="surface-2"
                icon="exercise"
                title={t('home.features.exercise.title')}
                description={t('home.features.exercise.description')}
                badge={t('home.features.exercise.badge')}
              />
              <AnimatedFeatureCard
                index={2}
                tint="surface-1"
                icon="deepWork"
                title={t('home.features.deepWork.title')}
                description={t('home.features.deepWork.description')}
                badge={t('home.features.deepWork.badge')}
              />
            </div>
          </div>
        </ScrollReveal>

        <AssistantsSection />

        <ScrollReveal className="relative py-section" stagger={0.14}>
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
            aria-hidden
          />
          <div className="container-content relative">
            <SectionHeader
              eyebrow={t('home.together.eyebrow')}
              title={t('home.together.title')}
              subtitle={t('home.together.subtitle')}
            />
            <div className="mt-xl grid gap-lg lg:grid-cols-2">
              <AnimatedFeatureCard
                index={0}
                tint="surface-2"
                icon="heatmap"
                featured
                preview="heatmap"
                title={t('home.together.heatmap.title')}
                description={t('home.together.heatmap.description')}
                badge={t('home.together.heatmap.badge')}
              />
              <div className="grid gap-lg">
                <AnimatedFeatureCard
                  index={1}
                  tint="surface-1"
                  icon="xp"
                  preview="xp"
                  title={t('home.together.xp.title')}
                  description={t('home.together.xp.description')}
                  badge={t('home.together.xp.badge')}
                />
                <AnimatedFeatureCard
                  index={2}
                  tint="surface-1"
                  icon="reports"
                  preview="reports"
                  title={t('home.together.reports.title')}
                  description={t('home.together.reports.description')}
                  badge={t('home.together.reports.badge')}
                />
              </div>
            </div>
          </div>
        </ScrollReveal>

        <ContactSection />

        <HomeFooter />
      </main>
    </>
  );
}
