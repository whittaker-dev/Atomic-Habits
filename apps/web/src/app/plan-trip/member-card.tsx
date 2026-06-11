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
      width="15"
      height="15"
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
      width="15"
      height="15"
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
    <article className="group relative overflow-hidden rounded-2xl border border-hairline/80 bg-surface-1 shadow-[0_8px_30px_rgba(30,215,96,0.08)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_16px_40px_rgba(30,215,96,0.16)]">
      <div className={cn('relative h-28 bg-gradient-to-br px-lg pt-lg', gradient)}>
        <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 left-1/3 h-20 w-20 rounded-full bg-white/15 blur-xl" />

        <div className="relative flex items-start justify-between">
          <span className="rounded-pill bg-black/15 px-sm py-0.5 font-sans text-caption font-medium text-white/95 backdrop-blur-sm">
            {crewLabel} #{index + 1}
          </span>
          <div className="flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
            <button
              type="button"
              onClick={onEdit}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-ink-subtle shadow-sm transition-colors hover:bg-white hover:text-ink"
              aria-label={editLabel}
            >
              <PencilIcon />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-ink-subtle shadow-sm transition-colors hover:bg-white hover:text-error"
              aria-label={deleteLabel}
            >
              <TrashIcon />
            </button>
          </div>
        </div>
      </div>

      <div className="relative px-lg pb-lg">
        <div
          className="absolute -top-10 left-lg flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-emerald-400 font-sans text-headline font-bold text-on-primary shadow-[0_8px_24px_rgba(30,215,96,0.35)] ring-4 ring-surface-1"
          aria-hidden
        >
          {getInitials(member.name)}
        </div>

        <div className="pt-12">
          <h3 className="truncate font-sans text-headline font-bold tracking-tight">
            {member.name}
          </h3>
          {member.role ? (
            <BadgeTag variant="success" className="mt-sm bg-primary/10 text-primary">
              {member.role}
            </BadgeTag>
          ) : (
            <p className="mt-sm font-sans text-caption text-ink-tertiary">{crewLabel}</p>
          )}
        </div>

        {(member.phone || member.note) && (
          <div className="mt-lg space-y-sm rounded-xl border border-hairline/80 bg-surface-2/50 p-md">
            {member.phone && (
              <p className="flex items-center gap-sm font-sans text-body-sm text-ink">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
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
              <p className="flex items-start gap-sm font-sans text-body-sm text-ink-subtle">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-caption">
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
