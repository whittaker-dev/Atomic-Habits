import { AGENTS } from './agents';

// Ảnh vẽ tay của nhân vật (PNG nền trong suốt, tạo bằng scripts/cut-character-art.mjs).
// Nhân vật có ảnh thì vẽ bằng ảnh; chưa tải xong hoặc không có ảnh thì dùng hình vẽ bằng code (draw.ts).

export const ART_BASE = '/games/bong-bong-bum/characters';

export const ART_IDS = [
  ...AGENTS.map((a) => a.id),
  'blaze',
  'ronin',
  'fox',
  'storm',
  'mecha',
  'dragon',
  'archer',
  'iceknight',
  'flamemage',
  'forest',
  'outlaw',
  'ninja',
  'mushroom',
  'inventor',
  'shark',
  'monk',
  'ghost',
  'sand',
  'dancer',
  'tamer',
  'time',
  'wave',
  'sailor',
  'neon',
  'tieuho',
  'truclan',
  'ongdo',
  'sumo',
  'ocvit',
  'daosi',
  'homang',
  'gangdo',
  'hoaquyen',
  'loiphong',
  'bangnguyet',
  'thachgiap',
  'phonglinh',
  'hacanh',
  'lietung',
  'thuylong',
];

/** Ảnh cần tải: mặt trước của mọi nhân vật có ảnh, thêm ảnh sau lưng của người có `back`. */
const FILES = [...ART_IDS, ...AGENTS.filter((a) => a.back).map((a) => `${a.id}-back`)];

const images = new Map<string, HTMLImageElement>();
const listeners = new Set<() => void>();
let loading: Promise<void> | null = null;

export function loadCharacterArt(): Promise<void> {
  loading ??= Promise.all(
    FILES.map(
      (id) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            images.set(id, img);
            resolve();
          };
          // Thiếu ảnh thì thôi, nhân vật đó vẫn có hình vẽ bằng code.
          img.onerror = () => resolve();
          img.src = `${ART_BASE}/${id}.png`;
        }),
    ),
  ).then(() => listeners.forEach((f) => f()));
  return loading;
}

/** `back`: ảnh sau lưng nếu có, không có thì trả ảnh mặt trước. */
export const characterArt = (id: string, back = false): HTMLImageElement | undefined =>
  (back && images.get(`${id}-back`)) || images.get(id);

/** Báo khi ảnh tải xong, để canvas vẽ một lần (không chạy hoạt ảnh) vẽ lại bằng ảnh. */
export function onArtLoaded(f: () => void): () => void {
  listeners.add(f);
  return () => listeners.delete(f);
}
