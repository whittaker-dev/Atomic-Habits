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
import type { House } from './board';
import { createGame, rollDie, setConnected, type Game, type Seat } from './engine';
import { autoPending, autoStep, botDelay, cloneGame, randomDie } from './match';
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
import { DEFAULT_RULES } from './rules';
import { GameScreen, LobbyScreen, WinScreen } from './screens';
import { DISPLAY, HOUSES } from './theme';

// Phòng online của Cờ cá ngựa. Chủ phòng ngồi nhà 0, giữ ván (engine.ts), bốc số xúc xắc cho mọi
// người, cho chiến mã tự đi sau mỗi lần đổ, và đổ thay ghế máy hoặc người đang rớt mạng; khách chỉ
// gửi "đổ" rồi nhận lại cả ván. F5 không mất phòng: chủ phòng mở lại đúng mã và đúng ván, khách tự vào lại
// đúng nhà (xem RoomSave).

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
const SAVE_KEY = 'cocangua.room';

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
    // Không lưu được thì F5 rời phòng như trước — vẫn chơi bình thường.
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

const emptySeat = (house: House): Seat => ({ house, name: '', kind: 'empty', connected: true });

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
  const saved = mode.resume?.host;
  const [status, setStatus] = useState<Status>('connecting');
  const [code, setCode] = useState(mode.kind === 'join' ? mode.code : (mode.resume?.code ?? ''));
  const [lobby, setLobby] = useState<LobbyState>(
    saved?.lobby ?? {
      seats: [
        { house: 0, name, kind: 'human', connected: true },
        emptySeat(1),
        emptySeat(2),
        emptySeat(3),
      ],
      rules: DEFAULT_RULES,
    },
  );
  const [game, setGame] = useState<Game | null>(saved?.game ?? null);
  const [you, setYou] = useState<House>(0);
  const [toast, setToast] = useState<string | null>(null);
  const [link, setLink] = useState('');

  const hostRef = useRef<HostRoom<ToClient> | null>(null);
  const clientRef = useRef<ClientRoom<ToHost> | null>(null);
  const lobbyRef = useRef(lobby);
  const gameRef = useRef(game);
  /** Chủ phòng: mã tab và kết nối của từng nhà (nhà 0 là chủ phòng, không có kết nối). */
  const tokens = useRef<(string | null)[]>(saved?.tokens ?? [clientToken(), null, null, null]);
  const conns = useRef<(string | null)[]>([null, null, null, null]);
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

  /** Nhà của một kết nối; 0 hoặc nhỏ hơn là không phải khách nào. */
  const houseOfConn = (connId: string) => conns.current.findIndex((c) => c === connId);

  /** Một nhà rời hẳn: trong phòng chờ thì trả ghế trống; giữa ván thì máy đi thay. */
  const leaveSeat = (house: House) => {
    const who = lobbyRef.current.seats[house]?.name;
    conns.current[house] = null;
    if (gameRef.current) {
      applyGame((g) => {
        setConnected(g, house, false);
        return true;
      });
      flash(`${who} đã rời — máy đánh thay.`);
    } else {
      tokens.current[house] = null;
      publishLobby({
        ...lobbyRef.current,
        seats: lobbyRef.current.seats.map((s) => (s.house === house ? emptySeat(house) : s)),
      });
      flash(`${who} đã rời phòng.`);
    }
  };

  /** Ghế trống kết nối: hết hạn mà chưa vào lại (theo mã tab) thì coi là rời. */
  const holdSeat = (house: House, token: string | null) =>
    setTimeout(() => {
      if (!hostRef.current) return;
      if (tokens.current[house] === token && !conns.current[house]) leaveSeat(house);
    }, SEAT_GRACE_MS);

  const start = () => {
    const g = createGame(
      lobbyRef.current.seats.map((s) => ({ ...s, connected: true })),
      lobbyRef.current.rules,
    );
    publishGame(g);
    setStatus('game');
  };

  const backToLobby = () => {
    publishGame(null);
    setStatus('lobby');
    publishLobby({
      ...lobbyRef.current,
      seats: lobbyRef.current.seats.map((s) =>
        s.kind === 'human' && s.house !== 0 && !conns.current[s.house] ? emptySeat(s.house) : s,
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
              const back = tokens.current.findIndex((t, h) => h > 0 && t === hello.token);
              if (back > 0) {
                // Cùng tab vào lại (F5 hoặc rớt mạng): trả đúng nhà cũ, kể cả giữa ván.
                const old = conns.current[back];
                if (old && old !== connId) room.drop(old);
                conns.current[back] = connId;
                room.send(connId, { t: 'welcome', house: back });
                if (gameRef.current) {
                  applyGame((g) => {
                    setConnected(g, back as House, true);
                    return true;
                  });
                  room.send(connId, { t: 'state', game: gameRef.current! });
                } else room.send(connId, { t: 'lobby', lobby: lobbyRef.current });
                return;
              }
              if (gameRef.current) return room.kick(connId, { t: 'reject', reason: 'started' });
              const free = lobbyRef.current.seats.find((s) => s.kind === 'empty');
              if (!free) return room.kick(connId, { t: 'reject', reason: 'full' });
              tokens.current[free.house] = hello.token;
              conns.current[free.house] = connId;
              room.send(connId, { t: 'welcome', house: free.house });
              publishLobby({
                ...lobbyRef.current,
                seats: lobbyRef.current.seats.map((s) =>
                  s.house === free.house
                    ? { house: s.house, name: hello.name, kind: 'human', connected: true }
                    : s,
                ),
              });
              flash(`${hello.name} đã vào phòng.`);
            },
            onMessage: (connId, msg) => {
              lastSeen.current.set(connId, Date.now());
              const found = houseOfConn(connId);
              if (found <= 0) return;
              const h = found as House;
              if (msg.t === 'roll') applyGame((g) => rollDie(g, h, randomDie()));
            },
            onLeave: (connId) => {
              lastSeen.current.delete(connId);
              const found = houseOfConn(connId);
              if (found <= 0) return;
              const h = found as House;
              conns.current[h] = null;
              holdSeat(h, tokens.current[h] ?? null);
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
              // Vừa F5: khách sẽ tự nối lại; ai không quay lại kịp thì máy đánh thay / trả ghế.
              for (let h = 1; h < 4; h++)
                if (tokens.current[h]) holdSeat(h as House, tokens.current[h] ?? null);
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
      if (now - lastPing < HEARTBEAT_MS) return;
      lastPing = now;
      hostRef.current?.broadcast({ t: 'ping' });
      // Im lặng quá lâu (tắt màn hình, mất sóng hẳn): đã chờ đủ lâu nên coi là rời luôn.
      conns.current.forEach((c, h) => {
        if (h === 0 || !c) return;
        const seen = lastSeen.current.get(c);
        if (seen !== undefined && now - seen > HEARTBEAT_TIMEOUT) {
          hostRef.current?.drop(c);
          lastSeen.current.delete(c);
          leaveSeat(h as House);
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

  // Chủ phòng cho chiến mã tự đi sau mỗi lần đổ, và đổ thay ghế máy / người đang rớt mạng.
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
                setYou(msg.house as House);
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

  const me: House = isHost ? 0 : you;
  const onRoll = () => {
    if (isHost) applyGame((g) => rollDie(g, 0, randomDie()));
    else clientRef.current?.send({ t: 'roll' });
  };

  return (
    <>
      {status === 'connecting' && (
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
          <span className="h-10 w-10 animate-spin border-4 border-[color:var(--cc-iron)] border-t-[color:var(--cc-ember)]" />
          <p className={`${DISPLAY} text-2xl`}>
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
          rules={lobby.rules}
          onSeatKind={(house, kind) =>
            publishLobby({
              ...lobbyRef.current,
              seats: lobbyRef.current.seats.map((s) =>
                s.house === house
                  ? kind === 'bot'
                    ? { house, name: `Máy ${HOUSES[house].name}`, kind, connected: true }
                    : emptySeat(house)
                  : s,
              ),
            })
          }
          onRules={(rules) => publishLobby({ ...lobbyRef.current, rules })}
          onStart={start}
        />
      )}
      {status === 'game' && game && (
        <GameScreen
          game={game}
          controls={[me]}
          passAndPlay={false}
          modeLabel={`Phòng ${code}`}
          onRoll={onRoll}
          onLeave={() => onExit()}
          onFinished={() => setStatus('over')}
        />
      )}
      {status === 'over' && game && (
        <WinScreen
          game={game}
          onAgain={isHost ? backToLobby : undefined}
          againLabel="Về phòng chờ đánh tiếp"
          onHome={() => onExit()}
        />
      )}
      {status === 'over' && !isHost && (
        <p className="mt-4 text-center font-bold text-[color:var(--cc-ash)]">
          Chờ chủ phòng mở ván mới…
        </p>
      )}
      {toast && (
        <p
          role="status"
          className="fixed inset-x-4 top-20 z-40 mx-auto max-w-sm bg-[color:var(--cc-bone)] px-4 py-2.5 text-center text-sm font-bold text-[color:var(--cc-night)] shadow-[0_10px_24px_-8px_rgb(0_0_0/0.7)]"
        >
          {toast}
        </p>
      )}
    </>
  );
}
