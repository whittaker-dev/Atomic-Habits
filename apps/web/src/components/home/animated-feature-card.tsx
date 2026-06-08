'use client';

import { motion } from 'framer-motion';
import type { CardTint } from '@/design-system/tokens/colors';
import { cn } from '@/lib/utils';

const tintMap: Record<CardTint, string> = {
  'surface-1': 'bg-surface-1',
  'surface-2': 'bg-surface-2',
  'surface-3': 'bg-surface-3',
  'surface-4': 'bg-surface-4',
};

export type FeatureIcon = 'english' | 'exercise' | 'deepWork' | 'heatmap' | 'xp' | 'reports';

const iconStyles: Record<FeatureIcon, { bg: string; text: string }> = {
  english: { bg: 'bg-primary/15', text: 'text-primary' },
  exercise: { bg: 'bg-warning/15', text: 'text-warning' },
  deepWork: { bg: 'bg-info/15', text: 'text-info' },
  heatmap: { bg: 'bg-primary/20', text: 'text-primary' },
  xp: { bg: 'bg-warning/15', text: 'text-warning' },
  reports: { bg: 'bg-info/15', text: 'text-info' },
};

function FeatureIconSvg({ icon }: { icon: FeatureIcon }) {
  const props = { className: 'h-6 w-6', strokeWidth: 1.75, fill: 'none', stroke: 'currentColor' };

  switch (icon) {
    case 'english':
      return (
        <svg viewBox="0 0 24 24" {...props}>
          <path d="M4 5h8M4 9h8M4 13h5" strokeLinecap="round" />
          <path d="M14 5l6 7-6 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'exercise':
      return (
        <svg viewBox="0 0 24 24" {...props}>
          <path
            d="M12 21c4-4 6-7.5 6-11a6 6 0 1 0-12 0c0 3.5 2 7 6 11z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M12 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
        </svg>
      );
    case 'deepWork':
      return (
        <svg viewBox="0 0 24 24" {...props}>
          <path d="M8 6h8v12H8z" strokeLinejoin="round" />
          <path d="M12 6V4M9 20h6" strokeLinecap="round" />
          <path d="M10 10h4M10 14h2" strokeLinecap="round" />
        </svg>
      );
    case 'heatmap':
      return (
        <svg viewBox="0 0 24 24" {...props}>
          <rect x="3" y="3" width="5" height="5" rx="1" fill="currentColor" stroke="none" />
          <rect
            x="10"
            y="3"
            width="5"
            height="5"
            rx="1"
            fill="currentColor"
            stroke="none"
            opacity="0.5"
          />
          <rect
            x="17"
            y="3"
            width="4"
            height="5"
            rx="1"
            fill="currentColor"
            stroke="none"
            opacity="0.35"
          />
          <rect
            x="3"
            y="10"
            width="5"
            height="5"
            rx="1"
            fill="currentColor"
            stroke="none"
            opacity="0.65"
          />
          <rect x="10" y="10" width="5" height="5" rx="1" fill="currentColor" stroke="none" />
          <rect
            x="17"
            y="10"
            width="4"
            height="5"
            rx="1"
            fill="currentColor"
            stroke="none"
            opacity="0.5"
          />
          <rect
            x="3"
            y="17"
            width="5"
            height="4"
            rx="1"
            fill="currentColor"
            stroke="none"
            opacity="0.35"
          />
          <rect
            x="10"
            y="17"
            width="5"
            height="4"
            rx="1"
            fill="currentColor"
            stroke="none"
            opacity="0.8"
          />
          <rect x="17" y="17" width="4" height="4" rx="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'xp':
      return (
        <svg viewBox="0 0 24 24" {...props}>
          <path
            d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'reports':
      return (
        <svg viewBox="0 0 24 24" {...props}>
          <path d="M4 19V5" strokeLinecap="round" />
          <path d="M4 19h16" strokeLinecap="round" />
          <path d="M8 15V11M12 15V8M16 15v-5" strokeLinecap="round" />
        </svg>
      );
  }
}

function HeatmapPreview() {
  const opacities = [0.25, 0.45, 0.7, 0.35, 0.9, 0.55, 0.4, 0.75, 0.5, 0.85, 0.3, 0.65];

  return (
    <div className="mt-lg grid grid-cols-6 gap-xxs">
      {opacities.map((opacity, i) => (
        <motion.div
          key={i}
          className="aspect-square rounded-xs bg-primary"
          initial={{ opacity: 0, scale: 0.6 }}
          whileInView={{ opacity, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.04, duration: 0.35 }}
        />
      ))}
    </div>
  );
}

function XpPreview() {
  return (
    <div className="mt-lg space-y-sm">
      <div className="flex items-center justify-between font-sans text-caption text-ink-subtle">
        <span>Level 7</span>
        <span className="font-mono text-primary">68%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-pill bg-surface-3">
        <motion.div
          className="h-full rounded-pill bg-gradient-to-r from-primary-focus to-primary"
          initial={{ width: 0 }}
          whileInView={{ width: '68%' }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

function ReportsPreview() {
  const bars = [40, 65, 55, 82, 70];

  return (
    <div className="mt-lg flex h-20 items-end gap-xs">
      {bars.map((h, i) => (
        <motion.div
          key={i}
          className="flex-1 rounded-xs bg-gradient-to-t from-primary-focus to-primary"
          initial={{ height: 0 }}
          whileInView={{ height: `${h}%` }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        />
      ))}
    </div>
  );
}

export function AnimatedFeatureCard({
  tint = 'surface-1',
  icon,
  title,
  description,
  badge,
  index = 0,
  featured = false,
  preview,
}: {
  tint?: CardTint;
  icon: FeatureIcon;
  title: string;
  description: string;
  badge?: string;
  index?: number;
  featured?: boolean;
  preview?: 'heatmap' | 'xp' | 'reports';
}) {
  const style = iconStyles[icon];

  return (
    <motion.article
      data-reveal
      className={cn(
        'group relative overflow-hidden rounded-xl border border-hairline p-lg transition-colors',
        tintMap[tint],
        featured && 'lg:p-xl',
      )}
      whileHover={{ y: -8 }}
      transition={{ type: 'spring', stiffness: 340, damping: 26 }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        aria-hidden
      >
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      </div>

      <div className="relative flex items-start justify-between gap-md">
        <motion.div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg',
            style.bg,
            style.text,
          )}
          whileHover={{ rotate: [0, -6, 6, 0], scale: 1.06 }}
          transition={{ duration: 0.45 }}
        >
          <FeatureIconSvg icon={icon} />
        </motion.div>

        {badge && (
          <span className="shrink-0 rounded-pill bg-surface-3 px-sm py-xxs font-mono text-caption text-primary">
            {badge}
          </span>
        )}
      </div>

      <h3 className="relative mt-lg font-sans text-card-title font-bold">{title}</h3>
      <p className="relative mt-sm font-sans text-body-sm leading-relaxed text-ink-subtle">
        {description}
      </p>

      {preview === 'heatmap' && <HeatmapPreview />}
      {preview === 'xp' && <XpPreview />}
      {preview === 'reports' && <ReportsPreview />}

      <motion.div
        className="absolute bottom-0 left-0 h-0.5 w-0 bg-primary group-hover:w-full"
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        aria-hidden
      />
    </motion.article>
  );
}
