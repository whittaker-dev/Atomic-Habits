import type { Dir } from '../bong-bong-bum/map';
import type { RejectReason } from '../bong-bong-bum/net';
import type { ArenaId } from './arenas';
import type { Difficulty } from './bot';
import {
  createTiles,
  movePlayer,
  NONE,
  TICK,
  type Input,
  type Match,
  type Player,
  type PlayerSetup,
  type Standing,
} from './engine';

// Tin nhắn qua mạng của Sơn Lãnh Địa. Đường truyền (PeerJS, mã phòng, nối lại) là của chung trong
// bong-bong-bum/net.ts; file này chỉ định nghĩa nội dung gửi đi và cách nén trạng thái trận.
// Chủ phòng chạy trận thật; khách gửi phím mỗi nhịp và nhận ảnh chụp 20 lần mỗi giây.

/** Tiền tố riêng để mã phòng Sơn Lãnh Địa không đụng phòng Bomb Arena trên máy môi giới. */
export const PREFIX = 'sonlanhdia-v1-';
export const PROTOCOL = 1;
export const ROOM_PATH = '/games/son-lanh-dia';

export type LobbySlot = { name: string; charId: string; host: boolean; connected: boolean };
export type LobbyState = {
  slots: LobbySlot[];
  arena: ArenaId | 'random';
  teams: boolean;
  difficulty: Difficulty;
  bots: number;
};
export type StartInfo = { arena: ArenaId; teams: boolean; players: PlayerSetup[] };

/** Trạng thái trận gửi đi: bỏ bản đồ (khách tự dựng từ mã sân), sơn nén thành chuỗi một ký tự mỗi ô. */
export type Snapshot = Omit<Match, 'tiles' | 'paint'> & { paint: string };

export type ToHost =
  | { t: 'hello'; name: string; charId: string; token: string; protocol: number }
  | { t: 'pick'; charId: string }
  /** Phím của một nhịp (1/60 giây), đánh số tăng dần để chủ phòng báo lại đã xử lý tới đâu. */
  | { t: 'input'; seq: number; input: Input };

export type ToClient =
  | { t: 'welcome'; slot: number }
  | { t: 'reject'; reason: RejectReason }
  | { t: 'lobby'; lobby: LobbyState }
  | { t: 'start'; info: StartInfo; you: number }
  /** `acks[id]`: số thứ tự phím cuối cùng của người chơi `id` mà ảnh chụp này đã tính tới. */
  | { t: 'snap'; snap: Snapshot; acks: number[] }
  | { t: 'end'; standings: Standing[]; winnerTeam: number | null }
  | { t: 'closed' };

export const toSnapshot = ({ tiles: _tiles, paint, ...rest }: Match): Snapshot => ({
  ...rest,
  paint: paint.map((team) => (team === NONE ? '.' : String(team))).join(''),
});

export function fromSnapshot(s: Snapshot): Match {
  const { paint, ...rest } = s;
  return {
    ...rest,
    tiles: createTiles(s.arena),
    paint: [...paint].map((ch) => (ch === '.' ? NONE : Number(ch))),
  };
}

// ---------------------------------------------------------------------------
// Đồng bộ chuyển động: khách đoán trước vị trí của chính mình để điều khiển không bị trễ.
// ---------------------------------------------------------------------------

export type Queued = { seq: number; input: Input };
export type Pending = { seq: number; dir: Dir | null };
/** Hàng đợi của một khách dài quá chừng này nhịp thì gộp bớt phím cũ (đồng hồ hai máy lệch nhau). */
const MAX_QUEUE = 4;

/**
 * Chủ phòng lấy phím của một khách cho một nhịp. Hàng đợi trống (mạng giật) thì đi tiếp theo hướng cũ;
 * hàng đợi quá dài thì gộp bớt phím cũ nhưng không làm mất lần bóp cò.
 */
export function takeQueued(
  queue: Queued[] | undefined,
  lastDir: Dir | null,
): { input: Input; seq: number | null } {
  let entry = queue?.shift();
  while (entry && queue && queue.length > MAX_QUEUE) {
    const next = queue.shift()!;
    entry = {
      seq: next.seq,
      input: { dir: next.input.dir, fire: next.input.fire || entry.input.fire },
    };
  }
  if (!entry) return { input: { dir: lastDir, fire: false }, seq: null };
  return entry;
}

/** Vị trí của mình trên máy khách = vị trí chuẩn của chủ phòng + phát lại các phím chưa được xác nhận. */
export function replayOwn(last: Match, you: number, pending: readonly Pending[]): Player | null {
  const auth = last.players[you];
  if (!auth) return null;
  const me = { ...auth };
  // Đang đứng hình thì không đi được, giống hệt luật trên máy chủ phòng.
  if (me.stunT > 0) return me;
  for (const e of pending) {
    if (e.dir) {
      me.dir = e.dir;
      movePlayer(last, me, e.dir, TICK);
    } else {
      me.moving = false;
    }
  }
  return me;
}
