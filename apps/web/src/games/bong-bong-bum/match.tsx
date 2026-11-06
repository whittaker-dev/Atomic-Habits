'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { sfx, startMusic, stopMusic, unlockAudio } from './audio';
import { createBrain, think, type Brain, type Difficulty } from './bot';
import { CHARACTERS, characterById } from './characters';
import { drawScene, type Pose, type Scene, type SceneEffect } from './draw';
import {
  BLAST_TIME,
  createMatch,
  FUSE,
  NO_INPUT,
  SAFE_AFTER_REVIVE,
  standings,
  step,
  SUDDEN_AT,
  TICK,
  TRAP_TIME,
  type Input,
  type Match,
  type Player,
  type PlayerSetup,
  type Standing,
} from './engine';
import { COLS, ROWS, themeById, VEC, type Dir, type ThemeId } from './map';
import { SEAT_COLORS } from './palette';
import { replayOwn, takeQueued, type Pending } from './predict';
import {
  ART_CELL,
  Btn,
  CARD,
  CharCanvas,
  DISPLAY,
  HelpDialog,
  ItemIcon,
  SettingsDialog,
} from './ui';

// Màn trong trận: vòng lặp cố định 60 bước/giây, bàn phím cho 1–2 người, cần điều khiển cảm ứng,
// bản đồ co giãn lấp đầy màn hình. Logic nằm ở engine.ts; file này chỉ nối input → engine → vẽ.

export type MatchConfig = {
  theme: ThemeId;
  teams: boolean;
  difficulty: Difficulty;
  humans: { name: string; charId: string }[];
  bots: number;
  seed: number;
  /** Danh sách người chơi cố định (trận qua mạng: chủ phòng đã chốt ai ngồi chỗ nào). */
  roster?: PlayerSetup[];
  /** Trận đã lưu để chơi tiếp (chủ phòng vừa tải lại trang). */
  resume?: Match;
};

/** Nối màn trận với phòng mạng. Phòng (online.tsx) giữ kết nối và cập nhật các ref này. */
export type HostLink = {
  role: 'host';
  /** Hàng đợi phím theo nhịp của từng người chơi ở máy khác (theo id), mỗi nhịp mô phỏng dùng một phím. */
  queues: Map<number, { seq: number; input: Input }[]>;
  /** Số thứ tự phím cuối cùng đã dùng của từng người, gửi kèm ảnh chụp để khách phát lại phần còn lại. */
  acks: Map<number, number>;
  /** Hướng gần nhất của từng người — dùng tiếp khi hàng đợi tạm trống (mạng giật). */
  lastDir: Map<number, Dir | null>;
  /** Trận đang chạy, để phòng đổi người rớt mạng thành bot (p.bot = true) và trả lại khi họ vào lại. */
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
export type MatchOutcome = { standings: Standing[]; humanIds: number[]; winnerTeam: number | null };

const KEYS_P1: Record<string, Dir> = { KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right' };
const KEYS_P2: Record<string, Dir> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};
const BOMB_P1 = new Set(['Space']);
const BOMB_P2 = new Set(['Enter', 'NumpadEnter']);
/** Sau khi trận kết thúc, chờ chừng này giây cho người thắng nhảy ăn mừng rồi mới sang màn kết quả. */
const OUTRO = 2.2;

/** Gửi ảnh chụp cho máy khách 20 lần mỗi giây. */
const SNAP_INTERVAL = 0.05;
/** Máy khách: giữ tối đa chừng này phím chưa xác nhận (2 giây) — quá nữa là mạng đã đứt. */
const MAX_PENDING = 120;

export function botRoster(humans: { name: string; charId: string }[], bots: number): PlayerSetup[] {
  const taken = new Set(humans.map((h) => h.charId));
  const pool = CHARACTERS.filter((c) => !taken.has(c.id)).sort(() => Math.random() - 0.5);
  const botPlayers = Array.from({ length: bots }, (_, i) => {
    const def = pool[i % pool.length] ?? CHARACTERS[i % CHARACTERS.length]!;
    return { name: `Bot ${def.name}`, charId: def.id, bot: true };
  });
  return [...humans.map((h) => ({ ...h, bot: false })), ...botPlayers];
}

function setupMatch(cfg: MatchConfig): Match {
  if (cfg.resume) return cfg.resume;
  return createMatch({
    theme: cfg.theme,
    seed: cfg.seed,
    teams: cfg.teams,
    players: cfg.roster ?? botRoster(cfg.humans, cfg.bots),
  });
}

/**
 * Nhịp ~60 lần/giây không bị dừng khi tab ẩn: hẹn giờ trong Web Worker không bị trình duyệt bóp
 * như hẹn giờ ở luồng chính. Không tạo được worker thì lùi về setInterval (vẫn chạy, chỉ chậm hơn khi ẩn).
 */
export function startTicker(onTick: () => void): () => void {
  try {
    const src = 'setInterval(() => postMessage(0), 1000 / 60);';
    const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
    const worker = new Worker(url);
    worker.onmessage = onTick;
    return () => {
      worker.terminate();
      URL.revokeObjectURL(url);
    };
  } catch {
    const id = setInterval(onTick, 1000 / 60);
    return () => clearInterval(id);
  }
}

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

/** Dáng "trúng nổ" và "đặt bom" kéo dài bấy nhiêu giây, suy ra từ trạng thái trận nên máy khách mạng cũng thấy. */
const HIT_POSE = 0.4;
const BOMB_POSE = 0.3;

function poseOf(m: Match, p: Player): Pose {
  if (m.over && p.team === m.winnerTeam) return 'win';
  if (p.state === 'trapped') return p.trapT > TRAP_TIME - HIT_POSE ? 'hit' : 'trapped';
  // safeT chỉ vượt SAFE_AFTER_REVIVE - HIT_POSE ngay sau khi dùng mạng phụ (được cứu chỉ có 1 giây).
  if (p.safeT > SAFE_AFTER_REVIVE - HIT_POSE) return 'hit';
  if (m.bombs.some((b) => b.owner === p.id && FUSE - b.t < BOMB_POSE)) return 'bomb';
  return p.moving ? 'walk' : 'idle';
}

/** Phân thân dùng màu chỗ ngồi của chủ. */
const seatOf = (m: Match, id: number) => m.players[id]?.cloneOf ?? id;

function toScene(m: Match): Scene {
  return {
    theme: themeById(m.theme),
    tiles: m.tiles,
    bombs: m.bombs.map((b) => ({ x: b.x, y: b.y, seat: seatOf(m, b.owner), age: FUSE - b.t })),
    blasts: m.blasts.map((bl) => ({ ...bl, age: BLAST_TIME - bl.t })),
    items: m.items,
    holes: m.holes,
    players: m.players
      .filter((p) => p.state !== 'out')
      .map((p) => ({
        x: p.x,
        y: p.y,
        def: characterById(p.charId),
        dir: p.dir,
        pose: poseOf(m, p),
        seat: seatOf(m, p.id),
        ghost: p.cloneOf !== null,
        trapLeft: p.state === 'trapped' ? p.trapT : undefined,
        shield: p.shieldT > 0,
      })),
  };
}

type Hud = {
  time: number;
  players: {
    id: number;
    name: string;
    charId: string;
    state: string;
    bombs: number;
    range: number;
    needles: number;
    team: number;
  }[];
};
const hudOf = (m: Match): Hud => ({
  time: m.time,
  players: m.players
    .filter((p) => p.cloneOf === null)
    .map((p) => ({
      id: p.id,
      name: p.name,
      charId: p.charId,
      state: p.state,
      bombs: p.bombs,
      range: p.range,
      needles: p.needles,
      team: p.team,
    })),
});

/** Ảnh chụp gọn để so giữa hai khung hình và phát tiếng đúng lúc. So trạng thái thay vì để engine
 *  phát sự kiện, nên máy khách mạng (chỉ nhận ảnh chụp từ chủ phòng) cũng phát tiếng y như vậy. */
type SoundSnap = {
  bombs: Set<number>;
  blasts: number;
  states: string[];
  items: number[];
  time: number;
  over: boolean;
};
const soundSnap = (m: Match): SoundSnap => ({
  bombs: new Set(m.bombs.map((b) => b.id)),
  blasts: m.blasts.length,
  states: m.players.map((p) => p.state),
  items: m.players.map((p) => p.items),
  time: m.time,
  over: m.over,
});

function playDiff(prev: SoundSnap, m: Match, humanIds: number[]) {
  if (m.bombs.some((b) => !prev.bombs.has(b.id))) sfx.place();
  if (m.blasts.length > prev.blasts) sfx.boom();
  m.players.forEach((p, i) => {
    const was = prev.states[i];
    if (was === 'alive' && p.state === 'trapped') sfx.trap();
    else if (was === 'trapped' && p.state === 'alive') sfx.free();
    else if (was !== 'out' && p.state === 'out') sfx.out();
    if (p.items > prev.items[i]!) sfx.pickup();
  });
  if (prev.time > SUDDEN_AT && m.time <= SUDDEN_AT) sfx.sudden();
  if (!prev.over && m.over) {
    stopMusic();
    const humanWon =
      m.winnerTeam !== null &&
      m.players.some((p) => humanIds.includes(p.id) && p.team === m.winnerTeam);
    if (humanWon) sfx.win();
    else sfx.lose();
  }
}

const fmt = (t: number) =>
  `${Math.floor(Math.ceil(t) / 60)}:${String(Math.ceil(t) % 60).padStart(2, '0')}`;

/** Cần điều khiển 4 hướng: chạm và kéo trong vòng tròn, hướng theo góc so với tâm. */
export function Joystick({ onDir }: { onDir: (d: Dir | null) => void }) {
  const [knob, setKnob] = useState<[number, number]>([0, 0]);
  const active = useRef<number | null>(null);
  const update = (e: ReactPointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const max = r.width / 2 - 18;
    const len = Math.hypot(dx, dy);
    const k = len > max ? max / len : 1;
    setKnob([dx * k, dy * k]);
    if (len < 10) return onDir(null);
    onDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
  };
  const end = () => {
    active.current = null;
    setKnob([0, 0]);
    onDir(null);
  };
  return (
    <div
      className="pointer-events-auto relative h-[118px] w-[118px] touch-none select-none rounded-full border-[3px] border-[color:var(--bb-ink)]/70 bg-white/35 backdrop-blur-[2px]"
      onPointerDown={(e) => {
        active.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e);
      }}
      onPointerMove={(e) => active.current === e.pointerId && update(e)}
      onPointerUp={end}
      onPointerCancel={end}
      aria-label="Cần điều khiển"
    >
      {(['▲', '▶', '▼', '◀'] as const).map((a, i) => (
        <span
          key={a}
          className="absolute text-xs text-[color:var(--bb-ink)]/60"
          style={{
            left: '50%',
            top: '50%',
            transform: `translate(-50%,-50%) rotate(${i * 90}deg) translateY(-44px) rotate(${-i * 90}deg)`,
          }}
        >
          {a}
        </span>
      ))}
      <span
        className="absolute left-1/2 top-1/2 h-12 w-12 rounded-full border-[3px] border-[color:var(--bb-ink)] bg-white shadow-[0_3px_0_var(--bb-ink)]"
        style={{ transform: `translate(calc(-50% + ${knob[0]}px), calc(-50% + ${knob[1]}px))` }}
      />
    </div>
  );
}

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
  // Trên máy khách đây chỉ là trạng thái ban đầu để vẽ khung; trạng thái thật đến từ ảnh chụp của chủ phòng.
  const match = useMemo(() => setupMatch(config), [config]);
  const online = !!net;
  /** Id người chơi điều khiển trên máy này, theo thứ tự P1, P2. */
  const localIds = useMemo(
    () =>
      net?.role === 'client'
        ? [net.you]
        : Array.from({ length: online ? 1 : config.humans.length }, (_, i) => i),
    [net, online, config.humans.length],
  );

  const [hud, setHud] = useState<Hud>(() => hudOf(match));
  const [paused, setPaused] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [touch, setTouch] = useState(false);
  const [boardSize, setBoardSize] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const held = useRef<Dir[][]>([[], []]);
  const bombPress = useRef<boolean[]>([false, false]);
  const touchDir = useRef<Dir | null>(null);
  const pausedRef = useRef(false);
  // Trận qua mạng không tạm dừng được (spec: chỉ khi chơi với bot); menu vẫn mở được để chỉnh âm lượng.
  pausedRef.current = !online && (paused || showKeys || showHelp);
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

  // Bản đồ luôn lớn nhất có thể trong khung còn lại, giữ đúng tỉ lệ 15×13.
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry!.contentRect;
      setBoardSize(Math.floor(Math.min(width, (height * COLS) / ROWS)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // --- Bàn phím: hướng bấm sau cùng (còn giữ) được ưu tiên, giống game xưa ---
  useEffect(() => {
    const solo = localIds.length === 1;
    const route = (code: string): [number, Dir | 'bomb'] | null => {
      if (code in KEYS_P1) return [0, KEYS_P1[code]!];
      if (BOMB_P1.has(code)) return [0, 'bomb'];
      if (code in KEYS_P2) return [solo ? 0 : 1, KEYS_P2[code]!];
      if (BOMB_P2.has(code)) return [solo ? 0 : 1, 'bomb'];
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
      if (act === 'bomb') bombPress.current[who] = true;
      else held.current[who] = [...held.current[who]!.filter((d) => d !== act), act];
    };
    const up = (e: KeyboardEvent) => {
      const r = route(e.code);
      if (r && r[1] !== 'bomb') held.current[r[0]] = held.current[r[0]]!.filter((d) => d !== r[1]);
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

  // --- Vòng lặp: bước cố định 1/60 giây, vẽ mỗi khung hình ---
  useEffect(() => {
    const cv = canvasRef.current;
    const c = cv?.getContext('2d');
    if (!cv || !c) return;
    cv.width = COLS * ART_CELL;
    cv.height = ROWS * ART_CELL;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let frame = 0;
    let hudT = 0;
    let snapT = 0;
    let outro = 0;
    let ended = false;
    let view = match;
    // Bộ não bot theo id người chơi; phân thân và người rớt mạng cần bot giữa trận nên được tạo khi cần.
    const brains = new Map<number, Brain>();
    let snap = soundSnap(view);
    // Hiệu ứng chạy (bụi, dấu chân, vệt lấp lánh) sinh ra từ chính hình đang vẽ, nên máy khách mạng cũng có.
    let effects: SceneEffect[] = [];
    const trailT = new Map<number, number>();
    const strides = new Map<number, number>();
    const spawnTrails = (dt: number) => {
      for (const e of effects) e.age += dt;
      effects = effects.filter((e) => e.age < e.life);
      for (const p of view.players) {
        if (p.state !== 'alive' || !p.moving) continue;
        const def = characterById(p.charId);
        let t = (trailT.get(p.id) ?? 0) - dt;
        if (t <= 0) {
          t = def.flies ? 0.07 : 0.12;
          const [vx, vy] = VEC[p.dir];
          if (def.flies) {
            effects.push({
              kind: 'spark',
              x: p.x - vx * 0.25 + (Math.random() - 0.5) * 0.35,
              y: p.y + 0.15 - vy * 0.25 + Math.random() * 0.15,
              age: 0,
              life: 0.6,
              angle: 0,
            });
          } else {
            effects.push({
              kind: 'dust',
              x: p.x - vx * 0.25 + (Math.random() - 0.5) * 0.1,
              y: p.y + 0.3,
              age: 0,
              life: 0.45,
              angle: 0,
            });
            const n = (strides.get(p.id) ?? 0) + 1;
            strides.set(p.id, n);
            if (n % 2 === 0) {
              // Trái rồi phải, lệch sang hai bên hướng đi.
              const side = (n / 2) % 2 ? 0.12 : -0.12;
              effects.push({
                kind: 'print',
                x: p.x + vy * side,
                y: p.y + 0.3 - vx * side,
                age: 0,
                life: 1.4,
                angle: Math.atan2(vy, vx),
              });
            }
          }
        }
        trailT.set(p.id, t);
      }
      if (effects.length > 240) effects = effects.slice(-240);
    };
    unlockAudio();
    startMusic();
    if (net?.role === 'host') net.match.current = match;

    const localInput = (slot: number): Input => {
      const keys = held.current[slot]!;
      const dir = keys[keys.length - 1] ?? (slot === 0 ? touchDir.current : null);
      const bomb = bombPress.current[slot]!;
      bombPress.current[slot] = false;
      return { dir, bomb };
    };
    const inputFor = (p: Match['players'][number]): Input => {
      const slot = localIds.indexOf(p.id);
      if (slot >= 0) return localInput(slot);
      if (p.bot) {
        let brain = brains.get(p.id);
        if (!brain)
          brains.set(
            p.id,
            (brain = createBrain(p.cloneOf === null ? config.difficulty : 'medium')),
          );
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

    // Máy khách: phím đã gửi mà chủ phòng chưa xác nhận, để phát lại trên vị trí chuẩn.
    let seq = 0;
    const pending: Pending[] = [];

    const finish = () => {
      ended = true;
      const outcome: MatchOutcome = {
        standings: standings(match),
        humanIds: match.players.filter((p) => !p.bot && p.cloneOf === null).map((p) => p.id),
        winnerTeam: match.winnerTeam,
      };
      if (net?.role === 'host') net.end(outcome);
      onEndRef.current({ ...outcome, humanIds: net?.role === 'host' ? [0] : outcome.humanIds });
    };

    const clientTick = (dt: number, now: number) => {
      if (net?.role !== 'client') return;
      const box = net.snaps.current;
      if (!box.last) return;
      // Mỗi nhịp gửi đúng một phím có số thứ tự — chủ phòng cũng dùng đúng một phím mỗi nhịp.
      for (acc += dt; acc >= TICK; acc -= TICK) {
        const input = localInput(0);
        net.sendInput(++seq, input);
        pending.push({ seq, dir: input.dir });
      }
      while (pending.length && pending[0]!.seq <= box.ack) pending.shift();
      if (pending.length > MAX_PENDING) pending.splice(0, pending.length - MAX_PENDING);

      // Vị trí của mình = vị trí chuẩn của chủ phòng + phát lại các phím chưa được xác nhận,
      // bằng đúng luật di chuyển của engine. Không đoán mò nên mạng chậm cũng không bị kéo lùi.
      const mine = replayOwn(box.last, net.you, pending);
      const alpha = Math.min(1, (now - box.lastAt) / (SNAP_INTERVAL * 1000));
      const v = interpolate(box.prev, box.last, alpha);
      view = mine ? { ...v, players: v.players.map((p) => (p.id === net.you ? mine! : p)) } : v;
    };

    /** Chạy mô phỏng thêm `dt` giây (chơi trên máy và chủ phòng). */
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
      view = match;
    };

    // Chủ phòng: mô phỏng chạy theo nhịp riêng (không theo khung hình), vì trình duyệt dừng
    // requestAnimationFrame khi tab bị ẩn — trận của mọi người sẽ đứng im và khách bị kéo về chỗ cũ.
    let stopTicker: (() => void) | null = null;
    if (net?.role === 'host') {
      let simLast = performance.now();
      stopTicker = startTicker(() => {
        const now = performance.now();
        // Tab bị bóp nhịp lâu thì đuổi kịp tối đa 0,25 giây một lần để không khựng cả trận.
        simulate(Math.min(0.25, (now - simLast) / 1000));
        simLast = now;
      });
    }

    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (net?.role === 'client') clientTick(dt, now);
      else if (net?.role !== 'host') simulate(dt);
      playDiff(snap, view, localIds);
      snap = soundSnap(view);
      hudT -= dt;
      if (hudT <= 0) {
        hudT = 0.1;
        setHud(hudOf(view));
      }
      spawnTrails(dt);
      drawScene(c, { ...toScene(view), effects }, ART_CELL, frame++);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      stopTicker?.();
      stopMusic();
      if (net?.role === 'host') net.match.current = null;
    };
  }, [match, localIds, net, config.difficulty]);

  const setTouchDir = useCallback((d: Dir | null) => {
    touchDir.current = d;
  }, []);

  const fullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => undefined);
  };

  const me = hud.players.find((p) => p.id === localIds[0]);
  const sudden = hud.time <= SUDDEN_AT;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[linear-gradient(180deg,#7fd8f7_0%,#2a8fd6_100%)] pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      {/* Thanh trên: đồng hồ, chip người chơi, tạm dừng */}
      <div className="flex shrink-0 items-center gap-2 px-2 py-1.5">
        <div
          className={`${CARD} flex items-center px-2.5 py-0.5 ${sudden ? 'animate-pulse bg-[color:var(--bb-coral)] text-white' : ''}`}
        >
          <span className={`${DISPLAY} text-2xl leading-none tabular-nums`}>{fmt(hud.time)}</span>
          {sudden && <span className="ml-1.5 text-xs font-extrabold">ĐỘT TỬ</span>}
        </div>
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto lg:hidden">
          {hud.players.map((p) => (
            <span
              key={p.id}
              className={`flex shrink-0 items-center gap-1 rounded-full border-2 border-[color:var(--bb-ink)] px-1.5 text-[11px] font-extrabold ${p.state === 'out' ? 'bg-slate-300 opacity-60' : p.state === 'trapped' ? 'bg-[color:var(--bb-bubble)]' : 'bg-white'}`}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: SEAT_COLORS[p.id] }} />
              {p.name.replace(/^Bot /, '')}
            </span>
          ))}
        </div>
        <div className="ml-auto flex shrink-0 gap-1.5">
          {typeof document !== 'undefined' && document.fullscreenEnabled && (
            <button
              type="button"
              onClick={fullscreen}
              className="h-9 w-9 rounded-lg border-[3px] border-[color:var(--bb-ink)] bg-white font-extrabold shadow-[0_3px_0_var(--bb-ink)]"
              aria-label="Toàn màn hình"
            >
              ⛶
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowHelp(true)}
            className="h-9 w-9 rounded-lg border-[3px] border-[color:var(--bb-ink)] bg-white font-extrabold shadow-[0_3px_0_var(--bb-ink)]"
            aria-label="Vật phẩm và kỹ năng"
          >
            ?
          </button>
          <button
            type="button"
            onClick={() => setPaused(true)}
            className="h-9 rounded-lg border-[3px] border-[color:var(--bb-ink)] bg-white px-2.5 font-extrabold shadow-[0_3px_0_var(--bb-ink)]"
            aria-label="Tạm dừng"
          >
            ❚❚
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 portrait:flex-col landscape:flex-row">
        {/* Bản đồ */}
        <div
          ref={boardRef}
          className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center p-1"
        >
          <canvas
            ref={canvasRef}
            className="block rounded-md border-[3px] border-[color:var(--bb-ink)] shadow-[0_5px_0_var(--bb-ink)]"
            style={{ width: boardSize, height: (boardSize * ROWS) / COLS }}
          />
        </div>

        {/* Cột người chơi (màn lớn) */}
        <aside
          className="hidden w-56 shrink-0 flex-col gap-1.5 overflow-y-auto p-2 lg:flex"
          aria-label="Người chơi"
        >
          {hud.players.map((p) => (
            <div
              key={p.id}
              className={`${CARD} flex items-center gap-2 p-1.5 ${p.state === 'out' ? 'opacity-50' : p.state === 'trapped' ? 'bg-[#ffe3f1]' : ''}`}
              style={{ borderLeftColor: SEAT_COLORS[p.id], borderLeftWidth: 8 }}
            >
              <div className="h-[58px] w-10 shrink-0 overflow-hidden">
                <CharCanvas
                  def={characterById(p.charId)}
                  size={40}
                  pose={p.state === 'trapped' ? 'trapped' : 'idle'}
                  animate={false}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold">
                  {p.name}
                  {localIds.includes(p.id) && <span className="text-slate-500"> (bạn)</span>}
                </p>
                <div className="flex items-center gap-0.5 text-xs font-extrabold">
                  <ItemIcon kind="bomb" size={18} />
                  {p.bombs}
                  <ItemIcon kind="range" size={18} />
                  {p.range}
                  {p.needles > 0 && (
                    <>
                      <ItemIcon kind="needle" size={18} />
                      {p.needles}
                    </>
                  )}
                </div>
                <p className="text-[11px] font-extrabold text-slate-600">
                  {p.state === 'out'
                    ? 'Bị loại'
                    : p.state === 'trapped'
                      ? 'Bị nhốt!'
                      : config.teams
                        ? `Đội ${p.team === 0 ? 'Xanh' : 'Đỏ'}`
                        : 'Đang chơi'}
                </p>
              </div>
            </div>
          ))}
        </aside>

        {/* Điều khiển cảm ứng: dọc thì nằm dưới bản đồ, ngang thì nổi hai bên */}
        {touch && (
          <div className="pointer-events-none flex shrink-0 items-center justify-between px-4 portrait:h-40 landscape:absolute landscape:inset-x-3 landscape:bottom-3">
            <Joystick onDir={setTouchDir} />
            <div className="pointer-events-auto flex flex-col items-center gap-1">
              {me && (
                <span className="rounded-full bg-white/80 px-2 text-[11px] font-extrabold">
                  Bóng {me.bombs} · Tầm {me.range}
                  {me.needles ? ` · Kim ${me.needles}` : ''}
                </span>
              )}
              <button
                type="button"
                className={`${DISPLAY} h-[84px] w-[84px] touch-none select-none rounded-full border-[4px] border-[color:var(--bb-ink)] text-xl font-extrabold text-white shadow-[0_5px_0_var(--bb-ink)] active:translate-y-[3px] ${me?.state === 'trapped' ? 'bg-[color:var(--bb-bubble)]' : 'bg-[color:var(--bb-coral)]'}`}
                onPointerDown={(e) => {
                  e.preventDefault();
                  bombPress.current[0] = true;
                }}
              >
                {me?.state === 'trapped' && me.needles > 0 ? 'Kim' : 'Bùm!'}
              </button>
            </div>
          </div>
        )}
      </div>

      {paused && !showKeys && !showHelp && (
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
            <Btn tone="cream" onClick={() => setShowHelp(true)}>
              Vật phẩm & kỹ năng
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
      {showKeys && <SettingsDialog onClose={() => setShowKeys(false)} />}
      {showHelp && <HelpDialog onClose={() => setShowHelp(false)} />}
    </div>
  );
}
