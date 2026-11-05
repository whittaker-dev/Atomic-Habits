import { movePlayer, TICK, type Input, type Match, type Player } from './engine';
import type { Dir } from './map';

// Đồng bộ chuyển động qua mạng, tách khỏi React để test được với độ trễ giả lập.
// Khách gửi mỗi nhịp một phím có số thứ tự; chủ phòng dùng đúng một phím mỗi nhịp và báo lại
// số thứ tự cuối cùng đã dùng (ack). Khách lấy vị trí chuẩn rồi phát lại các phím sau ack.

export type Pending = { seq: number; dir: Dir | null };
export type Queued = { seq: number; input: Input };

/** Hàng đợi của một khách dài quá chừng này nhịp thì bỏ bớt phím cũ (đồng hồ hai máy lệch nhau). */
export const MAX_QUEUE = 4;

/**
 * Chủ phòng lấy phím cho một nhịp. Hàng đợi trống (mạng giật) thì đi tiếp theo hướng cũ;
 * hàng đợi quá dài thì gộp bớt phím cũ nhưng giữ lại lần bấm đặt bóng.
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
      input: { dir: next.input.dir, bomb: next.input.bomb || entry.input.bomb },
    };
  }
  if (!entry) return { input: { dir: lastDir, bomb: false }, seq: null };
  return { input: entry.input, seq: entry.seq };
}

/** Vị trí của chính mình trên máy khách = vị trí chuẩn + phát lại các phím chưa được xác nhận. */
export function replayOwn(last: Match, you: number, pending: readonly Pending[]): Player | null {
  const auth = last.players[you];
  if (!auth || auth.state === 'out') return null;
  const me = { ...auth };
  const scratch = { ...last, players: last.players.map((p) => (p.id === me.id ? me : p)) };
  for (const e of pending) {
    if (e.dir) {
      movePlayer(scratch, me, e.dir, TICK);
      me.dir = e.dir;
    } else {
      me.moving = false;
    }
  }
  return me;
}
