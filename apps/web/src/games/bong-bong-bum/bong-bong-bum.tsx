'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { unlockAudio } from './audio';
import type { Difficulty } from './bot';
import { CHARACTERS, characterById } from './characters';
import { MAX_PLAYERS, THEMES, type ThemeId } from './map';
import { BOARD_SIZE, loadBoard, recordMatch, type BoardEntry } from './leaderboard';
import { MatchScreen, type MatchConfig, type MatchOutcome } from './match';
import { cleanName, loadName, NAME_MAX, nameError, saveName } from './name';
import { PALETTE, PALETTE_VARS, SEAT_COLORS } from './palette';
import {
  Btn,
  CARD,
  CharCanvas,
  DISPLAY,
  FONT_URL,
  HEADING,
  HelpDialog,
  Logo,
  SettingsDialog,
} from './ui';
import { isValidCode, NET_ERROR_TEXT, normalizeCode, type NetError } from './net';
import { loadHostSave, OnlineRoom, type OnlineMode } from './online';
import { CharacterGrid, MapPicker, ResultScreen, Stepper } from './screens';
import { GuideScreen } from './guide';
import { Splash } from './splash';

// Khung chính của Bong Bóng Bùm: điều hướng giữa các màn hình và giữ cấu hình trận.

type Screen = 'name' | 'home' | 'setup' | 'match' | 'result' | 'leaderboard' | 'online' | 'guide';
type Mode = 'solo' | 'local2';

const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: 'easy', label: 'Dễ' },
  { id: 'medium', label: 'Vừa' },
  { id: 'hard', label: 'Khó' },
];

/** Chơi một mình mặc định thêm 4 bot (5 người); tối đa 6 người cả trận. */
const DEFAULT_BOTS: Record<Mode, number> = { solo: 4, local2: 2 };

const randomSeed = () => Math.floor(Math.random() * 2 ** 31);

function NameScreen({ onDone, onGuide }: { onDone: (name: string) => void; onGuide: () => void }) {
  const [name, setName] = useState('');
  const [touched, setTouched] = useState(false);
  useEffect(() => setName(loadName()), []);
  const error = nameError(name);
  const submit = () => {
    setTouched(true);
    if (error) return;
    saveName(name);
    onDone(name.trim());
  };
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 pt-6">
      <Logo />
      <div className="flex flex-wrap items-end justify-center">
        {CHARACTERS.map((d, i) => (
          <CharCanvas key={d.id} def={d} pose={i % 3 === 1 ? 'win' : 'idle'} size={52} />
        ))}
      </div>
      <form
        className={`${CARD} w-full p-5`}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label htmlFor="bb-name" className={`${DISPLAY} text-2xl`}>
          Tên của bạn
        </label>
        <div className="mt-2 flex items-center gap-2 rounded-xl border-[3px] border-[color:var(--bb-ink)] bg-white px-3 focus-within:ring-4 focus-within:ring-[color:var(--bb-sky)]">
          <input
            id="bb-name"
            value={name}
            onChange={(e) => setName(cleanName(e.target.value))}
            onBlur={() => setTouched(true)}
            maxLength={NAME_MAX}
            autoComplete="nickname"
            placeholder="vd: Mia"
            className="min-w-0 flex-1 bg-transparent py-3 text-lg font-bold outline-none placeholder:text-slate-400"
          />
          <span className="text-sm font-bold text-slate-500">
            {name.length}/{NAME_MAX}
          </span>
        </div>
        <p className="mt-2 min-h-5 text-sm font-bold text-[color:var(--bb-coral)]">
          {touched && error}
        </p>
        <p className="text-sm text-slate-600">
          2–16 ký tự, chỉ chữ, số, khoảng trắng và <code>_ . -</code>. Tên được lưu trên máy này.
        </p>
        <button
          type="submit"
          className="mt-4 w-full rounded-xl border-[3px] border-[color:var(--bb-ink)] bg-[color:var(--bb-sun)] py-3 text-xl font-extrabold shadow-[0_4px_0_var(--bb-ink)] active:translate-y-[3px] active:shadow-[0_1px_0_var(--bb-ink)]"
        >
          Vào chơi
        </button>
      </form>
      {/* Người mới vào luôn gặp màn này trước: cho xem cẩm nang ngay, khỏi phải đặt tên. */}
      <Btn tone="mint" className="w-full py-3 text-lg" onClick={onGuide}>
        Cẩm nang · Cách chơi & nhân vật
      </Btn>
    </div>
  );
}

function HomeScreen({
  name,
  onMode,
  onOnline,
  go,
  notice,
}: {
  name: string;
  onMode: (m: Mode) => void;
  onOnline: (m: OnlineMode) => void;
  go: (s: Screen) => void;
  notice: string | null;
}) {
  const [keys, setKeys] = useState(false);
  const [help, setHelp] = useState(false);
  const [code, setCode] = useState('');
  return (
    <div className="mx-auto grid max-w-4xl items-center gap-8 pt-4 md:grid-cols-[1fr_340px]">
      <div className="flex flex-col items-center gap-4">
        <Logo />
        <p className="rounded-full border-[3px] border-[color:var(--bb-ink)] bg-white px-4 py-1 font-extrabold">
          Chào {name}!{' '}
          <button type="button" className="ml-1 underline" onClick={() => go('name')}>
            Đổi tên
          </button>
        </p>
        <div className="flex flex-wrap items-end justify-center">
          {CHARACTERS.map((d, i) => (
            <CharCanvas
              key={d.id}
              def={d}
              pose={i % 4 === 1 ? 'win' : 'walk'}
              dir={i < 4 ? 'right' : 'left'}
              size={64}
            />
          ))}
        </div>
      </div>
      <nav className="flex flex-col gap-3" aria-label="Chế độ chơi">
        <Btn tone="sun" className="py-3 text-xl" onClick={() => onMode('solo')}>
          Chơi với bot
        </Btn>
        <Btn tone="sky" className="py-3 text-xl" onClick={() => onMode('local2')}>
          2 người cùng máy
        </Btn>
        <Btn tone="coral" className="py-3 text-xl" onClick={() => onOnline({ kind: 'host' })}>
          Mời bạn (tạo phòng)
        </Btn>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (isValidCode(code)) onOnline({ kind: 'join', code });
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
            disabled={!isValidCode(code)}
            className="rounded-xl border-[3px] border-[color:var(--bb-ink)] bg-[color:var(--bb-mint)] px-4 font-extrabold shadow-[0_4px_0_var(--bb-ink)] disabled:opacity-50"
          >
            Vào
          </button>
        </form>
        <div className="grid grid-cols-2 gap-3">
          <Btn tone="mint" className="col-span-2 py-3 text-lg" onClick={() => go('guide')}>
            Cẩm nang · Cách chơi & nhân vật
          </Btn>
          <Btn tone="cream" onClick={() => go('leaderboard')}>
            Bảng xếp hạng
          </Btn>
          <Btn tone="cream" onClick={() => setKeys(true)}>
            Cài đặt
          </Btn>
          <Btn tone="sky" className="col-span-2" onClick={() => setHelp(true)}>
            Vật phẩm & kỹ năng
          </Btn>
        </div>
      </nav>
      {keys && <SettingsDialog onClose={() => setKeys(false)} />}
      {help && <HelpDialog onClose={() => setHelp(false)} />}
      {notice && (
        <div
          className={`${CARD} border-[color:var(--bb-coral)] p-3 font-bold md:col-span-2`}
          role="alert"
        >
          {notice}
        </div>
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
  const [chars, setChars] = useState(['blaze', 'fox']);
  const [editing, setEditing] = useState(0);
  const [name2, setName2] = useState('Bạn 2');
  const [bots, setBots] = useState(DEFAULT_BOTS[mode]);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [map, setMap] = useState<ThemeId | 'random'>('random');
  const [teams, setTeams] = useState(false);
  const minBots = humans === 1 ? 1 : 0;
  const maxBots = MAX_PLAYERS - humans;
  const pick = (id: string) => setChars((c) => c.map((v, i) => (i === editing ? id : v)));
  const name2Error = humans === 2 ? nameError(name2) : null;

  const start = () => {
    const theme = map === 'random' ? THEMES[Math.floor(Math.random() * THEMES.length)]!.id : map;
    onStart({
      theme,
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
                  <span
                    className="mr-1 inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: SEAT_COLORS[i] }}
                  />
                  P{i + 1}: {characterById(chars[i]!).name}
                </Btn>
              ))}
          </div>
          <div className="mt-3">
            <CharacterGrid
              value={chars[editing]!}
              onPick={pick}
              taken={humans === 2 ? chars[1 - editing] : undefined}
            />
          </div>
          <p className="mt-3 text-sm font-bold text-slate-600">
            {characterById(chars[editing]!).blurb}
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
                Mỗi người một phe
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
            {teams && (
              <p className="mt-1 text-xs font-bold text-slate-600">
                P1, P3, P5 đội Xanh · P2, P4, P6 đội Đỏ. Chạm đồng đội bị nhốt để cứu.
              </p>
            )}
          </div>
        </section>
      </div>

      <section className={`${CARD} p-4`}>
        <h3 className={`${HEADING} text-xl`}>Bản đồ</h3>
        <MapPicker value={map} onPick={setMap} />
      </section>

      <div className="flex justify-end">
        <Btn tone="sun" className="px-10 py-3 text-2xl" disabled={!!name2Error} onClick={start}>
          Bắt đầu!
        </Btn>
      </div>
    </div>
  );
}

function LeaderboardScreen({ onBack }: { onBack: () => void }) {
  const [rows, setRows] = useState<BoardEntry[]>([]);
  useEffect(() => setRows(loadBoard()), []);
  const medal = ['#ffd23f', '#cfd6df', '#e3a06b'];
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <Btn tone="cream" onClick={onBack}>
          ← Về
        </Btn>
        <h2
          className={`${DISPLAY} text-4xl text-white [-webkit-text-stroke:2px_var(--bb-ink)] [paint-order:stroke_fill]`}
        >
          Bảng xếp hạng
        </h2>
      </div>
      <p className="text-sm font-bold">
        Top {BOARD_SIZE} trên máy này — mỗi máy tự ghi kết quả của người chơi trên máy đó.
      </p>
      <div className={`${CARD} overflow-x-auto`}>
        {rows.length === 0 ? (
          <p className="p-6 text-center font-bold text-slate-600">
            Chưa có trận nào. Chơi một ván để lên bảng!
          </p>
        ) : (
          <table className="w-full text-left text-sm font-bold">
            <thead className="bg-[color:var(--bb-ink)] text-white">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Tên</th>
                <th className="px-3 py-2 text-right">Thắng</th>
                <th className="px-3 py-2 text-right">Đã hạ</th>
                <th className="px-3 py-2 text-right">Tổng điểm</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.name} className="odd:bg-white/60">
                  <td className="px-3 py-1.5">
                    <span
                      className={`${DISPLAY} inline-flex h-7 w-7 items-center justify-center rounded-full ${i < 3 ? 'border-2 border-[color:var(--bb-ink)]' : ''}`}
                      style={{ background: medal[i] }}
                    >
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-3 py-1.5">{r.name}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{r.wins}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{r.kos}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {r.score.toLocaleString('vi-VN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function BongBongBum() {
  const [screen, setScreen] = useState<Screen>('name');
  /** Màn quay về khi rời cẩm nang (mở được từ màn nhập tên hay màn chính). */
  const [guideBack, setGuideBack] = useState<Screen>('home');
  const [name, setName] = useState('');
  const [mode, setMode] = useState<Mode>('solo');
  const [config, setConfig] = useState<MatchConfig | null>(null);
  const [outcome, setOutcome] = useState<MatchOutcome | null>(null);
  const [online, setOnline] = useState<OnlineMode | null>(null);
  const [pendingRoom, setPendingRoom] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Màn loading lúc mới vào (splash.tsx tải trước ảnh nhân vật và font). Phòng online và trận chỉ
  // được dựng sau khi màn này tắt: F5 giữa phòng/trận không nối mạng hay chạy giờ sau lớp che.
  const [loaded, setLoaded] = useState(false);

  // Mở link mời (?room=MÃ): đã có tên lưu trên máy (vd: vừa bấm F5) thì vào thẳng phòng,
  // chưa có thì nhập tên xong mới vào.
  useEffect(() => {
    // Chủ phòng vừa bấm F5: mở lại đúng phòng cũ (bản lưu chỉ còn trong tab này, đóng tab là mất).
    const hosted = loadHostSave();
    const hostName = hosted?.lobby.slots[0]?.name;
    if (hosted && hostName) {
      setName(hostName);
      setOnline({ kind: 'host', resume: hosted });
      setScreen('online');
      return;
    }
    const raw = new URLSearchParams(window.location.search).get('room');
    if (raw === null) return;
    const code = normalizeCode(raw);
    if (!isValidCode(code)) {
      setNotice('Link mời không hợp lệ — kiểm tra lại mã phòng 6 ký tự.');
      return;
    }
    const saved = loadName();
    if (!nameError(saved)) {
      setName(saved.trim());
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

  const finish = (o: MatchOutcome) => {
    recordMatch(
      o.standings
        .filter((s) => o.humanIds.includes(s.player.id))
        .map((s) => ({ name: s.player.name, won: s.won, score: s.score, kos: s.player.kos })),
    );
    setOutcome(o);
    setScreen('result');
  };

  return (
    <div
      style={PALETTE_VARS}
      onPointerDown={unlockAudio}
      onKeyDown={unlockAudio}
      className="relative min-h-dvh overflow-x-hidden bg-[linear-gradient(180deg,#7fd8f7_0%,#4cc3f0_55%,#2a8fd6_100%)] font-['Nunito',sans-serif] text-[color:var(--bb-ink)]"
    >
      <link rel="stylesheet" href={FONT_URL} precedence="default" />
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {[
          [8, 18, 60],
          [86, 12, 90],
          [72, 64, 50],
          [14, 78, 80],
          [48, 40, 30],
        ].map(([l, t, s], i) => (
          <span
            key={i}
            className="absolute rounded-full border-[3px] border-white/50 bg-white/15"
            style={{ left: `${l}%`, top: `${t}%`, width: s, height: s }}
          />
        ))}
      </div>

      {screen !== 'match' && (
        <header className="relative z-10 border-b-[3px] border-[color:var(--bb-ink)] bg-[color:var(--bb-night)] text-white">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2">
            <Link href="/games" className="text-sm font-extrabold text-white/80 hover:text-white">
              ← Games
            </Link>
            <span className={`${DISPLAY} text-lg`}>Bomb Arena</span>
          </div>
        </header>
      )}

      {!loaded && <Splash onDone={() => setLoaded(true)} />}
      <main hidden={!loaded} className="relative z-10 px-4 py-6">
        {screen === 'name' && (
          <NameScreen
            onDone={(n) => {
              setName(n);
              if (pendingRoom) openOnline({ kind: 'join', code: pendingRoom });
              else setScreen('home');
            }}
            onGuide={() => {
              setGuideBack('name');
              setScreen('guide');
            }}
          />
        )}
        {screen === 'home' && (
          <HomeScreen
            name={name}
            go={(s) => {
              if (s === 'guide') setGuideBack('home');
              setScreen(s);
            }}
            notice={notice}
            onOnline={openOnline}
            onMode={(m) => {
              setMode(m);
              setScreen('setup');
            }}
          />
        )}
        {loaded && screen === 'online' && online && (
          <OnlineRoom mode={online} name={name} charId={CHARACTERS[0]!.id} onExit={leaveOnline} />
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
            onHome={() => setScreen('setup')}
          />
        )}
        {screen === 'leaderboard' && <LeaderboardScreen onBack={() => setScreen('home')} />}
        {screen === 'guide' && <GuideScreen onBack={() => setScreen(guideBack)} />}
      </main>

      {loaded && screen === 'match' && config && (
        <MatchScreen
          key={config.seed}
          config={config}
          onEnd={finish}
          onQuit={() => setScreen('setup')}
        />
      )}
    </div>
  );
}
