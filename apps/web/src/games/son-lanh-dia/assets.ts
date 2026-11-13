import { SQUAD, squadImage, type SquadView } from './squad';

// Ảnh đội sơn tải một lần cho cả trang: màn loading tải trước và báo tiến độ, sảnh, màn chọn nhân vật
// và sân 3D (TextureLoader mở đúng các địa chỉ này) lấy lại từ bộ nhớ đệm của trình duyệt thay vì tải
// lại — vào trận không còn khung hình nhân vật trắng trơn chờ ảnh về.

/** Mặt trước đứng đầu: sảnh và màn chọn nhân vật cần chúng trước, ảnh sau lưng và nhìn ngang chỉ dùng trong trận. */
const VIEWS: SquadView[] = ['front', 'back', 'side'];
export const SQUAD_URLS = VIEWS.flatMap((v) => SQUAD.map((s) => squadImage(s.id, v)));

/** Giữ tham chiếu tới ảnh đã giải mã để trình duyệt không dọn khỏi bộ nhớ trước khi trận cần tới. */
const kept: HTMLImageElement[] = [];
let pending: Promise<void> | null = null;
let loaded = 0;
const listeners = new Set<(progress: number) => void>();

/**
 * Tải trước toàn bộ ảnh đội sơn (chỉ một lần); `onProgress` nhận 0..1 theo số ảnh đã xong —
 * `new Image()` không cho biết số byte nên đếm theo ảnh, mỗi ảnh cỡ nhau (~200 KB).
 */
export function loadSquadArt(onProgress?: (progress: number) => void): Promise<void> {
  if (onProgress) {
    listeners.add(onProgress);
    onProgress(loaded / SQUAD_URLS.length);
  }
  if (pending) return pending;
  const job = Promise.all(
    SQUAD_URLS.map((url) => {
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      kept.push(img);
      // Ảnh lỗi cũng tính là xong: trong trận three.js tự tải lại, thiếu một ảnh không nên chặn cả game.
      return img
        .decode()
        .catch(() => undefined)
        .then(() => {
          loaded++;
          for (const f of listeners) f(loaded / SQUAD_URLS.length);
        });
    }),
  ).then(() => listeners.clear());
  pending = job;
  return job;
}
