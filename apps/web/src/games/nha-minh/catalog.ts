import type { TileId } from './tiles';

// Danh mục của Nhà Mình: đồ đạc, mục tiêu gia đình và bảng giá. Giá tính bằng đồng trong game, không
// phải tiền thật. Muốn thêm đồ: thêm một dòng ở CATALOG và một nhánh dựng hình trong view3d.ts.

export type Kind =
  | 'sofa'
  | 'coffee'
  | 'tv'
  | 'altar'
  | 'rug'
  | 'plant'
  | 'fridge'
  | 'stove'
  | 'dining'
  | 'bed2'
  | 'wardrobe'
  | 'bed1'
  | 'desk'
  | 'shelf';

export type Category = 'khach' | 'bep' | 'ngu' | 'con';

export type Item = {
  kind: Kind;
  name: string;
  price: number;
  /** Kích thước mặt bằng, mét: `w` theo chiều ngang khi chưa xoay, `d` theo chiều sâu. */
  w: number;
  d: number;
  category: Category;
  /** Thảm nằm dưới đồ khác: được chồng lên, không chặn đồ khác. */
  flat?: boolean;
};

export const CATALOG: Item[] = [
  { kind: 'sofa', name: 'Sofa ba chỗ', price: 7500, w: 2.4, d: 0.9, category: 'khach' },
  { kind: 'coffee', name: 'Bàn trà', price: 1800, w: 1.2, d: 0.6, category: 'khach' },
  { kind: 'tv', name: 'Kệ ti vi', price: 5200, w: 1.8, d: 0.45, category: 'khach' },
  { kind: 'altar', name: 'Bàn thờ gia tiên', price: 3600, w: 1.2, d: 0.5, category: 'khach' },
  { kind: 'rug', name: 'Thảm cói', price: 900, w: 2.2, d: 1.6, category: 'khach', flat: true },
  { kind: 'plant', name: 'Chậu trầu bà', price: 400, w: 0.5, d: 0.5, category: 'khach' },
  { kind: 'fridge', name: 'Tủ lạnh', price: 9500, w: 0.8, d: 0.7, category: 'bep' },
  { kind: 'stove', name: 'Bếp ga và kệ', price: 6000, w: 1.8, d: 0.6, category: 'bep' },
  { kind: 'dining', name: 'Bàn ăn bốn ghế', price: 4200, w: 1.4, d: 0.9, category: 'bep' },
  { kind: 'bed2', name: 'Giường đôi', price: 8800, w: 1.8, d: 2.1, category: 'ngu' },
  { kind: 'wardrobe', name: 'Tủ áo', price: 4600, w: 1.6, d: 0.6, category: 'ngu' },
  { kind: 'bed1', name: 'Giường đơn', price: 4900, w: 1.0, d: 2.0, category: 'con' },
  { kind: 'desk', name: 'Bàn học có đèn', price: 2300, w: 1.2, d: 0.6, category: 'con' },
  { kind: 'shelf', name: 'Kệ sách', price: 2100, w: 1.0, d: 0.35, category: 'con' },
];

export const ITEM = Object.fromEntries(CATALOG.map((c) => [c.kind, c])) as Record<Kind, Item>;

export const CATEGORY_NAME: Record<Category, string> = {
  khach: 'Phòng khách',
  bep: 'Bếp',
  ngu: 'Phòng ngủ',
  con: 'Phòng con',
};

export const START_FUND = 120_000;
/** Giá mỗi mét tường, mỗi ô cửa đi, mỗi ô cửa sổ. */
export const WALL_PRICE = 300;
export const DOOR_PRICE = 800;
export const WINDOW_PRICE = 600;
/** Mỗi ô lưới 1 m² lát 4 viên gạch 50 cm. */
export const TILES_PER_CELL = 4;

export type Goal = {
  id: string;
  title: string;
  detail: string;
  reward: number;
  /** Đủ các món này trong cùng một phòng kín… */
  needs: Kind[];
  /** …và phòng đó đã lát gạch. */
  tiled?: boolean;
  /** Hoặc: đủ số món này ở bất cứ đâu trong nhà. */
  anywhere?: { kind: Kind; count: number };
};

export const GOALS: Goal[] = [
  {
    id: 'bo-me',
    title: 'Phòng cho bố mẹ',
    detail: 'Một phòng kín có giường đôi, tủ áo, đã lát gạch',
    reward: 12000,
    needs: ['bed2', 'wardrobe'],
    tiled: true,
  },
  {
    id: 'khach',
    title: 'Phòng khách tiếp khách',
    detail: 'Sofa, bàn trà, kệ ti vi trong một phòng đã lát gạch',
    reward: 10000,
    needs: ['sofa', 'coffee', 'tv'],
    tiled: true,
  },
  {
    id: 'bep',
    title: 'Bếp nấu được cơm',
    detail: 'Bếp ga, tủ lạnh, bàn ăn trong một phòng đã lát gạch',
    reward: 11000,
    needs: ['stove', 'fridge', 'dining'],
    tiled: true,
  },
  {
    id: 'con',
    title: 'Góc học của con',
    detail: 'Giường đơn, bàn học, kệ sách trong một phòng đã lát gạch',
    reward: 9000,
    needs: ['bed1', 'desk', 'shelf'],
    tiled: true,
  },
  {
    id: 'tho',
    title: 'Nơi thờ cúng ông bà',
    detail: 'Bàn thờ gia tiên trong phòng khách đã có sofa',
    reward: 6000,
    needs: ['altar', 'sofa'],
  },
  {
    id: 'xanh',
    title: 'Nhà nhiều cây xanh',
    detail: 'Bốn chậu cây ở bất cứ đâu trong nhà',
    reward: 5000,
    needs: [],
    anywhere: { kind: 'plant', count: 4 },
  },
];

/** Tên phòng theo món đặc trưng bên trong (thứ tự là ưu tiên). */
export const ROOM_NAMES: [Kind, string][] = [
  ['bed2', 'Phòng bố mẹ'],
  ['bed1', 'Phòng con'],
  ['stove', 'Bếp'],
  ['fridge', 'Bếp'],
  ['sofa', 'Phòng khách'],
  ['tv', 'Phòng khách'],
  ['altar', 'Phòng thờ'],
];

export type { TileId };
