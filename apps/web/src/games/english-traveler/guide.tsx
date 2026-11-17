'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { check, HEARTS, LEG, legPlan, points } from '../du-lich/dictation';
import { SpeakButton } from '../du-lich/speak-button';
import { TOPICS } from './data';
import { Button } from './kit';
import { DISPLAY } from './theme';

// Cẩm nang của English Traveler: cách chơi rút từ đúng luật trong du-lich/dictation.ts (số tim, độ
// dài chặng, cách chấm, cách tính điểm — các ví dụ điểm gọi chính hàm chấm và hàm tính điểm) và toàn
// bộ từ, câu theo từng chủ đề, bấm loa để nghe. Game không có nhân vật.

const sample = { text: "I don't eat beef.", vi: '' };
const word = points('word', { verdict: 'right', tones: false }, false, 0);
const sentence = points('sentence', { verdict: 'right', tones: false }, false, 0);
const close = points('word', check('pasport', { text: 'passport', vi: '' }, 'en'), false, 0);

function Rule({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-base font-bold">{title}</h3>
      <p className="text-[color:var(--dl-mute)]">{children}</p>
    </div>
  );
}

export function Guide({ onBack }: { onBack: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [open, setOpen] = useState(0);
  useEffect(() => {
    window.scrollTo(0, 0);
    heading.current?.focus();
  }, []);
  const topic = TOPICS[open]!;
  const firstSentences = legPlan(0).filter((k) => k === 'sentence').length;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
      <div className="flex flex-col gap-2">
        <h1 ref={heading} tabIndex={-1} className={`${DISPLAY} text-5xl leading-none outline-none`}>
          Cẩm nang
        </h1>
        <p className="text-lg text-[color:var(--dl-mute)]">
          Cách chơi và toàn bộ từ, câu theo chủ đề.
        </p>
      </div>

      <section aria-labelledby="et-rules" className="flex flex-col gap-5">
        <h2 id="et-rules" className={`${DISPLAY} text-2xl`}>
          Cách chơi
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Rule title="Nghe rồi viết">
            Máy đọc một từ hoặc một câu tiếng Anh, bạn gõ lại rồi bấm Enter (hoặc Kiểm tra). Bấm loa
            to để nghe lại, loa nhỏ để nghe chậm, bao nhiêu lần cũng được.
          </Rule>
          <Rule title="Chặng bay">
            Mỗi {LEG} câu là một chặng; tới nơi được đóng dấu hộ chiếu và bay tiếp, đi hết lộ trình
            thì vòng lại. Chặng đầu có {firstSentences} câu dài, càng bay xa càng nhiều câu dài.
          </Rule>
          <Rule title="Tim">
            Có {HEARTS} tim. Viết sai hoặc bấm “Chịu, xem đáp án” mất một tim; mỗi lần tới nơi được
            hồi một tim. Hết tim là hạ cánh, xem điểm và ôn lại những câu đã sai.
          </Rule>
          <Rule title="Điểm">
            Một từ {word} điểm, một câu {sentence} điểm. Gõ nhầm một chữ (như “pasport”) là gần
            đúng, được {close} điểm và không mất tim. Xem gợi ý nghĩa thì còn nửa điểm. Đúng liên
            tiếp được cộng thêm 2 điểm mỗi câu, tối đa +10.
          </Rule>
          <Rule title="Viết thế nào cũng đúng">
            Không tính hoa thường, dấu câu; viết tắt và viết đủ như nhau (“{sample.text}” hay “I do
            not eat beef”), số viết bằng chữ số cũng được (“gate 5”).
          </Rule>
          <Rule title="Không trùng lặp">
            Từ và câu rút từ bộ đã xáo: chưa dùng hết bộ thì không ra lại. Điểm chỉ tính trong
            chuyến đang bay, tải lại trang là chuyến mới.
          </Rule>
        </div>
        <p className="text-sm text-[color:var(--dl-mute)]">
          Giọng đọc là giọng tiếng Anh–Mỹ ghi âm sẵn cho từng từ, từng câu, nên máy nào cũng nghe
          giống nhau. “Tắt hiệu ứng” chỉ tắt tiếng chuông, không tắt giọng đọc.
        </p>
      </section>

      <section aria-labelledby="et-topics" className="flex flex-col gap-4">
        <h2 id="et-topics" className={`${DISPLAY} text-2xl`}>
          Từ và câu theo chủ đề
        </h2>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Chọn chủ đề">
          {TOPICS.map((t, i) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={open === i}
              onClick={() => setOpen(i)}
              className={`min-h-11 rounded-full px-4 text-[0.95rem] font-semibold ${
                open === i
                  ? 'bg-[color:var(--dl-accent)] text-white'
                  : 'bg-[color:var(--dl-tile)] shadow-[inset_0_0_0_1.5px_var(--dl-line)] hover:bg-white'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
        <div className="grid gap-x-8 rounded-[18px] bg-[color:var(--dl-card)] p-5 shadow-[inset_0_0_0_1.5px_var(--dl-line)] sm:grid-cols-2">
          {[topic.words, topic.sentences].map((list, k) => (
            <ul key={k} className="flex flex-col">
              {list.map((it) => (
                <li
                  key={it.text}
                  className="flex min-h-12 items-center gap-3 border-b border-[color:var(--dl-line)] py-1.5"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-bold [font-family:var(--dl-target)]">{it.text}</span>
                    <span className="text-sm text-[color:var(--dl-mute)]">{it.vi}</span>
                  </span>
                  <SpeakButton text={it.text} lang="en" />
                </li>
              ))}
            </ul>
          ))}
        </div>
      </section>

      <Button className="self-start" onClick={onBack}>
        Về màn chính
      </Button>
    </div>
  );
}
