import { characterArt } from './art';
import { drawArtCharacter, groundShadow, hoverOf, type Pose } from './character-renderer';
import type { CharacterDef } from './characters';
import type { ItemKind } from './engine';
import {
  cellHash,
  COLS,
  HARD,
  hardStyleAt,
  idx,
  ROWS,
  SOFT,
  softStyleAt,
  type Decor,
  type Dir,
  type HardStyle,
  type SoftStyle,
  type Theme,
  type Tile,
} from './map';
import { PALETTE, SEAT_COLORS } from './palette';

// Vẽ bằng canvas, góc nhìn từ trên xuống hơi chếch (3/4) để khối và nhân vật có chiều cao.
// Mọi hình được thiết kế trong một ô 48×48 "đơn vị" rồi phóng theo kích thước ô thật,
// nên cùng một hàm vẽ dùng được cho bản đồ, ảnh đại diện và ảnh bìa.
// Phần vẽ chỉ đọc một Scene (ảnh chụp trạng thái), không giữ logic trận đấu.

type Ctx = CanvasRenderingContext2D;
export type { Pose };

export const UNIT = 48;
const INK = PALETTE.ink;
const LINE = 2.5;
const TAU = Math.PI * 2;

export type SceneBomb = { x: number; y: number; seat: number; age: number };
export type SceneBlast = {
  x: number;
  y: number;
  up: number;
  down: number;
  left: number;
  right: number;
  age: number;
};
export type SceneItem = { x: number; y: number; kind: ItemKind };
export type ScenePlayer = {
  x: number;
  y: number;
  def: CharacterDef;
  dir: Dir;
  pose: Pose;
  seat: number;
  /** Phân thân: vẽ mờ để phân biệt với người thật. */
  ghost?: boolean;
  /** Số giây còn lại trong bong bóng; chỉ có khi đang bị nhốt. */
  trapLeft?: number;
  shield?: boolean;
};
export type SceneEffect = {
  kind: 'dust' | 'print' | 'spark';
  x: number;
  y: number;
  age: number;
  life: number;
  angle: number;
};

export type Scene = {
  theme: Theme;
  tiles: Tile[];
  bombs: SceneBomb[];
  blasts: SceneBlast[];
  /** Bụi chân, dấu chân, vệt lấp lánh của người bay — chỉ để nhìn, không thuộc trạng thái trận. */
  effects?: SceneEffect[];
  /** Hố Đen đang xoáy: `t` là thời gian còn lại (giây). */
  holes?: { x: number; y: number; t: number }[];
  items: SceneItem[];
  players: ScenePlayer[];
};

// ---------------------------------------------------------------------------
// Nét vẽ cơ bản
// ---------------------------------------------------------------------------

function inUnits(c: Ctx, x: number, y: number, size: number, draw: () => void) {
  c.save();
  c.translate(x, y);
  c.scale(size / UNIT, size / UNIT);
  draw();
  c.restore();
}

function paint(c: Ctx, fill: string, stroke = true) {
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.lineWidth = LINE;
    c.lineJoin = 'round';
    c.strokeStyle = INK;
    c.stroke();
  }
}

function oval(c: Ctx, x: number, y: number, rx: number, ry: number, fill: string, stroke = true) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, TAU);
  paint(c, fill, stroke);
}

function box(
  c: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
  stroke = true,
) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  paint(c, fill, stroke);
}

function line(c: Ctx, pts: [number, number][], color: string, width: number) {
  c.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? c.moveTo(x, y) : c.lineTo(x, y)));
  c.lineWidth = width;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.strokeStyle = color;
  c.stroke();
}

// ---------------------------------------------------------------------------
// Nhân vật chibi: gốc toạ độ ở giữa hai bàn chân, thiết kế hướng sang trái (phải = lật gương)
// ---------------------------------------------------------------------------

export function drawCharacter(
  c: Ctx,
  d: CharacterDef,
  x: number,
  y: number,
  size: number,
  dir: Dir,
  pose: Pose,
  frame: number,
) {
  const art = characterArt(d.id);
  if (art) {
    inUnits(c, x, y, size, () =>
      drawArtCharacter(c, d, art, characterArt(d.id, true)!, dir, pose, frame),
    );
    return;
  }
  inUnits(c, x, y, size, () => {
    const side = dir === 'left' || dir === 'right';
    const back = dir === 'up';
    if (dir === 'right') c.scale(-1, 1);

    const step = frame * 0.28;
    let lift = (Math.sin(frame * 0.08) + 1) * 0.6;
    let legA = 0;
    let swing = 0;
    let armsUp = false;
    if (pose === 'walk') {
      legA = Math.sin(step) * 3;
      swing = Math.sin(step) * 3;
      lift = Math.abs(Math.sin(step)) * 2;
    } else if (pose === 'trapped') {
      lift = 7 + Math.sin(frame * 0.1) * 2;
      armsUp = true;
    } else if (pose === 'win') {
      lift = Math.abs(Math.sin(frame * 0.12)) * 10;
      armsUp = true;
    }

    const hover = hoverOf(d, frame);
    groundShadow(c, d, lift, 13, 4);
    c.translate(0, -lift - hover);

    // Chân + giày
    const legs: [number, number][] = side
      ? [
          [-3 + legA, 0],
          [3 - legA, 0],
        ]
      : [
          [-5, -Math.max(0, legA)],
          [5, -Math.max(0, -legA)],
        ];
    for (const [lx, dy] of legs) {
      box(c, lx - 4, -13 + dy, 8, 11, 3, d.pants);
      box(c, lx - 5, -5 + dy, 10, 5, 2.5, d.shoes);
    }

    // Phía sau đầu: bím tóc của Su nằm sau thân khi nhìn nghiêng/nhìn từ sau; tóc dài xoã sau lưng
    if (d.hairStyle === 'pigtails' && (side || back)) drawPigtails(c, d, side);
    if (d.hairStyle === 'long') oval(c, side ? 5 : 0, -30, side ? 12 : 17, 14, d.hair);
    if (d.hat?.startsWith('hood'))
      oval(c, side ? 3 : 0, -28, side ? 11 : 15, 9, d.hatColor ?? d.shirt);

    // Thân áo (có sọc thì cắt theo khung thân)
    const bw = side ? 16 : 22;
    c.beginPath();
    c.roundRect(-bw / 2, -27, bw, 17, 7);
    c.fillStyle = d.shirt;
    c.fill();
    if (d.stripes) {
      c.save();
      c.clip();
      c.fillStyle = d.stripes;
      c.fillRect(-bw / 2, -22, bw, 3);
      c.fillRect(-bw / 2, -16, bw, 3);
      c.restore();
    }
    c.lineWidth = LINE;
    c.strokeStyle = INK;
    c.stroke();
    // Chi tiết áo: vệt sáng bên trái, cổ áo chữ V, thắt lưng.
    oval(c, side ? -4 : -6, -20, 2, 4.5, 'rgba(255,255,255,0.18)', false);
    if (!back)
      line(
        c,
        side
          ? [
              [-6, -26],
              [-3, -22],
            ]
          : [
              [-4, -26.5],
              [0, -22],
              [4, -26.5],
            ],
        'rgba(29,33,71,0.45)',
        1.3,
      );
    line(
      c,
      [
        [-bw / 2 + 1, -12.5],
        [bw / 2 - 1, -12.5],
      ],
      'rgba(29,33,71,0.35)',
      2,
    );

    if (d.beads)
      for (let i = -4; i <= 4; i++)
        oval(c, i * 2.2, -26 + Math.abs(i) * -0.4, 1.4, 1.4, '#8a4a2a', false);

    // Tay
    const arms: [number, number][] = armsUp
      ? side
        ? [[-2, -36]]
        : [
            [-14, -34],
            [14, -34],
          ]
      : side
        ? [[-1 + swing, -19]]
        : [
            [-13, -19 + swing],
            [13, -19 - swing],
          ];
    arms.forEach(([ax, ay], i) => {
      oval(c, ax, ay, 4, armsUp ? 7 : 6, d.shirt);
      oval(c, ax, ay + (armsUp ? -7 : 6), 3.2, 3.2, d.skin);
      const watchArm = side ? true : i === 1;
      if (d.watch && watchArm && !back) {
        box(c, ax - 3.5, ay + (armsUp ? -5 : 2.5), 7, 3, 1, '#c9ced6', false);
        oval(c, ax, ay + (armsUp ? -3.5 : 4), 1.6, 1.6, '#ffd23f', false);
      }
    });

    if (d.prop && !back) drawProp(c, d, side, armsUp);

    // Đầu
    if (d.hairStyle === 'pigtails' && !side && !back) drawPigtails(c, d, false);
    if (d.hairStyle === 'bun') drawBun(c, d, side);
    if (d.hairStyle === 'twinBuns')
      for (const bx of side ? [5] : [-12, 12]) oval(c, bx, -55, 7, 6.5, d.hair);
    if (d.hairStyle === 'topknot') {
      oval(c, side ? 4 : 0, -59, 5.5, 5, d.hair);
      if (side || back)
        line(
          c,
          [
            [side ? 7 : 0, -58],
            [side ? 14 : 0, -44],
          ],
          d.hair,
          4,
        );
    }
    if (d.hat?.startsWith('hood'))
      oval(c, side ? 1 : 0, -41, side ? 18 : 19.5, 18.5, d.hatColor ?? d.shirt);
    const face = d.skull ? '#f1ece0' : d.skin;
    oval(c, side ? -1 : 0, -40, side ? 15 : 16, 15, face);
    if (side && !d.hat?.startsWith('hood')) oval(c, 6, -39, 3, 4, face);

    if (back) {
      oval(
        c,
        0,
        -41,
        17,
        16,
        d.hat?.startsWith('hood')
          ? (d.hatColor ?? d.shirt)
          : d.hairStyle === 'bald'
            ? d.skin
            : d.hair,
      );
    } else if (d.skull) {
      drawSkullFace(c, side);
    } else {
      drawFace(c, d, side, pose);
    }
    if (!d.hat?.startsWith('hood')) {
      drawHair(c, d, side, back);
      // Vệt bóng trên tóc cho cảm giác tóc có khối (trừ đầu trọc và kiểu đội mũ che kín).
      if (
        d.hairStyle !== 'bald' &&
        d.hairStyle !== 'nonLa' &&
        d.hairStyle !== 'tricorn' &&
        !d.hat
      ) {
        c.beginPath();
        c.ellipse(side ? -2 : -1, -50, 10, 5, -0.15, Math.PI * 1.05, Math.PI * 1.6);
        c.lineWidth = 2.2;
        c.lineCap = 'round';
        c.strokeStyle = 'rgba(255,255,255,0.45)';
        c.stroke();
      }
    }
    drawHeadwear(c, d, side, back);
    if (d.parrot) drawParrot(c, side ? 5 : 14, frame);
  });
}

function drawSkullFace(c: Ctx, side: boolean) {
  for (const ex of side ? [-8] : [-6, 6]) oval(c, ex, -41, 4, 4.5, INK, false);
  c.beginPath();
  c.moveTo(side ? -11 : 0, -37);
  c.lineTo(side ? -13 : -1.8, -34);
  c.lineTo(side ? -10 : 1.8, -34);
  c.closePath();
  paint(c, INK, false);
  line(
    c,
    side
      ? [
          [-14, -30],
          [-6, -30],
        ]
      : [
          [-6, -30],
          [6, -30],
        ],
    INK,
    1.4,
  );
  for (const tx of side ? [-12, -9] : [-3, 0, 3])
    line(
      c,
      [
        [tx, -32],
        [tx, -28],
      ],
      INK,
      1,
    );
}

/** Vật cầm tay phía trước người (nhìn ngang thì cầm tay trước). */
function drawProp(c: Ctx, d: CharacterDef, side: boolean, armsUp: boolean) {
  const hx = side ? -2 : 14;
  const hy = armsUp ? -42 : -14;
  const col = d.propColor ?? '#cfd6df';
  switch (d.prop) {
    case 'sword':
      line(
        c,
        [
          [hx, hy],
          [hx + 9, hy - 24],
        ],
        INK,
        4.5,
      );
      line(
        c,
        [
          [hx, hy],
          [hx + 9, hy - 24],
        ],
        col,
        2.5,
      );
      line(
        c,
        [
          [hx - 4, hy - 1],
          [hx + 4, hy - 4],
        ],
        '#8a5a32',
        3,
      );
      return;
    case 'staff':
      line(
        c,
        [
          [hx, hy + 8],
          [hx + 2, hy - 30],
        ],
        INK,
        4,
      );
      line(
        c,
        [
          [hx, hy + 8],
          [hx + 2, hy - 30],
        ],
        '#8a5a32',
        2.2,
      );
      oval(c, hx + 2, hy - 33, 4.5, 4.5, col);
      oval(c, hx + 1, hy - 34.5, 1.5, 1.5, 'rgba(255,255,255,0.8)', false);
      return;
    case 'guitar':
      line(
        c,
        [
          [hx - 6, hy - 2],
          [hx + 10, hy - 22],
        ],
        INK,
        4,
      );
      line(
        c,
        [
          [hx - 6, hy - 2],
          [hx + 10, hy - 22],
        ],
        '#6b4428',
        2,
      );
      oval(c, hx - 7, hy, 7, 6, col);
      oval(c, hx - 7, hy, 2, 2, INK, false);
      return;
    case 'bow':
      c.beginPath();
      c.arc(hx - 4, hy - 8, 13, -1.1, 1.1);
      c.lineWidth = 3;
      c.strokeStyle = INK;
      c.stroke();
      c.lineWidth = 1.6;
      c.strokeStyle = '#8a5a32';
      c.stroke();
      line(
        c,
        [
          [hx + 1, hy - 19.5],
          [hx + 1, hy + 3.5],
        ],
        '#f4efe4',
        1,
      );
      return;
    case 'flame':
      c.beginPath();
      c.moveTo(hx - 5, hy - 2);
      c.quadraticCurveTo(hx - 7, hy - 12, hx, hy - 18);
      c.quadraticCurveTo(hx, hy - 10, hx + 5, hy - 12);
      c.quadraticCurveTo(hx + 7, hy - 5, hx + 4, hy - 2);
      c.closePath();
      paint(c, col);
      oval(c, hx, hy - 6, 2, 3, PALETTE.sun, false);
      return;
    case 'orb':
      oval(c, hx, hy - 6, 5.5, 5.5, col);
      oval(c, hx - 1.8, hy - 8, 1.8, 1.8, 'rgba(255,255,255,0.85)', false);
      return;
    case 'wrench':
      line(
        c,
        [
          [hx, hy],
          [hx + 6, hy - 14],
        ],
        INK,
        4.5,
      );
      line(
        c,
        [
          [hx, hy],
          [hx + 6, hy - 14],
        ],
        col,
        2.5,
      );
      oval(c, hx + 7, hy - 16, 3.5, 3.5, col);
      oval(c, hx + 8, hy - 17.5, 1.3, 1.3, d.shirt, false);
      return;
    case 'fan':
      c.beginPath();
      c.moveTo(hx, hy);
      c.arc(hx, hy, 11, -Math.PI * 0.95, -Math.PI * 0.35);
      c.closePath();
      paint(c, col);
      line(
        c,
        [
          [hx, hy],
          [hx - 6, hy - 8],
        ],
        'rgba(255,255,255,0.6)',
        1,
      );
      return;
    case 'drum':
      box(c, hx - 6, hy - 6, 12, 9, 3, col);
      line(
        c,
        [
          [hx - 6, hy - 2],
          [hx + 6, hy - 2],
        ],
        INK,
        1,
      );
      return;
  }
}

/** Mũ, mũ trùm, tai thú và phụ kiện trên đầu — vẽ sau tóc. */
function drawHeadwear(c: Ctx, d: CharacterDef, side: boolean, back: boolean) {
  const hc = d.hatColor ?? d.shirt;
  const shift = side ? 1 : 0;
  if (d.ears) {
    const inner = d.ears === 'fox' ? '#fff1e6' : '#ffb3d1';
    const col = d.ears === 'fox' ? d.hair : d.hair;
    for (const ex of side ? [4] : [-11, 11]) {
      c.beginPath();
      c.moveTo(ex - 6, -50);
      c.lineTo(ex + (ex < 0 ? -2 : 2), -66);
      c.lineTo(ex + 6, -50);
      c.closePath();
      paint(c, col);
      if (!back) {
        c.beginPath();
        c.moveTo(ex - 3, -51);
        c.lineTo(ex + (ex < 0 ? -1.5 : 1.5), -61);
        c.lineTo(ex + 3, -51);
        c.closePath();
        paint(c, inner, false);
      }
    }
  }
  switch (d.hat) {
    case 'cowboy':
      oval(c, 0, -51, 26, 6.5, hc);
      box(c, -12 + shift, -67, 24, 18, 7, hc);
      box(c, -12 + shift, -54, 24, 4, 1, '#3b2420', false);
      break;
    case 'mushroom':
      c.beginPath();
      c.moveTo(-26, -48);
      c.quadraticCurveTo(-24, -74, 0, -74);
      c.quadraticCurveTo(24, -74, 26, -48);
      c.quadraticCurveTo(0, -42, -26, -48);
      c.closePath();
      paint(c, hc);
      for (const [x, y, r] of [
        [-13, -58, 4],
        [2, -65, 4.5],
        [14, -56, 3.5],
        [-2, -53, 2.5],
      ] as const)
        oval(c, x, y, r, r * 0.85, '#fff6e0', false);
      break;
    case 'crown':
      c.beginPath();
      c.moveTo(-11 + shift, -50);
      c.lineTo(-12 + shift, -64);
      c.lineTo(-6 + shift, -58);
      c.lineTo(0 + shift, -68);
      c.lineTo(6 + shift, -58);
      c.lineTo(12 + shift, -64);
      c.lineTo(11 + shift, -50);
      c.closePath();
      paint(c, '#ffd23f');
      oval(c, shift, -55, 2, 2, PALETTE.coral, false);
      break;
    case 'hoodDragon':
    case 'hoodShark':
    case 'hoodWolf':
    case 'hoodCloth': {
      // Mũ trùm phủ đỉnh đầu, chừa mặt
      c.beginPath();
      c.moveTo(-18 + shift, -36);
      c.bezierCurveTo(-21 + shift, -64, 21 + shift, -64, 18 + shift, -36);
      if (!back) c.quadraticCurveTo(shift, -52, -18 + shift, -36);
      c.closePath();
      paint(c, hc);
      if (d.hat === 'hoodDragon') {
        for (const hx of side ? [6] : [-9, 9]) {
          c.beginPath();
          c.moveTo(hx - 3, -56);
          c.lineTo(hx + (hx < 0 ? -5 : 5), -68);
          c.lineTo(hx + 3, -57);
          c.closePath();
          paint(c, '#ffd23f');
        }
        if (!back && !side) for (const tx of [-8, 8]) oval(c, tx, -46, 1.6, 1.6, '#fff6e0', false);
      } else if (d.hat === 'hoodShark') {
        c.beginPath();
        c.moveTo(-3 + shift, -59);
        c.lineTo(4 + shift, -72);
        c.lineTo(8 + shift, -58);
        c.closePath();
        paint(c, hc);
        if (!back)
          for (let i = -3; i <= 3; i++) {
            c.beginPath();
            c.moveTo(i * 4 - 1.8 + shift, -47 + Math.abs(i) * 1.4);
            c.lineTo(i * 4 + shift, -43 + Math.abs(i) * 1.4);
            c.lineTo(i * 4 + 1.8 + shift, -47 + Math.abs(i) * 1.4);
            c.closePath();
            paint(c, '#ffffff', false);
          }
      } else if (d.hat === 'hoodWolf') {
        for (const ex of side ? [4] : [-10, 10]) {
          c.beginPath();
          c.moveTo(ex - 6, -55);
          c.lineTo(ex + (ex < 0 ? -2 : 2), -68);
          c.lineTo(ex + 6, -55);
          c.closePath();
          paint(c, hc);
        }
        if (!back && !side) for (const ex of [-7, 7]) oval(c, ex, -52, 2, 1.4, '#ffd23f', false);
      }
      break;
    }
  }
  if (back) return;
  if (d.goggles) {
    line(
      c,
      [
        [-16 + shift, -50],
        [16 + shift, -50],
      ],
      '#3b2420',
      3,
    );
    for (const gx of side ? [-6] : [-6, 6]) {
      oval(c, gx + shift, -51, 5, 4.5, '#8a5a32');
      oval(c, gx + shift, -51, 3, 2.8, '#7fd3f7', false);
    }
  }
  if (d.headphones) {
    c.beginPath();
    c.arc(shift, -44, 18, Math.PI * 1.05, Math.PI * 1.95);
    c.lineWidth = 3;
    c.strokeStyle = INK;
    c.stroke();
    for (const ex of side ? [6] : [-17, 17]) box(c, ex - 3, -45, 6, 10, 3, d.headphones);
  }
  if (d.mask) {
    c.beginPath();
    c.moveTo(side ? -16 : -15.5, -38);
    c.lineTo(side ? 4 : 15.5, -38);
    c.quadraticCurveTo(side ? 2 : 12, -26, side ? -8 : 0, -25);
    c.quadraticCurveTo(side ? -15 : -12, -26, side ? -16 : -15.5, -38);
    c.closePath();
    paint(c, d.mask);
  }
  if (d.visor) {
    box(c, side ? -16 : -15, -44, side ? 14 : 30, 7, 3, d.visor);
    line(
      c,
      [
        [side ? -13 : -11, -41.5],
        [side ? -6 : 9, -41.5],
      ],
      'rgba(255,255,255,0.8)',
      1.2,
    );
  }
  if (d.circlet) {
    line(
      c,
      [
        [-15 + shift, -49],
        [15 + shift, -49],
      ],
      d.circlet,
      2,
    );
    oval(c, shift, -49, 2.2, 2.2, '#7fd3f7');
  }
  if (d.flowers)
    for (const [fx, fy, col] of [
      [-10, -54, '#ff8fc7'],
      [0, -58, '#ffd23f'],
      [10, -54, '#ffffff'],
    ] as const) {
      for (const [dx, dy] of [
        [0, -2.5],
        [2.5, 0],
        [0, 2.5],
        [-2.5, 0],
      ] as const)
        oval(c, fx + dx + shift, fy + dy, 2, 2, col, false);
      oval(c, fx + shift, fy, 1.3, 1.3, PALETTE.coral, false);
    }
}

function drawParrot(c: Ctx, x: number, frame: number) {
  const bob = Math.sin(frame * 0.2) > 0.6 ? -1.5 : 0;
  oval(c, x, -30 + bob, 5, 6, '#3fbf5f');
  oval(c, x + 1, -37 + bob, 4, 4, '#3fbf5f');
  c.beginPath();
  c.moveTo(x - 2, -38 + bob);
  c.lineTo(x - 6, -36 + bob);
  c.lineTo(x - 2, -35 + bob);
  c.closePath();
  paint(c, '#ff8a2a', false);
  oval(c, x, -38 + bob, 0.9, 0.9, INK, false);
  oval(c, x + 3, -27 + bob, 2, 4, '#2f8fd6', false);
}

function drawFace(c: Ctx, d: CharacterDef, side: boolean, pose: Pose) {
  const eyes = side ? [-8] : [-6, 6];
  // Má hồng
  for (const ex of side ? [-6] : [-10, 10])
    oval(c, ex, -34, 3.2, 1.8, 'rgba(255,110,140,0.45)', false);

  if (d.beard) {
    c.beginPath();
    if (side) {
      c.moveTo(-15, -37);
      c.quadraticCurveTo(-13, -24, -3, -24);
      c.quadraticCurveTo(4, -28, 4, -35);
      c.quadraticCurveTo(-5, -31, -15, -37);
    } else {
      c.moveTo(-14, -37);
      c.quadraticCurveTo(-12, -23, 0, -22);
      c.quadraticCurveTo(12, -23, 14, -37);
      c.quadraticCurveTo(0, -30, -14, -37);
    }
    c.closePath();
    paint(c, d.beard);
  }

  if (d.eyepatch) {
    line(
      c,
      side
        ? [
            [-14, -45],
            [5, -45],
          ]
        : [
            [-16, -47],
            [16, -37],
          ],
      INK,
      1.6,
    );
    oval(c, eyes[0]!, -40, 4, 3.6, INK, false);
    for (const ex of eyes.slice(1)) {
      oval(c, ex, -40, 2.2, 3, INK, false);
      oval(c, ex - 0.7, -41.2, 0.8, 0.8, '#fff', false);
    }
  } else if (d.sunglasses) {
    for (const ex of eyes) {
      box(c, ex - 5.5, -44, 11, 7, 2.5, INK, false);
      line(
        c,
        [
          [ex - 3, -42.5],
          [ex - 1, -42.5],
        ],
        'rgba(255,255,255,0.55)',
        1.4,
      );
    }
    if (!side)
      line(
        c,
        [
          [-0.5, -41.5],
          [0.5, -41.5],
        ],
        INK,
        2,
      );
    else
      line(
        c,
        [
          [-3, -41],
          [6, -40],
        ],
        INK,
        1.6,
      );
  } else if (pose === 'win') {
    for (const ex of eyes)
      line(
        c,
        [
          [ex - 2.5, -39],
          [ex, -42],
          [ex + 2.5, -39],
        ],
        INK,
        1.8,
      );
  } else if (pose === 'trapped') {
    for (const ex of eyes) {
      oval(c, ex, -40, 2.6, 2.6, '#fff');
      oval(c, ex, -40, 1.1, 1.1, INK, false);
    }
  } else {
    // Mắt anime: lòng trắng, tròng màu, đồng tử, hai đốm sáng và hàng mi trên.
    const iris = d.eyes ?? '#4a3a8a';
    for (const ex of eyes) {
      oval(c, ex, -40, 3.6, 4.4, '#ffffff', false);
      oval(c, ex + (side ? -0.6 : 0), -39.6, 2.7, 3.6, iris, false);
      oval(c, ex + (side ? -0.6 : 0), -39.2, 1.3, 1.9, '#16131f', false);
      oval(c, ex - 1.2 + (side ? -0.6 : 0), -41.2, 1.1, 1.1, '#ffffff', false);
      oval(c, ex + 1 + (side ? -0.6 : 0), -37.9, 0.55, 0.55, '#ffffff', false);
      c.beginPath();
      c.ellipse(ex, -40, 3.9, 4.6, 0, Math.PI * 1.08, Math.PI * 1.92);
      c.lineWidth = 1.6;
      c.lineCap = 'round';
      c.strokeStyle = INK;
      c.stroke();
    }
  }

  const mx = side ? -10 : 0;
  if (pose === 'win') oval(c, mx, -32.5, 3.2, 2.6, '#e8505b');
  else if (pose === 'trapped') oval(c, mx, -32.5, 1.8, 2.2, '#8a2b3a', false);
  else {
    c.beginPath();
    c.arc(mx, -34.5, 2.6, 0.15 * Math.PI, 0.85 * Math.PI);
    c.lineWidth = 1.6;
    c.strokeStyle = INK;
    c.stroke();
  }

  if (d.earrings) {
    for (const ex of side ? [6] : [-15.5, 15.5]) {
      oval(c, ex, -32.5, 1.8, 1.8, d.earrings);
    }
  }
}

function drawPigtails(c: Ctx, d: CharacterDef, side: boolean) {
  const spots = side ? [9] : [-19, 19];
  for (const px of spots) {
    oval(c, px, -40, 6, 9, d.hair);
    oval(c, px * 0.8, -47, 2.5, 2.5, PALETTE.coral);
  }
}

function drawBun(c: Ctx, d: CharacterDef, side: boolean) {
  const bx = side ? 5 : 1;
  oval(c, bx, -58, 9, 8, d.hair);
  line(
    c,
    [
      [bx - 6, -63],
      [bx - 10, -68],
      [bx - 7, -70],
    ],
    d.hair,
    2,
  );
  line(
    c,
    [
      [bx + 5, -64],
      [bx + 9, -69],
    ],
    d.hair,
    2,
  );
}

function drawHair(c: Ctx, d: CharacterDef, side: boolean, back: boolean) {
  const shift = side ? 1 : 0;
  switch (d.hairStyle) {
    case 'spiky': {
      const spikes: [number, number, number][] = [
        [-12, -60, -5],
        [-4, -64, 4],
        [5, -61, 12],
      ];
      for (const [a, top, b] of spikes) {
        c.beginPath();
        c.moveTo(a + shift - 3, -50);
        c.lineTo(a + shift + 3, top);
        c.lineTo(b + shift, -51);
        c.closePath();
        paint(c, d.hair);
      }
      if (back) return;
      c.beginPath();
      c.moveTo(-17 + shift, -37);
      c.bezierCurveTo(-19 + shift, -60, 19 + shift, -60, 17 + shift, -36);
      if (side) {
        c.lineTo(8, -40);
        c.lineTo(2, -44);
        c.lineTo(-4, -41);
        c.lineTo(-9, -45);
        c.lineTo(-15, -41);
      } else {
        c.lineTo(12, -43);
        c.lineTo(7, -40);
        c.lineTo(3, -45);
        c.lineTo(-2, -41);
        c.lineTo(-7, -45);
        c.lineTo(-12, -41);
      }
      c.closePath();
      paint(c, d.hair);
      if (d.band) box(c, -17 + shift, -48, 34, 5, 2, d.band);
      return;
    }
    case 'bun': {
      if (back) return;
      c.beginPath();
      c.moveTo(-17 + shift, -36);
      c.bezierCurveTo(-19 + shift, -60, 19 + shift, -60, 17 + shift, -35);
      c.quadraticCurveTo(side ? 4 : 6, -49, side ? -16 : -12, -40);
      c.closePath();
      paint(c, d.hair);
      if (!side) {
        oval(c, -15.5, -38, 3, 6, d.hair);
        oval(c, 15.5, -38, 3, 6, d.hair);
      } else {
        oval(c, 9, -36, 4, 6, d.hair);
      }
      return;
    }
    case 'nonLa': {
      if (!back) {
        c.beginPath();
        c.moveTo(-16 + shift, -39);
        c.bezierCurveTo(-17 + shift, -54, 17 + shift, -54, 16 + shift, -38);
        c.lineTo(-16 + shift, -42);
        c.closePath();
        paint(c, d.hair);
        if (!side)
          line(
            c,
            [
              [-15, -43],
              [-9, -31],
            ],
            '#8a6a3a',
            1.2,
          );
      }
      c.beginPath();
      c.moveTo(-27, -45);
      c.lineTo(0, -71);
      c.lineTo(27, -45);
      c.quadraticCurveTo(0, -38, -27, -45);
      c.closePath();
      paint(c, '#ebd08a');
      line(
        c,
        [
          [0, -70],
          [-12, -43],
        ],
        'rgba(150,110,40,0.45)',
        1.2,
      );
      line(
        c,
        [
          [0, -70],
          [12, -43],
        ],
        'rgba(150,110,40,0.45)',
        1.2,
      );
      line(
        c,
        [
          [-22, -45.5],
          [22, -45.5],
        ],
        'rgba(150,110,40,0.35)',
        1.2,
      );
      return;
    }
    case 'pigtails': {
      if (back) return;
      c.beginPath();
      c.moveTo(-17 + shift, -37);
      c.bezierCurveTo(-19 + shift, -61, 19 + shift, -61, 17 + shift, -37);
      c.lineTo(15 + shift, -44);
      c.lineTo(-15, -44);
      c.closePath();
      paint(c, d.hair);
      return;
    }
    case 'tricorn': {
      const dark = '#1f1f27';
      c.beginPath();
      c.moveTo(-15, -51);
      c.quadraticCurveTo(-15, -69, 0, -69);
      c.quadraticCurveTo(15, -69, 15, -51);
      c.closePath();
      paint(c, dark);
      c.beginPath();
      c.moveTo(-25, -54);
      c.quadraticCurveTo(0, -42, 25, -54);
      c.quadraticCurveTo(14, -47, 0, -46);
      c.quadraticCurveTo(-14, -47, -25, -54);
      c.closePath();
      paint(c, dark);
      line(
        c,
        [
          [-14, -50],
          [14, -50],
        ],
        d.band ?? PALETTE.sun,
        2,
      );
      if (!back && !side) {
        oval(c, 0, -60, 3, 2.6, '#f4f4f4', false);
        line(
          c,
          [
            [-4, -55],
            [4, -53],
          ],
          '#f4f4f4',
          1.2,
        );
        line(
          c,
          [
            [4, -55],
            [-4, -53],
          ],
          '#f4f4f4',
          1.2,
        );
      }
      return;
    }
    case 'bandana': {
      if (!back) {
        for (const ex of side ? [9] : [-15.5, 15.5]) oval(c, ex, -36, 3.5, 8, d.hair);
      } else {
        for (let i = 0; i < 3; i++) oval(c, 0, -26 + i * 5, 3.2, 3, d.hair);
      }
      c.beginPath();
      c.moveTo(-17 + shift, -41);
      c.bezierCurveTo(-18 + shift, -61, 18 + shift, -61, 17 + shift, -41);
      c.quadraticCurveTo(shift, back ? -40 : -47, -17 + shift, -41);
      c.closePath();
      paint(c, d.band ?? PALETTE.sky);
      oval(c, side ? 4 : -6, -52, 1.6, 1.6, 'rgba(255,255,255,0.7)', false);
      c.beginPath();
      c.moveTo(14, -46);
      c.lineTo(22, -42);
      c.lineTo(19, -38);
      c.closePath();
      paint(c, d.band ?? PALETTE.sky);
      return;
    }
    case 'bald': {
      if (back) oval(c, 0, -41, 17, 16, d.skin);
      oval(c, side ? -5 : -6, -50, 4, 2.5, 'rgba(255,255,255,0.4)', false);
      box(c, -17 + shift, -49, 34 - shift, 6, 2, d.band ?? PALETTE.coral);
      c.beginPath();
      c.moveTo(15, -47);
      c.lineTo(23, -50);
      c.lineTo(22, -42);
      c.closePath();
      paint(c, d.band ?? PALETTE.coral);
      return;
    }
    case 'long':
    case 'topknot':
    case 'twinBuns':
    case 'bob': {
      if (back) {
        if (d.hairStyle === 'long') oval(c, 0, -30, 17, 14, d.hair);
        return;
      }
      c.beginPath();
      c.moveTo(-17 + shift, -36);
      c.bezierCurveTo(-19 + shift, -61, 19 + shift, -61, 17 + shift, -36);
      if (d.hairStyle === 'topknot') {
        c.lineTo(12 + shift, -44);
        c.lineTo(4 + shift, -41);
        c.lineTo(-3 + shift, -45);
        c.lineTo(-11 + shift, -42);
      } else {
        c.quadraticCurveTo(side ? 4 : 2, -50, side ? -16 : -14, -42);
      }
      c.closePath();
      paint(c, d.hair);
      if (d.hairStyle === 'long' || d.hairStyle === 'bob') {
        const bottom = d.hairStyle === 'long' ? -24 : -31;
        for (const ex of side ? [8] : [-15, 15]) box(c, ex - 3.5, -44, 7, bottom + 44, 3, d.hair);
      }
      return;
    }
    case 'messy': {
      for (const [tx, ty, r] of [
        [-11, -53, 6],
        [-2, -58, 7],
        [9, -55, 6],
        [15, -46, 4.5],
        [-15, -46, 4.5],
      ] as const) {
        oval(c, tx + shift, ty, r, r, d.hair);
      }
      if (back) return;
      c.beginPath();
      c.moveTo(-17 + shift, -38);
      c.bezierCurveTo(-19 + shift, -60, 19 + shift, -60, 17 + shift, -38);
      c.lineTo(10 + shift, -44);
      c.lineTo(4 + shift, -41);
      c.lineTo(-3 + shift, -45);
      c.lineTo(-10 + shift, -42);
      c.closePath();
      paint(c, d.hair);
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// Ô bản đồ
// ---------------------------------------------------------------------------

function drawFloor(c: Ctx, theme: Theme, gx: number, gy: number, s: number) {
  c.fillStyle = theme.floor[(gx + gy) % 2]!;
  c.fillRect(gx * s, gy * s, s, s);
  inUnits(c, gx * s, gy * s, s, () => {
    if (theme.floorStyle === 'grass' && (gx * 7 + gy * 3) % 5 === 0) {
      line(
        c,
        [
          [12, 36],
          [14, 30],
        ],
        'rgba(40,90,30,0.45)',
        2,
      );
      line(
        c,
        [
          [16, 36],
          [17, 29],
        ],
        'rgba(40,90,30,0.45)',
        2,
      );
      line(
        c,
        [
          [20, 36],
          [21, 31],
        ],
        'rgba(40,90,30,0.45)',
        2,
      );
    } else if (theme.floorStyle === 'stone') {
      line(
        c,
        [
          [0, 0],
          [48, 0],
        ],
        'rgba(0,0,0,0.12)',
        2,
      );
      line(
        c,
        [
          [0, 0],
          [0, 48],
        ],
        'rgba(0,0,0,0.12)',
        2,
      );
      if ((gx * 3 + gy * 5) % 7 === 0)
        line(
          c,
          [
            [10, 14],
            [18, 20],
            [16, 28],
          ],
          'rgba(0,0,0,0.18)',
          1.5,
        );
    } else if (theme.floorStyle === 'ice') {
      if ((gx * 5 + gy * 3) % 6 === 0) {
        line(
          c,
          [
            [30, 12],
            [30, 22],
          ],
          'rgba(255,255,255,0.9)',
          2,
        );
        line(
          c,
          [
            [25, 17],
            [35, 17],
          ],
          'rgba(255,255,255,0.9)',
          2,
        );
      }
      line(
        c,
        [
          [6, 40],
          [16, 34],
        ],
        'rgba(120,180,220,0.35)',
        1.5,
      );
    } else if (theme.floorStyle === 'planks') {
      const off = gy % 2 ? 24 : 0;
      line(
        c,
        [
          [0, 16],
          [48, 16],
        ],
        'rgba(60,30,10,0.18)',
        1.5,
      );
      line(
        c,
        [
          [0, 32],
          [48, 32],
        ],
        'rgba(60,30,10,0.18)',
        1.5,
      );
      line(
        c,
        [
          [off + 12, 0],
          [off + 12, 16],
        ],
        'rgba(60,30,10,0.18)',
        1.5,
      );
      oval(c, (off + 30) % 48, 24, 1.2, 1.2, 'rgba(60,30,10,0.3)', false);
    } else if (theme.floorStyle === 'sand') {
      for (const [dx, dy] of [
        [9, 11],
        [33, 19],
        [21, 37],
      ] as const)
        oval(c, ((dx + gx * 5) % 44) + 2, dy, 1.1, 1.1, 'rgba(160,110,40,0.35)', false);
      if ((gx * 5 + gy * 11) % 9 === 0) {
        c.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 ? 3 : 7;
          const a = (i / 10) * TAU - Math.PI / 2;
          c.lineTo(30 + Math.cos(a) * r, 30 + Math.sin(a) * r);
        }
        c.closePath();
        paint(c, '#ff9f7a');
      }
    }
  });
}

/** Vạch sân / mép nước vẽ đè lên sàn, dưới các khối. */
function drawThemeOverlay(c: Ctx, theme: Theme, s: number) {
  if (!theme.courtLines) return;
  c.save();
  c.strokeStyle = theme.accent;
  c.globalAlpha = 0.55;
  c.lineWidth = s * 0.08;
  const midY = (ROWS / 2) * s;
  c.beginPath();
  c.moveTo(0, midY);
  c.lineTo(COLS * s, midY);
  c.moveTo((COLS / 2) * s + s * 1.6, midY);
  c.arc((COLS / 2) * s, midY, s * 1.6, 0, TAU);
  c.stroke();
  c.restore();
}

/** Lá dừa: một chiếc lá dài cong từ ngọn ra ngoài. */
function frond(c: Ctx, x: number, y: number, angle: number, len: number, color: string) {
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.beginPath();
  c.moveTo(0, 0);
  c.quadraticCurveTo(len * 0.5, -6, len, 3);
  c.quadraticCurveTo(len * 0.5, 3, 0, 0);
  c.closePath();
  paint(c, color);
  c.restore();
}

function drawHard(c: Ctx, theme: Theme, style: HardStyle) {
  switch (style) {
    case 'water': {
      c.fillStyle = '#3fa7e0';
      c.fillRect(0, 0, 48, 48);
      c.fillStyle = '#2f8fd0';
      c.fillRect(0, 36, 48, 12);
      line(
        c,
        [
          [6, 14],
          [12, 11],
          [18, 14],
        ],
        '#a6e4fb',
        2,
      );
      line(
        c,
        [
          [26, 26],
          [32, 23],
          [38, 26],
        ],
        '#a6e4fb',
        2,
      );
      line(
        c,
        [
          [10, 40],
          [15, 38],
          [20, 40],
        ],
        '#7fd3f7',
        1.5,
      );
      return;
    }
    case 'lava': {
      c.fillStyle = '#ff6a1a';
      c.fillRect(0, 0, 48, 48);
      for (const [x, y, r] of [
        [12, 12, 6],
        [34, 20, 7],
        [18, 36, 5],
        [40, 40, 4],
      ] as const)
        oval(c, x, y, r, r * 0.8, '#ffd23f', false);
      for (const [x, y] of [
        [4, 4],
        [28, 6],
        [44, 30],
        [6, 44],
      ] as const)
        oval(c, x, y, 3, 2, '#9a3412', false);
      return;
    }
    case 'rock':
      oval(c, 24, 30, 22, 15, theme.hard);
      oval(c, 22, 22, 19, 14, theme.hardTop);
      oval(c, 15, 17, 5, 3, 'rgba(255,255,255,0.35)', false);
      return;
    case 'lavaRock': {
      c.beginPath();
      c.moveTo(4, 44);
      c.lineTo(10, 18);
      c.lineTo(18, 22);
      c.lineTo(24, 4);
      c.lineTo(32, 20);
      c.lineTo(39, 14);
      c.lineTo(44, 44);
      c.closePath();
      paint(c, theme.hard);
      c.beginPath();
      c.moveTo(12, 24);
      c.lineTo(24, 8);
      c.lineTo(30, 22);
      c.lineTo(20, 30);
      c.closePath();
      paint(c, theme.hardTop, false);
      line(
        c,
        [
          [24, 12],
          [22, 26],
          [27, 36],
        ],
        '#ff7a1a',
        2,
      );
      line(
        c,
        [
          [36, 22],
          [34, 34],
        ],
        '#ff7a1a',
        1.5,
      );
      return;
    }
    case 'cactus':
      oval(c, 24, 44, 14, 3.5, 'rgba(0,0,0,0.25)', false);
      box(c, 8, 18, 9, 15, 4.5, '#3f9b3a');
      box(c, 31, 12, 9, 16, 4.5, '#3f9b3a');
      box(c, 18, 6, 12, 39, 6, '#4fb548');
      line(
        c,
        [
          [24, 10],
          [24, 40],
        ],
        '#2f7d2a',
        1.5,
      );
      for (const [x, y] of [
        [20, 14],
        [28, 22],
        [20, 30],
        [28, 36],
        [11, 22],
        [36, 17],
      ] as const)
        oval(c, x, y, 0.9, 0.9, '#fff6e0', false);
      return;
    case 'palm':
      oval(c, 24, 44, 14, 3.5, 'rgba(0,0,0,0.25)', false);
      c.beginPath();
      c.moveTo(20, 46);
      c.quadraticCurveTo(18, 30, 24, 14);
      c.lineTo(30, 14);
      c.quadraticCurveTo(25, 30, 28, 46);
      c.closePath();
      paint(c, '#9a6a3a');
      for (const y of [22, 30, 38])
        line(
          c,
          [
            [21, y],
            [27, y + 1],
          ],
          'rgba(60,30,10,0.5)',
          1.5,
        );
      frond(c, 27, 13, Math.PI * 1.05, 20, '#2f8f3a');
      frond(c, 27, 13, Math.PI * 1.55, 16, '#3fa94a');
      frond(c, 27, 13, -Math.PI * 0.05, 20, '#2f8f3a');
      frond(c, 27, 13, Math.PI * 0.2, 18, '#4fbf55');
      frond(c, 27, 13, Math.PI * 0.8, 18, '#4fbf55');
      oval(c, 24, 17, 3, 3, '#6b4423');
      oval(c, 30, 17, 3, 3, '#6b4423');
      return;
    case 'cannon':
      box(c, 8, 28, 30, 12, 3, '#8a5a32');
      box(c, 4, 15, 36, 13, 6.5, '#2e2e38');
      oval(c, 41, 21.5, 4, 6.5, '#1a1a22');
      line(
        c,
        [
          [9, 18],
          [34, 18],
        ],
        'rgba(255,255,255,0.35)',
        1.5,
      );
      oval(c, 14, 40, 6, 6, '#5a3a22');
      oval(c, 32, 40, 6, 6, '#5a3a22');
      oval(c, 14, 40, 2, 2, '#c9a66b', false);
      oval(c, 32, 40, 2, 2, '#c9a66b', false);
      return;
    case 'fence':
      for (const x of [5, 20, 35]) box(c, x, 6, 8, 38, 2, '#9a6a3a');
      box(c, 2, 14, 44, 6, 2, '#b07a44');
      box(c, 2, 30, 44, 6, 2, '#b07a44');
      for (const x of [9, 24, 39]) oval(c, x, 9, 1.2, 1.2, '#5a3a22', false);
      return;
    case 'wreck':
      c.beginPath();
      c.moveTo(2, 30);
      c.lineTo(42, 20);
      c.lineTo(46, 34);
      c.quadraticCurveTo(26, 46, 6, 42);
      c.closePath();
      paint(c, '#6b4428');
      for (const y of [30, 36])
        line(
          c,
          [
            [8, y + 2],
            [42, y - 6],
          ],
          'rgba(30,15,5,0.45)',
          1.5,
        );
      line(
        c,
        [
          [24, 26],
          [16, 2],
        ],
        INK,
        3,
      );
      line(
        c,
        [
          [24, 26],
          [16, 2],
        ],
        '#8a5a32',
        1.5,
      );
      line(
        c,
        [
          [12, 10],
          [24, 8],
        ],
        '#8a5a32',
        2,
      );
      return;
    case 'tree': {
      // Cây tán tròn (trên băng thì phủ tuyết)
      const snowy = theme.floorStyle === 'ice';
      oval(c, 24, 44, 15, 3.5, 'rgba(0,0,0,0.25)', false);
      box(c, 20, 26, 8, 19, 2, '#7a4a2a');
      oval(c, 24, 20, 18, 15, snowy ? '#5f9e7a' : '#3f9b3a');
      oval(c, 18, 14, 9, 7, snowy ? '#ffffff' : '#5cc24a');
      oval(c, 31, 22, 6, 5, snowy ? '#e9f8ff' : '#4fb548', false);
      if (!snowy)
        for (const [x, y] of [
          [14, 24],
          [30, 12],
          [34, 26],
        ] as const)
          oval(c, x, y, 2, 2, '#e8384f', false);
      return;
    }
    case 'flag':
      // Cờ hải tặc kiểu chung: nền đen, đầu lâu và hai xương chéo
      oval(c, 12, 44, 8, 2.5, 'rgba(0,0,0,0.25)', false);
      box(c, 10, 4, 4, 41, 1.5, '#8a5a32');
      oval(c, 12, 4, 2.6, 2.6, PALETTE.sun);
      c.beginPath();
      c.moveTo(14, 7);
      c.lineTo(42, 7);
      c.quadraticCurveTo(38, 15, 42, 25);
      c.lineTo(14, 25);
      c.closePath();
      paint(c, '#16161c');
      line(
        c,
        [
          [20, 22],
          [33, 13],
        ],
        '#f4efe4',
        2,
      );
      line(
        c,
        [
          [20, 13],
          [33, 22],
        ],
        '#f4efe4',
        2,
      );
      oval(c, 26.5, 14.5, 4.5, 4, '#f4efe4', false);
      box(c, 24.5, 17, 4, 3, 1, '#f4efe4', false);
      oval(c, 25, 14.5, 1.1, 1.3, '#16161c', false);
      oval(c, 28, 14.5, 1.1, 1.3, '#16161c', false);
      return;
    case 'coral':
      // Cụm san hô nhiều nhánh
      oval(c, 24, 43, 15, 3.5, 'rgba(0,0,0,0.25)', false);
      for (const [x0, x1, y1, col] of [
        [24, 24, 4, theme.hardTop],
        [20, 9, 12, theme.hard],
        [28, 39, 10, theme.hard],
        [22, 14, 24, theme.hardTop],
        [26, 35, 22, theme.hardTop],
      ] as const) {
        line(
          c,
          [
            [x0, 44],
            [x1, y1],
          ],
          INK,
          7,
        );
        line(
          c,
          [
            [x0, 44],
            [x1, y1],
          ],
          col,
          4.5,
        );
        oval(c, x1, y1, 3.5, 3.5, col);
      }
      return;
    case 'brick':
    case 'post':
      box(c, 2, 6, 44, 40, 6, theme.hard);
      box(c, 2, 0, 44, 34, 6, theme.hardTop);
      if (style === 'brick') {
        for (const yy of [11, 22])
          line(
            c,
            [
              [4, yy],
              [44, yy],
            ],
            'rgba(90,30,20,0.35)',
            1.5,
          );
        line(
          c,
          [
            [24, 2],
            [24, 11],
          ],
          'rgba(90,30,20,0.35)',
          1.5,
        );
        line(
          c,
          [
            [14, 11],
            [14, 22],
          ],
          'rgba(90,30,20,0.35)',
          1.5,
        );
        line(
          c,
          [
            [34, 11],
            [34, 22],
          ],
          'rgba(90,30,20,0.35)',
          1.5,
        );
        line(
          c,
          [
            [24, 22],
            [24, 32],
          ],
          'rgba(90,30,20,0.35)',
          1.5,
        );
      } else {
        // Cọc gỗ: vân tròn trên mặt cắt
        oval(c, 24, 17, 14, 11, 'rgba(0,0,0,0.12)', false);
        c.beginPath();
        c.ellipse(24, 17, 8, 6, 0, 0, TAU);
        c.lineWidth = 1.5;
        c.strokeStyle = 'rgba(40,20,10,0.4)';
        c.stroke();
      }
      return;
  }
}

function drawSoft(c: Ctx, theme: Theme, style: SoftStyle) {
  switch (style) {
    case 'box':
      // Thùng / khối dán băng keo
      box(c, 5, 10, 38, 34, 5, theme.soft);
      box(c, 5, 6, 38, 24, 5, theme.softTop);
      box(c, 20, 6, 8, 24, 1, 'rgba(255,255,255,0.45)', false);
      return;
    case 'barrel':
      // Thùng gỗ có đai sắt
      box(c, 7, 8, 34, 36, 10, theme.soft);
      for (const yy of [16, 34])
        line(
          c,
          [
            [8, yy],
            [40, yy],
          ],
          'rgba(30,30,40,0.55)',
          2.5,
        );
      oval(c, 24, 10, 15, 5, theme.softTop);
      oval(c, 17, 24, 2.5, 6, 'rgba(255,255,255,0.3)', false);
      return;
    case 'crate':
      // Thùng thưa đóng chéo
      box(c, 5, 8, 38, 36, 3, '#b8834a');
      c.save();
      c.beginPath();
      c.rect(7, 10, 34, 32);
      c.clip();
      line(
        c,
        [
          [7, 10],
          [41, 42],
        ],
        '#8a5a32',
        4,
      );
      line(
        c,
        [
          [41, 10],
          [7, 42],
        ],
        '#8a5a32',
        4,
      );
      c.restore();
      box(c, 5, 8, 38, 6, 2, '#d39b5c');
      box(c, 5, 38, 38, 6, 2, '#d39b5c');
      return;
    case 'pot':
      // Chum sành
      oval(c, 24, 44, 13, 3, 'rgba(0,0,0,0.25)', false);
      oval(c, 24, 28, 16, 15, '#b5652e');
      box(c, 15, 8, 18, 8, 3, '#c97a3e');
      line(
        c,
        [
          [10, 28],
          [38, 28],
        ],
        '#ffd23f',
        2,
      );
      oval(c, 17, 22, 3, 6, 'rgba(255,255,255,0.3)', false);
      return;
    case 'chest':
      // Rương gỗ viền vàng có khoá
      box(c, 5, 18, 38, 26, 4, '#9a5a2a');
      box(c, 5, 8, 38, 14, 7, '#c2763a');
      line(
        c,
        [
          [6, 21],
          [42, 21],
        ],
        '#ffd23f',
        2.5,
      );
      for (const x of [12, 36])
        line(
          c,
          [
            [x, 9],
            [x, 43],
          ],
          '#ffd23f',
          2,
        );
      box(c, 20, 18, 8, 10, 2, '#ffd23f');
      oval(c, 24, 23, 1.2, 1.6, INK, false);
      return;
    case 'egg':
      // Trứng rồng lốm đốm
      oval(c, 24, 44, 12, 3, 'rgba(0,0,0,0.3)', false);
      oval(c, 24, 26, 13, 17, theme.soft);
      for (const [x, y, r] of [
        [19, 20, 3.5],
        [29, 28, 4],
        [22, 34, 2.5],
        [28, 15, 2],
      ] as const)
        oval(c, x, y, r, r, theme.softTop, false);
      oval(c, 18, 16, 3, 5, 'rgba(255,255,255,0.4)', false);
      return;
    case 'darkRock':
      // Tảng đá núi lửa nứt (phá được)
      oval(c, 16, 32, 13, 11, '#4a3a40');
      oval(c, 32, 30, 13, 13, '#5a4850');
      oval(c, 26, 20, 11, 9, '#6b5860');
      line(
        c,
        [
          [26, 14],
          [24, 24],
          [30, 32],
        ],
        '#1d1418',
        1.5,
      );
      oval(c, 22, 16, 3, 2, 'rgba(255,255,255,0.25)', false);
      return;
    case 'gold':
      // Đống vàng lấp lánh
      oval(c, 24, 36, 19, 9, '#d9a514');
      oval(c, 24, 28, 13, 9, '#ecbb22');
      for (const [x, y] of [
        [12, 34],
        [20, 38],
        [30, 37],
        [36, 32],
        [18, 26],
        [28, 24],
        [24, 18],
      ] as const)
        oval(c, x, y, 4, 2.6, '#ffd23f');
      line(
        c,
        [
          [38, 12],
          [38, 20],
        ],
        '#fff',
        1.5,
      );
      line(
        c,
        [
          [34, 16],
          [42, 16],
        ],
        '#fff',
        1.5,
      );
      return;
    case 'bush':
      // Bụi cây / hải quỳ: ba cụm tròn chồng lên nhau
      oval(c, 14, 30, 11, 11, theme.soft);
      oval(c, 34, 30, 11, 11, theme.soft);
      oval(c, 24, 20, 14, 13, theme.softTop);
      oval(c, 19, 15, 4, 3, 'rgba(255,255,255,0.35)', false);
      return;
    case 'basket':
      // Sọt tre đầy trái cây
      box(c, 6, 18, 36, 26, 8, theme.soft);
      for (const yy of [26, 34])
        line(
          c,
          [
            [9, yy],
            [39, yy],
          ],
          'rgba(90,60,10,0.4)',
          1.5,
        );
      oval(c, 15, 16, 7, 7, '#ff8a2a');
      oval(c, 33, 16, 7, 7, '#7bc043');
      oval(c, 24, 11, 7, 7, '#e8384f');
      return;
    case 'castle':
      // Lâu đài cát
      box(c, 6, 20, 36, 24, 4, theme.soft);
      box(c, 8, 8, 12, 20, 3, theme.softTop);
      box(c, 28, 8, 12, 20, 3, theme.softTop);
      line(
        c,
        [
          [34, 8],
          [34, 0],
        ],
        INK,
        1.5,
      );
      c.beginPath();
      c.moveTo(34, 0);
      c.lineTo(42, 3);
      c.lineTo(34, 6);
      c.closePath();
      paint(c, theme.accent, false);
      box(c, 20, 30, 8, 14, 4, 'rgba(90,60,10,0.35)', false);
      return;
  }
}

/** Hiệu ứng khi chạy, vẽ sát mặt đất dưới nhân vật. Toạ độ theo ô như người chơi. */
function drawEffects(c: Ctx, effects: SceneEffect[], s: number) {
  for (const e of effects) {
    const k = Math.min(1, e.age / e.life);
    const cx = (e.x + 0.5) * s;
    const cy = (e.y + 0.5) * s;
    c.save();
    if (e.kind === 'dust') {
      // Cụm bụi tròn phồng lên rồi tan, hơi bay lên.
      c.globalAlpha = 0.65 * (1 - k);
      c.fillStyle = '#f4efe4';
      for (const [dx, dy, r] of [
        [0, 0, 1],
        [-0.45, 0.15, 0.7],
        [0.4, 0.2, 0.6],
      ] as const) {
        c.beginPath();
        c.arc(
          cx + dx * s * 0.16,
          cy + dy * s * 0.16 - k * s * 0.14,
          s * (0.1 + 0.12 * k) * r,
          0,
          TAU,
        );
        c.fill();
      }
    } else if (e.kind === 'print') {
      // Dấu chân nhỏ hình bầu dục theo hướng đi, mờ dần.
      c.globalAlpha = 0.38 * (1 - k);
      c.translate(cx, cy);
      c.rotate(e.angle);
      c.fillStyle = '#3b2a20';
      c.beginPath();
      c.ellipse(0, 0, s * 0.11, s * 0.065, 0, 0, TAU);
      c.fill();
    } else {
      // Vệt lấp lánh hình sao bốn cánh phía sau người bay.
      c.globalAlpha = 1 - k;
      c.translate(cx, cy - k * s * 0.15);
      const r = s * 0.13 * (1 - k * 0.5);
      c.fillStyle = k < 0.4 ? '#ffffff' : '#b9ecff';
      c.beginPath();
      for (let i = 0; i < 8; i++) {
        const rr = i % 2 ? r * 0.3 : r;
        const a = (i / 8) * TAU;
        c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      c.closePath();
      c.fill();
    }
    c.restore();
  }
}

/** Xoáy Hố Đen: các vòng cung tím quay vào tâm, mờ dần trong lúc hút bóng. */
function drawHole(c: Ctx, h: { x: number; y: number; t: number }, s: number, frame: number) {
  const k = Math.min(1, h.t / 0.8);
  const cx = (h.x + 0.5) * s;
  const cy = (h.y + 0.5) * s;
  const reach = s * 3.5 * (0.4 + 0.6 * (1 - k));
  c.save();
  c.globalAlpha = 0.25 + 0.6 * k;
  const g = c.createRadialGradient(cx, cy, 0, cx, cy, reach);
  g.addColorStop(0, 'rgba(26,16,48,0.9)');
  g.addColorStop(0.5, 'rgba(91,60,200,0.35)');
  g.addColorStop(1, 'rgba(181,124,255,0)');
  c.fillStyle = g;
  c.beginPath();
  c.arc(cx, cy, reach, 0, TAU);
  c.fill();
  for (let i = 0; i < 3; i++) {
    c.beginPath();
    c.arc(cx, cy, reach * (0.3 + i * 0.22), frame * 0.25 + i * 2, frame * 0.25 + i * 2 + 3.6);
    c.lineWidth = s * 0.07;
    c.lineCap = 'round';
    c.strokeStyle = i % 2 ? '#e2d4ff' : '#b57cff';
    c.stroke();
  }
  c.restore();
}

/** Đồ trang trí nhỏ trên sàn, chỉ để nhìn. */
function drawDecor(c: Ctx, kind: Decor, ox: number, oy: number) {
  c.save();
  c.translate(ox, oy);
  switch (kind) {
    case 'skull':
      oval(c, 0, 0, 6, 5.5, '#f4efe4');
      box(c, -3.5, 3, 7, 4, 1.5, '#f4efe4');
      oval(c, -2.2, -0.5, 1.6, 1.8, INK, false);
      oval(c, 2.2, -0.5, 1.6, 1.8, INK, false);
      break;
    case 'shell':
      c.beginPath();
      c.moveTo(0, 5);
      c.lineTo(-6, -2);
      c.quadraticCurveTo(0, -8, 6, -2);
      c.closePath();
      paint(c, '#ffb3a7');
      line(
        c,
        [
          [0, 5],
          [0, -5],
        ],
        'rgba(150,60,50,0.5)',
        1,
      );
      line(
        c,
        [
          [0, 5],
          [-3.5, -3],
        ],
        'rgba(150,60,50,0.5)',
        1,
      );
      line(
        c,
        [
          [0, 5],
          [3.5, -3],
        ],
        'rgba(150,60,50,0.5)',
        1,
      );
      break;
    case 'bone':
      line(
        c,
        [
          [-6, 2],
          [6, -2],
        ],
        '#e8e1d4',
        3,
      );
      for (const [x, y] of [
        [-6, 2],
        [6, -2],
      ] as const)
        oval(c, x, y, 2.2, 2.2, '#e8e1d4', false);
      break;
    case 'coin':
      oval(c, 0, 0, 4, 4, PALETTE.sun);
      oval(c, 6, 3, 3.5, 3.5, PALETTE.sun);
      break;
    case 'gem':
      c.beginPath();
      c.moveTo(0, -6);
      c.lineTo(5, -1);
      c.lineTo(0, 6);
      c.lineTo(-5, -1);
      c.closePath();
      paint(c, '#5fd3ff');
      line(
        c,
        [
          [-5, -1],
          [5, -1],
        ],
        'rgba(255,255,255,0.7)',
        1,
      );
      break;
    case 'flower':
      for (const [dx, dy] of [
        [0, -3],
        [3, 0],
        [0, 3],
        [-3, 0],
      ] as const)
        oval(c, dx, dy, 2.4, 2.4, '#ff8fc7', false);
      oval(c, 0, 0, 1.8, 1.8, PALETTE.sun, false);
      break;
    case 'ball':
      oval(c, 0, 0, 5, 5, '#ffffff');
      oval(c, 0, 0, 1.8, 1.8, INK, false);
      line(
        c,
        [
          [-4, -2],
          [-1.5, -0.5],
        ],
        INK,
        1,
      );
      line(
        c,
        [
          [4, -2],
          [1.5, -0.5],
        ],
        INK,
        1,
      );
      break;
    case 'leaf':
      c.save();
      c.rotate(0.6);
      oval(c, 0, 0, 6, 2.6, '#5fa346');
      line(
        c,
        [
          [-5, 0],
          [5, 0],
        ],
        '#3f7d2a',
        0.8,
      );
      c.restore();
      break;
    case 'fish':
      oval(c, 0, 0, 6, 3, '#9fb7c9');
      c.beginPath();
      c.moveTo(5, 0);
      c.lineTo(10, -3);
      c.lineTo(10, 3);
      c.closePath();
      paint(c, '#9fb7c9', false);
      oval(c, -3, -0.5, 0.8, 0.8, INK, false);
      break;
    case 'starfish':
      c.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 2.4 : 6;
        const a = (i / 10) * TAU - Math.PI / 2;
        c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      c.closePath();
      paint(c, '#ff9f7a');
      break;
    case 'pebble':
      oval(c, 0, 0, 3.5, 2.5, 'rgba(90,80,70,0.45)', false);
      oval(c, 6, 3, 2.5, 1.8, 'rgba(90,80,70,0.35)', false);
      break;
    case 'rope':
      for (const r of [6, 4, 2]) {
        c.beginPath();
        c.ellipse(0, 0, r, r * 0.7, 0, 0, TAU);
        c.lineWidth = 1.6;
        c.strokeStyle = '#c9a66b';
        c.stroke();
      }
      break;
    case 'snow':
      line(
        c,
        [
          [0, -5],
          [0, 5],
        ],
        '#ffffff',
        1.6,
      );
      line(
        c,
        [
          [-4.3, -2.5],
          [4.3, 2.5],
        ],
        '#ffffff',
        1.6,
      );
      line(
        c,
        [
          [-4.3, 2.5],
          [4.3, -2.5],
        ],
        '#ffffff',
        1.6,
      );
      break;
    case 'ember':
      oval(c, 0, 0, 2.5, 2, '#ff7a1a', false);
      oval(c, 5, 3, 1.6, 1.4, '#ffd23f', false);
      oval(c, -3, 4, 1.4, 1.2, '#ff7a1a', false);
      break;
    case 'crown':
      c.beginPath();
      c.moveTo(-7, 4);
      c.lineTo(-7, -4);
      c.lineTo(-3.5, 0);
      c.lineTo(0, -6);
      c.lineTo(3.5, 0);
      c.lineTo(7, -4);
      c.lineTo(7, 4);
      c.closePath();
      paint(c, PALETTE.sun);
      oval(c, 0, 1, 1.4, 1.4, PALETTE.coral, false);
      break;
  }
  c.restore();
}

// ---------------------------------------------------------------------------
// Bóng nổ, vụ nổ bọt, vật phẩm, bong bóng nhốt
// ---------------------------------------------------------------------------

/** age: số giây từ lúc đặt (0 → 2,5). Rung nhanh dần để báo sắp nổ. */
export function drawBomb(c: Ctx, cx: number, cy: number, s: number, color: string, age: number) {
  inUnits(c, cx, cy, s, () => {
    const wob = Math.sin(age * (8 + age * 10)) * (0.04 + age * 0.03);
    oval(c, 0, 15, 13, 4, 'rgba(29,33,71,0.25)', false);
    c.save();
    c.scale(1 + wob, 1 - wob);
    oval(c, 0, 0, 15, 16, color);
    c.beginPath();
    c.moveTo(-3, -18);
    c.lineTo(3, -18);
    c.lineTo(0, -14);
    c.closePath();
    paint(c, color);
    oval(c, -6, -6, 5, 3.2, 'rgba(255,255,255,0.75)', false);
    if (age > 2 && Math.floor(age * 12) % 2 === 0)
      oval(c, 0, 0, 15, 16, 'rgba(255,255,255,0.45)', false);
    c.restore();
  });
}

/** Vụ nổ bọt hình chữ thập. age: 0 → 0,5 giây. */
function drawBlast(c: Ctx, b: SceneBlast, s: number) {
  const k = 1 - Math.min(1, b.age / 0.5);
  const w = s * (0.45 + 0.25 * k);
  const cx = (b.x + 0.5) * s;
  const cy = (b.y + 0.5) * s;
  c.save();
  c.globalAlpha = 0.35 + 0.65 * k;
  const arms: [number, number, number][] = [
    [0, -1, b.up],
    [0, 1, b.down],
    [-1, 0, b.left],
    [1, 0, b.right],
  ];
  for (const [layer, color] of [
    [1.25, PALETTE.sky],
    [1, PALETTE.foam],
  ] as const) {
    c.fillStyle = color;
    for (const [dx, dy, len] of arms) {
      if (len === 0) continue;
      const lx = dx === 0 ? cx - (w * layer) / 2 : Math.min(cx, cx + dx * len * s);
      const ly = dy === 0 ? cy - (w * layer) / 2 : Math.min(cy, cy + dy * len * s);
      const ww = dx === 0 ? w * layer : len * s + (w * layer) / 2;
      const hh = dy === 0 ? w * layer : len * s + (w * layer) / 2;
      c.beginPath();
      c.roundRect(lx, ly, ww, hh, (w * layer) / 2);
      c.fill();
    }
    c.beginPath();
    c.arc(cx, cy, w * layer * 0.75, 0, TAU);
    c.fill();
  }
  // Bọt li ti dọc các nhánh
  c.fillStyle = '#ffffff';
  for (const [dx, dy, len] of arms) {
    for (let i = 1; i <= len; i++) {
      const jitter = Math.sin(b.x * 13 + b.y * 7 + i * 5 + b.age * 20) * s * 0.12;
      c.beginPath();
      c.arc(
        cx + dx * i * s + (dy ? jitter : 0),
        cy + dy * i * s + (dx ? jitter : 0),
        s * 0.08,
        0,
        TAU,
      );
      c.fill();
    }
  }
  c.restore();
}

export function drawItem(c: Ctx, kind: ItemKind, cx: number, cy: number, s: number, frame: number) {
  inUnits(c, cx, cy, s, () => {
    oval(c, 0, 16, 11, 3.5, 'rgba(29,33,71,0.2)', false);
    c.translate(0, Math.sin(frame * 0.08) * 2 - 2);
    oval(c, 0, 0, 16, 16, 'rgba(233,248,255,0.85)');
    switch (kind) {
      case 'bomb':
        oval(c, -1, 2, 8, 8.5, PALETTE.coral);
        oval(c, -4, -1, 2.5, 1.6, 'rgba(255,255,255,0.8)', false);
        oval(c, 8, -7, 5, 5, PALETTE.sun);
        line(
          c,
          [
            [5.5, -7],
            [10.5, -7],
          ],
          INK,
          1.8,
        );
        line(
          c,
          [
            [8, -9.5],
            [8, -4.5],
          ],
          INK,
          1.8,
        );
        break;
      case 'range':
        for (const [dx, dy] of [
          [0, -1],
          [0, 1],
          [-1, 0],
          [1, 0],
        ] as const) {
          line(
            c,
            [
              [dx * 3, dy * 3],
              [dx * 10, dy * 10],
            ],
            PALETTE.skyDeep,
            5,
          );
        }
        oval(c, 0, 0, 4.5, 4.5, PALETTE.foam);
        break;
      case 'speed':
        c.beginPath();
        c.moveTo(-9, -4);
        c.lineTo(-2, -4);
        c.quadraticCurveTo(2, 2, 10, 3);
        c.quadraticCurveTo(12, 8, 8, 8);
        c.lineTo(-9, 8);
        c.closePath();
        paint(c, PALETTE.sky);
        line(
          c,
          [
            [-9, 5],
            [10, 5],
          ],
          '#fff',
          1.5,
        );
        line(
          c,
          [
            [-14, -2],
            [-10, -2],
          ],
          INK,
          1.5,
        );
        line(
          c,
          [
            [-15, 2],
            [-10, 2],
          ],
          INK,
          1.5,
        );
        break;
      case 'needle':
        line(
          c,
          [
            [-8, 9],
            [8, -9],
          ],
          INK,
          4.5,
        );
        line(
          c,
          [
            [-8, 9],
            [8, -9],
          ],
          '#cfd6df',
          2.5,
        );
        oval(c, 6, -7, 2.4, 2.4, PALETTE.foam);
        line(
          c,
          [
            [6, -7],
            [11, 3],
            [4, 9],
          ],
          PALETTE.coral,
          1.5,
        );
        break;
      case 'superBomb':
        oval(c, 0, 2, 10, 10.5, '#e8384f');
        oval(c, -4, -2, 3, 2, 'rgba(255,255,255,0.8)', false);
        c.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 ? 2.5 : 6;
          const a = (i / 10) * TAU - Math.PI / 2;
          c.lineTo(7 + Math.cos(a) * r, -9 + Math.sin(a) * r);
        }
        c.closePath();
        paint(c, PALETTE.sun);
        break;
      case 'fireBomb':
        oval(c, 0, 3, 9, 9.5, '#3b2a4a');
        oval(c, -3, 0, 2.5, 1.6, 'rgba(255,255,255,0.6)', false);
        c.beginPath();
        c.moveTo(-5, -5);
        c.quadraticCurveTo(-7, -12, 0, -15);
        c.quadraticCurveTo(-1, -10, 4, -11);
        c.quadraticCurveTo(7, -7, 5, -4);
        c.closePath();
        paint(c, '#ff7a1a');
        oval(c, 0, -7, 2, 3, PALETTE.sun, false);
        break;
      case 'clone':
        for (const [dx, col] of [
          [4, 'rgba(76,195,240,0.75)'],
          [-4, '#ffffff'],
        ] as const) {
          box(c, dx - 5, 0, 10, 9, 3, col);
          oval(c, dx, -5, 5.5, 5, col);
        }
        oval(c, -6, -5, 0.9, 1.2, INK, false);
        oval(c, -2, -5, 0.9, 1.2, INK, false);
        break;
      case 'teleport':
        for (const [r, col] of [
          [11, '#7b5cff'],
          [7.5, '#b57cff'],
          [4, '#e2d4ff'],
        ] as const) {
          c.beginPath();
          c.arc(0, 0, r, 0.2, TAU - 0.9);
          c.lineWidth = 3;
          c.lineCap = 'round';
          c.strokeStyle = col;
          c.stroke();
        }
        break;
      case 'hole':
        oval(c, 0, 0, 11, 11, '#1a1030');
        for (const [r, col, start] of [
          [9, '#b57cff', 0],
          [6, '#7b5cff', 2.1],
          [3.5, '#e2d4ff', 4.2],
        ] as const) {
          c.beginPath();
          c.arc(0, 0, r, start, start + 4.2);
          c.lineWidth = 2.4;
          c.lineCap = 'round';
          c.strokeStyle = col;
          c.stroke();
        }
        oval(c, 0, 0, 1.6, 1.6, '#ffffff', false);
        break;
      case 'life':
        c.beginPath();
        c.moveTo(0, 10);
        c.bezierCurveTo(-14, 0, -9, -12, 0, -5);
        c.bezierCurveTo(9, -12, 14, 0, 0, 10);
        c.closePath();
        paint(c, '#ff3b5c');
        oval(c, -5, -3, 2.2, 1.5, 'rgba(255,255,255,0.8)', false);
        break;
      case 'shield':
        c.beginPath();
        c.moveTo(0, -10);
        c.lineTo(9, -6);
        c.quadraticCurveTo(9, 6, 0, 11);
        c.quadraticCurveTo(-9, 6, -9, -6);
        c.closePath();
        paint(c, PALETTE.mint);
        line(
          c,
          [
            [0, -6],
            [0, 7],
          ],
          'rgba(255,255,255,0.7)',
          2,
        );
        break;
    }
    oval(c, -7, -8, 4, 2.5, 'rgba(255,255,255,0.8)', false);
  });
}

/** Bong bóng nhốt người, kèm vòng đếm ngược thời gian còn lại (trên 4 giây). */
export function drawTrapBubble(
  c: Ctx,
  footX: number,
  footY: number,
  s: number,
  left: number,
  frame: number,
  seatColor: string,
) {
  inUnits(c, footX, footY, s, () => {
    const wob = Math.sin(frame * 0.15) * 1.2;
    c.beginPath();
    c.ellipse(0, -32, 27 + wob, 28 - wob, 0, 0, TAU);
    c.fillStyle = 'rgba(255,143,199,0.32)';
    c.fill();
    c.lineWidth = 2.5;
    c.strokeStyle = PALETTE.bubble;
    c.stroke();
    oval(c, -12, -46, 7, 4, 'rgba(255,255,255,0.75)', false);
    oval(c, 13, -18, 2.5, 2.5, 'rgba(255,255,255,0.6)', false);
    c.beginPath();
    c.arc(0, -32, 31, -Math.PI / 2, -Math.PI / 2 + TAU * Math.max(0, Math.min(1, left / 4)));
    c.lineWidth = 3;
    c.lineCap = 'round';
    c.strokeStyle = seatColor;
    c.stroke();
  });
}

function drawSeatMarker(
  c: Ctx,
  footX: number,
  footY: number,
  s: number,
  seat: number,
  frame: number,
) {
  inUnits(c, footX, footY, s, () => {
    const y = -78 + Math.sin(frame * 0.1) * 1.5;
    c.beginPath();
    c.moveTo(-6, y);
    c.lineTo(6, y);
    c.lineTo(0, y + 7);
    c.closePath();
    paint(c, SEAT_COLORS[seat % SEAT_COLORS.length]!);
  });
}

// ---------------------------------------------------------------------------
// Sprite vẽ sẵn: mỗi hình (nhân vật theo từng khung, khối, bóng, vật phẩm, sàn) chỉ vẽ vector một lần
// ở đúng cỡ cần dùng rồi giữ trong bộ nhớ đệm, mỗi khung hình chỉ việc dán lại — nhẹ cho điện thoại.
// ---------------------------------------------------------------------------

const sprites = new Map<string, HTMLCanvasElement>();

function cached(key: string, w: number, h: number, paintFn: (c: Ctx) => void): HTMLCanvasElement {
  const hit = sprites.get(key);
  if (hit) return hit;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  paintFn(out.getContext('2d')!);
  sprites.set(key, out);
  return out;
}

/** Khung hình đại diện cho mỗi dáng: đi/thắng 8 khung, đặt bom 6, đứng/bị nhốt/trúng nổ 4 — đủ mượt cho hình 2D. */
function poseFrame(pose: Pose, frame: number): [bucket: number, rep: number] {
  const [period, count] =
    pose === 'walk'
      ? [(2 * Math.PI) / 0.28, 8]
      : pose === 'win'
        ? [Math.PI / 0.12, 8]
        : pose === 'trapped'
          ? [(2 * Math.PI) / 0.1, 4]
          : pose === 'hit'
            ? [(2 * Math.PI) / 1.3, 4]
            : pose === 'bomb'
              ? [Math.PI / 0.35, 6]
              : [(2 * Math.PI) / 0.08, 4];
  const b = Math.floor(((frame % period) / period) * count) % count;
  return [b, (b * period) / count];
}

/**
 * Sprite nhân vật kèm vị trí bàn chân trong sprite. `cell` là cỡ ô tính bằng điểm ảnh.
 * `portrait`: khung chân dung cho thẻ chọn/ảnh đại diện — nhân vật to hơn, chỉ chừa vừa đủ chỗ
 * cho mũ cao nhất lúc nhảy ăn mừng.
 */
export function characterSprite(
  d: CharacterDef,
  dir: Dir,
  pose: Pose,
  frame: number,
  cell: number,
  portrait = false,
) {
  const [bucket, rep] = poseFrame(pose, frame);
  const w = Math.round(cell * 1.5);
  const h = Math.round(cell * (portrait ? 1.75 : 2));
  const footX = w / 2;
  const footY = h - Math.round(cell * (portrait ? 0.05 : 0.1));
  const size = cell * (portrait ? 1.0 : 0.9);
  // Khoá có thêm "a"/"v": ảnh tải xong thì dùng sprite mới vẽ bằng ảnh thay cho bản vẽ bằng code.
  const kind = characterArt(d.id) ? 'a' : 'v';
  const canvas = cached(
    `ch|${d.id}|${dir}|${pose}|${bucket}|${cell}|${portrait ? 'p' : 'm'}|${kind}`,
    w,
    h,
    (c) => drawCharacter(c, d, footX, footY, size, dir, pose, rep),
  );
  return { canvas, footX, footY, size };
}

export function itemSprite(kind: ItemKind, cell: number) {
  return cached(`it|${kind}|${cell}`, cell, cell, (c) =>
    drawItem(c, kind, cell / 2, cell / 2 + 2 * (cell / UNIT), cell, Math.PI / 0.16),
  );
}

function bombSprite(color: string, age: number, cell: number) {
  const a = Math.min(24, Math.round(age * 10));
  return cached(`bo|${color}|${a}|${cell}`, cell, cell, (c) =>
    drawBomb(c, cell / 2, cell * 0.55, cell, color, a / 10),
  );
}

function hardSprite(theme: Theme, style: HardStyle, cell: number) {
  return cached(`hd|${theme.id}|${style}|${cell}`, cell, cell, (c) =>
    inUnits(c, 0, 0, cell, () => drawHard(c, theme, style)),
  );
}

function softSprite(theme: Theme, style: SoftStyle, cell: number) {
  return cached(`sf|${theme.id}|${style}|${cell}`, cell, cell, (c) =>
    inUnits(c, 0, 0, cell, () => drawSoft(c, theme, style)),
  );
}

function floorLayer(theme: Theme, cell: number) {
  return cached(`fl|${theme.id}|${cell}`, COLS * cell, ROWS * cell, (c) => {
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) drawFloor(c, theme, x, y, cell);
    drawThemeOverlay(c, theme, cell);
    const decor = theme.decor;
    if (!decor) return;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const h = cellHash(x, y);
        const kind = theme.layout(x, y);
        if (h % 4 !== 0 || (kind !== 'random' && kind !== 'empty')) continue;
        inUnits(c, x * cell, y * cell, cell, () =>
          drawDecor(c, decor[h % decor.length]!, 14 + (h % 20), 14 + ((h >> 3) % 20)),
        );
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Cả khung cảnh: sàn → vụ nổ → từng hàng (khối, vật phẩm, bóng, người) từ trên xuống
// để vật ở hàng dưới che đúng vật ở hàng trên.
// ---------------------------------------------------------------------------

export function drawScene(c: Ctx, scene: Scene, s: number, frame: number) {
  const { theme, tiles } = scene;
  c.imageSmoothingEnabled = true;
  c.drawImage(floorLayer(theme, s), 0, 0);
  for (const b of scene.blasts) drawBlast(c, b, s);
  for (const h of scene.holes ?? []) drawHole(c, h, s, frame);
  drawEffects(c, scene.effects ?? [], s);

  const bob = Math.round(Math.sin(frame * 0.08) * 1.5);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const t = tiles[idx(x, y)]!;
      if (t === HARD) c.drawImage(hardSprite(theme, hardStyleAt(theme, x, y), s), x * s, y * s);
      else if (t === SOFT)
        c.drawImage(softSprite(theme, softStyleAt(theme, x, y), s), x * s, y * s);
    }
    for (const it of scene.items)
      if (it.y === y) c.drawImage(itemSprite(it.kind, s), it.x * s, it.y * s + bob);
    for (const b of scene.bombs)
      if (b.y === y)
        c.drawImage(
          bombSprite(SEAT_COLORS[b.seat % SEAT_COLORS.length]!, b.age, s),
          b.x * s,
          b.y * s,
        );
    for (const p of scene.players) {
      if (Math.round(p.y) !== y) continue;
      const fx = Math.round((p.x + 0.5) * s);
      const fy = Math.round((p.y + 0.85) * s);
      if (p.shield) oval(c, fx, fy - s * 0.45, s * 0.55, s * 0.6, 'rgba(79,209,165,0.3)', false);
      const sp = characterSprite(p.def, p.dir, p.pose, frame, s);
      c.globalAlpha = p.ghost ? 0.55 : 1;
      c.drawImage(sp.canvas, fx - sp.footX, fy - sp.footY);
      c.globalAlpha = 1;
      if (p.trapLeft !== undefined)
        drawTrapBubble(
          c,
          fx,
          fy,
          s * 0.9,
          p.trapLeft,
          frame,
          SEAT_COLORS[p.seat % SEAT_COLORS.length]!,
        );
      else drawSeatMarker(c, fx, fy, s * 0.9, p.seat, frame);
    }
  }
}
