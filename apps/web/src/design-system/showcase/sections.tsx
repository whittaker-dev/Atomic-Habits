'use client';

import { useTranslation } from 'react-i18next';
import { Button, TextLink } from '@/design-system/components/button';
import { BadgeTag, PillTab, StatusBadge, SuccessBadge } from '@/design-system/components/badges';
import {
  CardBase,
  CtaBanner,
  FeatureCard,
  FeatureCardYellowBold,
  PricingTierCard,
  TestimonialCard,
  WorkspaceMockupCard,
} from '@/design-system/components/cards';
import { ProgressBar, SearchPill, TextInput } from '@/design-system/components/input';
import { colors } from '@/design-system/tokens/colors';
import { rounded } from '@/design-system/tokens/radius';
import { spacing } from '@/design-system/tokens/spacing';
import { SectionShell, SubLabel } from './section-shell';

const NAV_SECTIONS = [
  { id: 'palette', labelKey: 'designSystem.nav.palette' },
  { id: 'typography', labelKey: 'designSystem.nav.typography' },
  { id: 'buttons', labelKey: 'designSystem.nav.buttons' },
  { id: 'cards', labelKey: 'designSystem.nav.cards' },
  { id: 'forms', labelKey: 'designSystem.nav.forms' },
  { id: 'spacing', labelKey: 'designSystem.nav.spacing' },
  { id: 'elevation', labelKey: 'designSystem.nav.elevation' },
  { id: 'responsive', labelKey: 'designSystem.nav.responsive' },
] as const;

export function ShowcaseNav() {
  const { t } = useTranslation();

  return (
    <>
      <nav className="sticky top-20 hidden w-44 shrink-0 lg:block">
        <p className="mb-sm font-sans text-caption font-medium text-ink-tertiary">
          {t('designSystem.nav.onThisPage')}
        </p>
        <ul className="space-y-xs">
          {NAV_SECTIONS.map(({ id, labelKey }) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className="block rounded-sm px-xs py-xxs font-sans text-body-sm text-ink-subtle transition-colors hover:bg-surface-1 hover:text-ink"
              >
                {t(labelKey)}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <nav className="mb-lg flex gap-xs overflow-x-auto pb-xs lg:hidden">
        {NAV_SECTIONS.map(({ id, labelKey }) => (
          <a
            key={id}
            href={`#${id}`}
            className="shrink-0 rounded-pill bg-surface-1 px-sm py-xxs font-sans text-caption text-ink-subtle hover:text-ink"
          >
            {t(labelKey)}
          </a>
        ))}
      </nav>
    </>
  );
}

function Swatch({ name, hex, className }: { name: string; hex: string; className?: string }) {
  return (
    <div className="panel-lift overflow-hidden rounded-lg bg-surface-1">
      <div
        className={className ?? 'h-16 bg-canvas'}
        style={className ? undefined : { backgroundColor: hex }}
      />
      <div className="p-sm">
        <p className="font-sans text-body-sm font-medium text-ink">{name}</p>
        <p className="font-mono text-mono text-ink-subtle">{hex}</p>
      </div>
    </div>
  );
}

export function PaletteSection() {
  const { t } = useTranslation();

  const brand = [
    { name: 'primary', hex: colors.primary },
    { name: 'primary-hover', hex: colors.primaryHover },
    { name: 'primary-focus', hex: colors.primaryFocus },
    { name: 'on-primary', hex: colors.onPrimary },
  ];
  const surfaces = [
    { name: 'canvas', hex: colors.canvas },
    { name: 'surface-1', hex: colors.surface1 },
    { name: 'surface-2', hex: colors.surface2 },
    { name: 'surface-3', hex: colors.surface3 },
    { name: 'surface-4', hex: colors.surface4 },
  ];
  const text = [
    { name: 'ink', hex: colors.ink },
    { name: 'ink-muted', hex: colors.inkMuted },
    { name: 'ink-subtle', hex: colors.inkSubtle },
    { name: 'ink-tertiary', hex: colors.inkTertiary },
  ];
  const semantic = [
    { name: 'success', hex: colors.semanticSuccess },
    { name: 'warning', hex: colors.semanticWarning },
    { name: 'error', hex: colors.semanticError },
    { name: 'info', hex: colors.semanticInfo },
  ];

  return (
    <SectionShell
      id="palette"
      title={t('designSystem.palette.title')}
      description={t('designSystem.palette.description')}
    >
      <SubLabel>{t('designSystem.palette.brand')}</SubLabel>
      <div className="grid grid-cols-2 gap-md sm:grid-cols-4">
        {brand.map((c) => (
          <Swatch key={c.name} name={c.name} hex={c.hex} />
        ))}
      </div>

      <SubLabel>{t('designSystem.palette.surfaceLadder')}</SubLabel>
      <div className="mt-md grid grid-cols-2 gap-md sm:grid-cols-3 lg:grid-cols-5">
        {surfaces.map((c) => (
          <Swatch key={c.name} name={c.name} hex={c.hex} />
        ))}
      </div>

      <SubLabel>{t('designSystem.palette.text')}</SubLabel>
      <div className="mt-md grid grid-cols-2 gap-md sm:grid-cols-4">
        {text.map((c) => (
          <Swatch key={c.name} name={c.name} hex={c.hex} />
        ))}
      </div>

      <SubLabel>{t('designSystem.palette.semantic')}</SubLabel>
      <div className="mt-md grid grid-cols-2 gap-md sm:grid-cols-4">
        {semantic.map((c) => (
          <Swatch key={c.name} name={c.name} hex={c.hex} />
        ))}
      </div>

      <SubLabel>{t('designSystem.palette.borders')}</SubLabel>
      <div className="mt-md grid grid-cols-3 gap-md">
        <Swatch name="hairline" hex={colors.hairline} />
        <Swatch name="hairline-strong" hex={colors.hairlineStrong} />
        <Swatch name="hairline-tertiary" hex={colors.hairlineTertiary} />
      </div>
    </SectionShell>
  );
}

export function TypographySection() {
  const { t } = useTranslation();

  return (
    <SectionShell
      id="typography"
      title={t('designSystem.typography.title')}
      description={t('designSystem.typography.description')}
    >
      <div className="panel-lift rounded-lg bg-surface-1 p-lg">
        <p className="font-sans text-display-xl font-bold">
          {t('designSystem.typography.displayXl')}
        </p>
        <p className="mt-xs font-mono text-mono text-ink-subtle">80px · 600 · -3px tracking</p>

        <p className="mt-lg font-sans text-display-lg font-bold">
          {t('designSystem.typography.displayLg')}
        </p>
        <p className="mt-xs font-mono text-mono text-ink-subtle">56px · 600 · -1.8px tracking</p>

        <p className="mt-lg font-sans text-display-md font-bold">
          {t('designSystem.typography.displayMd')}
        </p>
        <p className="mt-xs font-mono text-mono text-ink-subtle">40px · 600 · -1px tracking</p>

        <p className="mt-lg font-sans text-headline font-bold">
          {t('designSystem.typography.headline')}
        </p>
        <p className="mt-xs font-mono text-mono text-ink-subtle">28px · 600 · -0.6px</p>

        <p className="mt-lg font-sans text-card-title">{t('designSystem.typography.cardTitle')}</p>
        <p className="mt-xs font-mono text-mono text-ink-subtle">22px · 500 · -0.4px</p>

        <p className="mt-lg font-sans text-subhead">{t('designSystem.typography.subhead')}</p>
        <p className="mt-xs font-mono text-mono text-ink-subtle">20px · 400 · -0.2px</p>

        <p className="mt-lg font-sans text-body-lg">{t('designSystem.typography.bodyLg')}</p>
        <p className="mt-xs font-mono text-mono text-ink-subtle">18px · 400 · -0.1px</p>

        <p className="mt-lg font-sans text-body">{t('designSystem.typography.body')}</p>
        <p className="mt-xs font-mono text-mono text-ink-subtle">16px · 400 · -0.05px</p>

        <p className="mt-lg font-sans text-body-sm">{t('designSystem.typography.bodySm')}</p>
        <p className="mt-xs font-mono text-mono text-ink-subtle">14px · 400</p>

        <p className="mt-lg font-sans text-caption">{t('designSystem.typography.caption')}</p>
        <p className="mt-xs font-mono text-mono text-ink-subtle">12px · 400</p>

        <p className="mt-lg font-sans text-button font-medium">
          {t('designSystem.typography.buttonLabel')}
        </p>
        <p className="mt-xs font-mono text-mono text-ink-subtle">14px · 500</p>

        <p className="mt-lg font-sans text-eyebrow text-ink-muted">
          {t('designSystem.typography.eyebrow')}
        </p>
        <p className="mt-xs font-mono text-mono text-ink-subtle">13px · 500 · +0.4px tracking</p>

        <p className="mt-lg font-mono text-mono">{t('designSystem.typography.monoSample')}</p>
        <p className="mt-xs font-mono text-mono text-ink-subtle">
          {t('designSystem.typography.monoNote')}
        </p>
      </div>
    </SectionShell>
  );
}

export function ButtonsSection() {
  const { t } = useTranslation();

  return (
    <SectionShell
      id="buttons"
      title={t('designSystem.buttons.title')}
      description={t('designSystem.buttons.description')}
    >
      <SubLabel>{t('designSystem.buttons.primarySecondary')}</SubLabel>
      <div className="flex flex-wrap items-center gap-md">
        <Button>button-primary</Button>
        <Button variant="secondary">button-secondary</Button>
        <Button variant="tertiary">button-tertiary</Button>
        <Button variant="inverse">button-inverse</Button>
        <Button variant="ghost">{t('designSystem.buttons.ghost')}</Button>
        <TextLink href="#">{t('designSystem.buttons.linkEmphasis')}</TextLink>
      </div>

      <SubLabel>{t('designSystem.buttons.states')}</SubLabel>
      <div className="mt-md flex flex-wrap items-center gap-md">
        <Button className="bg-primary-hover">{t('designSystem.buttons.hover')}</Button>
        <Button className="bg-primary-focus">{t('designSystem.buttons.pressed')}</Button>
        <Button disabled>{t('designSystem.buttons.disabled')}</Button>
      </div>

      <SubLabel>{t('designSystem.buttons.pricingTabs')}</SubLabel>
      <div className="mt-md flex flex-wrap items-center gap-md">
        <PillTab>pricing-tab-default</PillTab>
        <PillTab active>pricing-tab-selected</PillTab>
      </div>

      <SubLabel>{t('designSystem.buttons.statusBadges')}</SubLabel>
      <div className="mt-md flex flex-wrap items-center gap-md">
        <StatusBadge>status-badge</StatusBadge>
        <SuccessBadge>semantic-success</SuccessBadge>
        <BadgeTag variant="default">{t('designSystem.buttons.tag')}</BadgeTag>
      </div>
    </SectionShell>
  );
}

export function CardsSection() {
  const { t } = useTranslation();

  return (
    <SectionShell
      id="cards"
      title={t('designSystem.cards.title')}
      description={t('designSystem.cards.description')}
    >
      <SubLabel>{t('designSystem.cards.surfaceLevels')}</SubLabel>
      <div className="grid gap-lg md:grid-cols-2 lg:grid-cols-4">
        <FeatureCard
          tint="surface-1"
          title={t('designSystem.cards.featureCard')}
          description={t('designSystem.cards.featureDesc1')}
        />
        <FeatureCard
          tint="surface-2"
          title={t('designSystem.cards.surface2Title')}
          description={t('designSystem.cards.surface2Desc')}
        />
        <FeatureCard
          tint="surface-3"
          title="surface-3"
          description={t('designSystem.cards.surface3Desc')}
        />
        <FeatureCard
          tint="surface-4"
          title="surface-4"
          description={t('designSystem.cards.surface4Desc')}
        />
      </div>

      <SubLabel>{t('designSystem.cards.pricingPlans')}</SubLabel>
      <div className="mt-md grid gap-lg md:grid-cols-3">
        <PricingTierCard
          name={t('designSystem.cards.free')}
          price="$0"
          features={[
            t('designSystem.cards.featureMissions'),
            t('designSystem.cards.featureStreak'),
            t('designSystem.cards.featureReports'),
          ]}
          action={<Button variant="secondary">{t('common.actions.getStarted')}</Button>}
        />
        <PricingTierCard
          featured
          name={t('designSystem.cards.pro')}
          price="$12"
          features={[
            t('designSystem.cards.featureUnlimited'),
            t('designSystem.cards.featureEnglishAi'),
            t('designSystem.cards.featureWeeklyReports'),
            t('designSystem.cards.featurePriority'),
          ]}
          action={<Button>{t('common.actions.upgrade')}</Button>}
        />
        <PricingTierCard
          name={t('designSystem.cards.team')}
          price="$29"
          features={[
            t('designSystem.cards.featureEverythingPro'),
            t('designSystem.cards.featureShared'),
            t('designSystem.cards.featureAdmin'),
          ]}
          action={<Button variant="secondary">{t('common.actions.contactSales')}</Button>}
        />
      </div>

      <SubLabel>{t('designSystem.cards.screenshotTitle')}</SubLabel>
      <div className="mt-md space-y-lg">
        <WorkspaceMockupCard title={t('designSystem.cards.mockupTitle')}>
          <div className="rounded-md bg-surface-2 p-md">
            <p className="font-sans text-body-sm font-medium text-ink">
              {t('designSystem.cards.mockupMissions')}
            </p>
            <ul className="mt-sm space-y-xs font-sans text-body-sm text-ink-subtle">
              <li className="text-ink">{t('designSystem.cards.mockupEnglish')}</li>
              <li>{t('designSystem.cards.mockupExercise')}</li>
              <li className="text-primary">{t('designSystem.cards.mockupTicket')}</li>
            </ul>
          </div>
        </WorkspaceMockupCard>

        <div className="grid gap-lg md:grid-cols-2">
          <TestimonialCard
            quote={t('designSystem.cards.testimonialQuote')}
            author={t('designSystem.cards.testimonialAuthor')}
            role={t('designSystem.cards.testimonialRole')}
          />
          <CtaBanner
            title={t('designSystem.cards.ctaTitle')}
            description={t('designSystem.cards.ctaDescription')}
            action={<Button>{t('common.actions.getStartedFree')}</Button>}
          />
        </div>

        <FeatureCardYellowBold
          title={t('designSystem.cards.highlightTitle')}
          description={t('designSystem.cards.highlightDescription')}
          action={<Button variant="secondary">{t('common.actions.learnMore')}</Button>}
        />

        <CardBase>
          <p className="font-sans text-body-sm text-ink-subtle">
            {t('designSystem.cards.cardBase')}
          </p>
        </CardBase>
      </div>
    </SectionShell>
  );
}

export function FormsSection() {
  const { t } = useTranslation();

  return (
    <SectionShell
      id="forms"
      title={t('designSystem.forms.title')}
      description={t('designSystem.forms.description')}
    >
      <div className="grid max-w-lg gap-lg">
        <div>
          <label htmlFor="ds-email" className="mb-xs block font-sans text-body-sm text-ink-muted">
            {t('designSystem.forms.email')}
          </label>
          <TextInput id="ds-email" placeholder={t('contact.placeholders.email')} type="email" />
        </div>

        <div>
          <label htmlFor="ds-name" className="mb-xs block font-sans text-body-sm text-ink-muted">
            {t('designSystem.forms.name')}
          </label>
          <TextInput id="ds-name" placeholder={t('contact.placeholders.name')} />
        </div>

        <div>
          <label htmlFor="ds-search" className="mb-xs block font-sans text-body-sm text-ink-muted">
            {t('designSystem.forms.search')}
          </label>
          <SearchPill id="ds-search" placeholder={t('designSystem.forms.searchPlaceholder')} />
        </div>

        <div>
          <label htmlFor="ds-focused" className="mb-xs block font-sans text-body-sm text-ink-muted">
            {t('designSystem.forms.focusState')}
          </label>
          <TextInput
            id="ds-focused"
            defaultValue={t('designSystem.forms.focusedInput')}
            className="outline outline-2 outline-primary-focus/50"
          />
        </div>

        <div>
          <p className="mb-xs font-sans text-body-sm text-ink-muted">
            {t('designSystem.forms.progress')}
          </p>
          <ProgressBar value={68} />
          <p className="mt-xs font-sans text-caption text-ink-tertiary">
            {t('designSystem.forms.progressCaption')}
          </p>
        </div>

        <div className="flex flex-wrap gap-md">
          <Button type="submit">{t('common.actions.submit')}</Button>
          <Button variant="secondary" type="button">
            {t('common.actions.cancel')}
          </Button>
        </div>
      </div>
    </SectionShell>
  );
}

export function SpacingSection() {
  const { t } = useTranslation();
  const tokens = Object.entries(spacing) as [keyof typeof spacing, string][];

  return (
    <SectionShell
      id="spacing"
      title={t('designSystem.spacing.title')}
      description={t('designSystem.spacing.description')}
    >
      <div className="space-y-md">
        {tokens.map(([token, value]) => (
          <div key={token} className="flex items-center gap-md">
            <span className="w-16 shrink-0 font-mono text-mono text-ink-subtle">{token}</span>
            <span className="w-12 shrink-0 font-mono text-mono text-ink-tertiary">{value}</span>
            <div className="h-3 rounded-xs bg-primary" style={{ width: value }} />
          </div>
        ))}
      </div>

      <SubLabel>{t('designSystem.spacing.borderRadius')}</SubLabel>
      <div className="mt-md grid grid-cols-2 gap-md sm:grid-cols-4">
        {(Object.entries(rounded) as [keyof typeof rounded, string][]).map(([token, value]) => (
          <div key={token} className="panel-lift rounded-lg bg-surface-1 p-md text-center">
            <div className="mx-auto mb-sm h-12 w-12 bg-surface-3" style={{ borderRadius: value }} />
            <p className="font-sans text-body-sm text-ink">{token}</p>
            <p className="font-mono text-mono text-ink-subtle">{value}</p>
          </div>
        ))}
      </div>

      <SubLabel>{t('designSystem.spacing.layout')}</SubLabel>
      <div className="mt-md panel-lift rounded-lg bg-surface-1 p-lg font-mono text-mono text-body-sm text-ink-subtle">
        <p>{t('designSystem.spacing.layoutMaxWidth')}</p>
        <p>{t('designSystem.spacing.layoutNavHeight')}</p>
        <p>{t('designSystem.spacing.layoutCardPadding')}</p>
      </div>
    </SectionShell>
  );
}

export function ElevationSection() {
  const { t } = useTranslation();

  const levels = [
    {
      level: 0,
      labelKey: 'designSystem.elevation.flat',
      descKey: 'designSystem.elevation.flatDesc',
      className: 'bg-canvas',
    },
    {
      level: 1,
      labelKey: 'designSystem.elevation.charcoal',
      descKey: 'designSystem.elevation.charcoalDesc',
      className: 'panel-lift bg-surface-1',
    },
    {
      level: 2,
      labelKey: 'designSystem.elevation.surface2',
      descKey: 'designSystem.elevation.surface2Desc',
      className: 'panel-lift border border-hairline-strong bg-surface-2',
    },
    {
      level: 3,
      labelKey: 'designSystem.elevation.surface3',
      descKey: 'designSystem.elevation.surface3Desc',
      className: 'bg-surface-3',
    },
    {
      level: 4,
      labelKey: 'designSystem.elevation.focusRing',
      descKey: 'designSystem.elevation.focusRingDesc',
      className: 'panel-lift bg-surface-1 outline outline-2 outline-primary-focus/50',
    },
  ];

  return (
    <SectionShell
      id="elevation"
      title={t('designSystem.elevation.title')}
      description={t('designSystem.elevation.description')}
    >
      <div className="grid gap-md md:grid-cols-2 lg:grid-cols-3">
        {levels.map(({ level, labelKey, descKey, className }) => (
          <div key={level} className={`rounded-lg p-lg ${className}`}>
            <p className="font-sans text-body-sm font-medium text-ink">
              {t('designSystem.elevation.level', { level, label: t(labelKey) })}
            </p>
            <p className="mt-xs font-sans text-caption text-ink-subtle">{t(descKey)}</p>
          </div>
        ))}
      </div>
      <p className="mt-lg font-sans text-body-sm text-ink-subtle">
        {t('designSystem.elevation.panelEdge')}{' '}
        <code className="rounded-sm bg-surface-1 px-1 font-mono text-mono">
          inset 0 1px 0 rgba(255,255,255,0.06)
        </code>
      </p>
    </SectionShell>
  );
}

const BREAKPOINT_KEYS = [
  { nameKey: 'designSystem.responsive.mobile', width: '< 768px', cols: 1 },
  { nameKey: 'designSystem.responsive.tablet', width: '768–1023px', cols: 2 },
  { nameKey: 'designSystem.responsive.desktop', width: '1024–1279px', cols: 3 },
  { nameKey: 'designSystem.responsive.desktopXl', width: '≥ 1280px', cols: 3 },
] as const;

export function ResponsiveSection() {
  const { t } = useTranslation();

  return (
    <SectionShell
      id="responsive"
      title={t('designSystem.responsive.title')}
      description={t('designSystem.responsive.description')}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left">
          <thead>
            <tr className="border-b border-hairline">
              <th className="py-sm font-sans text-body-sm font-medium text-ink">
                {t('designSystem.responsive.breakpoint')}
              </th>
              <th className="py-sm font-sans text-body-sm font-medium text-ink">
                {t('designSystem.responsive.width')}
              </th>
              <th className="py-sm font-sans text-body-sm font-medium text-ink">
                {t('designSystem.responsive.cardGrid')}
              </th>
            </tr>
          </thead>
          <tbody>
            {BREAKPOINT_KEYS.map((bp) => (
              <tr key={bp.nameKey} className="border-b border-hairline-tertiary">
                <td className="py-sm font-sans text-body-sm text-ink">{t(bp.nameKey)}</td>
                <td className="py-sm font-mono text-mono text-ink-subtle">{bp.width}</td>
                <td className="py-sm font-sans text-body-sm text-ink-subtle">
                  {t('designSystem.responsive.colsUp', { cols: bp.cols })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SubLabel className="mt-4">{t('designSystem.responsive.liveGrid')}</SubLabel>
      <div className="mt-md grid grid-cols-1 gap-md md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((n) => (
          <div key={n} className="panel-lift rounded-lg bg-surface-1 p-lg text-center">
            <p className="font-sans text-body-sm text-ink">
              {t('designSystem.responsive.column', { n })}
            </p>
            <p className="mt-xs font-sans text-caption text-ink-subtle">
              {t('designSystem.responsive.columnNote')}
            </p>
          </div>
        ))}
      </div>

      <SubLabel className="mt-4">{t('designSystem.responsive.displayScale')}</SubLabel>
      <div className="mt-md panel-lift rounded-lg bg-surface-1 p-lg">
        <p className="font-sans text-display-md font-bold md:text-display-lg lg:text-display-xl">
          {t('designSystem.responsive.responsiveDisplay')}
        </p>
        <p className="mt-sm font-sans text-caption text-ink-subtle">
          {t('designSystem.responsive.displaySizes')}
        </p>
      </div>

      <SubLabel className="mt-4">{t('designSystem.responsive.touchTargets')}</SubLabel>
      <ul className="mt-md space-y-xs font-sans text-body-sm text-ink-subtle">
        <li>{t('designSystem.responsive.ctaHeight')}</li>
        <li>{t('designSystem.responsive.tabHeight')}</li>
        <li>{t('designSystem.responsive.inputHeight')}</li>
      </ul>
    </SectionShell>
  );
}
