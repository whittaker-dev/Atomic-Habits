import type { NetError } from '../bong-bong-bum/net';
import type { Action, Game, Seat, Settings } from './engine';

// Tin nhắn qua mạng của Cờ tỷ phú, đi trên lớp PeerJS dùng chung (bong-bong-bum/net.ts) với tiền
// tố riêng để phòng của game này không lẫn với game khác. Chủ phòng giữ ván và tự bốc xúc xắc;
// khách chỉ gửi thao tác của mình (engine tự từ chối thao tác không hợp lệ) rồi nhận lại cả ván.

export const PREFIX = 'cotyphu-v1-';
/** Đổi khi tin nhắn đổi (2: thêm nhân vật). */
export const PROTOCOL = 2;
export const ROOM_PATH = '/games/co-ty-phu';

/** Phòng chờ: sáu ghế (ghế 0 là chủ phòng) và cách tính thắng của ván. */
export type LobbyState = { seats: Seat[]; settings: Settings };

export type ToHost =
  | { t: 'hello'; name: string; character: string; token: string; protocol: number }
  | { t: 'act'; action: Action }
  /** Khách đổi nhân vật trong phòng chờ. */
  | { t: 'character'; id: string }
  | { t: 'ping' };

export type ToClient =
  | { t: 'welcome'; seat: number }
  | { t: 'reject'; reason: NetError }
  | { t: 'lobby'; lobby: LobbyState }
  | { t: 'state'; game: Game }
  | { t: 'closed' }
  | { t: 'ping' };

/** Nhịp tim hai chiều: im lặng quá lâu thì coi như đã rời (chủ phòng) hoặc mất kết nối (khách). */
export const HEARTBEAT_MS = 2000;
export const HEARTBEAT_TIMEOUT = 20_000;

/** Lỗi phòng hiển thị cho người chơi. */
export const ERROR_TEXT: Record<NetError, string> = {
  broker: 'Không kết nối được máy môi giới để tạo hoặc vào phòng. Kiểm tra mạng rồi thử lại.',
  notFound: 'Không tìm thấy phòng này. Có thể mã sai, hoặc chủ phòng đã đóng phòng.',
  full: 'Phòng đã đủ sáu người.',
  started: 'Phòng đang chơi dở. Chờ ván xong rồi vào lại nhé.',
  kicked: 'Bạn đã bị mời ra khỏi phòng.',
  reclaim: 'Không mở lại được phòng cũ. Hãy tạo phòng mới và mời lại bạn bè.',
  version: 'Phiên bản game của bạn và chủ phòng khác nhau. Tải lại trang rồi thử lại.',
  hostLeft: 'Chủ phòng đã thoát, phòng đã đóng.',
  lost: 'Mất kết nối với chủ phòng.',
  browser:
    'Trình duyệt này không hỗ trợ chơi qua mạng (WebRTC). Thử Chrome, Safari hoặc Firefox bản mới.',
};
