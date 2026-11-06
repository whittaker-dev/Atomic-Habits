'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dir } from '../bong-bong-bum/map';
import { MAX_PLAYERS } from '../bong-bong-bum/map';
import {
  clientToken,
  hostRoom,
  joinRoom,
  roomLink,
  type ClientRoom,
  type HostRoom,
  type NetError,
} from '../bong-bong-bum/net';
import { RoomQr } from '../bong-bong-bum/online';
import { Stepper } from '../bong-bong-bum/screens';
import { Btn, CARD, DISPLAY, HEADING } from '../bong-bong-bum/ui';
import { ARENAS } from './arenas';
import type { Match } from './engine';
import {
  MatchScreen,
  type HostLink,
  type MatchConfig,
  type MatchOutcome,
  type NetLink,
} from './match';
import {
  fromSnapshot,
  PREFIX,
  PROTOCOL,
  ROOM_PATH,
  toSnapshot,
  type LobbyState,
  type Queued,
  type StartInfo,
  type ToClient,
  type ToHost,
} from './net';
import { ArenaPicker, DIFFICULTIES, ResultScreen, SquadGrid, SquadImg } from './screens';
import { SQUAD, squadById } from './squad';

// Phòng online của Sơn Lãnh Địa: chủ phòng giữ sảnh và chạy trận thật, khách vào bằng link / mã / QR.
// Người rớt mạng giữa trận được bot điều khiển thay tới hết trận. Chưa giữ phòng khi chủ phòng tải lại
// trang (Bomb Arena có, game này chưa): chủ phòng tải lại là phòng đóng.

export type OnlineMode = { kind: 'host' } | { kind: 'join'; code: string };
type Status = 'connecting' | 'lobby' | 'match' | 'result';

const randomSeed = () => Math.floor(Math.random() * 2 ** 31);

/** Nhân vật đầu tiên chưa ai chọn — để hai người trong phòng không trùng màu sơn. */
function freeChar(lobby: LobbyState, wanted: string, except = -1): string {
  const taken = new Set(lobby.slots.filter((_, i) => i !== except).map((s) => s.charId));
  if (!taken.has(wanted)) return wanted;
  return SQUAD.find((c) => !taken.has(c.id))?.id ?? wanted;
}

export function OnlineRoom({
  mode,
  name,
  charId,
  onExit,
}: {
  mode: OnlineMode;
  name: string;
  charId: string;
  onExit: (error?: NetError) => void;
}) {
  const isHost = mode.kind === 'host';
  const [status, setStatus] = useState<Status>('connecting');
  const [code, setCode] = useState(mode.kind === 'join' ? mode.code : '');
  const [lobby, setLobby] = useState<LobbyState>({
    slots: [{ name, charId, host: true, connected: true }],
    arena: 'random',
    teams: false,
    difficulty: 'medium',
    bots: 0,
  });
  const [you, setYou] = useState(0);
  const [config, setConfig] = useState<MatchConfig | null>(null);
  const [outcome, setOutcome] = useState<MatchOutcome | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const hostRef = useRef<HostRoom<ToClient> | null>(null);
  const clientRef = useRef<ClientRoom<ToHost> | null>(null);
  const lobbyRef = useRef(lobby);
  const statusRef = useRef(status);
  statusRef.current = status;
  const youRef = useRef(0);
  /** Chủ phòng: kết nối của từng ghế (ghế 0 là chủ phòng, không có kết nối). */
  const seats = useRef<{ connId: string | null; token: string }[]>([
    { connId: null, token: clientToken() },
  ]);
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;

  const flash = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(null), 2500);
  };

  /** Chủ phòng đổi sảnh: cập nhật màn mình và gửi cho mọi khách. */
  const publish = (next: LobbyState) => {
    lobbyRef.current = next;
    setLobby(next);
    hostRef.current?.broadcast({ t: 'lobby', lobby: next });
  };

  // --- Đường nối giữa phòng và màn trận ---
  const hostLink = useMemo<HostLink>(
    () => ({
      role: 'host',
      queues: new Map<number, Queued[]>(),
      acks: new Map<number, number>(),
      lastDir: new Map<number, Dir | null>(),
      match: { current: null },
      broadcast: (m: Match) => {
        const acks = m.players.map((p) => hostLink.acks.get(p.id) ?? 0);
        hostRef.current?.broadcast({ t: 'snap', snap: toSnapshot(m), acks });
      },
      end: (o) =>
        hostRef.current?.broadcast({ t: 'end', standings: o.standings, winnerTeam: o.winnerTeam }),
    }),
    [],
  );
  const snaps = useRef<{ prev: Match | null; last: Match | null; lastAt: number; ack: number }>({
    prev: null,
    last: null,
    lastAt: 0,
    ack: 0,
  });
  const clientLink = useMemo<NetLink>(
    () => ({
      role: 'client',
      you,
      snaps,
      sendInput: (seq, input) => clientRef.current?.send({ t: 'input', seq, input }),
    }),
    [you],
  );

  // --- Chủ phòng: mở phòng ---
  useEffect(() => {
    if (!isHost) return;
    let cancelled = false;
    hostRoom<ToHost, ToClient>(
      {
        onJoin: (connId, hello) => {
          const room = hostRef.current;
          if (!room) return;
          if (hello.protocol !== PROTOCOL)
            return room.kick(connId, { t: 'reject', reason: 'version' });
          const cur = lobbyRef.current;
          // Cùng tab vào lại (rớt mạng ở sảnh): trả lại đúng ghế cũ.
          const back = seats.current.findIndex((s) => s.token === hello.token);
          if (back > 0) {
            const old = seats.current[back]!.connId;
            if (old && old !== connId) room.drop(old);
            seats.current[back]!.connId = connId;
            room.send(connId, { t: 'welcome', slot: back });
            publish({
              ...cur,
              slots: cur.slots.map((s, i) => (i === back ? { ...s, connected: true } : s)),
            });
            return;
          }
          if (statusRef.current !== 'lobby')
            return room.kick(connId, { t: 'reject', reason: 'started' });
          if (cur.slots.length >= MAX_PLAYERS)
            return room.kick(connId, { t: 'reject', reason: 'full' });
          const slot = cur.slots.length;
          seats.current.push({ connId, token: hello.token });
          const slots = [
            ...cur.slots,
            { name: hello.name, charId: freeChar(cur, hello.charId), host: false, connected: true },
          ];
          room.send(connId, { t: 'welcome', slot });
          publish({ ...cur, slots, bots: Math.min(cur.bots, MAX_PLAYERS - slots.length) });
          flash(`${hello.name} đã vào phòng.`);
        },
        onMessage: (connId, msg) => {
          const i = seats.current.findIndex((s) => s.connId === connId);
          if (i <= 0) return;
          if (msg.t === 'input') {
            const q = hostLink.queues.get(i) ?? [];
            q.push({ seq: msg.seq, input: msg.input });
            hostLink.queues.set(i, q);
          } else if (msg.t === 'pick' && statusRef.current === 'lobby') {
            const cur = lobbyRef.current;
            const taken = cur.slots.some((s, k) => k !== i && s.charId === msg.charId);
            if (taken || !SQUAD.some((c) => c.id === msg.charId)) return;
            publish({
              ...cur,
              slots: cur.slots.map((s, k) => (k === i ? { ...s, charId: msg.charId } : s)),
            });
          }
        },
        onLeave: (connId) => {
          const i = seats.current.findIndex((s) => s.connId === connId);
          if (i <= 0) return;
          const cur = lobbyRef.current;
          const who = cur.slots[i]?.name;
          if (statusRef.current === 'lobby') {
            seats.current.splice(i, 1);
            publish({ ...cur, slots: cur.slots.filter((_, k) => k !== i) });
          } else {
            // Giữa trận: bot chơi thay tới hết trận để trận của mọi người không bị lệch.
            seats.current[i]!.connId = null;
            const p = hostLink.match.current?.players[i];
            if (p) p.bot = true;
            publish({
              ...cur,
              slots: cur.slots.map((s, k) => (k === i ? { ...s, connected: false } : s)),
            });
          }
          flash(`${who} đã rời phòng.`);
        },
        onError: (e) =>
          flash(
            e === 'broker' ? 'Mất kết nối máy môi giới — người mới tạm thời chưa vào được.' : e,
          ),
      },
      undefined,
      PREFIX,
    )
      .then((room) => {
        if (cancelled) return room.close();
        hostRef.current = room;
        setCode(room.code);
        setStatus('lobby');
      })
      .catch((e: NetError) => !cancelled && onExitRef.current(e));
    const release = () => hostRef.current?.release();
    window.addEventListener('pagehide', release);
    return () => {
      cancelled = true;
      window.removeEventListener('pagehide', release);
      hostRef.current?.close();
      hostRef.current = null;
    };
    // publish / flash chỉ đọc ref nên không cần nằm trong danh sách phụ thuộc.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, hostLink]);

  // --- Khách: vào phòng ---
  useEffect(() => {
    if (mode.kind !== 'join') return;
    let cancelled = false;
    const hello = { t: 'hello' as const, name, charId, token: clientToken(), protocol: PROTOCOL };
    joinRoom<ToHost, ToClient>(
      mode.code,
      hello,
      {
        onMessage: (msg) => {
          switch (msg.t) {
            case 'welcome':
              youRef.current = msg.slot;
              setYou(msg.slot);
              setStatus((s) => (s === 'connecting' ? 'lobby' : s));
              break;
            case 'reject':
              onExitRef.current(msg.reason);
              break;
            case 'lobby':
              lobbyRef.current = msg.lobby;
              setLobby(msg.lobby);
              break;
            case 'start':
              youRef.current = msg.you;
              setYou(msg.you);
              snaps.current = { prev: null, last: null, lastAt: 0, ack: 0 };
              setConfig(configOf(msg.info));
              setStatus('match');
              break;
            case 'snap': {
              const box = snaps.current;
              snaps.current = {
                prev: box.last,
                last: fromSnapshot(msg.snap),
                lastAt: performance.now(),
                ack: msg.acks[youRef.current] ?? 0,
              };
              break;
            }
            case 'end':
              setOutcome({
                standings: msg.standings,
                humanIds: [youRef.current],
                winnerTeam: msg.winnerTeam,
              });
              setStatus('result');
              break;
            case 'closed':
              break;
          }
        },
        onClose: (e) => !cancelled && onExitRef.current(e),
      },
      PREFIX,
    )
      .then((room) => {
        if (cancelled) return room.close();
        clientRef.current = room;
      })
      .catch((e: NetError) => !cancelled && onExitRef.current(e));
    return () => {
      cancelled = true;
      clientRef.current?.close();
      clientRef.current = null;
    };
    // Chỉ nối một lần khi mở phòng; tên và nhân vật đổi sau đó đi qua tin 'pick'.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const configOf = (info: StartInfo): MatchConfig => ({
    arena: info.arena,
    teams: info.teams,
    difficulty: lobbyRef.current.difficulty,
    humans: [],
    bots: 0,
    seed: randomSeed(),
    roster: info.players,
  });

  /** Chủ phòng bắt đầu trận: chốt ai ngồi đâu, bot lấy các nhân vật còn trống. */
  const start = () => {
    const cur = lobbyRef.current;
    const taken = new Set(cur.slots.map((s) => s.charId));
    const free = SQUAD.filter((c) => !taken.has(c.id)).sort(() => Math.random() - 0.5);
    const info: StartInfo = {
      arena:
        cur.arena === 'random' ? ARENAS[Math.floor(Math.random() * ARENAS.length)]!.id : cur.arena,
      teams: cur.teams,
      players: [
        ...cur.slots.map((s) => ({ name: s.name, charId: s.charId, bot: !s.connected })),
        ...free.slice(0, cur.bots).map((c) => ({ name: `Bot ${c.name}`, charId: c.id, bot: true })),
      ],
    };
    hostLink.queues.clear();
    hostLink.acks.clear();
    hostLink.lastDir.clear();
    seats.current.forEach(
      (seat, i) => seat.connId && hostRef.current?.send(seat.connId, { t: 'start', info, you: i }),
    );
    setConfig(configOf(info));
    setStatus('match');
  };

  /** Hết trận hoặc xem kết quả xong: về sảnh, bỏ ghế của người đã rời. */
  const backToLobby = () => {
    if (isHost) {
      const cur = lobbyRef.current;
      const keep = cur.slots.map((s, i) => (s.connected || i === 0 ? i : -1)).filter((i) => i >= 0);
      seats.current = keep.map((i) => seats.current[i]!);
      publish({ ...cur, slots: keep.map((i) => cur.slots[i]!) });
    }
    setStatus('lobby');
  };

  const leave = () => {
    hostRef.current?.close();
    clientRef.current?.close();
    onExit();
  };

  if (status === 'connecting')
    return (
      <div className={`${CARD} mx-auto max-w-md p-6 text-center`}>
        <p className={`${DISPLAY} text-3xl`}>
          {isHost ? 'Đang mở phòng…' : `Đang vào phòng ${code}…`}
        </p>
        <p className="mt-2 text-sm font-bold text-slate-600">Thường mất vài giây.</p>
        <Btn tone="cream" className="mt-4" onClick={leave}>
          Huỷ
        </Btn>
      </div>
    );

  if (status === 'match' && config)
    return (
      <MatchScreen
        key={config.seed}
        config={config}
        net={isHost ? hostLink : clientLink}
        onEnd={(o) => {
          // Khách nhận kết quả qua tin 'end' của chủ phòng, không tự kết thúc.
          if (!isHost) return;
          setOutcome(o);
          setStatus('result');
        }}
        onQuit={leave}
      />
    );

  if (status === 'result' && outcome && config)
    return (
      <ResultScreen
        outcome={outcome}
        teams={config.teams}
        onAgain={isHost ? start : undefined}
        onSetup={backToLobby}
        setupLabel="Về phòng"
      />
    );

  return (
    <Lobby
      code={code}
      lobby={lobby}
      you={you}
      isHost={isHost}
      toast={toast}
      onFlash={flash}
      onPick={(id) => {
        if (isHost)
          publish({
            ...lobby,
            slots: lobby.slots.map((s, i) =>
              i === 0 ? { ...s, charId: freeChar(lobby, id, 0) } : s,
            ),
          });
        else clientRef.current?.send({ t: 'pick', charId: id });
      }}
      onSettings={(patch) => publish({ ...lobbyRef.current, ...patch })}
      onStart={start}
      onLeave={leave}
    />
  );
}

function Lobby({
  code,
  lobby,
  you,
  isHost,
  toast,
  onFlash,
  onPick,
  onSettings,
  onStart,
  onLeave,
}: {
  code: string;
  lobby: LobbyState;
  you: number;
  isHost: boolean;
  toast: string | null;
  onFlash: (t: string) => void;
  onPick: (id: string) => void;
  onSettings: (patch: Partial<LobbyState>) => void;
  onStart: () => void;
  onLeave: () => void;
}) {
  const link = code ? roomLink(code, ROOM_PATH) : '';
  const me = lobby.slots[you];
  const humans = lobby.slots.length;
  const canStart = humans + lobby.bots >= 2;
  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      onFlash(`Đã sao chép ${what}.`);
    } catch {
      onFlash('Không sao chép được — hãy chọn và sao chép bằng tay.');
    }
  };
  const share = async () => {
    try {
      await navigator.share({
        title: 'Sơn Lãnh Địa',
        text: `Vào phòng ${code} chơi Sơn Lãnh Địa với mình!`,
        url: link,
      });
    } catch {
      // Người dùng huỷ chia sẻ: không cần báo gì.
    }
  };
  const takenByOthers = lobby.slots.filter((_, i) => i !== you).map((s) => s.charId);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div className={`${CARD} flex flex-wrap items-center gap-3 p-4`}>
        {link && <RoomQr link={link} />}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-600">
            Mã phòng — bạn bè quét QR, nhập mã này hoặc mở link
          </p>
          <p
            className={`${DISPLAY} select-all whitespace-nowrap text-4xl leading-none tracking-[0.15em] sm:text-5xl`}
          >
            {code}
          </p>
          <p className="mt-1 truncate text-xs font-bold text-slate-500">{link}</p>
        </div>
        <div className="flex w-full flex-wrap gap-2 lg:w-auto">
          <Btn tone="sky" onClick={() => copy(link, 'link')}>
            Sao chép link
          </Btn>
          <Btn tone="cream" onClick={() => copy(code, 'mã phòng')}>
            Sao chép mã
          </Btn>
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <Btn tone="coral" onClick={share}>
              Chia sẻ
            </Btn>
          )}
        </div>
      </div>

      <section
        className="grid grid-cols-3 gap-2 lg:grid-cols-6"
        aria-label="Người chơi trong phòng"
      >
        {Array.from({ length: MAX_PLAYERS }, (_, i) => {
          const s = lobby.slots[i];
          const bot = !s && i < humans + lobby.bots;
          const def = s ? squadById(s.charId) : null;
          return (
            <div
              key={i}
              className={`${CARD} flex flex-col items-center p-2 ${!s ? 'border-dashed bg-white/60 shadow-none' : ''}`}
              style={def ? { borderTopColor: def.color, borderTopWidth: 8 } : undefined}
            >
              {s ? (
                <>
                  <SquadImg id={s.charId} className={`h-20 ${s.connected ? '' : 'opacity-40'}`} />
                  <p className="w-full truncate text-center text-sm font-extrabold">
                    {s.name}
                    {i === you && <span className="text-slate-500"> (bạn)</span>}
                  </p>
                  <p className="text-[11px] font-bold text-slate-600">
                    {s.host ? 'Chủ phòng' : s.connected ? def?.name : 'Mất kết nối'}
                  </p>
                </>
              ) : (
                <p className="flex h-full min-h-24 items-center text-center text-xs font-bold text-slate-500">
                  {bot ? 'Bot' : 'Ghế trống'}
                </p>
              )}
            </div>
          );
        })}
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <section className={`${CARD} p-4`}>
          <h3 className={`${HEADING} text-2xl`}>Nhân vật của bạn</h3>
          <div className="mt-3">
            <SquadGrid value={me?.charId ?? ''} onPick={onPick} taken={takenByOthers} />
          </div>
          {takenByOthers.length > 0 && (
            <p className="mt-2 text-xs font-bold text-slate-600">
              Nhân vật người khác đã chọn thì không chọn trùng được (mỗi người một màu sơn).
            </p>
          )}
        </section>

        <section className={`${CARD} flex flex-col gap-4 p-4`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className={`${HEADING} text-xl`}>Số bot</h3>
              <p className="text-xs font-bold text-slate-600">
                {humans + lobby.bots}/{MAX_PLAYERS} người trong trận
              </p>
            </div>
            {isHost ? (
              <Stepper
                value={lobby.bots}
                min={0}
                max={MAX_PLAYERS - humans}
                onChange={(bots) => onSettings({ bots })}
              />
            ) : (
              <span className={`${DISPLAY} text-3xl`}>{lobby.bots}</span>
            )}
          </div>
          <div>
            <h3 className={`${HEADING} text-xl`}>Độ khó bot</h3>
            <div className="mt-1 flex gap-2">
              {DIFFICULTIES.map((d) => (
                <Btn
                  key={d.id}
                  tone={lobby.difficulty === d.id ? 'sun' : 'cream'}
                  className="flex-1 py-1"
                  pressed={lobby.difficulty === d.id}
                  disabled={!isHost}
                  onClick={() => onSettings({ difficulty: d.id })}
                >
                  {d.label}
                </Btn>
              ))}
            </div>
          </div>
          <div>
            <h3 className={`${HEADING} text-xl`}>Luật</h3>
            <div className="mt-1 flex gap-2">
              <Btn
                tone={!lobby.teams ? 'sun' : 'cream'}
                className="flex-1 py-1 text-sm"
                pressed={!lobby.teams}
                disabled={!isHost}
                onClick={() => onSettings({ teams: false })}
              >
                Mỗi người một màu
              </Btn>
              <Btn
                tone={lobby.teams ? 'sun' : 'cream'}
                className="flex-1 py-1 text-sm"
                pressed={lobby.teams}
                disabled={!isHost}
                onClick={() => onSettings({ teams: true })}
              >
                Hai đội
              </Btn>
            </div>
          </div>
        </section>
      </div>

      <section className={`${CARD} p-4`}>
        <h3 className={`${HEADING} text-xl`}>Sân</h3>
        <ArenaPicker value={lobby.arena} onPick={(arena) => isHost && onSettings({ arena })} />
      </section>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Btn tone="cream" onClick={onLeave}>
          {isHost ? 'Đóng phòng' : 'Rời phòng'}
        </Btn>
        {isHost ? (
          <Btn tone="sun" className="px-10 py-3 text-2xl" disabled={!canStart} onClick={onStart}>
            {canStart ? 'Bắt đầu!' : 'Chờ thêm người hoặc thêm bot'}
          </Btn>
        ) : (
          <p className={`${CARD} px-4 py-2 font-extrabold`}>Chờ chủ phòng bắt đầu…</p>
        )}
      </div>
      {toast && (
        <div
          className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full border-[3px] border-[color:var(--bb-ink)] bg-white px-4 py-2 font-extrabold shadow-[0_4px_0_var(--bb-ink)]"
          role="status"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
