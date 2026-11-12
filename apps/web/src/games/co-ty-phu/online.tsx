'use client';

import { useEffect, useRef, useState } from 'react';
import {
  clientToken,
  hostRoom,
  joinRoom,
  roomLink,
  type ClientRoom,
  type HostRoom,
  type NetError,
} from '../bong-bong-bum/net';
import { MAX_PLAYERS } from './data';
import {
  act,
  checkTime,
  DEFAULT_SETTINGS,
  setConnected,
  type Action,
  type Game,
  type Seat,
} from './engine';
import { GameScreen } from './game';
import { autoPending, autoStep, botDelay, cloneGame, ctx, newGame, timeUp } from './match';
import {
  HEARTBEAT_MS,
  HEARTBEAT_TIMEOUT,
  PREFIX,
  PROTOCOL,
  ROOM_PATH,
  type LobbyState,
  type ToClient,
  type ToHost,
} from './net';
import { characterOf, freeCharacter, saveCharacter } from './roster';
import { botName, LobbyScreen, WinScreen } from './screens';
import { DISPLAY } from './theme';

// Phòng online của Cờ tỷ phú. Chủ phòng ngồi ghế 0, giữ ván (engine.ts), bốc xúc xắc cho mọi người,
// và quyết thay ghế máy hoặc người đang rớt mạng; khách chỉ gửi thao tác rồi nhận lại cả ván. F5
// không mất phòng: chủ phòng mở lại đúng mã và đúng ván, khách tự vào lại đúng ghế (xem RoomSave).

export type OnlineMode =
  | { kind: 'host'; resume?: RoomSave }
  | { kind: 'join'; code: string; resume?: RoomSave };
type Status = 'connecting' | 'lobby' | 'game' | 'over';

/**
 * Phòng đang ngồi, lưu trong sessionStorage lúc trang sắp tải lại hoặc bị ẩn: F5 thì vào lại đúng
 * phòng; đóng tab thì bản lưu mất theo. Chủ phòng lưu thêm cả phòng chờ và ván vì chỉ máy chủ có.
 */
export type RoomSave = {
  code: string;
  host?: { epoch: number; lobby: LobbyState; tokens: (string | null)[]; game: Game | null };
};
const SAVE_KEY = 'cotyphu.room';

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
    // Không lưu được thì F5 rời phòng — vẫn chơi bình thường.
  }
}

/** Kết nối khách đóng có thể chỉ là F5: giữ ghế chừng này rồi mới coi là rời. */
const SEAT_GRACE_MS = 15_000;
/** Khách mất kết nối (vd: chủ phòng đang tải lại trang) thì thử nối lại trong chừng này. */
const RECONNECT_MS = 30_000;
const RETRY_MS = 1500;

/** Nhịp chạy nền bằng Web Worker: tab nền bị trình duyệt hãm setInterval, Worker thì không. */
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

const emptySeat = (id: number): Seat => ({ id, name: '', kind: 'empty', connected: true });
const SEAT_IDS = Array.from({ length: MAX_PLAYERS }, (_, i) => i);

export function OnlineRoom({
  mode,
  name,
  character,
  onExit,
}: {
  mode: OnlineMode;
  name: string;
  /** Nhân vật mình muốn dùng; chủ phòng đổi sang nhân vật khác nếu đã có người chọn. */
  character: string;
  onExit: (error?: NetError) => void;
}) {
  const isHost = mode.kind === 'host';
  const saved = mode.resume?.host;
  const [status, setStatus] = useState<Status>('connecting');
  const [code, setCode] = useState(mode.kind === 'join' ? mode.code : (mode.resume?.code ?? ''));
  const [lobby, setLobby] = useState<LobbyState>(
    saved?.lobby ?? {
      seats: SEAT_IDS.map((id) =>
        id === 0 ? { id, name, kind: 'human', connected: true, character } : emptySeat(id),
      ),
      settings: DEFAULT_SETTINGS,
    },
  );
  const [game, setGame] = useState<Game | null>(saved?.game ?? null);
  const [you, setYou] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [link, setLink] = useState('');

  const hostRef = useRef<HostRoom<ToClient> | null>(null);
  const clientRef = useRef<ClientRoom<ToHost> | null>(null);
  const lobbyRef = useRef(lobby);
  const gameRef = useRef(game);
  /** Chủ phòng: mã tab và kết nối của từng ghế (ghế 0 là chủ phòng, không có kết nối). */
  const tokens = useRef<(string | null)[]>(
    saved?.tokens ?? SEAT_IDS.map((id) => (id === 0 ? clientToken() : null)),
  );
  const conns = useRef<(string | null)[]>(SEAT_IDS.map(() => null));
  const lastSeen = useRef(new Map<string, number>());
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;

  useEffect(() => {
    if (code) setLink(roomLink(code, ROOM_PATH));
  }, [code]);

  const flash = (text: string) => {
    setToast(text);
    setTimeout(() => setToast((t) => (t === text ? null : t)), 2600);
  };

  // ------------------------------------------------------------------ chủ phòng

  const publishLobby = (next: LobbyState) => {
    lobbyRef.current = next;
    setLobby(next);
    hostRef.current?.broadcast({ t: 'lobby', lobby: next });
  };
  const publishGame = (next: Game | null) => {
    gameRef.current = next;
    setGame(next);
    if (next) hostRef.current?.broadcast({ t: 'state', game: next });
  };
  /** Chủ phòng sửa ván (của mình hoặc theo lời khách) rồi gửi cho mọi người. */
  const applyGame = (fn: (g: Game) => boolean) => {
    const g = gameRef.current;
    if (!g) return;
    const next = cloneGame(g);
    if (fn(next)) publishGame(next);
  };

  /** Ghế của một kết nối; 0 hoặc nhỏ hơn là không phải khách nào. */
  const seatOfConn = (connId: string) => conns.current.findIndex((c) => c === connId);

  /** Nhân vật các ghế khác (không trống) đang dùng. */
  const takenBy = (except: number) =>
    lobbyRef.current.seats
      .filter((s) => s.id !== except && s.kind !== 'empty')
      .map((s) => characterOf(s));

  /** Chủ phòng đổi nhân vật của một ghế (của mình, ghế máy, hay theo lời khách). */
  const setCharacter = (id: number, ch: string) => {
    if (takenBy(id).includes(ch)) return;
    publishLobby({
      ...lobbyRef.current,
      seats: lobbyRef.current.seats.map((s) =>
        s.id === id
          ? { ...s, character: ch, ...(s.kind === 'bot' ? { name: botName(ch) } : {}) }
          : s,
      ),
    });
  };

  /** Một người rời hẳn: trong phòng chờ thì trả ghế trống; giữa ván thì máy chơi thay. */
  const leaveSeat = (id: number) => {
    const who = lobbyRef.current.seats[id]?.name;
    conns.current[id] = null;
    if (gameRef.current) {
      applyGame((g) => {
        setConnected(g, id, false);
        return true;
      });
      flash(`${who} đã rời — máy chơi thay.`);
    } else {
      tokens.current[id] = null;
      publishLobby({
        ...lobbyRef.current,
        seats: lobbyRef.current.seats.map((s) => (s.id === id ? emptySeat(id) : s)),
      });
      flash(`${who} đã rời phòng.`);
    }
  };

  /** Ghế mất kết nối: hết hạn mà chưa vào lại (theo mã tab) thì coi là rời. */
  const holdSeat = (id: number, token: string | null) =>
    setTimeout(() => {
      if (!hostRef.current) return;
      if (tokens.current[id] === token && !conns.current[id]) leaveSeat(id);
    }, SEAT_GRACE_MS);

  const start = () => {
    publishGame(newGame(lobbyRef.current.seats, lobbyRef.current.settings));
    setStatus('game');
  };

  const backToLobby = () => {
    publishGame(null);
    setStatus('lobby');
    publishLobby({
      ...lobbyRef.current,
      seats: lobbyRef.current.seats.map((s) =>
        s.kind === 'human' && s.id !== 0 && !conns.current[s.id] ? emptySeat(s.id) : s,
      ),
    });
  };

  useEffect(() => {
    if (!isHost) return;
    let cancelled = false;
    const resume = mode.resume;
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
              const back = tokens.current.findIndex((t, i) => i > 0 && t === hello.token);
              if (back > 0) {
                // Cùng tab vào lại (F5 hoặc rớt mạng): trả đúng ghế cũ, kể cả giữa ván.
                const old = conns.current[back];
                if (old && old !== connId) room.drop(old);
                conns.current[back] = connId;
                room.send(connId, { t: 'welcome', seat: back });
                if (gameRef.current) {
                  applyGame((g) => {
                    setConnected(g, back, true);
                    return true;
                  });
                  room.send(connId, { t: 'state', game: gameRef.current! });
                } else room.send(connId, { t: 'lobby', lobby: lobbyRef.current });
                return;
              }
              if (gameRef.current) return room.kick(connId, { t: 'reject', reason: 'started' });
              const free = lobbyRef.current.seats.find((s) => s.kind === 'empty');
              if (!free) return room.kick(connId, { t: 'reject', reason: 'full' });
              tokens.current[free.id] = hello.token;
              conns.current[free.id] = connId;
              room.send(connId, { t: 'welcome', seat: free.id });
              const taken = takenBy(free.id);
              publishLobby({
                ...lobbyRef.current,
                seats: lobbyRef.current.seats.map((s) =>
                  s.id === free.id
                    ? {
                        id: s.id,
                        name: hello.name,
                        kind: 'human',
                        connected: true,
                        character: taken.includes(hello.character)
                          ? freeCharacter(taken)
                          : hello.character,
                      }
                    : s,
                ),
              });
              flash(`${hello.name} đã vào phòng.`);
            },
            onMessage: (connId, msg) => {
              lastSeen.current.set(connId, Date.now());
              const id = seatOfConn(connId);
              if (id <= 0) return;
              // Engine tự từ chối thao tác không phải của ghế này hoặc không đúng lúc.
              if (msg.t === 'act') applyGame((g) => act(g, id, msg.action, ctx()));
              // Đổi nhân vật chỉ trong phòng chờ, và không lấy nhân vật người khác đang dùng.
              if (msg.t === 'character' && !gameRef.current) setCharacter(id, msg.id);
            },
            onLeave: (connId) => {
              lastSeen.current.delete(connId);
              const id = seatOfConn(connId);
              if (id <= 0) return;
              conns.current[id] = null;
              holdSeat(id, tokens.current[id] ?? null);
            },
            onError: () => flash('Mất kết nối máy môi giới — người mới tạm thời chưa vào được.'),
          },
          resume?.host ? { code: resume.code, epoch: resume.host.epoch } : undefined,
          PREFIX,
        )
          .then((room) => {
            // Lần mở bị huỷ (React chạy effect hai lần ở chế độ dev): nhả mã ngay.
            if (cancelled) return resume ? room.release() : room.close();
            hostRef.current = room;
            setCode(room.code);
            if (resume?.host) {
              // Vừa F5: khách sẽ tự nối lại; ai không quay lại kịp thì máy chơi thay / trả ghế.
              for (let i = 1; i < MAX_PLAYERS; i++)
                if (tokens.current[i]) holdSeat(i, tokens.current[i] ?? null);
              flash('Đã mở lại phòng — chờ mọi người nối lại.');
            }
            if (gameRef.current) {
              publishGame(gameRef.current);
              setStatus('game');
            } else {
              publishLobby(lobbyRef.current);
              setStatus('lobby');
            }
          })
          .catch((e: NetError) => !cancelled && onExitRef.current(e)),
      0,
    );

    let lastPing = 0;
    const stopTicker = startTicker(() => {
      const now = Date.now();
      // Chế độ có giờ: chủ phòng chốt ván khi hết giờ, kể cả lúc tab đang ở nền.
      const g = gameRef.current;
      if (g && timeUp(g)) applyGame((next) => checkTime(next, now));
      if (now - lastPing < HEARTBEAT_MS) return;
      lastPing = now;
      hostRef.current?.broadcast({ t: 'ping' });
      // Im lặng quá lâu (tắt màn hình, mất sóng hẳn): đã chờ đủ lâu nên coi là rời luôn.
      conns.current.forEach((c, i) => {
        if (i === 0 || !c) return;
        const seen = lastSeen.current.get(c);
        if (seen !== undefined && now - seen > HEARTBEAT_TIMEOUT) {
          hostRef.current?.drop(c);
          lastSeen.current.delete(c);
          leaveSeat(i);
        }
      });
    }, 500);

    const save = () => {
      const room = hostRef.current;
      if (!room) return;
      writeRoomSave({
        code: room.code,
        host: {
          epoch: room.epoch,
          lobby: lobbyRef.current,
          tokens: tokens.current,
          game: gameRef.current,
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
      // Rời phòng thật (bấm Rời ván, sang trang khác): bỏ bản lưu. F5 không chạy tới đây.
      writeRoomSave(null);
      hostRef.current?.close();
      hostRef.current = null;
    };
    // Các hàm bên trong chỉ đọc ref nên không cần nằm trong danh sách phụ thuộc.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost]);

  // Chủ phòng quyết thay ghế máy / người đang rớt mạng, sau khi mọi màn diễn xong nước trước.
  useEffect(() => {
    if (!isHost || !game || !autoPending(game)) return;
    const t = setTimeout(() => applyGame(autoStep), botDelay(game));
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, game]);

  // ------------------------------------------------------------------ khách

  useEffect(() => {
    if (mode.kind !== 'join') return;
    const roomCode = mode.code;
    let cancelled = false;
    const hello = {
      t: 'hello' as const,
      name,
      character,
      token: clientToken(),
      protocol: PROTOCOL,
    };
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
                setYou(msg.seat);
                break;
              case 'reject':
                cancelled = true;
                onExitRef.current(msg.reason);
                break;
              case 'lobby':
                lobbyRef.current = msg.lobby;
                setLobby(msg.lobby);
                gameRef.current = null;
                setGame(null);
                setStatus('lobby');
                break;
              case 'state':
                gameRef.current = msg.game;
                setGame(msg.game);
                setStatus((s) => (s === 'over' ? s : 'game'));
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

    // Nối ở nhịp sau: chế độ dev của React chạy effect hai lần, hai kết nối cùng mã tab làm chủ
    // phòng tưởng là "vào lại" rồi cắt nhầm kết nối còn sống.
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
    const save = () => writeRoomSave({ code: roomCode });
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

  // ------------------------------------------------------------------ hiển thị

  const me = isHost ? 0 : you;
  const onAct = (id: number, action: Action) => {
    if (isHost) applyGame((g) => act(g, id, action, ctx()));
    else clientRef.current?.send({ t: 'act', action });
  };

  return (
    <>
      {status === 'connecting' && (
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
          <span className="h-10 w-10 animate-spin rounded-full border-4 border-[color:var(--tp-rule)] border-t-[color:var(--tp-gold)]" />
          <p className={`${DISPLAY} text-2xl text-[color:var(--tp-gold)]`}>
            {isHost ? 'Đang lập phòng…' : `Đang vào phòng ${code}…`}
          </p>
        </div>
      )}
      {status === 'lobby' && (
        <LobbyScreen
          code={code}
          link={link}
          seats={lobby.seats}
          you={me}
          isHost={isHost}
          settings={lobby.settings}
          onSeatKind={(id, kind) => {
            // Máy lấy ngẫu nhiên một nhân vật chưa ai dùng.
            const ch = freeCharacter(takenBy(id), true);
            publishLobby({
              ...lobbyRef.current,
              seats: lobbyRef.current.seats.map((s) =>
                s.id === id
                  ? kind === 'bot'
                    ? { id, name: botName(ch), kind, connected: true, character: ch }
                    : emptySeat(id)
                  : s,
              ),
            });
          }}
          onCharacter={(id, ch) => {
            if (id === me) saveCharacter(ch);
            if (isHost) setCharacter(id, ch);
            else clientRef.current?.send({ t: 'character', id: ch });
          }}
          onSettings={(settings) => publishLobby({ ...lobbyRef.current, settings })}
          onStart={start}
        />
      )}
      {status === 'game' && game && (
        <GameScreen
          game={game}
          controls={[me]}
          passAndPlay={false}
          modeLabel={`Phòng ${code}`}
          onAct={onAct}
          onLeave={() => onExit()}
          onFinished={() => setStatus('over')}
        />
      )}
      {status === 'over' && game && (
        <WinScreen
          game={game}
          onAgain={isHost ? backToLobby : undefined}
          againLabel="Về phòng chờ chơi tiếp"
          onHome={() => onExit()}
        />
      )}
      {status === 'over' && !isHost && (
        <p className="mt-4 text-center font-bold text-[color:var(--tp-ash)]">
          Chờ chủ phòng mở ván mới…
        </p>
      )}
      {toast && (
        <p
          role="status"
          className="fixed inset-x-4 top-20 z-50 mx-auto max-w-sm rounded-md bg-[color:var(--tp-eggshell)] px-4 py-2.5 text-center text-sm font-bold text-[color:var(--tp-lacquer)] shadow-[0_10px_24px_-8px_rgb(0_0_0/0.7)]"
        >
          {toast}
        </p>
      )}
    </>
  );
}
