import type { DataConnection, Peer } from 'peerjs';
import type { Difficulty } from './bot';
import type { Input, Match, Standing } from './engine';
import type { ThemeId } from './map';

// Lớp mạng duy nhất của các game: mọi chỗ đụng tới PeerJS đều nằm ở đây, nên đổi cách truyền
// (máy chủ riêng, WebSocket…) chỉ phải sửa file này. Bomb Arena dùng kiểu tin nhắn và tiền tố mặc định;
// game khác (Sơn Lãnh Địa) truyền tiền tố và kiểu tin nhắn của riêng nó vào hostRoom/joinRoom.
// Máy môi giới miễn phí mặc định của PeerJS chỉ dùng để bắt tay; sau đó dữ liệu trận đi thẳng
// giữa các máy qua WebRTC. Dữ liệu gửi đi chỉ có tên hiển thị, nhân vật và phím bấm.

/** Tiền tố riêng của game để mã phòng không đụng peer id của ứng dụng khác trên cùng máy môi giới. */
const PREFIX = 'bongbongbum-v1-';
/** Bỏ các ký tự dễ nhầm (0/O, 1/I/L) để đọc mã qua điện thoại không bị sai. */
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 6;
/**
 * Mỗi lần chủ phòng tải lại trang, phòng mở ở một "lượt" mới của cùng mã: máy môi giới miễn phí giữ
 * peer id cũ thêm khoảng một phút sau khi trang đóng (đã đo: hơn 37 giây vẫn chưa nhả), nên không thể
 * giành lại đúng id cũ. Khách tìm phòng bằng cách thử mọi lượt cùng lúc, lượt nào mở được là lượt đúng.
 */
export const MAX_EPOCH = 12;
const peerId = (code: string, epoch: number, prefix: string) => `${prefix}${code}-${epoch}`;
export const PROTOCOL = 1;

export const normalizeCode = (raw: string) =>
  raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, CODE_LENGTH);
export const isValidCode = (code: string) =>
  code.length === CODE_LENGTH && [...code].every((ch) => CODE_CHARS.includes(ch));
const newCode = () =>
  Array.from(
    { length: CODE_LENGTH },
    () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)],
  ).join('');

export function roomLink(code: string, path = '/games/bong-bong-bum'): string {
  return `${window.location.origin}${path}?room=${code}`;
}

/** Mỗi tab có một mã riêng (không phải dữ liệu cá nhân) để chủ phòng nhận ra người vào lại sau khi rớt mạng. */
export function clientToken(): string {
  const KEY = 'bongbongbum.token';
  try {
    const existing = sessionStorage.getItem(KEY);
    if (existing) return existing;
    const t = Math.random().toString(36).slice(2, 12);
    sessionStorage.setItem(KEY, t);
    return t;
  } catch {
    return Math.random().toString(36).slice(2, 12);
  }
}

// ---------------------------------------------------------------------------
// Tin nhắn
// ---------------------------------------------------------------------------

export type LobbySlot = {
  name: string;
  charId: string;
  ready: boolean;
  host: boolean;
  connected: boolean;
};
export type LobbyState = {
  slots: LobbySlot[];
  theme: ThemeId | 'random';
  teams: boolean;
  difficulty: Difficulty;
  bots: number;
};
export type StartInfo = {
  seed: number;
  theme: ThemeId;
  teams: boolean;
  players: { name: string; charId: string; bot: boolean }[];
};
/** Trạng thái trận gửi qua mạng: bản đồ nén thành chuỗi chữ số cho gọn. */
export type Snapshot = Omit<Match, 'tiles'> & { tiles: string };
export type RejectReason = 'full' | 'started' | 'version' | 'kicked';

export type ToHost =
  | { t: 'hello'; name: string; charId: string; token: string; protocol: number }
  | { t: 'pick'; charId: string }
  | { t: 'ready'; ready: boolean }
  /** Phím của một nhịp (1/60 giây), đánh số tăng dần để chủ phòng báo lại đã xử lý tới đâu. */
  | { t: 'input'; seq: number; input: Input };

export type ToClient =
  | { t: 'welcome'; slot: number }
  | { t: 'reject'; reason: RejectReason }
  | { t: 'lobby'; lobby: LobbyState }
  | { t: 'start'; info: StartInfo; you: number }
  /** `acks[id]`: số thứ tự phím cuối cùng của người chơi `id` mà trạng thái này đã tính tới. */
  | { t: 'snap'; snap: Snapshot; acks: number[] }
  | { t: 'end'; standings: Standing[]; winnerTeam: number | null }
  | { t: 'closed' }
  /** Nhịp tim mỗi giây: khách lâu không nghe gì thì tự nối lại, không chờ trình duyệt báo kết nối chết. */
  | { t: 'ping' };

export const toSnapshot = (m: Match): Snapshot => ({ ...m, tiles: m.tiles.join('') });
export const fromSnapshot = (s: Snapshot): Match => ({
  ...s,
  tiles: [...s.tiles].map(Number) as Match['tiles'],
});

// ---------------------------------------------------------------------------
// Lỗi hiển thị cho người chơi
// ---------------------------------------------------------------------------

export type NetError =
  | 'broker'
  | 'notFound'
  | 'full'
  | 'started'
  | 'version'
  | 'kicked'
  | 'hostLeft'
  | 'lost'
  | 'reclaim'
  | 'browser';

export const NET_ERROR_TEXT: Record<NetError, string> = {
  broker:
    'Không kết nối được máy môi giới để tạo/vào phòng. Kiểm tra mạng rồi thử lại — hoặc chơi với bot trong lúc chờ.',
  notFound: 'Không tìm thấy phòng này. Có thể link sai, hoặc chủ phòng đã đóng phòng.',
  full: 'Phòng đã đủ 6 người.',
  started: 'Phòng đang trong trận. Chờ trận xong rồi vào lại nhé.',
  kicked: 'Bạn đã bị chủ phòng mời ra khỏi phòng.',
  reclaim: 'Tải lại trang xong nhưng không giữ được phòng cũ. Hãy tạo phòng mới và mời lại bạn bè.',
  version: 'Phiên bản game của bạn và chủ phòng khác nhau. Tải lại trang rồi thử lại.',
  hostLeft: 'Chủ phòng đã thoát, phòng đã đóng.',
  lost: 'Mất kết nối với chủ phòng.',
  browser:
    'Trình duyệt này không hỗ trợ chơi qua mạng (WebRTC). Thử Chrome, Safari hoặc Firefox bản mới.',
};

function mapPeerError(type: string): NetError {
  if (type === 'peer-unavailable') return 'notFound';
  if (type === 'browser-incompatible') return 'browser';
  return 'broker';
}

async function createPeer(id?: string): Promise<Peer> {
  const { Peer } = await import('peerjs');
  return new Promise((resolve, reject) => {
    const peer = id ? new Peer(id, { debug: 0 }) : new Peer({ debug: 0 });
    const onError = (err: { type: string }) => {
      peer.off('open', onOpen);
      peer.destroy();
      reject(err);
    };
    const onOpen = () => {
      peer.off('error', onError);
      resolve(peer);
    };
    peer.once('open', onOpen);
    peer.once('error', onError);
  });
}

// ---------------------------------------------------------------------------
// Chủ phòng
// ---------------------------------------------------------------------------

/** Mọi tin nhắn đều có trường `t` cho biết loại. */
type Msg = { t: string };

export type HostEvents<In extends Msg = ToHost> = {
  onJoin: (connId: string, hello: Extract<In, { t: 'hello' }>) => void;
  onMessage: (connId: string, msg: In) => void;
  onLeave: (connId: string) => void;
  onError: (e: NetError) => void;
};

export type HostRoom<Out extends Msg = ToClient> = {
  code: string;
  /** Lượt hiện tại của phòng; lưu lại để lần tải trang sau mở lượt kế tiếp. */
  epoch: number;
  send: (connId: string, msg: Out) => void;
  broadcast: (msg: Out) => void;
  /** Ngắt một người (vd: phòng đầy) sau khi gửi lý do. */
  kick: (connId: string, msg: Out) => void;
  /** Đóng lặng lẽ một kết nối cũ (cùng tab đã nối lại bằng kết nối mới). */
  drop: (connId: string) => void;
  close: () => void;
  /**
   * Trang sắp tải lại/đóng: nhả mã phòng ở máy môi giới ngay (không thì máy môi giới giữ mã tới khi
   * hết hạn nhịp tim, ~1 phút, và trang mới không giành lại được). Không báo "đóng phòng" cho khách,
   * để họ tự nối lại khi chủ phòng mở lại phòng.
   */
  release: () => void;
};

/**
 * Mở phòng. `reclaim`: phòng cũ cần mở lại sau khi chủ phòng tải lại trang — giữ nguyên mã,
 * mở ở lượt kế tiếp (xem MAX_EPOCH).
 */
export async function hostRoom<In extends Msg = ToHost, Out extends Msg = ToClient>(
  events: HostEvents<In>,
  reclaim?: { code: string; epoch: number },
  prefix = PREFIX,
): Promise<HostRoom<Out>> {
  let peer: Peer | null = null;
  let code = '';
  let epoch = 0;
  if (reclaim) {
    code = reclaim.code;
    for (epoch = reclaim.epoch + 1; epoch < MAX_EPOCH && !peer; epoch++) {
      try {
        peer = await createPeer(peerId(code, epoch, prefix));
      } catch (err) {
        const type = (err as { type?: string }).type ?? '';
        if (type !== 'unavailable-id') throw mapPeerError(type);
      }
    }
    epoch--;
    if (!peer) throw 'reclaim' satisfies NetError;
  } else {
    // Mã phòng trùng (rất hiếm) thì thử mã khác.
    for (let attempt = 0; attempt < 4 && !peer; attempt++) {
      code = newCode();
      try {
        peer = await createPeer(peerId(code, 0, prefix));
      } catch (err) {
        const type = (err as { type?: string }).type ?? '';
        if (type !== 'unavailable-id') throw mapPeerError(type);
      }
    }
    if (!peer) throw 'broker' satisfies NetError;
  }

  const conns = new Map<string, DataConnection>();
  peer.on('connection', (conn) => {
    conn.on('open', () => conns.set(conn.connectionId, conn));
    conn.on('data', (raw) => {
      const msg = raw as In;
      if (msg?.t === 'hello') events.onJoin(conn.connectionId, msg as Extract<In, { t: 'hello' }>);
      else if (msg?.t) events.onMessage(conn.connectionId, msg);
    });
    const gone = () => {
      if (conns.delete(conn.connectionId)) events.onLeave(conn.connectionId);
    };
    conn.on('close', gone);
    conn.on('error', gone);
  });
  // Mất máy môi giới sau khi đã mở phòng: các kết nối đang có vẫn chạy (WebRTC đi thẳng),
  // chỉ người mới không vào được nữa. Thử nối lại nhẹ nhàng.
  peer.on('disconnected', () => peer?.reconnect());
  peer.on('error', (err) => {
    if (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-error')
      events.onError('broker');
  });

  const send = (id: string, msg: Out) => {
    const c = conns.get(id);
    if (c?.open) void c.send(msg);
  };
  return {
    code,
    epoch,
    send,
    broadcast: (msg) => conns.forEach((c) => c.open && void c.send(msg)),
    kick: (id, msg) => {
      send(id, msg);
      const c = conns.get(id);
      setTimeout(() => c?.close(), 300);
    },
    drop: (id) => {
      const c = conns.get(id);
      conns.delete(id);
      c?.close();
    },
    close: () => {
      conns.forEach((c) => c.open && void c.send({ t: 'closed' } satisfies Msg));
      setTimeout(() => peer?.destroy(), 200);
    },
    release: () => peer?.destroy(),
  };
}

// ---------------------------------------------------------------------------
// Khách
// ---------------------------------------------------------------------------

export type ClientEvents<Out extends Msg = ToClient> = {
  onMessage: (msg: Out) => void;
  onClose: (e: NetError) => void;
};
export type ClientRoom<In extends Msg = ToHost> = { send: (msg: In) => void; close: () => void };

export async function joinRoom<In extends Msg = ToHost, Out extends Msg = ToClient>(
  code: string,
  // NoInfer: kiểu tin nhắn lấy từ tham số kiểu (hoặc mặc định), không suy ra từ riêng tin 'hello'.
  hello: NoInfer<Extract<In, { t: 'hello' }>>,
  events: ClientEvents<Out>,
  prefix = PREFIX,
): Promise<ClientRoom<In>> {
  let peer: Peer;
  try {
    peer = await createPeer();
  } catch (err) {
    throw mapPeerError((err as { type?: string }).type ?? '');
  }
  // Thử mọi lượt của phòng cùng lúc: lượt chưa từng mở báo "không có" ngay, lượt cũ của trang đã đóng
  // thì im lặng (máy môi giới còn giữ id), lượt đang mở thì nối được — lấy cái nối được đầu tiên.
  const conn = await new Promise<DataConnection>((resolve, reject) => {
    const tries = Array.from({ length: MAX_EPOCH }, (_, e) =>
      peer.connect(peerId(code, e, prefix), { reliable: true, serialization: 'json' }),
    );
    const missing = new Set<number>();
    let done = false;
    const finish = (fn: () => void) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      peer.off('error', onError);
      fn();
    };
    const timer = setTimeout(() => finish(() => reject('notFound' satisfies NetError)), 12000);
    tries.forEach((c) =>
      c.once('open', () =>
        finish(() => {
          tries.forEach((other) => other !== c && other.close());
          resolve(c);
        }),
      ),
    );
    const onError = (err: { type: string; message?: string }) => {
      if (err.type !== 'peer-unavailable') return finish(() => reject(mapPeerError(err.type)));
      // "Could not connect to peer <id>": đếm lượt không tồn tại; tất cả đều không có thì phòng không tồn tại.
      const hit = tries.findIndex((_, e) => err.message?.endsWith(peerId(code, e, prefix)));
      if (hit >= 0) missing.add(hit);
      if (missing.size >= MAX_EPOCH) finish(() => reject('notFound' satisfies NetError));
    };
    peer.on('error', onError);
  }).catch((e: NetError) => {
    peer.destroy();
    throw e;
  });

  let closedByUs = false;
  let reason: NetError = 'lost';
  conn.on('data', (raw) => {
    const msg = raw as Out;
    if (msg?.t === 'closed') reason = 'hostLeft';
    if (msg?.t) events.onMessage(msg);
  });
  conn.on('close', () => {
    if (!closedByUs) events.onClose(reason);
    peer.destroy();
  });
  void conn.send(hello);
  return {
    send: (msg) => conn.open && void conn.send(msg),
    close: () => {
      closedByUs = true;
      conn.close();
      peer.destroy();
    },
  };
}
