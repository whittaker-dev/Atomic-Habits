import { cn } from '@/lib/utils';

export function StatusBadge({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill bg-surface-2 px-2 py-0.5 font-sans text-caption text-ink-muted',
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function SuccessBadge({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill bg-surface-2 px-2 py-0.5 font-sans text-caption text-success',
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/** @deprecated use StatusBadge or SuccessBadge */
export const BadgeGreen = SuccessBadge;
export const BadgePurple = StatusBadge;

export function BadgeTag({
  className,
  variant = 'default',
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: 'default' | 'success';
}) {
  const styles = {
    default: 'bg-surface-2 text-ink-muted',
    success: 'bg-surface-2 text-success',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-xs px-2 py-0.5 font-sans text-caption',
        styles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function PillTab({
  active,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        'min-h-9 rounded-pill px-[14px] py-1.5 font-sans text-body-sm transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-focus/50',
        active ? 'bg-surface-2 font-medium text-ink' : 'bg-canvas text-ink-subtle hover:text-ink',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Eyebrow({ className, children, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn('font-sans text-eyebrow text-ink-muted', className)} {...props}>
      {children}
    </span>
  );
}

export function PromoBanner({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'border-b border-hairline bg-canvas px-md py-sm text-center font-sans text-caption text-ink-subtle',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** Legacy aliases */
export const BadgePill = BadgeTag;
export const BadgeCoral = SuccessBadge;
export const PricingTab = PillTab;
export const CategoryTab = PillTab;
