'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { loadName, saveName } from '../bong-bong-bum/name';
import { isValidCode, normalizeCode, type NetError } from '../bong-bong-bum/net';
import { TOKENS } from './data';
import { DEFAULT_SETTINGS, type Seat, type Settings } from './engine';
import { BackIcon } from './icons';
import { LocalMatch, loadLocal, newGame, saveLocal, type LocalSave } from './match';
import { ERROR_TEXT } from './net';
import { loadRoomSave, OnlineRoom, type OnlineMode } from './online';
import { freeCharacter, loadCharacter, ROSTER, saveCharacter } from './roster';
import { botName, HomeScreen, SetupScreen } from './screens';
import { FONT_URL, VARS } from './theme';

// Khung của Cờ tỷ phú: màn vào game (tên, chọn cách chơi, nhập mã), chuẩn bị ván trên một máy, ván
// trên một máy (match.tsx) và phòng online (online.tsx). F5 giữa ván thì vào lại đúng ván đó.

// Bề mặt trình duyệt (bôi chọn, con trỏ, thanh cuộn) và hoạt ảnh thẻ lật vào như mở nắp hộp sơn mài
// (tắt khi người dùng giảm chuyển động). Tiêu đề của app tô màu sẵn nên trả lại màu kế thừa.
const CSS = `
.tp-root ::selection{background:#d4a73a;color:#120b09}
.tp-root :is(h1,h2,h3){color:inherit;letter-spacing:normal}
.tp-root{caret-color:#d4a73a;scrollbar-color:#4a3426 #120b09}
@keyframes tp-card{from{transform:perspective(600px) rotateX(-70deg) translateY(-12px);opacity:0}to{transform:none;opacity:1}}
.tp-card{animation:tp-card .5s cubic-bezier(.16,1,.3,1) both}
@media (prefers-reduced-motion:reduce){.tp-card{animation:none}}
`;

type View =
  | { kind: 'home' }
  | { kind: 'setup'; passAndPlay: boolean }
  | { kind: 'local'; save: LocalSave }
  | { kind: 'online'; mode: OnlineMode };

const seat = (id: number, name: string, kind: Seat['kind'], character: string): Seat => ({
  id,
  name,
  kind,
  connected: true,
  character,
});
const SEAT_IDS = TOKENS.map((_, i) => i);

export function CoTyPhu() {
  const [name, setName] = useState('');
  const [character, setCharacter] = useState<string>(ROSTER[0]!);
  const [view, setView] = useState<View>({ kind: 'home' });
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingRoom, setPendingRoom] = useState<string | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  // Vừa F5: vào lại đúng ván / phòng đang dở. Mở bằng link mời (?room=MÃ): có tên rồi thì vào
  // thẳng phòng, chưa có thì nhập tên trước.
  useEffect(() => {
    const saved = loadName();
    setName(saved);
    setCharacter(loadCharacter());
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
      className="tp-root relative min-h-dvh bg-[color:var(--tp-lacquer)] bg-[radial-gradient(110%_55%_at_50%_-10%,#3b120d_0%,transparent_62%)] font-['Montserrat',system-ui,sans-serif] text-[16px] text-[color:var(--tp-eggshell)]"
    >
      <link rel="stylesheet" href={FONT_URL} precedence="default" />
      <style href="tp-styles" precedence="default">
        {CSS}
      </style>

      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 pt-3 pb-10 sm:px-6">
        <nav className="flex min-h-11 items-center">
          {view.kind === 'home' ? (
            <Link
              href="/games"
              className="-ml-2 flex min-h-11 items-center gap-1 px-2 text-sm font-bold text-[color:var(--tp-ash)] hover:text-[color:var(--tp-eggshell)]"
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
              className="-ml-2 flex min-h-11 items-center gap-1 px-2 text-sm font-bold text-[color:var(--tp-ash)] hover:text-[color:var(--tp-eggshell)]"
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
              character={character}
              onCharacter={(id) => {
                saveCharacter(id);
                setCharacter(id);
              }}
              notice={notice}
              pendingRoom={pendingRoom}
              onLocal={() => {
                // Mỗi ghế một nhân vật khác nhau, ghế đầu là nhân vật bạn đã chọn.
                const cast = [character, ...ROSTER.filter((id) => id !== character)];
                setSeats(SEAT_IDS.map((i) => seat(i, '', i < 2 ? 'human' : 'empty', cast[i]!)));
                go({ kind: 'setup', passAndPlay: true });
              }}
              onBots={() => {
                // Máy lấy ngẫu nhiên nhân vật chưa ai dùng.
                const taken = [character];
                for (let i = 1; i < SEAT_IDS.length; i++) taken.push(freeCharacter(taken, true));
                setSeats(
                  SEAT_IDS.map((i) =>
                    // Tên vừa nhập đã được lưu (saveName) nhưng state `name` chưa kịp đổi: đọc lại bản lưu.
                    i === 0
                      ? seat(0, loadName() || 'Bạn', 'human', character)
                      : i < 4
                        ? seat(i, botName(taken[i]!), 'bot', taken[i]!)
                        : seat(i, '', 'empty', taken[i]!),
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
              settings={settings}
              onSettings={setSettings}
              onStart={() => {
                const save: LocalSave = {
                  game: newGame(
                    seats.map((s) => ({ ...s, name: s.name.trim() })),
                    settings,
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
              character={character}
              onExit={home}
            />
          )}
        </main>
      </div>
    </div>
  );
}
