'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sfx, startMusic, stopMusic, unlockAudio } from '../bong-bong-bum/audio';
import type { Dir } from '../bong-bong-bum/map';
import { Joystick, startTicker } from '../bong-bong-bum/match';
import { Btn, CARD, DISPLAY, SettingsDialog } from '../bong-bong-bum/ui';
import type { ArenaId } from './arenas';
import { createBrain, think, type Brain, type Difficulty } from './bot';
import {
  coverage,
  createMatch,
  FINAL_AT,
  FIRE_COOLDOWN,
  floorCells,
  MAX_AMMO,
  NO_INPUT,
  standings,
  step,
  TICK,
  type Input,
  type Match,
  type Player,
  type PlayerSetup,
  type Standing,
} from './engine';
import { replayOwn, takeQueued, type Pending, type Queued } from './net';
import { SQUAD, teamColors } from './squad';
import { createArenaView, type Pose } from './view3d';

// Màn trong trận: nối bàn phím / cần điều khiển và bot vào engine, vẽ sân 3D mỗi khung hình.
// Cùng cách bố trí và điều khiển với Bomb Arena để người chơi đã quen game kia khỏi học lại.

export type MatchConfig = {
  arena: ArenaId;
  teams: boolean;
  difficulty: Difficulty;
  humans: { name: string; charId: string }[];
  bots: number;
  /** Đổi mỗi trận để React dựng lại màn trận mới khi bấm "Chơi lại". */
  seed: number;
  /** Danh sách người chơi cố định (trận qua mạng: chủ phòng đã chốt ai ngồi chỗ nào). */
  roster?: PlayerSetup[];
};
export type MatchOutcome = { standings: Standing[]; humanIds: number[]; winnerTeam: number | null };

/** Nối màn trận với phòng mạng (online.tsx giữ kết nối và cập nhật các ref này). */
export type HostLink = {
  role: 'host';
  /** Hàng đợi phím theo nhịp của từng người chơi ở máy khác (theo id). */
  queues: Map<number, Queued[]>;
  /** Số thứ tự phím cuối cùng đã dùng của từng người, gửi kèm ảnh chụp. */
  acks: Map<number, number>;
  lastDir: Map<number, Dir | null>;
  /** Trận đang chạy, để phòng đổi người rớt mạng thành bot (p.bot = true). */
  match: { current: Match | null };
  broadcast: (m: Match) => void;
  end: (o: MatchOutcome) => void;
};
export type ClientLink = {
  role: 'client';
  you: number;
  /** Hai ảnh chụp gần nhất từ chủ phòng để nội suy chuyển động của người khác. */
  snaps: { current: { prev: Match | null; last: Match | null; lastAt: number; ack: number } };
  sendInput: (seq: number, i: Input) => void;
};
export type NetLink = HostLink | ClientLink;

/** Gửi ảnh chụp cho máy khách 20 lần mỗi giây. */
const SNAP_INTERVAL = 0.05;
/** Máy khách giữ tối đa chừng này phím chưa xác nhận (2 giây) — quá nữa là mạng đã đứt. */
const MAX_PENDING = 120;

/** Vị trí người khác trên máy khách: nội suy giữa hai ảnh chụp gần nhất. */
function interpolate(prev: Match | null, last: Match, alpha: number): Match {
  if (!prev) return last;
  return {
    ...last,
    players: last.players.map((p) => {
      const q = prev.players[p.id];
      if (!q || Math.abs(q.x - p.x) + Math.abs(q.y - p.y) > 2) return p;
      return { ...p, x: q.x + (p.x - q.x) * alpha, y: q.y + (p.y - q.y) * alpha };
    }),
  };
}

const KEYS_P1: Record<string, Dir> = { KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right' };
const KEYS_P2: Record<string, Dir> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};
const FIRE_P1 = new Set(['Space']);
const FIRE_P2 = new Set(['Enter', 'NumpadEnter']);
/** Hết giờ rồi chờ chừng này giây cho người thắng nhảy ăn mừng mới sang màn kết quả. */
const OUTRO = 2.2;
/** Dáng "vừa bắn" kéo dài bấy nhiêu giây sau khi bóp cò. */
const FIRE_POSE = 0.2;

function botRoster(humans: { name: string; charId: string }[], bots: number): PlayerSetup[] {
  // Mỗi người một nhân vật khác nhau: chơi mỗi người một phe thì màu sơn cũng không trùng.
  const taken = new Set(humans.map((h) => h.charId));
  const pool = SQUAD.filter((c) => !taken.has(c.id)).sort(() => Math.random() - 0.5);
  const botPlayers = pool
    .slice(0, bots)
    .map((def) => ({ name: `Bot ${def.name}`, charId: def.id, bot: true }));
  return [...humans.map((h) => ({ ...h, bot: false })), ...botPlayers];
}

function poseOf(m: Match, p: Player): Pose {
  if (m.over) return p.team === m.winnerTeam ? 'win' : 'idle';
  if (p.stunT > 0) return 'hit';
  if (p.cooldown > FIRE_COOLDOWN - FIRE_POSE) return 'fire';
  return p.moving ? 'walk' : 'idle';
}

type Hud = {
  time: number;
  colors: string[];
  /** Phần trăm sàn của từng phe, theo thứ tự phe. */
  shares: { team: number; share: number }[];
  players: { id: number; name: string; team: number; ammo: number; stunned: boolean }[];
};
function hudOf(m: Match): Hud {
  const total = floorCells(m);
  return {
    time: m.time,
    colors: teamColors(m),
    shares: [...coverage(m)]
      .sort(([a], [b]) => a - b)
      .map(([team, n]) => ({ team, share: total ? n / total : 0 })),
    players: m.players.map((p) => ({
      id: p.id,
      name: p.name,
      team: p.team,
      ammo: p.ammo,
      stunned: p.stunT > 0,
    })),
  };
}

/** So hai khung hình để phát tiếng: bắn, trúng, 10 giây cuối, hết trận. */
type SoundSnap = { shots: Set<number>; stunned: boolean[]; time: number; over: boolean };
const soundSnap = (m: Match): SoundSnap => ({
  shots: new Set(m.shots.map((s) => s.id)),
  stunned: m.players.map((p) => p.stunT > 0),
  time: m.time,
  over: m.over,
});
function playDiff(prev: SoundSnap, m: Match, humanIds: number[]) {
  if (m.shots.some((s) => !prev.shots.has(s.id))) sfx.place();
  if (m.players.some((p, i) => p.stunT > 0 && !prev.stunned[i])) sfx.trap();
  if (prev.time > FINAL_AT && m.time <= FINAL_AT) sfx.sudden();
  if (!prev.over && m.over) {
    stopMusic();
    const humanWon = m.players.some((p) => humanIds.includes(p.id) && p.team === m.winnerTeam);
    if (humanWon) sfx.win();
    else sfx.lose();
  }
}

const fmt = (t: number) =>
  `${Math.floor(Math.ceil(t) / 60)}:${String(Math.ceil(t) % 60).padStart(2, '0')}`;
const pct = (share: number) => `${Math.round(share * 100)}%`;

export function MatchScreen({
  config,
  net,
  onEnd,
  onQuit,
}: {
  config: MatchConfig;
  net?: NetLink;
  onEnd: (o: MatchOutcome) => void;
  onQuit: () => void;
}) {
  const match = useMemo(
    () =>
      createMatch({
        arena: config.arena,
        teams: config.teams,
        players: config.roster ?? botRoster(config.humans, config.bots),
      }),
    [config],
  );
  const online = !!net;
  /** Id người chơi điều khiển trên máy này, theo thứ tự P1, P2. */
  const localIds = useMemo(
    () => (net?.role === 'client' ? [net.you] : online ? [0] : config.humans.map((_, i) => i)),
    [net, online, config.humans],
  );

  const [hud, setHud] = useState<Hud>(() => hudOf(match));
  const [paused, setPaused] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [touch, setTouch] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const held = useRef<Dir[][]>([[], []]);
  const firePress = useRef<boolean[]>([false, false]);
  const touchDir = useRef<Dir | null>(null);
  const pausedRef = useRef(false);
  // Trận qua mạng không tạm dừng được; menu vẫn mở được để chỉnh âm lượng hoặc rời phòng.
  pausedRef.current = !online && (paused || showKeys);
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  useEffect(() => {
    setTouch(window.matchMedia('(pointer: coarse)').matches);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const solo = localIds.length === 1;
    const route = (code: string): [number, Dir | 'fire'] | null => {
      if (code in KEYS_P1) return [0, KEYS_P1[code]!];
      if (FIRE_P1.has(code)) return [0, 'fire'];
      if (code in KEYS_P2) return [solo ? 0 : 1, KEYS_P2[code]!];
      if (FIRE_P2.has(code)) return [solo ? 0 : 1, 'fire'];
      return null;
    };
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        setPaused((p) => !p);
        return;
      }
      const r = route(e.code);
      if (!r) return;
      e.preventDefault();
      if (e.repeat) return;
      const [who, act] = r;
      if (act === 'fire') firePress.current[who] = true;
      else held.current[who] = [...held.current[who]!.filter((d) => d !== act), act];
    };
    const up = (e: KeyboardEvent) => {
      const r = route(e.code);
      if (r && r[1] !== 'fire') held.current[r[0]] = held.current[r[0]]!.filter((d) => d !== r[1]);
    };
    const blur = () => {
      held.current = [[], []];
      touchDir.current = null;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, [localIds]);

  useEffect(() => {
    const cv = canvasRef.current;
    const box = boardRef.current;
    if (!cv || !box) return;
    const arena = createArenaView(cv, match);
    // Khung sân lấp đầy phần màn hình còn lại; camera tự lùi cho cả sân lọt khung.
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry!.contentRect;
      arena.resize(Math.floor(width), Math.floor(height));
    });
    ro.observe(box);
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let frame = 0;
    let hudT = 0;
    let outro = 0;
    let ended = false;
    const brains = new Map<number, Brain>();
    let snap = soundSnap(match);
    let view = match;
    unlockAudio();
    startMusic();
    if (net?.role === 'host') net.match.current = match;

    const localInput = (slot: number): Input => {
      const keys = held.current[slot]!;
      const dir = keys[keys.length - 1] ?? (slot === 0 ? touchDir.current : null);
      const fire = firePress.current[slot]!;
      firePress.current[slot] = false;
      return { dir, fire };
    };
    const inputFor = (p: Player): Input => {
      const slot = localIds.indexOf(p.id);
      if (slot >= 0) return localInput(slot);
      if (p.bot) {
        let brain = brains.get(p.id);
        if (!brain) brains.set(p.id, (brain = createBrain(config.difficulty)));
        return think(brain, match, p, TICK);
      }
      if (net?.role !== 'host') return NO_INPUT;
      const { input, seq: used } = takeQueued(net.queues.get(p.id), net.lastDir.get(p.id) ?? null);
      if (used !== null) {
        net.acks.set(p.id, used);
        net.lastDir.set(p.id, input.dir);
      }
      return input;
    };

    const finish = () => {
      ended = true;
      const outcome: MatchOutcome = {
        standings: standings(match),
        humanIds: match.players.filter((p) => !p.bot).map((p) => p.id),
        winnerTeam: match.winnerTeam,
      };
      if (net?.role === 'host') net.end(outcome);
      onEndRef.current({ ...outcome, humanIds: localIds });
    };

    /** Chạy mô phỏng thêm `dt` giây (chơi trên máy và chủ phòng). */
    let snapT = 0;
    const simulate = (dt: number) => {
      if (pausedRef.current) return;
      acc += dt;
      while (acc >= TICK) {
        step(match, match.players.map(inputFor));
        acc -= TICK;
      }
      if (net?.role === 'host') {
        snapT -= dt;
        if (snapT <= 0) {
          snapT = SNAP_INTERVAL;
          net.broadcast(match);
        }
      }
      if (match.over && !ended) {
        outro += dt;
        if (outro >= OUTRO) finish();
      }
    };

    // Máy khách: phím đã gửi mà chủ phòng chưa xác nhận, để phát lại trên vị trí chuẩn.
    let seq = 0;
    const pending: Pending[] = [];
    const clientTick = (dt: number, now: number) => {
      if (net?.role !== 'client') return;
      const box = net.snaps.current;
      if (!box.last) return;
      for (acc += dt; acc >= TICK; acc -= TICK) {
        const input = localInput(0);
        net.sendInput(++seq, input);
        pending.push({ seq, dir: input.dir });
      }
      while (pending.length && pending[0]!.seq <= box.ack) pending.shift();
      if (pending.length > MAX_PENDING) pending.splice(0, pending.length - MAX_PENDING);
      const mine = replayOwn(box.last, net.you, pending);
      const alpha = Math.min(1, (now - box.lastAt) / (SNAP_INTERVAL * 1000));
      const v = interpolate(box.prev, box.last, alpha);
      view = mine ? { ...v, players: v.players.map((p) => (p.id === net.you ? mine : p)) } : v;
    };

    // Chủ phòng: mô phỏng chạy theo nhịp riêng trong Web Worker, vì trình duyệt dừng
    // requestAnimationFrame khi tab bị ẩn — trận của mọi người sẽ đứng im.
    let stopTicker: (() => void) | null = null;
    if (net?.role === 'host') {
      let simLast = performance.now();
      stopTicker = startTicker(() => {
        const now = performance.now();
        simulate(Math.min(0.25, (now - simLast) / 1000));
        simLast = now;
      });
    }

    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (net?.role === 'client') clientTick(dt, now);
      else if (net?.role !== 'host') simulate(dt);
      if (net?.role !== 'client') view = match;
      playDiff(snap, view, localIds);
      snap = soundSnap(view);
      hudT -= dt;
      if (hudT <= 0) {
        hudT = 0.1;
        setHud(hudOf(view));
      }
      const shown = view;
      arena.render(
        shown,
        shown.players.map((p) => poseOf(shown, p)),
        frame++,
      );
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      stopTicker?.();
      ro.disconnect();
      arena.dispose();
      stopMusic();
      if (net?.role === 'host') net.match.current = null;
    };
  }, [match, localIds, net, config.difficulty]);

  const setTouchDir = useCallback((d: Dir | null) => {
    touchDir.current = d;
  }, []);

  const me = hud.players.find((p) => p.id === localIds[0]);
  const final = hud.time <= FINAL_AT;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[linear-gradient(180deg,#7fd8f7_0%,#2a8fd6_100%)] pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      {/* Thanh trên: đồng hồ, thanh lãnh địa, tạm dừng */}
      <div className="flex shrink-0 items-center gap-2 px-2 py-1.5">
        <div
          className={`${CARD} flex items-center px-2.5 py-0.5 ${final ? 'animate-pulse bg-[color:var(--bb-coral)] text-white' : ''}`}
        >
          <span className={`${DISPLAY} text-2xl leading-none tabular-nums`}>{fmt(hud.time)}</span>
        </div>
        <div
          className="flex h-8 min-w-0 flex-1 overflow-hidden rounded-full border-[3px] border-[color:var(--bb-ink)] bg-white shadow-[0_3px_0_var(--bb-ink)]"
          role="img"
          aria-label={`Lãnh địa: ${hud.shares.map((s) => pct(s.share)).join(', ')}`}
        >
          {hud.shares.map((s) => (
            <span
              key={s.team}
              className="flex items-center justify-center overflow-hidden text-xs font-extrabold text-[color:var(--bb-ink)] transition-[width] duration-300"
              style={{ width: `${s.share * 100}%`, background: hud.colors[s.team] }}
            >
              {s.share >= 0.06 && pct(s.share)}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setPaused(true)}
          className="h-9 shrink-0 rounded-lg border-[3px] border-[color:var(--bb-ink)] bg-white px-2.5 font-extrabold shadow-[0_3px_0_var(--bb-ink)]"
          aria-label="Tạm dừng"
        >
          ❚❚
        </button>
      </div>

      <div className="flex min-h-0 flex-1 portrait:flex-col landscape:flex-row">
        <div ref={boardRef} className="relative min-h-0 min-w-0 flex-1">
          <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />
        </div>

        {/* Cột người chơi (màn lớn) */}
        <aside
          className="hidden w-56 shrink-0 flex-col gap-1.5 overflow-y-auto p-2 lg:flex"
          aria-label="Người chơi"
        >
          {hud.players.map((p) => (
            <div
              key={p.id}
              className={`${CARD} flex items-center gap-2 p-2 ${p.stunned ? 'bg-[#ffe3e3]' : ''}`}
              style={{ borderLeftColor: hud.colors[p.team]!, borderLeftWidth: 8 }}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold">
                  {p.name}
                  {localIds.includes(p.id) && <span className="text-slate-500"> (bạn)</span>}
                </p>
                <p className="flex items-center gap-1 text-xs font-extrabold text-slate-600">
                  {p.stunned ? 'Đứng hình!' : 'Sơn'}
                  {!p.stunned && <AmmoDots ammo={p.ammo} color={hud.colors[p.team]!} />}
                </p>
              </div>
            </div>
          ))}
        </aside>

        {touch && (
          <div className="pointer-events-none flex shrink-0 items-center justify-between px-4 portrait:h-40 landscape:absolute landscape:inset-x-3 landscape:bottom-3">
            <Joystick onDir={setTouchDir} />
            <div className="pointer-events-auto flex flex-col items-center gap-1">
              {me && (
                <span className="flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-extrabold">
                  Sơn <AmmoDots ammo={me.ammo} color={hud.colors[me.team]!} />
                </span>
              )}
              <button
                type="button"
                className={`${DISPLAY} h-[84px] w-[84px] touch-none select-none rounded-full border-[4px] border-[color:var(--bb-ink)] text-xl font-extrabold shadow-[0_5px_0_var(--bb-ink)] active:translate-y-[3px]`}
                style={{ background: me ? hud.colors[me.team]! : undefined }}
                onPointerDown={(e) => {
                  e.preventDefault();
                  firePress.current[0] = true;
                }}
              >
                Bắn!
              </button>
            </div>
          </div>
        )}
      </div>

      {paused && !showKeys && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[color:var(--bb-ink)]/60 p-4">
          <div className={`${CARD} flex w-full max-w-xs flex-col gap-3 p-5 text-center`}>
            <p className={`${DISPLAY} text-4xl`}>Tạm dừng</p>
            {online && (
              <p className="text-sm font-bold text-slate-600">
                Trận qua mạng vẫn chạy tiếp trong lúc mở menu.
              </p>
            )}
            <Btn tone="sun" onClick={() => setPaused(false)}>
              Tiếp tục
            </Btn>
            <Btn tone="cream" onClick={() => setShowKeys(true)}>
              Âm lượng & phím
            </Btn>
            <Btn tone="cream" onClick={() => setTouch((t) => !t)}>
              Nút cảm ứng: {touch ? 'Hiện' : 'Ẩn'}
            </Btn>
            <Btn tone="coral" onClick={onQuit}>
              {net?.role === 'host' ? 'Đóng phòng' : online ? 'Rời phòng' : 'Bỏ trận'}
            </Btn>
          </div>
        </div>
      )}
      {showKeys && (
        <SettingsDialog
          actionLabel="Bắn sơn"
          actionButton="Bắn!"
          onClose={() => setShowKeys(false)}
        />
      )}
    </div>
  );
}

function AmmoDots({ ammo, color }: { ammo: number; color: string }) {
  return (
    <span className="flex gap-0.5" aria-label={`${ammo}/${MAX_AMMO} viên sơn`}>
      {Array.from({ length: MAX_AMMO }, (_, i) => (
        <span
          key={i}
          className="h-2.5 w-2.5 rounded-full border-2 border-[color:var(--bb-ink)]"
          style={{ background: i < ammo ? color : 'transparent' }}
        />
      ))}
    </span>
  );
}
