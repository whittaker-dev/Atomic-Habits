'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { loadName, saveName } from '../bong-bong-bum/name';
import { isValidCode, normalizeCode, type NetError } from '../bong-bong-bum/net';
import type { House } from './board';
import { createGame, type Seat } from './engine';
import { BackIcon } from './icons';
import { LocalMatch, loadLocal, saveLocal, type LocalSave } from './match';
import { ERROR_TEXT } from './net';
import { loadRoomSave, OnlineRoom, type OnlineMode } from './online';
import { DEFAULT_RULES, type Rules } from './rules';
import { HomeScreen, SetupScreen } from './screens';
import { FONT_URL, HOUSES, VARS } from './theme';

// Khung của Cờ cá ngựa: màn vào game (tên, chọn cách chơi, nhập mã), chuẩn bị ván trên một máy,
// ván trên một máy (match.tsx) và phòng online (online.tsx). F5 giữa ván thì vào lại đúng ván đó.

// Bề mặt trình duyệt (bôi chọn, con trỏ, thanh cuộn) và hoạt ảnh màn chuyền máy lật vào như lật
// khiên (tắt khi người dùng giảm chuyển động). Tiêu đề của app tô màu sẵn nên trả lại màu kế thừa.
const CSS = `
.cc-root ::selection{background:#ff6a1a;color:#0e1013}
.cc-root :is(h1,h2,h3){color:inherit;letter-spacing:normal}
.cc-root{caret-color:#ff6a1a;scrollbar-color:#4a525c #0e1013}
@keyframes cc-flip{from{transform:rotateY(-80deg);opacity:.2}to{transform:none;opacity:1}}
.cc-flip{animation:cc-flip .55s cubic-bezier(.16,1,.3,1) both}
@keyframes cc-slam{0%{transform:scale(2.6) rotate(-10deg);opacity:0}16%{transform:scale(.9) rotate(-5deg);opacity:1}28%{transform:scale(1.06) rotate(-6deg)}72%{transform:scale(1) rotate(-6deg);opacity:1}100%{transform:scale(1.15) rotate(-6deg);opacity:0}}
.cc-slam{display:inline-block;animation:cc-slam 1.05s cubic-bezier(.16,1,.3,1) both}
@media (prefers-reduced-motion:reduce){.cc-flip,.cc-slam{animation:none}}
`;

type View =
  | { kind: 'home' }
  | { kind: 'setup'; passAndPlay: boolean }
  | { kind: 'local'; save: LocalSave }
  | { kind: 'online'; mode: OnlineMode };

const seat = (house: House, name: string, kind: Seat['kind']): Seat => ({
  house,
  name,
  kind,
  connected: true,
});

export function CoCaNgua() {
  const [name, setName] = useState('');
  const [view, setView] = useState<View>({ kind: 'home' });
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingRoom, setPendingRoom] = useState<string | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [rules, setRules] = useState<Rules>(DEFAULT_RULES);

  // Vừa F5: vào lại đúng ván / phòng đang dở. Mở bằng link mời (?room=MÃ): có tên rồi thì vào
  // thẳng phòng, chưa có thì nhập tên trước.
  useEffect(() => {
    const saved = loadName();
    setName(saved);
    const params = new URLSearchParams(window.location.search);
    const code = normalizeCode(params.get('room') ?? '');
    if (params.has('room')) window.history.replaceState(null, '', window.location.pathname);

    const room = loadRoomSave();
    if (room && (!params.has('room') || code === room.code)) {
      const hostName = room.host?.lobby.seats[0]?.name;
      if (hostName) {
        setName(hostName);
        return setView({ kind: 'online', mode: { kind: 'host', resume: room } });
      }
      if (saved)
        return setView({ kind: 'online', mode: { kind: 'join', code: room.code, resume: room } });
    }
    const local = loadLocal();
    if (local && !params.has('room')) return setView({ kind: 'local', save: local });

    if (!params.has('room')) return;
    if (!isValidCode(code))
      return setNotice('Link mời không hợp lệ — kiểm tra lại mã phòng 6 ký tự.');
    if (saved) setView({ kind: 'online', mode: { kind: 'join', code } });
    else setPendingRoom(code);
  }, []);

  const rename = (n: string) => {
    saveName(n);
    setName(n);
  };
  const go = (v: View) => {
    setNotice(null);
    setPendingRoom(null);
    setView(v);
    window.scrollTo({ top: 0 });
  };
  const home = (error?: NetError) => {
    setView({ kind: 'home' });
    setNotice(error ? ERROR_TEXT[error] : null);
  };

  return (
    <div
      style={VARS}
      className="cc-root relative min-h-dvh bg-[color:var(--cc-night)] bg-[radial-gradient(120%_60%_at_50%_-10%,#3a1d0e_0%,transparent_60%)] font-['Barlow_Semi_Condensed',system-ui,sans-serif] text-[17px] text-[color:var(--cc-bone)]"
    >
      <link rel="stylesheet" href={FONT_URL} precedence="default" />
      <style href="cc-styles" precedence="default">
        {CSS}
      </style>

      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 pt-3 pb-10 sm:px-6">
        <nav className="flex min-h-11 items-center">
          {view.kind === 'home' ? (
            <Link
              href="/games"
              className="-ml-2 flex min-h-11 items-center gap-1 px-2 text-sm font-bold text-[color:var(--cc-ash)] hover:text-[color:var(--cc-bone)]"
            >
              <BackIcon className="h-4 w-4" />
              Games
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (view.kind === 'local') saveLocal(null);
                home();
              }}
              className="-ml-2 flex min-h-11 items-center gap-1 px-2 text-sm font-bold text-[color:var(--cc-ash)] hover:text-[color:var(--cc-bone)]"
            >
              <BackIcon className="h-4 w-4" />
              {view.kind === 'online' ? 'Rời phòng' : 'Quay lại'}
            </button>
          )}
        </nav>

        <main>
          {view.kind === 'home' && (
            <HomeScreen
              name={name}
              onName={rename}
              notice={notice}
              pendingRoom={pendingRoom}
              onLocal={() => {
                setSeats([0, 1, 2, 3].map((h) => seat(h as House, '', h < 2 ? 'human' : 'empty')));
                go({ kind: 'setup', passAndPlay: true });
              }}
              onBots={() => {
                setSeats(
                  [0, 1, 2, 3].map((h) =>
                    // Tên vừa nhập đã được lưu (saveName) nhưng state `name` chưa kịp đổi: đọc lại bản lưu.
                    h === 0
                      ? seat(0, loadName() || 'Bạn', 'human')
                      : seat(h as House, `Máy ${HOUSES[h]!.name}`, 'bot'),
                  ),
                );
                go({ kind: 'setup', passAndPlay: false });
              }}
              onHost={() => go({ kind: 'online', mode: { kind: 'host' } })}
              onJoin={(code) => go({ kind: 'online', mode: { kind: 'join', code } })}
            />
          )}
          {view.kind === 'setup' && (
            <SetupScreen
              seats={seats}
              onSeats={setSeats}
              rules={rules}
              onRules={setRules}
              onStart={() => {
                const save: LocalSave = {
                  game: createGame(
                    seats.map((s) => ({ ...s, name: s.name.trim() })),
                    rules,
                  ),
                  passAndPlay: view.passAndPlay,
                };
                saveLocal(save);
                go({ kind: 'local', save });
              }}
            />
          )}
          {view.kind === 'local' && <LocalMatch save={view.save} onLeave={() => home()} />}
          {view.kind === 'online' && (
            <OnlineRoom
              key={view.mode.kind === 'join' ? `join-${view.mode.code}` : 'host'}
              mode={view.mode}
              name={name}
              onExit={home}
            />
          )}
        </main>
      </div>
    </div>
  );
}
