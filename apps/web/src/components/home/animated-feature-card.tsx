'use client';

import { motion } from 'framer-motion';
import type { CardTint } from '@/design-system/tokens/colors';
import { cn } from '@/lib/utils';

const tintMap: Record<CardTint, string> = {
  'surface-1': 'bg-surface-1 hover:bg-surface-2',
  'surface-2': 'bg-surface-2 hover:bg-surface-3',
  'surface-3': 'bg-surface-3 hover:bg-surface-4',
  'surface-4': 'bg-surface-4',
};

export function AnimatedFeatureCard({
  tint = 'surface-1',
  title,
  description,
  index = 0,
}: {
  tint?: CardTint;
  title: string;
  description: string;
  index?: number;
}) {
  return (
    <motion.div
      data-reveal
      className={cn('panel-lift rounded-lg p-lg text-ink transition-colors', tintMap[tint])}
      whileHover={{
        y: -6,
        scale: 1.02,
        rotateX: 4,
        rotateY: index % 2 === 0 ? -3 : 3,
        boxShadow: '0 24px 48px rgba(0,0,0,0.45)',
      }}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      style={{ transformStyle: 'preserve-3d' }}
    >
      <motion.div
        className="mb-md h-10 w-10 rounded-md bg-primary/15"
        animate={{ rotate: [0, 8, -8, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: index * 0.4 }}
      />
      <h3 className="font-sans text-card-title">{title}</h3>
      <p className="mt-sm font-sans text-body-sm text-ink-subtle">{description}</p>
    </motion.div>
  );
}
