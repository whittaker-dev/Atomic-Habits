'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { loadMuted, setMuted, sfx, unlockAudio } from '../du-lich/audio';
import { Run, RUN_CSS, type Summary } from '../du-lich/run';
import { primeSpeech } from '../du-lich/speech';
import { Guide } from './guide';
import { Airmail } from './kit';
import { Arrival, ALL, HomeScreen, LegLabel, OverScreen, topicsFor } from './screens';
import { Splash } from './splash';
import { FONT_URL, VARS } from './theme';

// Khung của English Traveler: màn chính (chủ đề + thẻ lên máy bay), Cẩm nang, một chuyến bay nghe-viết
// (màn chơi chung với Du lịch Trung Hoa) và màn hết chuyến. Điểm chỉ sống trong chuyến đang bay: không
// lưu gì lên máy, tải lại trang là bay chuyến mới (chủ ý của chủ game).

// Bề mặt trình duyệt; mực con dấu loang bằng mặt nạ nhiễu; con dấu nện xuống ở màn tới nơi; bảng giờ
// bay lật chữ ở màn loading. Tắt hoạt ảnh khi người dùng giảm chuyển động.
const CSS = `
.et-root ::selection{background:#1d3f9e;color:#fff}
.et-root{caret-color:#d4342f;scrollbar-color:#c5d3cf #e9f1ee}
.et-root :is(h1,h2,h3){color:inherit;letter-spacing:inherit}
.et-root :focus-visible{outline:3px solid #1d3f9e;outline-offset:2px}
.et-ink{-webkit-mask-image:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' seed='4'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -2.4 0 0 0 2.15'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");mask-image:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' seed='4'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -2.4 0 0 0 2.15'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")}
@keyframes et-stamp{0%{transform:scale(1.9) rotate(-14deg);opacity:0;filter:blur(3px)}55%{transform:scale(.94);opacity:1;filter:none}75%{transform:scale(1.03)}100%{transform:none}}
.et-stamp{animation:et-stamp .55s cubic-bezier(.2,.9,.25,1) both}
@keyframes et-flap{0%{transform:rotateX(90deg)}100%{transform:none}}
.et-flap{animation:et-flap .32s cubic-bezier(.16,1,.3,1) both;transform-origin:50% 50%}
@media (prefers-reduced-motion:reduce){.et-stamp,.et-flap{animation:none}}
${RUN_CSS}
`;

type View =
  | { kind: 'home' }
  | { kind: 'guide' }
  | { kind: 'play'; key: number }
  | { kind: 'over'; summary: Summary };

export function EnglishTraveler() {
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
      className="et-root relative min-h-dvh bg-[color:var(--dl-ground)] font-['IBM_Plex_Sans',system-ui,sans-serif] text-[16px] text-[color:var(--dl-ink)]"
    >
      <link rel="stylesheet" href={FONT_URL} precedence="default" />
      <style href="et-styles" precedence="default">
        {CSS}
      </style>
      <Airmail className="h-2" />

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
              lang="en"
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
