'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { unlockAudio } from '../bong-bong-bum/audio';
import { MAX_PLAYERS } from '../bong-bong-bum/map';
import { cleanName, loadName, NAME_MAX, nameError, saveName } from '../bong-bong-bum/name';
import { PALETTE_VARS } from '../bong-bong-bum/palette';
import { Stepper } from '../bong-bong-bum/screens';
import { Btn, CARD, DISPLAY, FONT_URL, HEADING, SettingsDialog } from '../bong-bong-bum/ui';
import { ARENAS, type ArenaId } from './arenas';
import type { Difficulty } from './bot';
import { MATCH_TIME, MAX_AMMO, SHOT_RANGE, STUN_TIME } from './engine';
import { MatchScreen, type MatchConfig, type MatchOutcome } from './match';
import { isValidCode, NET_ERROR_TEXT, normalizeCode, type NetError } from '../bong-bong-bum/net';
import { OnlineRoom, type OnlineMode } from './online';
import { ArenaPicker, DIFFICULTIES, ResultScreen, SquadGrid, SquadImg } from './screens';
import { SQUAD, squadById } from './squad';

// Khung chính của Sơn Lãnh Địa: chọn chế độ → cài trận → trận 3D → kết quả.
// Dùng chung tên người chơi, âm thanh và bộ nút với Bomb Arena; nhân vật và sân là của riêng game này.

type Screen = 'home' | 'setup' | 'match' | 'result' | 'online';
type Mode = 'solo' | 'local2';

const DEFAULT_BOTS: Record<Mode, number> = { solo: 3, local2: 2 };
const DEFAULT_CHARS = ['mochi', 'bin'];

const randomSeed = () => Math.floor(Math.random() * 2 ** 31);

function Title() {
  return (
    <h1
      className={`${DISPLAY} text-center text-5xl leading-none text-[color:var(--bb-sun)] [-webkit-text-stroke:4px_var(--bb-ink)] [paint-order:stroke_fill] [text-shadow:0_6px_0_var(--bb-ink)] sm:text-6xl`}
    >
      Sơn Lãnh Địa
    </h1>
  );
}

function HomeScreen({
  name,
  onName,
  onMode,
  onOnline,
  notice,
  pendingRoom,
}: {
  name: string;
  onName: (n: string) => void;
  onMode: (m: Mode) => void;
  onOnline: (m: OnlineMode) => void;
  notice: string | null;
  /** Mở link mời khi chưa có tên: nhập tên xong là vào thẳng phòng này. */
  pendingRoom: string | null;
}) {
  const [code, setCode] = useState('');
  const [draft, setDraft] = useState(name);
  const [editing, setEditing] = useState(!name);
  const [settings, setSettings] = useState(false);
  useEffect(() => {
    setDraft(name);
    setEditing(!name);
  }, [name]);
  const error = nameError(draft);
  /** Mọi lối vào trận đều cần tên: đang sửa tên thì lưu tên trước rồi mới đi tiếp. */
  const withName = (next: () => void) => {
    if (editing) {
      if (error) return;
      saveName(draft);
      onName(draft.trim());
    }
    next();
  };
  const go = (m: Mode) => withName(() => onMode(m));

  return (
    <div className="mx-auto grid max-w-4xl items-center gap-8 pt-4 md:grid-cols-[1fr_340px]">
      <div className="flex flex-col items-center gap-5">
        <Title />
        <div className="flex items-end justify-center">
          {['kem', 'mochi', 'bin', 'bo'].map((id, i) => (
            <SquadImg key={id} id={id} className={i === 1 || i === 2 ? 'h-36' : 'h-28'} />
          ))}
        </div>
        <section className={`${CARD} w-full p-4`} aria-labelledby="sld-how">
          <h2 id="sld-how" className={`${HEADING} text-2xl`}>
            Cách chơi
          </h2>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm font-bold text-slate-700">
            <li>
              Chạy tới đâu sàn đổi sang màu của bạn tới đó. Hết {MATCH_TIME / 60} phút, phe phủ
              nhiều sàn nhất thắng.
            </li>
            <li>
              Bắn bóng sơn bay xa {SHOT_RANGE} ô, vỡ ra sơn cả vùng. Mỗi lần mang tối đa {MAX_AMMO}{' '}
              viên, tự nạp lại.
            </li>
            <li>
              Bắn trúng đối thủ thì họ đứng hình {String(STUN_TIME).replace('.', ',')} giây, không
              chạy, không sơn được.
            </li>
          </ul>
        </section>
      </div>

      <nav className="flex flex-col gap-3" aria-label="Chế độ chơi">
        {editing ? (
          <div className={`${CARD} p-4`}>
            <label htmlFor="sld-name" className={`${DISPLAY} text-xl`}>
              Tên của bạn
            </label>
            <input
              id="sld-name"
              value={draft}
              onChange={(e) => setDraft(cleanName(e.target.value))}
              maxLength={NAME_MAX}
              autoComplete="nickname"
              placeholder="vd: Mia"
              className="mt-1 w-full rounded-xl border-[3px] border-[color:var(--bb-ink)] bg-white px-3 py-2 text-lg font-bold outline-none placeholder:text-slate-400 focus:ring-4 focus:ring-[color:var(--bb-sky)]"
            />
            <p className="mt-1 min-h-5 text-sm font-bold text-[color:var(--bb-coral)]">
              {draft && error}
            </p>
          </div>
        ) : (
          <p className="rounded-full border-[3px] border-[color:var(--bb-ink)] bg-white px-4 py-1 text-center font-extrabold">
            Chào {name}!{' '}
            <button type="button" className="ml-1 underline" onClick={() => setEditing(true)}>
              Đổi tên
            </button>
          </p>
        )}
        <Btn
          tone="sun"
          className="py-3 text-xl"
          disabled={editing && !!error}
          onClick={() => go('solo')}
        >
          Chơi với bot
        </Btn>
        <Btn
          tone="sky"
          className="py-3 text-xl"
          disabled={editing && !!error}
          onClick={() => go('local2')}
        >
          2 người cùng máy
        </Btn>
        {pendingRoom ? (
          <Btn
            tone="coral"
            className="py-3 text-xl"
            disabled={editing && !!error}
            onClick={() => withName(() => onOnline({ kind: 'join', code: pendingRoom }))}
          >
            Vào phòng {pendingRoom}
          </Btn>
        ) : (
          <Btn
            tone="coral"
            className="py-3 text-xl"
            disabled={editing && !!error}
            onClick={() => withName(() => onOnline({ kind: 'host' }))}
          >
            Mời bạn (tạo phòng)
          </Btn>
        )}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (isValidCode(code)) withName(() => onOnline({ kind: 'join', code }));
          }}
        >
          <input
            value={code}
            onChange={(e) => setCode(normalizeCode(e.target.value))}
            placeholder="Nhập mã phòng"
            aria-label="Mã phòng"
            autoCapitalize="characters"
            className={`${DISPLAY} min-w-0 flex-1 rounded-xl border-[3px] border-[color:var(--bb-ink)] bg-white px-3 text-xl uppercase tracking-[0.2em] placeholder:text-base placeholder:normal-case placeholder:tracking-normal`}
          />
          <button
            type="submit"
            disabled={!isValidCode(code) || (editing && !!error)}
            className="rounded-xl border-[3px] border-[color:var(--bb-ink)] bg-[color:var(--bb-mint)] px-4 font-extrabold shadow-[0_4px_0_var(--bb-ink)] disabled:opacity-50"
          >
            Vào
          </button>
        </form>
        <Btn tone="cream" onClick={() => setSettings(true)}>
          Cài đặt
        </Btn>
        {notice && (
          <p
            className={`${CARD} border-[color:var(--bb-coral)] p-3 text-sm font-bold`}
            role="alert"
          >
            {notice}
          </p>
        )}
      </nav>
      {settings && (
        <SettingsDialog
          actionLabel="Bắn sơn"
          actionButton="Bắn!"
          onClose={() => setSettings(false)}
        />
      )}
    </div>
  );
}

function SetupScreen({
  mode,
  name,
  onStart,
  onBack,
}: {
  mode: Mode;
  name: string;
  onStart: (cfg: MatchConfig) => void;
  onBack: () => void;
}) {
  const humans = mode === 'solo' ? 1 : 2;
  const [chars, setChars] = useState(DEFAULT_CHARS);
  const [editing, setEditing] = useState(0);
  const [name2, setName2] = useState('Bạn 2');
  const [bots, setBots] = useState(DEFAULT_BOTS[mode]);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [arena, setArena] = useState<ArenaId | 'random'>('random');
  const [teams, setTeams] = useState(false);
  const minBots = humans === 1 ? 1 : 0;
  const maxBots = MAX_PLAYERS - humans;
  const pick = (id: string) => setChars((c) => c.map((v, i) => (i === editing ? id : v)));
  const name2Error = humans === 2 ? nameError(name2) : null;

  const start = () => {
    onStart({
      arena: arena === 'random' ? ARENAS[Math.floor(Math.random() * ARENAS.length)]!.id : arena,
      teams,
      difficulty,
      bots,
      seed: randomSeed(),
      humans: [
        { name, charId: chars[0]! },
        ...(humans === 2 ? [{ name: name2.trim(), charId: chars[1]! }] : []),
      ],
    });
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <Btn tone="cream" onClick={onBack}>
          ← Về
        </Btn>
        <h2
          className={`${DISPLAY} text-4xl text-white [-webkit-text-stroke:2px_var(--bb-ink)] [paint-order:stroke_fill]`}
        >
          {mode === 'solo' ? 'Chơi với bot' : '2 người cùng máy'}
        </h2>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <section className={`${CARD} p-4`}>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={`${HEADING} mr-auto text-2xl`}>Chọn nhân vật</h3>
            {humans === 2 &&
              [0, 1].map((i) => (
                <Btn
                  key={i}
                  tone={editing === i ? 'sun' : 'cream'}
                  className="px-3 py-1 text-sm"
                  onClick={() => setEditing(i)}
                >
                  P{i + 1}: {squadById(chars[i]!).name}
                </Btn>
              ))}
          </div>
          <div className="mt-3">
            <SquadGrid
              value={chars[editing]!}
              onPick={pick}
              taken={humans === 2 ? [chars[1 - editing]!] : undefined}
            />
          </div>
          <p className="mt-3 text-sm font-bold text-slate-600">
            {squadById(chars[editing]!).blurb}
          </p>
          {humans === 2 && (
            <label className="mt-3 flex items-center gap-2 text-sm font-bold">
              Tên người 2
              <input
                value={name2}
                onChange={(e) => setName2(cleanName(e.target.value))}
                maxLength={NAME_MAX}
                className="min-w-0 flex-1 rounded-lg border-[3px] border-[color:var(--bb-ink)] bg-white px-2 py-1"
              />
              {name2Error && <span className="text-[color:var(--bb-coral)]">{name2Error}</span>}
            </label>
          )}
        </section>

        <section className={`${CARD} flex flex-col gap-4 p-4`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className={`${HEADING} text-xl`}>Số bot</h3>
              <p className="text-xs font-bold text-slate-600">
                {humans + bots}/{MAX_PLAYERS} người trong trận
              </p>
            </div>
            <Stepper value={bots} min={minBots} max={maxBots} onChange={setBots} />
          </div>
          <div>
            <h3 className={`${HEADING} text-xl`}>Độ khó bot</h3>
            <div className="mt-1 flex gap-2">
              {DIFFICULTIES.map((d) => (
                <Btn
                  key={d.id}
                  tone={difficulty === d.id ? 'sun' : 'cream'}
                  className="flex-1 py-1"
                  pressed={difficulty === d.id}
                  onClick={() => setDifficulty(d.id)}
                >
                  {d.label}
                </Btn>
              ))}
            </div>
          </div>
          <div>
            <h3 className={`${HEADING} text-xl`}>Luật</h3>
            <div className="mt-1 flex gap-2">
              <Btn
                tone={!teams ? 'sun' : 'cream'}
                className="flex-1 py-1 text-sm"
                pressed={!teams}
                onClick={() => setTeams(false)}
              >
                Mỗi người một màu
              </Btn>
              <Btn
                tone={teams ? 'sun' : 'cream'}
                className="flex-1 py-1 text-sm"
                pressed={teams}
                onClick={() => setTeams(true)}
              >
                Hai đội
              </Btn>
            </div>
            <p className="mt-1 text-xs font-bold text-slate-600">
              {teams
                ? 'P1, P3, P5 đội Hồng · P2, P4, P6 đội Xanh. Đồng đội không bắn trúng nhau.'
                : 'Mỗi người sơn đúng màu nhân vật mình chọn.'}
            </p>
          </div>
        </section>
      </div>

      <section className={`${CARD} p-4`}>
        <h3 className={`${HEADING} text-xl`}>Sân</h3>
        <ArenaPicker value={arena} onPick={setArena} />
      </section>

      <div className="flex justify-end">
        <Btn tone="sun" className="px-10 py-3 text-2xl" disabled={!!name2Error} onClick={start}>
          Bắt đầu!
        </Btn>
      </div>
    </div>
  );
}

export function SonLanhDia() {
  const [screen, setScreen] = useState<Screen>('home');
  const [name, setName] = useState('');
  const [mode, setMode] = useState<Mode>('solo');
  const [config, setConfig] = useState<MatchConfig | null>(null);
  const [outcome, setOutcome] = useState<MatchOutcome | null>(null);
  const [online, setOnline] = useState<OnlineMode | null>(null);
  const [pendingRoom, setPendingRoom] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Mở link mời (?room=MÃ): đã có tên lưu trên máy thì vào thẳng phòng, chưa có thì nhập tên trước.
  useEffect(() => {
    const saved = loadName();
    const hasName = !nameError(saved);
    if (hasName) setName(saved.trim());
    const raw = new URLSearchParams(window.location.search).get('room');
    if (raw === null) return;
    const code = normalizeCode(raw);
    if (!isValidCode(code)) {
      setNotice('Link mời không hợp lệ — kiểm tra lại mã phòng 6 ký tự.');
      return;
    }
    if (hasName) {
      setOnline({ kind: 'join', code });
      setScreen('online');
    } else {
      setPendingRoom(code);
    }
  }, []);

  const openOnline = (m: OnlineMode) => {
    setNotice(null);
    setOnline(m);
    setScreen('online');
  };
  const leaveOnline = (error?: NetError) => {
    setOnline(null);
    setPendingRoom(null);
    window.history.replaceState(null, '', window.location.pathname);
    setNotice(error ? NET_ERROR_TEXT[error] : null);
    setScreen('home');
  };

  const startMatch = (cfg: MatchConfig) => {
    setConfig(cfg);
    setScreen('match');
  };

  return (
    <div
      style={PALETTE_VARS}
      onPointerDown={unlockAudio}
      onKeyDown={unlockAudio}
      className="relative min-h-dvh overflow-x-hidden bg-[linear-gradient(180deg,#7fd8f7_0%,#4cc3f0_55%,#2a8fd6_100%)] font-['Nunito',sans-serif] text-[color:var(--bb-ink)]"
    >
      <link rel="stylesheet" href={FONT_URL} precedence="default" />
      {/* Vệt sơn trang trí nền, màu của bốn nhân vật đầu. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {[
          [6, 16, 90],
          [84, 10, 120],
          [74, 66, 80],
          [10, 76, 110],
        ].map(([l, t, s], i) => (
          <span
            key={i}
            className="absolute rounded-full opacity-30"
            style={{
              left: `${l}%`,
              top: `${t}%`,
              width: s,
              height: s,
              background: SQUAD[i]!.color,
            }}
          />
        ))}
      </div>

      {screen !== 'match' && (
        <header className="relative z-10 border-b-[3px] border-[color:var(--bb-ink)] bg-[color:var(--bb-night)] text-white">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2">
            <Link href="/games" className="text-sm font-extrabold text-white/80 hover:text-white">
              ← Games
            </Link>
            <span className={`${DISPLAY} text-lg`}>Sơn Lãnh Địa</span>
          </div>
        </header>
      )}

      <main className="relative z-10 px-4 py-6">
        {screen === 'home' && (
          <HomeScreen
            name={name}
            onName={setName}
            onMode={(m) => {
              setMode(m);
              setScreen('setup');
            }}
            onOnline={openOnline}
            notice={notice}
            pendingRoom={pendingRoom}
          />
        )}
        {screen === 'online' && online && (
          <OnlineRoom mode={online} name={name} charId={SQUAD[0]!.id} onExit={leaveOnline} />
        )}
        {screen === 'setup' && (
          <SetupScreen
            key={mode}
            mode={mode}
            name={name}
            onStart={startMatch}
            onBack={() => setScreen('home')}
          />
        )}
        {screen === 'result' && outcome && config && (
          <ResultScreen
            outcome={outcome}
            teams={config.teams}
            onAgain={() => startMatch({ ...config, seed: randomSeed() })}
            onSetup={() => setScreen('setup')}
          />
        )}
      </main>

      {screen === 'match' && config && (
        <MatchScreen
          key={config.seed}
          config={config}
          onEnd={(o) => {
            setOutcome(o);
            setScreen('result');
          }}
          onQuit={() => setScreen('setup')}
        />
      )}
    </div>
  );
}
