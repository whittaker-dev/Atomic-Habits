'use client';

import { useState } from 'react';
import type { Listing, ListingKind } from '@/lib/trend-radar/wikivoyage';
import { cn } from '@/lib/utils';
import { FOCUS, LoadMoreButton, SourceNotice, Tabs } from './ui';

// Danh sách ăn, chơi, ngủ từ Wikivoyage, chia theo tab. Mục có giá được đưa lên trước vì giá là thứ người xem cần.

const GROUPS = [
  { id: 'play', label: 'Tham quan, vui chơi', kinds: ['see', 'do'] },
  { id: 'eat', label: 'Ăn uống', kinds: ['eat', 'drink'] },
  { id: 'sleep', label: 'Chỗ ở', kinds: ['sleep'] },
] as const satisfies readonly { id: string; label: string; kinds: readonly ListingKind[] }[];

type GroupId = (typeof GROUPS)[number]['id'];

const PAGE = 8;

export function GuideList({ listings }: { listings: Listing[] }) {
  const counts = Object.fromEntries(
    GROUPS.map((g) => [
      g.id,
      listings.filter((l) => (g.kinds as readonly string[]).includes(l.kind)).length,
    ]),
  ) as Record<GroupId, number>;
  // Mở tab đầu tiên có mục, để nơi chỉ có chỗ ở không mở ra một tab rỗng.
  const [group, setGroup] = useState<GroupId>(GROUPS.find((g) => counts[g.id] > 0)?.id ?? 'play');
  const [limit, setLimit] = useState(PAGE);

  const kinds = GROUPS.find((g) => g.id === group)?.kinds as readonly string[];
  const items = listings
    .filter((l) => kinds.includes(l.kind))
    .sort((a, b) => Number(Boolean(b.price)) - Number(Boolean(a.price)));

  return (
    <>
      <Tabs
        label="Loại địa điểm"
        tabs={GROUPS.map((g) => ({ id: g.id, label: `${g.label} (${counts[g.id]})` }))}
        value={group}
        onChange={(id) => {
          setGroup(id);
          setLimit(PAGE);
        }}
      />
      {items.length === 0 ? (
        <div className="pt-2">
          <SourceNotice>Wikivoyage chưa có mục nào loại này cho nơi này.</SourceNotice>
        </div>
      ) : (
        <div role="tabpanel">
          <ul className="-mx-1 divide-y divide-[color:var(--tr-line)]">
            {items.slice(0, limit).map((l) => (
              <li key={`${l.kind}|${l.name}`} className="px-1 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold leading-snug text-[color:var(--tr-ink)]">
                      {l.url ? (
                        <a
                          href={l.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            'rounded hover:text-[color:var(--tr-blue-deep)] hover:underline',
                            FOCUS,
                          )}
                        >
                          {l.name}
                        </a>
                      ) : (
                        l.name
                      )}
                      {l.alt && (
                        <span className="ml-1.5 text-[13px] font-normal text-[color:var(--tr-ink-faint)]">
                          {l.alt}
                        </span>
                      )}
                    </p>
                    {(l.address || l.hours) && (
                      <p className="mt-0.5 text-[12.5px] text-[color:var(--tr-ink-faint)]">
                        {[l.address, l.hours && `Mở cửa ${l.hours}`].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  {l.updated && (
                    <span className="shrink-0 text-[11.5px] tabular-nums text-[color:var(--tr-ink-faint)]">
                      cập nhật {l.updated.slice(0, 4)}
                    </span>
                  )}
                </div>
                {l.price && (
                  <p className="mt-1.5 inline-block rounded-md bg-[color:var(--tr-blue-wash)] px-2 py-0.5 text-[13px] font-medium text-[color:var(--tr-blue-deep)]">
                    Giá: {l.price}
                  </p>
                )}
                {l.description && (
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-[color:var(--tr-ink-soft)]">
                    {l.description}
                  </p>
                )}
              </li>
            ))}
          </ul>
          {items.length > limit && (
            <LoadMoreButton
              remaining={Math.min(PAGE, items.length - limit)}
              onClick={() => setLimit(limit + PAGE)}
            />
          )}
        </div>
      )}
    </>
  );
}
