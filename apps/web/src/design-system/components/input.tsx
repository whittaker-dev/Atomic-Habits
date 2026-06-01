import { cn } from '@/lib/utils';

export function TextInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-11 w-full rounded-md border border-hairline bg-surface-1 px-sm py-xs',
        'font-sans text-body text-ink placeholder:text-ink-tertiary',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-focus/50',
        className,
      )}
      {...props}
    />
  );
}

export function SearchPill({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-11 w-full rounded-md border border-hairline bg-surface-1 px-sm py-xs',
        'font-sans text-body text-ink placeholder:text-ink-tertiary',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-focus/50',
        className,
      )}
      {...props}
    />
  );
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
