'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { loadMuted, setMuted, sfx, unlockAudio } from './audio';
import {
  BOARD,
  groupSquares,
  GROUPS,
  HOTEL,
  isOwnable,
  JAIL,
  JAIL_FINE,
  money,
  priceOf,
} from './data';
import {
  actor,
  canBuild,
  canMortgage,
  canSell,
  canUnmortgage,
  groupFree,
  houseCost,
  ownedBy,
  playerOf,
  seatOf,
  unmortgageCost,
  type Action,
  type Game,
  type GameEvent,
  type Offer,
} from './engine';
import { BackIcon, DeedIcon, MuteIcon, SoundIcon, SwapIcon } from './icons';
import { Avatar, Button, DeedCard, DieFace, Panel } from './kit';
import { characterName, characterOf } from './roster';
import { DISPLAY } from './theme';
import { createBoardView, type BoardView } from './view3d';

// Màn chơi Cờ tỷ phú: cảnh 3D phủ toàn màn, các tấm sơn mài nổi bên trên. Nhận ván mới nhất qua
// `game`; mỗi thao tác (seq tăng một) mang theo danh sách sự kiện, được diễn lần lượt — xúc xắc
// lăn, quân đi từng ô, tiền ra vào, thẻ lật, nhà mọc lên — rồi mới hiện thế cờ mới. Ai giữ ván (một máy hay chủ
// phòng online) là việc của match.tsx / online.tsx; màn này chỉ báo thao tác qua onAct.

const cloneGame = (g: Game): Game => JSON.parse(JSON.stringify(g)) as Game;
const positions = (g: Game) => Object.fromEntries(g.players.map((p) => [p.id, p.pos]));
const outOf = (g: Game) => g.players.filter((p) => p.bankrupt).map((p) => p.id);
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Chạy một hoạt cảnh của cảnh 3D, có chốt an toàn: quá `budget` ms thì coi như xong. */
function viaView(run: (done: () => void) => void, budget: number) {
  return new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(finish, budget);
    run(finish);
  });
}

function describe(g: Game, e: GameEvent): string | null {
  const name = (id: number) => seatOf(g, id)?.name ?? '?';
  switch (e.k) {
    case 'cash':
      return `${name(e.p)} ${e.amount > 0 ? '+' : '−'}${money(Math.abs(e.amount))} · ${e.why}`;
    case 'buy':
      return `${name(e.p)} mua ${BOARD[e.square]!.name}`;
    case 'auction':
      return e.winner === null
        ? `Không ai mua ${BOARD[e.square]!.name}`
        : `${name(e.winner)} thắng đấu giá ${BOARD[e.square]!.name} (${money(e.price)})`;
    case 'jail':
      return `${name(e.p)} bị tạm giữ`;
    case 'free':
      return `${name(e.p)} ra khỏi tạm giữ`;
    case 'build':
      return `${BOARD[e.square]!.name}: ${
        e.houses === HOTEL ? 'khách sạn' : e.houses ? `nhà cấp ${e.houses}` : 'còn nhà tranh'
      }`;
    case 'mortgage':
      return `${name(e.p)} ${e.on ? 'cầm cố' : 'chuộc'} ${BOARD[e.square]!.name}`;
    case 'trade':
      return `${name(e.offer.from)} và ${name(e.offer.to)} ${e.accepted ? 'đã đổi đất' : 'không đổi đất'}`;
    case 'bankrupt':
      return `${name(e.p)} phá sản`;
    default:
      return null;
  }
}

/* ─────────────────────────────── Cảnh 3D ─────────────────────────────── */

function Stage({
  viewRef,
  onReady,
  onPick,
}: {
  viewRef: React.MutableRefObject<BoardView | null>;
  onReady: () => void;
  /** Chạm vào một ô trên bàn. */
  onPick: (square: number) => void;
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
    <div
      ref={box}
      className="absolute inset-0"
      onClick={(e) => {
        const sq = viewRef.current?.pick(e.clientX, e.clientY);
        if (sq !== null && sq !== undefined) onPick(sq);
      }}
    >
      <canvas ref={cv} role="img" aria-label="Bàn cờ" className="absolute inset-0 h-full w-full" />
    </div>
  );
}

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
      className="pointer-events-auto flex min-h-11 items-center gap-1.5 rounded-md bg-[#1f1310]/95 px-3 text-sm font-bold text-[color:var(--tp-eggshell)] shadow-[inset_0_0_0_1px_rgb(212_167_58/0.45)] hover:bg-[color:var(--tp-lacquer)]"
    >
      {children}
    </button>
  );
}

/* ─────────────────────────────── Tài sản ─────────────────────────────── */

/**
 * Vì sao ô đất này chưa nâng cấp được (cùng điều kiện với canBuild trong engine), để nút mờ không
 * làm người chơi tưởng là hỏng. null: nâng cấp được, hoặc không phải ô đất.
 */
function upgradeHint(g: Game, id: number, sq: number): string | null {
  const s = BOARD[sq]!;
  const d = g.deeds[sq];
  if (s.kind !== 'land' || !d || canBuild(g, id, sq)) return null;
  if (d.houses >= HOTEL) return 'Đã lên khách sạn, cấp cao nhất.';
  const group = groupSquares(s.group);
  const have = group.filter((x) => g.deeds[x]!.owner === id).length;
  if (have < group.length)
    return `Cần đủ nhóm ${GROUPS[s.group]!.name} (${have}/${group.length} ô) mới nâng cấp được.`;
  if (group.some((x) => g.deeds[x]!.mortgaged))
    return 'Chuộc hết đất trong nhóm trước khi nâng cấp.';
  if (d.houses > Math.min(...group.map((x) => g.deeds[x]!.houses)))
    return 'Nâng đều: nâng các ô khác cùng nhóm lên trước.';
  return `Cần ${money(houseCost(sq))} tiền mặt để nâng cấp.`;
}

function AssetsSheet({
  game,
  id,
  onAct,
  onClose,
}: {
  game: Game;
  id: number;
  onAct: (a: Action) => void;
  onClose: () => void;
}) {
  const me = playerOf(game, id);
  const owned = ownedBy(game, id).sort((a, b) => a - b);
  return (
    <Sheet title="Tài sản" onClose={onClose}>
      <p className="text-sm text-[color:var(--tp-ash)]">
        Tiền mặt <b className="text-[color:var(--tp-goldHi)]">{money(me.cash)}</b>
        {me.freeCards > 0 && <> · {me.freeCards} thẻ ra tạm giữ</>}
      </p>
      {owned.length === 0 && (
        <p className="py-6 text-center text-[color:var(--tp-ash)]">Chưa có mảnh đất nào.</p>
      )}
      <ul className="flex flex-col gap-2">
        {owned.map((sq) => {
          const s = BOARD[sq]!;
          const d = game.deeds[sq]!;
          const color = s.kind === 'land' ? GROUPS[s.group]!.color : '#6b5a4a';
          return (
            <li
              key={sq}
              className="flex flex-col gap-2 rounded-md bg-[color:var(--tp-lacquer)] p-3 shadow-[inset_0_0_0_1px_var(--tp-rule)]"
            >
              <div className="flex items-center gap-2">
                <i className="h-3 w-3 shrink-0 rounded-sm" style={{ background: color }} />
                <span className="min-w-0 flex-1 truncate font-bold">{s.name}</span>
                <span className="shrink-0 text-xs text-[color:var(--tp-ash)]">
                  {d.mortgaged
                    ? 'Đang cầm cố'
                    : d.houses === HOTEL
                      ? 'Khách sạn'
                      : d.houses
                        ? `Nhà cấp ${d.houses}`
                        : s.kind === 'land'
                          ? 'Nhà tranh'
                          : money(priceOf(s))}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {s.kind === 'land' && (
                  <>
                    <Button
                      tone="ghost"
                      className="min-h-9 px-3 text-[13px]"
                      disabled={!canBuild(game, id, sq)}
                      onClick={() => onAct({ a: 'build', square: sq })}
                    >
                      Nâng cấp · {money(houseCost(sq))}
                    </Button>
                    <Button
                      tone="ghost"
                      className="min-h-9 px-3 text-[13px]"
                      disabled={!canSell(game, id, sq)}
                      onClick={() => onAct({ a: 'sell', square: sq })}
                    >
                      Hạ cấp
                    </Button>
                  </>
                )}
                {d.mortgaged ? (
                  <Button
                    tone="ghost"
                    className="min-h-9 px-3 text-[13px]"
                    disabled={!canUnmortgage(game, id, sq)}
                    onClick={() => onAct({ a: 'unmortgage', square: sq })}
                  >
                    Chuộc {money(unmortgageCost(sq))}
                  </Button>
                ) : (
                  <Button
                    tone="ghost"
                    className="min-h-9 px-3 text-[13px]"
                    disabled={!canMortgage(game, id, sq)}
                    onClick={() => onAct({ a: 'mortgage', square: sq })}
                  >
                    Cầm cố
                  </Button>
                )}
              </div>
              {upgradeHint(game, id, sq) && (
                <p className="text-xs text-[color:var(--tp-ash)]">{upgradeHint(game, id, sq)}</p>
              )}
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}

function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-black/55 sm:items-center">
      <Panel className="flex max-h-[78dvh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-b-none p-4 pb-[max(16px,env(safe-area-inset-bottom))] sm:rounded-b-lg">
        <div className="flex items-center justify-between">
          <h2 className={`${DISPLAY} text-2xl text-[color:var(--tp-gold)]`}>{title}</h2>
          <Button tone="ghost" className="min-h-9 px-3 text-sm" onClick={onClose}>
            Đóng
          </Button>
        </div>
        {children}
      </Panel>
    </div>
  );
}

/* ─────────────────────────────── Đổi đất ─────────────────────────────── */

function TradeSheet({
  game,
  id,
  onSend,
  onClose,
}: {
  game: Game;
  id: number;
  onSend: (o: Offer) => void;
  onClose: () => void;
}) {
  const others = game.players.filter((p) => p.id !== id && !p.bankrupt).map((p) => p.id);
  const [to, setTo] = useState(others[0] ?? -1);
  const [give, setGive] = useState<number[]>([]);
  const [take, setTake] = useState<number[]>([]);
  const [giveCash, setGiveCash] = useState(0);
  const [takeCash, setTakeCash] = useState(0);
  const me = playerOf(game, id);
  const them = to >= 0 ? playerOf(game, to) : null;
  const tradable = (owner: number) =>
    ownedBy(game, owner)
      .filter((sq) => groupFree(game, sq))
      .sort((a, b) => a - b);
  const toggle = (list: number[], set: (v: number[]) => void, sq: number) =>
    set(list.includes(sq) ? list.filter((x) => x !== sq) : [...list, sq]);
  const empty = !give.length && !take.length && !giveCash && !takeCash;

  // Hàm vẽ thường, không phải component: khai báo component trong lúc render làm React dựng lại
  // cả danh sách sau mỗi lần bấm.
  const propList = (owner: number, picked: number[], set: (v: number[]) => void) => (
    <ul className="flex flex-col gap-1">
      {tradable(owner).map((sq) => {
        const s = BOARD[sq]!;
        const on = picked.includes(sq);
        return (
          <li key={sq}>
            <button
              type="button"
              aria-pressed={on}
              onClick={() => toggle(picked, set, sq)}
              className={`flex min-h-10 w-full items-center gap-2 rounded-md px-2 text-left text-sm ${
                on
                  ? 'bg-[color:var(--tp-gold)] font-bold text-[color:var(--tp-lacquer)]'
                  : 'shadow-[inset_0_0_0_1px_var(--tp-rule)]'
              }`}
            >
              <i
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ background: s.kind === 'land' ? GROUPS[s.group]!.color : '#6b5a4a' }}
              />
              <span className="min-w-0 flex-1 truncate">{s.name}</span>
            </button>
          </li>
        );
      })}
      {tradable(owner).length === 0 && (
        <li className="text-xs text-[color:var(--tp-ash)]">Không có đất đổi được</li>
      )}
    </ul>
  );

  const cash = (value: number, set: (v: number) => void, max: number) => (
    <div className="flex items-center gap-1">
      <Button
        tone="ghost"
        className="min-h-9 w-9 px-0"
        onClick={() => set(Math.max(0, value - 500))}
      >
        −
      </Button>
      <span className="min-w-0 flex-1 text-center text-sm font-bold tabular-nums">
        {money(value)}
      </span>
      <Button
        tone="ghost"
        className="min-h-9 w-9 px-0"
        onClick={() => set(Math.min(max, value + 500))}
      >
        +
      </Button>
    </div>
  );

  return (
    <Sheet title="Đổi đất" onClose={onClose}>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Đổi với">
        {others.map((o) => (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={to === o}
            onClick={() => {
              setTo(o);
              setTake([]);
              setTakeCash(0);
            }}
            className={`flex min-h-10 items-center gap-1.5 rounded-md px-3 text-sm font-bold ${
              to === o
                ? 'bg-[color:var(--tp-gold)] text-[color:var(--tp-lacquer)]'
                : 'shadow-[inset_0_0_0_1px_var(--tp-rule)]'
            }`}
          >
            <Avatar character={characterOf(seatOf(game, o))} id={o} size={22} />
            {seatOf(game, o).name}
          </button>
        ))}
      </div>
      {them && (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex min-w-0 flex-col gap-2">
            <p className="text-sm font-bold text-[color:var(--tp-ash)]">Bạn đưa</p>
            {propList(id, give, setGive)}
            {cash(giveCash, setGiveCash, me.cash)}
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <p className="text-sm font-bold text-[color:var(--tp-ash)]">Bạn nhận</p>
            {propList(to, take, setTake)}
            {cash(takeCash, setTakeCash, them.cash)}
          </div>
        </div>
      )}
      <Button
        disabled={!them || empty}
        onClick={() =>
          onSend({ from: id, to, giveCash, giveProps: give, takeCash, takeProps: take })
        }
      >
        <SwapIcon className="h-4 w-4" />
        Gửi đề nghị
      </Button>
      <p className="text-xs text-[color:var(--tp-ash)]">
        Đất trong nhóm đang có nhà phải bán hết nhà trước mới đổi được.
      </p>
    </Sheet>
  );
}

function OfferSummary({ game, offer }: { game: Game; offer: Offer }) {
  const list = (props: number[], cash: number) =>
    [...props.map((sq) => BOARD[sq]!.name), ...(cash ? [money(cash)] : [])].join(', ') ||
    'không gì';
  return (
    <div className="flex flex-col gap-1 text-sm">
      <p>
        <b>{seatOf(game, offer.from).name}</b> đưa: {list(offer.giveProps, offer.giveCash)}
      </p>
      <p>
        <b>{seatOf(game, offer.to).name}</b> đưa: {list(offer.takeProps, offer.takeCash)}
      </p>
    </div>
  );
}

/* ─────────────────────────────── Xem một ô ─────────────────────────────── */

const SQUARE_HINT: Record<string, string> = {
  go: 'Đi qua hoặc dừng ở đây được nhận 2.000 tr.',
  jail: 'Bị tạm giữ thì đứng ở đây; chỉ ghé qua thì không sao.',
  rest: 'Nghỉ chân: không có gì xảy ra.',
  toJail: 'Dừng ở đây là bị đưa thẳng vào ô Tạm giữ.',
  luck: 'Rút một thẻ Vận may.',
  gift: 'Rút một thẻ Lì xì.',
};

/** Chạm một ô trên bàn: thẻ đất, chủ, nhà đang có (chữ trên bàn nhỏ, nhất là trên điện thoại). */
function SquareSheet({
  game,
  square,
  onClose,
}: {
  game: Game;
  square: number;
  onClose: () => void;
}) {
  const s = BOARD[square]!;
  const d = game.deeds[square];
  const owner = d?.owner ?? null;
  const ownerSeat = owner === null ? null : seatOf(game, owner);
  const level = d?.houses ?? 0;
  return (
    <Sheet title={s.name} onClose={onClose}>
      {isOwnable(s) ? (
        <>
          <DeedCard square={square} className="self-center" />
          <p className="flex items-center gap-2 text-sm">
            {ownerSeat ? (
              <>
                <Avatar character={characterOf(ownerSeat)} id={ownerSeat.id} size={24} />
                <span>
                  Chủ: <b>{ownerSeat.name}</b>
                  {d?.mortgaged
                    ? ' · đang cầm cố'
                    : s.kind === 'land'
                      ? level === HOTEL
                        ? ' · khách sạn'
                        : level
                          ? ` · nhà cấp ${level}`
                          : ' · nhà tranh'
                      : ''}
                </span>
              </>
            ) : (
              <span className="text-[color:var(--tp-ash)]">Chưa có chủ.</span>
            )}
          </p>
        </>
      ) : (
        <p className="text-[color:var(--tp-eggshell)]">
          {s.kind === 'tax' ? `Nộp ${money(s.amount)} cho ngân hàng.` : SQUARE_HINT[s.kind]}
        </p>
      )}
    </Sheet>
  );
}

/* ─────────────────────────────── Màn chơi ─────────────────────────────── */

export function GameScreen({
  game,
  controls,
  passAndPlay,
  modeLabel,
  onAct,
  onLeave,
  onFinished,
}: {
  game: Game;
  /** Các người chơi máy này điều khiển (chung máy: mọi người thật; online: ghế của mình). */
  controls: number[];
  passAndPlay: boolean;
  modeLabel: string;
  onAct: (id: number, action: Action) => void;
  onLeave: () => void;
  onFinished: () => void;
}) {
  const viewRef = useRef<BoardView | null>(null);
  const [ready, setReady] = useState(false);
  const [shown, setShown] = useState<Game>(() => cloneGame(game));
  const shownRef = useRef<Game | null>(null);
  const queue = useRef<Game[]>([]);
  const animating = useRef(false);
  const [busy, setBusy] = useState(false);
  const [feed, setFeed] = useState<{ key: number; text: string }[]>([]);
  const [card, setCard] = useState<{ deck: 'luck' | 'gift'; text: string; who: string } | null>(
    null,
  );
  const [dice, setDice] = useState<[number, number] | null>(game.lastDice);
  const [sheet, setSheet] = useState<'assets' | 'trade' | null>(null);
  const [handoff, setHandoff] = useState<number | null>(null);
  const [info, setInfo] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const holder = useRef<number | null>(null);
  const [muted, setMute] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => setMute(loadMuted()), []);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Nhân vật của từng ghế lên bàn (đổi ván mới cùng phòng có thể đổi nhân vật).
  const castKey = game.seats.map((s) => `${s.id}:${characterOf(s)}`).join(',');
  useEffect(() => {
    if (!ready) return;
    viewRef.current?.setCharacters(
      Object.fromEntries(game.seats.map((s) => [s.id, characterOf(s)])),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, castKey]);

  // Bàn căn vào khoảng trống giữa dải người chơi và khay nút. Khay cao thấp theo nút của lượt, nên
  // giữ chiều cao lớn nhất đã thấy (tới khi đổi cỡ màn) để bàn không phóng to thu nhỏ giữa ván.
  useEffect(() => {
    if (!ready) return;
    let maxDock = 0;
    const measure = () => {
      const root = rootRef.current?.getBoundingClientRect();
      const strip = stripRef.current?.getBoundingClientRect();
      const dock = dockRef.current?.getBoundingClientRect();
      if (!root || !strip || !dock) return;
      maxDock = Math.max(maxDock, root.bottom - dock.top);
      viewRef.current?.setInsets(strip.bottom - root.top + 8, maxDock + 8);
    };
    const ro = new ResizeObserver(measure);
    for (const el of [stripRef.current, dockRef.current]) if (el) ro.observe(el);
    const onResize = () => {
      maxDock = 0;
      measure();
    };
    window.addEventListener('resize', onResize);
    measure();
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, [ready]);

  const human = (g: Game, id: number) => controls.includes(id) && seatOf(g, id).kind === 'human';

  const push = (text: string) =>
    setFeed((f) => [...f.slice(-3), { key: Date.now() + Math.random(), text }]);

  const show = (g: Game) => {
    shownRef.current = g;
    setShown(g);
    const v = viewRef.current;
    v?.highlight(
      g.pending.kind === 'buy' || g.pending.kind === 'auction' ? g.pending.square : null,
    );
    v?.setTurn(g.pending.kind === 'over' ? null : g.turn);
    // Chơi chung máy: chuyền máy khi lượt sang một người thật khác.
    if (passAndPlay && human(g, g.turn) && g.pending.kind === 'roll') {
      if (holder.current !== null && holder.current !== g.turn) setHandoff(g.turn);
      holder.current = g.turn;
    }
  };

  const play = async (prev: Game, next: Game) => {
    const v = viewRef.current!;
    const pos = positions(prev);
    const levels = Object.fromEntries(
      Object.entries(prev.deeds).map(([sq, d]) => [sq, d.owner === null ? 0 : d.houses]),
    );
    for (const e of next.events) {
      const line = describe(next, e);
      switch (e.k) {
        case 'roll':
          sfx.roll();
          await viaView((d) => v.rollDice(e.dice, pos[e.p] ?? 0, d), 2600);
          setDice(e.dice);
          break;
        case 'move': {
          const ticks = e.path.map((_, i) => setTimeout(sfx.step, i * 150));
          await viaView((d) => v.move(e.p, e.path, false, d), 1500 + e.path.length * 220);
          ticks.forEach(clearTimeout);
          pos[e.p] = e.path[e.path.length - 1]!;
          break;
        }
        case 'jail':
          await viaView((d) => v.move(e.p, [JAIL], true, d), 2000);
          pos[e.p] = JAIL;
          push(line!);
          break;
        case 'card':
          sfx.card();
          setCard({ deck: e.deck, text: e.text, who: seatOf(next, e.p).name });
          await wait(2300);
          setCard(null);
          break;
        case 'cash':
          if (e.why === 'Qua Xuất phát') sfx.go();
          else sfx.coin(e.amount > 0);
          push(line!);
          await wait(240);
          break;
        case 'build': {
          sfx.build(e.houses, e.houses > (levels[e.square] ?? 0));
          levels[e.square] = e.houses;
          await viaView((d) => v.build(e.square, e.houses, e.p, d), 1800);
          if (line) push(line);
          break;
        }
        case 'buy':
        case 'auction': {
          // Mua thẳng hay thắng đấu giá: cắm cờ chủ đất lên ô, camera sà vào xem.
          const owner = e.k === 'buy' ? e.p : e.winner;
          if (owner !== null) {
            sfx.stamp();
            await viaView((d) => v.claim(e.square, owner, d), 2000);
          }
          if (line) push(line);
          break;
        }
        case 'mortgage':
        case 'trade':
        case 'bankrupt':
        case 'free':
          v.setDeeds(next.deeds);
          if (e.k === 'bankrupt') v.retire(e.p);
          if (line) push(line);
          await wait(260);
          break;
        case 'over':
          break;
      }
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
    const skip = document.hidden || queue.current.length > 2;
    if (!prev || next.seq !== prev.seq + 1 || skip || !next.events.length) {
      v.setState(positions(next), next.deeds, outOf(next));
      if (next.lastDice) setDice(next.lastDice);
      show(next);
      pump();
      return;
    }
    animating.current = true;
    setBusy(true);
    v.highlight(null);
    void play(prev, next).then(() => {
      v.setState(positions(next), next.deeds, outOf(next));
      animating.current = false;
      show(next);
      pump();
    });
  };

  useEffect(() => {
    queue.current.push(cloneGame(game));
    if (ready) pump();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, ready]);

  useEffect(() => {
    if (shown.winner === null || busy) return;
    sfx.win();
    const t = setTimeout(onFinished, 1800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown.winner, busy]);

  const act = (a: Action) => {
    unlockAudio();
    const who = actor(shown);
    if (who !== null) onAct(who, a);
  };
  const actAs = (id: number, a: Action) => {
    unlockAudio();
    onAct(id, a);
  };

  const g = shown;
  const pend = g.pending;
  const who = actor(g);
  const turnName = seatOf(g, g.turn).name;
  const turnPlayer = playerOf(g, g.turn);
  const mine = who !== null && human(g, who) && !busy;
  const myTurn = mine && who === g.turn && !g.trade;
  const canManage = myTurn && (pend.kind === 'roll' || pend.kind === 'end' || pend.kind === 'debt');
  const left = g.endsAt ? Math.max(0, g.endsAt - now) : null;

  let status: string;
  if (busy) status = '…';
  else if (pend.kind === 'over') status = 'Ván đã kết thúc';
  else if (g.trade)
    status = `${seatOf(g, g.trade.from).name} đề nghị đổi đất với ${seatOf(g, g.trade.to).name}`;
  else if (pend.kind === 'auction') status = `Đấu giá ${BOARD[pend.square]!.name}`;
  else if (pend.kind === 'debt')
    status = myTurn
      ? `${passAndPlay ? turnName : 'Bạn'} đang nợ ${money(pend.amount)}`
      : `${turnName} đang xoay tiền trả nợ`;
  else if (pend.kind === 'buy')
    status = myTurn ? `Mua ${BOARD[pend.square]!.name}?` : `${turnName} đang cân nhắc mua đất`;
  else if (pend.kind === 'roll')
    status = myTurn
      ? turnPlayer.inJail
        ? 'Đang bị tạm giữ: đổ tìm đôi, nộp phạt hoặc dùng thẻ'
        : `Tới lượt ${passAndPlay ? turnName : 'bạn'} đổ xúc xắc`
      : `Chờ ${turnName}…`;
  else status = myTurn ? 'Xây nhà, đổi đất, hoặc kết thúc lượt' : `Chờ ${turnName}…`;

  return (
    // Chạm bất kỳ đâu trên màn chơi cũng mở khoá âm thanh (trình duyệt đòi một lần chạm trước khi phát).
    <div
      ref={rootRef}
      className="fixed inset-0 z-20 overflow-hidden bg-[color:var(--tp-lacquer)]"
      onPointerDown={unlockAudio}
    >
      <Stage
        viewRef={viewRef}
        onReady={() => setReady(true)}
        onPick={(sq) => !sheet && handoff === null && setInfo(sq)}
      />

      {/* Rời ván đứng riêng ở góc trên, xa các nút chơi. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 px-3 pt-[max(10px,env(safe-area-inset-top))]">
        <HudButton onClick={onLeave}>
          <BackIcon className="h-4 w-4" />
          Rời ván
        </HudButton>
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-[#1f1310]/95 px-3 py-2 text-xs font-bold text-[color:var(--tp-gold)] shadow-[inset_0_0_0_1px_rgb(212_167_58/0.45)] tabular-nums">
            {g.settings.mode === 'rounds'
              ? `Vòng ${Math.min(g.round, g.settings.rounds)}/${g.settings.rounds}`
              : left !== null
                ? `${Math.floor(left / 60000)}:${String(Math.floor((left % 60000) / 1000)).padStart(2, '0')}`
                : modeLabel}
          </span>
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
      </div>

      {/* Người chơi và tiền. */}
      <div
        ref={stripRef}
        className="pointer-events-none absolute inset-x-3 top-[calc(max(10px,env(safe-area-inset-top))+52px)] flex justify-center"
      >
        <Panel className="grid w-full max-w-2xl grid-cols-2 gap-x-4 gap-y-1.5 px-3 py-2.5 sm:grid-cols-3">
          {g.seats
            .filter((s) => s.kind !== 'empty')
            .map((s) => {
              const p = playerOf(g, s.id);
              return (
                <div
                  key={s.id}
                  className={`flex min-w-0 items-center gap-1.5 text-[13px] ${
                    s.id === g.turn
                      ? 'font-bold text-[color:var(--tp-goldHi)]'
                      : 'text-[color:var(--tp-ash)]'
                  } ${p.bankrupt || !s.connected ? 'line-through opacity-50' : ''}`}
                >
                  <Avatar character={characterOf(s)} id={s.id} size={22} />
                  <span className="min-w-0 flex-1 truncate">{s.name}</span>
                  <span className="shrink-0 tabular-nums">{money(p.cash)}</span>
                </div>
              );
            })}
        </Panel>
      </div>

      {/* Dòng tin: tiền ra vào, mua bán gần nhất. */}
      <ol
        aria-live="polite"
        className="pointer-events-none absolute left-3 top-[calc(max(10px,env(safe-area-inset-top))+150px)] flex max-w-[70%] flex-col gap-1"
      >
        {feed.map((f) => (
          <li
            key={f.key}
            className="w-fit rounded bg-black/60 px-2 py-1 text-xs font-semibold text-[color:var(--tp-eggshell)]"
          >
            {f.text}
          </li>
        ))}
      </ol>

      {/* Thẻ sự kiện vừa rút. */}
      {card && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-6">
          <div
            className="tp-card w-72 rounded-lg p-5 text-center shadow-[0_30px_60px_-20px_rgb(0_0_0/0.9)]"
            style={{
              background: card.deck === 'gift' ? 'var(--tp-cinnabar)' : 'var(--tp-eggshell)',
              color: card.deck === 'gift' ? 'var(--tp-goldHi)' : 'var(--tp-lacquer)',
            }}
          >
            <p className="text-xs font-bold tracking-[0.14em] uppercase opacity-80">
              {card.who} rút thẻ
            </p>
            <p className={`${DISPLAY} mt-1 text-3xl`}>
              {card.deck === 'gift' ? 'Lì xì' : 'Vận may'}
            </p>
            <p className="mt-3 text-[15px] font-semibold">{card.text}</p>
          </div>
        </div>
      )}

      {/* Hỏi mua đất. */}
      {!busy && pend.kind === 'buy' && myTurn && (
        <div className="absolute inset-x-0 bottom-[150px] z-10 flex flex-col items-center gap-3 px-4">
          <DeedCard square={pend.square} />
          <Panel className="flex gap-2 p-2">
            <Button
              tone="gold"
              disabled={turnPlayer.cash < priceOf(BOARD[pend.square]!)}
              onClick={() => act({ a: 'buy' })}
            >
              Mua {money(priceOf(BOARD[pend.square]!))}
            </Button>
            <Button tone="ghost" onClick={() => act({ a: 'decline' })}>
              Đem đấu giá
            </Button>
          </Panel>
        </div>
      )}

      {/* Đấu giá. */}
      {!busy && pend.kind === 'auction' && !g.trade && (
        <div className="absolute inset-x-0 bottom-[150px] z-10 flex justify-center px-4">
          <Panel className="flex w-full max-w-sm flex-col gap-3 p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className={`${DISPLAY} text-xl text-[color:var(--tp-gold)]`}>
                {BOARD[pend.square]!.name}
              </h2>
              <span className="text-xs text-[color:var(--tp-ash)]">
                Giá gốc {money(priceOf(BOARD[pend.square]!))}
              </span>
            </div>
            <p className="text-sm">
              Giá cao nhất:{' '}
              <b className="text-[color:var(--tp-goldHi)]">
                {pend.leader === null
                  ? 'chưa có'
                  : `${money(pend.bid)} · ${seatOf(g, pend.leader).name}`}
              </b>
            </p>
            {who !== null && human(g, who) ? (
              <>
                <p className="text-sm font-bold">{seatOf(g, who).name} trả giá:</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {[100, 500, 1000].map((step) => (
                    <Button
                      key={step}
                      tone="gold"
                      className="px-1 text-sm"
                      disabled={pend.bid + step > playerOf(g, who).cash}
                      onClick={() => actAs(who, { a: 'bid', amount: pend.bid + step })}
                    >
                      +{step}
                    </Button>
                  ))}
                  <Button
                    tone="ghost"
                    className="px-1 text-sm"
                    onClick={() => actAs(who, { a: 'pass' })}
                  >
                    Bỏ
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-[color:var(--tp-ash)]">
                Chờ {who !== null ? seatOf(g, who).name : '…'} trả giá…
              </p>
            )}
          </Panel>
        </div>
      )}

      {/* Đề nghị đổi đất. */}
      {!busy && g.trade && (
        <div className="absolute inset-x-0 bottom-[150px] z-10 flex justify-center px-4">
          <Panel className="flex w-full max-w-sm flex-col gap-3 p-4">
            <h2 className={`${DISPLAY} text-xl text-[color:var(--tp-gold)]`}>Đề nghị đổi đất</h2>
            <OfferSummary game={g} offer={g.trade} />
            {human(g, g.trade.to) ? (
              <div className="flex gap-2">
                <Button
                  tone="gold"
                  onClick={() => actAs(g.trade!.to, { a: 'respond', accept: true })}
                >
                  {seatOf(g, g.trade.to).name} đồng ý
                </Button>
                <Button
                  tone="ghost"
                  onClick={() => actAs(g.trade!.to, { a: 'respond', accept: false })}
                >
                  Từ chối
                </Button>
              </div>
            ) : human(g, g.trade.from) ? (
              <Button tone="ghost" onClick={() => actAs(g.trade!.from, { a: 'cancelOffer' })}>
                Huỷ đề nghị
              </Button>
            ) : (
              <p className="text-sm text-[color:var(--tp-ash)]">Chờ trả lời…</p>
            )}
          </Panel>
        </div>
      )}

      {/* Khay dưới: xúc xắc, trạng thái, các nút của lượt. */}
      <div
        ref={dockRef}
        className="absolute inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-10 flex justify-center"
      >
        <Panel className="flex w-full max-w-md flex-col gap-2.5 p-3">
          <div className="flex items-center gap-3">
            <span className="flex gap-1.5">
              <DieFace value={dice?.[0] ?? null} />
              <DieFace value={dice?.[1] ?? null} />
            </span>
            <p
              className="min-w-0 flex-1 text-sm font-semibold text-[color:var(--tp-eggshell)]"
              role="status"
            >
              {status}
            </p>
          </div>
          {myTurn && pend.kind !== 'over' && (
            <div className="flex flex-wrap gap-1.5">
              {pend.kind === 'roll' && (
                <>
                  <Button
                    className="basis-full sm:basis-0 sm:flex-1"
                    onClick={() => act({ a: 'roll' })}
                  >
                    {turnPlayer.inJail ? 'Đổ tìm đôi' : 'Đổ xúc xắc'}
                  </Button>
                  {turnPlayer.inJail && (
                    <Button
                      tone="ghost"
                      className="flex-1 sm:flex-none"
                      disabled={turnPlayer.cash < JAIL_FINE}
                      onClick={() => act({ a: 'payJail' })}
                    >
                      Nộp {money(JAIL_FINE)}
                    </Button>
                  )}
                  {turnPlayer.inJail && turnPlayer.freeCards > 0 && (
                    <Button
                      tone="ghost"
                      className="flex-1 sm:flex-none"
                      onClick={() => act({ a: 'useCard' })}
                    >
                      Dùng thẻ
                    </Button>
                  )}
                </>
              )}
              {pend.kind === 'end' && (
                <Button
                  className="basis-full sm:basis-0 sm:flex-1"
                  onClick={() => act({ a: 'end' })}
                >
                  Kết thúc lượt
                </Button>
              )}
              {pend.kind === 'debt' && (
                <>
                  <Button
                    className="basis-full sm:basis-0 sm:flex-1"
                    disabled={turnPlayer.cash < pend.amount}
                    onClick={() => act({ a: 'settle' })}
                  >
                    Trả nợ {money(pend.amount)}
                  </Button>
                  <Button
                    tone="ghost"
                    className="flex-1 sm:flex-none"
                    onClick={() => act({ a: 'bankrupt' })}
                  >
                    Phá sản
                  </Button>
                </>
              )}
              {canManage && (
                <>
                  <Button
                    tone="ghost"
                    onClick={() => setSheet('assets')}
                    className="flex-1 px-3 sm:flex-none"
                  >
                    <DeedIcon className="h-4 w-4" />
                    Tài sản
                  </Button>
                  {pend.kind !== 'debt' && (
                    <Button
                      tone="ghost"
                      onClick={() => setSheet('trade')}
                      className="flex-1 px-3 sm:flex-none"
                    >
                      <SwapIcon className="h-4 w-4" />
                      Đổi đất
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </Panel>
      </div>

      {sheet === 'assets' && canManage && (
        <AssetsSheet game={g} id={g.turn} onAct={act} onClose={() => setSheet(null)} />
      )}
      {sheet === 'trade' && canManage && (
        <TradeSheet
          game={g}
          id={g.turn}
          onSend={(offer) => {
            act({ a: 'offer', offer });
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      )}

      {info !== null && <SquareSheet game={g} square={info} onClose={() => setInfo(null)} />}

      {handoff !== null && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 p-6">
          <Panel className="tp-card flex w-full max-w-sm flex-col items-center gap-5 px-6 py-10 text-center">
            <Avatar character={characterOf(seatOf(g, handoff))} id={handoff} size={88} />
            <div>
              <p className="text-sm font-semibold text-[color:var(--tp-ash)]">Chuyền máy cho</p>
              <p className={`${DISPLAY} text-5xl text-[color:var(--tp-gold)]`}>
                {seatOf(g, handoff).name}
              </p>
              <p className="mt-1 text-sm text-[color:var(--tp-ash)]">
                {characterName(characterOf(seatOf(g, handoff)))} ·{' '}
                {money(playerOf(g, handoff).cash)}
              </p>
            </div>
            <Button className="w-full" onClick={() => setHandoff(null)}>
              {seatOf(g, handoff).name} vào lượt
            </Button>
          </Panel>
        </div>
      )}
    </div>
  );
}
