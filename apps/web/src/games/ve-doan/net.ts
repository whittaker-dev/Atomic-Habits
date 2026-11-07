import type { NetError, RejectReason } from '../bong-bong-bum/net';
import {
  MAX_PLAYERS,
  maskWord,
  type Game,
  type RoundResult,
  type Seat,
  type Settings,
} from './engine';
import type { Verdict } from './guess';
import type { DrawOp, Stroke } from './ink';

// Tin nhắn qua mạng của Vẽ Đoán. Đường truyền (PeerJS, mã phòng) là của chung trong
// bong-bong-bum/net.ts; file này định nghĩa nội dung gửi đi và — quan trọng nhất — mỗi người được
// thấy gì: chủ phòng giữ cả ván, nhưng chỉ gửi cho từng máy phần máy đó được biết (người đoán
// không bao giờ nhận được chữ đáp án trước khi tự đoán ra).

export const PREFIX = 'vedoan-v1-';
export const PROTOCOL = 1;
export const ROOM_PATH = '/games/ve-doan';

export type LobbySlot = { name: string; host: boolean; connected: boolean };
export type LobbyState = { slots: LobbySlot[]; settings: Settings };

export type FeedView = { by: number; verdict: Verdict; text?: string; points?: number };

export type PhaseView =
  | { kind: 'pick'; drawer: number; choices?: string[] }
  | { kind: 'draw'; drawer: number; pattern: string; word?: string; solved: number[] }
  | { kind: 'reveal'; drawer: number; word: string; results: RoundResult[] }
  | { kind: 'final' };

export type GameView = {
  turn: number;
  turns: number;
  drawTime: number;
  seats: Seat[];
  phase: PhaseView;
  feed: FeedView[];
  /** Mili giây còn lại của giai đoạn này lúc gửi — khách tự đếm lùi theo đồng hồ của mình. */
  leftMs: number;
};

export type ToHost =
  | { t: 'hello'; name: string; token: string; protocol: number }
  | { t: 'pick'; index: number }
  | { t: 'guess'; text: string }
  | { t: 'draw'; ops: DrawOp[] }
  | { t: 'done' }
  | { t: 'ping' };

export type ToClient =
  | { t: 'welcome'; slot: number }
  | { t: 'reject'; reason: RejectReason }
  | { t: 'lobby'; lobby: LobbyState }
  | { t: 'state'; view: GameView }
  | { t: 'draw'; ops: DrawOp[] }
  /** Gửi lại toàn bộ nét (người vào lại giữa lượt). */
  | { t: 'ink'; strokes: Stroke[] }
  | { t: 'closed' }
  | { t: 'ping' };

/**
 * Nhịp tim hai chiều: đóng tab hay mất sóng điện thoại thì WebRTC có khi cả phút mới báo kết nối
 * chết. Mỗi bên gửi 'ping' đều đặn; im lặng quá HEARTBEAT_TIMEOUT thì coi như người kia đã rời.
 * Đủ dài để người chơi chuyển app nhắn tin một lúc vẫn không bị đá khỏi phòng.
 */
export const HEARTBEAT_MS = 2000;
export const HEARTBEAT_TIMEOUT = 20_000;

/** Phần của ván mà người ngồi ghế `you` được thấy. */
export function viewFor(g: Game, you: number, now: number): GameView {
  const p = g.phase;
  const solvedIds = p.kind === 'draw' ? p.solved.map((s) => s.id) : [];
  // Biết đáp án: người vẽ, người đã đoán ra, và mọi người khi lượt đã xong.
  const knows = p.kind !== 'draw' || p.drawer === you || solvedIds.includes(you);
  let phase: PhaseView;
  if (p.kind === 'pick')
    phase = {
      kind: 'pick',
      drawer: p.drawer,
      ...(p.drawer === you ? { choices: p.choices } : {}),
    };
  else if (p.kind === 'draw')
    phase = {
      kind: 'draw',
      drawer: p.drawer,
      pattern: maskWord(p.word, p.hints),
      ...(knows ? { word: p.word } : {}),
      solved: solvedIds,
    };
  else if (p.kind === 'reveal')
    phase = { kind: 'reveal', drawer: p.drawer, word: p.word, results: p.results };
  else phase = { kind: 'final' };

  const feed: FeedView[] = g.feed.map((f) => {
    // Câu sai ai cũng thấy; câu đúng và câu gần đúng chỉ hiện chữ cho người đã biết đáp án
    // hoặc chính người gõ — không thì chúng làm lộ đáp án.
    const show = f.verdict === 'wrong' || knows || f.by === you;
    return {
      by: f.by,
      verdict: f.verdict,
      ...(show ? { text: f.text } : {}),
      ...(f.points !== undefined ? { points: f.points } : {}),
    };
  });

  const endsAt = 'endsAt' in p ? p.endsAt : now;
  return {
    turn: g.turn,
    turns: g.settings.turns,
    drawTime: g.settings.drawTime,
    seats: g.seats.map((s) => ({ ...s })),
    phase,
    feed: feed.slice(-30),
    leftMs: Math.max(0, endsAt - now),
  };
}

/** Lỗi phòng hiển thị cho người chơi (lời riêng của Vẽ Đoán: không có bot, tối đa 8 người). */
export const ERROR_TEXT: Record<NetError, string> = {
  broker: 'Không kết nối được máy môi giới để tạo hoặc vào phòng. Kiểm tra mạng rồi thử lại.',
  notFound: 'Không tìm thấy phòng này. Có thể mã sai, hoặc chủ phòng đã đóng phòng.',
  full: `Phòng đã đủ ${MAX_PLAYERS} người.`,
  started: 'Phòng đang chơi dở. Chờ ván xong rồi vào lại nhé.',
  kicked: 'Bạn đã bị mời ra khỏi phòng.',
  reclaim: 'Không mở lại được phòng cũ. Hãy tạo phòng mới và mời lại bạn bè.',
  version: 'Phiên bản game của bạn và chủ phòng khác nhau. Tải lại trang rồi thử lại.',
  hostLeft: 'Chủ phòng đã thoát, phòng đã đóng.',
  lost: 'Mất kết nối với chủ phòng.',
  browser:
    'Trình duyệt này không hỗ trợ chơi qua mạng (WebRTC). Thử Chrome, Safari hoặc Firefox bản mới.',
};
