'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { check, HEARTS, LEG, points } from '../du-lich/dictation';
import { SpeakButton } from '../du-lich/speak-button';
import { TOPICS } from './data';
import { Button } from './kit';
import { DISPLAY, HANZI } from './theme';

// Cẩm nang của Du lịch Trung Hoa: cách chơi rút từ đúng luật trong du-lich/dictation.ts (số tim, độ
// dài chặng, các cách gõ pinyin được chấm đúng, điểm — các ví dụ điểm gọi chính hàm chấm và hàm tính
// điểm) và toàn bộ từ, câu theo chủ đề kèm pinyin, bấm loa để nghe. Game không có nhân vật.

const nihao = { text: '你好', pron: 'nǐ hǎo', vi: '' };
const plain = points('word', check('ni hao', nihao, 'zh'), false, 0);
const toned = points('word', check('ni3 hao3', nihao, 'zh'), false, 0);
const sentence = points('sentence', { verdict: 'right', tones: false }, false, 0);

function Rule({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-base font-bold">{title}</h3>
      <div className="text-[color:var(--dl-mute)]">{children}</div>
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

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
      <div className="flex flex-col gap-2">
        <h1 ref={heading} tabIndex={-1} className={`${DISPLAY} text-5xl leading-none outline-none`}>
          Cẩm nang
        </h1>
        <p className="text-lg text-[color:var(--dl-mute)]">
          Cách chơi, cách gõ pinyin và toàn bộ từ, câu theo chủ đề.
        </p>
      </div>

      <section aria-labelledby="zh-rules" className="flex flex-col gap-5">
        <h2 id="zh-rules" className={`${DISPLAY} text-2xl`}>
          Cách chơi
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Rule title="Nghe rồi gõ pinyin">
            Máy đọc một từ hoặc một câu tiếng Trung, bạn gõ lại bằng pinyin rồi bấm Enter. Bấm loa
            to để nghe lại, loa nhỏ để nghe chậm. Gõ xong sẽ thấy chữ Hán, pinyin chuẩn và nghĩa.
          </Rule>
          <Rule title="Gõ thế nào cũng được">
            <p>
              “ni hao”, “nihao”, “nǐ hǎo”, “ni3 hao3” đều đúng; ü gõ là v hoặc u (lvyou). Có bộ gõ
              tiếng Trung thì gõ thẳng chữ Hán cũng được.
            </p>
          </Rule>
          <Rule title="Điểm">
            Một từ {plain} điểm, một câu {sentence} điểm. Ghi đúng cả thanh điệu (bằng dấu hoặc số)
            được {toned} thay vì {plain} cho “你好”. Gõ nhầm một chữ là gần đúng, được nửa điểm,
            không mất tim; xem gợi ý nghĩa còn nửa điểm; đúng liên tiếp cộng thêm 2 mỗi câu, tối đa
            +10.
          </Rule>
          <Rule title="Tim và ga">
            Có {HEARTS} tim. Viết sai mất một tim nhưng không lộ đáp án: nghe lại rồi sửa. Bấm
            “Chịu, xem đáp án” để xem đáp án và qua câu (mất một tim nếu câu đó chưa sai lần nào).
            Mỗi {LEG}
            câu tới một ga, được đóng dấu son và hồi một tim. Hết tim là xuống tàu, xem điểm và ôn
            lại câu sai.
          </Rule>
          <Rule title="Không trùng lặp">
            Từ và câu rút từ bộ đã xáo: chưa dùng hết bộ thì không ra lại. Càng đi xa càng nhiều câu
            dài. Điểm chỉ tính trong chuyến đang đi, tải lại trang là chuyến mới.
          </Rule>
          <Rule title="Giọng đọc">
            Giọng phổ thông (giọng nữ đại lục) ghi âm sẵn cho từng từ, từng câu, nên máy nào cũng
            nghe được, kể cả máy không có giọng tiếng Trung. “Tắt hiệu ứng” chỉ tắt tiếng chuông,
            không tắt giọng đọc.
          </Rule>
        </div>
      </section>

      <section aria-labelledby="zh-topics" className="flex flex-col gap-4">
        <h2 id="zh-topics" className={`${DISPLAY} text-2xl`}>
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
        <div className="grid gap-x-8 rounded-[14px] bg-[color:var(--dl-card)] p-5 shadow-[inset_0_0_0_1.5px_var(--dl-line)] sm:grid-cols-2">
          {[topic.words, topic.sentences].map((list, k) => (
            <ul key={k} className="flex flex-col">
              {list.map((it) => (
                <li
                  key={it.text}
                  className="flex min-h-14 items-center gap-3 border-b border-[color:var(--dl-line)] py-1.5"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className={`${HANZI} text-lg`} lang="zh-Hans">
                        {it.text}
                      </span>
                      <span className="text-sm font-semibold">{it.pron}</span>
                    </span>
                    <span className="text-sm text-[color:var(--dl-mute)]">{it.vi}</span>
                  </span>
                  <SpeakButton text={it.text} lang="zh" />
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
