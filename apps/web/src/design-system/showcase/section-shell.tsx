import { cn } from '@/lib/utils';

export function SectionShell({
  id,
  title,
  description,
  children,
  className,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn('scroll-mt-24 border-t border-hairline py-section', className)}>
      <h2 className="font-sans text-headline font-semibold">{title}</h2>
      {description && (
        <p className="mt-sm max-w-2xl font-sans text-body-sm text-ink-subtle">{description}</p>
      )}
      <div className="mt-lg">{children}</div>
    </section>
  );
}

export function SubLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("mb-sm font-sans text-caption font-medium uppercase tracking-[0.4px] text-ink-tertiary", className)}>
      {children}
    </p>
  );
}
