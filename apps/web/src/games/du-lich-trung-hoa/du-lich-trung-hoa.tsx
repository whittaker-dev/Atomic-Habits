'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { loadMuted, setMuted, sfx, unlockAudio } from '../du-lich/audio';
import { Run, RUN_CSS, type Summary } from '../du-lich/run';
import { primeSpeech } from '../du-lich/speech';
import { Guide } from './guide';
import { Arrival, ALL, HomeScreen, LegLabel, OverScreen, topicsFor } from './screens';
import { Splash } from './splash';
import { FONT_URL, VARS } from './theme';

// Khung của Du lịch Trung Hoa: màn chính (vé tàu + chủ đề), Cẩm nang, một chuyến tàu nghe-viết (màn
// chơi chung với English Traveler) và màn hết chuyến. Điểm chỉ sống trong chuyến đang đi: không lưu gì
// lên máy, tải lại trang là chuyến mới (chủ ý của chủ game).

// Bề mặt trình duyệt; mực son loang bằng mặt nạ nhiễu; con dấu nện xuống ở màn tới ga. Tắt hoạt ảnh
// khi người dùng giảm chuyển động.
const NOISE =
  "url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='7'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -2.2 0 0 0 2.05'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";
const CSS = `
.zh-root ::selection{background:#c23a22;color:#fbf7ee}
.zh-root{caret-color:#c23a22;scrollbar-color:#dccdb4 #f3ecdf}
.zh-root :is(h1,h2,h3){color:inherit;letter-spacing:inherit}
.zh-root :focus-visible{outline:3px solid #1f6b5c;outline-offset:2px}
.zh-ink{-webkit-mask-image:${NOISE};mask-image:${NOISE}}
@keyframes zh-stamp{0%{transform:scale(1.8) rotate(10deg);opacity:0;filter:blur(3px)}55%{transform:scale(.95);opacity:1;filter:none}75%{transform:scale(1.03)}100%{transform:none}}
.zh-stamp{animation:zh-stamp .55s cubic-bezier(.2,.9,.25,1) both}
@media (prefers-reduced-motion:reduce){.zh-stamp{animation:none}}
${RUN_CSS}
`;

type View =
  | { kind: 'home' }
  | { kind: 'guide' }
  | { kind: 'play'; key: number }
  | { kind: 'over'; summary: Summary };

export function DuLichTrungHoa() {
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<View>({ kind: 'home' });
  const [topic, setTopic] = useState(ALL);
  const [muted, setMute] = useState(false);

  useEffect(() => setMute(loadMuted()), []);

  const board = () => {
    unlockAudio();
    primeSpeech();
    sfx.depart();
    setView({ kind: 'play', key: Date.now() });
    window.scrollTo(0, 0);
  };

  return (
    <div
      style={VARS}
      className="zh-root relative min-h-dvh bg-[color:var(--dl-ground)] font-['Lexend',system-ui,sans-serif] text-[16px] text-[color:var(--dl-ink)]"
    >
      <link rel="stylesheet" href={FONT_URL} precedence="default" />
      <style href="zh-styles" precedence="default">
        {CSS}
      </style>
      <div aria-hidden className="h-1.5 bg-[color:var(--dl-seal)]" />

      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 pt-3 pb-14 sm:px-6">
        {view.kind !== 'play' && (
          <nav className="flex min-h-11 items-center">
            {view.kind === 'home' ? (
              <Link
                href="/games"
                className="-ml-2 flex min-h-11 items-center px-2 text-sm font-semibold text-[color:var(--dl-mute)] hover:text-[color:var(--dl-ink)]"
              >
                ‹ Games
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setView({ kind: 'home' })}
                className="-ml-2 flex min-h-11 items-center px-2 text-sm font-semibold text-[color:var(--dl-mute)] hover:text-[color:var(--dl-ink)]"
              >
                ‹ Màn chính
              </button>
            )}
          </nav>
        )}

        {!loaded && <Splash onDone={() => setLoaded(true)} />}
        <main hidden={!loaded} className={view.kind === 'play' ? 'pt-3' : ''}>
          {view.kind === 'home' && (
            <HomeScreen
              topic={topic}
              onTopic={setTopic}
              onBoard={board}
              onGuide={() => setView({ kind: 'guide' })}
              muted={muted}
              onMute={() => {
                unlockAudio();
                setMuted(!muted);
                setMute(!muted);
              }}
            />
          )}
          {view.kind === 'guide' && <Guide onBack={() => setView({ kind: 'home' })} />}
          {view.kind === 'play' && loaded && (
            <Run
              key={view.key}
              lang="zh"
              topics={topicsFor(topic)}
              legLabel={(leg) => <LegLabel leg={leg} />}
              arrival={(leg, onGo) => <Arrival leg={leg} onGo={onGo} />}
              onExit={() => setView({ kind: 'home' })}
              onOver={(summary) => {
                sfx.fail();
                setView({ kind: 'over', summary });
                window.scrollTo(0, 0);
              }}
            />
          )}
          {view.kind === 'over' && (
            <OverScreen
              summary={view.summary}
              onAgain={board}
              onHome={() => setView({ kind: 'home' })}
            />
          )}
        </main>
      </div>
    </div>
  );
}
