import { Button, TextLink } from '@/design-system/components/button';
import {
  BadgeTag,
  PillTab,
  StatusBadge,
  SuccessBadge,
} from '@/design-system/components/badges';
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
  { id: 'palette', label: 'Palette' },
  { id: 'typography', label: 'Typography' },
  { id: 'buttons', label: 'Buttons' },
  { id: 'cards', label: 'Cards' },
  { id: 'forms', label: 'Forms' },
  { id: 'spacing', label: 'Spacing' },
  { id: 'elevation', label: 'Elevation' },
  { id: 'responsive', label: 'Responsive' },
] as const;

export function ShowcaseNav() {
  return (
    <>
      <nav className="sticky top-20 hidden w-44 shrink-0 lg:block">
        <p className="mb-sm font-sans text-caption font-medium text-ink-tertiary">On this page</p>
        <ul className="space-y-xs">
          {NAV_SECTIONS.map(({ id, label }) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className="block rounded-sm px-xs py-xxs font-sans text-body-sm text-ink-subtle transition-colors hover:bg-surface-1 hover:text-ink"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <nav className="mb-lg flex gap-xs overflow-x-auto pb-xs lg:hidden">
        {NAV_SECTIONS.map(({ id, label }) => (
          <a
            key={id}
            href={`#${id}`}
            className="shrink-0 rounded-pill bg-surface-1 px-sm py-xxs font-sans text-caption text-ink-subtle hover:text-ink"
          >
            {label}
          </a>
        ))}
      </nav>
    </>
  );
}

function Swatch({ name, hex, className }: { name: string; hex: string; className?: string }) {
  return (
    <div className="panel-lift overflow-hidden rounded-lg bg-surface-1">
      <div className={className ?? 'h-16 bg-canvas'} style={className ? undefined : { backgroundColor: hex }} />
      <div className="p-sm">
        <p className="font-sans text-body-sm font-medium text-ink">{name}</p>
        <p className="font-mono text-mono text-ink-subtle">{hex}</p>
      </div>
    </div>
  );
}

export function PaletteSection() {
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
      title="Palette"
      description="Spotify Green on charcoal surfaces. Token names follow DESIGN.md."
    >
      <SubLabel>Brand</SubLabel>
      <div className="grid grid-cols-2 gap-md sm:grid-cols-4">
        {brand.map((c) => (
          <Swatch key={c.name} name={c.name} hex={c.hex} />
        ))}
      </div>

      <SubLabel>Surface ladder</SubLabel>
      <div className="mt-md grid grid-cols-2 gap-md sm:grid-cols-3 lg:grid-cols-5">
        {surfaces.map((c) => (
          <Swatch key={c.name} name={c.name} hex={c.hex} />
        ))}
      </div>

      <SubLabel>Text</SubLabel>
      <div className="mt-md grid grid-cols-2 gap-md sm:grid-cols-4">
        {text.map((c) => (
          <Swatch key={c.name} name={c.name} hex={c.hex} />
        ))}
      </div>

      <SubLabel>Semantic</SubLabel>
      <div className="mt-md grid grid-cols-2 gap-md sm:grid-cols-4">
        {semantic.map((c) => (
          <Swatch key={c.name} name={c.name} hex={c.hex} />
        ))}
      </div>

      <SubLabel>Borders</SubLabel>
      <div className="mt-md grid grid-cols-3 gap-md">
        <Swatch name="hairline" hex={colors.hairline} />
        <Swatch name="hairline-strong" hex={colors.hairlineStrong} />
        <Swatch name="hairline-tertiary" hex={colors.hairlineTertiary} />
      </div>
    </SectionShell>
  );
}

export function TypographySection() {
  return (
    <SectionShell
      id="typography"
      title="Typography"
      description="DM Sans (SpotifyMixUI substitute). Negative tracking on display sizes per DESIGN.md."
    >
      <div className="panel-lift rounded-lg bg-surface-1 p-lg">
        <p className="font-sans text-display-xl font-semibold">Display XL</p>
        <p className="mt-xs font-mono text-mono text-ink-subtle">80px · 600 · -3px tracking</p>

        <p className="mt-lg font-sans text-display-lg font-semibold">Display LG</p>
        <p className="mt-xs font-mono text-mono text-ink-subtle">56px · 600 · -1.8px tracking</p>

        <p className="mt-lg font-sans text-display-md font-semibold">Display MD</p>
        <p className="mt-xs font-mono text-mono text-ink-subtle">40px · 600 · -1px tracking</p>

        <p className="mt-lg font-sans text-headline font-semibold">Headline</p>
        <p className="mt-xs font-mono text-mono text-ink-subtle">28px · 600 · -0.6px</p>

        <p className="mt-lg font-sans text-card-title">Card title</p>
        <p className="mt-xs font-mono text-mono text-ink-subtle">22px · 500 · -0.4px</p>

        <p className="mt-lg font-sans text-subhead">Subhead — lead paragraphs</p>
        <p className="mt-xs font-mono text-mono text-ink-subtle">20px · 400 · -0.2px</p>

        <p className="mt-lg font-sans text-body-lg">Body LG — hero subhead</p>
        <p className="mt-xs font-mono text-mono text-ink-subtle">18px · 400 · -0.1px</p>

        <p className="mt-lg font-sans text-body">Body — default paragraph text</p>
        <p className="mt-xs font-mono text-mono text-ink-subtle">16px · 400 · -0.05px</p>

        <p className="mt-lg font-sans text-body-sm">Body SM — footer columns</p>
        <p className="mt-xs font-mono text-mono text-ink-subtle">14px · 400</p>

        <p className="mt-lg font-sans text-caption">Caption — meta, status</p>
        <p className="mt-xs font-mono text-mono text-ink-subtle">12px · 400</p>

        <p className="mt-lg font-sans text-button font-medium">Button label</p>
        <p className="mt-xs font-mono text-mono text-ink-subtle">14px · 500</p>

        <p className="mt-lg font-sans text-eyebrow text-ink-muted">Eyebrow taxonomy</p>
        <p className="mt-xs font-mono text-mono text-ink-subtle">13px · 500 · +0.4px tracking</p>

        <p className="mt-lg font-mono text-mono">const streak = await getStreak();</p>
        <p className="mt-xs font-mono text-mono text-ink-subtle">13px mono · product screenshots</p>
      </div>
    </SectionShell>
  );
}

export function ButtonsSection() {
  return (
    <SectionShell
      id="buttons"
      title="Buttons"
      description="8px corners (rounded-md). Pills reserved for pricing tabs only."
    >
      <SubLabel>Primary & secondary</SubLabel>
      <div className="flex flex-wrap items-center gap-md">
        <Button>button-primary</Button>
        <Button variant="secondary">button-secondary</Button>
        <Button variant="tertiary">button-tertiary</Button>
        <Button variant="inverse">button-inverse</Button>
        <Button variant="ghost">Ghost</Button>
        <TextLink href="#">Link emphasis</TextLink>
      </div>

      <SubLabel>States</SubLabel>
      <div className="mt-md flex flex-wrap items-center gap-md">
        <Button className="bg-primary-hover">Hover</Button>
        <Button className="bg-primary-focus">Pressed</Button>
        <Button disabled>Disabled</Button>
      </div>

      <SubLabel>Pricing tabs (pill)</SubLabel>
      <div className="mt-md flex flex-wrap items-center gap-md">
        <PillTab>pricing-tab-default</PillTab>
        <PillTab active>pricing-tab-selected</PillTab>
      </div>

      <SubLabel>Status badges</SubLabel>
      <div className="mt-md flex flex-wrap items-center gap-md">
        <StatusBadge>status-badge</StatusBadge>
        <SuccessBadge>semantic-success</SuccessBadge>
        <BadgeTag variant="default">Tag</BadgeTag>
      </div>
    </SectionShell>
  );
}

export function CardsSection() {
  return (
    <SectionShell
      id="cards"
      title="Cards"
      description="Surface ladder + hairline borders. Product screenshot panels use rounded-xl."
    >
      <SubLabel>Surface levels</SubLabel>
      <div className="grid gap-lg md:grid-cols-2 lg:grid-cols-4">
        <FeatureCard tint="surface-1" title="feature-card" description="surface-1 · rounded-lg · 24px pad" />
        <FeatureCard tint="surface-2" title="surface-2 lift" description="Featured / hover state" />
        <FeatureCard tint="surface-3" title="surface-3" description="Sub-nav depth" />
        <FeatureCard tint="surface-4" title="surface-4" description="Deepest lift" />
      </div>

      <SubLabel>Pricing plans</SubLabel>
      <div className="mt-md grid gap-lg md:grid-cols-3">
        <PricingTierCard
          name="Free"
          price="$0"
          features={['5 missions', 'Streak tracking', 'Basic reports']}
          action={<Button variant="secondary">Get started</Button>}
        />
        <PricingTierCard
          featured
          name="Pro"
          price="$12"
          features={['Unlimited missions', 'English AI', 'Weekly reports', 'Priority support']}
          action={<Button>Upgrade</Button>}
        />
        <PricingTierCard
          name="Team"
          price="$29"
          features={['Everything in Pro', 'Shared missions', 'Admin dashboard']}
          action={<Button variant="secondary">Contact sales</Button>}
        />
      </div>

      <SubLabel>Product screenshot · testimonial · CTA</SubLabel>
      <div className="mt-md space-y-lg">
        <WorkspaceMockupCard title="product-screenshot-card">
          <div className="rounded-md bg-surface-2 p-md">
            <p className="font-sans text-body-sm font-medium text-ink">Today&apos;s missions</p>
            <ul className="mt-sm space-y-xs font-sans text-body-sm text-ink-subtle">
              <li className="text-ink">☐ Learn 10 English words</li>
              <li>☐ Exercise 20 mins</li>
              <li className="text-primary">☑ Finish ticket TRY-44</li>
            </ul>
          </div>
        </WorkspaceMockupCard>

        <div className="grid gap-lg md:grid-cols-2">
          <TestimonialCard
            quote="The streak system keeps me coming back every single day."
            author="Alex Chen"
            role="Software engineer"
          />
          <CtaBanner
            title="cta-banner"
            description="Closing panel near page bottom."
            action={<Button>Get started free</Button>}
          />
        </div>

        <FeatureCardYellowBold
          title="Highlighted section"
          description="High-emphasis callout on surface-1."
          action={<Button variant="secondary">Learn more</Button>}
        />

        <CardBase>
          <p className="font-sans text-body-sm text-ink-subtle">CardBase — generic container</p>
        </CardBase>
      </div>
    </SectionShell>
  );
}

export function FormsSection() {
  return (
    <SectionShell
      id="forms"
      title="Forms"
      description="surface-1 inputs, 8px radius, primary focus ring at 50% opacity."
    >
      <div className="grid max-w-lg gap-lg">
        <div>
          <label htmlFor="ds-email" className="mb-xs block font-sans text-body-sm text-ink-muted">
            Email
          </label>
          <TextInput id="ds-email" placeholder="you@example.com" type="email" />
        </div>

        <div>
          <label htmlFor="ds-name" className="mb-xs block font-sans text-body-sm text-ink-muted">
            Name
          </label>
          <TextInput id="ds-name" placeholder="Your name" />
        </div>

        <div>
          <label htmlFor="ds-search" className="mb-xs block font-sans text-body-sm text-ink-muted">
            Search
          </label>
          <SearchPill id="ds-search" placeholder="Search missions..." />
        </div>

        <div>
          <label htmlFor="ds-focused" className="mb-xs block font-sans text-body-sm text-ink-muted">
            Focus state
          </label>
          <TextInput
            id="ds-focused"
            defaultValue="Focused input"
            className="outline outline-2 outline-primary-focus/50"
          />
        </div>

        <div>
          <p className="mb-xs font-sans text-body-sm text-ink-muted">Progress</p>
          <ProgressBar value={68} />
          <p className="mt-xs font-sans text-caption text-ink-tertiary">Level 7 · 68% to Level 8</p>
        </div>

        <div className="flex flex-wrap gap-md">
          <Button type="submit">Submit</Button>
          <Button variant="secondary" type="button">
            Cancel
          </Button>
        </div>
      </div>
    </SectionShell>
  );
}

export function SpacingSection() {
  const tokens = Object.entries(spacing) as [keyof typeof spacing, string][];

  return (
    <SectionShell
      id="spacing"
      title="Spacing"
      description="4px base unit. Section gaps use spacing.section (96px)."
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

      <SubLabel>Border radius</SubLabel>
      <div className="mt-md grid grid-cols-2 gap-md sm:grid-cols-4">
        {(Object.entries(rounded) as [keyof typeof rounded, string][]).map(([token, value]) => (
          <div key={token} className="panel-lift rounded-lg bg-surface-1 p-md text-center">
            <div
              className="mx-auto mb-sm h-12 w-12 bg-surface-3"
              style={{ borderRadius: value }}
            />
            <p className="font-sans text-body-sm text-ink">{token}</p>
            <p className="font-mono text-mono text-ink-subtle">{value}</p>
          </div>
        ))}
      </div>

      <SubLabel>Layout</SubLabel>
      <div className="mt-md panel-lift rounded-lg bg-surface-1 p-lg font-mono text-mono text-body-sm text-ink-subtle">
        <p>max-width: 1280px</p>
        <p>nav-height: 56px</p>
        <p>card padding: lg (24px) · testimonial: xl (32px) · cta: xxl (48px)</p>
      </div>
    </SectionShell>
  );
}

export function ElevationSection() {
  const levels = [
    {
      level: 0,
      label: 'Flat',
      desc: 'Canvas — hero text, footer',
      className: 'bg-canvas',
      border: false,
    },
    {
      level: 1,
      label: 'Charcoal lift',
      desc: 'surface-1 + hairline',
      className: 'panel-lift bg-surface-1',
      border: true,
    },
    {
      level: 2,
      label: 'Surface-2 lift',
      desc: 'Featured pricing, hover',
      className: 'panel-lift border border-hairline-strong bg-surface-2',
      border: true,
    },
    {
      level: 3,
      label: 'Surface-3',
      desc: 'Sub-nav, dropdowns',
      className: 'bg-surface-3',
      border: false,
    },
    {
      level: 4,
      label: 'Focus ring',
      desc: '2px primary-focus @ 50%',
      className: 'panel-lift bg-surface-1 outline outline-2 outline-primary-focus/50',
      border: true,
    },
  ];

  return (
    <SectionShell
      id="elevation"
      title="Elevation"
      description="Depth via surface ladder + hairline borders. No drop shadows on dark."
    >
      <div className="grid gap-md md:grid-cols-2 lg:grid-cols-3">
        {levels.map(({ level, label, desc, className }) => (
          <div key={level} className={`rounded-lg p-lg ${className}`}>
            <p className="font-sans text-body-sm font-medium text-ink">
              Level {level} — {label}
            </p>
            <p className="mt-xs font-sans text-caption text-ink-subtle">{desc}</p>
          </div>
        ))}
      </div>
      <p className="mt-lg font-sans text-body-sm text-ink-subtle">
        Panel edge highlight:{' '}
        <code className="rounded-sm bg-surface-1 px-1 font-mono text-mono">inset 0 1px 0 rgba(255,255,255,0.06)</code>
      </p>
    </SectionShell>
  );
}

const BREAKPOINTS = [
  { name: 'Mobile', width: '< 768px', cols: 1 },
  { name: 'Tablet', width: '768–1023px', cols: 2 },
  { name: 'Desktop', width: '1024–1279px', cols: 3 },
  { name: 'Desktop XL', width: '≥ 1280px', cols: 3 },
];

export function ResponsiveSection() {
  return (
    <SectionShell
      id="responsive"
      title="Responsive"
      description="Card grids collapse 3 → 2 → 1. Display type scales down on mobile."
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left">
          <thead>
            <tr className="border-b border-hairline">
              <th className="py-sm font-sans text-body-sm font-medium text-ink">Breakpoint</th>
              <th className="py-sm font-sans text-body-sm font-medium text-ink">Width</th>
              <th className="py-sm font-sans text-body-sm font-medium text-ink">Card grid</th>
            </tr>
          </thead>
          <tbody>
            {BREAKPOINTS.map((bp) => (
              <tr key={bp.name} className="border-b border-hairline-tertiary">
                <td className="py-sm font-sans text-body-sm text-ink">{bp.name}</td>
                <td className="py-sm font-mono text-mono text-ink-subtle">{bp.width}</td>
                <td className="py-sm font-sans text-body-sm text-ink-subtle">{bp.cols}-up</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SubLabel className="mt-4">Live grid — resize viewport</SubLabel>
      <div className="mt-md grid grid-cols-1 gap-md md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((n) => (
          <div key={n} className="panel-lift rounded-lg bg-surface-1 p-lg text-center">
            <p className="font-sans text-body-sm text-ink">Column {n}</p>
            <p className="mt-xs font-sans text-caption text-ink-subtle">
              1 col · md:2 · lg:3
            </p>
          </div>
        ))}
      </div>

      <SubLabel className="mt-4">Display scale</SubLabel>
      <div className="mt-md panel-lift rounded-lg bg-surface-1 p-lg">
        <p className="font-sans text-display-md font-semibold md:text-display-lg lg:text-display-xl">
          Responsive display
        </p>
        <p className="mt-sm font-sans text-caption text-ink-subtle">
          40px → 56px (md) → 80px (lg)
        </p>
      </div>

      <SubLabel className="mt-4">Touch targets</SubLabel>
      <ul className="mt-md space-y-xs font-sans text-body-sm text-ink-subtle">
        <li>CTAs: min 40px height</li>
        <li>Pricing tabs: min 36px (44px on touch)</li>
        <li>Form inputs: min 44px on touch</li>
      </ul>
    </SectionShell>
  );
}
