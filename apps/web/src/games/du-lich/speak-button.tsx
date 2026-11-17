'use client';

import type { Lang } from './dictation';
import { IconSpeaker } from './icons';
import { speak } from './speech';

/** Nút loa nhỏ đọc một từ/câu (sổ ôn tập, Cẩm nang). */
export function SpeakButton({ text, lang }: { text: string; lang: Lang }) {
  return (
    <button
      type="button"
      onClick={() => speak(text, lang)}
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--dl-tile)] text-[color:var(--dl-ink)] shadow-[inset_0_0_0_1.5px_var(--dl-line)] active:scale-95"
      aria-label={`Nghe: ${text}`}
    >
      <IconSpeaker className="h-5 w-5" />
    </button>
  );
}
