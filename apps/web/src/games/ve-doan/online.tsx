'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  clientToken,
  hostRoom,
  joinRoom,
  roomLink,
  type ClientRoom,
  type HostRoom,
  type NetError,
} from '../bong-bong-bum/net';
import {
  createGame,
  finishDrawing,
  MAX_PLAYERS,
  pickWord,
  setConnected,
  submitGuess,
  tick,
  type Game,
  type Settings,
} from './engine';
import { cloneStrokes, createInk, sanitize, type DrawOp, type Stroke } from './ink';
import {
  HEARTBEAT_MS,
  HEARTBEAT_TIMEOUT,
  PREFIX,
  PROTOCOL,
  ROOM_PATH,
  viewFor,
  type GameView,
  type LobbyState,
  type ToClient,
  type ToHost,
} from './net';
import { Connecting, GameScreen, LobbyScreen, type Drawing } from './screens';

// Phòng online của Vẽ Đoán. Chủ phòng giữ ván (engine.ts) và là máy duy nhất quyết định giờ giấc,
// đúng sai và điểm; mỗi khách chỉ nhận phần mình được thấy (viewFor) cùng nét vẽ của người đang vẽ.
// Chủ phòng cũng là một người chơi, ngồi ghế 0, đi qua đúng các hàm như khách.

export type OnlineMode =
  | { kind: 'host'; resume?: RoomSave }
  | { kind: 'join'; code: string; resume?: RoomSave };
type Status = 'connecting' | 'lobby' | 'game';

/**
 * Phòng đang ngồi, lưu trong sessionStorage lúc trang sắp tải lại hoặc bị ẩn: F5 thì vào lại đúng
 * phòng, đúng ghế, đúng ván; đóng tab thì bản lưu mất theo, đúng với "tắt tab là rời phòng".
 * Chủ phòng lưu thêm cả ván và bảng vẽ vì ván chỉ nằm trên máy chủ phòng.
 */
export type RoomSave = {
  code: string;
  view: GameView | null;
  gallery: Drawing[];
  host?: {
    epoch: number;
    lobby: LobbyState;
    tokens: string[];
    game: Game | null;
    strokes: Stroke[];
  };
};
const SAVE_KEY = 'vedoan.room';

export function loadRoomSave(): RoomSave | null {
  try {
    const raw = sessionStorage.getItem(SAVE_KEY);
    return raw ? (JSON.parse(raw) as RoomSave) : null;
  } catch {
    return null;
  }
}

function writeRoomSave(save: RoomSave | null) {
  try {
    if (save) sessionStorage.setItem(SAVE_KEY, JSON.stringify(save));
    else sessionStorage.removeItem(SAVE_KEY);
  } catch {
    // Không lưu được (bộ nhớ đầy, chế độ riêng tư) thì F5 rời phòng như trước — vẫn chơi bình thường.
  }
}

/**
 * Kết nối của khách đóng có thể chỉ là F5 hay chập mạng: chủ phòng giữ ghế chừng này rồi mới tính
 * là rời, để người vẽ tải lại trang không làm mất lượt của cả phòng.
 */
export const SEAT_GRACE_MS = 15_000;
/** Khách mất kết nối (vd: chủ phòng đang tải lại trang) thì thử nối lại trong chừng này. */
const RECONNECT_MS = 30_000;
const RETRY_MS = 1500;

const DEFAULT_SETTINGS: Settings = { turns: 6, drawTime: 80, pack: 'mix' };

/**
 * Nhịp kiểm tra giờ của chủ phòng, chạy trong Web Worker: tab nền bị trình duyệt hãm setInterval
 * xuống 1 lần/giây rồi 1 lần/phút, mà chủ phòng hay chuyển sang app khác để nhắn bạn vào phòng.
 */
function startTicker(onTick: () => void, ms: number): () => void {
  try {
    const url = URL.createObjectURL(
      new Blob([`setInterval(() => postMessage(0), ${ms});`], { type: 'text/javascript' }),
    );
    const worker = new Worker(url);
    worker.onmessage = onTick;
    return () => {
      worker.terminate();
      URL.revokeObjectURL(url);
    };
  } catch {
    const id = setInterval(onTick, ms);
    return () => clearInterval(id);
  }
}

export function OnlineRoom({
  mode,
  name,
  onExit,
}: {
  mode: OnlineMode;
  name: string;
  onExit: (error?: NetError) => void;
}) {
  const isHost = mode.kind === 'host';
  const resume = mode.resume;
  const saved = resume?.host;
  const [status, setStatus] = useState<Status>('connecting');
  const [code, setCode] = useState(mode.kind === 'join' ? mode.code : (resume?.code ?? ''));
  const [lobby, setLobby] = useState<LobbyState>(
    saved?.lobby ?? { slots: [{ name, host: true, connected: true }], settings: DEFAULT_SETTINGS },
  );
  const [you, setYou] = useState(0);
  const [view, setView] = useState<GameView | null>(null);
  const [gallery, setGallery] = useState<Drawing[]>(resume?.gallery ?? []);
  const [toast, setToast] = useState<string | null>(null);
  const [link, setLink] = useState('');

  const ink = useMemo(() => {
    const k = createInk();
    if (saved) k.reset(saved.strokes);
    return k;
  }, [saved]);
  const hostRef = useRef<HostRoom<ToClient> | null>(null);
  const clientRef = useRef<ClientRoom<ToHost> | null>(null);
  const lobbyRef = useRef(lobby);
  const statusRef = useRef(status);
  statusRef.current = status;
  // Màn cũ trước F5: để nhận trạng thái đầu tiên không bị coi là ván mới (xoá mất tranh các lượt trước).
  const viewRef = useRef<GameView | null>(resume?.view ?? null);
  const galleryRef = useRef<Drawing[]>(resume?.gallery ?? []);
  const gameRef = useRef<Game | null>(saved?.game ?? null);
  /** Chủ phòng: kết nối và mã tab của từng ghế (ghế 0 là chủ phòng, không có kết nối). */
  const seats = useRef<{ connId: string | null; token: string }[]>(
    saved
      ? saved.tokens.map((token) => ({ connId: null, token }))
      : [{ connId: null, token: clientToken() }],
  );
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;

  useEffect(() => {
    if (code) setLink(roomLink(code, ROOM_PATH));
  }, [code]);

  const flash = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(null), 2500);
  };

  /** Nhận trạng thái ván (khách: từ chủ phòng; chủ phòng: của chính mình). */
  const receive = (v: GameView) => {
    const prev = viewRef.current;
    const newGame =
      !prev || v.turn < prev.turn || (prev.phase.kind === 'final' && v.phase.kind !== 'final');
    if (newGame) galleryRef.current = [];
    // Sang lượt mới thì xoá bảng; nét của lượt mới luôn tới sau trạng thái này (cùng một đường truyền có thứ tự).
    if (newGame || prev.turn !== v.turn) ink.reset();
    // Vừa hết lượt: giữ lại bức vẽ cho màn đáp án và màn tổng kết (bảng trống — người vẽ rời phòng
    // hoặc chưa kịp vẽ — thì thôi).
    if (
      v.phase.kind === 'reveal' &&
      v.phase.word &&
      prev?.phase.kind !== 'reveal' &&
      ink.strokes.length > 0
    ) {
      const p = v.phase;
      galleryRef.current = [
        ...galleryRef.current.filter((d) => d.turn !== v.turn),
        { turn: v.turn, drawer: p.drawer, word: p.word, strokes: cloneStrokes(ink.strokes) },
      ];
    }
    viewRef.current = v;
    setGallery(galleryRef.current);
    setView(v);
    setStatus('game');
  };

  // ------------------------------------------------------------------ chủ phòng

  /** Chủ phòng đổi sảnh: cập nhật màn mình và gửi cho mọi khách. */
  const publish = (next: LobbyState) => {
    lobbyRef.current = next;
    setLobby(next);
    hostRef.current?.broadcast({ t: 'lobby', lobby: next });
  };

  /** Gửi cho từng người phần ván của họ, và cập nhật màn của chính chủ phòng. */
  const sync = () => {
    const g = gameRef.current;
    if (!g) return;
    const now = Date.now();
    seats.current.forEach((s, i) => {
      if (i > 0 && s.connId)
        hostRef.current?.send(s.connId, { t: 'state', view: viewFor(g, i, now) });
    });
    receive(viewFor(g, 0, now));
  };

  /** Chuyển nét vẽ cho mọi khách, trừ người vừa gửi. */
  const relay = (ops: DrawOp[], except = -1) =>
    seats.current.forEach((s, i) => {
      if (i > 0 && i !== except && s.connId) hostRef.current?.send(s.connId, { t: 'draw', ops });
    });

  const start = () => {
    const cur = lobbyRef.current;
    gameRef.current = createGame(
      cur.settings,
      cur.slots.map((s) => s.name),
      Date.now(),
      Math.floor(Math.random() * 2 ** 31),
    );
    viewRef.current = null;
    sync();
  };

  /** Về phòng chờ: bỏ ghế của người đã rời, đánh số lại ghế và báo từng người ghế mới của mình. */
  const backToLobby = () => {
    const g = gameRef.current;
    const keep = seats.current
      .map((_, i) => i)
      .filter((i) => i === 0 || (g ? g.seats[i]?.connected : lobbyRef.current.slots[i]?.connected));
    const slots = keep.map((i) => ({
      name: g?.seats[i]?.name ?? lobbyRef.current.slots[i]!.name,
      host: i === 0,
      connected: true,
    }));
    seats.current = keep.map((i) => seats.current[i]!);
    gameRef.current = null;
    viewRef.current = null;
    setView(null);
    seats.current.forEach((s, i) => {
      if (i > 0 && s.connId) hostRef.current?.send(s.connId, { t: 'welcome', slot: i });
    });
    publish({ ...lobbyRef.current, slots });
    setStatus('lobby');
  };

  /** Chủ phòng: lần cuối nghe thấy từng kết nối (mọi tin nhắn, kể cả ping). */
  const lastSeen = useRef(new Map<string, number>());

  /** Một khách rời phòng hẳn (hết hạn giữ ghế, hoặc im lặng quá lâu). */
  const leaveSeat = (i: number) => {
    const g = gameRef.current;
    const who = g?.seats[i]?.name ?? lobbyRef.current.slots[i]?.name;
    if (g) {
      seats.current[i]!.connId = null;
      setConnected(g, i, false, Date.now());
      sync();
    } else {
      seats.current.splice(i, 1);
      const cur = lobbyRef.current;
      // Ghế sau người rời dồn lên một: báo lại số ghế cho từng người.
      seats.current.forEach((s, k) => {
        if (k >= i && s.connId) hostRef.current?.send(s.connId, { t: 'welcome', slot: k });
      });
      publish({ ...cur, slots: cur.slots.filter((_, k) => k !== i) });
    }
    flash(`${who} đã rời phòng.`);
  };

  /** Ghế đang trống kết nối: hết hạn mà người đó chưa vào lại (theo mã tab) thì tính là rời. */
  const holdSeat = (token: string) =>
    setTimeout(() => {
      if (!hostRef.current) return;
      const i = seats.current.findIndex((s, k) => k > 0 && s.token === token);
      if (i > 0 && !seats.current[i]!.connId) leaveSeat(i);
    }, SEAT_GRACE_MS);

  /** Kết nối của khách đóng: chưa tính là rời ngay (xem SEAT_GRACE_MS). */
  const onConnClosed = (connId: string) => {
    lastSeen.current.delete(connId);
    const seat = seats.current.find((s, i) => i > 0 && s.connId === connId);
    if (!seat) return;
    seat.connId = null;
    holdSeat(seat.token);
  };

  useEffect(() => {
    if (!isHost) return;
    let cancelled = false;
    // Mở phòng ở nhịp sau (xem ghi chú ở phần khách): lần chạy effect bị huỷ ngay không mở thừa phòng.
    const timer = setTimeout(
      () =>
        hostRoom<ToHost, ToClient>(
          {
            onJoin: (connId, hello) => {
              const room = hostRef.current;
              if (!room) return;
              lastSeen.current.set(connId, Date.now());
              if (hello.protocol !== PROTOCOL)
                return room.kick(connId, { t: 'reject', reason: 'version' });
              const back = seats.current.findIndex((s, i) => i > 0 && s.token === hello.token);
              const g = gameRef.current;
              if (back > 0) {
                // Cùng tab vào lại sau khi rớt mạng: trả đúng ghế cũ, kể cả giữa ván.
                const old = seats.current[back]!.connId;
                if (old && old !== connId) room.drop(old);
                seats.current[back]!.connId = connId;
                lastSeen.current.set(connId, Date.now());
                room.send(connId, { t: 'welcome', slot: back });
                if (g) {
                  setConnected(g, back, true, Date.now());
                  sync();
                  room.send(connId, { t: 'ink', strokes: ink.strokes });
                } else {
                  const cur = lobbyRef.current;
                  publish({
                    ...cur,
                    slots: cur.slots.map((s, i) => (i === back ? { ...s, connected: true } : s)),
                  });
                }
                return;
              }
              if (statusRef.current !== 'lobby')
                return room.kick(connId, { t: 'reject', reason: 'started' });
              const cur = lobbyRef.current;
              if (cur.slots.length >= MAX_PLAYERS)
                return room.kick(connId, { t: 'reject', reason: 'full' });
              seats.current.push({ connId, token: hello.token });
              room.send(connId, { t: 'welcome', slot: cur.slots.length });
              publish({
                ...cur,
                slots: [...cur.slots, { name: hello.name, host: false, connected: true }],
              });
              flash(`${hello.name} đã vào phòng.`);
            },
            onMessage: (connId, msg) => {
              lastSeen.current.set(connId, Date.now());
              const i = seats.current.findIndex((s) => s.connId === connId);
              const g = gameRef.current;
              if (i <= 0 || !g) return;
              const now = Date.now();
              if (msg.t === 'pick') {
                if (pickWord(g, i, Number(msg.index), now)) sync();
              } else if (msg.t === 'guess') {
                if (typeof msg.text === 'string' && submitGuess(g, i, msg.text, now)) sync();
              } else if (msg.t === 'draw') {
                // Chỉ người đang vẽ mới được vẽ, và chỉ trong lúc vẽ.
                if (g.phase.kind !== 'draw' || g.phase.drawer !== i) return;
                const ops = sanitize(msg.ops);
                ink.apply(ops);
                relay(ops, i);
              } else if (msg.t === 'done') {
                if (finishDrawing(g, i, now)) sync();
              }
            },
            onLeave: (connId) => onConnClosed(connId),
            onError: (e) =>
              flash(
                e === 'broker' ? 'Mất kết nối máy môi giới — người mới tạm thời chưa vào được.' : e,
              ),
          },
          resume && saved ? { code: resume.code, epoch: saved.epoch } : undefined,
          PREFIX,
        )
          .then((room) => {
            // Lần mở bị huỷ: nhả mã ngay, không báo khách "phòng đóng" (họ có thể đang chờ lần mở thật).
            if (cancelled) return resume ? room.release() : room.close();
            hostRef.current = room;
            setCode(room.code);
            if (!resume) return setStatus('lobby');
            // Vừa F5: khách sẽ tự nối lại; ai không quay lại kịp thì tính là rời.
            seats.current.slice(1).forEach((s) => holdSeat(s.token));
            if (gameRef.current) sync();
            else {
              publish(lobbyRef.current);
              setStatus('lobby');
            }
            flash('Đã mở lại phòng — chờ mọi người nối lại.');
          })
          .catch((e: NetError) => !cancelled && onExitRef.current(e)),
      0,
    );

    let lastPing = 0;
    const stopTicker = startTicker(() => {
      const now = Date.now();
      const g = gameRef.current;
      if (g && tick(g, now)) sync();
      if (now - lastPing < HEARTBEAT_MS) return;
      lastPing = now;
      hostRef.current?.broadcast({ t: 'ping' });
      // Im lặng quá lâu (máy tắt màn hình, mất sóng hẳn): đã chờ đủ lâu nên tính là rời luôn.
      const silent = seats.current.filter((s, i) => {
        const seen = s.connId ? lastSeen.current.get(s.connId) : undefined;
        return i > 0 && seen !== undefined && now - seen > HEARTBEAT_TIMEOUT;
      });
      for (const s of silent) {
        hostRef.current?.drop(s.connId!);
        lastSeen.current.delete(s.connId!);
        s.connId = null;
        const i = seats.current.indexOf(s);
        if (i > 0) leaveSeat(i);
      }
    }, 250);
    const save = () => {
      const room = hostRef.current;
      if (!room) return;
      writeRoomSave({
        code: room.code,
        view: viewRef.current,
        gallery: galleryRef.current,
        host: {
          epoch: room.epoch,
          lobby: lobbyRef.current,
          tokens: seats.current.map((s) => s.token),
          game: gameRef.current,
          strokes: ink.strokes,
        },
      });
    };
    const onHidden = () => document.visibilityState === 'hidden' && save();
    const release = () => {
      save();
      hostRef.current?.release();
    };
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', release);
    return () => {
      clearTimeout(timer);
      cancelled = true;
      stopTicker();
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', release);
      // Rời phòng thật (bấm Rời phòng, sang trang khác): bỏ bản lưu. F5 không chạy tới đây.
      writeRoomSave(null);
      hostRef.current?.close();
      hostRef.current = null;
    };
    // Các hàm bên trong chỉ đọc ref nên không cần nằm trong danh sách phụ thuộc.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost]);

  // ------------------------------------------------------------------ khách

  useEffect(() => {
    if (mode.kind !== 'join') return;
    const roomCode = mode.code;
    let cancelled = false;
    const hello = { t: 'hello' as const, name, token: clientToken(), protocol: PROTOCOL };
    let lastHeard = Date.now();
    /** Hạn chót nối lại; 0 là đang không nối lại. */
    let deadline = 0;
    let retry: ReturnType<typeof setTimeout> | undefined;

    /** Rớt khỏi chủ phòng: thử nối lại một lúc (chủ phòng có thể chỉ đang F5) rồi mới chịu thua. */
    const lost = (e: NetError) => {
      if (cancelled) return;
      clientRef.current = null;
      const giveUp = e !== 'lost' && e !== 'notFound' && e !== 'broker';
      if (giveUp || (deadline && Date.now() > deadline)) {
        cancelled = true;
        return onExitRef.current(deadline ? 'lost' : e);
      }
      if (!deadline) {
        deadline = Date.now() + RECONNECT_MS;
        flash('Mất kết nối — đang nối lại…');
      }
      retry = setTimeout(connect, RETRY_MS);
    };

    const connect = () =>
      joinRoom<ToHost, ToClient>(
        roomCode,
        hello,
        {
          onMessage: (msg) => {
            lastHeard = Date.now();
            switch (msg.t) {
              case 'welcome':
                setYou(msg.slot);
                // Vào lại giữa ván: chờ trạng thái ván tới rồi mới đổi màn, đừng nháy qua phòng chờ.
                setStatus((s) => (s === 'connecting' && !viewRef.current ? 'lobby' : s));
                break;
              case 'reject':
                cancelled = true;
                onExitRef.current(msg.reason);
                break;
              case 'lobby':
                lobbyRef.current = msg.lobby;
                setLobby(msg.lobby);
                viewRef.current = null;
                setView(null);
                setStatus('lobby');
                break;
              case 'state':
                receive(msg.view);
                break;
              case 'draw':
                ink.apply(sanitize(msg.ops));
                break;
              case 'ink':
                ink.reset(msg.strokes);
                break;
              case 'closed':
              case 'ping':
                break;
            }
          },
          onClose: lost,
        },
        PREFIX,
      )
        .then((room) => {
          if (cancelled) return room.close();
          clientRef.current = room;
          lastHeard = Date.now();
          if (deadline) flash('Đã nối lại.');
          deadline = 0;
        })
        .catch((e: NetError) => (deadline ? lost(e) : !cancelled && onExitRef.current(e)));

    // Nối ở nhịp sau, không nối ngay: chế độ dev của React chạy effect hai lần liền, và hai kết nối
    // cùng mã tab làm chủ phòng tưởng là "vào lại" rồi cắt nhầm kết nối còn sống. Lần chạy bị huỷ
    // ngay sẽ xoá hẹn giờ trước khi kịp mở mạng.
    const timer = setTimeout(connect, 0);
    const stopHeartbeat = startTicker(() => {
      const room = clientRef.current;
      if (!room || cancelled) return;
      if (Date.now() - lastHeard > HEARTBEAT_TIMEOUT) {
        room.close();
        lost('lost');
        return;
      }
      room.send({ t: 'ping' });
    }, HEARTBEAT_MS);
    const save = () =>
      writeRoomSave({ code: roomCode, view: viewRef.current, gallery: galleryRef.current });
    const onHidden = () => document.visibilityState === 'hidden' && save();
    // Đóng tab hay F5: báo chủ phòng ngay thay vì để chủ phòng chờ hết nhịp tim.
    const leave = () => {
      save();
      clientRef.current?.close();
    };
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', leave);
    return () => {
      clearTimeout(timer);
      clearTimeout(retry);
      cancelled = true;
      stopHeartbeat();
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', leave);
      writeRoomSave(null);
      clientRef.current?.close();
      clientRef.current = null;
    };
    // Chỉ nối một lần khi mở phòng.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ------------------------------------------------------------------ thao tác của mình

  const onPick = (index: number) => {
    const g = gameRef.current;
    if (isHost && g) {
      if (pickWord(g, 0, index, Date.now())) sync();
    } else clientRef.current?.send({ t: 'pick', index });
  };
  const onGuess = (text: string) => {
    const g = gameRef.current;
    if (isHost && g) {
      if (submitGuess(g, 0, text, Date.now())) sync();
    } else clientRef.current?.send({ t: 'guess', text });
  };
  const onDone = () => {
    const g = gameRef.current;
    if (isHost && g) {
      if (finishDrawing(g, 0, Date.now())) sync();
    } else clientRef.current?.send({ t: 'done' });
  };
  const onOps = (ops: DrawOp[]) => {
    // Bảng của người vẽ đã tự áp nét vào bảng chung; ở đây chỉ gửi đi.
    if (isHost) relay(ops);
    else clientRef.current?.send({ t: 'draw', ops });
  };

  return (
    <>
      {status === 'connecting' && (
        <Connecting
          text={isHost ? 'Đang mở phòng…' : `Đang vào phòng ${code}…`}
          onCancel={() => onExit()}
        />
      )}
      {status === 'lobby' && (
        <LobbyScreen
          code={code}
          link={link}
          lobby={lobby}
          you={you}
          isHost={isHost}
          onSettings={(patch) =>
            publish({ ...lobbyRef.current, settings: { ...lobbyRef.current.settings, ...patch } })
          }
          onStart={start}
        />
      )}
      {status === 'game' && view && (
        <GameScreen
          view={view}
          you={you}
          code={code}
          isHost={isHost}
          ink={ink}
          gallery={gallery}
          onPick={onPick}
          onGuess={onGuess}
          onOps={onOps}
          onDone={onDone}
          onAgain={() => {
            backToLobby();
            start();
          }}
          onLobby={backToLobby}
        />
      )}
      {toast && (
        <p
          role="status"
          className="fixed inset-x-4 bottom-24 z-20 mx-auto max-w-sm rounded-full bg-[color:var(--vd-bulb)] px-4 py-2.5 text-center text-sm font-bold text-[color:var(--vd-ink)] shadow-[0_10px_24px_-8px_rgb(0_0_0/0.6)]"
        >
          {toast}
        </p>
      )}
    </>
  );
}
