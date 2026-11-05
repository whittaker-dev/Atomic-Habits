'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Difficulty } from './bot';
import { characterById } from './characters';
import type { Input, Match } from './engine';
import type { Dir } from './map';
import { recordMatch } from './leaderboard';
import { MAX_PLAYERS, THEMES, type ThemeId } from './map';
import {
  botRoster,
  MatchScreen,
  type ClientLink,
  type HostLink,
  type MatchConfig,
  type MatchOutcome,
} from './match';
import { cleanName } from './name';
import {
  clientToken,
  fromSnapshot,
  hostRoom,
  joinRoom,
  PROTOCOL,
  roomLink,
  toSnapshot,
  type ClientRoom,
  type HostRoom,
  type LobbyState,
  type NetError,
  type StartInfo,
  type ToClient,
} from './net';
import { PALETTE, SEAT_COLORS } from './palette';
import { CharacterGrid, MapPicker, ResultScreen, Stepper, type ResultData } from './screens';
import { Btn, CARD, CharCanvas, DISPLAY, HEADING } from './ui';

// Phòng chơi qua mạng: sảnh chờ, rồi trận đấu. Chủ phòng giữ trạng thái chuẩn; khách chỉ gửi phím.

export type OnlineMode = { kind: 'host'; resume?: HostSave } | { kind: 'join'; code: string };

/**
 * Phòng của chủ phòng lưu trong sessionStorage: còn nguyên khi bấm F5 (tải lại trong cùng tab),
 * tự mất khi đóng tab — đúng với "F5 vẫn ở trong phòng, tắt tab là rời phòng".
 */
export type HostSave = {
  code: string;
  epoch: number;
  lobby: LobbyState;
  tokens: string[];
  banned: string[];
  status: 'lobby' | 'match';
  start: StartInfo | null;
  config: MatchConfig | null;
  match: Match | null;
};
const HOST_SAVE_KEY = 'bongbongbum.hostRoom';

export function loadHostSave(): HostSave | null {
  try {
    const raw = sessionStorage.getItem(HOST_SAVE_KEY);
    return raw ? (JSON.parse(raw) as HostSave) : null;
  } catch {
    return null;
  }
}

function writeHostSave(save: HostSave | null) {
  try {
    if (save) sessionStorage.setItem(HOST_SAVE_KEY, JSON.stringify(save));
    else sessionStorage.removeItem(HOST_SAVE_KEY);
  } catch {
    // Không lưu được thì F5 sẽ đóng phòng như trước — vẫn chơi được bình thường.
  }
}
type Status = 'connecting' | 'lobby' | 'match' | 'result';

const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: 'easy', label: 'Dễ' },
  { id: 'medium', label: 'Vừa' },
  { id: 'hard', label: 'Khó' },
];

/** Khách rớt khỏi sảnh (vd: bấm F5) được giữ chỗ chừng này trước khi bị xoá khỏi phòng. */
const LOBBY_GRACE_MS = 15000;
/** Khách mất kết nối với chủ phòng: thử nối lại trong chừng này (đủ cho chủ phòng tải lại trang). */
const RECONNECT_MS = 40000;
const RETRY_MS = 1500;
/** Khách không nghe gì từ chủ phòng chừng này (chủ phòng gửi nhịp tim mỗi giây) thì coi như mất kết nối. */
const HEARTBEAT_TIMEOUT = 4000;

/** Thông tin chỉ chủ phòng biết về từng chỗ: kết nối nào, mã để nhận lại người rớt mạng. */
type SeatPrivate = { connId: string | null; token: string };

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
  const resume = mode.kind === 'host' ? mode.resume : undefined;
  const [status, setStatus] = useState<Status>('connecting');
  const [code, setCode] = useState(mode.kind === 'join' ? mode.code : (resume?.code ?? ''));
  const [reconnecting, setReconnecting] = useState(false);
  const [lobby, setLobby] = useState<LobbyState>(() =>
    resume
      ? // Sau khi chủ phòng tải lại, mọi khách đều đang mất kết nối cho tới khi họ tự nối lại.
        { ...resume.lobby, slots: resume.lobby.slots.map((s) => ({ ...s, connected: s.host })) }
      : {
          slots: [{ name, charId, ready: true, host: true, connected: true }],
          theme: 'random',
          teams: false,
          difficulty: 'medium',
          bots: 2,
        },
  );
  const [you, setYou] = useState(0);
  const [config, setConfig] = useState<MatchConfig | null>(() => {
    if (!resume || resume.status !== 'match' || !resume.config || !resume.match) return null;
    // Khách chưa nối lại thì bot tạm chơi thay; họ vào lại là lấy lại quyền điều khiển.
    const m = resume.match;
    m.players.forEach((p) => {
      if (p.id > 0 && p.id < resume.lobby.slots.length && p.cloneOf === null) p.bot = true;
    });
    return { ...resume.config, resume: m };
  });
  const [result, setResult] = useState<ResultData | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const hostRef = useRef<HostRoom | null>(null);
  const clientRef = useRef<ClientRoom | null>(null);
  const seats = useRef<SeatPrivate[]>(
    resume
      ? resume.tokens.slice(0, resume.lobby.slots.length).map((token) => ({ connId: null, token }))
      : [{ connId: null, token: clientToken() }],
  );
  /** Mã tab của người đã bị mời ra: không cho vào lại phòng này. */
  const banned = useRef(new Set<string>(resume?.banned ?? []));
  const configRef = useRef(config);
  configRef.current = config;
  /** Ô đang chờ bấm lần hai để xác nhận mời ra. */
  const [kickArm, setKickArm] = useState<number | null>(null);
  const lobbyRef = useRef(lobby);
  lobbyRef.current = lobby;
  const statusRef = useRef(status);
  statusRef.current = status;
  const startRef = useRef<StartInfo | null>(resume?.start ?? null);
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;
  const youRef = useRef(you);
  youRef.current = you;

  // Kênh nối với màn trận (xem HostLink/ClientLink trong match.tsx).
  const hostLink = useMemo<HostLink>(() => {
    const hostLinkAcks = new Map<number, number>();
    return {
      role: 'host',
      queues: new Map<number, { seq: number; input: Input }[]>(),
      acks: hostLinkAcks,
      lastDir: new Map<number, Dir | null>(),
      match: { current: null as Match | null },
      broadcast: (m) => {
        const acks = m.players.map((p) => hostLinkAcks.get(p.id) ?? 0);
        hostRef.current?.broadcast({ t: 'snap', snap: toSnapshot(m), acks });
      },
      end: (o) =>
        hostRef.current?.broadcast({ t: 'end', standings: o.standings, winnerTeam: o.winnerTeam }),
    };
  }, []);
  /** Người rời/vào lại: xoá phím cũ để không dùng nhầm khi nối lại. Số thứ tự phím của tab mới bắt đầu lại từ 1. */
  const resetInputs = (id: number) => {
    hostLink.queues.delete(id);
    hostLink.acks.delete(id);
    hostLink.lastDir.delete(id);
  };
  const snaps = useRef<ClientLink['snaps']['current']>({
    prev: null,
    last: null,
    lastAt: 0,
    ack: 0,
  });
  const clientLink = useMemo<ClientLink>(
    () => ({
      role: 'client',
      you,
      snaps,
      sendInput: (seq, input) => clientRef.current?.send({ t: 'input', seq, input }),
    }),
    [you],
  );

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice((n) => (n === msg ? null : n)), 2500);
  };

  // --- Chủ phòng ---
  const persist = () => {
    if (!isHost || !hostRef.current) return;
    const inMatch = statusRef.current === 'match';
    writeHostSave({
      code: hostRef.current.code,
      epoch: hostRef.current.epoch,
      lobby: lobbyRef.current,
      tokens: seats.current.map((s) => s.token),
      banned: [...banned.current],
      status: inMatch ? 'match' : 'lobby',
      start: startRef.current,
      config: inMatch && configRef.current ? { ...configRef.current, resume: undefined } : null,
      match: inMatch ? hostLink.match.current : null,
    });
  };
  const publish = (next: LobbyState) => {
    // Chỗ trống tối đa = 6 − số người thật; bớt bot nếu có người mới vào.
    const fixed = { ...next, bots: Math.min(next.bots, MAX_PLAYERS - next.slots.length) };
    setLobby(fixed);
    lobbyRef.current = fixed;
    hostRef.current?.broadcast({ t: 'lobby', lobby: fixed });
    persist();
  };
  /** Khách rời sảnh: giữ chỗ một lúc cho người bấm F5 kịp vào lại, quá hạn mới xoá. */
  const scheduleLobbyRemoval = (token: string, after = LOBBY_GRACE_MS) => {
    setTimeout(() => {
      const k = seats.current.findIndex((s) => s.token === token);
      if (k <= 0 || seats.current[k]!.connId || statusRef.current === 'match') return;
      seats.current.splice(k, 1);
      publish({ ...lobbyRef.current, slots: lobbyRef.current.slots.filter((_, n) => n !== k) });
    }, after);
  };
  const seatOfConn = (connId: string) => seats.current.findIndex((s) => s.connId === connId);

  useEffect(() => {
    let cancelled = false;
    let watchdog: ReturnType<typeof setInterval> | undefined;
    if (mode.kind === 'host') {
      hostRoom(
        {
          onJoin: (connId, hello) => {
            const room = hostRef.current;
            if (!room) return;
            if (hello.protocol !== PROTOCOL)
              return room.kick(connId, { t: 'reject', reason: 'version' });
            if (banned.current.has(hello.token))
              return room.kick(connId, { t: 'reject', reason: 'kicked' });
            // Một tab chỉ một chỗ: tab đã có chỗ (rớt mạng, F5, hay lỡ nối hai lần) thì dùng lại chỗ đó,
            // kết nối mới thay kết nối cũ.
            let back = seats.current.findIndex((s, i) => i > 0 && s.token === hello.token);
            // Chốt an toàn: có mã tab mà không còn ô tương ứng thì xoá mã đó và cho vào như người mới.
            if (back >= lobbyRef.current.slots.length) {
              seats.current.splice(back, 1);
              back = -1;
            }
            const stale = back >= 0 ? seats.current[back]!.connId : null;
            if (stale && stale !== connId) room.drop(stale);
            if (statusRef.current === 'match') {
              // Người rớt mạng vào lại giữa trận: lấy lại quyền điều khiển từ bot.
              const m = hostLink.match.current;
              if (back < 0 || !m || !startRef.current)
                return room.kick(connId, { t: 'reject', reason: 'started' });
              seats.current[back]!.connId = connId;
              resetInputs(back);
              if (m.players[back]) m.players[back]!.bot = false;
              publish({
                ...lobbyRef.current,
                slots: lobbyRef.current.slots.map((s, i) =>
                  i === back ? { ...s, connected: true } : s,
                ),
              });
              room.send(connId, { t: 'welcome', slot: back });
              room.send(connId, { t: 'start', info: startRef.current, you: back });
              return;
            }
            if (back >= 0) {
              seats.current[back]!.connId = connId;
              publish({
                ...lobbyRef.current,
                slots: lobbyRef.current.slots.map((s, i) =>
                  i === back ? { ...s, connected: true } : s,
                ),
              });
              room.send(connId, { t: 'welcome', slot: back });
              return;
            }
            if (lobbyRef.current.slots.length >= MAX_PLAYERS)
              return room.kick(connId, { t: 'reject', reason: 'full' });
            seats.current.push({ connId, token: hello.token });
            const slot = lobbyRef.current.slots.length;
            room.send(connId, { t: 'welcome', slot });
            publish({
              ...lobbyRef.current,
              slots: [
                ...lobbyRef.current.slots,
                {
                  name: cleanName(hello.name).trim() || 'Khách',
                  charId: characterById(hello.charId).id,
                  ready: false,
                  host: false,
                  connected: true,
                },
              ],
            });
          },
          onMessage: (connId, msg) => {
            const i = seatOfConn(connId);
            if (i < 0) return;
            if (msg.t === 'input') {
              const q = hostLink.queues.get(i) ?? [];
              q.push({ seq: msg.seq, input: msg.input });
              hostLink.queues.set(i, q);
            } else if (msg.t === 'pick' && statusRef.current !== 'match')
              publish({
                ...lobbyRef.current,
                slots: lobbyRef.current.slots.map((s, k) =>
                  k === i ? { ...s, charId: characterById(msg.charId).id } : s,
                ),
              });
            else if (msg.t === 'ready' && statusRef.current !== 'match')
              publish({
                ...lobbyRef.current,
                slots: lobbyRef.current.slots.map((s, k) =>
                  k === i ? { ...s, ready: msg.ready } : s,
                ),
              });
          },
          onLeave: (connId) => {
            const i = seatOfConn(connId);
            if (i < 0) return;
            seats.current[i]!.connId = null;
            if (statusRef.current === 'match') {
              // Rớt mạng giữa trận: bot chơi thay, giữ chỗ để người đó vào lại.
              const p = hostLink.match.current?.players[i];
              if (p) p.bot = true;
              resetInputs(i);
              publish({
                ...lobbyRef.current,
                slots: lobbyRef.current.slots.map((s, k) =>
                  k === i ? { ...s, connected: false } : s,
                ),
              });
              flash(`${lobbyRef.current.slots[i]?.name} mất kết nối — bot chơi thay.`);
            } else {
              // Ở sảnh: giữ chỗ một lúc cho người bấm F5 kịp vào lại (giữ nhân vật, trạng thái sẵn sàng).
              publish({
                ...lobbyRef.current,
                slots: lobbyRef.current.slots.map((s, k) =>
                  k === i ? { ...s, connected: false } : s,
                ),
              });
              scheduleLobbyRemoval(seats.current[i]!.token);
            }
          },
          onError: () => flash('Mất kết nối tới máy môi giới — người mới tạm thời không vào được.'),
        },
        resume ? { code: resume.code, epoch: resume.epoch ?? 0 } : undefined,
      )
        .then((room) => {
          // Lần mở bị huỷ (vd: React chạy khởi tạo hai lần ở chế độ dev): nhả ngay, đừng để khách dò trúng.
          if (cancelled) return room.release();
          hostRef.current = room;
          setCode(room.code);
          if (resume && configRef.current) {
            setStatus('match');
            flash('Đã mở lại phòng — chờ mọi người nối lại.');
          } else {
            setStatus('lobby');
            // Khách chưa nối lại sau khi chủ phòng tải trang: quá hạn thì xoá như khi rời sảnh.
            seats.current.slice(1).forEach((s) => scheduleLobbyRemoval(s.token, RECONNECT_MS));
          }
          persist();
        })
        .catch((e: NetError) => {
          if (cancelled) return;
          writeHostSave(null);
          onExitRef.current(e);
        });
    } else {
      const hello = { t: 'hello' as const, name, charId, token: clientToken(), protocol: PROTOCOL };
      const roomCode = mode.code;
      /** Hạn chót nối lại; 0 là đang không nối lại. */
      let deadline = 0;
      let lastHeard = 0;
      const onMessage = (msg: ToClient) => {
        lastHeard = performance.now();
        switch (msg.t) {
          case 'welcome':
            setYou(msg.slot);
            break;
          case 'reject':
            onExitRef.current(msg.reason);
            break;
          case 'lobby':
            setLobby(msg.lobby);
            if (statusRef.current === 'connecting') setStatus('lobby');
            break;
          case 'start':
            snaps.current = { prev: null, last: null, lastAt: 0, ack: 0 };
            setYou(msg.you);
            setConfig({
              theme: msg.info.theme,
              teams: msg.info.teams,
              seed: msg.info.seed,
              difficulty: 'medium',
              humans: [],
              bots: 0,
              roster: msg.info.players,
            });
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
            setResult({
              standings: msg.standings,
              humanIds: [youRef.current],
              winnerTeam: msg.winnerTeam,
            });
            break;
          case 'closed':
          case 'ping':
            break;
        }
      };
      const reconnect = () => {
        if (!deadline) deadline = performance.now() + RECONNECT_MS;
        setReconnecting(true);
        setTimeout(attempt, RETRY_MS);
      };
      const attempt = () => {
        if (cancelled) return;
        joinRoom(roomCode, hello, {
          onMessage,
          onClose: (e) => {
            clientRef.current = null;
            if (cancelled) return;
            // Rớt kết nối (thường do chủ phòng bấm F5): tự nối lại thay vì thoát ngay.
            if (e === 'lost') reconnect();
            else onExitRef.current(e);
          },
        })
          .then((room) => {
            if (cancelled) return room.close();
            clientRef.current = room;
            lastHeard = performance.now();
            deadline = 0;
            setReconnecting(false);
          })
          .catch((e: NetError) => {
            if (cancelled) return;
            if (deadline && performance.now() < deadline && (e === 'notFound' || e === 'broker'))
              setTimeout(attempt, RETRY_MS);
            else onExitRef.current(deadline ? 'hostLeft' : e);
          });
      };
      attempt();
      // Chủ phòng biến mất (F5, tắt máy): trình duyệt có thể mất 10–30 giây mới báo kết nối chết.
      // Không nghe nhịp tim quá HEARTBEAT_TIMEOUT thì tự bỏ kết nối đó và đi tìm lại phòng.
      watchdog = setInterval(() => {
        const room = clientRef.current;
        if (!room || performance.now() - lastHeard < HEARTBEAT_TIMEOUT) return;
        clientRef.current = null;
        room.close();
        reconnect();
      }, 1000);
    }
    return () => {
      cancelled = true;
      clearInterval(watchdog);
      hostRef.current?.close();
      clientRef.current?.close();
      hostRef.current = null;
      clientRef.current = null;
    };
    // Chỉ chạy một lần cho mỗi phòng: tên và nhân vật ban đầu gửi trong lời chào.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Chủ phòng: lưu trận mỗi giây và ngay trước khi trang đóng/tải lại, để F5 chơi tiếp được.
  useEffect(() => {
    if (!isHost) return;
    const id = setInterval(() => {
      persist();
      hostRef.current?.broadcast({ t: 'ping' });
    }, 1000);
    const onHide = () => {
      persist();
      hostRef.current?.release();
    };
    window.addEventListener('pagehide', onHide);
    return () => {
      clearInterval(id);
      window.removeEventListener('pagehide', onHide);
    };
    // persist chỉ đọc ref nên không cần chạy lại.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost]);

  // Khách nhận kết quả: ghi bảng xếp hạng của máy này rồi sang màn kết quả (sau khi màn trận xong phần ăn mừng).
  useEffect(() => {
    if (!result || isHost || status !== 'match') return;
    const id = setTimeout(() => {
      const mine = result.standings.find((s) => s.player.id === you);
      if (mine)
        recordMatch([
          { name: mine.player.name, won: mine.won, score: mine.score, kos: mine.player.kos },
        ]);
      setStatus('result');
    }, 2200);
    return () => clearTimeout(id);
  }, [result, isHost, status, you]);

  const start = () => {
    const l = lobbyRef.current;
    const theme: ThemeId =
      l.theme === 'random' ? THEMES[Math.floor(Math.random() * THEMES.length)]!.id : l.theme;
    const roster = botRoster(
      l.slots.map((s) => ({ name: s.name, charId: s.charId })),
      l.bots,
    );
    const info: StartInfo = {
      seed: Math.floor(Math.random() * 2 ** 31),
      theme,
      teams: l.teams,
      players: roster,
    };
    startRef.current = info;
    hostLink.queues.clear();
    hostLink.acks.clear();
    hostLink.lastDir.clear();
    seats.current.forEach(
      (s, i) => s.connId && hostRef.current?.send(s.connId, { t: 'start', info, you: i }),
    );
    setConfig({
      theme,
      teams: l.teams,
      seed: info.seed,
      difficulty: l.difficulty,
      humans: [],
      bots: 0,
      roster,
    });
    setResult(null);
    setStatus('match');
  };

  // Lưu lại mỗi khi chủ phòng đổi màn (sảnh ↔ trận) để F5 mở lại đúng chỗ.
  useEffect(() => {
    persist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const hostFinished = (o: MatchOutcome) => {
    const mine = o.standings.find((s) => s.player.id === 0);
    if (mine)
      recordMatch([
        { name: mine.player.name, won: mine.won, score: mine.score, kos: mine.player.kos },
      ]);
    setResult(o);
    setStatus('result');
    // Về sảnh: bỏ người đã rớt mạng, mọi khách phải bấm Sẵn sàng lại cho trận sau.
    // Lọc ô và mã tab theo cùng một danh sách gốc để hai bên luôn khớp vị trí với nhau.
    const old = lobbyRef.current.slots;
    const keep = old.map((s, i) => i === 0 || s.connected);
    seats.current = seats.current.filter((_, i) => keep[i]);
    publish({
      ...lobbyRef.current,
      slots: old.filter((_, i) => keep[i]).map((s) => ({ ...s, ready: s.host })),
    });
  };

  /** Rời phòng bằng nút: chủ phòng xoá bản lưu để lần sau không tự mở lại phòng cũ. */
  const leave = () => {
    if (isHost) writeHostSave(null);
    onExit();
  };

  // ---------------------------------------------------------------------------

  if (status === 'connecting') {
    return (
      <div className={`${CARD} mx-auto max-w-md p-6 text-center`}>
        <p className={`${HEADING} text-2xl`}>
          {isHost ? 'Đang tạo phòng…' : `Đang vào phòng ${code}…`}
        </p>
        <p className="mt-2 text-sm font-bold text-slate-600">
          Đang bắt tay qua máy môi giới PeerJS.
        </p>
        <Btn tone="cream" className="mt-4" onClick={leave}>
          Huỷ
        </Btn>
      </div>
    );
  }

  if (status === 'match' && config) {
    return (
      <>
        <MatchScreen
          key={config.seed}
          config={config}
          net={isHost ? hostLink : clientLink}
          onEnd={isHost ? hostFinished : () => undefined}
          onQuit={leave}
        />
        {notice && <Toast text={notice} />}
        {reconnecting && <Toast text="Mất kết nối với chủ phòng — đang nối lại…" />}
      </>
    );
  }

  if (status === 'result' && result && config) {
    return (
      <ResultScreen
        outcome={result}
        teams={config.teams}
        onAgain={isHost ? start : undefined}
        onHome={() => setStatus('lobby')}
        homeLabel="Về sảnh chờ"
      />
    );
  }

  const me = lobby.slots[you];
  const humans = lobby.slots.length;
  const everyoneReady = lobby.slots.every((s) => (s.ready && s.connected) || s.host);
  const canStart = everyoneReady && humans + lobby.bots >= 2;
  const link = code ? roomLink(code) : '';

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      flash(`Đã sao chép ${what}.`);
    } catch {
      flash('Không sao chép được — hãy chọn và sao chép bằng tay.');
    }
  };
  const share = async () => {
    try {
      await navigator.share({
        title: 'Bomb Arena',
        text: `Vào phòng ${code} chơi Bomb Arena với mình!`,
        url: link,
      });
    } catch {
      // Người dùng huỷ chia sẻ: không cần báo gì.
    }
  };
  /** Chủ phòng mời một khách ra khỏi sảnh. Đóng kết nối và chặn tab đó vào lại. */
  const kickSeat = (i: number) => {
    const seat = seats.current[i];
    if (!seat || i === 0 || statusRef.current === 'match') return;
    banned.current.add(seat.token);
    if (seat.connId) hostRef.current?.kick(seat.connId, { t: 'reject', reason: 'kicked' });
    const name = lobbyRef.current.slots[i]?.name;
    seats.current.splice(i, 1);
    publish({ ...lobbyRef.current, slots: lobbyRef.current.slots.filter((_, k) => k !== i) });
    setKickArm(null);
    flash(`Đã mời ${name} ra khỏi phòng.`);
  };

  const updateMine = (patch: { charId?: string; ready?: boolean }) => {
    if (isHost)
      publish({ ...lobby, slots: lobby.slots.map((s, i) => (i === 0 ? { ...s, ...patch } : s)) });
    else {
      if (patch.charId) clientRef.current?.send({ t: 'pick', charId: patch.charId });
      if (patch.ready !== undefined) clientRef.current?.send({ t: 'ready', ready: patch.ready });
    }
  };

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
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6"
        aria-label="Người chơi trong phòng"
      >
        {Array.from({ length: MAX_PLAYERS }, (_, i) => {
          const s = lobby.slots[i];
          const bot = !s && i < humans + lobby.bots;
          return (
            <div
              key={i}
              className={`${CARD} relative flex flex-col items-center p-2 ${!s ? 'border-dashed bg-white/60 shadow-none' : ''}`}
              style={{ borderTopColor: SEAT_COLORS[i], borderTopWidth: 8 }}
            >
              <span
                className="absolute left-2 top-1 text-xs font-extrabold"
                style={{ color: SEAT_COLORS[i] }}
              >
                P{i + 1}
              </span>
              {isHost && s && !s.host && (
                <button
                  type="button"
                  onClick={() => (kickArm === i ? kickSeat(i) : setKickArm(i))}
                  onBlur={() => setKickArm((k) => (k === i ? null : k))}
                  aria-label={
                    kickArm === i
                      ? `Xác nhận mời ${s.name} ra khỏi phòng`
                      : `Mời ${s.name} ra khỏi phòng`
                  }
                  className={`absolute right-1 top-1 rounded-lg border-2 border-[color:var(--bb-ink)] px-1.5 text-xs font-extrabold leading-5 ${kickArm === i ? 'bg-[color:var(--bb-coral)] text-white' : 'bg-white'}`}
                >
                  {kickArm === i ? 'Mời ra?' : '✕'}
                </button>
              )}
              <div className="flex h-[76px] items-end">
                {s ? (
                  <CharCanvas
                    def={characterById(s.charId)}
                    size={54}
                    pose={s.ready ? 'win' : 'idle'}
                  />
                ) : (
                  <span className={`${DISPLAY} pb-4 text-2xl text-slate-400`}>
                    {bot ? 'BOT' : '?'}
                  </span>
                )}
              </div>
              <p className="mt-1 max-w-full truncate text-sm font-extrabold">
                {s ? s.name : bot ? 'Bot chơi thay' : 'Trống'}
              </p>
              {s && (
                <span
                  className={`mt-1 rounded-full border-2 border-[color:var(--bb-ink)] px-2 text-[11px] font-extrabold ${!s.connected ? 'bg-slate-300' : s.host ? 'bg-[color:var(--bb-sun)]' : s.ready ? 'bg-[color:var(--bb-mint)]' : 'bg-white'}`}
                >
                  {!s.connected
                    ? 'Mất kết nối'
                    : s.host
                      ? 'Chủ phòng'
                      : s.ready
                        ? 'Sẵn sàng'
                        : 'Chưa sẵn sàng'}
                  {i === you && ' · bạn'}
                </span>
              )}
            </div>
          );
        })}
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <section className={`${CARD} p-4`}>
          <h3 className={`${HEADING} text-2xl`}>Nhân vật của bạn</h3>
          <div className="mt-3">
            {me && <CharacterGrid value={me.charId} onPick={(id) => updateMine({ charId: id })} />}
          </div>
        </section>
        <section className={`${CARD} flex flex-col gap-3 p-4`}>
          <h3 className={`${HEADING} text-2xl`}>
            Luật trận {!isHost && <span className="text-sm text-slate-500">(chủ phòng chọn)</span>}
          </h3>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-extrabold">Bot chơi thay chỗ trống</span>
            {isHost ? (
              <Stepper
                value={lobby.bots}
                min={0}
                max={MAX_PLAYERS - humans}
                onChange={(n) => publish({ ...lobby, bots: n })}
              />
            ) : (
              <span className={`${DISPLAY} text-2xl`}>{lobby.bots}</span>
            )}
          </div>
          <div className="flex gap-2">
            {DIFFICULTIES.map((d) => (
              <Btn
                key={d.id}
                tone={lobby.difficulty === d.id ? 'sun' : 'cream'}
                className="flex-1 py-1 text-sm"
                disabled={!isHost && lobby.difficulty !== d.id}
                onClick={() => isHost && publish({ ...lobby, difficulty: d.id })}
              >
                Bot {d.label}
              </Btn>
            ))}
          </div>
          <div className="flex gap-2">
            <Btn
              tone={!lobby.teams ? 'sun' : 'cream'}
              className="flex-1 py-1 text-sm"
              disabled={!isHost && lobby.teams}
              onClick={() => isHost && publish({ ...lobby, teams: false })}
            >
              Mỗi người một phe
            </Btn>
            <Btn
              tone={lobby.teams ? 'sun' : 'cream'}
              className="flex-1 py-1 text-sm"
              disabled={!isHost && !lobby.teams}
              onClick={() => isHost && publish({ ...lobby, teams: true })}
            >
              Hai đội
            </Btn>
          </div>
        </section>
      </div>

      <section className={`${CARD} p-4`}>
        <h3 className={`${HEADING} text-xl`}>Bản đồ</h3>
        <MapPicker
          value={lobby.theme}
          readOnly={!isHost}
          onPick={(t) => publish({ ...lobby, theme: t })}
        />
      </section>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Btn tone="cream" className="mr-auto" onClick={leave}>
          {isHost ? 'Đóng phòng' : 'Rời phòng'}
        </Btn>
        {isHost ? (
          <>
            {!canStart && (
              <p className="text-sm font-bold">
                {everyoneReady
                  ? 'Cần ít nhất 2 người (tính cả bot).'
                  : lobby.slots.some((s) => !s.connected)
                    ? 'Có người đang vào lại phòng…'
                    : 'Chờ mọi người bấm Sẵn sàng…'}
              </p>
            )}
            <Btn tone="sun" className="px-10 py-3 text-2xl" disabled={!canStart} onClick={start}>
              Bắt đầu!
            </Btn>
          </>
        ) : (
          <Btn
            tone={me?.ready ? 'cream' : 'mint'}
            className="px-8 py-3 text-xl"
            onClick={() => updateMine({ ready: !me?.ready })}
          >
            {me?.ready ? 'Huỷ sẵn sàng' : 'Sẵn sàng!'}
          </Btn>
        )}
      </div>
      {notice && <Toast text={notice} />}
      {reconnecting && <Toast text="Mất kết nối với chủ phòng — đang nối lại…" />}
    </div>
  );
}

/** Mã QR của link phòng: quét bằng camera điện thoại là mở thẳng phòng. Bấm vào để phóng to. */
function RoomQr({ link }: { link: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [big, setBig] = useState(false);
  useEffect(() => {
    let alive = true;
    void import('qrcode').then((QR) =>
      QR.toDataURL(link, {
        margin: 1,
        width: 512,
        errorCorrectionLevel: 'M',
        color: { dark: PALETTE.ink, light: '#ffffff' },
      }).then((url) => alive && setSrc(url)),
    );
    return () => {
      alive = false;
    };
  }, [link]);
  if (!src)
    return (
      <div
        className="h-28 w-28 shrink-0 animate-pulse rounded-xl border-[3px] border-[color:var(--bb-ink)] bg-white"
        aria-hidden
      />
    );
  return (
    <>
      <button
        type="button"
        onClick={() => setBig(true)}
        className="shrink-0 rounded-xl border-[3px] border-[color:var(--bb-ink)] bg-white p-1 shadow-[0_4px_0_var(--bb-ink)]"
        aria-label="Phóng to mã QR"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- ảnh data URL tạo tại chỗ, next/image không tối ưu được */}
        <img
          src={src}
          alt="Mã QR vào phòng"
          className="h-24 w-24"
          style={{ imageRendering: 'pixelated' }}
        />
      </button>
      {big && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-[color:var(--bb-ink)]/70 p-6"
          onClick={() => setBig(false)}
          role="dialog"
          aria-modal
          aria-label="Mã QR vào phòng"
        >
          <div className={`${CARD} flex flex-col items-center gap-3 p-5`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- như trên */}
            <img
              src={src}
              alt="Mã QR vào phòng"
              className="h-72 w-72 max-w-full"
              style={{ imageRendering: 'pixelated' }}
            />
            <p className="font-extrabold">Quét bằng camera điện thoại để vào phòng</p>
            <Btn tone="sun" onClick={() => setBig(false)}>
              Đóng
            </Btn>
          </div>
        </div>
      )}
    </>
  );
}

function Toast({ text }: { text: string }) {
  return (
    <div
      className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-xl border-[3px] border-[color:var(--bb-ink)] bg-white px-4 py-2 text-center font-extrabold shadow-[0_4px_0_var(--bb-ink)]"
      role="status"
    >
      {text}
    </div>
  );
}
