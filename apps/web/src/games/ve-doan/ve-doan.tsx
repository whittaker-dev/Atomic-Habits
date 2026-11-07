'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { loadName, saveName } from '../bong-bong-bum/name';
import { isValidCode, normalizeCode, type NetError } from '../bong-bong-bum/net';
import { BackIcon } from './icons';
import { ERROR_TEXT } from './net';
import { loadRoomSave, OnlineRoom, type OnlineMode } from './online';
import { HomeScreen } from './screens';
import { DISPLAY, FONT_URL, VARS } from './theme';

// Khung của Vẽ Đoán: màn vào game (tên, tạo phòng, nhập mã) và phòng online. Vẽ đoán cần mỗi người
// một máy nên chỉ có chơi qua mạng — không có chế độ bot hay chung máy như hai game kia.

// Hoạt ảnh và bề mặt trình duyệt (bôi chọn, con trỏ, thanh cuộn) theo màu sân khấu.
// Đèn viền biển hiệu: hai lớp bóng xen kẽ sáng tắt như đèn hội chợ; tắt hẳn khi người dùng giảm chuyển động.
const CSS = `
.vd-root ::selection{background:#ffc93c;color:#2a1f3d}
.vd-root{caret-color:#ffc93c;scrollbar-color:#4a3d80 #1b1440}
@keyframes vd-flicker{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes vd-drop{0%{opacity:0;transform:translateY(-38px) scale(1.25)}60%{opacity:1}100%{opacity:1;transform:none}}
@keyframes vd-blink{0%,49.9%{opacity:1}50%,100%{opacity:.18}}
.vd-chase{
  padding:12px;
  background:
    radial-gradient(circle at 6px 6px,#5a1222 0 2.6px,transparent 3.2px) 0 0/12px 12px round;
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
  -webkit-mask-composite:xor;mask-composite:exclude;
}
.vd-chase::before,.vd-chase::after{
  content:"";position:absolute;inset:0;border-radius:inherit;
  filter:drop-shadow(0 0 3px rgb(255 201 60 / .9));
}
.vd-chase::before{
  background:
    radial-gradient(circle at 6px 6px,#fff3c4 0 2.6px,transparent 3.4px) 0 0/24px 24px round,
    radial-gradient(circle at 18px 18px,#fff3c4 0 2.6px,transparent 3.4px) 0 0/24px 24px round;
  animation:vd-blink 1.1s linear infinite;
}
.vd-chase::after{
  background:
    radial-gradient(circle at 18px 6px,#fff3c4 0 2.6px,transparent 3.4px) 0 0/24px 24px round,
    radial-gradient(circle at 6px 18px,#fff3c4 0 2.6px,transparent 3.4px) 0 0/24px 24px round;
  animation:vd-blink 1.1s linear infinite -.55s;
}
@media (prefers-reduced-motion:reduce){.vd-chase::before,.vd-chase::after{animation:none}}
`;

export function VeDoan() {
  const [name, setName] = useState('');
  const [room, setRoom] = useState<OnlineMode | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingRoom, setPendingRoom] = useState<string | null>(null);

  // Vừa F5 trong phòng: vào lại đúng phòng đó. Mở bằng link mời (?room=MÃ): có tên rồi thì vào thẳng
  // phòng, chưa có thì nhập tên trước.
  useEffect(() => {
    const saved = loadName();
    setName(saved);
    const params = new URLSearchParams(window.location.search);
    const code = normalizeCode(params.get('room') ?? '');
    const resume = loadRoomSave();
    // Link mời tới phòng khác thì theo link, bỏ phòng cũ.
    if (resume && (!params.has('room') || code === resume.code)) {
      window.history.replaceState(null, '', window.location.pathname);
      const hostName = resume.host?.lobby.slots[0]?.name;
      if (hostName) {
        setName(hostName);
        return setRoom({ kind: 'host', resume });
      }
      if (saved) return setRoom({ kind: 'join', code: resume.code, resume });
    }
    if (!params.has('room')) return;
    window.history.replaceState(null, '', window.location.pathname);
    if (!isValidCode(code))
      return setNotice('Link mời không hợp lệ — kiểm tra lại mã phòng 6 ký tự.');
    if (saved) setRoom({ kind: 'join', code });
    else setPendingRoom(code);
  }, []);

  const rename = (n: string) => {
    saveName(n);
    setName(n);
  };
  const enter = (mode: OnlineMode) => {
    setNotice(null);
    setPendingRoom(null);
    setRoom(mode);
    window.scrollTo({ top: 0 });
  };
  const exit = (error?: NetError) => {
    setRoom(null);
    setNotice(error ? ERROR_TEXT[error] : null);
  };

  return (
    <div
      style={VARS}
      className="vd-root relative min-h-dvh bg-[color:var(--vd-tarp)] bg-[radial-gradient(110%_55%_at_50%_-8%,var(--vd-tarpHi)_0%,transparent_70%)] font-['Be_Vietnam_Pro',system-ui,sans-serif] text-[color:var(--vd-bulb)]"
    >
      <link rel="stylesheet" href={FONT_URL} precedence="default" />
      <style href="vd-styles" precedence="default">
        {CSS}
      </style>

      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 pt-3 pb-10 sm:px-6">
        <nav className="flex min-h-11 items-center justify-between gap-3">
          {room ? (
            <button
              type="button"
              onClick={() => exit()}
              className="-ml-2 flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-bold text-[color:var(--vd-mute)] hover:text-[color:var(--vd-bulb)]"
            >
              <BackIcon className="h-4 w-4" />
              Rời phòng
            </button>
          ) : (
            <Link
              href="/games"
              className="-ml-2 flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-bold text-[color:var(--vd-mute)] hover:text-[color:var(--vd-bulb)]"
            >
              <BackIcon className="h-4 w-4" />
              Games
            </Link>
          )}
          {room && (
            <span className={`${DISPLAY} pt-1 text-2xl leading-none text-[color:var(--vd-gold)]`}>
              Vẽ Đoán
            </span>
          )}
        </nav>

        <main>
          {room ? (
            <OnlineRoom
              key={room.kind === 'join' ? `join-${room.code}` : 'host'}
              mode={room}
              name={name}
              onExit={exit}
            />
          ) : (
            <HomeScreen
              name={name}
              onName={rename}
              onCreate={() => enter({ kind: 'host' })}
              onJoin={(code) => enter({ kind: 'join', code })}
              notice={notice}
              pendingRoom={pendingRoom}
            />
          )}
        </main>
      </div>
    </div>
  );
}
