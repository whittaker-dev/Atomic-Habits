'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

type AccommodationGalleryProps = {
  images: string[];
  name: string;
};

export function AccommodationGallery({ images, name }: AccommodationGalleryProps) {
  const { t } = useTranslation();
  const validImages = images.filter(Boolean);
  const [activeIndex, setActiveIndex] = useState(0);

  if (validImages.length === 0) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center rounded-lg border border-dashed border-hairline bg-surface-2/60">
        <p className="font-sans text-body-sm text-ink-subtle">{t('planTrip.villa.noImages')}</p>
      </div>
    );
  }

  const safeIndex = Math.min(activeIndex, validImages.length - 1);
  const activeImage = validImages[safeIndex]!;

  return (
    <div className="space-y-sm sm:space-y-md">
      <div className="relative aspect-[5/3] overflow-hidden rounded-lg border border-hairline bg-surface-2 sm:aspect-[16/10]">
        <Image
          src={activeImage}
          alt={`${name} — ${t('planTrip.villa.galleryAlt', { index: activeIndex + 1 })}`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 720px"
          unoptimized
        />
      </div>

      {validImages.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 sm:gap-sm sm:pb-xs">
          {validImages.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={t('planTrip.villa.galleryAlt', { index: index + 1 })}
              className={cn(
                'relative h-12 w-[4.25rem] shrink-0 overflow-hidden rounded-md border transition-colors sm:h-16 sm:w-24',
                activeIndex === index
                  ? 'border-primary ring-2 ring-primary/30'
                  : 'border-hairline hover:border-hairline-strong',
              )}
            >
              <Image src={image} alt="" fill className="object-cover" sizes="96px" unoptimized />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
