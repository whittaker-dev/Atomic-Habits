'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { cleanName, NAME_MAX, nameError } from '../bong-bong-bum/name';
import { CODE_LENGTH, normalizeCode } from '../bong-bong-bum/net';
import type { House } from './board';
import { standings, type Game, type Seat, type SeatKind } from './engine';
import { sfx, loadMuted, setMuted, unlockAudio } from './audio';
import {
  BackIcon,
  BotIcon,
  CheckIcon,
  CopyIcon,
  DoorIcon,
  LinkIcon,
  MuteIcon,
  PassIcon,
  SoundIcon,
} from './icons';
import { Banner, Button, DieFace, onHouse, Plate, Toggle } from './kit';
import { finished, stepsBetween, type Rules } from './rules';
import { CHAMFER, DISPLAY, HOUSES } from './theme';
import { createBoardView, type BoardView } from './view3d';

// Các màn của Cờ cá ngựa. Màn chơi chỉ hiển thị một ván (engine.ts) và báo lại thao tác; ai giữ ván
// (chơi trên một máy, hay chủ phòng online) là việc của match.tsx / online.tsx.

const Heading = ({ children }: { children: ReactNode }) => (
  <h1 className={`${DISPLAY} text-[34px] leading-none text-balance`}>{children}</h1>
);
const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="flex flex-col gap-3">
    <h2 className={`${DISPLAY} text-lg text-[color:var(--cc-ash)]`}>{title}</h2>
    {children}
  </section>
);
/** Vệt lửa dưới tiêu đề: một nét cam chém xiên. */
const Slash = () => (
  <span aria-hidden className="block h-1.5 w-24 -skew-x-[30deg] bg-[color:var(--cc-ember)]" />
);

const field = `${CHAMFER} min-h-12 w-full bg-[color:var(--cc-stoneHi)] px-4 text-base font-bold text-[color:var(--cc-bone)] shadow-[inset_0_0_0_1px_var(--cc-iron)] placeholder:text-[color:var(--cc-ash)] focus:shadow-[inset_0_0_0_2px_var(--cc-ember)] focus:outline-none disabled:opacity-60`;

/* ─────────────────────────────── Vào game ─────────────────────────────── */

function ModeRow({
  icon,
  title,
  hint,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${CHAMFER} flex min-h-[76px] w-full items-center gap-4 bg-[color:var(--cc-stone)] px-4 text-left shadow-[inset_0_0_0_1px_var(--cc-iron)] transition-[background-color,box-shadow] hover:bg-[color:var(--cc-stoneHi)] hover:shadow-[inset_0_0_0_1px_var(--cc-ember)] focus-visible:shadow-[inset_0_0_0_2px_var(--cc-ember)] focus-visible:outline-none`}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center bg-[color:var(--cc-ember)] text-[color:var(--cc-night)] [clip-path:polygon(8px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%,0_8px)]">
        {icon}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className={`${DISPLAY} text-xl leading-none`}>{title}</span>
        <span className="text-sm text-[color:var(--cc-ash)]">{hint}</span>
      </span>
    </button>
  );
}

export function HomeScreen({
  name,
  onName,
  onLocal,
  onBots,
  onHost,
  onJoin,
  notice,
  pendingRoom,
}: {
  name: string;
  onName: (n: string) => void;
  onLocal: () => void;
  onBots: () => void;
  onHost: () => void;
  onJoin: (code: string) => void;
  notice: string | null;
  /** Mở bằng link mời mà chưa có tên: nhập tên xong là vào thẳng phòng này. */
  pendingRoom: string | null;
}) {
  const [draft, setDraft] = useState(name);
  const [code, setCode] = useState('');
  const [tried, setTried] = useState(false);
  useEffect(() => setDraft(name), [name]);
  const err = nameError(draft);
  const clean = normalizeCode(code).slice(0, CODE_LENGTH);
  const withName = (go: () => void) => {
    setTried(true);
    if (err) return;
    onName(cleanName(draft));
    go();
  };
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-7">
      <div className="flex flex-col gap-3">
        <div className="flex gap-1.5" aria-hidden>
          {([0, 1, 2, 3] as House[]).map((h) => (
            <Banner key={h} house={h} size={40} />
          ))}
        </div>
        <h1 className={`${DISPLAY} text-[64px] leading-[0.9]`}>Cờ cá ngựa</h1>
        <Slash />
        <p className="text-lg text-[color:var(--cc-ash)]">
          Bốn nhà, mười sáu chiến mã. Ra quân, đá ngựa, về chuồng trước là thắng.
        </p>
      </div>

      {notice && (
        <p
          role="alert"
          className={`${CHAMFER} bg-[#e5383b]/20 px-4 py-3 font-semibold shadow-[inset_0_0_0_1px_var(--cc-h0)]`}
        >
          {notice}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="cc-name" className="text-sm font-bold text-[color:var(--cc-ash)]">
          Tên của bạn
        </label>
        <input
          id="cc-name"
          value={draft}
          maxLength={NAME_MAX}
          autoComplete="nickname"
          onChange={(e) => setDraft(e.target.value)}
          placeholder="VD: Quang Trung"
          className={field}
          aria-invalid={tried && !!err}
        />
        {tried && err && <p className="text-sm font-semibold text-[color:var(--cc-h0)]">{err}</p>}
      </div>

      {pendingRoom ? (
        <Button className="w-full" onClick={() => withName(() => onJoin(pendingRoom))}>
          <DoorIcon />
          Vào phòng {pendingRoom}
        </Button>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <ModeRow
              icon={<LinkIcon />}
              title="Lập phòng online"
              hint="Mỗi người một máy, mời bằng link, mã hoặc QR"
              onClick={() => withName(onHost)}
            />
            <ModeRow
              icon={<PassIcon />}
              title="Đánh chung máy"
              hint="Chuyền một điện thoại quanh bàn"
              onClick={onLocal}
            />
            <ModeRow
              icon={<BotIcon />}
              title="Đánh với máy"
              hint="Bạn đấu một tới ba máy"
              onClick={() => withName(onBots)}
            />
          </div>

          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              if (clean.length === CODE_LENGTH) withName(() => onJoin(clean));
            }}
            className="flex flex-col gap-2"
          >
            <label htmlFor="cc-code" className="text-sm font-bold text-[color:var(--cc-ash)]">
              Có mã phòng?
            </label>
            <div className="flex gap-2">
              <input
                id="cc-code"
                value={clean}
                onChange={(e) => setCode(e.target.value)}
                autoCapitalize="characters"
                autoComplete="off"
                placeholder="KX4M2P"
                className={`${field} ${DISPLAY} min-w-0 flex-1 text-xl tracking-[0.3em]`}
              />
              <Button type="submit" tone="steel" disabled={clean.length !== CODE_LENGTH}>
                <DoorIcon />
                Vào
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────── Luật ─────────────────────────────── */

function RulesEditor({
  rules,
  onChange,
  disabled,
}: {
  rules: Rules;
  onChange?: (r: Rules) => void;
  disabled?: boolean;
}) {
  const set = (patch: Partial<Rules>) => onChange?.({ ...rules, ...patch });
  return (
    <Plate className="divide-y divide-[#4a525c]/70 px-4">
      <Toggle
        label="Ra quân bằng 1 hoặc 6"
        hint={
          rules.enterOn === 'oneOrSix' ? 'Tắt thì chỉ đổ 6 mới ra quân' : 'Đang chỉ ra quân bằng 6'
        }
        on={rules.enterOn === 'oneOrSix'}
        onChange={(v) => set({ enterOn: v ? 'oneOrSix' : 'six' })}
        disabled={disabled}
      />
      <Toggle
        label="Đổ 6 được đổ thêm"
        on={rules.bonusOnSix}
        onChange={(v) => set({ bonusOnSix: v })}
        disabled={disabled}
      />
      <Toggle
        label="Đá ngựa"
        hint="Đi trúng ô có ngựa nhà khác thì con đó về chuồng"
        on={rules.kick}
        onChange={(v) => set({ kick: v })}
        disabled={disabled}
      />
      <Toggle
        label="Về chuồng leo đúng bậc"
        hint="Đứng bậc 2 phải đổ đúng 3 mới lên bậc 3"
        on={rules.exactHome}
        onChange={(v) => set({ exactHome: v })}
        disabled={disabled}
      />
    </Plate>
  );
}

/** Các nút chọn người / máy / trống cho một ghế. */
function KindPicker({
  house,
  kind,
  kinds,
  onKind,
}: {
  house: House;
  kind: SeatKind;
  kinds: SeatKind[];
  onKind: (k: SeatKind) => void;
}) {
  const label: Record<SeatKind, string> = { human: 'Người', bot: 'Máy', empty: 'Trống' };
  return (
    <div
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${kinds.length}, minmax(0, 1fr))` }}
      role="radiogroup"
      aria-label={`Nhà ${HOUSES[house].name}`}
    >
      {kinds.map((k) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={kind === k}
          onClick={() => onKind(k)}
          className={`min-h-10 text-sm font-bold ${
            kind === k
              ? 'bg-[color:var(--cc-bone)] text-[color:var(--cc-night)]'
              : 'text-[color:var(--cc-ash)] shadow-[inset_0_0_0_1px_var(--cc-iron)] hover:text-[color:var(--cc-bone)]'
          }`}
        >
          {label[k]}
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────────── Chuẩn bị (chung máy / với máy) ─────────────────────────────── */

export function SetupScreen({
  seats,
  onSeats,
  rules,
  onRules,
  onStart,
}: {
  seats: Seat[];
  onSeats: (s: Seat[]) => void;
  rules: Rules;
  onRules: (r: Rules) => void;
  onStart: () => void;
}) {
  const active = seats.filter((p) => p.kind !== 'empty').length;
  const nameless = seats.some((p) => p.kind === 'human' && !p.name.trim());
  const update = (i: number, patch: Partial<Seat>) =>
    onSeats(seats.map((p, k) => (k === i ? { ...p, ...patch } : p)));
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Heading>Chia quân bốn nhà</Heading>
        <Slash />
      </div>
      <ul className="flex flex-col gap-2">
        {seats.map((p, i) => (
          <li key={p.house}>
            <Plate className={`flex flex-col gap-3 p-3 ${p.kind === 'empty' ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-3">
                <Banner house={p.house} size={36} />
                {p.kind === 'human' ? (
                  <input
                    aria-label={`Tên người chơi nhà ${HOUSES[p.house].name}`}
                    value={p.name}
                    maxLength={NAME_MAX}
                    placeholder={`Tên nhà ${HOUSES[p.house].name}`}
                    onChange={(e) => update(i, { name: e.target.value })}
                    className={`${field} min-h-11`}
                  />
                ) : (
                  <span className="flex-1 font-bold text-[color:var(--cc-ash)]">
                    {p.kind === 'bot' ? p.name : `Nhà ${HOUSES[p.house].name} để trống`}
                  </span>
                )}
              </div>
              <KindPicker
                house={p.house}
                kind={p.kind}
                kinds={['human', 'bot', 'empty']}
                onKind={(kind) =>
                  update(i, { kind, name: kind === 'bot' ? `Máy ${HOUSES[p.house].name}` : '' })
                }
              />
            </Plate>
          </li>
        ))}
      </ul>
      <Section title="Luật">
        <RulesEditor rules={rules} onChange={onRules} />
      </Section>
      <div className="sticky bottom-0 -mx-4 bg-[#0e1013]/95 px-4 pt-2 pb-[max(16px,env(safe-area-inset-bottom))]">
        <Button className="w-full" onClick={onStart} disabled={active < 2 || nameless}>
          {nameless ? 'Đặt tên cho mỗi người' : `Xuất quân · ${active} nhà`}
        </Button>
      </div>
    </div>
  );
}

/* ─────────────────────────────── Phòng chờ online ─────────────────────────────── */

function RoomQr({ link }: { link: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    // Link chỉ có sau khi phòng mở xong (cần mã phòng); trước đó để ô trống.
    if (!link) return;
    let alive = true;
    void import('qrcode').then((QR) =>
      QR.toDataURL(link, {
        margin: 1,
        width: 320,
        color: { dark: '#0e1013', light: '#ece8e1' },
      }).then((url) => alive && setSrc(url)),
    );
    return () => {
      alive = false;
    };
  }, [link]);
  return (
    <div className="h-[128px] w-[128px] shrink-0 bg-[color:var(--cc-bone)] p-1.5">
      {src && (
        // eslint-disable-next-line @next/next/no-img-element -- ảnh QR sinh tại chỗ (data URL)
        <img src={src} alt="Mã QR để vào phòng" className="h-full w-full" />
      )}
    </div>
  );
}

export function LobbyScreen({
  code,
  link,
  seats,
  you,
  isHost,
  rules,
  onSeatKind,
  onRules,
  onStart,
}: {
  code: string;
  link: string;
  seats: Seat[];
  you: House;
  isHost: boolean;
  rules: Rules;
  onSeatKind: (house: House, kind: SeatKind) => void;
  onRules: (r: Rules) => void;
  onStart: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const active = seats.filter((p) => p.kind !== 'empty').length;
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Heading>Chiêu mộ quân</Heading>
        <Slash />
      </div>
      <Plate className="flex gap-4 p-4">
        <RoomQr link={link} />
        <div className="flex min-w-0 flex-col justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-[color:var(--cc-ash)]">Mã phòng</span>
            <span className={`${DISPLAY} text-[34px] leading-none tracking-[0.12em]`}>
              {code || '······'}
            </span>
          </div>
          <Button
            tone="steel"
            className="self-start text-base"
            disabled={!link}
            onClick={() => {
              void navigator.clipboard?.writeText(link).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
              });
            }}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? 'Đã chép' : 'Chép link'}
          </Button>
        </div>
      </Plate>

      <Section title={`Bốn nhà · ${active}/4`}>
        <ul className="flex flex-col gap-2">
          {seats.map((p) => (
            <li key={p.house}>
              <Plate className="flex flex-col gap-3 p-3">
                <div className="flex items-center gap-3">
                  <Banner house={p.house} size={32} />
                  <span className="flex min-w-0 flex-1 flex-col leading-tight">
                    {p.kind === 'empty' ? (
                      <span className="text-[color:var(--cc-ash)]">Ghế trống — chờ người vào</span>
                    ) : (
                      <>
                        <span className="truncate font-extrabold">{p.name}</span>
                        <span className="text-xs font-semibold text-[color:var(--cc-ash)]">
                          {p.house === you
                            ? 'Bạn'
                            : p.kind === 'bot'
                              ? 'Máy'
                              : p.house === 0
                                ? 'Chủ phòng'
                                : p.connected
                                  ? 'Đã vào'
                                  : 'Mất kết nối'}
                        </span>
                      </>
                    )}
                  </span>
                </div>
                {isHost && p.kind !== 'human' && (
                  <KindPicker
                    house={p.house}
                    kind={p.kind}
                    kinds={['empty', 'bot']}
                    onKind={(k) => onSeatKind(p.house, k)}
                  />
                )}
              </Plate>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Luật">
        <RulesEditor rules={rules} onChange={onRules} disabled={!isHost} />
      </Section>

      <div className="sticky bottom-0 -mx-4 bg-[#0e1013]/95 px-4 pt-2 pb-[max(16px,env(safe-area-inset-bottom))]">
        {isHost ? (
          <Button className="w-full" onClick={onStart} disabled={active < 2}>
            {active < 2 ? 'Cần ít nhất hai nhà' : `Xuất quân · ${active} nhà`}
          </Button>
        ) : (
          <p className="py-3 text-center font-bold text-[color:var(--cc-ash)]">
            Chờ chủ phòng xuất quân…
          </p>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────── Đang chơi ─────────────────────────────── */

/** Cảnh 3D phủ cả khung chứa. */
function BoardStage({
  viewRef,
  onReady,
}: {
  viewRef: React.MutableRefObject<BoardView | null>;
  onReady: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const readyRef = useRef(onReady);
  readyRef.current = onReady;
  useEffect(() => {
    const canvas = cv.current;
    const el = box.current;
    if (!canvas || !el) return;
    const view = createBoardView(canvas);
    viewRef.current = view;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry!.contentRect;
      view.resize(Math.floor(width), Math.floor(height));
    });
    ro.observe(el);
    readyRef.current();
    return () => {
      ro.disconnect();
      view.dispose();
      viewRef.current = null;
    };
  }, [viewRef]);
  return (
    <div ref={box} className="absolute inset-0">
      <canvas ref={cv} role="img" aria-label="Bàn cờ" className="absolute inset-0 h-full w-full" />
    </div>
  );
}

/** Nút nổi trên cảnh 3D: tấm giáp sẫm vát góc. */
function HudButton({
  children,
  onClick,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`${CHAMFER} pointer-events-auto flex min-h-11 items-center gap-1.5 bg-[#1c2025]/95 px-3.5 text-sm font-bold text-[color:var(--cc-bone)] shadow-[inset_0_0_0_1px_var(--cc-iron)] hover:bg-[color:var(--cc-stoneHi)] focus-visible:shadow-[inset_0_0_0_2px_var(--cc-ember)] focus-visible:outline-none`}
    >
      {children}
    </button>
  );
}

const cloneGame = (g: Game): Game => JSON.parse(JSON.stringify(g)) as Game;
const allHorses = (g: Game) =>
  g.horses.flatMap((row, h) =>
    row.map((progress, slot) => ({ house: h as House, slot, progress })),
  );

/**
 * Màn chơi. Người chơi chỉ bấm Đổ: xúc xắc lăn vào giữa bàn rồi chiến mã tự đi (bên giữ ván chọn
 * nước). Nhận ván mới nhất qua `game`; mỗi nước (seq tăng một) được diễn lần lượt — xúc xắc lăn, ngựa
 * phi, đá ngựa — rồi mới hiện thế cờ mới, nên ván có đổi nhanh thì màn vẫn diễn đủ từng nước. Lệch
 * nhiều nước (vừa vào lại phòng) thì đặt thẳng thế cờ.
 */
export function GameScreen({
  game,
  controls,
  passAndPlay,
  modeLabel,
  onRoll,
  onLeave,
  onFinished,
}: {
  game: Game;
  /** Các nhà máy này được điều khiển (chơi chung máy: mọi người thật; online: ghế của mình). */
  controls: House[];
  /** Chung một máy: giữa hai người thật thì hiện màn chuyền máy. */
  passAndPlay: boolean;
  modeLabel: string;
  onRoll: () => void;
  onLeave: () => void;
  /** Ván đã có người thắng và màn đã diễn xong nước cuối. */
  onFinished: () => void;
}) {
  const viewRef = useRef<BoardView | null>(null);
  const [ready, setReady] = useState(false);
  const [shown, setShown] = useState<Game>(() => cloneGame(game));
  const shownRef = useRef<Game | null>(null);
  const queue = useRef<Game[]>([]);
  const animating = useRef(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  /** Chữ "ĐÁ!" đập giữa màn khi một nhà đá ngựa (key để chạy lại hoạt ảnh cho mỗi cú đá). */
  const [slam, setSlam] = useState<{ key: number; house: House } | null>(null);
  const [muted, setMute] = useState(false);
  useEffect(() => setMute(loadMuted()), []);
  /** Số vừa đổ gần nhất, giữ trên mặt xúc xắc ở khay tới lần đổ sau. */
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const [handoff, setHandoff] = useState<House | null>(null);
  /** Người thật cầm máy gần nhất: chỉ chuyền máy khi lượt mới thuộc về một người thật khác. */
  const holder = useRef<House | null>(null);
  const seatOf = (g: Game, h: House) => g.seats.find((s) => s.house === h)!;

  /**
   * Bàn nhìn từ phía nhà nào: máy chỉ có một người thật (online, đánh với máy) thì luôn là nhà người
   * đó; chơi chung máy thì là người thật đang cầm máy — lượt máy không xoay bàn.
   */
  const viewerOf = (g: Game): House | null => {
    const humans = controls.filter((h) => seatOf(g, h).kind === 'human');
    if (humans.length === 1) return humans[0]!;
    return controls.includes(g.turn) && seatOf(g, g.turn).kind === 'human' ? g.turn : null;
  };

  const show = (g: Game) => {
    shownRef.current = g;
    setShown(g);
    const v = viewRef.current;
    if (!v) return;
    const viewer = viewerOf(g);
    if (viewer !== null) v.face(viewer);
    const mine = controls.includes(g.turn) && seatOf(g, g.turn).kind === 'human';
    if (passAndPlay && mine && g.winner === null) {
      if (holder.current !== null && holder.current !== g.turn) setHandoff(g.turn);
      holder.current = g.turn;
    }
  };

  const pump = () => {
    const v = viewRef.current;
    if (!v || animating.current) return;
    const next = queue.current.shift();
    if (!next) {
      setBusy(false);
      return;
    }
    const prev = shownRef.current;
    // Tab đang ẩn thì trình duyệt dừng hoạt cảnh; tồn quá nhiều nước thì người xem đã lỡ nhịp:
    // cả hai trường hợp đặt thẳng thế cờ thay vì bắt người chơi xem lại cả chuỗi khi quay lại.
    const skip = document.hidden || queue.current.length > 2;
    if (!prev || next.event.kind === 'start' || next.seq !== prev.seq + 1 || skip) {
      // Không diễn được (lần đầu, ván mới, lỡ mất vài nước) hoặc chỉ đổi kết nối: đặt thẳng thế cờ.
      if (!prev || next.seq !== prev.seq) v.setHorses(allHorses(next));
      show(next);
      pump();
      return;
    }
    animating.current = true;
    setBusy(true);
    let settled = false;
    const done = (delay = 0) => {
      if (settled) return;
      settled = true;
      clearTimeout(watchdog);
      setTimeout(() => {
        animating.current = false;
        show(next);
        pump();
      }, delay);
    };
    const ev = next.event;
    // Chốt an toàn: hoạt cảnh chạy theo khung hình, mà trình duyệt có thể ngừng vẽ (màn bị che, máy
    // tiết kiệm pin) dù trang vẫn "hiện". Quá thời gian dự kiến thì đặt thẳng thế cờ và đi tiếp,
    // để màn không kẹt mãi ở "…".
    const budget =
      ev.kind === 'move' ? 2500 + stepsBetween(ev.from, ev.move.to).length * 250 : 3500;
    const watchdog = setTimeout(() => {
      v.setHorses(allHorses(next));
      if (ev.kind === 'roll') setLastRoll(ev.value);
      done();
    }, budget);
    if (ev.kind === 'roll') {
      setNote(null);
      sfx.roll();
      v.rollDie(ev.value, ev.house, () => {
        if (settled) return;
        sfx.land();
        setLastRoll(ev.value);
        if (ev.passed) {
          setNote(`${seatOf(next, ev.house).name} đổ ${ev.value} — không con nào đi được`);
          done(1100);
        } else done();
      });
    } else if (ev.kind === 'move') {
      v.move(
        ev.move.house,
        ev.move.slot,
        stepsBetween(ev.from, ev.move.to),
        () => {
          if (settled) return;
          if (ev.kicked) {
            sfx.kick();
            v.kick(ev.kicked.house, ev.kicked.slot);
            setSlam({ key: Date.now(), house: ev.move.house });
            setTimeout(() => setSlam(null), 1100);
            setNote(`Đá bay chiến mã nhà ${HOUSES[ev.kicked.house].name}!`);
            done(900);
          } else {
            setNote(ev.again ? `${seatOf(next, ev.move.house).name} đổ 6 — được đổ thêm` : null);
            done(150);
          }
        },
        sfx.hoof,
      );
    } else done();
  };

  // Ván mới tới: xếp hàng chờ diễn.
  useEffect(() => {
    queue.current.push(cloneGame(game));
    if (ready) pump();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, ready]);

  useEffect(() => {
    if (shown.winner === null || busy) return;
    sfx.win();
    const t = setTimeout(onFinished, 1600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown.winner, busy]);

  const turnSeat = seatOf(shown, shown.turn);
  const myTurn = controls.includes(shown.turn) && turnSeat.kind === 'human';
  const canRoll = myTurn && shown.roll === null && shown.winner === null && !busy;
  const moving = shown.roll !== null && shown.moves.length > 0;

  const status = busy
    ? (note ?? '…')
    : shown.winner !== null
      ? 'Ván đã ngã ngũ'
      : canRoll
        ? note
          ? `${note}. Chạm Đổ`
          : 'Chạm Đổ để tung xúc xắc'
        : moving
          ? `Đổ được ${shown.roll} — chiến mã xuất kích!`
          : (note ?? `Chờ ${turnSeat.name}…`);

  return (
    // Chạm bất kỳ đâu trên màn chơi cũng mở khoá âm thanh (trình duyệt đòi một lần chạm trước khi phát).
    <div
      className="fixed inset-0 z-20 overflow-hidden bg-[color:var(--cc-night)]"
      onPointerDown={unlockAudio}
    >
      <BoardStage viewRef={viewRef} onReady={() => setReady(true)} />

      {/* Rời ván đứng riêng ở góc trên, xa nút Đổ. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 px-3 pt-[max(12px,env(safe-area-inset-top))]">
        <HudButton onClick={onLeave}>
          <BackIcon className="h-4 w-4" />
          Rời ván
        </HudButton>
        <HudButton
          onClick={() => {
            unlockAudio();
            setMuted(!muted);
            setMute(!muted);
          }}
          label={muted ? 'Bật tiếng' : 'Tắt tiếng'}
        >
          {muted ? <MuteIcon className="h-4 w-4" /> : <SoundIcon className="h-4 w-4" />}
        </HudButton>
      </div>

      <div className="pointer-events-none absolute inset-x-3 top-[calc(max(12px,env(safe-area-inset-top))+56px)] flex justify-center md:inset-x-auto md:left-3">
        <div
          className={`${CHAMFER} w-full max-w-md bg-[#1c2025]/95 px-4 pt-3 pb-3 shadow-[inset_0_0_0_1px_var(--cc-iron)]`}
          aria-live="polite"
        >
          <div className="flex items-center gap-3">
            <span
              className="h-9 w-2 shrink-0 -skew-x-[20deg]"
              style={{ background: HOUSES[shown.turn].hex }}
              aria-hidden
            />
            <h1 className={`${DISPLAY} min-w-0 flex-1 truncate pt-0.5 text-[26px] leading-none`}>
              Lượt {turnSeat.name || `nhà ${HOUSES[shown.turn].name}`}
            </h1>
            <span className="shrink-0 text-xs font-bold text-[color:var(--cc-ash)] uppercase">
              {modeLabel}
            </span>
          </div>
          <ul className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1 text-sm" aria-label="Các nhà">
            {shown.seats
              .filter((s) => s.kind !== 'empty')
              .map((s) => (
                <li
                  key={s.house}
                  className={`flex min-w-0 items-center gap-1.5 ${
                    s.house === shown.turn ? 'font-extrabold' : 'text-[color:var(--cc-ash)]'
                  } ${s.connected ? '' : 'line-through opacity-60'}`}
                >
                  <i
                    className="h-2.5 w-2.5 shrink-0 -skew-x-[20deg]"
                    style={{ background: HOUSES[s.house].hex }}
                  />
                  <span className="min-w-0 truncate">{s.name}</span>
                  <span className="shrink-0 tabular-nums">{finished(shown.horses, s.house)}/4</span>
                </li>
              ))}
          </ul>
        </div>
      </div>

      <div className="absolute inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] flex justify-center">
        <div
          className={`${CHAMFER} flex w-full max-w-md items-center gap-3 bg-[#1c2025]/95 p-3 shadow-[inset_0_0_0_1px_var(--cc-iron)]`}
        >
          <DieFace value={lastRoll} />
          <p
            className="min-w-0 flex-1 text-[15px] font-semibold text-[color:var(--cc-ash)]"
            role="status"
          >
            {status}
          </p>
          {myTurn && (
            <Button
              house={shown.turn}
              onClick={() => {
                // Trình duyệt chỉ cho phát tiếng sau một lần bấm: bấm Đổ là lần đó.
                unlockAudio();
                onRoll();
              }}
              disabled={!canRoll}
              className="min-w-[100px] text-2xl"
            >
              Đổ
            </Button>
          )}
        </div>
      </div>

      {slam && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
        >
          <span
            key={slam.key}
            className={`${DISPLAY} cc-slam text-[128px] leading-none [-webkit-text-stroke:5px_#0e1013] [paint-order:stroke_fill] [text-shadow:0_10px_28px_rgb(0_0_0/0.75)]`}
            style={{ color: HOUSES[slam.house].hex }}
          >
            Đá!
          </span>
        </div>
      )}

      {handoff !== null && (
        <HandoffScreen
          house={handoff}
          name={seatOf(shown, handoff).name}
          onReady={() => setHandoff(null)}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────── Chuyền máy ─────────────────────────────── */

/**
 * Màn chuyền máy giữa hai người chơi chung: cả màn đổi sang màu cờ nhà kế tiếp, lật vào như lật
 * khiên, để người cầm máy biết chắc là tới lượt ai trước khi chạm Đổ.
 */
export function HandoffScreen({
  house,
  name,
  onReady,
}: {
  house: House;
  name: string;
  onReady: () => void;
}) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#0e1013]/90 p-6 [perspective:1200px]">
      <div
        className={`${CHAMFER} cc-flip flex w-full max-w-sm flex-col items-center gap-6 px-6 py-10 text-center`}
        style={{ background: HOUSES[house].hex, color: onHouse(house) }}
      >
        <Banner house={house} size={64} />
        <div className="flex flex-col gap-2">
          <p className="font-bold opacity-85">Trao quyền chỉ huy cho</p>
          <p className={`${DISPLAY} text-[52px] leading-none text-balance`}>{name}</p>
          <p className="text-sm font-semibold opacity-85">Nhà {HOUSES[house].name}</p>
        </div>
        <button
          type="button"
          onClick={onReady}
          className={`${DISPLAY} ${CHAMFER} min-h-12 w-full bg-[color:var(--cc-night)] px-5 text-xl text-[color:var(--cc-bone)] hover:bg-[color:var(--cc-stone)]`}
        >
          {name} ra trận
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────── Thắng ─────────────────────────────── */

export function WinScreen({
  game,
  onAgain,
  onHome,
  againLabel = 'Đánh ván nữa',
}: {
  game: Game;
  onAgain?: () => void;
  onHome: () => void;
  againLabel?: string;
}) {
  const ranked = standings(game);
  const w = ranked[0]!;
  const winner = game.winner ?? w.house;
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div
        className={`${CHAMFER} flex flex-col items-start gap-4 p-6`}
        style={{ background: HOUSES[winner].hex, color: onHouse(winner) }}
      >
        <Banner house={winner} size={52} />
        <h1 className={`${DISPLAY} text-[46px] leading-[0.95] text-balance`}>
          {w.name} toàn thắng!
        </h1>
        <p className="text-lg font-bold">Cả bốn chiến mã nhà {HOUSES[winner].name} đã về chuồng.</p>
      </div>
      <ol className="flex flex-col gap-2" aria-label="Thứ hạng">
        {ranked.map((p, i) => (
          <li key={p.house}>
            <Plate className="flex min-h-16 items-center gap-3 px-4">
              <span className={`${DISPLAY} w-7 text-3xl tabular-nums`}>{i + 1}</span>
              <Banner house={p.house} size={28} />
              <span className="min-w-0 flex-1 truncate font-extrabold">{p.name}</span>
              <span className="text-sm font-semibold text-[color:var(--cc-ash)] tabular-nums">
                {p.done}/4 về
              </span>
            </Plate>
          </li>
        ))}
      </ol>
      <div className="flex flex-col gap-2">
        {onAgain && (
          <Button className="w-full" onClick={onAgain}>
            {againLabel}
          </Button>
        )}
        <Button tone="steel" className="w-full" onClick={onHome}>
          Về trang chính
        </Button>
      </div>
    </div>
  );
}
