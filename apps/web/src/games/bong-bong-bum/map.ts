// Bản đồ lưới 15×13 và mười chủ đề. Phần này thuần dữ liệu (không đụng canvas/DOM)
// để logic trận đấu và test dùng lại được.

export const COLS = 15;
export const ROWS = 13;

export const EMPTY = 0;
export const SOFT = 1;
export const HARD = 2;
export type Tile = typeof EMPTY | typeof SOFT | typeof HARD;

export type ThemeId =
  | 'schoolyard'
  | 'floatingMarket'
  | 'beach'
  | 'shipDeck'
  | 'treasureIsland'
  | 'fishingPort'
  | 'palmGrove'
  | 'coralCave'
  | 'volcano'
  | 'iceIsland'
  | 'pirateIsland'
  | 'dragonIsland'
  | 'threeLanes';

export type HardStyle =
  | 'brick'
  | 'post'
  | 'rock'
  | 'palm'
  | 'cannon'
  | 'fence'
  | 'lavaRock'
  | 'cactus'
  | 'wreck'
  | 'tree'
  | 'coral'
  | 'flag'
  | 'water'
  | 'lava';
export type SoftStyle =
  | 'box'
  | 'basket'
  | 'castle'
  | 'barrel'
  | 'bush'
  | 'chest'
  | 'egg'
  | 'gold'
  | 'darkRock'
  | 'crate'
  | 'pot';
export type Decor =
  | 'skull'
  | 'shell'
  | 'bone'
  | 'coin'
  | 'gem'
  | 'crown'
  | 'flower'
  | 'ball'
  | 'leaf'
  | 'fish'
  | 'starfish'
  | 'pebble'
  | 'rope'
  | 'snow'
  | 'ember';

/**
 * Bố cục: mỗi ô là 'empty' (luôn trống), 'random' (có thể thành khối mềm), 'hard' (khối cố định
 * theo kiểu của chủ đề) hoặc tên một kiểu khối cố định cụ thể — vd 'water', 'lava', 'fence'.
 * Nước và dung nham chặn người và vụ nổ y như khối cố định, chỉ khác hình vẽ.
 */
export type Layout = (x: number, y: number) => 'empty' | 'random' | 'hard' | HardStyle;

export type Theme = {
  id: ThemeId;
  name: string;
  blurb: string;
  layout: Layout;
  /** Tỉ lệ ô 'random' thành khối mềm. */
  softChance: number;
  floorStyle: 'grass' | 'planks' | 'sand' | 'stone' | 'ice';
  /** Các kiểu khối cố định; mỗi ô chọn một kiểu theo vị trí để bản đồ đỡ đơn điệu. */
  hardStyles: HardStyle[];
  softStyles: SoftStyle[];
  /** Đồ trang trí rải trên sàn (không ảnh hưởng luật chơi). */
  decor?: Decor[];
  floor: [string, string];
  hard: string;
  hardTop: string;
  soft: string;
  softTop: string;
  /** Màu trang trí riêng (vạch sân, cờ, dây buộc…). */
  accent: string;
  /** Vẽ vạch sân bóng lên sàn. */
  courtLines?: boolean;
};

const odd = (n: number) => n % 2 === 1;
/** Cột ở mọi ô (lẻ, lẻ) — kiểu bàn cờ cổ điển. */
const pillars = (x: number, y: number) => odd(x) && odd(y);

const LAYOUTS = {
  classic: ((x, y) => (pillars(x, y) ? 'hard' : 'random')) as Layout,
  /** Một con kênh trống chạy dọc giữa bản đồ. */
  canal: ((x, y) => {
    if (x === 7) return (y >= 2 && y <= 4) || (y >= 8 && y <= 10) ? 'water' : 'empty';
    return pillars(x, y) ? 'hard' : 'random';
  }) as Layout,
  /** Quảng trường trống ở giữa. */
  plaza: ((x, y) => {
    if (Math.abs(x - 7) <= 2 && Math.abs(y - 6) <= 1) return 'empty';
    if ((x === 3 || x === 11) && y === 6) return 'water';
    return pillars(x, y) ? 'hard' : 'random';
  }) as Layout,
  /** Cột buồm thưa: ít khối cố định, nhiều chỗ chạy. */
  masts: ((x, y) =>
    [2, 6, 8, 12].includes(x) && [2, 6, 10].includes(y) ? 'hard' : 'random') as Layout,
  /** Rương kho báu giữa đảo: vòng đá đứt quãng quanh tâm. */
  ring: ((x, y) => {
    const d = Math.abs(x - 7) + Math.abs(y - 6);
    if (d <= 1) return 'empty';
    if (d === 4 && x !== 7 && y !== 6) return 'hard';
    return pillars(x, y) && d > 5 ? 'hard' : 'random';
  }) as Layout,
  /** Cầu tàu: hai dãy tường ngang có lối qua. */
  piers: ((x, y) =>
    (y === 3 || y === 9) && ((x >= 3 && x <= 5) || (x >= 9 && x <= 11))
      ? 'water'
      : pillars(x, y)
        ? 'hard'
        : 'random') as Layout,
  /** Rừng: cột cổ điển lẫn vài gốc cây ở giao lộ. */
  grove: ((x, y) =>
    pillars(x, y) ||
    (!odd(x) && !odd(y) && x > 1 && x < 13 && y > 1 && y < 11 && (x * 7 + y * 3) % 11 === 0)
      ? 'hard'
      : 'random') as Layout,
  /** Hang: tường chắn ngang ở hàng 3 và 9. */
  cave: ((x, y) =>
    pillars(x, y) || ((y === 3 || y === 9) && x % 4 === 0 && x > 0 && x < 14)
      ? 'hard'
      : 'random') as Layout,
  /** Miệng núi lửa có bốn cửa ở giữa bản đồ. */
  crater: ((x, y) => {
    const ring = Math.max(Math.abs(x - 7), Math.abs(y - 6));
    if (ring < 2) return 'empty';
    if (ring === 2) return x === 7 || y === 6 ? 'empty' : 'lava';
    return pillars(x, y) ? 'hard' : 'random';
  }) as Layout,
  /** Vịnh hải tặc: lạch nước ăn vào từ mép phải, hai hàng rào gỗ. */
  cove: ((x, y) => {
    if ((x >= 12 && (y === 5 || y === 6)) || (x === 11 && y === 6)) return 'water';
    if ((y === 1 && x >= 3 && x <= 6) || (y === 11 && x >= 8 && x <= 11)) return 'fence';
    return pillars(x, y) ? 'hard' : 'random';
  }) as Layout,
  /** Sông dung nham uốn khúc chắn ngang đảo, chỉ vòng qua hai mép. */
  lavaFlow: ((x, y) => {
    if (
      (y === 5 && x >= 4 && x <= 9) ||
      (x === 9 && y >= 5 && y <= 8) ||
      (y === 8 && x >= 9 && x <= 12) ||
      (y === 10 && x >= 2 && x <= 5)
    )
      return 'lava';
    return pillars(x, y) ? 'hard' : 'random';
  }) as Layout,
  /** Ba làn đường ngăn bằng tường dọc ở cột 4 và 10, có cửa thông ở hàng 3, 6, 9; vài chỗ nấp trong làn. */
  lanes: ((x, y) => {
    if ((x === 4 || x === 10) && y >= 1 && y <= 11) return [3, 6, 9].includes(y) ? 'empty' : 'hard';
    if ((x === 2 || x === 12 || x === 7) && (y === 4 || y === 8)) return 'hard';
    return 'random';
  }) as Layout,
  /** Băng rộng: cột rất thưa. */
  open: ((x, y) => (x % 4 === 3 && y % 4 === 1 ? 'hard' : 'random')) as Layout,
};

export const THEMES: Theme[] = [
  {
    id: 'schoolyard',
    name: 'Sân trường',
    blurb: 'Cột gạch, thùng giấy và vạch sân bóng.',
    layout: LAYOUTS.classic,
    softChance: 0.72,
    floorStyle: 'grass',
    hardStyles: ['brick', 'tree', 'brick'],
    softStyles: ['box', 'crate', 'box'],
    decor: ['flower', 'ball', 'leaf', 'flower'],
    courtLines: true,
    floor: ['#8fd16a', '#84c862'],
    hard: '#b4553f',
    hardTop: '#d97a5b',
    soft: '#c98b4a',
    softTop: '#e8b26c',
    accent: '#f4f7e8',
  },
  {
    id: 'floatingMarket',
    name: 'Chợ nổi',
    blurb: 'Sàn ván trên sông, kênh giữa chợ và sọt trái cây.',
    layout: LAYOUTS.canal,
    softChance: 0.72,
    floorStyle: 'planks',
    hardStyles: ['post', 'post', 'tree'],
    softStyles: ['basket', 'pot', 'crate'],
    decor: ['leaf', 'fish', 'flower'],
    floor: ['#c9915c', '#bd8653'],
    hard: '#5d4030',
    hardTop: '#7c5a43',
    soft: '#d8b25f',
    softTop: '#f0cf7b',
    accent: '#ff7a3d',
  },
  {
    id: 'beach',
    name: 'Bãi biển',
    blurb: 'Cát vàng, ghềnh đá và lâu đài cát quanh quảng trường.',
    layout: LAYOUTS.plaza,
    softChance: 0.7,
    floorStyle: 'sand',
    hardStyles: ['rock', 'palm', 'rock'],
    softStyles: ['castle', 'crate', 'castle'],
    decor: ['starfish', 'shell', 'pebble'],
    floor: ['#f6dc9a', '#efd28c'],
    hard: '#7d8a99',
    hardTop: '#a3b0be',
    soft: '#e9b863',
    softTop: '#f8d488',
    accent: '#4cc3f0',
  },
  {
    id: 'shipDeck',
    name: 'Boong tàu',
    blurb: 'Cột buồm thưa và thùng rượu lăn khắp boong.',
    layout: LAYOUTS.masts,
    softChance: 0.62,
    floorStyle: 'planks',
    hardStyles: ['post', 'cannon', 'flag', 'post'],
    softStyles: ['barrel', 'crate', 'barrel'],
    decor: ['rope', 'pebble'],
    floor: ['#a8784a', '#9c6f44'],
    hard: '#4a3426',
    hardTop: '#6b4c38',
    soft: '#a0643a',
    softTop: '#c98652',
    accent: '#e0b23a',
  },
  {
    id: 'treasureIsland',
    name: 'Đảo kho báu',
    blurb: 'Rương báu, đống vàng, đá quý và xác tàu giữa bãi cỏ.',
    layout: LAYOUTS.ring,
    softChance: 0.7,
    floorStyle: 'sand',
    hardStyles: ['palm', 'wreck', 'rock', 'palm'],
    softStyles: ['chest', 'gold', 'bush', 'gold'],
    decor: ['coin', 'gem', 'crown', 'coin'],
    floor: ['#f2d48a', '#ead083'],
    hard: '#8a7f73',
    hardTop: '#b0a596',
    soft: '#3e9b4f',
    softTop: '#5cc26a',
    accent: '#ffd23f',
  },
  {
    id: 'fishingPort',
    name: 'Cảng cá',
    blurb: 'Hai dãy cầu tàu chắn ngang, thùng cá xếp chồng.',
    layout: LAYOUTS.piers,
    softChance: 0.7,
    floorStyle: 'stone',
    hardStyles: ['post', 'rock', 'post'],
    softStyles: ['barrel', 'crate'],
    decor: ['fish', 'rope', 'pebble'],
    floor: ['#9aa5b1', '#909ba7'],
    hard: '#3f4a57',
    hardTop: '#5d6b7a',
    soft: '#3f7fb5',
    softTop: '#62a2d6',
    accent: '#ffffff',
  },
  {
    id: 'palmGrove',
    name: 'Rừng dừa',
    blurb: 'Gốc dừa mọc giữa lối đi, bụi cây rậm rạp.',
    layout: LAYOUTS.grove,
    softChance: 0.74,
    floorStyle: 'grass',
    hardStyles: ['palm', 'tree', 'rock', 'palm'],
    softStyles: ['bush', 'crate', 'bush'],
    decor: ['leaf', 'flower', 'pebble'],
    floor: ['#6fbf5a', '#66b553'],
    hard: '#6d7a63',
    hardTop: '#8d9a82',
    soft: '#2f7d3c',
    softTop: '#48a356',
    accent: '#c98652',
  },
  {
    id: 'coralCave',
    name: 'Hang san hô',
    blurb: 'Vách san hô hồng chắn ngang hang, hải quỳ tím mềm.',
    layout: LAYOUTS.cave,
    softChance: 0.7,
    floorStyle: 'stone',
    hardStyles: ['coral', 'rock', 'coral'],
    softStyles: ['bush', 'chest', 'bush'],
    decor: ['shell', 'starfish', 'fish'],
    floor: ['#2f8f9d', '#2a8592'],
    hard: '#c94f6d',
    hardTop: '#f07d99',
    soft: '#6a4fd8',
    softTop: '#9c84ff',
    accent: '#bdf3ff',
  },
  {
    id: 'volcano',
    name: 'Núi lửa',
    blurb: 'Miệng núi lửa bốn cửa ở giữa, đá bazan nóng rực.',
    layout: LAYOUTS.crater,
    softChance: 0.7,
    floorStyle: 'stone',
    hardStyles: ['lavaRock', 'rock', 'lavaRock'],
    softStyles: ['darkRock', 'box'],
    decor: ['ember', 'bone', 'ember'],
    floor: ['#5a4a4f', '#524348'],
    hard: '#2e2a30',
    hardTop: '#4a444d',
    soft: '#b5502a',
    softTop: '#e8803f',
    accent: '#ff7a1a',
  },
  {
    id: 'iceIsland',
    name: 'Đảo băng',
    blurb: 'Bãi băng rộng thênh thang, khối tuyết mềm khắp nơi.',
    layout: LAYOUTS.open,
    softChance: 0.66,
    floorStyle: 'ice',
    hardStyles: ['rock', 'tree', 'rock'],
    softStyles: ['box', 'crate'],
    decor: ['snow', 'pebble', 'snow'],
    floor: ['#dff3fb', '#d2ecf7'],
    hard: '#6fa6cc',
    hardTop: '#a9d4ee',
    soft: '#c9e4f2',
    softTop: '#ffffff',
    accent: '#4cc3f0',
  },
  {
    id: 'pirateIsland',
    name: 'Đảo hải tặc',
    blurb: 'Lạch nước, cây dừa, đại bác, thùng rượu và rương cướp biển.',
    layout: LAYOUTS.cove,
    softChance: 0.7,
    floorStyle: 'sand',
    hardStyles: ['palm', 'cannon', 'flag', 'palm', 'post'],
    softStyles: ['barrel', 'barrel', 'chest'],
    decor: ['skull', 'shell', 'shell'],
    floor: ['#f0cf7e', '#e8c675'],
    hard: '#4a3426',
    hardTop: '#6b4c38',
    soft: '#8a5a32',
    softTop: '#b37a48',
    accent: '#1d2147',
  },
  {
    id: 'dragonIsland',
    name: 'Đảo rồng',
    blurb: 'Sông dung nham uốn khúc, đá núi lửa, xương rồng và trứng rồng.',
    layout: LAYOUTS.lavaFlow,
    softChance: 0.7,
    floorStyle: 'stone',
    hardStyles: ['lavaRock', 'lavaRock', 'cactus'],
    softStyles: ['egg', 'darkRock', 'darkRock'],
    decor: ['bone', 'ember', 'ember'],
    floor: ['#3d3a40', '#363339'],
    hard: '#2e2a30',
    hardTop: '#4a444d',
    soft: '#c0392b',
    softTop: '#ff8a3a',
    accent: '#ffb22e',
  },
  {
    id: 'threeLanes',
    name: 'Căn cứ 3 lối',
    blurb: 'Ba làn đường ngăn tường, cửa thông và chỗ nấp — đánh chiến thuật.',
    layout: LAYOUTS.lanes,
    softChance: 0.6,
    floorStyle: 'stone',
    hardStyles: ['brick', 'brick', 'post'],
    softStyles: ['box', 'crate'],
    decor: ['pebble', 'rope'],
    floor: ['#c9bfa8', '#c0b69f'],
    hard: '#6b6f7a',
    hardTop: '#8e93a0',
    soft: '#7a8a5a',
    softTop: '#9aab72',
    accent: '#ff6b6b',
  },
];

/** Số giả ngẫu nhiên cố định theo ô, để chọn kiểu khối/đồ trang trí mà lần nào vẽ cũng giống nhau. */
export const cellHash = (x: number, y: number) => (((x * 73856093) ^ (y * 19349663)) >>> 0) % 997;

export function hardStyleAt(theme: Theme, x: number, y: number): HardStyle {
  const kind = theme.layout(x, y);
  if (kind !== 'hard' && kind !== 'empty' && kind !== 'random') return kind;
  return theme.hardStyles[cellHash(x, y) % theme.hardStyles.length]!;
}

export function softStyleAt(theme: Theme, x: number, y: number): SoftStyle {
  return theme.softStyles[cellHash(x, y) % theme.softStyles.length]!;
}

export function themeById(id: ThemeId): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]!;
}

/** Sáu chỗ xuất phát theo thứ tự P1–P6: bốn góc trước, rồi giữa mép trên và mép dưới. */
export const SPAWNS: readonly (readonly [number, number])[] = [
  [0, 0],
  [COLS - 1, ROWS - 1],
  [COLS - 1, 0],
  [0, ROWS - 1],
  [(COLS - 1) / 2, 0],
  [(COLS - 1) / 2, ROWS - 1],
];
export const MAX_PLAYERS = SPAWNS.length;

export type Dir = 'up' | 'down' | 'left' | 'right';
export const DIRS: readonly Dir[] = ['up', 'down', 'left', 'right'];
export const VEC: Record<Dir, readonly [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

export const idx = (x: number, y: number) => y * COLS + x;

/** Ô nằm trên cùng hàng/cột với chỗ xuất phát, cách tối đa 2 ô: luôn để trống cho người mới có chỗ né. */
export function isSafe(x: number, y: number): boolean {
  return SPAWNS.some(
    ([sx, sy]) => (x === sx && Math.abs(y - sy) <= 2) || (y === sy && Math.abs(x - sx) <= 2),
  );
}

/**
 * Bộ sinh số giả ngẫu nhiên (mulberry32) có hạt giống: cùng hạt giống thì cùng kết quả,
 * cần cho chơi qua mạng và cho test. Trạng thái là một số nguyên để lưu được trong trạng thái trận.
 */
export function nextRandom(state: number): [value: number, next: number] {
  const next = (state + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

export function createMap(seed: number, theme: Theme = THEMES[0]!): Tile[] {
  let state = seed >>> 0;
  const rand = () => {
    const [v, next] = nextRandom(state);
    state = next;
    return v;
  };
  const tiles: Tile[] = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const kind = theme.layout(x, y);
      if (kind === 'empty' || (kind === 'random' && isSafe(x, y))) tiles.push(EMPTY);
      else if (kind === 'random') tiles.push(rand() < theme.softChance ? SOFT : EMPTY);
      else tiles.push(HARD);
    }
  }
  return tiles;
}
