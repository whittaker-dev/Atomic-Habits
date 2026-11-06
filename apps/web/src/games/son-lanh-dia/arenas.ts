// Bốn sân riêng của Sơn Lãnh Địa: rộng và thoáng để có chỗ sơn, ít vật cản hơn bản đồ Bomb Arena.
// Vẽ bằng chữ cho dễ đọc và dễ sửa, mỗi chuỗi là một hàng (15 ô), từ trên xuống (13 hàng):
//   .  sàn     C  thùng gỗ     P  cột đá     W  tường thấp     ~  hồ nước
// Mọi vật cản đều chặn đường và bóng sơn như nhau; chỉ khác nhau ở hình vẽ 3D.
// Sáu chỗ xuất phát (bốn góc, giữa mép trên và mép dưới) phải để trống.

export type Prop = 'crate' | 'pillar' | 'wall' | 'pool';
export type ArenaId = 'plaza' | 'crossroads' | 'warehouse' | 'twinPools';
export type Arena = { id: ArenaId; name: string; rows: string[] };

const PROP_OF: Record<string, Prop> = { C: 'crate', P: 'pillar', W: 'wall', '~': 'pool' };

export const ARENAS: Arena[] = [
  {
    id: 'plaza',
    name: 'Hồ trung tâm',
    rows: [
      '...............',
      '...............',
      '..C.........C..',
      '....P.....P....',
      '...............',
      '......~~~......',
      '.WW...~~~...WW.',
      '......~~~......',
      '...............',
      '....P.....P....',
      '..C.........C..',
      '...............',
      '...............',
    ],
  },
  {
    id: 'crossroads',
    name: 'Ngã tư',
    rows: [
      '...............',
      '...............',
      '.......W.......',
      '...P...W...P...',
      '...............',
      '...............',
      '..WWW..C..WWW..',
      '...............',
      '...............',
      '...P...W...P...',
      '.......W.......',
      '...............',
      '...............',
    ],
  },
  {
    id: 'warehouse',
    name: 'Kho thùng',
    rows: [
      '...............',
      '...............',
      '..CC.......CC..',
      '..C....P....C..',
      '...............',
      '.....C...C.....',
      '...P.......P...',
      '.....C...C.....',
      '...............',
      '..C....P....C..',
      '..CC.......CC..',
      '...............',
      '...............',
    ],
  },
  {
    id: 'twinPools',
    name: 'Hai hồ',
    rows: [
      '...............',
      '...............',
      '......WWW......',
      '..C.........C..',
      '...~~.....~~...',
      '...~~..P..~~...',
      '...~~.....~~...',
      '...~~..P..~~...',
      '...~~.....~~...',
      '..C.........C..',
      '......WWW......',
      '...............',
      '...............',
    ],
  },
];

export function arenaById(id: ArenaId): Arena {
  return ARENAS.find((a) => a.id === id) ?? ARENAS[0]!;
}

/** Vật cản ở ô (x, y); null là sàn trống. */
export function propAt(arena: Arena, x: number, y: number): Prop | null {
  return PROP_OF[arena.rows[y]?.[x] ?? '.'] ?? null;
}
