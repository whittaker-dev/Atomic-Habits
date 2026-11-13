// Model nhân vật (GLB) tải một lần cho cả trang: màn loading tải trước và báo tiến độ, cảnh võ sĩ
// dùng lại đúng bộ dữ liệu đó (vào trận không phải tải lại).

export const HERO_URL = '/games/ban-bi/fighter.glb';

let pending: Promise<ArrayBuffer> | null = null;
const listeners = new Set<(progress: number) => void>();

/** Tải model (chỉ một lần); `onProgress` nhận 0..1 khi máy chủ cho biết dung lượng. */
export function loadHero(onProgress?: (progress: number) => void): Promise<ArrayBuffer> {
  if (onProgress) listeners.add(onProgress);
  if (pending) return pending;
  const job = (async () => {
    const res = await fetch(HERO_URL);
    if (!res.ok || !res.body) throw new Error(`Không tải được ${HERO_URL}: ${res.status}`);
    const total = Number(res.headers.get('content-length')) || 0;
    const reader = res.body.getReader();
    const parts: Uint8Array[] = [];
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value);
      got += value.length;
      if (total) for (const f of listeners) f(Math.min(1, got / total));
    }
    const out = new Uint8Array(got);
    let at = 0;
    for (const p of parts) {
      out.set(p, at);
      at += p.length;
    }
    return out.buffer;
  })();
  pending = job;
  // Lỗi mạng thì lần gọi sau thử lại; xong (hay lỗi) thì không báo tiến độ nữa.
  job.catch(() => {
    if (pending === job) pending = null;
  });
  job.finally(() => listeners.clear()).catch(() => undefined);
  return job;
}
