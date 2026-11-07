'use client';

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { cleanName, NAME_MAX, nameError } from '../bong-bong-bum/name';
import { CODE_LENGTH, normalizeCode } from '../bong-bong-bum/net';
import { DrawBoard, InkThumb, InkView } from './board';
import { MAX_PLAYERS, MIN_PLAYERS, PICK_TIME, REVEAL_TIME, type Settings } from './engine';
import { letterCount } from './guess';
import { CheckIcon, CopyIcon, CrownIcon, SendIcon } from './icons';
import type { DrawOp, Ink, Stroke } from './ink';
import {
  Avatar,
  BulbString,
  Button,
  GuessFeed,
  Marquee,
  PlayerRow,
  StatusBand,
  Ticket,
  Tip,
} from './kit';
import type { GameView, LobbyState } from './net';
import { DISPLAY } from './theme';
import { PACK_LABEL, type PackId } from './words';

// Các màn hình của Vẽ Đoán. Không màn nào tự giữ luật chơi: chúng chỉ vẽ GameView chủ phòng gửi
// và báo lại thao tác của người chơi (chọn từ, đoán, nét vẽ) qua các hàm on….

/** Một bức vẽ đã xong, giữ lại cho màn tổng kết. */
export type Drawing = { turn: number; drawer: number; word: string; strokes: Stroke[] };

/** Đếm lùi theo đồng hồ máy mình, tính từ lúc nhận trạng thái mới (`leftMs` lúc chủ phòng gửi). */
function useSecondsLeft(view: { leftMs: number }) {
  const deadline = useMemo(() => performance.now() + view.leftMs, [view]);
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    const t = setInterval(() => setNow(performance.now()), 250);
    return () => clearInterval(t);
  }, []);
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

/** Bố cục trong lượt: điện thoại xếp dọc, thanh nhập dính đáy; màn rộng chia bảng vẽ và cột bên. */
function RoundLayout({
  status,
  main,
  side,
  bar,
}: {
  status: ReactNode;
  main: ReactNode;
  side: ReactNode;
  bar?: ReactNode;
}) {
  // Bảng vẽ giới hạn ~600px trên màn rộng để bảng, ô chữ và ô đoán cùng nằm trong một màn hình.
  return (
    <div className="grid gap-x-8 gap-y-4 md:grid-cols-[minmax(0,600px)_340px] md:justify-center">
      <div className="flex flex-col gap-4">
        {status}
        {main}
      </div>
      <div className="flex flex-col gap-4 md:pt-2">
        {side}
        {bar && (
          <div className="sticky bottom-0 -mx-4 bg-[color:var(--vd-tarp)]/95 px-4 pt-2 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-sm md:static md:mx-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
            {bar}
          </div>
        )}
      </div>
    </div>
  );
}

function Timer({ left, total }: { left: number; total: number }) {
  return (
    <div className="flex items-center gap-3">
      <BulbString total={total} lit={Math.min(left, total)} className="flex-1" />
      <span
        className={`${DISPLAY} w-10 pt-1 text-right text-xl leading-none text-[color:var(--vd-bulb)] tabular-nums`}
      >
        {left}s
      </span>
    </div>
  );
}

function Caption({ children }: { children: ReactNode }) {
  return (
    <p className="text-center text-xs font-bold tracking-[0.08em] text-[color:var(--vd-mute)] uppercase">
      {children}
    </p>
  );
}

const field =
  'h-12 w-full rounded-xl bg-[color:var(--vd-paper)] px-4 text-base font-semibold text-[color:var(--vd-ink)] placeholder:text-[color:var(--vd-inkSoft)] outline-none focus-visible:ring-[3px] focus-visible:ring-[color:var(--vd-gold)] disabled:opacity-70';

/* ─────────────────────────────── Vào game ─────────────────────────────── */

export function HomeScreen({
  name,
  onName,
  onCreate,
  onJoin,
  notice,
  pendingRoom,
}: {
  name: string;
  onName: (name: string) => void;
  onCreate: () => void;
  onJoin: (code: string) => void;
  notice: string | null;
  /** Mở link mời khi chưa có tên: nhập tên xong là vào thẳng phòng này. */
  pendingRoom: string | null;
}) {
  const [draft, setDraft] = useState(name);
  const [code, setCode] = useState(pendingRoom ?? '');
  useEffect(() => setDraft(name), [name]);
  const error = nameError(draft);
  const withName = (next: () => void) => {
    if (error) return;
    onName(draft.trim());
    next();
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-8 pt-2">
      <Marquee>
        <h1
          className={`${DISPLAY} pt-3 text-[76px] leading-[0.9] text-[color:var(--vd-gold)] [text-shadow:0_3px_0_var(--vd-redDeep),0_0_24px_rgb(255_201_60/0.45)]`}
        >
          Vẽ Đoán
        </h1>
        <p className="mt-1 text-[15px] font-semibold text-[color:var(--vd-bulb)]">
          Một người vẽ, cả phòng đoán.
        </p>
      </Marquee>

      {notice && (
        <p
          role="alert"
          className="rounded-xl bg-[color:var(--vd-red)] px-4 py-3 text-[15px] font-semibold"
        >
          {notice}
        </p>
      )}

      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          withName(pendingRoom ? () => onJoin(pendingRoom) : onCreate);
        }}
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-bold text-[color:var(--vd-mute)]">Tên của bạn</span>
          <input
            value={draft}
            onChange={(e) => setDraft(cleanName(e.target.value))}
            maxLength={NAME_MAX}
            autoComplete="nickname"
            placeholder="Tên hiện cho bạn bè"
            className={field}
          />
        </label>
        <Button type="submit" disabled={!!error} className="w-full">
          {pendingRoom ? `Vào phòng ${pendingRoom}` : 'Tạo phòng'}
        </Button>
      </form>

      {!pendingRoom && (
        <form
          className="flex flex-col gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            withName(() => onJoin(code));
          }}
        >
          <span className="text-sm font-bold text-[color:var(--vd-mute)]">
            Hoặc vào phòng bạn bè bằng mã
          </span>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(normalizeCode(e.target.value))}
              maxLength={CODE_LENGTH}
              placeholder="MÃ 6 KÝ TỰ"
              aria-label="Mã phòng"
              autoCapitalize="characters"
              className={`${field} ${DISPLAY} pt-1.5 text-2xl tracking-[0.3em]`}
            />
            <Button
              type="submit"
              tone="red"
              disabled={code.length !== CODE_LENGTH || !!error}
              className="shrink-0"
            >
              Vào
            </Button>
          </div>
        </form>
      )}

      <section aria-labelledby="vd-how" className="flex flex-col gap-3">
        <h2
          id="vd-how"
          className={`${DISPLAY} pt-1 text-2xl leading-none text-[color:var(--vd-bulb)]`}
        >
          Cách chơi
        </h2>
        <ol className="flex flex-col gap-3">
          {[
            'Tạo phòng rồi gửi link hoặc mã cho bạn bè — mỗi người chơi trên điện thoại của mình.',
            'Mỗi lượt một người chọn từ bí mật rồi vẽ bằng ngón tay; cả phòng gõ câu đoán, gõ không dấu cũng tính.',
            'Đoán ra càng nhanh càng nhiều điểm; người vẽ được điểm khi có người đoán ra.',
          ].map((t, i) => (
            <li key={i} className="flex items-start gap-3 text-[15px] leading-snug">
              <span
                className={`${DISPLAY} flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--vd-gold)] pt-1 text-lg leading-none text-[color:var(--vd-ink)]`}
              >
                {i + 1}
              </span>
              <span className="pt-1 text-[color:var(--vd-bulb)]">{t}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

export function Connecting({ text, onCancel }: { text: string; onCancel: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-5 pt-16 text-center">
      <BulbString total={12} lit={12} perRow={12} className="w-40 motion-safe:animate-pulse" />
      <p className={`${DISPLAY} pt-1 text-3xl leading-none`}>{text}</p>
      <p className="text-sm text-[color:var(--vd-mute)]">Thường mất vài giây.</p>
      <Button tone="ghost" onClick={onCancel}>
        Huỷ
      </Button>
    </div>
  );
}

/* ─────────────────────────────── Phòng chờ ─────────────────────────────── */

function Choice<T extends string | number>({
  label,
  options,
  value,
  onChange,
  format = String,
  disabled,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  format?: (v: T) => string;
  disabled?: boolean;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5" disabled={disabled}>
      <legend className="mb-1.5 text-sm font-bold text-[color:var(--vd-mute)]">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <label
            key={o}
            className={`flex min-h-11 items-center rounded-full px-4 text-[15px] font-bold transition-colors has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-[color:var(--vd-bulb)] ${
              o === value
                ? 'bg-[color:var(--vd-gold)] text-[color:var(--vd-ink)]'
                : 'bg-[color:var(--vd-tarpHi)] text-[color:var(--vd-bulb)]'
            } ${disabled ? (o === value ? '' : 'opacity-50') : 'cursor-pointer hover:brightness-110'}`}
          >
            <input
              type="radio"
              className="sr-only"
              checked={o === value}
              onChange={() => onChange(o)}
            />
            {format(o)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

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
        color: { dark: '#2a1f3d', light: '#fff8e6' },
      }).then((url) => alive && setSrc(url)),
    );
    return () => {
      alive = false;
    };
  }, [link]);
  return (
    <div className="h-[132px] w-[132px] shrink-0 rounded-lg bg-[color:var(--vd-paper)] p-1.5">
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
  lobby,
  you,
  isHost,
  onSettings,
  onStart,
}: {
  code: string;
  link: string;
  lobby: LobbyState;
  you: number;
  isHost: boolean;
  onSettings: (patch: Partial<Settings>) => void;
  onStart: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const present = lobby.slots.filter((s) => s.connected).length;
  const { settings } = lobby;

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex flex-col gap-6">
        <StatusBand
          meta={
            <>
              <span>Phòng chờ</span>
              <span>
                {isHost ? 'Bạn là chủ phòng' : `Chủ phòng: ${lobby.slots[0]?.name ?? ''}`}
              </span>
            </>
          }
          message={present < MIN_PLAYERS ? 'Gọi bạn bè vào phòng' : 'Đủ người rồi!'}
        />
        <div className="flex flex-wrap items-center gap-5">
          <RoomQr link={link} />
          <div className="flex flex-col gap-3">
            <span className="text-sm font-bold text-[color:var(--vd-mute)]">Mã phòng</span>
            <Ticket pattern={code} />
            <Button
              tone="ghost"
              className="self-start text-xl"
              onClick={() => {
                void navigator.clipboard?.writeText(link).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1600);
                });
              }}
            >
              <CopyIcon />
              {copied ? 'Đã chép link' : 'Chép link mời'}
            </Button>
          </div>
        </div>

        <section aria-labelledby="vd-players" className="flex flex-col gap-3">
          <h3 id="vd-players" className="text-sm font-bold text-[color:var(--vd-mute)]">
            Người chơi · {lobby.slots.length}/{MAX_PLAYERS}
          </h3>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Array.from({ length: MAX_PLAYERS }, (_, i) => {
              const p = lobby.slots[i];
              if (!p)
                return (
                  <li
                    key={i}
                    className="flex min-h-16 items-center justify-center rounded-xl border-2 border-dashed border-[color:var(--vd-wire)] text-sm font-semibold text-[color:var(--vd-mute)]"
                  >
                    Còn trống
                  </li>
                );
              return (
                <li
                  key={i}
                  className="flex min-h-16 items-center gap-3 rounded-xl bg-[color:var(--vd-tarpHi)] px-3"
                >
                  <Avatar player={p} seat={i} you={i === you} />
                  <span className="flex min-w-0 flex-1 flex-col leading-tight">
                    <span className="truncate font-bold">{p.name}</span>
                    {i === you && (
                      <span className="text-xs font-semibold text-[color:var(--vd-gold)]">Bạn</span>
                    )}
                    {!p.connected && (
                      <span className="text-xs font-semibold text-[color:var(--vd-mute)]">
                        Mất kết nối
                      </span>
                    )}
                  </span>
                  {p.host && (
                    <Tip label="Chủ phòng">
                      <CrownIcon className="h-5 w-5 shrink-0 text-[color:var(--vd-gold)]" />
                    </Tip>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <aside
        aria-label="Cài đặt ván"
        className="flex flex-col gap-5 rounded-2xl bg-[color:var(--vd-tarpHi)]/60 p-5 ring-1 ring-[color:var(--vd-wire)]"
      >
        <Choice
          label="Số lượt vẽ"
          options={[3, 6, 9] as const}
          value={settings.turns}
          onChange={(turns) => onSettings({ turns })}
          disabled={!isHost}
        />
        <Choice
          label="Thời gian vẽ"
          options={[60, 80, 100] as const}
          value={settings.drawTime}
          onChange={(drawTime) => onSettings({ drawTime })}
          format={(v) => `${v} giây`}
          disabled={!isHost}
        />
        <Choice
          label="Bộ từ"
          options={Object.keys(PACK_LABEL) as PackId[]}
          value={settings.pack}
          onChange={(pack) => onSettings({ pack })}
          format={(v) => PACK_LABEL[v]}
          disabled={!isHost}
        />
        <div className="mt-2 flex flex-col gap-2">
          {isHost ? (
            <>
              <Button
                onClick={onStart}
                disabled={present < MIN_PLAYERS}
                className="w-full text-[28px]"
              >
                Bắt đầu
              </Button>
              <p className="text-center text-[13px] text-[color:var(--vd-mute)]">
                Cần ít nhất {MIN_PLAYERS} người · đang có {present}
              </p>
            </>
          ) : (
            <p className={`${DISPLAY} pt-1 text-center text-2xl leading-none`}>
              Chờ chủ phòng bắt đầu…
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}

/* ─────────────────────────────── Trong lượt ─────────────────────────────── */

function Meta({ view, code, extra }: { view: GameView; code: string; extra?: string }) {
  return (
    <>
      <span>
        Lượt {view.turn}/{view.turns}
        {extra ? ` · ${extra}` : ''}
      </span>
      <span>Phòng {code}</span>
    </>
  );
}

function WordPick({
  view,
  code,
  choices,
  onPick,
}: {
  view: GameView;
  code: string;
  choices: string[];
  onPick: (i: number) => void;
}) {
  const left = useSecondsLeft(view);
  const total = PICK_TIME / 1000;
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <StatusBand
        meta={<Meta view={view} code={code} extra="Lượt của bạn" />}
        message="Chọn một từ để vẽ"
      />
      <BulbString total={total} lit={left} perRow={total} className="max-w-72" />
      <ul className="flex flex-col gap-3">
        {choices.map((w, i) => (
          <li key={w}>
            <button
              type="button"
              onClick={() => onPick(i)}
              className="flex w-full items-center justify-between gap-4 rounded-xl bg-[color:var(--vd-paper)] px-5 py-4 text-left text-[color:var(--vd-ink)] shadow-[0_8px_20px_-8px_rgb(0_0_0/0.6)] transition-transform hover:-translate-y-0.5 focus-visible:ring-[3px] focus-visible:ring-[color:var(--vd-gold)] focus-visible:outline-none"
            >
              <span className={`${DISPLAY} pt-1.5 text-[34px] leading-none`}>{w}</span>
              <span className="shrink-0 text-sm font-bold text-[color:var(--vd-inkSoft)]">
                {letterCount(w)} chữ cái
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="text-sm text-[color:var(--vd-mute)]">
        Hết giờ chọn thì máy tự lấy từ đầu tiên.
      </p>
    </div>
  );
}

/** Bao lâu nút "Vẽ xong" chờ lần bấm thứ hai trước khi tự trở lại như cũ. */
const DONE_CONFIRM_MS = 3000;

/**
 * Nút kết thúc lượt của người vẽ. Phải bấm hai lần: lượt kết thúc là cả phòng mất cơ hội đoán,
 * nên một cú chạm nhầm ngay dưới bảng vẽ không được tính.
 */
function DoneButton({ onDone }: { onDone: () => void }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), DONE_CONFIRM_MS);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <Button
      tone={armed ? 'red' : 'ghost'}
      className="w-full"
      onClick={() => (armed ? onDone() : setArmed(true))}
    >
      <CheckIcon className="h-5 w-5" />
      {armed ? 'Chắc chưa? Bấm lần nữa' : 'Vẽ xong'}
    </Button>
  );
}

function GuessBar({
  disabled,
  placeholder,
  onGuess,
}: {
  disabled: boolean;
  placeholder: string;
  onGuess: (t: string) => void;
}) {
  const [text, setText] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onGuess(text);
    setText('');
  };
  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled}
        maxLength={40}
        autoComplete="off"
        enterKeyHint="send"
        aria-label="Câu đoán"
        placeholder={placeholder}
        className={field}
      />
      <Button type="submit" disabled={disabled || !text.trim()} className="shrink-0">
        <SendIcon className="h-5 w-5" />
        Đoán
      </Button>
    </form>
  );
}

export function GameScreen({
  view,
  you,
  code,
  isHost,
  ink,
  gallery,
  onPick,
  onGuess,
  onOps,
  onDone,
  onAgain,
  onLobby,
}: {
  view: GameView;
  you: number;
  code: string;
  isHost: boolean;
  ink: Ink;
  gallery: Drawing[];
  onPick: (i: number) => void;
  onGuess: (text: string) => void;
  onOps: (ops: DrawOp[]) => void;
  onDone: () => void;
  onAgain: () => void;
  onLobby: () => void;
}) {
  const left = useSecondsLeft(view);
  const p = view.phase;
  const nameOf = (id: number) => (id === you ? 'Bạn' : (view.seats[id]?.name ?? '?'));

  if (p.kind === 'final')
    return (
      <FinalScreen
        view={view}
        you={you}
        isHost={isHost}
        gallery={gallery}
        onAgain={onAgain}
        onLobby={onLobby}
      />
    );
  if (p.kind === 'reveal')
    return <RevealScreen view={view} code={code} left={left} gallery={gallery} nameOf={nameOf} />;
  if (p.kind === 'pick' && p.drawer === you && p.choices)
    return <WordPick view={view} code={code} choices={p.choices} onPick={onPick} />;

  const drawer = p.drawer;
  const iDraw = drawer === you;
  const solved = p.kind === 'draw' ? p.solved : [];
  const iSolved = solved.includes(you);
  const myPoints = view.feed.find((f) => f.by === you && f.verdict === 'correct')?.points;

  let message: ReactNode;
  if (p.kind === 'pick')
    message = (
      <>
        <span className="text-[color:var(--vd-gold)]">{nameOf(drawer)}</span> đang chọn từ…
      </>
    );
  else if (iDraw) message = left === 0 ? 'Hết giờ!' : 'Vẽ đi, đừng viết chữ!';
  else if (iSolved)
    message = (
      <>
        Đúng rồi! <span className="text-[color:var(--vd-gold)]">+{myPoints}</span>
      </>
    );
  else
    message = (
      <>
        Đoán đi! <span className="text-[color:var(--vd-gold)]">{nameOf(drawer)}</span> đang vẽ
      </>
    );

  const total = p.kind === 'pick' ? PICK_TIME / 1000 : view.drawTime;

  return (
    <RoundLayout
      status={
        <>
          <StatusBand
            meta={<Meta view={view} code={code} extra={iDraw ? 'Bạn vẽ' : undefined} />}
            message={message}
          />
          <Timer left={left} total={total} />
        </>
      }
      main={
        <>
          {iDraw && p.kind === 'draw' ? (
            <DrawBoard ink={ink} onOps={onOps} />
          ) : (
            <InkView ink={ink} label={`Bảng vẽ của ${nameOf(drawer)}`} />
          )}
          {p.kind === 'draw' && (
            <div className="flex flex-col gap-2">
              <Ticket pattern={p.word ?? p.pattern} />
              <Caption>
                {iDraw
                  ? 'Từ của bạn — chỉ bạn thấy'
                  : `${letterCount(p.pattern)} chữ cái · ${p.pattern.split(' ').length} tiếng`}
              </Caption>
            </div>
          )}
        </>
      }
      side={
        <>
          <PlayerRow seats={view.seats} drawer={drawer} solved={solved} you={you} />
          <GuessFeed feed={view.feed.slice(-6)} nameOf={nameOf} />
        </>
      }
      bar={
        iDraw ? (
          p.kind === 'draw' && <DoneButton onDone={onDone} />
        ) : (
          <GuessBar
            disabled={p.kind !== 'draw' || iSolved || left === 0}
            placeholder={
              p.kind !== 'draw'
                ? 'Chờ người vẽ chọn từ…'
                : iSolved
                  ? 'Chờ người khác…'
                  : 'Gõ câu đoán…'
            }
            onGuess={onGuess}
          />
        )
      }
    />
  );
}

/* ─────────────────────────────── Đáp án ─────────────────────────────── */

function RevealScreen({
  view,
  code,
  left,
  gallery,
  nameOf,
}: {
  view: GameView;
  code: string;
  left: number;
  gallery: Drawing[];
  nameOf: (id: number) => string;
}) {
  const p = view.phase;
  if (p.kind !== 'reveal') return null;
  const drawing = gallery.find((d) => d.turn === view.turn);
  const last = view.turn >= view.turns;
  const total = REVEAL_TIME / 1000;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-7">
      <StatusBand
        meta={<Meta view={view} code={code} extra="Hết lượt" />}
        message={p.word ? 'Đáp án là…' : `Bỏ lượt — ${nameOf(p.drawer)} đã rời phòng`}
      />
      {p.word && <Ticket pattern={p.word} size="lg" drop />}

      {p.word && (
        <div className="grid items-start gap-6 md:grid-cols-[260px_minmax(0,1fr)]">
          <figure className="mx-auto flex w-full max-w-[260px] flex-col gap-2 md:max-w-none">
            <InkThumb
              strokes={drawing?.strokes ?? []}
              label={`Tranh "${p.word}" của ${nameOf(p.drawer)}`}
            />
            <figcaption className="text-center text-sm font-semibold text-[color:var(--vd-mute)]">
              {nameOf(p.drawer)} vẽ
            </figcaption>
          </figure>
          <ol className="flex flex-col gap-2" aria-label="Điểm lượt này">
            {p.results.map((r) => {
              const seat = view.seats[r.id]!;
              return (
                <li
                  key={r.id}
                  className="flex items-center gap-3 rounded-xl bg-[color:var(--vd-tarpHi)] px-3 py-2"
                >
                  <Avatar
                    player={seat}
                    seat={r.id}
                    state={r.id === p.drawer ? 'drawing' : r.points > 0 ? 'solved' : undefined}
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-bold">{nameOf(r.id)}</span>
                    <span className="truncate text-[13px] text-[color:var(--vd-mute)]">
                      {r.why}
                    </span>
                  </span>
                  <span
                    className={`${DISPLAY} pt-1 text-[28px] leading-none ${
                      r.points ? 'text-[color:var(--vd-gold)]' : 'text-[color:var(--vd-mute)]'
                    }`}
                  >
                    +{r.points}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <div className="flex items-center justify-center gap-3 text-[15px] font-semibold">
        <BulbString total={total} lit={left} perRow={total} className="w-28" />
        <span>{last ? `Tổng kết sau ${left} giây` : `Lượt ${view.turn + 1} sau ${left} giây`}</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────── Tổng kết ─────────────────────────────── */

function FinalScreen({
  view,
  you,
  isHost,
  gallery,
  onAgain,
  onLobby,
}: {
  view: GameView;
  you: number;
  isHost: boolean;
  gallery: Drawing[];
  onAgain: () => void;
  onLobby: () => void;
}) {
  const ranking = view.seats
    .map((s, id) => ({ ...s, id }))
    .sort((a, b) => b.score - a.score || a.id - b.id);
  const top = ranking[0]!;
  const tied = ranking.filter((r) => r.score === top.score).length > 1;
  const nameOf = (id: number) => (id === you ? 'Bạn' : (view.seats[id]?.name ?? '?'));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10">
      <div className="mx-auto w-full max-w-md">
        <Marquee>
          <h2
            className={`${DISPLAY} pt-3 text-[56px] leading-[0.9] text-[color:var(--vd-gold)] [text-shadow:0_3px_0_var(--vd-redDeep),0_0_24px_rgb(255_201_60/0.45)]`}
          >
            {tied ? 'Hoà!' : `${top.id === you ? 'Bạn' : top.name} thắng!`}
          </h2>
          <p className={`${DISPLAY} pt-1 text-2xl leading-none text-[color:var(--vd-bulb)]`}>
            {top.score} điểm sau {view.turns} lượt
          </p>
        </Marquee>
      </div>

      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <ol className="flex flex-col gap-2" aria-label="Bảng điểm">
          {ranking.map((r, i) => {
            const first = r.score === top.score;
            return (
              <li
                key={r.id}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                  first
                    ? 'bg-[color:var(--vd-gold)] text-[color:var(--vd-ink)]'
                    : 'bg-[color:var(--vd-tarpHi)]'
                }`}
              >
                <span
                  className={`${DISPLAY} flex h-9 w-9 shrink-0 items-center justify-center rounded-full pt-1 text-xl leading-none ${
                    first
                      ? 'bg-[color:var(--vd-ink)] text-[color:var(--vd-gold)]'
                      : 'bg-[color:var(--vd-paper)] text-[color:var(--vd-ink)]'
                  }`}
                >
                  {i + 1}
                </span>
                <Avatar player={r} seat={r.id} you={r.id === you} />
                <span className="flex-1 truncate text-lg font-bold">{nameOf(r.id)}</span>
                <span className={`${DISPLAY} pt-1 text-[28px] leading-none tabular-nums`}>
                  {r.score}
                </span>
              </li>
            );
          })}
        </ol>

        {gallery.length > 0 && (
          <section aria-labelledby="vd-gallery" className="flex flex-col gap-3">
            <h3
              id="vd-gallery"
              className={`${DISPLAY} pt-1 text-2xl leading-none text-[color:var(--vd-bulb)]`}
            >
              Tranh của ván
            </h3>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {gallery.map((g) => (
                <li key={g.turn}>
                  <figure className="flex flex-col gap-1">
                    <InkThumb
                      strokes={g.strokes}
                      label={`Tranh "${g.word}" của ${nameOf(g.drawer)}`}
                      thin
                    />
                    <figcaption className="flex items-baseline justify-between gap-2">
                      <span
                        className={`${DISPLAY} truncate pt-1 text-lg leading-none text-[color:var(--vd-gold)]`}
                      >
                        {g.word}
                      </span>
                      <span className="shrink-0 text-xs text-[color:var(--vd-mute)]">
                        {nameOf(g.drawer)} vẽ
                      </span>
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {isHost ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={onAgain} className="sm:min-w-52">
            Chơi ván nữa
          </Button>
          <Button tone="ghost" onClick={onLobby} className="sm:min-w-52">
            Về phòng chờ
          </Button>
        </div>
      ) : (
        <p
          className={`${DISPLAY} pt-1 text-center text-2xl leading-none text-[color:var(--vd-mute)]`}
        >
          Chờ chủ phòng chọn chơi tiếp…
        </p>
      )}
    </div>
  );
}
