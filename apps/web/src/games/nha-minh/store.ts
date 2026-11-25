import type { House } from './engine';

// Lưu trên máy của Nhà Mình. Căn nhà lưu trên máy người tạo (chủ nhà), trong localStorage nên còn
// sau khi đóng trình duyệt. Người kia lưu "nhà đã vào" (tên, mã) để lần sau vào lại bằng đúng mã.
// Phòng đang ngồi lưu trong sessionStorage để F5 vào lại đúng phòng, như các game online khác.

const HOUSES = 'nhaminh.houses';
const JOINED = 'nhaminh.joined';
const ROOM = 'nhaminh.room';

function read<T>(store: Storage | undefined, key: string, fallback: T): T {
  try {
    const raw = store?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(store: Storage | undefined, key: string, value: unknown) {
  try {
    if (value === null) store?.removeItem(key);
    else store?.setItem(key, JSON.stringify(value));
  } catch {
    // Không lưu được (chế độ riêng tư, bộ nhớ đầy): vẫn chơi được, chỉ là không còn sau khi tải lại.
  }
}

const local = () => (typeof window === 'undefined' ? undefined : window.localStorage);
const session = () => (typeof window === 'undefined' ? undefined : window.sessionStorage);

const isHouse = (h: unknown): h is House =>
  !!h && typeof h === 'object' && (h as House).v === 1 && Array.isArray((h as House).floor);

export function listHouses(): House[] {
  const all = read<Record<string, unknown>>(local(), HOUSES, {});
  return Object.values(all)
    .filter(isHouse)
    .sort((a, b) => b.updated - a.updated);
}

export function loadHouse(id: string): House | null {
  const h = read<Record<string, unknown>>(local(), HOUSES, {})[id];
  return isHouse(h) ? h : null;
}

export function saveHouse(h: House) {
  const all = read<Record<string, unknown>>(local(), HOUSES, {});
  all[h.id] = h;
  write(local(), HOUSES, all);
}

export function removeHouse(id: string) {
  const all = read<Record<string, unknown>>(local(), HOUSES, {});
  delete all[id];
  write(local(), HOUSES, all);
}

/** Nhà của người khác mà máy này từng vào. */
export type Joined = { code: string; name: string; host: string; updated: number };

export function listJoined(): Joined[] {
  return read<Joined[]>(local(), JOINED, []).filter((j) => typeof j?.code === 'string');
}

export function rememberJoined(j: Joined) {
  const rest = listJoined().filter((q) => q.code !== j.code);
  write(local(), JOINED, [j, ...rest].slice(0, 8));
}

export function forgetJoined(code: string) {
  write(
    local(),
    JOINED,
    listJoined().filter((q) => q.code !== code),
  );
}

/** Phòng đang ngồi (cho F5). Chủ nhà nhớ thêm lượt mở của mã để mở lại lượt kế tiếp. */
export type RoomSession =
  | { role: 'host'; houseId: string; epoch: number }
  | { role: 'join'; code: string };

export const loadSession = () => read<RoomSession | null>(session(), ROOM, null);
export const saveSession = (s: RoomSession | null) => write(session(), ROOM, s);
