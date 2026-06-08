import type { CardTint } from '../tokens/colors';
import { cn } from '@/lib/utils';

const cardBase = 'panel-lift rounded-lg text-ink transition-colors';

const tintMap: Record<CardTint, string> = {
  'surface-1': 'bg-surface-1 hover:bg-surface-2',
  'surface-2': 'bg-surface-2 hover:bg-surface-3',
  'surface-3': 'bg-surface-3 hover:bg-surface-4',
  'surface-4': 'bg-surface-4',
};

export function CardBase({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(cardBase, 'bg-surface-1 p-lg', className)} {...props}>
      {children}
    </div>
  );
}

export function FeatureCard({
  className,
  tint = 'surface-1',
  icon,
  title,
  description,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  tint?: CardTint;
  icon?: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className={cn(cardBase, 'p-lg', tintMap[tint], className)} {...props}>
      {icon && <div className="mb-md">{icon}</div>}
      <h3 className="font-sans text-card-title">{title}</h3>
      <p className="mt-sm font-sans text-body-sm text-ink-subtle">{description}</p>
    </div>
  );
}

export function FeatureCardYellowBold({
  className,
  title,
  description,
  action,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={cn(cardBase, 'bg-surface-1 p-xxl', className)} {...props}>
      <h2 className="font-sans text-headline font-bold">{title}</h2>
      {description && <p className="mt-md font-sans text-body-lg text-ink-muted">{description}</p>}
      {action && <div className="mt-lg">{action}</div>}
    </div>
  );
}

export function WorkspaceMockupCard({
  className,
  title,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { title?: string }) {
  return (
    <div className={cn('panel-lift rounded-xl bg-surface-1 p-lg text-ink', className)} {...props}>
      {title && <p className="mb-md font-sans text-body-sm text-ink-subtle">{title}</p>}
      {children}
    </div>
  );
}

/** @deprecated Use WorkspaceMockupCard */
export const ProductScreenshotCard = WorkspaceMockupCard;
export const ProductMockupCardDark = WorkspaceMockupCard;

export function PricingTierCard({
  className,
  featured,
  name,
  price,
  features,
  action,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  featured?: boolean;
  name: string;
  price: string;
  features: string[];
  action?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-lg p-lg',
        featured
          ? 'panel-lift border border-hairline-strong bg-surface-2'
          : cn(cardBase, 'bg-surface-1'),
        className,
      )}
      {...props}
    >
      <p className="font-sans text-body-sm font-medium text-ink-subtle">{name}</p>
      <p className="mt-sm font-sans text-headline font-bold">{price}</p>
      <ul className="mt-lg space-y-sm font-sans text-body-sm text-ink-subtle">
        {features.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      {action && <div className="mt-xl">{action}</div>}
    </div>
  );
}

export function TestimonialCard({
  className,
  quote,
  author,
  role,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  quote: string;
  author: string;
  role: string;
}) {
  return (
    <div className={cn(cardBase, 'bg-surface-1 p-xl', className)} {...props}>
      <p className="font-sans text-body-lg">&ldquo;{quote}&rdquo;</p>
      <p className="mt-lg font-sans text-body-sm font-medium">{author}</p>
      <p className="font-sans text-caption text-ink-subtle">{role}</p>
    </div>
  );
}

export function CtaBanner({
  className,
  title,
  description,
  action,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  title: string;
  description?: string;
  action?: React.ReactNode;
  light?: boolean;
}) {
  return (
    <div className={cn(cardBase, 'bg-surface-1 p-xxl text-center', className)} {...props}>
      <h2 className="font-sans text-headline font-bold">{title}</h2>
      {description && <p className="mt-md font-sans text-body-lg text-ink-muted">{description}</p>}
      {action && <div className="mt-lg flex justify-center">{action}</div>}
    </div>
  );
}

/** @deprecated */
export const CalloutCardCoral = CtaBanner;
export const CodeSnippetCard = WorkspaceMockupCard;
export const CodeWindowCard = WorkspaceMockupCard;

export function HeroBandDark({
  className,
  eyebrow,
  title,
  subtitle,
  actions,
  mockup,
  ...props
}: React.HTMLAttributes<HTMLElement> & {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  mockup?: React.ReactNode;
}) {
  return (
    <section
      className={cn('bg-canvas px-md pb-section pt-hero text-center md:px-lg', className)}
      {...props}
    >
      <div className="container-content">
        {eyebrow && <p className="mb-md font-sans text-eyebrow text-ink-muted">{eyebrow}</p>}
        <h1 className="mx-auto max-w-4xl font-sans text-display-md font-bold md:text-display-lg lg:text-display-xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mx-auto mt-lg max-w-xl font-sans text-body-lg text-ink-muted">{subtitle}</p>
        )}
        {actions && (
          <div className="mt-xl flex flex-wrap items-center justify-center gap-md">{actions}</div>
        )}
        {mockup && <div className="mt-section">{mockup}</div>}
      </div>
    </section>
  );
}
