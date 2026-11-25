'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { nameError } from '../bong-bong-bum/name';
import { CODE_LENGTH, normalizeCode } from '../bong-bong-bum/net';
import { CATALOG, CATEGORY_NAME, GOALS, ITEM, type Category, type Kind } from './catalog';
import {
  footprint,
  fund,
  goalProgress,
  left,
  LOT,
  nearestEdge,
  parseEdge,
  placeError,
  quote,
  roomName,
  rooms,
  type Action,
  type Edge,
  type House,
  type Rot,
  type Seat,
} from './engine';
import { metres, money } from './format';
import {
  IconBack,
  IconCheck,
  IconDoor,
  IconErase,
  IconGoal,
  IconKey,
  IconMinus,
  IconPlus,
  IconRecenter,
  IconRotate,
  IconShare,
  IconSofa,
  IconTile,
  IconWall,
  IconWindow,
} from './icons';
import type { Peers, Presence } from './net';
import type { Joined } from './store';
import { DISPLAY, PALETTE, SEAT } from './theme';
import { seatTileUrl, TILES, tileUrl, type TileId } from './tiles';
import { createHouseView, furnitureThumbs, type HouseView, type Label } from './view3d';

// Các màn của Nhà Mình: vào game, chờ kết nối, xây nhà (cảnh 3D và bảng thao tác), mời người kia,
// cách chơi.

/** Ô vuông lát gạch bông `id`, lặp hoa văn theo cỡ `tile` px. */
function Swatch({
  id,
  size = 28,
  tile = 14,
  className = '',
}: {
  id: TileId | null;
  size?: number;
  tile?: number;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  // tileUrl cần canvas của trình duyệt: vẽ sau khi gắn vào trang.
  useEffect(() => setUrl(id ? tileUrl(id) : null), [id]);
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 rounded-[3px] bg-[color:var(--nm-cement)] shadow-[inset_0_0_0_1px_rgb(0_0_0/.12)] ${className}`}
      style={{
        width: size,
        height: size,
        backgroundImage: url ? `url(${url})` : undefined,
        backgroundSize: `${tile}px ${tile}px`,
      }}
    />
  );
}

/** Dải gạch bông viền mép trên của bảng thao tác: chữ ký của thế giới này. */
function TileBand({ id = 'hoa-thi', h = 10 }: { id?: TileId; h?: number }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => setUrl(tileUrl(id, 64)), [id]);
  return (
    <div
      aria-hidden
      className="w-full shrink-0 bg-[color:var(--nm-ox)]"
      style={{
        height: h,
        backgroundImage: url ? `url(${url})` : undefined,
        backgroundSize: `${h * 2}px ${h * 2}px`,
        backgroundPosition: `0 -${h / 2}px`,
      }}
    />
  );
}

function Primary({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[10px] bg-[color:var(--nm-ochre)] px-5 text-center text-[16px] font-black leading-tight text-[color:var(--nm-ink)] shadow-[0_8px_16px_-8px_rgb(156_114_32/.75)] transition-[transform,box-shadow] duration-150 [text-wrap:balance] active:translate-y-[1px] active:shadow-[0_3px_6px_-3px_rgb(156_114_32/.7)] disabled:bg-[color:var(--nm-limeDeep)] disabled:text-[color:var(--nm-inkSoft)] disabled:shadow-none"
    >
      {children}
    </button>
  );
}

function Secondary({
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
      className="grid min-h-[52px] min-w-[52px] place-items-center rounded-[10px] bg-white px-3 font-extrabold shadow-[0_3px_8px_-4px_rgb(38_34_31/.4)] active:translate-y-[1px] active:shadow-none"
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Màn vào game
// ---------------------------------------------------------------------------

export function HomeScreen({
  name,
  setName,
  houses,
  joined,
  notice,
  initialCode,
  onCreate,
  onOpen,
  onJoin,
  onGuide,
}: {
  name: string;
  setName: (n: string) => void;
  houses: House[];
  joined: Joined[];
  notice: string | null;
  initialCode: string;
  onCreate: () => void;
  onOpen: (id: string) => void;
  onJoin: (code: string) => void;
  onGuide: () => void;
}) {
  const [code, setCode] = useState(initialCode);
  const nameErr = nameError(name);
  const codeOk = code.length === CODE_LENGTH;

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[460px] flex-col">
      <div className="flex items-center justify-between px-4 pt-4">
        <Link
          href="/games"
          className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-sm font-bold text-[color:var(--nm-inkSoft)] hover:text-[color:var(--nm-ink)]"
        >
          <IconBack className="h-5 w-5" /> Games
        </Link>
        <button
          type="button"
          onClick={onGuide}
          className="min-h-11 rounded-full px-3 text-sm font-extrabold text-[color:var(--nm-ink)] underline decoration-[color:var(--nm-ochre)] decoration-2 underline-offset-4"
        >
          Cách chơi
        </button>
      </div>

      <header className="px-5 pb-6 pt-6">
        <div className="mb-5 flex gap-1.5" aria-hidden>
          {(['hoa-thi', 'sao', 'ban-co', 'qua-tram'] as TileId[]).map((t) => (
            <Swatch key={t} id={t} size={44} tile={44} />
          ))}
        </div>
        <h1 className={`${DISPLAY} text-[56px] leading-[0.95] tracking-[-0.01em]`}>Nhà Mình</h1>
        <p className="mt-3 max-w-[32ch] text-[17px] font-semibold leading-snug text-[color:var(--nm-inkSoft)]">
          Hai người, một quỹ tiền, cùng xây một căn nhà. Mỗi người một máy, xây tới đâu người kia
          thấy tới đó.
        </p>
      </header>

      {notice && (
        <p
          role="alert"
          className="mx-4 mb-4 rounded-[10px] bg-[color:var(--nm-ox)] px-4 py-3 text-[14px] font-bold text-white"
        >
          {notice}
        </p>
      )}

      <section
        className="mx-4 overflow-hidden rounded-[14px] bg-[color:var(--nm-lime)] shadow-[0_14px_30px_-18px_rgb(38_34_31/.55)]"
        aria-label="Xây nhà mới"
      >
        <TileBand />
        <div className="flex flex-col gap-4 p-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-[color:var(--nm-inkSoft)]">Tên bạn</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={16}
              autoComplete="nickname"
              className="min-h-12 rounded-[8px] bg-white px-3.5 text-[17px] font-bold outline-none shadow-[inset_0_0_0_1.5px_var(--nm-cementDeep)] focus:shadow-[inset_0_0_0_2px_var(--nm-ox)]"
            />
            {nameErr && name && (
              <span className="text-[13px] font-bold text-[color:var(--nm-ox)]">{nameErr}</span>
            )}
          </label>
          <Primary onClick={onCreate} disabled={!!nameErr}>
            Xây nhà mới
          </Primary>
          <p className="text-[13px] font-semibold text-[color:var(--nm-inkSoft)]">
            Bạn được khung nhà 10 × 8 m và 120.000 ₫ quỹ chung, rồi gửi mã cho người kia vào cùng.
            Nhà lưu trên máy này.
          </p>
        </div>
      </section>

      <section
        className="mx-4 mt-4 flex flex-col gap-2 rounded-[14px] bg-[color:var(--nm-lime)] p-4"
        aria-label="Vào nhà bằng mã"
      >
        <span className="text-sm font-bold text-[color:var(--nm-inkSoft)]">Vào nhà người khác</span>
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(normalizeCode(e.target.value))}
            placeholder={`Mã ${CODE_LENGTH} ký tự`}
            aria-label="Mã nhà"
            autoCapitalize="characters"
            autoComplete="off"
            className="min-h-12 min-w-0 flex-1 rounded-[8px] bg-white px-3.5 font-mono text-[18px] font-bold uppercase tracking-[0.2em] outline-none shadow-[inset_0_0_0_1.5px_var(--nm-cementDeep)] placeholder:font-sans placeholder:font-semibold placeholder:normal-case placeholder:tracking-normal placeholder:text-[color:var(--nm-inkSoft)] focus:shadow-[inset_0_0_0_2px_var(--nm-teal)]"
          />
          <button
            type="button"
            disabled={!codeOk || !!nameErr}
            onClick={() => onJoin(code)}
            className="inline-flex min-h-12 items-center gap-1.5 rounded-[8px] bg-[color:var(--nm-teal)] px-4 font-extrabold text-white disabled:opacity-40"
          >
            <IconKey className="h-5 w-5" /> Vào
          </button>
        </div>
      </section>

      {houses.length > 0 && (
        <section className="mx-4 mt-6" aria-labelledby="nm-mine">
          <h2 id="nm-mine" className={`${DISPLAY} mb-2 text-xl`}>
            Nhà của bạn
          </h2>
          <ul className="flex flex-col gap-2">
            {houses.map((h) => (
              <li key={h.id}>
                <HouseRow
                  tiles={rooms(h)
                    .filter((r) => r.enclosed)
                    .slice(0, 4)
                    .map((r) => h.floor[r.cells[0]!] ?? null)}
                  title={h.name}
                  meta={`${h.players[1] ? `Cùng ${h.players[1]} · ` : ''}còn ${money(left(h))} · ${h.goals.length}/${GOALS.length} mục tiêu`}
                  cta="Xây tiếp"
                  disabled={!!nameErr}
                  onClick={() => onOpen(h.id)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {joined.length > 0 && (
        <section className="mx-4 mt-6" aria-labelledby="nm-joined">
          <h2 id="nm-joined" className={`${DISPLAY} mb-2 text-xl`}>
            Nhà bạn đã vào
          </h2>
          <ul className="flex flex-col gap-2">
            {joined.map((j) => (
              <li key={j.code}>
                <HouseRow
                  tiles={[]}
                  title={j.name}
                  meta={`Chủ nhà ${j.host} · mã ${j.code} · chủ nhà cần mở nhà trước`}
                  cta="Vào"
                  disabled={!!nameErr}
                  onClick={() => onJoin(j.code)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="h-10" />
    </div>
  );
}

function HouseRow({
  tiles,
  title,
  meta,
  cta,
  disabled,
  onClick,
}: {
  tiles: (TileId | null)[];
  title: string;
  meta: string;
  cta: string;
  disabled: boolean;
  onClick: () => void;
}) {
  const four = [...tiles, null, null, null, null].slice(0, 4);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-3 rounded-[12px] bg-[color:var(--nm-lime)] p-3 text-left shadow-[inset_0_0_0_1.5px_var(--nm-cementDeep)] hover:shadow-[inset_0_0_0_2px_var(--nm-ink)] disabled:opacity-60"
    >
      <span className="grid shrink-0 grid-cols-2 gap-0.5" aria-hidden>
        {four.map((t, i) => (
          <Swatch key={i} id={t} size={22} tile={11} />
        ))}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[16px] font-extrabold">{title}</span>
        <span className="text-[13px] font-semibold leading-snug text-[color:var(--nm-inkSoft)]">
          {meta}
        </span>
      </span>
      <span className="shrink-0 rounded-full bg-[color:var(--nm-ink)] px-3 py-1.5 text-[13px] font-extrabold text-[color:var(--nm-lime)]">
        {cta}
      </span>
    </button>
  );
}

export function Connecting({ text, onCancel }: { text: string; onCancel: () => void }) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex gap-1.5" aria-hidden>
        {(['hoa-thi', 'sao', 'ban-co', 'qua-tram'] as TileId[]).map((t, i) => (
          <span key={t} className="nm-lay" style={{ animationDelay: `${i * 0.15}s` }}>
            <Swatch id={t} size={36} tile={36} />
          </span>
        ))}
      </div>
      <p role="status" className={`${DISPLAY} text-2xl`}>
        {text}
      </p>
      <button
        type="button"
        onClick={onCancel}
        className="min-h-11 rounded-full px-4 font-extrabold text-[color:var(--nm-inkSoft)] underline underline-offset-4"
      >
        Huỷ
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Màn xây nhà
// ---------------------------------------------------------------------------

const TILE_COUNT = 24;

/** Tiến độ một mục tiêu: mỗi món cần có là một ô, đủ món thì ô tô vàng nghệ. */
function GoalSquares({ have, need, done }: { have: number; need: number; done: boolean }) {
  return (
    <span className="flex shrink-0 gap-[3px]" role="img" aria-label={`${have} trên ${need}`}>
      {Array.from({ length: need }, (_, i) => (
        <span
          key={i}
          className="h-2.5 w-2.5 rounded-[2px]"
          style={
            i < have || done
              ? { background: 'var(--nm-ochre)' }
              : { boxShadow: 'inset 0 0 0 1.5px var(--nm-cementDeep)' }
          }
        />
      ))}
    </span>
  );
}

/** Quỹ chung là một hàng gạch cố định: A lát từ trái, B lát từ phải, phần giữa còn trống là tiền còn lại. */
function BudgetRow({ house, peers }: { house: House; peers: Peers }) {
  const [laid, setLaid] = useState<[string, string] | null>(null);
  useEffect(() => setLaid([seatTileUrl(0), seatTileUrl(1)]), []);
  const total = fund(house);
  const a = Math.min(TILE_COUNT, Math.round((house.spent[0] / total) * TILE_COUNT));
  const b = Math.min(TILE_COUNT - a, Math.round((house.spent[1] / total) * TILE_COUNT));
  const rest = left(house);
  return (
    <div className="flex w-full flex-col gap-1.5 md:mx-auto md:max-w-[560px]">
      <div className="flex items-end justify-between gap-2">
        <Spent seat={0} house={house} peers={peers} />
        <div className="shrink-0 text-center">
          <div className={`${DISPLAY} text-[22px] leading-none tabular-nums`}>{money(rest)}</div>
          <div className="text-[11px] font-bold text-[color:var(--nm-inkSoft)]">
            còn trong quỹ chung
          </div>
        </div>
        <Spent seat={1} house={house} peers={peers} />
      </div>
      <div
        className="grid gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${TILE_COUNT}, minmax(0,1fr))` }}
        role="img"
        aria-label={`Đã chi ${money(house.spent[0])} và ${money(house.spent[1])}, còn ${money(rest)} trên ${money(total)}`}
      >
        {Array.from({ length: TILE_COUNT }, (_, i) => {
          const seat = i < a ? 0 : i >= TILE_COUNT - b ? 1 : null;
          return (
            <span
              key={i}
              className="aspect-square rounded-[2px]"
              style={
                seat === null
                  ? { boxShadow: 'inset 0 0 0 1.5px var(--nm-cementDeep)' }
                  : {
                      backgroundColor: SEAT[seat].color,
                      backgroundImage: laid ? `url(${laid[seat]})` : undefined,
                      backgroundSize: 'cover',
                    }
              }
            />
          );
        })}
      </div>
    </div>
  );
}

function Spent({ seat, house, peers }: { seat: Seat; house: House; peers: Peers }) {
  const name = peers.names[seat];
  const online = peers.online[seat];
  return (
    <div className={`flex min-w-0 items-center gap-2 ${seat ? 'flex-row-reverse text-right' : ''}`}>
      <span
        className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full text-[15px] font-black text-white"
        style={{
          background: name ? SEAT[seat].color : 'transparent',
          boxShadow: name ? undefined : `inset 0 0 0 2px ${PALETTE.cementDeep}`,
        }}
      >
        {name ? name[0]!.toUpperCase() : ''}
        {name && (
          <span
            className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full shadow-[0_0_0_2px_var(--nm-cement)]"
            style={{ background: online ? PALETTE.ochre : PALETTE.cementDeep }}
            aria-label={online ? 'Đang trong nhà' : 'Đang vắng'}
          />
        )}
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-[14px] font-extrabold">{name ?? 'Chờ người kia'}</span>
        <span className="text-[12px] font-bold tabular-nums text-[color:var(--nm-inkSoft)]">
          {name ? `−${money(house.spent[seat])}` : 'gửi mã để mời'}
        </span>
      </span>
    </div>
  );
}

type Tab = 'xay' | 'san' | 'noi-that' | 'muc-tieu';
type Tool = 'wall' | 'door' | 'window' | 'erase';

const TABS: { id: Tab; label: string; Icon: typeof IconWall }[] = [
  { id: 'xay', label: 'Xây', Icon: IconWall },
  { id: 'san', label: 'Sàn', Icon: IconTile },
  { id: 'noi-that', label: 'Nội thất', Icon: IconSofa },
  { id: 'muc-tieu', label: 'Mục tiêu', Icon: IconGoal },
];

const TOOLS: { id: Tool; label: string; Icon: typeof IconWall }[] = [
  { id: 'wall', label: 'Tường', Icon: IconWall },
  { id: 'door', label: 'Cửa đi', Icon: IconDoor },
  { id: 'window', label: 'Cửa sổ', Icon: IconWindow },
  { id: 'erase', label: 'Gỡ bỏ', Icon: IconErase },
];

/** Ảnh món đồ dựng từ chính mô hình 3D trong cảnh (furnitureThumbs), trên nền xi măng. */
function Thumb({ src, name }: { src: string | undefined; name: string }) {
  return (
    <span className="grid h-[72px] place-items-center overflow-hidden rounded-[6px] bg-[color:var(--nm-cement)]">
      {src && (
        // eslint-disable-next-line @next/next/no-img-element -- ảnh dựng tại chỗ (data URL)
        <img src={src} alt="" aria-hidden className="h-[72px] w-[72px]" title={name} />
      )}
    </span>
  );
}

/** Chỗ trống gần giữa nhà nhất để bóng mờ hiện ra (đi vòng ra ngoài từ giữa, bước 50 cm). */
function freeSpot(house: House, kind: Kind) {
  const cands: { x: number; y: number; d: number }[] = [];
  for (let x = 0.25; x < LOT.w; x += 0.5)
    for (let y = 0.25; y < LOT.d; y += 0.5)
      cands.push({ x, y, d: Math.hypot(x - LOT.w / 2, y - LOT.d / 2) });
  cands.sort((a, b) => a.d - b.d);
  for (const c of cands) {
    const p = snapPiece(kind, 0, c.x, c.y);
    if (!placeError(house, kind, p.x, p.y, 0)) return p;
  }
  return snapPiece(kind, 0, LOT.w / 2, LOT.d / 2);
}

/** Đặt tâm món đồ sao cho mép trái/trên rơi vào lưới 10 cm và cả món nằm trong lô. */
function snapPiece(kind: Kind, rot: Rot, x: number, y: number) {
  const f = footprint(kind, rot);
  const clamp = (v: number, size: number, max: number) =>
    Math.min(max - size, Math.max(0, Math.round((v - size / 2) * 10) / 10)) + size / 2;
  return { x: clamp(x, f.w, LOT.w), y: clamp(y, f.d, LOT.d) };
}

const edgeLine = (e: Edge) => {
  const p = parseEdge(e)!;
  return p.dir === 'h'
    ? { x1: p.x, y1: p.y, x2: p.x + 1, y2: p.y }
    : { x1: p.x, y1: p.y, x2: p.x, y2: p.y + 1 };
};

function activity(
  p: Presence,
  house: House,
): { text: string; pos: [number, number, number] } | null {
  if (p.mode === 'place')
    return { text: `đang đặt ${ITEM[p.kind].name.toLowerCase()}`, pos: [p.x, 1.1, p.y] };
  if (p.mode === 'wall') return { text: 'đang xây tường', pos: [p.x1, 1.1, p.y1] };
  if (p.mode === 'select') {
    const q = house.pieces.find((x) => x.id === p.id);
    return q
      ? { text: `đang chọn ${ITEM[q.kind].name.toLowerCase()}`, pos: [q.x, 1.1, q.y] }
      : null;
  }
  return null;
}

export function BuildScreen({
  house,
  you,
  peers,
  other,
  code,
  link,
  toast,
  onAct,
  onPresence,
  onExit,
}: {
  house: House;
  you: Seat;
  peers: Peers;
  other: Presence;
  code: string;
  link: string;
  toast: string | null;
  onAct: (a: Action) => boolean;
  onPresence: (p: Presence) => void;
  onExit: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<HouseView | null>(null);
  const [tab, setTab] = useState<Tab>('noi-that');
  const [cat, setCat] = useState<Category>('khach');
  const [picked, setPicked] = useState<Kind | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number; rot: Rot } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>('wall');
  const [start, setStart] = useState<[number, number] | null>(null);
  const [end, setEnd] = useState<[number, number] | null>(null);
  const [edge, setEdge] = useState<Edge | null>(null);
  const [tile, setTile] = useState<TileId>('hoa-thi');
  const [roomCell, setRoomCell] = useState<number | null>(null);
  const [share, setShare] = useState(false);
  const [thumbs, setThumbs] = useState<Map<Kind, string> | null>(null);
  const otherSeat = (1 - you) as Seat;
  // Ảnh đồ đạc cần WebGL của trình duyệt: dựng sau khi gắn vào trang, một lần cho cả phiên.
  useEffect(() => setThumbs(furnitureThumbs()), []);

  const rs = useMemo(() => rooms(house), [house]);
  // Mục tiêu gần xong nhất (bằng nhau thì theo thứ tự trong danh sách), luôn hiện dưới quỹ chung.
  const next = useMemo(() => {
    const open = GOALS.filter((g) => !house.goals.includes(g.id)).map((g) => {
      const [have, need] = goalProgress(house, g.id, rs);
      return { g, have, need };
    });
    open.sort((a, b) => b.have / b.need - a.have / a.need);
    return open[0] ?? null;
  }, [house, rs]);
  const room = roomCell === null ? null : (rs.find((r) => r.cells.includes(roomCell)) ?? null);

  // Chạm vào cảnh: ý nghĩa tuỳ thẻ và công cụ đang dùng. Cảnh giữ một hàm gọi lại duy nhất từ lúc
  // tạo, nên hàm đó đọc trạng thái mới nhất qua ref.
  const tapRef = useRef<(t: { x: number; y: number; piece: string | null }) => void>(() => {});
  tapRef.current = (t) => {
    if (tab === 'noi-that') {
      if (picked)
        setGhost({ ...snapPiece(picked, ghost?.rot ?? 0, t.x, t.y), rot: ghost?.rot ?? 0 });
      else setSelected((s) => (t.piece && s !== t.piece ? t.piece : null));
    } else if (tab === 'xay') {
      if (tool === 'wall') {
        const gp: [number, number] = [
          Math.min(LOT.w, Math.max(0, Math.round(t.x))),
          Math.min(LOT.d, Math.max(0, Math.round(t.y))),
        ];
        if (!start || end) {
          setStart(gp);
          setEnd(null);
        } else {
          const dx = Math.abs(gp[0] - start[0]);
          const dy = Math.abs(gp[1] - start[1]);
          const e: [number, number] = dx >= dy ? [gp[0], start[1]] : [start[0], gp[1]];
          if (e[0] === start[0] && e[1] === start[1]) setStart(null);
          else setEnd(e);
        }
      } else if (tool === 'erase' && t.piece) {
        setSelected(t.piece);
        setEdge(null);
      } else {
        setSelected(null);
        setEdge(nearestEdge(t.x, t.y));
      }
    } else if (tab === 'san') {
      const cx = Math.floor(t.x);
      const cy = Math.floor(t.y);
      setRoomCell(cx >= 0 && cy >= 0 && cx < LOT.w && cy < LOT.d ? cy * LOT.w + cx : null);
    }
  };

  useEffect(() => {
    // insetTop: chừa chỗ cho dòng "Tiếp theo" nổi ở mép trên cảnh.
    const v = createHouseView(host.current!, { onTap: (t) => tapRef.current(t), insetTop: 44 });
    setView(v);
    return () => {
      v.dispose();
      setView(null);
    };
  }, []);

  // Đổi thẻ hay công cụ thì bỏ việc đang dở.
  const reset = () => {
    setPicked(null);
    setGhost(null);
    setSelected(null);
    setStart(null);
    setEnd(null);
    setEdge(null);
  };

  // ---------------------------------------------------------------- việc đang làm và nút chính

  const ghostErr = picked && ghost ? placeError(house, picked, ghost.x, ghost.y, ghost.rot) : null;
  const selPiece = house.pieces.find((p) => p.id === selected) ?? null;

  let action: Action | null = null;
  let label = '';
  if (tab === 'noi-that') {
    if (picked && ghost) {
      action = { a: 'place', kind: picked, x: ghost.x, y: ghost.y, rot: ghost.rot };
      label = `Đặt ${ITEM[picked].name.toLowerCase()} · ${money(ITEM[picked].price)}`;
    } else if (picked) label = 'Chạm lên sàn để đặt thêm một cái';
    else if (selPiece) {
      action = { a: 'remove', id: selPiece.id };
      label = `Gỡ ${ITEM[selPiece.kind].name.toLowerCase()} · hoàn ${money(selPiece.paid)}`;
    } else label = 'Chọn một món, hoặc chạm món trong nhà';
  } else if (tab === 'xay') {
    if (tool === 'wall') {
      if (start && end) {
        action = { a: 'wall', x1: start[0], y1: start[1], x2: end[0], y2: end[1] };
        const len = Math.abs(end[0] - start[0]) + Math.abs(end[1] - start[1]);
        label = `Xây ${len} m tường`;
      } else label = start ? 'Chạm điểm cuối của bức tường' : 'Chạm điểm đầu trên lưới sàn';
    } else if (tool === 'erase' && selPiece) {
      action = { a: 'remove', id: selPiece.id };
      label = `Gỡ ${ITEM[selPiece.kind].name.toLowerCase()} · hoàn ${money(selPiece.paid)}`;
    } else if (edge) {
      action =
        tool === 'erase'
          ? { a: 'erase-wall', edge }
          : { a: 'open', edge, kind: tool === 'door' ? 'door' : 'window' };
      label = tool === 'erase' ? 'Gỡ đoạn tường' : tool === 'door' ? 'Trổ cửa đi' : 'Trổ cửa sổ';
    } else
      label = tool === 'erase' ? 'Chạm đoạn tường hoặc món đồ cần gỡ' : 'Chạm vào một đoạn tường';
  } else if (tab === 'san') {
    if (room) {
      action = {
        a: 'tile',
        x: (room.cells[0]! % LOT.w) + 0.5,
        y: Math.floor(room.cells[0]! / LOT.w) + 0.5,
        tile,
      };
      const name = TILES.find((t) => t.id === tile)!.name.toLowerCase();
      label = `Lát ${roomName(house, room, rs).toLowerCase()} gạch ${name}`;
    } else label = 'Chạm vào phòng muốn lát';
  }
  const q = action ? quote(house, action) : null;
  let err: string | null = null;
  if (q && 'error' in q) err = q.error;
  else if (q && q.cost > left(house)) err = 'Quỹ chung không đủ tiền.';
  if (q && 'cost' in q) {
    if (q.cost > 0 && action?.a !== 'place') label += ` · ${money(q.cost)}`;
    if (q.refund) label += action?.a === 'erase-wall' ? ` · hoàn ${money(q.refund)}` : '';
  }
  const blocked = ghostErr ?? err;

  const run = () => {
    if (!action || blocked) return;
    if (!onAct(action)) return;
    if (action.a === 'place') setGhost(null);
    if (action.a === 'remove') setSelected(null);
    if (action.a === 'wall') {
      // Vẽ tiếp từ cuối bức tường vừa xây, cho nhanh khi chia nhiều phòng.
      setStart(end);
      setEnd(null);
    }
    if (action.a === 'open' || action.a === 'erase-wall') setEdge(null);
  };

  // ---------------------------------------------------------------- "đang làm gì" của mình

  const mine: Presence = useMemo(() => {
    if (tab === 'noi-that' && picked && ghost)
      return {
        mode: 'place',
        kind: picked,
        x: ghost.x,
        y: ghost.y,
        rot: ghost.rot,
        valid: !ghostErr,
      };
    if (tab === 'xay' && tool === 'wall' && start)
      return {
        mode: 'wall',
        x1: start[0],
        y1: start[1],
        x2: end?.[0] ?? null,
        y2: end?.[1] ?? null,
      };
    if (selected) return { mode: 'select', id: selected };
    return { mode: 'idle' };
  }, [tab, picked, ghost, ghostErr, tool, start, end, selected]);
  const mineKey = JSON.stringify(mine);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- gửi khi nội dung đổi, không phải khi đối tượng đổi
  useEffect(() => onPresence(mine), [mineKey]);

  // ---------------------------------------------------------------- đồng bộ cảnh 3D

  useEffect(() => view?.setHouse(house), [view, house]);
  useEffect(() => {
    if (!view) return;
    const g: Parameters<HouseView['setGhosts']>[0] = [];
    if (mine.mode === 'place')
      g.push({
        seat: you,
        kind: mine.kind,
        x: mine.x,
        y: mine.y,
        rot: mine.rot,
        valid: mine.valid,
      });
    if (other.mode === 'place')
      g.push({
        seat: otherSeat,
        kind: other.kind,
        x: other.x,
        y: other.y,
        rot: other.rot,
        valid: other.valid,
      });
    view.setGhosts(g);
    const d: Parameters<HouseView['setDrafts']>[0] = [];
    if (mine.mode === 'wall')
      d.push({ seat: you, x1: mine.x1, y1: mine.y1, x2: mine.x2, y2: mine.y2 });
    if (tab === 'xay' && edge) d.push({ seat: you, ...edgeLine(edge) });
    if (other.mode === 'wall')
      d.push({ seat: otherSeat, x1: other.x1, y1: other.y1, x2: other.x2, y2: other.y2 });
    view.setDrafts(d);
    const s: { seat: Seat; id: string }[] = [];
    if (selected) s.push({ seat: you, id: selected });
    if (other.mode === 'select') s.push({ seat: otherSeat, id: other.id });
    view.setSelections(s);
    view.setGrid(tab === 'xay');
    view.setFocus(mine.mode === 'place');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `mine` đi theo mineKey
  }, [view, mineKey, other, tab, edge, selected, you, otherSeat, house]);

  // Nhãn: người kia đang làm gì (mọi thẻ), tên phòng (thẻ Sàn và Mục tiêu). Việc của chính mình
  // không gắn nhãn: mình đã biết, và nhãn sẽ che đúng bóng mờ mình đang dời.
  const tagEls = useRef<(HTMLSpanElement | null)[]>([null, null]);
  const tags = useRef<(Label | null)[]>([null, null]);
  const acts = [you === 0 ? mine : other, you === 1 ? mine : other].map((p) => activity(p, house));
  useEffect(() => {
    if (!view) return;
    [0, 1].forEach((i) => {
      const el = tagEls.current[i];
      if (el && !tags.current[i]) tags.current[i] = view.label(el);
      tags.current[i]?.move(i === you ? null : (acts[i]?.pos ?? null));
    });
  });
  useEffect(
    () => () => {
      tags.current.forEach((t) => t?.remove());
      tags.current = [null, null];
    },
    [view],
  );

  const showRooms = tab === 'san' || tab === 'muc-tieu';
  const enclosed = rs.filter((r) => r.enclosed);
  const roomEls = useRef(new Map<number, HTMLSpanElement>());
  const roomTags = useRef(new Map<number, Label>());
  useEffect(() => {
    if (!view) return;
    for (const [id, t] of roomTags.current)
      if (!roomEls.current.has(id)) {
        t.remove();
        roomTags.current.delete(id);
      }
    for (const r of enclosed) {
      const el = roomEls.current.get(r.id);
      if (!el) continue;
      let t = roomTags.current.get(r.id);
      if (!t) roomTags.current.set(r.id, (t = view.label(el)));
      const cx = r.cells.reduce((s, c) => s + (c % LOT.w), 0) / r.cells.length + 0.5;
      const cy = r.cells.reduce((s, c) => s + Math.floor(c / LOT.w), 0) / r.cells.length + 0.5;
      t.move(showRooms ? [cx, 2.8, cy] : null);
    }
  });
  useEffect(
    () => () => {
      roomTags.current.forEach((t) => t.remove());
      roomTags.current.clear();
    },
    [view],
  );

  const hint =
    tab === 'noi-that'
      ? picked
        ? 'Chạm sàn để dời · nút xoay để quay'
        : 'Kéo để xoay · chụm để phóng to'
      : tab === 'xay'
        ? tool === 'wall'
          ? 'Chạm hai điểm trên lưới để vẽ tường'
          : 'Chạm vào đoạn tường'
        : tab === 'san'
          ? 'Chạm vào phòng muốn lát'
          : 'Kéo để xoay · chụm để phóng to';

  const items = CATALOG.filter((c) => c.category === cat);

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden md:flex-row">
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="relative z-10 flex flex-col gap-3 px-4 pb-2 pt-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onExit}
              aria-label="Rời nhà, về màn vào game"
              className="-ml-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-[color:var(--nm-inkSoft)] hover:bg-[color:var(--nm-lime)] hover:text-[color:var(--nm-ink)]"
            >
              <IconBack className="h-6 w-6" />
            </button>
            <span className={`${DISPLAY} min-w-0 flex-1 truncate text-[20px]`}>{house.name}</span>
            <button
              type="button"
              onClick={() => setShare(true)}
              disabled={!code}
              className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-[color:var(--nm-lime)] px-3 text-[14px] font-extrabold tracking-[0.12em] shadow-[0_3px_8px_-4px_rgb(38_34_31/.4)] disabled:opacity-50"
              aria-label={code ? `Mã nhà ${code}, mời người kia vào` : 'Đang mở nhà'}
            >
              <IconShare className="h-5 w-5" />
              {code || '······'}
            </button>
          </div>
          <BudgetRow house={house} peers={peers} />
        </div>

        <div ref={host} className="relative min-h-0 flex-1 cursor-grab active:cursor-grabbing">
          {/* Thông báo (người kia vào, xong mục tiêu…) tạm thế chỗ dòng "Tiếp theo", không đè lên nó. */}
          {toast ? (
            <p
              role="status"
              className="pointer-events-none absolute inset-x-3 top-1 z-[2] mx-auto max-w-sm whitespace-pre-line rounded-[12px] bg-[color:var(--nm-ink)] px-4 py-2 text-center text-[14px] font-bold text-[color:var(--nm-lime)] shadow-[0_10px_24px_-8px_rgb(0_0_0/0.5)]"
            >
              {toast}
            </p>
          ) : (
            <button
              type="button"
              onClick={() => {
                setTab('muc-tieu');
                reset();
              }}
              className="absolute inset-x-3 top-1 z-[2] flex min-h-9 items-center gap-2 rounded-full bg-[rgb(242_239_233/.86)] px-3 text-left text-[13px] font-bold shadow-[0_4px_12px_-6px_rgb(38_34_31/.4)] md:left-1/2 md:right-auto md:w-[min(520px,calc(100%-24px))] md:-translate-x-1/2"
            >
              <IconGoal className="h-4 w-4 shrink-0 text-[color:var(--nm-inkSoft)]" />
              {next ? (
                <>
                  <span className="min-w-0 flex-1 truncate">
                    <span className="hidden text-[color:var(--nm-inkSoft)] sm:inline">
                      Tiếp theo:{' '}
                    </span>
                    {next.g.title}
                  </span>
                  <GoalSquares have={next.have} need={next.need} done={false} />
                  <span className="shrink-0 font-extrabold tabular-nums">
                    +{money(next.g.reward)}
                  </span>
                </>
              ) : (
                <span className="flex-1">Xong cả {GOALS.length} mục tiêu gia đình</span>
              )}
            </button>
          )}
          <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
            {enclosed.map((r) => (
              <span
                key={r.id}
                ref={(el) => {
                  if (el) roomEls.current.set(r.id, el);
                  else roomEls.current.delete(r.id);
                }}
                className="invisible absolute left-0 top-0 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[color:var(--nm-lime)] py-1 pl-1 pr-2.5 text-[12px] font-extrabold shadow-[0_4px_10px_-4px_rgb(38_34_31/.5)]"
              >
                <Swatch
                  id={house.floor[r.cells[0]!] ?? null}
                  size={18}
                  tile={9}
                  className="rounded-full"
                />
                {roomName(house, r, rs)}
              </span>
            ))}
            {[0, 1].map((i) => (
              <span
                key={i}
                ref={(el) => void (tagEls.current[i] = el)}
                className="invisible absolute left-0 top-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-extrabold text-white shadow-[0_6px_12px_-6px_rgb(0_0_0/.6)]"
                style={{ background: SEAT[i as Seat].color }}
              >
                {peers.names[i as Seat] ?? ''} {acts[i]?.text ?? ''}
              </span>
            ))}
          </div>
          <div className="absolute bottom-3 right-3 z-[2] flex flex-col gap-2">
            <ViewButton label="Phóng to" onClick={() => view?.zoom(1)}>
              <IconPlus className="h-5 w-5" />
            </ViewButton>
            <ViewButton label="Thu nhỏ" onClick={() => view?.zoom(-1)}>
              <IconMinus className="h-5 w-5" />
            </ViewButton>
            <ViewButton label="Về góc nhìn ban đầu" onClick={() => view?.resetView()}>
              <IconRecenter className="h-5 w-5" />
            </ViewButton>
          </div>
          <p className="pointer-events-none absolute bottom-3 left-4 z-[2] max-w-[70%] rounded-full bg-[rgb(38_34_31/.78)] px-3 py-1 text-[12px] font-bold text-[color:var(--nm-lime)]">
            {hint}
          </p>
        </div>
      </div>

      <section
        aria-label="Bảng xây nhà"
        className="relative z-10 flex max-h-[45dvh] shrink-0 flex-col rounded-t-[18px] bg-[color:var(--nm-lime)] shadow-[0_-12px_30px_-14px_rgb(38_34_31/.5)] md:max-h-none md:w-[400px] md:rounded-none md:shadow-[-12px_0_30px_-14px_rgb(38_34_31/.4)]"
      >
        <div className="overflow-hidden rounded-t-[18px] md:rounded-none">
          <TileBand />
        </div>
        <div className="grid grid-cols-4 gap-1 px-3 pt-2" role="tablist" aria-label="Công việc">
          {TABS.map(({ id, label: l, Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => {
                setTab(id);
                reset();
              }}
              className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-[10px] text-[12.5px] font-extrabold ${
                tab === id
                  ? 'bg-[color:var(--nm-ink)] text-[color:var(--nm-lime)]'
                  : 'text-[color:var(--nm-inkSoft)] hover:text-[color:var(--nm-ink)]'
              }`}
            >
              <Icon className="h-5 w-5" />
              {l}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-3 [scrollbar-color:var(--nm-cementDeep)_transparent]">
          {tab === 'noi-that' && (
            <div className="flex flex-col gap-3">
              <div
                className="grid grid-cols-[1.35fr_0.75fr_1.1fr_1.1fr] gap-1.5"
                role="tablist"
                aria-label="Loại đồ"
              >
                {(Object.keys(CATEGORY_NAME) as Category[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="tab"
                    aria-selected={cat === c}
                    onClick={() => {
                      setCat(c);
                      setPicked(null);
                      setGhost(null);
                    }}
                    className={`min-h-10 whitespace-nowrap rounded-full px-1 text-[13px] font-extrabold ${
                      cat === c
                        ? 'bg-[color:var(--nm-ink)] text-[color:var(--nm-lime)]'
                        : 'bg-[color:var(--nm-limeDeep)] text-[color:var(--nm-ink)]'
                    }`}
                  >
                    {CATEGORY_NAME[c]}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {items.map((it) => {
                  const on = picked === it.kind;
                  return (
                    <button
                      key={it.kind}
                      type="button"
                      aria-pressed={on}
                      onClick={() => {
                        setSelected(null);
                        if (on) {
                          setPicked(null);
                          setGhost(null);
                        } else {
                          setPicked(it.kind);
                          // Bóng mờ hiện ở chỗ trống gần giữa nhà; người chơi chạm sàn để dời.
                          setGhost({ ...freeSpot(house, it.kind), rot: 0 });
                        }
                      }}
                      className={`flex flex-col gap-1.5 rounded-[10px] bg-white p-2 text-left transition-shadow ${
                        on
                          ? ''
                          : 'shadow-[0_3px_8px_-4px_rgb(38_34_31/.4)] hover:shadow-[0_0_0_2px_var(--nm-cementDeep)]'
                      }`}
                      style={on ? { boxShadow: `0 0 0 3px ${SEAT[you].color}` } : undefined}
                    >
                      <Thumb src={thumbs?.get(it.kind)} name={it.name} />
                      <span className="text-[13px] font-extrabold leading-tight">{it.name}</span>
                      <span className="flex flex-col text-[12px] font-bold leading-tight text-[color:var(--nm-inkSoft)]">
                        <span className="text-[13px] tabular-nums text-[color:var(--nm-ink)]">
                          {money(it.price)}
                        </span>
                        <span>
                          {metres(it.w)} × {metres(it.d)} m
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'san' && (
            <div className="flex flex-col gap-3">
              {enclosed.length === 0 ? (
                <p className="text-[14px] font-semibold text-[color:var(--nm-inkSoft)]">
                  Chưa có phòng kín nào. Xây tường cho kín rồi mới lát được.
                </p>
              ) : (
                <div
                  className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
                  role="tablist"
                  aria-label="Phòng"
                >
                  {enclosed.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      role="tab"
                      aria-selected={room?.id === r.id}
                      onClick={() => setRoomCell(r.cells[0]!)}
                      className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full pl-1.5 pr-3.5 text-[14px] font-extrabold ${
                        room?.id === r.id
                          ? 'bg-[color:var(--nm-ink)] text-[color:var(--nm-lime)]'
                          : 'bg-[color:var(--nm-limeDeep)]'
                      }`}
                    >
                      <Swatch
                        id={house.floor[r.cells[0]!] ?? null}
                        size={26}
                        tile={13}
                        className="rounded-full"
                      />
                      {roomName(house, r, rs)}
                      <span className="text-[12px] font-bold opacity-70">{r.cells.length} m²</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-5 gap-2">
                {TILES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={tile === t.id}
                    onClick={() => setTile(t.id)}
                    className={`flex flex-col items-center gap-1 rounded-[8px] p-1 ${
                      tile === t.id ? 'bg-white' : ''
                    }`}
                    style={
                      tile === t.id ? { boxShadow: `0 0 0 3px ${SEAT[you].color}` } : undefined
                    }
                  >
                    <Swatch id={t.id} size={52} tile={26} />
                    <span className="text-center text-[11px] font-extrabold leading-tight">
                      {t.name}
                    </span>
                    <span className="text-[11px] font-bold tabular-nums text-[color:var(--nm-inkSoft)]">
                      {t.price} ₫/viên
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === 'xay' && (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-4 gap-2">
                {TOOLS.map(({ id, label: l, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={tool === id}
                    onClick={() => {
                      setTool(id);
                      reset();
                    }}
                    className={`flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-[10px] text-[13px] font-extrabold ${
                      tool === id
                        ? 'bg-[color:var(--nm-ink)] text-[color:var(--nm-lime)]'
                        : 'bg-white shadow-[0_3px_8px_-4px_rgb(38_34_31/.4)]'
                    }`}
                  >
                    <Icon className="h-7 w-7" />
                    {l}
                  </button>
                ))}
              </div>
              <p className="text-[14px] font-semibold leading-snug text-[color:var(--nm-inkSoft)]">
                {tool === 'wall'
                  ? 'Chạm điểm đầu rồi điểm cuối trên lưới sàn, tường đi thẳng theo hàng hoặc cột. Mỗi mét 300 ₫; phòng kín tường mới lát sàn được.'
                  : tool === 'erase'
                    ? 'Gỡ tường trong, cửa, hay món đồ: tiền hoàn đủ cho người đã mua. Tường bao của nhà không gỡ được.'
                    : `Chạm vào một đoạn tường có sẵn để trổ ${tool === 'door' ? 'cửa đi (800 ₫)' : 'cửa sổ (600 ₫)'}.`}
              </p>
            </div>
          )}

          {tab === 'muc-tieu' && (
            <ul className="flex flex-col">
              {GOALS.map((g) => {
                const done = house.goals.includes(g.id);
                const [have, need] = goalProgress(house, g.id, rs);
                return (
                  <li
                    key={g.id}
                    className="flex items-center gap-3 border-b border-[color:var(--nm-limeDeep)] py-2.5 last:border-0"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-[15px] font-extrabold md:text-[16px]">{g.title}</span>
                      <span className="text-[12.5px] font-semibold text-[color:var(--nm-inkSoft)] md:text-[14px]">
                        {g.detail}
                      </span>
                      <span className="mt-1 flex">
                        <GoalSquares have={have} need={need} done={done} />
                      </span>
                    </span>
                    {done ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[color:var(--nm-ink)] px-2.5 py-1 text-[12px] font-extrabold text-[color:var(--nm-lime)]">
                        <IconCheck className="h-3.5 w-3.5 text-[color:var(--nm-ochre)]" /> Đã nhận
                      </span>
                    ) : (
                      <span className="shrink-0 text-right text-[13px] font-extrabold tabular-nums">
                        +{money(g.reward)}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {tab !== 'muc-tieu' && (
          <div className="relative flex gap-2 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-1">
            {/* Mờ dần phía trên nút để tên món ở hàng cuối không bị cắt ngang. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 -top-6 h-6 bg-gradient-to-b from-[rgb(242_239_233/0)] to-[color:var(--nm-lime)]"
            />
            {tab === 'noi-that' && picked && ghost && (
              <Secondary
                label="Xoay 90 độ"
                onClick={() => {
                  const rot = ((ghost.rot + 1) % 4) as Rot;
                  setGhost({ ...snapPiece(picked, rot, ghost.x, ghost.y), rot });
                }}
              >
                <IconRotate className="h-6 w-6" />
              </Secondary>
            )}
            <Primary onClick={run} disabled={!action || !!blocked}>
              {blocked ?? label}
            </Primary>
          </div>
        )}
      </section>

      {share && (
        <ShareSheet code={code} link={link} name={house.name} onClose={() => setShare(false)} />
      )}
    </div>
  );
}

function ViewButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid h-11 w-11 place-items-center rounded-full bg-[color:var(--nm-lime)] text-[color:var(--nm-ink)] shadow-[0_4px_12px_-4px_rgb(38_34_31/.45)] hover:bg-white"
    >
      {children}
    </button>
  );
}

/** Mời người kia: mã lớn, QR quét bằng camera, nút chép link. */
function ShareSheet({
  code,
  link,
  name,
  onClose,
}: {
  code: string;
  link: string;
  name: string;
  onClose: () => void;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let alive = true;
    void import('qrcode').then((QR) =>
      QR.toDataURL(link, {
        margin: 1,
        width: 480,
        errorCorrectionLevel: 'M',
        color: { dark: PALETTE.ink, light: '#ffffff' },
      }).then((url) => alive && setQr(url)),
    );
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    panel.current?.focus();
    return () => {
      alive = false;
      document.removeEventListener('keydown', onKey);
    };
  }, [link, onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center md:items-center">
      <button
        type="button"
        aria-label="Đóng"
        onClick={onClose}
        className="absolute inset-0 bg-[rgb(38_34_31/.55)]"
      />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="nm-share"
        className="relative w-full max-w-[420px] overflow-hidden rounded-t-[18px] bg-[color:var(--nm-lime)] outline-none md:rounded-[18px]"
      >
        <TileBand />
        <div className="flex flex-col items-center gap-3 px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-5 text-center">
          <h2 id="nm-share" className={`${DISPLAY} text-2xl`}>
            Mời vào {name}
          </h2>
          <p className="max-w-[32ch] text-[14px] font-semibold text-[color:var(--nm-inkSoft)]">
            Người kia mở Nhà Mình, nhập mã này hoặc quét QR bằng camera. Mã giữ nguyên cho những lần
            sau.
          </p>
          <p className="font-mono text-[34px] font-black tracking-[0.28em]">{code}</p>
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element -- ảnh QR tạo tại chỗ (data URL)
            <img
              src={qr}
              alt={`Mã QR mở nhà ${code}`}
              className="h-44 w-44 rounded-[10px] bg-white p-1.5"
            />
          ) : (
            <span className="h-44 w-44 animate-pulse rounded-[10px] bg-white" aria-hidden />
          )}
          <div className="flex w-full gap-2">
            <button
              type="button"
              onClick={() =>
                void navigator.clipboard?.writeText(link).then(
                  () => setCopied(true),
                  () => setCopied(false),
                )
              }
              className="min-h-12 flex-1 rounded-[10px] bg-white font-extrabold shadow-[0_3px_8px_-4px_rgb(38_34_31/.4)]"
            >
              {copied ? 'Đã chép link' : 'Chép link mời'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-12 flex-1 rounded-[10px] bg-[color:var(--nm-ink)] font-extrabold text-[color:var(--nm-lime)]"
            >
              Xong
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Cách chơi, số liệu rút từ đúng bảng giá và luật. */
export function Guide({ onBack }: { onBack: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    window.scrollTo(0, 0);
    heading.current?.focus();
  }, []);
  const rules: [TileId, string, string][] = [
    [
      'hoa-thi',
      'Hai người, một nhà',
      'Người tạo nhà gửi mã hoặc QR cho người kia. Mỗi người một máy; ai đặt gì người kia thấy ngay, kèm bóng mờ món người kia đang cầm. Nhà lưu trên máy người tạo, lần sau mở lại là xây tiếp, mã giữ nguyên.',
    ],
    [
      'sao',
      'Quỹ chung',
      'Cả hai tiêu chung 120.000 ₫. Hàng gạch trên cùng cho thấy ai đã tiêu bao nhiêu: người bên trái lát từ trái, người bên phải lát từ phải. Gỡ đồ hay gỡ tường được hoàn đủ cho người đã mua.',
    ],
    [
      'ban-co',
      'Xây',
      'Chạm hai điểm trên lưới để vẽ tường thẳng, 300 ₫ mỗi mét. Chạm vào tường có sẵn để trổ cửa đi hay cửa sổ. Tường bao của nhà không gỡ được.',
    ],
    [
      'qua-tram',
      'Sàn',
      'Phòng là vùng có tường bao kín (cửa vẫn tính là tường). Chọn phòng rồi chọn gạch bông: cả phòng được lát một lần, mỗi mét vuông bốn viên.',
    ],
    [
      'hoa-thi',
      'Nội thất',
      'Chọn món, chạm lên sàn để dời bóng mờ, bấm xoay để quay. Món đồ không được vắt qua tường hay chồng lên nhau; riêng thảm nằm dưới đồ khác được.',
    ],
    [
      'sao',
      'Mục tiêu gia đình',
      'Đủ đồ trong một phòng kín là xong một mục tiêu, quỹ chung được cộng thưởng. Mỗi mục tiêu thưởng một lần.',
    ],
  ];
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[560px] flex-col gap-8 px-5 py-6">
      <button
        type="button"
        onClick={onBack}
        className="-ml-2 inline-flex min-h-11 items-center gap-1 self-start rounded-full px-2 text-sm font-bold text-[color:var(--nm-inkSoft)] hover:text-[color:var(--nm-ink)]"
      >
        <IconBack className="h-5 w-5" /> Về
      </button>
      <h1
        ref={heading}
        tabIndex={-1}
        className={`${DISPLAY} text-[44px] leading-none outline-none`}
      >
        Cách chơi
      </h1>
      <div className="flex flex-col gap-5">
        {rules.map(([t, title, d]) => (
          <section key={title} className="flex gap-3">
            <Swatch id={t} size={28} tile={28} />
            <div className="flex flex-col gap-1">
              <h2 className="text-[17px] font-extrabold">{title}</h2>
              <p className="text-[15px] font-semibold leading-relaxed text-[color:var(--nm-inkSoft)]">
                {d}
              </p>
            </div>
          </section>
        ))}
      </div>
      <section className="flex flex-col gap-2">
        <h2 className="text-[17px] font-extrabold">Mục tiêu và tiền thưởng</h2>
        <ul className="flex flex-col">
          {GOALS.map((g) => (
            <li
              key={g.id}
              className="flex items-baseline justify-between gap-3 border-b border-[color:var(--nm-cementDeep)] py-2"
            >
              <span className="flex flex-col">
                <span className="font-extrabold">{g.title}</span>
                <span className="text-[13px] font-semibold text-[color:var(--nm-inkSoft)]">
                  {g.detail}
                </span>
              </span>
              <span className="shrink-0 font-extrabold tabular-nums">+{money(g.reward)}</span>
            </li>
          ))}
        </ul>
      </section>
      <Primary onClick={onBack}>Về màn vào game</Primary>
    </div>
  );
}
