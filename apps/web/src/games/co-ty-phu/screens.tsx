'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { cleanName, NAME_MAX, nameError } from '../bong-bong-bum/name';
import { CODE_LENGTH, normalizeCode } from '../bong-bong-bum/net';
import { money } from './data';
import { standings, type Game, type Seat, type SeatKind, type Settings } from './engine';
import { BotIcon, CheckIcon, CopyIcon, DoorIcon, LinkIcon, PassIcon } from './icons';
import { Avatar, Button, Panel, Portrait, Segmented } from './kit';
import { characterName, characterOf, ROSTER } from './roster';
import { DISPLAY } from './theme';

// Các màn ngoài bàn cờ của Cờ tỷ phú: vào game, chuẩn bị ván trên một máy, phòng chờ online và bảng
// xếp hạng cuối ván. Màn chơi nằm ở game.tsx.

const Heading = ({ children }: { children: ReactNode }) => (
  <h1 className={`${DISPLAY} text-[34px] leading-none text-balance text-[color:var(--tp-gold)]`}>
    {children}
  </h1>
);
const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="flex flex-col gap-3">
    <h2 className={`${DISPLAY} text-lg text-[color:var(--tp-ash)]`}>{title}</h2>
    {children}
  </section>
);
/** Đường chỉ vàng dưới tiêu đề, giữa có hạt son như nút khảm trên nắp hộp sơn mài. */
const Rule = () => (
  <span aria-hidden className="flex items-center gap-2">
    <i className="h-px w-10 bg-[color:var(--tp-gold)]" />
    <i className="h-2 w-2 rotate-45 bg-[color:var(--tp-cinnabar)] shadow-[0_0_0_1px_var(--tp-gold)]" />
    <i className="h-px w-10 bg-[color:var(--tp-gold)]" />
  </span>
);

const field =
  'min-h-12 w-full rounded-md bg-[color:var(--tp-lacquer)] px-4 text-base font-semibold text-[color:var(--tp-eggshell)] shadow-[inset_0_0_0_1px_var(--tp-rule)] placeholder:text-[color:var(--tp-ash)] focus:shadow-[inset_0_0_0_2px_var(--tp-gold)] focus:outline-none disabled:opacity-60';

/* ─────────────────────────────── Chọn nhân vật ─────────────────────────────── */

/** Ảnh nhân vật bấm được để đổi, có chữ "Đổi" nhỏ ở góc. */
function CharacterButton({
  character,
  id,
  size = 48,
  onClick,
}: {
  character: string;
  id: number;
  size?: number;
  onClick?: () => void;
}) {
  if (!onClick) return <Avatar character={character} id={id} size={size} />;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Đổi nhân vật (đang là ${characterName(character)})`}
      title="Đổi nhân vật"
      className="relative shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--tp-gold)]"
    >
      <Avatar character={character} id={id} size={size} />
      <span className="absolute -right-1 -bottom-1 rounded-full bg-[color:var(--tp-gold)] px-1.5 py-px text-[10px] font-bold text-[color:var(--tp-lacquer)]">
        Đổi
      </span>
    </button>
  );
}

/** Bảng chọn nhân vật: nhân vật người khác đã chọn thì mờ đi, không chọn được. */
export function CharacterPicker({
  value,
  taken,
  onPick,
  onClose,
}: {
  value: string;
  taken: string[];
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <Panel className="flex max-h-[85dvh] w-full max-w-lg flex-col gap-3 rounded-b-none p-4 pb-[max(16px,env(safe-area-inset-bottom))] sm:rounded-b-lg">
        <div className="flex items-center justify-between">
          <h2 className={`${DISPLAY} text-2xl text-[color:var(--tp-gold)]`}>Chọn nhân vật</h2>
          <Button tone="ghost" className="min-h-9 px-3 text-sm" onClick={onClose}>
            Đóng
          </Button>
        </div>
        <ul className="grid grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4" role="listbox">
          {ROSTER.map((id) => {
            const on = id === value;
            const off = !on && taken.includes(id);
            return (
              <li key={id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={on}
                  disabled={off}
                  onClick={() => onPick(id)}
                  className={`flex w-full flex-col items-center gap-1 rounded-md p-2 text-center disabled:opacity-30 ${
                    on
                      ? 'bg-[color:var(--tp-gold)] text-[color:var(--tp-lacquer)]'
                      : 'bg-[color:var(--tp-lacquer)] shadow-[inset_0_0_0_1px_var(--tp-rule)] hover:shadow-[inset_0_0_0_1px_var(--tp-gold)]'
                  }`}
                >
                  <Portrait character={id} className="aspect-square w-full object-contain" />
                  <span className="w-full truncate text-xs font-bold">{characterName(id)}</span>
                  {off && <span className="text-[10px]">Đã có người</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}

/** Nhân vật các ghế khác đang dùng (để không chọn trùng). */
const takenBy = (seats: Seat[], except: number) =>
  seats.filter((s) => s.id !== except && s.kind !== 'empty').map((s) => characterOf(s));

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
      className="flex min-h-[76px] w-full items-center gap-4 rounded-lg bg-[color:var(--tp-lacquerHi)] px-4 text-left shadow-[inset_0_0_0_1px_rgb(212_167_58/0.3)] transition-shadow hover:shadow-[inset_0_0_0_1px_var(--tp-gold)] focus-visible:shadow-[inset_0_0_0_2px_var(--tp-gold)] focus-visible:outline-none"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-[color:var(--tp-cinnabar)] text-[color:var(--tp-goldHi)] shadow-[inset_0_0_0_1px_rgb(212_167_58/0.6)]">
        {icon}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className={`${DISPLAY} text-xl leading-tight text-[color:var(--tp-eggshell)]`}>
          {title}
        </span>
        <span className="text-sm text-[color:var(--tp-ash)]">{hint}</span>
      </span>
    </button>
  );
}

export function HomeScreen({
  name,
  onName,
  character,
  onCharacter,
  onLocal,
  onBots,
  onHost,
  onJoin,
  notice,
  pendingRoom,
}: {
  name: string;
  onName: (n: string) => void;
  /** Nhân vật dùng khi lập/vào phòng online và khi chơi với máy. */
  character: string;
  onCharacter: (id: string) => void;
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
  const [picking, setPicking] = useState(false);
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
          {ROSTER.slice(0, 6).map((id, i) => (
            <Avatar key={id} character={id} id={i} size={34} />
          ))}
        </div>
        <h1 className={`${DISPLAY} text-[60px] leading-[0.95] text-[color:var(--tp-gold)]`}>
          Cờ tỷ phú
        </h1>
        <Rule />
        <p className="text-lg text-[color:var(--tp-ash)]">
          Từ Hà Giang tới Phú Quốc: mua đất, xây nhà, thu tiền thuê. Ai còn trụ lại, hoặc giàu nhất
          khi hết giờ, là tỷ phú.
        </p>
      </div>

      {notice && (
        <p
          role="alert"
          className="rounded-md bg-[#a3201a33] px-4 py-3 font-semibold shadow-[inset_0_0_0_1px_var(--tp-cinnabar)]"
        >
          {notice}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="tp-name" className="text-sm font-bold text-[color:var(--tp-ash)]">
          Tên và nhân vật của bạn
        </label>
        <div className="flex items-center gap-3">
          <CharacterButton
            character={character}
            id={0}
            size={52}
            onClick={() => setPicking(true)}
          />
          <input
            id="tp-name"
            value={draft}
            maxLength={NAME_MAX}
            autoComplete="nickname"
            onChange={(e) => setDraft(e.target.value)}
            placeholder="VD: Bạch Thái Bưởi"
            className={field}
            aria-invalid={tried && !!err}
          />
        </div>
        {picking && (
          <CharacterPicker
            value={character}
            taken={[]}
            onPick={(id) => {
              onCharacter(id);
              setPicking(false);
            }}
            onClose={() => setPicking(false)}
          />
        )}
        {tried && err && <p className="text-sm font-semibold text-[#e2574c]">{err}</p>}
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
              title="Chơi chung máy"
              hint="Chuyền một điện thoại quanh bàn"
              onClick={onLocal}
            />
            <ModeRow
              icon={<BotIcon />}
              title="Chơi với máy"
              hint="Bạn đấu một tới năm máy"
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
            <label htmlFor="tp-code" className="text-sm font-bold text-[color:var(--tp-ash)]">
              Có mã phòng?
            </label>
            <div className="flex gap-2">
              <input
                id="tp-code"
                value={clean}
                onChange={(e) => setCode(e.target.value)}
                autoCapitalize="characters"
                autoComplete="off"
                placeholder="KX4M2P"
                className={`${field} ${DISPLAY} min-w-0 flex-1 text-xl tracking-[0.3em]`}
              />
              <Button type="submit" tone="ghost" disabled={clean.length !== CODE_LENGTH}>
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

/* ─────────────────────────────── Cách tính thắng ─────────────────────────────── */

function SettingsEditor({
  settings,
  onChange,
  disabled,
}: {
  settings: Settings;
  onChange?: (s: Settings) => void;
  disabled?: boolean;
}) {
  const set = (patch: Partial<Settings>) => onChange?.({ ...settings, ...patch });
  return (
    <Panel className="flex flex-col gap-4 p-4">
      <Segmented
        label="Ván kết thúc khi"
        value={settings.mode}
        disabled={disabled}
        onChange={(mode) => set({ mode })}
        options={[
          { value: 'rounds', label: 'Đủ vòng' },
          { value: 'timed', label: 'Hết giờ' },
          { value: 'full', label: 'Còn một người' },
        ]}
      />
      {settings.mode === 'rounds' && (
        <Segmented
          label="Số vòng"
          value={settings.rounds}
          disabled={disabled}
          onChange={(rounds) => set({ rounds })}
          options={[10, 20, 30].map((n) => ({ value: n, label: `${n} vòng` }))}
        />
      )}
      {settings.mode === 'timed' && (
        <Segmented
          label="Thời gian"
          value={settings.minutes}
          disabled={disabled}
          onChange={(minutes) => set({ minutes })}
          options={[20, 30, 45, 60].map((n) => ({ value: n, label: `${n} phút` }))}
        />
      )}
      <Segmented
        label="Vốn khởi nghiệp"
        value={settings.startCash}
        disabled={disabled}
        onChange={(startCash) => set({ startCash })}
        options={[10000, 15000, 20000].map((n) => ({ value: n, label: money(n) }))}
      />
      <p className="text-sm text-[color:var(--tp-ash)]">
        {settings.mode === 'full'
          ? 'Chơi tới khi chỉ còn một người chưa phá sản — thường mất hơn một giờ.'
          : 'Khi kết thúc, ai có tổng tài sản (tiền, đất, nhà) lớn nhất thắng.'}
      </p>
    </Panel>
  );
}

/** Các nút chọn người / máy / trống cho một ghế. */
function KindPicker({
  id,
  kind,
  kinds,
  onKind,
}: {
  id: number;
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
      aria-label={`Ghế ${id + 1}`}
    >
      {kinds.map((k) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={kind === k}
          onClick={() => onKind(k)}
          className={`min-h-10 rounded-md text-sm font-bold ${
            kind === k
              ? 'bg-[color:var(--tp-gold)] text-[color:var(--tp-lacquer)]'
              : 'text-[color:var(--tp-ash)] shadow-[inset_0_0_0_1px_var(--tp-rule)] hover:text-[color:var(--tp-eggshell)]'
          }`}
        >
          {label[k]}
        </button>
      ))}
    </div>
  );
}

/** Máy mang tên nhân vật của mình. */
export const botName = (character: string) => characterName(character);

/* ─────────────────────────────── Chuẩn bị (chung máy / với máy) ─────────────────────────────── */

export function SetupScreen({
  seats,
  onSeats,
  settings,
  onSettings,
  onStart,
}: {
  seats: Seat[];
  onSeats: (s: Seat[]) => void;
  settings: Settings;
  onSettings: (s: Settings) => void;
  onStart: () => void;
}) {
  const active = seats.filter((p) => p.kind !== 'empty').length;
  const nameless = seats.some((p) => p.kind === 'human' && !p.name.trim());
  const update = (i: number, patch: Partial<Seat>) =>
    onSeats(seats.map((p, k) => (k === i ? { ...p, ...patch } : p)));
  const [picking, setPicking] = useState<number | null>(null);
  const picked = picking === null ? null : seats[picking]!;
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      {picked && (
        <CharacterPicker
          value={characterOf(picked)}
          taken={takenBy(seats, picked.id)}
          onPick={(character) => {
            update(picking!, {
              character,
              ...(picked.kind === 'bot' ? { name: botName(character) } : {}),
            });
            setPicking(null);
          }}
          onClose={() => setPicking(null)}
        />
      )}
      <div className="flex flex-col gap-3">
        <Heading>Mời vào bàn</Heading>
        <Rule />
      </div>
      <ul className="flex flex-col gap-2">
        {seats.map((p, i) => (
          <li key={p.id}>
            <Panel className={`flex flex-col gap-3 p-3 ${p.kind === 'empty' ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-3">
                {p.kind === 'empty' ? (
                  <span
                    aria-hidden
                    className="h-11 w-11 shrink-0 rounded-full shadow-[inset_0_0_0_2px_var(--tp-rule)]"
                  />
                ) : (
                  <CharacterButton
                    character={characterOf(p)}
                    id={p.id}
                    size={44}
                    onClick={() => setPicking(i)}
                  />
                )}
                {p.kind === 'human' ? (
                  <input
                    aria-label={`Tên người chơi ${p.id + 1}`}
                    value={p.name}
                    maxLength={NAME_MAX}
                    placeholder={`Tên người chơi ${p.id + 1}`}
                    onChange={(e) => update(i, { name: e.target.value })}
                    className={`${field} min-h-11`}
                  />
                ) : (
                  <span className="flex-1 font-bold text-[color:var(--tp-ash)]">
                    {p.kind === 'bot' ? p.name : `Ghế ${p.id + 1} để trống`}
                  </span>
                )}
              </div>
              <KindPicker
                id={p.id}
                kind={p.kind}
                kinds={['human', 'bot', 'empty']}
                onKind={(kind) =>
                  update(i, { kind, name: kind === 'bot' ? botName(characterOf(p)) : '' })
                }
              />
            </Panel>
          </li>
        ))}
      </ul>
      <Section title="Cách tính thắng">
        <SettingsEditor settings={settings} onChange={onSettings} />
      </Section>
      <div className="sticky bottom-0 -mx-4 bg-[#120b09f2] px-4 pt-2 pb-[max(16px,env(safe-area-inset-bottom))]">
        <Button className="w-full" onClick={onStart} disabled={active < 2 || nameless}>
          {active < 2
            ? 'Cần ít nhất hai người chơi'
            : nameless
              ? 'Đặt tên cho mỗi người'
              : `Vào ván · ${active} người`}
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
        color: { dark: '#120b09', light: '#efe6d2' },
      }).then((url) => alive && setSrc(url)),
    );
    return () => {
      alive = false;
    };
  }, [link]);
  return (
    <div className="h-[128px] w-[128px] shrink-0 rounded-md bg-[color:var(--tp-eggshell)] p-1.5">
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
  settings,
  onSeatKind,
  onCharacter,
  onSettings,
  onStart,
}: {
  code: string;
  link: string;
  seats: Seat[];
  you: number;
  isHost: boolean;
  settings: Settings;
  onSeatKind: (id: number, kind: SeatKind) => void;
  /** Đổi nhân vật của một ghế (của mình; chủ phòng đổi được cả ghế máy). */
  onCharacter: (id: number, character: string) => void;
  onSettings: (s: Settings) => void;
  onStart: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [picking, setPicking] = useState<number | null>(null);
  const picked = picking === null ? null : (seats.find((s) => s.id === picking) ?? null);
  const active = seats.filter((p) => p.kind !== 'empty').length;
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Heading>Phòng chờ</Heading>
        <Rule />
      </div>
      <Panel className="flex gap-4 p-4">
        <RoomQr link={link} />
        <div className="flex min-w-0 flex-col justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-[color:var(--tp-ash)]">Mã phòng</span>
            <span
              className={`${DISPLAY} text-[34px] leading-none tracking-[0.12em] text-[color:var(--tp-goldHi)]`}
            >
              {code || '······'}
            </span>
          </div>
          <Button
            tone="ghost"
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
      </Panel>

      {picked && (
        <CharacterPicker
          value={characterOf(picked)}
          taken={takenBy(seats, picked.id)}
          onPick={(character) => {
            onCharacter(picked.id, character);
            setPicking(null);
          }}
          onClose={() => setPicking(null)}
        />
      )}
      <Section title={`Người chơi · ${active}/${seats.length}`}>
        <ul className="flex flex-col gap-2">
          {seats.map((p) => (
            <li key={p.id}>
              <Panel className="flex flex-col gap-3 p-3">
                <div className="flex items-center gap-3">
                  {p.kind === 'empty' ? (
                    <span
                      aria-hidden
                      className="h-10 w-10 shrink-0 rounded-full shadow-[inset_0_0_0_2px_var(--tp-rule)]"
                    />
                  ) : (
                    <CharacterButton
                      character={characterOf(p)}
                      id={p.id}
                      size={40}
                      onClick={
                        p.id === you || (isHost && p.kind === 'bot')
                          ? () => setPicking(p.id)
                          : undefined
                      }
                    />
                  )}
                  <span className="flex min-w-0 flex-1 flex-col leading-tight">
                    {p.kind === 'empty' ? (
                      <span className="text-[color:var(--tp-ash)]">Ghế trống — chờ người vào</span>
                    ) : (
                      <>
                        <span className="truncate font-bold">{p.name}</span>
                        <span className="text-xs font-semibold text-[color:var(--tp-ash)]">
                          {p.id === you
                            ? 'Bạn'
                            : p.kind === 'bot'
                              ? 'Máy'
                              : p.id === 0
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
                    id={p.id}
                    kind={p.kind}
                    kinds={['empty', 'bot']}
                    onKind={(k) => onSeatKind(p.id, k)}
                  />
                )}
              </Panel>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Cách tính thắng">
        <SettingsEditor settings={settings} onChange={onSettings} disabled={!isHost} />
      </Section>

      <div className="sticky bottom-0 -mx-4 bg-[#120b09f2] px-4 pt-2 pb-[max(16px,env(safe-area-inset-bottom))]">
        {isHost ? (
          <Button className="w-full" onClick={onStart} disabled={active < 2}>
            {active < 2 ? 'Cần ít nhất hai người chơi' : `Vào ván · ${active} người`}
          </Button>
        ) : (
          <p className="py-3 text-center font-bold text-[color:var(--tp-ash)]">
            Chờ chủ phòng mở ván…
          </p>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────── Cuối ván ─────────────────────────────── */

export function WinScreen({
  game,
  onAgain,
  onHome,
  againLabel = 'Chơi ván nữa',
}: {
  game: Game;
  onAgain?: () => void;
  onHome: () => void;
  againLabel?: string;
}) {
  const ranked = standings(game);
  const w = ranked[0]!;
  const reason =
    game.settings.mode === 'full' || ranked.filter((p) => !p.bankrupt).length === 1
      ? 'Người cuối cùng chưa phá sản.'
      : game.settings.mode === 'rounds'
        ? `Giàu nhất sau ${game.settings.rounds} vòng.`
        : `Giàu nhất khi hết ${game.settings.minutes} phút.`;
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div className="tp-card flex flex-col items-start gap-4 rounded-lg bg-[color:var(--tp-cinnabar)] p-6 text-[color:var(--tp-goldHi)] shadow-[inset_0_0_0_1px_rgb(240_207_114/0.7),inset_0_-4px_0_var(--tp-cinnabarDeep),0_24px_50px_-20px_rgb(0_0_0/0.9)]">
        <Avatar character={characterOf(w)} id={w.id} size={72} />
        <h1 className={`${DISPLAY} text-[44px] leading-[0.95] text-balance`}>
          {w.name} là tỷ phú!
        </h1>
        <p className="text-lg font-semibold">
          {reason} Tài sản {money(w.worth)}.
        </p>
      </div>
      <ol className="flex flex-col gap-2" aria-label="Thứ hạng">
        {ranked.map((p, i) => (
          <li key={p.id}>
            <Panel className="flex min-h-16 items-center gap-3 px-4">
              <span className={`${DISPLAY} w-7 text-3xl text-[color:var(--tp-gold)] tabular-nums`}>
                {i + 1}
              </span>
              <Avatar character={characterOf(p)} id={p.id} size={32} />
              <span className="min-w-0 flex-1 truncate font-bold">{p.name}</span>
              <span className="text-sm font-semibold text-[color:var(--tp-ash)] tabular-nums">
                {p.bankrupt ? 'Phá sản' : money(p.worth)}
              </span>
            </Panel>
          </li>
        ))}
      </ol>
      <div className="flex flex-col gap-2">
        {onAgain && (
          <Button className="w-full" onClick={onAgain}>
            {againLabel}
          </Button>
        )}
        <Button tone="ghost" className="w-full" onClick={onHome}>
          Về trang chính
        </Button>
      </div>
    </div>
  );
}
