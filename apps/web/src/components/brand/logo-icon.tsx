import { cn } from '@/lib/utils';

const SIZE_MAP = {
  sm: 24,
  md: 28,
  lg: 36,
} as const;

/** Linear-style 3-bar mark — flat green, no gradients (reads at 16px) */
const LOGO_MARK = (
  <>
    <rect width="32" height="32" rx="9" fill="#121212" />
    <rect
      x="8"
      y="8.4"
      width="15"
      height="3.2"
      rx="1.6"
      fill="#1ed760"
      transform="rotate(24 15.5 10)"
    />
    <rect
      x="8"
      y="14.4"
      width="15"
      height="3.2"
      rx="1.6"
      fill="#1ed760"
      transform="rotate(24 15.5 16)"
    />
    <rect
      x="8"
      y="20.4"
      width="15"
      height="3.2"
      rx="1.6"
      fill="#1ed760"
      transform="rotate(24 15.5 22)"
    />
  </>
);

type LogoIconProps = {
  size?: number | keyof typeof SIZE_MAP;
  className?: string;
};

export function LogoIcon({ size = 'md', className }: LogoIconProps) {
  const px = typeof size === 'number' ? size : SIZE_MAP[size];

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-hidden
    >
      {LOGO_MARK}
    </svg>
  );
}
