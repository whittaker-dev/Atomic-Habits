import type { NetError, RejectReason } from '../bong-bong-bum/net';
import type { Kind } from './catalog';
import { ITEM } from './catalog';
import type { Action, GameEvent, House, Rot, Seat } from './engine';

// Tin nhắn qua mạng của Nhà Mình. Đường truyền (PeerJS, mã phòng) là của chung trong
// bong-bong-bum/net.ts. Chủ phòng giữ căn nhà và là máy duy nhất áp luật; khách gửi thao tác, chủ
// phòng áp rồi gửi lại cả căn nhà (vài KB) cho mọi người. Ngoài ra mỗi người phát "đang làm gì"
// (món đang cầm, đoạn tường đang vẽ) để người kia thấy bóng mờ theo màu của mình.

export const PREFIX = 'nhaminh-v1-';
export const PROTOCOL = 1;
export const ROOM_PATH = '/games/nha-minh';
export const MAX_PLAYERS = 2;

/** Người chơi đang làm gì, để máy kia vẽ bóng mờ và nhãn. Không lưu, không ảnh hưởng luật. */
export type Presence =
  | { mode: 'idle' }
  | { mode: 'place'; kind: Kind; x: number; y: number; rot: Rot; valid: boolean }
  | { mode: 'wall'; x1: number; y1: number; x2: number | null; y2: number | null }
  | { mode: 'select'; id: string };

export type Peers = { names: [string, string | null]; online: [boolean, boolean] };

export type ToHost =
  | { t: 'hello'; name: string; token: string; protocol: number }
  /** `nonce` để chủ phòng báo lại đúng thao tác nào thành hay hỏng. */
  | { t: 'act'; nonce: number; action: Action }
  | { t: 'presence'; p: Presence }
  | { t: 'ping' };

export type ToClient =
  | { t: 'welcome'; slot: number }
  | { t: 'reject'; reason: RejectReason }
  | { t: 'house'; house: House }
  | { t: 'peers'; peers: Peers }
  | { t: 'result'; nonce: number; ok: boolean; reason?: string }
  | { t: 'events'; by: Seat; events: GameEvent[] }
  | { t: 'presence'; seat: Seat; p: Presence }
  | { t: 'closed' }
  | { t: 'ping' };

/** Nhịp tim hai chiều, như Vẽ Đoán: im lặng quá lâu thì coi như người kia đã rời. */
export const HEARTBEAT_MS = 2000;
export const HEARTBEAT_TIMEOUT = 20_000;

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Lọc "đang làm gì" nhận qua mạng. */
export function sanitizePresence(raw: unknown): Presence {
  const o = raw as Record<string, unknown> | null;
  if (!o || typeof o !== 'object') return { mode: 'idle' };
  if (
    o.mode === 'place' &&
    typeof o.kind === 'string' &&
    o.kind in ITEM &&
    finite(o.x) &&
    finite(o.y)
  )
    return {
      mode: 'place',
      kind: o.kind as Kind,
      x: o.x,
      y: o.y,
      rot: ([0, 1, 2, 3] as const).find((r) => r === o.rot) ?? 0,
      valid: o.valid === true,
    };
  if (o.mode === 'wall' && finite(o.x1) && finite(o.y1))
    return {
      mode: 'wall',
      x1: o.x1,
      y1: o.y1,
      x2: finite(o.x2) ? o.x2 : null,
      y2: finite(o.y2) ? o.y2 : null,
    };
  if (o.mode === 'select' && typeof o.id === 'string')
    return { mode: 'select', id: o.id.slice(0, 12) };
  return { mode: 'idle' };
}

/** Lỗi phòng hiển thị cho người chơi (lời riêng của Nhà Mình: phòng hai người). */
export const ERROR_TEXT: Record<NetError, string> = {
  broker: 'Không kết nối được máy môi giới để mở hoặc vào nhà. Kiểm tra mạng rồi thử lại.',
  notFound: 'Không tìm thấy nhà này. Có thể mã sai, hoặc chủ nhà chưa mở nhà.',
  full: 'Nhà này đã đủ hai người.',
  started: 'Nhà này đang bận. Thử lại sau nhé.',
  kicked: 'Bạn đã được mời ra khỏi nhà.',
  reclaim: 'Không mở lại được mã nhà cũ. Nhà sẽ mở bằng mã mới.',
  version: 'Phiên bản game của bạn và chủ nhà khác nhau. Tải lại trang rồi thử lại.',
  hostLeft: 'Chủ nhà đã thoát, phòng đã đóng. Nhà vẫn được lưu trên máy chủ nhà.',
  lost: 'Mất kết nối với chủ nhà.',
  browser:
    'Trình duyệt này không hỗ trợ chơi qua mạng (WebRTC). Thử Chrome, Safari hoặc Firefox bản mới.',
};
