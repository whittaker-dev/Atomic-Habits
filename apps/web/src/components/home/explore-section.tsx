'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { GAMES } from '@/components/games/games-catalog';
import { ScrollReveal } from './scroll-reveal';
import { SectionHeader } from './section-header';

// Lối vào các khu đã chạy thật trên trang (games, Trend Radar, kế hoạch chuyến đi). Khác các thẻ tính
// năng bên dưới vốn chỉ để giới thiệu: mỗi thẻ ở đây là một link.

type Destination = {
  key: 'games' | 'trendRadar' | 'planTrip';
  href: string;
  icon: 'games' | 'radar' | 'trip';
  tone: { bg: string; text: string };
};

const DESTINATIONS: Destination[] = [
  {
    key: 'games',
    href: '/games',
    icon: 'games',
    tone: { bg: 'bg-primary/15', text: 'text-primary' },
  },
  {
    key: 'trendRadar',
    href: '/trend-radar',
    icon: 'radar',
    tone: { bg: 'bg-info/15', text: 'text-info' },
  },
  {
    key: 'planTrip',
    href: '/plan-trip',
    icon: 'trip',
    tone: { bg: 'bg-warning/15', text: 'text-warning' },
  },
];

function DestinationIcon({ icon }: { icon: Destination['icon'] }) {
  const props = { className: 'h-6 w-6', strokeWidth: 1.75, fill: 'none', stroke: 'currentColor' };
  switch (icon) {
    case 'games':
      return (
        <svg viewBox="0 0 24 24" {...props}>
          <path
            d="M7 8h10a4 4 0 0 1 4 4v1.5a3.5 3.5 0 0 1-6.2 2.2L14 15h-4l-.8.7A3.5 3.5 0 0 1 3 13.5V12a4 4 0 0 1 4-4z"
            strokeLinejoin="round"
          />
          <path d="M8 11v3M6.5 12.5h3" strokeLinecap="round" />
          <circle cx="15.5" cy="11.5" r=".9" fill="currentColor" stroke="none" />
          <circle cx="17.5" cy="13.5" r=".9" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'radar':
      return (
        <svg viewBox="0 0 24 24" {...props}>
          <circle cx="12" cy="12" r="8.5" />
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 12l5.5-5.5" strokeLinecap="round" />
          <circle cx="15" cy="15.5" r="1.1" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'trip':
      return (
        <svg viewBox="0 0 24 24" {...props}>
          <path
            d="M12 21s-6-5.6-6-10.5a6 6 0 1 1 12 0C18 15.4 12 21 12 21z"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="10.5" r="2.2" />
        </svg>
      );
  }
}

export function ExploreSection() {
  const { t } = useTranslation();
  const playable = GAMES.filter((g) => g.status === 'playable').length;

  return (
    <ScrollReveal className="relative py-section">
      <div className="container-content relative">
        <SectionHeader
          eyebrow={t('home.explore.eyebrow')}
          title={t('home.explore.title')}
          subtitle={t('home.explore.subtitle')}
        />
        <div className="mt-xl grid gap-lg md:grid-cols-3">
          {DESTINATIONS.map((d) => (
            <motion.div
              key={d.key}
              data-reveal
              whileHover={{ y: -8 }}
              transition={{ type: 'spring', stiffness: 340, damping: 26 }}
            >
              <Link
                href={d.href}
                className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-hairline bg-surface-1 p-lg transition-colors hover:border-primary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${d.tone.bg} ${d.tone.text}`}
                >
                  <DestinationIcon icon={d.icon} />
                </div>
                <h3 className="mt-lg font-sans text-card-title font-bold">
                  {t(`home.explore.${d.key}.title`)}
                </h3>
                <p className="mt-sm flex-1 font-sans text-body-sm leading-relaxed text-ink-subtle">
                  {t(`home.explore.${d.key}.description`, { count: playable })}
                </p>
                <span className="mt-lg inline-flex items-center gap-xs font-sans text-body-sm font-bold text-primary">
                  {t(`home.explore.${d.key}.cta`)}
                  <span
                    className="transition-transform duration-200 group-hover:translate-x-1"
                    aria-hidden
                  >
                    →
                  </span>
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </ScrollReveal>
  );
}
