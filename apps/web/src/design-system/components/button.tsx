import { cn } from '@/lib/utils';

const base =
  'inline-flex min-h-10 items-center justify-center font-sans text-button font-medium transition-colors focus-visible:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-focus/50 disabled:pointer-events-none disabled:opacity-50';

const variants = {
  primary: cn(
    base,
    'rounded-md bg-primary px-[14px] py-xs text-on-primary',
    'hover:bg-primary-hover active:bg-primary-focus',
  ),
  secondary: cn(
    base,
    'panel-lift rounded-md bg-surface-1 px-[14px] py-xs text-ink',
    'hover:bg-surface-2 active:bg-surface-3',
  ),
  tertiary: cn(
    base,
    'rounded-md bg-canvas px-[14px] py-xs text-ink',
    'hover:bg-surface-1 active:bg-surface-2',
  ),
  inverse: cn(
    base,
    'rounded-md bg-inverse-canvas px-[14px] py-xs text-inverse-ink',
    'hover:bg-inverse-surface-1 active:bg-inverse-surface-2',
  ),
  ghost: cn(base, 'rounded-md bg-transparent px-[14px] py-xs text-ink-subtle hover:text-ink'),
  link: cn(
    'inline font-sans text-button font-medium text-primary hover:text-primary-hover',
  ),
  'text-link': cn(
    'inline font-sans text-body-sm text-ink-subtle hover:text-ink',
  ),
  /* Legacy aliases */
  dark: cn(base, 'panel-lift rounded-md bg-surface-1 px-[14px] py-xs text-ink hover:bg-surface-2'),
  'on-dark': cn(
    base,
    'rounded-md bg-inverse-canvas px-[14px] py-xs text-inverse-ink hover:bg-inverse-surface-1',
  ),
  'secondary-on-dark': cn(
    base,
    'panel-lift rounded-md bg-surface-1 px-[14px] py-xs text-ink hover:bg-surface-2',
  ),
  'pill-dark': cn(base, 'panel-lift rounded-md bg-surface-1 px-[14px] py-xs text-ink hover:bg-surface-2'),
  'pill-outlined': cn(
    base,
    'panel-lift rounded-md bg-surface-1 px-[14px] py-xs text-ink hover:bg-surface-2',
  ),
  'pill-dark-lg': cn(base, 'panel-lift rounded-md bg-surface-1 px-[14px] py-xs text-ink hover:bg-surface-2'),
  'pill-light': cn(
    base,
    'rounded-md bg-inverse-canvas px-[14px] py-xs text-inverse-ink hover:bg-inverse-surface-1',
  ),
  play: cn(base, 'rounded-md bg-primary p-sm text-on-primary hover:bg-primary-hover'),
  'play-dark': cn(base, 'panel-lift rounded-md bg-surface-1 p-sm text-ink hover:bg-surface-2'),
  'icon-circular': cn(
    'inline-flex h-10 w-10 items-center justify-center rounded-md bg-surface-1 text-ink panel-lift',
    'hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-focus/50',
  ),
} as const;

export type ButtonVariant = keyof typeof variants;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = 'primary', className, children, ...props }: ButtonProps) {
  return (
    <button type="button" className={cn(variants[variant], className)} {...props}>
      {children}
    </button>
  );
}

export function TextLink({
  className,
  children,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a className={cn(variants.link, className)} {...props}>
      {children}
    </a>
  );
}
