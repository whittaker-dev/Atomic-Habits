import { SIZE } from './data';

// Hình học bàn Cờ tỷ phú: 40 ô quanh một hình vuông, mỗi cạnh 9 ô hẹp giữa hai ô góc vuông.
// Ô 0 (Xuất phát) ở góc dưới phải, đi ngược chiều kim đồng hồ khi nhìn từ trên: dọc cạnh dưới sang
// trái, lên cạnh trái, dọc cạnh trên sang phải, xuống cạnh phải. Đơn vị là đơn vị cảnh 3D; tâm bàn
// ở (0, 0), trục x sang phải, trục z hướng về người xem (cạnh dưới).

export const CORNER = 1.5;
export const CELL = 0.9;
export const DEPTH = 1.5;
export const BOARD_SIZE = CORNER * 2 + CELL * 9;
const H = BOARD_SIZE / 2;

/** Cạnh của ô: 0 dưới, 1 trái, 2 trên, 3 phải. Ô góc thuộc cạnh bắt đầu từ nó. */
export const sideOf = (i: number) => Math.floor(i / 10);
export const isCorner = (i: number) => i % 10 === 0;

export type Rect = { x: number; z: number; w: number; d: number; side: number };

/** Tâm và kích thước một ô (w theo trục x, d theo trục z). */
export function rectOf(i: number): Rect {
  const side = sideOf(i);
  const k = i % 10;
  if (k === 0) {
    const pos = [
      [H - CORNER / 2, H - CORNER / 2],
      [-H + CORNER / 2, H - CORNER / 2],
      [-H + CORNER / 2, -H + CORNER / 2],
      [H - CORNER / 2, -H + CORNER / 2],
    ][side]!;
    return { x: pos[0]!, z: pos[1]!, w: CORNER, d: CORNER, side };
  }
  const along = CORNER + CELL * (k - 1) + CELL / 2;
  switch (side) {
    case 0:
      return { x: H - along, z: H - DEPTH / 2, w: CELL, d: DEPTH, side };
    case 1:
      return { x: -H + DEPTH / 2, z: H - along, w: DEPTH, d: CELL, side };
    case 2:
      return { x: -H + along, z: -H + DEPTH / 2, w: CELL, d: DEPTH, side };
    default:
      return { x: H - DEPTH / 2, z: -H + along, w: DEPTH, d: CELL, side };
  }
}

/** Hướng từ mép ngoài vào trong của ô (để đặt dải màu, nhà, quân). */
export function inward(side: number): [number, number] {
  return (
    [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ] as const
  )[side]!.slice() as [number, number];
}

export const ALL = Array.from({ length: SIZE }, (_, i) => i);
