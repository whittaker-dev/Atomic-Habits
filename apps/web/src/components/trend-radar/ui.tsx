// Biểu tượng và khối dựng dùng chung của /trend-radar.

import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const FOCUS =
  'outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--tr-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-white';

function Stroke({ children, className = 'h-5 w-5' }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export const IconHome = () => (
  <Stroke>
    <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />
  </Stroke>
);
export const IconGlobe = () => (
  <Stroke>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.4 2.5 3.5 5.3 3.5 8.5s-1.1 6-3.5 8.5c-2.4-2.5-3.5-5.3-3.5-8.5s1.1-6 3.5-8.5z" />
  </Stroke>
);
export const IconTrend = ({ className }: { className?: string }) => (
  <Stroke className={className}>
    <path d="M3.5 17.5 9.5 11l4 4 7-8" />
    <path d="M15.5 7h5v5" />
  </Stroke>
);
export const IconSearch = ({ className }: { className?: string }) => (
  <Stroke className={className}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </Stroke>
);
export const IconClose = () => (
  <Stroke className="h-4 w-4">
    <path d="M6 6l12 12M18 6 6 18" />
  </Stroke>
);
export const IconArrow = () => (
  <Stroke className="h-4 w-4">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Stroke>
);
export const IconClock = () => (
  <Stroke className="h-3.5 w-3.5">
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Stroke>
);
export const IconBack = () => (
  <Stroke>
    <path d="M10 6 4 12l6 6M4 12h16" />
  </Stroke>
);
export const IconGamepad = () => (
  <Stroke>
    <path d="M7.5 7h9a4.5 4.5 0 0 1 4.4 5.4l-.9 4.3a2.3 2.3 0 0 1-3.9 1.1L14 15.5h-4l-2.1 2.3a2.3 2.3 0 0 1-3.9-1.1l-.9-4.3A4.5 4.5 0 0 1 7.5 7z" />
    <path d="M8 10v3M6.5 11.5h3M15.5 11h.01M17.5 12.5h.01" />
  </Stroke>
);
export const IconBulb = () => (
  <Stroke className="h-6 w-6">
    <path d="M9 17.5h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1.1 1.3 1.1 2.2v1.5h5V16c0-.9.5-1.7 1.1-2.2A6 6 0 0 0 12 3z" />
  </Stroke>
);

/** Cờ Việt Nam vẽ tay: nền đỏ, sao vàng năm cánh. */
export const FlagVN = () => (
  <svg viewBox="0 0 30 20" className="h-[14px] w-[21px] rounded-[2px]" aria-hidden>
    <rect width="30" height="20" fill="#da251d" />
    <path
      fill="#ffcd00"
      d="M15 4.2l1.35 4.15h4.36l-3.53 2.56 1.35 4.15L15 12.5l-3.53 2.56 1.35-4.15-3.53-2.56h4.36z"
    />
  </svg>
);

export const IconVideo = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
    <rect x="2" y="5" width="20" height="14" rx="4" fill="var(--tr-red)" />
    <path d="M10 9v6l5-3z" fill="#fff" />
  </svg>
);

export const Logo = () => (
  <svg viewBox="0 0 40 40" className="h-10 w-10" aria-hidden>
    <path
      d="M5 29 15 18.5l6.5 6.5L34 11.5"
      fill="none"
      stroke="var(--tr-blue)"
      strokeWidth="4.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M26 10.5h9v9"
      fill="none"
      stroke="var(--tr-blue)"
      strokeWidth="4.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function Panel({
  id,
  title,
  icon,
  action,
  children,
  className,
}: {
  id: string;
  title: string;
  icon: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn(
        'min-w-0 rounded-2xl border border-[color:var(--tr-line)] bg-white p-4 shadow-[0_1px_2px_rgba(14,26,51,0.04),0_6px_20px_-8px_rgba(14,26,51,0.08)] sm:p-5',
        className,
      )}
    >
      <header className="mb-3 flex items-center gap-2.5">
        <span className="grid h-6 w-6 shrink-0 place-items-center text-[color:var(--tr-blue)]">
          {icon}
        </span>
        <h2
          id={`${id}-title`}
          className="flex-1 text-[17px] font-semibold leading-tight tracking-[-0.01em] text-[color:var(--tr-ink)]"
        >
          {title}
        </h2>
        {action}
      </header>
      {children}
    </section>
  );
}

/** Liên kết "Xem thêm" ở góc khối trên trang tổng hợp, dẫn sang trang riêng của mục đó. */
export function SeeAllLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        'flex items-center gap-1 rounded-md px-1.5 py-1 text-[13px] font-medium text-[color:var(--tr-blue)] transition-colors hover:bg-[color:var(--tr-blue-wash)]',
        FOCUS,
      )}
    >
      Xem thêm
      <IconArrow />
    </Link>
  );
}

/** Nút tải thêm ở cuối danh sách trên trang riêng. */
export function LoadMoreButton({ remaining, onClick }: { remaining: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'mx-auto mt-4 flex h-10 items-center rounded-xl border border-[color:var(--tr-line-strong)] bg-white px-5 text-[14px] font-medium text-[color:var(--tr-ink)] transition-colors hover:border-[color:var(--tr-blue)] hover:text-[color:var(--tr-blue-deep)]',
        FOCUS,
      )}
    >
      Xem thêm {remaining} mục
    </button>
  );
}

export function PageHeader({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: ReactNode;
}) {
  return (
    <header className="mb-4 mt-5 flex items-start gap-3 lg:mb-5 lg:mt-7">
      <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center text-[color:var(--tr-blue)]">
        {icon}
      </span>
      <div>
        <h1 className="text-[26px] font-bold leading-tight tracking-[-0.025em] text-[color:var(--tr-ink)] sm:text-[30px]">
          {title}
        </h1>
        <p className="mt-1 text-[14px] text-[color:var(--tr-ink-soft)]">{description}</p>
      </div>
    </header>
  );
}

export function Tabs<T extends string>({
  label,
  tabs,
  value,
  onChange,
}: {
  label: string;
  tabs: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="-mx-1 mb-1 flex gap-1 overflow-x-auto border-b border-[color:var(--tr-line)] px-1 [scrollbar-width:none]"
    >
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={cn(
              'relative shrink-0 whitespace-nowrap rounded-t-md px-2.5 pb-2.5 pt-1 text-[13px] font-medium transition-colors',
              active
                ? 'text-[color:var(--tr-blue)] after:absolute after:inset-x-2 after:-bottom-px after:h-[2px] after:rounded-full after:bg-[color:var(--tr-blue)]'
                : 'text-[color:var(--tr-ink-soft)] hover:text-[color:var(--tr-ink)]',
              FOCUS,
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/** Ô báo khi một nguồn không có dữ liệu, thay cho khoảng trống im lặng. */
export function SourceNotice({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-[color:var(--tr-line-strong)] bg-[color:var(--tr-ground)] px-4 py-6 text-center text-[13.5px] leading-relaxed text-[color:var(--tr-ink-soft)]">
      {children}
    </div>
  );
}
