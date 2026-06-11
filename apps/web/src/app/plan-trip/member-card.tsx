'use client';

import { BadgeTag } from '@/design-system/components/badges';
import { cn } from '@/lib/utils';
import type { TripMember } from './trip-plan-types';

const BANNER_GRADIENTS = [
  'from-[#1ed760] via-[#14b8a6] to-[#0ea5e9]',
  'from-[#22c55e] via-[#10b981] to-[#06b6d4]',
  'from-[#4ade80] via-[#2dd4bf] to-[#38bdf8]',
  'from-[#86efac] via-[#34d399] to-[#2dd4bf]',
] as const;

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function hashName(name: string) {
  return name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

type MemberCardProps = {
  member: TripMember;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  editLabel: string;
  deleteLabel: string;
  crewLabel: string;
};

export function MemberCard({
  member,
  index,
  onEdit,
  onDelete,
  editLabel,
  deleteLabel,
  crewLabel,
}: MemberCardProps) {
  const gradient = BANNER_GRADIENTS[hashName(member.name) % BANNER_GRADIENTS.length];

  return (
    <article className="group relative overflow-hidden rounded-xl border border-hairline/80 bg-surface-1 shadow-[0_4px_16px_rgba(30,215,96,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_8px_24px_rgba(30,215,96,0.12)] sm:rounded-2xl">
      <div
        className={cn(
          'relative h-14 bg-gradient-to-br px-xs pt-xs sm:h-20 sm:px-md sm:pt-md md:h-24 md:px-lg md:pt-lg',
          gradient,
        )}
      >
        <div className="pointer-events-none absolute -right-4 -top-4 h-14 w-14 rounded-full bg-white/20 blur-xl sm:h-20 sm:w-20" />

        <div className="relative flex items-start justify-between gap-1">
          <span className="max-w-[calc(100%-3.5rem)] truncate rounded-pill bg-black/15 px-sm py-0.5 font-sans text-caption font-medium text-white/95 backdrop-blur-sm">
            #{index + 1}
          </span>
          <div className="flex shrink-0 gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
            <button
              type="button"
              onClick={onEdit}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-ink-subtle shadow-sm transition-colors hover:bg-white hover:text-ink sm:h-7 sm:w-7"
              aria-label={editLabel}
            >
              <PencilIcon />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-ink-subtle shadow-sm transition-colors hover:bg-white hover:text-error sm:h-7 sm:w-7"
              aria-label={deleteLabel}
            >
              <TrashIcon />
            </button>
          </div>
        </div>
      </div>

      <div className="relative px-xs pb-xs sm:px-md sm:pb-md md:px-lg md:pb-lg">
        <div
          className="absolute -top-5 left-sm flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-emerald-400 font-sans text-body font-bold text-on-primary shadow-[0_4px_12px_rgba(30,215,96,0.3)] ring-2 ring-surface-1 sm:-top-7 sm:left-md sm:h-12 sm:w-12 sm:rounded-2xl md:-top-8 md:h-14 md:w-14 md:text-headline md:ring-4"
          aria-hidden
        >
          {getInitials(member.name)}
        </div>

        <div className="pt-6 sm:pt-8 md:pt-10">
          <h3 className="truncate font-sans text-body font-bold tracking-tight md:text-headline">
            {member.name}
          </h3>
          {member.role ? (
            <BadgeTag
              variant="success"
              className="mt-sm max-w-full truncate bg-primary/10 text-primary"
            >
              {member.role}
            </BadgeTag>
          ) : (
            <p className="mt-sm truncate font-sans text-caption text-ink-tertiary">{crewLabel}</p>
          )}
        </div>

        {(member.phone || member.note) && (
          <div className="mt-sm space-y-1 rounded-lg border border-hairline/80 bg-surface-2/50 p-2 sm:mt-md sm:space-y-sm sm:rounded-xl sm:p-md">
            {member.phone && (
              <p className="flex items-center gap-sm font-sans text-body-sm text-ink">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </span>
                <span className="truncate">{member.phone}</span>
              </p>
            )}
            {member.note && (
              <p className="line-clamp-2 flex items-start gap-sm font-sans text-body-sm text-ink-subtle">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-caption">
                  ✦
                </span>
                <span>{member.note}</span>
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
