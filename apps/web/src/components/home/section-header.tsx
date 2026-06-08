'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'center' | 'left';
  className?: string;
}) {
  const centered = align === 'center';

  return (
    <div
      className={cn(
        'relative',
        centered ? 'mx-auto max-w-3xl text-center' : 'max-w-2xl text-left',
        className,
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute -top-16 h-48 w-48 rounded-full bg-primary/15 blur-[80px]',
          centered ? 'left-1/2 -translate-x-1/2' : '-left-8',
        )}
        aria-hidden
      />

      {eyebrow && (
        <motion.p
          data-reveal
          className={cn(
            'relative inline-flex items-center gap-xs font-sans text-eyebrow font-bold uppercase tracking-[0.12em] text-primary',
            centered && 'justify-center',
          )}
        >
          <span className="h-px w-6 bg-primary/60" aria-hidden />
          {eyebrow}
          <span className="h-px w-6 bg-primary/60" aria-hidden />
        </motion.p>
      )}

      <motion.h2
        data-reveal
        className={cn(
          'relative mt-md font-sans text-display-md font-bold md:text-headline lg:text-display-md',
          centered && 'mx-auto',
        )}
      >
        {title}
      </motion.h2>

      {subtitle && (
        <motion.p
          data-reveal
          className={cn(
            'relative mt-md font-sans text-body-lg text-ink-muted',
            centered && 'mx-auto max-w-2xl',
          )}
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  );
}
