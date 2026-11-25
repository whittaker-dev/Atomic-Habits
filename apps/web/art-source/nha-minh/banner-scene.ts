// Cảnh cho banner Nhà Mình (banner.html): dựng một căn nhà mẫu bằng đúng luật (engine.ts) và vẽ bằng
// đúng cảnh 3D của game (view3d.ts), gạch quỹ chung bằng đúng hàm vẽ gạch (tiles.ts). Không phải bản
// vẽ lại: sửa game thì xuất lại banner là khớp.
// Đóng gói thành một script thường (iife) để banner.html mở thẳng từ file:// được; lệnh ở banner.html.

import {
  apply,
  createHouse,
  fund,
  left,
  type Action,
  type Seat,
} from '../../src/games/nha-minh/engine';
import { createHouseView } from '../../src/games/nha-minh/view3d';
import { seatTileUrl, tileUrl, type TileId } from '../../src/games/nha-minh/tiles';

const house = createHouse('banner', 'BANNER', 'Lan', 0);
house.players[1] = 'Minh';

// Phòng khách lát hoa thị bên trái (Lan bày), phòng ngủ lát bàn cờ bên phải (Minh bày).
const steps: [Seat, Action][] = [
  [0, { a: 'wall', x1: 6, y1: 0, x2: 6, y2: 8 }],
  [0, { a: 'open', edge: 'v:6:4', kind: 'door' }],
  [0, { a: 'open', edge: 'h:2:0', kind: 'window' }],
  [1, { a: 'open', edge: 'h:8:0', kind: 'window' }],
  [0, { a: 'tile', x: 1.5, y: 1.5, tile: 'hoa-thi' }],
  [1, { a: 'tile', x: 8.5, y: 1.5, tile: 'ban-co' }],
  [0, { a: 'place', kind: 'sofa', x: 3, y: 0.6, rot: 0 }],
  [0, { a: 'place', kind: 'rug', x: 3, y: 2.2, rot: 0 }],
  [0, { a: 'place', kind: 'coffee', x: 3, y: 2.2, rot: 0 }],
  [1, { a: 'place', kind: 'tv', x: 3, y: 3.9, rot: 2 }],
  [0, { a: 'place', kind: 'plant', x: 0.45, y: 0.45, rot: 0 }],
  [1, { a: 'place', kind: 'plant', x: 5.55, y: 0.45, rot: 0 }],
  [1, { a: 'place', kind: 'bed2', x: 8, y: 1.25, rot: 0 }],
];
for (const [seat, act] of steps) {
  const r = apply(house, seat, act, 0);
  if (!r.ok) throw new Error(`${act.a}: ${r.reason}`);
}

const stage = document.getElementById('stage')!;
const view = createHouseView(stage);
view.setHouse(house);
const sofa = house.pieces.find((p) => p.kind === 'sofa')!;
view.setSelections([{ seat: 0, id: sofa.id }]);
view.setGhosts([{ seat: 1, kind: 'wardrobe', x: 8.6, y: 7.4, rot: 2, valid: true }]);
view.label(document.getElementById('tag-a')!).move([sofa.x, 1.3, sofa.y]);
view.label(document.getElementById('tag-b')!).move([8.6, 2.3, 7.4]);

// Mấy viên gạch mẫu và dải viền trên cùng.
document.querySelectorAll<HTMLElement>('[data-t]').forEach((el) => {
  el.style.backgroundImage = `url(${tileUrl(el.dataset.t as TileId, 128)})`;
});
const band = document.getElementById('band')!;
band.style.backgroundImage = `url(${tileUrl('hoa-thi', 128)})`;

// Hàng gạch quỹ chung đúng như trong game: mỗi người lát gạch hoa thị màu mình từ phía mình.
const total = fund(house);
const strip = document.getElementById('strip')!;
const a = Math.round((house.spent[0] / total) * 24);
const b = Math.round((house.spent[1] / total) * 24);
for (let i = 0; i < 24; i++) {
  const t = document.createElement('i');
  const seat = i < a ? 0 : i >= 24 - b ? 1 : null;
  if (seat !== null) t.style.backgroundImage = `url(${seatTileUrl(seat, 96)})`;
  else t.className = 'empty';
  strip.appendChild(t);
}
const money = (n: number) => `${n.toLocaleString('vi-VN')} ₫`;
document.getElementById('left')!.textContent = money(left(house));
