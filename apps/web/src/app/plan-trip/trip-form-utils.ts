import { cn } from '@/lib/utils';

export const textareaClassName = cn(
  'min-h-[96px] w-full resize-y rounded-md border border-hairline bg-surface-1 px-sm py-xs',
  'font-sans text-body text-ink placeholder:text-ink-tertiary',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-focus/50',
);

export function linesToArray(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function arrayToLines(values: string[]) {
  return values.join('\n');
}
