'use client';

import { useEffect, useState } from 'react';
import { cleanName, loadName, saveName } from '../bong-bong-bum/name';
import { isValidCode, normalizeCode, type NetError } from '../bong-bong-bum/net';
import { createHouse } from './engine';
import { ERROR_TEXT } from './net';
import { HouseRoom, type RoomMode } from './online';
import { Guide, HomeScreen } from './screens';
import { listHouses, listJoined, loadHouse, loadSession, saveHouse, type Joined } from './store';
import { FONT_URL, VARS } from './theme';
import type { House } from './engine';

// Khung của Nhà Mình: màn vào game (tên, xây nhà mới, vào bằng mã, nhà đã lưu), cách chơi và phòng
// xây nhà. Mở bằng link mời (?room=MÃ) thì vào thẳng nhà đó; F5 trong nhà thì vào lại đúng nhà.

// Bề mặt trình duyệt theo bảng màu gạch bông; tiêu đề lấy màu mực của game thay vì màu chữ của app.
const CSS = `
.nm-root ::selection{background:#d4a039;color:#26221f}
.nm-root{caret-color:#8c2f2b}
.nm-root :focus-visible{outline:2.5px solid #26221f;outline-offset:2px}
.nm-root :is(h1,h2,h3,h4){color:inherit}
@keyframes nm-lay{0%,100%{transform:none;opacity:1}40%{transform:translateY(-6px);opacity:.75}}
.nm-lay{display:inline-block;animation:nm-lay 1.2s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){.nm-lay{animation:none}}
`;

const newId = () => Math.random().toString(36).slice(2, 10);

export function NhaMinh() {
  const [name, setName] = useState('');
  const [mode, setMode] = useState<RoomMode | null>(null);
  const [guide, setGuide] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [houses, setHouses] = useState<House[]>([]);
  const [joined, setJoined] = useState<Joined[]>([]);
  const [initialCode, setInitialCode] = useState('');
  const [ready, setReady] = useState(false);

  const refresh = () => {
    setHouses(listHouses());
    setJoined(listJoined());
  };

  // Đọc máy (tên, nhà đã lưu, phiên phòng, link mời) sau khi gắn vào trang: máy chủ không có localStorage.
  useEffect(() => {
    const saved = loadName();
    setName(saved);
    refresh();
    const session = loadSession();
    const params = new URLSearchParams(window.location.search);
    const code = normalizeCode(params.get('room') ?? '');
    if (params.has('room')) window.history.replaceState(null, '', window.location.pathname);
    if (session?.role === 'host' && loadHouse(session.houseId) && !params.has('room'))
      setMode({ kind: 'host', houseId: session.houseId, epoch: session.epoch });
    else if (session?.role === 'join' && (!params.has('room') || session.code === code))
      setMode({ kind: 'join', code: session.code });
    else if (isValidCode(code)) {
      if (saved.trim().length >= 2) setMode({ kind: 'join', code });
      else setInitialCode(code);
    }
    setReady(true);
  }, []);

  const enter = (m: RoomMode) => {
    const n = cleanName(name).trim();
    saveName(n);
    setName(n);
    setNotice(null);
    setMode(m);
  };

  const exit = (error?: NetError) => {
    setMode(null);
    setNotice(error ? ERROR_TEXT[error] : null);
    refresh();
  };

  return (
    <div
      className="nm-root min-h-[100dvh] bg-[color:var(--nm-cement)] font-['Mulish',sans-serif] text-[color:var(--nm-ink)]"
      style={{
        ...VARS,
        backgroundImage: 'radial-gradient(120% 80% at 50% 20%, #e6e2da 0%, transparent 65%)',
      }}
    >
      <link rel="stylesheet" href={FONT_URL} precedence="default" />
      <style>{CSS}</style>
      {!ready ? null : mode ? (
        <HouseRoom mode={mode} name={cleanName(name).trim()} onExit={exit} />
      ) : guide ? (
        <Guide onBack={() => setGuide(false)} />
      ) : (
        <HomeScreen
          name={name}
          setName={(n) => setName(cleanName(n))}
          houses={houses}
          joined={joined}
          notice={notice}
          initialCode={initialCode}
          onGuide={() => setGuide(true)}
          onCreate={() => {
            const n = cleanName(name).trim();
            const h = createHouse(newId(), '', n, Date.now());
            saveHouse(h);
            enter({ kind: 'host', houseId: h.id });
          }}
          onOpen={(id) => {
            const h = loadHouse(id);
            if (!h) return refresh();
            h.players[0] = cleanName(name).trim() || h.players[0];
            saveHouse(h);
            enter({ kind: 'host', houseId: id });
          }}
          onJoin={(code) => enter({ kind: 'join', code })}
        />
      )}
    </div>
  );
}
