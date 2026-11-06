import type { Match } from './engine';

// Đội sơn: tám nhân vật riêng của Sơn Lãnh Địa, chibi 3D vác súng sơn. Mỗi người một màu sơn —
// chơi mỗi người một phe thì sàn của bạn mang đúng màu nhân vật bạn chọn.
// Ảnh: mỗi người ba góc nhìn render 3D — <id>.png (mặt trước), <id>-back.png (sau lưng),
// <id>-side.png (nhìn ngang, đang chạy sang phải). Bản gốc ở art-source/son-lanh-dia/characters/,
// cắt nền bằng scripts/cut-character-art.mjs --agents rồi đặt ở public/games/son-lanh-dia/characters/.

export const SQUAD_BASE = '/games/son-lanh-dia/characters';

export type Squadie = {
  id: string;
  name: string;
  color: string;
  blurb: string;
};

export const SQUAD: Squadie[] = [
  {
    id: 'mochi',
    name: 'Mochi',
    color: '#ff4fa3',
    blurb: 'Hai búi tóc hồng, chạy tới đâu sàn hồng tới đó.',
  },
  {
    id: 'bin',
    name: 'Bin',
    color: '#2bb8f5',
    blurb: 'Kính bơi trên trán, bắn đâu trúng đó.',
  },
  {
    id: 'kem',
    name: 'Kem',
    color: '#ffd23f',
    blurb: 'Cây lăn sơn to hơn người, lăn một đường vàng rực.',
  },
  {
    id: 'bo',
    name: 'Bơ',
    color: '#8ad83a',
    blurb: 'Nhúm tóc lá trên đầu, cười toe khi sàn xanh lè.',
  },
  {
    id: 'tom',
    name: 'Tôm',
    color: '#ff8a2a',
    blurb: 'Băng đô trắng, nhảy cẫng lên mỗi lần bắn trúng.',
  },
  {
    id: 'na',
    name: 'Na',
    color: '#9b6bff',
    blurb: 'Đuôi ngựa tím, vác súng sơn trên vai thật ngầu.',
  },
  {
    id: 'su',
    name: 'Su',
    color: '#ff4545',
    blurb: 'Mũ lưỡi trai ngược, hai tay hai súng sơn đỏ.',
  },
  {
    id: 'mit',
    name: 'Mít',
    color: '#1fc7b6',
    blurb: 'Mũ len xanh, ôm khẩu bazooka sơn to đùng.',
  },
];

/** Màu hai đội khi chơi đồng đội — khác hẳn nhau để nhìn sàn là biết bên nào đang thắng. */
export const TEAM_COLORS = ['#ff4fa3', '#2bb8f5'] as const;

export function squadById(id: string): Squadie {
  return SQUAD.find((s) => s.id === id) ?? SQUAD[0]!;
}

export type SquadView = 'front' | 'back' | 'side';
export const squadImage = (id: string, view: SquadView = 'front') =>
  `${SQUAD_BASE}/${id}${view === 'front' ? '' : `-${view}`}.png`;

/** Màu sơn theo phe (chỉ số mảng = số phe trong engine). */
export function teamColors(m: Pick<Match, 'players' | 'teams'>): string[] {
  if (m.teams) return [...TEAM_COLORS];
  const out: string[] = [];
  for (const p of m.players) out[p.team] = squadById(p.charId).color;
  return out;
}
