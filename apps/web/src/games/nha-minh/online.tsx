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
import { GOALS } from './catalog';
import {
  apply,
  sanitizeAction,
  type Action,
  type GameEvent,
  type House,
  type Seat,
} from './engine';
import {
  HEARTBEAT_MS,
  HEARTBEAT_TIMEOUT,
  PREFIX,
  PROTOCOL,
  ROOM_PATH,
  sanitizePresence,
  type Peers,
  type Presence,
  type ToClient,
  type ToHost,
} from './net';
import { BuildScreen, Connecting } from './screens';
import { loadHouse, rememberJoined, saveHouse, saveSession } from './store';
import { money } from './format';

// Phòng online của Nhà Mình, tối đa hai người. Chủ nhà (người tạo nhà, ghế 0) giữ căn nhà, áp luật
// và lưu nhà trên máy mình; khách (ghế 1) gửi thao tác và nhận lại cả căn nhà sau mỗi thay đổi.
// Chủ nhà xây một mình được trong lúc chờ. Vào lại sau F5 và nối lại khi chập mạng theo cách của
// Vẽ Đoán (xem ve-doan/online.tsx).

export type RoomMode =
  | { kind: 'host'; houseId: string; epoch?: number }
  | { kind: 'join'; code: string };

const RECONNECT_MS = 30_000;
const RETRY_MS = 1500;

/** Nhịp tim chạy trong Web Worker để tab nền không bị trình duyệt hãm (xem ve-doan/online.tsx). */
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

const goalText = (events: GameEvent[]) =>
  events
    .map((e) => `Xong “${GOALS.find((g) => g.id === e.id)?.title}” · quỹ chung +${money(e.reward)}`)
    .join('\n');

export function HouseRoom({
  mode,
  name,
  onExit,
}: {
  mode: RoomMode;
  name: string;
  onExit: (error?: NetError) => void;
}) {
  const isHost = mode.kind === 'host';
  const [house, setHouse] = useState<House | null>(() =>
    mode.kind === 'host' ? loadHouse(mode.houseId) : null,
  );
  const [you, setYou] = useState<Seat>(isHost ? 0 : 1);
  const [code, setCode] = useState(mode.kind === 'join' ? mode.code : (house?.code ?? ''));
  const [peers, setPeers] = useState<Peers>({
    names: house?.players ?? [name, null],
    online: [isHost, !isHost],
  });
  const [other, setOther] = useState<Presence>({ mode: 'idle' });
  const [toast, setToast] = useState<string | null>(null);
  const [link, setLink] = useState('');

  const houseRef = useRef(house);
  const hostRef = useRef<HostRoom<ToClient> | null>(null);
  const clientRef = useRef<ClientRoom<ToHost> | null>(null);
  const guest = useRef<{ connId: string | null; token: string | null; seen: number }>({
    connId: null,
    token: null,
    seen: 0,
  });
  const nonce = useRef(0);
  // Việc mình đang làm gần nhất. Chỉ gửi khi đổi, nên người vào sau (hoặc vừa nối lại) phải được gửi
  // lại một lần, không thì họ không thấy bóng mờ món mình đang cầm cho tới khi mình động tay.
  const mine = useRef<Presence>({ mode: 'idle' });
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (code) setLink(roomLink(code, ROOM_PATH));
  }, [code]);

  const flash = (text: string) => {
    clearTimeout(toastTimer.current);
    setToast(text);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  };

  // ------------------------------------------------------------------ chủ nhà

  const peersNow = (): Peers => {
    const h = houseRef.current!;
    return { names: [h.players[0], h.players[1]], online: [true, !!guest.current.connId] };
  };

  /** Chủ nhà: nhà vừa đổi thì lưu, vẽ lại và gửi cho khách. */
  const publish = (h: House) => {
    houseRef.current = h;
    saveHouse(h);
    setHouse({ ...h });
    const g = guest.current.connId;
    if (g) hostRef.current?.send(g, { t: 'house', house: h });
  };

  const hostAct = (
    seat: Seat,
    action: Action,
  ): { ok: boolean; reason?: string; events: GameEvent[] } => {
    const h = houseRef.current;
    if (!h) return { ok: false, reason: 'Chưa mở nhà.', events: [] };
    const r = apply(h, seat, action, Date.now());
    if (!r.ok) return { ok: false, reason: r.reason, events: [] };
    publish(h);
    if (r.events.length) {
      flash(goalText(r.events));
      const g = guest.current.connId;
      if (g) hostRef.current?.send(g, { t: 'events', by: seat, events: r.events });
    }
    return { ok: true, events: r.events };
  };

  useEffect(() => {
    if (mode.kind !== 'host') return;
    if (!houseRef.current) {
      onExitRef.current('notFound');
      return;
    }
    let cancelled = false;
    const h0 = houseRef.current;

    const open = (reclaim?: { code: string; epoch: number }) =>
      hostRoom<ToHost, ToClient>(
        {
          onJoin: (connId, hello) => {
            const room = hostRef.current;
            const h = houseRef.current;
            if (!room || !h) return;
            if (hello.protocol !== PROTOCOL)
              return room.kick(connId, { t: 'reject', reason: 'version' });
            const g = guest.current;
            // Ghế thứ hai đang có người khác ngồi (còn kết nối): nhà đã đủ hai người.
            if (g.connId && g.token !== hello.token)
              return room.kick(connId, { t: 'reject', reason: 'full' });
            if (g.connId && g.connId !== connId) room.drop(g.connId);
            guest.current = { connId, token: hello.token, seen: Date.now() };
            const back = h.players[1] === hello.name;
            h.players[1] = String(hello.name).slice(0, 16);
            publish(h);
            room.send(connId, { t: 'welcome', slot: 1 });
            room.send(connId, { t: 'house', house: h });
            room.send(connId, { t: 'presence', seat: 0, p: mine.current });
            const p = peersNow();
            setPeers(p);
            room.broadcast({ t: 'peers', peers: p });
            flash(back ? `${hello.name} đã quay lại.` : `${hello.name} đã vào nhà.`);
          },
          onMessage: (connId, msg) => {
            if (connId !== guest.current.connId) return;
            guest.current.seen = Date.now();
            const room = hostRef.current;
            if (msg.t === 'act') {
              const action = sanitizeAction(msg.action);
              const r = action
                ? hostAct(1, action)
                : { ok: false, reason: 'Thao tác không hợp lệ.' };
              room?.send(connId, {
                t: 'result',
                nonce: Number(msg.nonce) || 0,
                ok: r.ok,
                reason: r.reason,
              });
            } else if (msg.t === 'presence') setOther(sanitizePresence(msg.p));
          },
          onLeave: (connId) => {
            if (connId !== guest.current.connId) return;
            guest.current.connId = null;
            setOther({ mode: 'idle' });
            setPeers(peersNow());
            flash(`${houseRef.current?.players[1] ?? 'Người kia'} đã rời nhà.`);
          },
          onError: (e) =>
            e === 'broker' && flash('Mất kết nối máy môi giới — người kia tạm thời chưa vào được.'),
        },
        reclaim,
        PREFIX,
      );

    // Mở ở nhịp sau: chế độ dev của React chạy effect hai lần liền, lần bị huỷ không mở thừa phòng.
    const timer = setTimeout(() => {
      const resume =
        mode.epoch !== undefined && h0.code ? { code: h0.code, epoch: mode.epoch } : undefined;
      // Nhà đã có mã: mở lại đúng mã đó từ lượt đầu (máy môi giới nhả mã cũ sau khoảng một phút).
      const keep = !resume && h0.code ? { code: h0.code, epoch: -1 } : undefined;
      open(resume ?? keep)
        .catch((e: NetError) => {
          // Không giành lại được mã cũ: mở bằng mã mới, người kia dùng mã mới để vào.
          if (e === 'reclaim' && !cancelled) {
            flash('Mã nhà cũ đang bận, nhà mở bằng mã mới.');
            return open();
          }
          throw e;
        })
        .then((room) => {
          if (cancelled) return room.release();
          hostRef.current = room;
          const h = houseRef.current!;
          if (h.code !== room.code) {
            h.code = room.code;
            publish(h);
          }
          setCode(room.code);
          saveSession({ role: 'host', houseId: h.id, epoch: room.epoch });
        })
        .catch((e: NetError) => !cancelled && onExitRef.current(e));
    }, 0);

    let lastPing = 0;
    const stop = startTicker(() => {
      const now = Date.now();
      if (now - lastPing < HEARTBEAT_MS) return;
      lastPing = now;
      hostRef.current?.broadcast({ t: 'ping' });
      const g = guest.current;
      if (g.connId && now - g.seen > HEARTBEAT_TIMEOUT) {
        hostRef.current?.drop(g.connId);
        g.connId = null;
        setOther({ mode: 'idle' });
        setPeers(peersNow());
      }
    }, 500);
    const release = () => {
      const room = hostRef.current;
      if (room) saveSession({ role: 'host', houseId: h0.id, epoch: room.epoch });
      room?.release();
    };
    window.addEventListener('pagehide', release);
    return () => {
      clearTimeout(timer);
      cancelled = true;
      stop();
      window.removeEventListener('pagehide', release);
      // Rời nhà thật (bấm quay lại): bỏ phiên phòng. F5 không chạy tới đây.
      saveSession(null);
      hostRef.current?.close();
      hostRef.current = null;
    };
    // Chỉ mở một lần khi vào nhà; các hàm bên trong chỉ đọc ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ------------------------------------------------------------------ khách

  useEffect(() => {
    if (mode.kind !== 'join') return;
    const roomCode = mode.code;
    let cancelled = false;
    const hello = { t: 'hello' as const, name, token: clientToken(), protocol: PROTOCOL };
    let lastHeard = Date.now();
    let deadline = 0;
    let retry: ReturnType<typeof setTimeout> | undefined;

    const lost = (e: NetError) => {
      if (cancelled) return;
      clientRef.current = null;
      setPeers((p) => ({ ...p, online: [false, true] }));
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
                setYou(msg.slot === 1 ? 1 : 0);
                break;
              case 'reject':
                cancelled = true;
                onExitRef.current(msg.reason);
                break;
              case 'house':
                houseRef.current = msg.house;
                setHouse(msg.house);
                rememberJoined({
                  code: roomCode,
                  name: msg.house.name,
                  host: msg.house.players[0],
                  updated: Date.now(),
                });
                break;
              case 'peers':
                setPeers(msg.peers);
                break;
              case 'result':
                if (!msg.ok && msg.reason) flash(msg.reason);
                break;
              case 'events':
                flash(goalText(msg.events));
                break;
              case 'presence':
                setOther(sanitizePresence(msg.p));
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
          room.send({ t: 'presence', p: mine.current });
          lastHeard = Date.now();
          saveSession({ role: 'join', code: roomCode });
          if (deadline) flash('Đã nối lại.');
          deadline = 0;
        })
        .catch((e: NetError) => (deadline ? lost(e) : !cancelled && onExitRef.current(e)));

    const timer = setTimeout(connect, 0);
    const stop = startTicker(() => {
      const room = clientRef.current;
      if (!room || cancelled) return;
      if (Date.now() - lastHeard > HEARTBEAT_TIMEOUT) {
        room.close();
        lost('lost');
        return;
      }
      room.send({ t: 'ping' });
    }, HEARTBEAT_MS);
    const leave = () => clientRef.current?.close();
    window.addEventListener('pagehide', leave);
    return () => {
      clearTimeout(timer);
      clearTimeout(retry);
      cancelled = true;
      stop();
      window.removeEventListener('pagehide', leave);
      saveSession(null);
      clientRef.current?.close();
      clientRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ------------------------------------------------------------------ thao tác của mình

  /** Làm một thao tác; trả về lỗi để màn hình báo ngay (khách: lỗi tới sau qua tin 'result'). */
  const act = (action: Action): string | null => {
    if (isHost) {
      const r = hostAct(0, action);
      return r.ok ? null : (r.reason ?? 'Không làm được.');
    }
    if (!clientRef.current) return 'Đang mất kết nối với chủ nhà.';
    clientRef.current.send({ t: 'act', nonce: ++nonce.current, action });
    return null;
  };

  const presence = (p: Presence) => {
    mine.current = p;
    if (isHost) {
      const g = guest.current.connId;
      if (g) hostRef.current?.send(g, { t: 'presence', seat: 0, p });
    } else clientRef.current?.send({ t: 'presence', p });
  };

  if (!house)
    return (
      <Connecting
        text={isHost ? 'Đang mở nhà…' : `Đang vào nhà ${mode.kind === 'join' ? mode.code : ''}…`}
        onCancel={() => onExit()}
      />
    );

  return (
    <BuildScreen
      house={house}
      you={you}
      peers={peers}
      other={other}
      code={code}
      link={link}
      toast={toast}
      onAct={(a) => {
        const err = act(a);
        if (err) flash(err);
        return !err;
      }}
      onPresence={presence}
      onExit={() => onExit()}
    />
  );
}
