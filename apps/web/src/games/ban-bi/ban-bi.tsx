'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { loadName, saveName } from '../bong-bong-bum/name';
import { Arena, type Finish } from './arena';
import { LEVELS } from './engine';
import { addScore, loadRun, newRun, saveRun, type Run } from './scores';
import { Guide } from './guide';
import { HomeScreen, ResultScreen } from './screens';
import { Splash } from './splash';
import { FONT_URL, VARS } from './theme';

// Khung của Bắn Bi Bá Khí: màn chính (tên, chọn màn, bảng xếp hạng), màn đấu và màn kết quả.
// F5 giữa trận thì vào lại đúng trận đó (đồng hồ chạy tiếp từ chỗ dừng sau đếm ngược).

// Bề mặt trình duyệt, hai hoạt ảnh chữ (nổi lên khi đổi dạng khí, bật ra khi đếm ngược / kết quả)
// và vòng khí, viên ngọc của màn loading; tắt khi người dùng giảm chuyển động. Tiêu đề của app tô màu sẵn nên trả lại màu kế thừa.
const CSS = `
.bb-root ::selection{background:#38e8ff;color:#0a0814}
.bb-root :is(h1,h2,h3){color:inherit;letter-spacing:normal}
.bb-root{caret-color:#38e8ff;scrollbar-color:#3a2f63 #0a0814}
@keyframes bb-rise{from{transform:translateY(12px) scale(.96);opacity:0;filter:blur(4px)}to{transform:none;opacity:1;filter:none}}
.bb-rise{animation:bb-rise .5s cubic-bezier(.16,1,.3,1) both}
@keyframes bb-pop{0%{transform:scale(1.8);opacity:0}40%{transform:scale(.95);opacity:1}100%{transform:none;opacity:1}}
.bb-pop{animation:bb-pop .45s cubic-bezier(.16,1,.3,1) both}
@keyframes bb-spin{to{transform:rotate(360deg)}}
.bb-spin{animation:bb-spin 1.6s linear infinite}
.bb-spin-rev{animation:bb-spin 2.4s linear infinite reverse}
@keyframes bb-breathe{from{transform:scale(.94);filter:brightness(.9)}to{transform:scale(1.04);filter:brightness(1.2)}}
.bb-breathe{animation:bb-breathe .9s ease-in-out infinite alternate}
@media (prefers-reduced-motion:reduce){.bb-rise,.bb-pop,.bb-spin,.bb-spin-rev,.bb-breathe{animation:none}}
`;

type View =
  | { kind: 'home' }
  | { kind: 'guide' }
  | { kind: 'play'; run: Run; key: number }
  | { kind: 'result'; level: string; finish: Finish; rank: number | null };

export function BanBi() {
  const [name, setName] = useState('');
  const [level, setLevel] = useState(LEVELS[0]!.id);
  const [view, setView] = useState<View>({ kind: 'home' });
  // Màn loading lúc mới vào: tải trước model nhân vật và font. Trận dở (F5) chỉ bắt đầu đếm ngược
  // sau khi màn này tắt, để không mất giờ.
  const [loaded, setLoaded] = useState(false);

  // Vừa F5 giữa trận: vào lại trận đang dở.
  useEffect(() => {
    setName(loadName());
    const run = loadRun();
    if (run && run.game.status === 'play') {
      setLevel(run.level);
      setView({ kind: 'play', run, key: Date.now() });
    }
  }, []);

  const start = (lvl: string, who = name) => {
    const run = newRun(who || 'Võ sĩ', lvl);
    saveRun(run);
    setView({ kind: 'play', run, key: Date.now() });
  };

  return (
    <div
      style={VARS}
      className="bb-root relative min-h-dvh bg-[color:var(--bb-night)] bg-[radial-gradient(90%_60%_at_80%_-10%,#3b1d6e_0%,transparent_60%),radial-gradient(70%_50%_at_0%_110%,#0f3a4a_0%,transparent_60%)] font-['Saira',system-ui,sans-serif] text-[16px] text-[color:var(--bb-text)]"
    >
      <link rel="stylesheet" href={FONT_URL} precedence="default" />
      <style href="bb-styles" precedence="default">
        {CSS}
      </style>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-3 pb-12 sm:px-6">
        <nav className="flex min-h-11 items-center">
          {view.kind === 'home' ? (
            <Link
              href="/games"
              className="-ml-2 flex min-h-11 items-center px-2 text-sm font-semibold text-[color:var(--bb-muted)] hover:text-[color:var(--bb-text)]"
            >
              ‹ Games
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setView({ kind: 'home' })}
              className="-ml-2 flex min-h-11 items-center px-2 text-sm font-semibold text-[color:var(--bb-muted)] hover:text-[color:var(--bb-text)]"
            >
              ‹ Màn chính
            </button>
          )}
        </nav>

        {!loaded && <Splash onDone={() => setLoaded(true)} />}
        <main hidden={!loaded}>
          {view.kind === 'home' && (
            <HomeScreen
              name={name}
              onName={(n) => {
                saveName(n);
                setName(n);
              }}
              level={level}
              onLevel={setLevel}
              // Tên vừa nhập đã lưu (saveName) nhưng state `name` chưa kịp đổi: đọc lại bản lưu.
              onStart={() => start(level, loadName())}
              onGuide={() => setView({ kind: 'guide' })}
            />
          )}
          {view.kind === 'guide' && <Guide onBack={() => setView({ kind: 'home' })} />}
          {view.kind === 'play' && loaded && (
            <Arena
              key={view.key}
              run={view.run}
              onQuit={() => {
                saveRun(null);
                setView({ kind: 'home' });
              }}
              onFinish={(finish) => {
                const rank =
                  finish.score > 0
                    ? addScore(view.run.level, {
                        name: view.run.name,
                        score: finish.score,
                        ms: Math.round(finish.ms),
                        peak: finish.peak,
                        at: Date.now(),
                      })
                    : null;
                setView({ kind: 'result', level: view.run.level, finish, rank });
              }}
            />
          )}
          {view.kind === 'result' && (
            <ResultScreen
              level={view.level}
              score={view.finish.score}
              ms={view.finish.ms}
              peak={view.finish.peak}
              rank={view.rank}
              onAgain={() => start(view.level)}
              onHome={() => setView({ kind: 'home' })}
            />
          )}
        </main>
      </div>
    </div>
  );
}
