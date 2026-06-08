'use client';

import { forwardRef, useState } from 'react';
import { cn } from '@/lib/utils';

const inputClassName = cn(
  'h-11 w-full rounded-md border border-hairline bg-surface-1 px-sm py-xs',
  'font-sans text-body text-ink placeholder:text-ink-tertiary',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-focus/50',
);

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}

export type PasswordInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  showPasswordLabel?: string;
  hidePasswordLabel?: string;
};

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(
    {
      className,
      showPasswordLabel = 'Show password',
      hidePasswordLabel = 'Hide password',
      ...props
    },
    ref,
  ) {
    const [visible, setVisible] = useState(false);

    return (
      <div className="relative">
        <input
          ref={ref}
          type={visible ? 'text' : 'password'}
          className={cn(inputClassName, 'pr-10', className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          className={cn(
            'absolute right-xs top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-sm',
            'text-ink-muted transition-colors hover:text-ink',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-focus/50',
          )}
          aria-label={visible ? hidePasswordLabel : showPasswordLabel}
          aria-pressed={visible}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    );
  },
);

export function TextInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClassName, className)} {...props} />;
}

export function SearchPill({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClassName, className)} {...props} />;
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={cn('h-1 w-full overflow-hidden rounded-pill bg-surface-3', className)}>
      <div
        className="h-full rounded-pill bg-primary transition-all duration-300"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
