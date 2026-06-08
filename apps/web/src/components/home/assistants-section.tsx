'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button } from '@/design-system/components/button';
import { cn } from '@/lib/utils';

const ctaMotion = {
  whileHover: { scale: 1.04, y: -2 },
  whileTap: { scale: 0.98 },
  transition: { type: 'spring' as const, stiffness: 400, damping: 20 },
};

type AssistantKey = 'english' | 'work' | 'fitness';

const assistantMeta: Record<AssistantKey, { accent: string; initial: string }> = {
  english: { accent: 'border-primary/30 bg-primary/10', initial: 'En' },
  work: { accent: 'border-info/30 bg-info/10', initial: 'Dw' },
  fitness: { accent: 'border-warning/30 bg-warning/10', initial: 'Fi' },
};

function AssistantCard({
  initial,
  name,
  role,
  prompt,
  status,
  accent,
  delay,
}: {
  initial: string;
  name: string;
  role: string;
  prompt: string;
  status: string;
  accent: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      className={cn(
        'group relative overflow-hidden rounded-xl border p-md backdrop-blur-sm transition-colors',
        accent,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="flex items-start justify-between gap-sm">
        <div className="flex items-start gap-sm">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-1/80 font-sans text-caption font-bold text-ink">
            {initial}
          </span>
          <div>
            <p className="font-sans text-body-sm font-bold text-ink">{name}</p>
            <p className="mt-xxs font-sans text-caption text-ink-subtle">{role}</p>
          </div>
        </div>
        <span className="flex items-center gap-xxs rounded-pill bg-surface-1/80 px-xs py-xxs font-sans text-caption text-primary">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" aria-hidden />
          {status}
        </span>
      </div>

      <div className="mt-md rounded-lg bg-canvas/60 px-sm py-xs">
        <p className="font-sans text-caption text-ink-muted">&ldquo;{prompt}&rdquo;</p>
      </div>
    </motion.div>
  );
}

function ChatPreview() {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="relative overflow-hidden rounded-xl border border-hairline bg-surface-2/80 p-md"
    >
      <div className="mb-md flex items-center gap-sm border-b border-hairline pb-sm">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 font-sans text-caption font-bold text-primary">
          En
        </div>
        <div>
          <p className="font-sans text-body-sm font-bold text-ink">
            {t('home.assistants.chatTitle')}
          </p>
          <p className="font-sans text-caption text-ink-subtle">
            {t('home.assistants.chatSubtitle')}
          </p>
        </div>
      </div>

      <div className="space-y-sm">
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.35 }}
          className="max-w-[90%] rounded-lg rounded-bl-none bg-surface-3 px-sm py-xs"
        >
          <p className="font-sans text-caption text-ink-subtle">{t('home.assistants.chatUser')}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="ml-auto max-w-[92%] rounded-lg rounded-br-none border border-primary/20 bg-primary/10 px-sm py-xs"
        >
          <p className="font-sans text-caption text-ink">{t('home.assistants.chatReply')}</p>
        </motion.div>
      </div>

      <motion.div
        className="mt-md flex items-center gap-xs rounded-lg border border-hairline bg-surface-1 px-sm py-xs"
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <span className="font-sans text-caption text-ink-tertiary">
          {t('home.assistants.chatTyping')}
        </span>
        <span className="flex gap-0.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-1 w-1 rounded-full bg-primary"
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </span>
      </motion.div>
    </motion.div>
  );
}

export function AssistantsSection() {
  const { t } = useTranslation();
  const keys: AssistantKey[] = ['english', 'work', 'fitness'];

  return (
    <section className="relative py-section">
      <div
        className="pointer-events-none absolute inset-x-0 top-1/2 h-[520px] -translate-y-1/2 bg-gradient-to-r from-primary/5 via-transparent to-primary/5"
        aria-hidden
      />
      <div className="container-content relative">
        <div className="panel-lift relative overflow-hidden rounded-xl border border-hairline bg-surface-1">
          <div
            className="pointer-events-none absolute -left-32 top-0 h-64 w-64 rounded-full bg-primary/10 blur-[100px]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -right-32 bottom-0 h-64 w-64 rounded-full bg-info/10 blur-[100px]"
            aria-hidden
          />

          <div className="grid gap-xl p-lg md:p-xl lg:grid-cols-2 lg:gap-xxl lg:p-xxl">
            <div className="relative flex flex-col justify-center">
              <p className="inline-flex items-center gap-xs font-sans text-eyebrow font-bold uppercase tracking-[0.12em] text-primary">
                <span className="h-px w-6 bg-primary/60" aria-hidden />
                {t('home.assistants.eyebrow')}
              </p>
              <h2 className="mt-md font-sans text-headline font-bold md:text-display-md">
                {t('home.assistants.title')}
              </h2>
              <p className="mt-md font-sans text-body-lg text-ink-muted">
                {t('home.assistants.description')}
              </p>

              <ul className="mt-lg space-y-sm">
                {keys.map((key, i) => (
                  <motion.li
                    key={key}
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-sm font-sans text-body-sm text-ink-subtle"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-surface-2 font-sans text-caption font-bold text-primary">
                      {assistantMeta[key].initial}
                    </span>
                    {t(`home.assistants.highlights.${key}`)}
                  </motion.li>
                ))}
              </ul>

              <div className="mt-xl">
                <Link href="/design-system">
                  <motion.span {...ctaMotion} className="inline-block">
                    <Button>{t('home.assistants.cta')}</Button>
                  </motion.span>
                </Link>
              </div>
            </div>

            <div className="relative space-y-md">
              <ChatPreview />
              <div className="grid gap-md sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                {keys.map((key, i) => (
                  <AssistantCard
                    key={key}
                    initial={assistantMeta[key].initial}
                    name={t(`home.assistants.${key}.name`)}
                    role={t(`home.assistants.${key}.role`)}
                    prompt={t(`home.assistants.${key}.prompt`)}
                    status={t(`home.assistants.${key}.status`)}
                    accent={assistantMeta[key].accent}
                    delay={0.15 + i * 0.1}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
