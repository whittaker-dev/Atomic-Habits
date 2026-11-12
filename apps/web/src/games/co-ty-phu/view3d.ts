import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
  canvas,
  drawBoard,
  drawDieFace,
  drawFacade,
  drawLabel,
  drawWood,
  GAP,
  texture,
} from './art';
import { BOARD, GROUPS, HOTEL, TOKENS } from './data';
import type { Deed } from './engine';
import { ALL, BOARD_SIZE, inward, rectOf } from './layout';
import { ARCHIPELAGOS, ISLANDS, OUTLINE, PINS, project, projectRadius } from './map';
import { buildFigure, disposeFigure } from './figures';
import { PALETTE } from './theme';

// Cảnh 3D của Cờ tỷ phú (three.js): hộp sơn mài son đỏ viền vàng trên bàn trà gỗ. Mặt hộp là 40
// miếng khảm nổi (mặt ngà cho ô đất, sơn đen hay son cho ô đặc biệt) quanh tranh sơn đen sóng khảm
// trai, giữa tranh là bản đồ chữ S dát vàng nổi khối với ghim tám vùng. Quân là nhân vật người chơi
// chọn, đứng trên đế vàng viền màu người chơi. Mua đất là dựng ngay nhà tranh; mỗi lần nâng cấp nhà
// lớn lên: nhà ngói, nhà hai tầng, nhà phố ba tầng, nhà bốn tầng, rồi khách sạn mái chùa. Mỗi lần dựng
// camera sà vào, có bụi, tia vàng và nhãn nổi. Ngoài lúc đó camera nhìn chếch từ cạnh dưới, cố định.

const TOP = 0.42;
/** Độ dày miếng khảm; quân và nhà đứng trên mặt miếng khảm. */
const TILE_H = 0.07;
const SURF = TOP + TILE_H;
/** Mặt nền giữa bàn: phải cao hơn tấm viền vàng của hộp (đỉnh viền ở TOP + 0.01) kẻo bị viền đè. */
const BED = TOP + 0.014;
const HOP_MS = 150;
const ROLL_MS = 1200;
const DIE = 0.5;
/** Quân nhân vật: cỡ mô hình 3D (cao chừng 1 đơn vị) khi đứng trên bàn. */
const FIG = 1.1;
const ELEVATION = (57 * Math.PI) / 180;
/** Nhà phóng to hơn kích thước thật của ô cho dễ nhìn trên màn nhỏ (như đồ chơi trên bàn cờ). */
const BUILD = 1.7;

export type BoardView = {
  /** Đặt ngay quân và nhà theo thế cờ (không hoạt ảnh). */
  setState: (pos: Record<number, number>, deeds: Record<number, Deed>, out: number[]) => void;
  /** Cập nhật chủ đất, cầm cố và nhà (không hoạt ảnh). */
  setDeeds: (deeds: Record<number, Deed>) => void;
  /** Nhân vật của từng người chơi (theo số ghế). */
  setCharacters: (ids: Record<number, string>) => void;
  /** Người đang tới lượt: quân nhún nhẹ, vòng đế sáng lên. */
  setTurn: (player: number | null) => void;
  /** Xây lên (hoặc bán bớt) nhà ở một ô tới `level` (0–5) của người `owner`, có hiệu ứng. */
  build: (square: number, level: number, owner: number, done: () => void) => void;
  /** Vừa mua một ô (mua thẳng hay thắng đấu giá): đất thì dựng nhà tranh, có hiệu ứng. */
  claim: (square: number, owner: number, done: () => void) => void;
  rollDice: (dice: [number, number], from: number, done: () => void) => void;
  /** Quân đi từng ô theo `path`; jump: bay thẳng tới ô cuối (bị tạm giữ, thẻ dịch chuyển). */
  move: (player: number, path: number[], jump: boolean, done: () => void) => void;
  /** Làm nổi một ô (đang hỏi mua / đấu giá). */
  highlight: (square: number | null) => void;
  /** Ô dưới điểm chạm (toạ độ màn hình), hoặc null. */
  pick: (clientX: number, clientY: number) => number | null;
  /** Ẩn quân của người đã phá sản. */
  retire: (player: number) => void;
  resize: (width: number, height: number) => void;
  /** Phần màn bị giao diện che ở trên và dưới (px): bàn căn vào khoảng còn lại. */
  setInsets: (top: number, bottom: number) => void;
  dispose: () => void;
};

const DIE_FACES = [3, 4, 1, 6, 2, 5];
const DIE_NORMALS = [
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, -1, 0),
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(0, 0, -1),
];
const UP = new THREE.Vector3(0, 1, 0);
/** Tên trên nhãn nổi: mua đất là dựng nhà tranh, mỗi lần nâng cấp lên một bậc. */
const LEVEL_NAME = ['Nhà tranh', 'Cấp 1', 'Cấp 2', 'Cấp 3', 'Cấp 4', 'Khách sạn'];

/** Hướng nhãn ghim trên bản đồ: phải (1) hay trái (-1), để các nhãn không đè nhau. */
const PIN_SIDE: Record<string, number> = {
  'Sa Pa': -1,
  'Hà Nội': -1,
  'Đà Lạt': -1,
  'Phú Quốc': -1,
};

/** Chỗ đứng của quân trong một ô: tối đa sáu quân xếp hai hàng ba. */
function spotIn(square: number, slot: number) {
  const r = rectOf(square);
  const [ix, iz] = inward(r.side);
  const col = (slot % 3) - 1;
  const row = Math.floor(slot / 3);
  // Dọc theo cạnh xếp ba quân; hàng thứ hai lùi về phía ngoài ô.
  const ax = iz !== 0 ? 1 : 0;
  const az = ix !== 0 ? 1 : 0;
  const spread = 0.3;
  const back = 0.18 + row * 0.32;
  return new THREE.Vector3(
    r.x + ax * col * spread - ix * back,
    SURF,
    r.z + az * col * spread - iz * back,
  );
}

/** Chỗ dựng nhà: giữa dải màu vùng (cạnh phía trong của ô). */
function lotOf(square: number) {
  const r = rectOf(square);
  const [ix, iz] = inward(r.side);
  const depth = r.side % 2 === 0 ? r.d : r.w;
  const band = (r.side % 2 === 0 ? 0.2 : 0.18) * depth;
  const off = depth / 2 - band / 2 - 0.02;
  return new THREE.Vector3(r.x + ix * off, SURF, r.z + iz * off);
}

const easeOutBack = (k: number) => 1 + 2.4 * Math.pow(k - 1, 3) + 1.4 * Math.pow(k - 1, 2);

export function createBoardView(target: HTMLCanvasElement): BoardView {
  const renderer = new THREE.WebGLRenderer({ canvas: target, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const dark = new THREE.Color('#0d0806');
  scene.background = dark;
  scene.fog = new THREE.Fog(dark, 24, 50);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 120);
  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(x: T) => {
    disposables.push(x);
    return x;
  };

  // Phản chiếu cho mặt sơn mài bóng và vàng dát.
  const pmrem = keep(new THREE.PMREMGenerator(renderer));
  scene.environment = keep(pmrem.fromScene(new RoomEnvironment(), 0.04).texture);
  scene.environmentIntensity = 0.45;

  // --- Ánh sáng: đèn ấm từ trên chếch xuống, ánh viền lạnh ---
  scene.add(new THREE.HemisphereLight('#ffe6c4', '#1a0f0a', 0.75));
  const key = new THREE.DirectionalLight('#ffe2b5', 2.1);
  key.position.set(-4, 14, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
  key.shadow.bias = -0.0004;
  scene.add(key);
  const rim = new THREE.DirectionalLight('#9fb6ff', 0.4);
  rim.position.set(8, 6, -10);
  scene.add(rim);

  // --- Bàn trà gỗ ---
  const woodTex = keep(texture(drawWood()));
  woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
  woodTex.repeat.set(6, 6);
  const table = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(60, 60)),
    keep(new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.55 })),
  );
  table.rotation.x = -Math.PI / 2;
  table.receiveShadow = true;
  scene.add(table);

  // --- Hộp sơn mài: thân son đỏ, viền vàng ---
  const B = BOARD_SIZE;
  const box = new THREE.Mesh(
    keep(new RoundedBoxGeometry(B + 0.5, TOP - 0.02, B + 0.5, 4, 0.12)),
    keep(
      new THREE.MeshPhysicalMaterial({
        color: PALETTE.cinnabarDeep,
        roughness: 0.3,
        clearcoat: 1,
        clearcoatRoughness: 0.12,
      }),
    ),
  );
  box.position.y = (TOP - 0.02) / 2;
  box.castShadow = box.receiveShadow = true;
  scene.add(box);
  const goldMat = keep(
    new THREE.MeshStandardMaterial({ color: PALETTE.gold, metalness: 1, roughness: 0.3 }),
  );
  const trim = new THREE.Mesh(keep(new THREE.BoxGeometry(B + 0.16, 0.03, B + 0.16)), goldMat);
  trim.position.y = TOP - 0.005;
  scene.add(trim);

  // --- Mặt bàn: một ảnh lớn cho nền giữa bàn và cho mặt từng miếng khảm ---
  const boardTex = keep(texture(drawBoard()));
  const bedMat = keep(
    new THREE.MeshPhysicalMaterial({
      map: boardTex,
      roughness: 0.35,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      // Ánh xà cừ trên sóng khảm trai khi đổi góc nhìn.
      iridescence: 0.35,
      iridescenceIOR: 1.6,
    }),
  );
  const bed = new THREE.Mesh(keep(new THREE.PlaneGeometry(B, B)), bedMat);
  bed.rotation.x = -Math.PI / 2;
  bed.position.y = BED;
  bed.receiveShadow = true;
  scene.add(bed);

  const tileTopMat = keep(
    new THREE.MeshPhysicalMaterial({
      map: boardTex,
      roughness: 0.42,
      clearcoat: 0.7,
      clearcoatRoughness: 0.18,
    }),
  );
  const tileMats = [goldMat, goldMat, tileTopMat, goldMat, goldMat, goldMat];
  const tiles = ALL.map((i) => {
    const r = rectOf(i);
    const w = r.w - GAP;
    const d = r.d - GAP;
    const geo = keep(new THREE.BoxGeometry(w, TILE_H, d));
    // Mặt trên lấy đúng phần ảnh của ô này trong ảnh lớn.
    const pos = geo.attributes.position!;
    const nor = geo.attributes.normal!;
    const uv = geo.attributes.uv!;
    for (let k = 0; k < pos.count; k++) {
      if (nor.getY(k) < 0.5) continue;
      const x = r.x + pos.getX(k);
      const z = r.z + pos.getZ(k);
      uv.setXY(k, (x + B / 2) / B, 1 - (z + B / 2) / B);
    }
    uv.needsUpdate = true;
    const mesh = new THREE.Mesh(geo, tileMats);
    mesh.position.set(r.x, TOP + TILE_H / 2, r.z);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.userData.square = i;
    scene.add(mesh);
    return mesh;
  });
  // Chữ trên bàn vẽ trước khi font kịp tải thì vẽ lại khi font sẵn sàng.
  void document.fonts?.ready.then(() => {
    boardTex.image = drawBoard();
    boardTex.needsUpdate = true;
  });

  // --- Bản đồ chữ S dát vàng nổi khối ---
  const leaf = (() => {
    // Lá vàng dát từng miếng vuông, mỗi miếng sáng tối khác nhau một chút.
    const [c, g] = canvas(256, 256);
    let seed = 5;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) {
        const l = 0.86 + rnd() * 0.22;
        g.fillStyle = `rgb(${Math.min(255, 228 * l)},${Math.min(255, 182 * l)},${Math.min(255, 80 * l)})`;
        g.fillRect(x * 32, y * 32, 32, 32);
        g.strokeStyle = 'rgba(120,80,20,0.25)';
        g.strokeRect(x * 32 + 0.5, y * 32 + 0.5, 31, 31);
      }
    const t = keep(texture(c));
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1.6, 1.6);
    return t;
  })();
  const leafMat = keep(
    new THREE.MeshStandardMaterial({ map: leaf, metalness: 0.85, roughness: 0.34 }),
  );
  const shapePt = (at: readonly [number, number]) => {
    const [x, z] = project(at);
    return new THREE.Vector2(x, -z);
  };
  const extrude = (shape: THREE.Shape, depth: number) =>
    keep(
      new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: true,
        bevelThickness: 0.012,
        bevelSize: 0.014,
        bevelSegments: 2,
        curveSegments: 6,
      }),
    );
  const mapGroup = new THREE.Group();
  mapGroup.rotation.x = -Math.PI / 2;
  mapGroup.position.y = BED + 0.002;
  scene.add(mapGroup);
  const mainland = new THREE.Mesh(extrude(new THREE.Shape(OUTLINE.map(shapePt)), 0.035), leafMat);
  mainland.castShadow = mainland.receiveShadow = true;
  mapGroup.add(mainland);
  for (const isl of ISLANDS) {
    const s = new THREE.Shape();
    const c = shapePt(isl.at);
    s.absellipse(c.x, c.y, projectRadius(isl.r) * 0.7, projectRadius(isl.r) * 1.2, 0, Math.PI * 2);
    mapGroup.add(new THREE.Mesh(extrude(s, 0.03), leafMat));
  }
  const dotGeo = keep(new THREE.CylinderGeometry(0.022, 0.022, 0.03, 10));
  for (const a of ARCHIPELAGOS)
    for (const d of a.dots) {
      const [x, z] = project(d);
      const dot = new THREE.Mesh(dotGeo, leafMat);
      dot.position.set(x, BED + 0.018, z);
      scene.add(dot);
    }

  // Ghim tám vùng: kim vàng, đầu ghim màu vùng, nhãn tên.
  const needleGeo = keep(new THREE.CylinderGeometry(0.01, 0.01, 0.2, 6));
  const headGeo = keep(new THREE.SphereGeometry(0.055, 16, 12));
  const groupMats = GROUPS.map((gr) =>
    keep(new THREE.MeshPhysicalMaterial({ color: gr.color, roughness: 0.25, clearcoat: 1 })),
  );
  for (const pin of PINS) {
    const [x, z] = project(pin.at);
    const needle = new THREE.Mesh(needleGeo, goldMat);
    needle.position.set(x, BED + 0.13, z);
    const head = new THREE.Mesh(headGeo, groupMats[pin.group]);
    head.position.set(x, BED + 0.24, z);
    head.castShadow = needle.castShadow = true;
    scene.add(needle, head);
    const label = keep(texture(drawLabel(pin.name, { size: 40 })));
    const sprite = new THREE.Sprite(
      keep(new THREE.SpriteMaterial({ map: label, transparent: true, depthWrite: false })),
    );
    const img = label.image as HTMLCanvasElement;
    const h = 0.17;
    const w = (img.width / img.height) * h;
    sprite.scale.set(w, h, 1);
    const sideDir = PIN_SIDE[pin.name] ?? 1;
    sprite.position.set(x + sideDir * (w / 2 + 0.07), BED + 0.26, z);
    scene.add(sprite);
  }

  // --- Ô được làm nổi (đang hỏi mua, đấu giá): miếng khảm nhấc lên, quầng vàng bên dưới ---
  const glowMat = keep(
    new THREE.MeshBasicMaterial({
      color: PALETTE.goldHi,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const glow = new THREE.Mesh(keep(new THREE.PlaneGeometry(1, 1)), glowMat);
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = BED + 0.002;
  scene.add(glow);
  let lifted: number | null = null;

  // --- Chủ đất (dải màu ở mép ngoài ô), lớp phủ cầm cố ---
  const deedGroup = new THREE.Group();
  scene.add(deedGroup);
  const ownerGeo = keep(new THREE.BoxGeometry(1, 0.025, 1));
  const ownerMats = TOKENS.map((t) =>
    keep(
      new THREE.MeshStandardMaterial({
        color: t.color,
        roughness: 0.4,
        emissive: t.color,
        emissiveIntensity: 0.3,
      }),
    ),
  );
  const mortgageMat = keep(
    new THREE.MeshBasicMaterial({
      color: '#000000',
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    }),
  );
  const mortgageGeo = keep(new THREE.PlaneGeometry(1, 1));

  // --- Nhà theo cấp ---
  const facadeTex = (wall: string, floors: number) => {
    const t = keep(texture(drawFacade(wall)));
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1, floors);
    return t;
  };
  const mat = (o: THREE.MeshPhysicalMaterialParameters) => keep(new THREE.MeshPhysicalMaterial(o));
  const M = {
    earth: mat({ color: '#c9a26b', roughness: 0.9 }),
    thatch: mat({ color: '#9a7a3e', roughness: 0.95 }),
    wall: mat({ map: facadeTex('#efe3c8', 1), roughness: 0.7 }),
    tall: mat({ map: facadeTex('#e6c35a', 3), roughness: 0.7 }),
    four: mat({ map: facadeTex('#9cc9b4', 4), roughness: 0.7 }),
    tile: mat({ color: PALETTE.cinnabar, roughness: 0.35, clearcoat: 0.8 }),
    lacquer: mat({ color: PALETTE.cinnabar, roughness: 0.25, clearcoat: 1 }),
  };
  const G = {
    hut: keep(new THREE.BoxGeometry(0.24, 0.12, 0.18)),
    thatch: (() => {
      const g = keep(new THREE.ConeGeometry(0.2, 0.17, 4));
      g.rotateY(Math.PI / 4);
      g.scale(1.25, 1, 1);
      return g;
    })(),
    /** Mái hai dốc rộng w (trục x), cao h, sâu d; đầu hồi tam giác quay về phía người xem. */
    gable: (w: number, h: number, d: number) => {
      const s = new THREE.Shape();
      s.moveTo(-w / 2, 0);
      s.lineTo(w / 2, 0);
      s.lineTo(0, h);
      s.closePath();
      const g = keep(new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }));
      g.translate(0, 0, -d / 2);
      return g;
    },
    box: (w: number, h: number, d: number) => keep(new THREE.BoxGeometry(w, h, d)),
    tier: (r: number, h: number) => {
      const g = keep(new THREE.ConeGeometry(r, h, 4));
      g.rotateY(Math.PI / 4);
      return g;
    },
  };
  const piece = (geo: THREE.BufferGeometry, m: THREE.Material, y: number) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.y = y;
    mesh.castShadow = mesh.receiveShadow = true;
    return mesh;
  };
  const shapes = {
    gable2: G.gable(0.36, 0.2, 0.28),
    gable3: G.gable(0.32, 0.17, 0.26),
    gable4: G.gable(0.32, 0.16, 0.28),
    walls2: G.box(0.28, 0.18, 0.22),
    lower3: G.box(0.3, 0.16, 0.24),
    eave3: G.box(0.37, 0.025, 0.3),
    upper3: G.box(0.24, 0.14, 0.2),
    tower4: G.box(0.26, 0.45, 0.24),
    balcony: G.box(0.29, 0.02, 0.05),
    tower5: G.box(0.28, 0.6, 0.26),
    roof5: G.box(0.33, 0.03, 0.31),
    kiosk: G.gable(0.16, 0.08, 0.14),
    balcony5: G.box(0.31, 0.02, 0.05),
    h1: G.box(0.34, 0.18, 0.32),
    h2: G.box(0.26, 0.14, 0.24),
    h3: G.box(0.18, 0.12, 0.17),
    r1: G.tier(0.32, 0.09),
    r2: G.tier(0.26, 0.08),
    r3: G.tier(0.19, 0.1),
    finial: keep(new THREE.SphereGeometry(0.03, 10, 8)),
  };
  /** Nhà theo cấp: 0 nhà tranh (vừa mua), 1 nhà ngói, 2 nhà hai tầng, 3 nhà phố, 4 nhà bốn tầng, 5 khách sạn. */
  const makeBuilding = (level: number) => {
    const b = new THREE.Group();
    switch (level) {
      case 0: // Nhà tranh vách đất.
        b.add(piece(G.hut, M.earth, 0.06), piece(G.thatch, M.thatch, 0.12 + 0.085));
        break;
      case 1: // Nhà ngói.
        b.add(piece(shapes.walls2, M.wall, 0.09), piece(shapes.gable2, M.tile, 0.18));
        break;
      case 2: // Nhà hai tầng, mái hiên giữa.
        b.add(
          piece(shapes.lower3, M.wall, 0.08),
          piece(shapes.eave3, M.tile, 0.17),
          piece(shapes.upper3, M.wall, 0.25),
          piece(shapes.gable3, M.tile, 0.32),
        );
        break;
      case 3: {
        // Nhà phố ba tầng vàng kiểu Hội An, ban công mỗi tầng.
        b.add(piece(shapes.tower4, M.tall, 0.225), piece(shapes.gable4, M.tile, 0.45));
        for (const y of [0.15, 0.3]) {
          const bal = piece(shapes.balcony, M.tile, y);
          bal.position.z = 0.13;
          b.add(bal);
        }
        break;
      }
      case 4: {
        // Nhà bốn tầng xanh ngọc, sân thượng có chòi mái ngói nhỏ.
        b.add(
          piece(shapes.tower5, M.four, 0.3),
          piece(shapes.roof5, M.tile, 0.615),
          piece(shapes.kiosk, M.tile, 0.63),
        );
        for (const y of [0.15, 0.3, 0.45]) {
          const bal = piece(shapes.balcony5, M.tile, y);
          bal.position.z = 0.14;
          b.add(bal);
        }
        break;
      }
      case HOTEL: // Khách sạn ba tầng mái chùa dát vàng (mỗi tầng: thân son, mái vàng đè lên).
        b.add(
          piece(shapes.h1, M.lacquer, 0.09),
          piece(shapes.r1, goldMat, 0.225),
          piece(shapes.h2, M.lacquer, 0.31),
          piece(shapes.r2, goldMat, 0.42),
          piece(shapes.h3, M.lacquer, 0.5),
          piece(shapes.r3, goldMat, 0.61),
          piece(shapes.finial, goldMat, 0.69),
        );
        break;
    }
    return b;
  };
  /** Nhà đang đứng trên từng ô đất có chủ (ga, điện, nước không dựng nhà). */
  const lots = new Map<number, { level: number; owner: number; obj: THREE.Group }>();
  /** Ô đang chạy hiệu ứng: setDeeds không động vào. */
  const busyLots = new Set<number>();
  const placeLot = (sq: number, level: number, owner: number | null) => {
    const old = lots.get(sq);
    if (old && old.level === level && old.owner === owner) return old.obj;
    if (old) scene.remove(old.obj);
    lots.delete(sq);
    if (owner === null || BOARD[sq]!.kind !== 'land') return null;
    const obj = makeBuilding(level);
    obj.position.copy(lotOf(sq));
    obj.scale.setScalar(BUILD);
    // Nhà quay mặt về phía người xem cho mọi ô (camera cố định ở cạnh dưới).
    scene.add(obj);
    lots.set(sq, { level, owner, obj });
    return obj;
  };

  const placeDeeds = (deeds: Record<number, Deed>) => {
    deedGroup.clear();
    for (const [key, d] of Object.entries(deeds)) {
      const sq = Number(key);
      if (!busyLots.has(sq)) placeLot(sq, d.houses, d.owner);
      if (d.owner === null) continue;
      const r = rectOf(sq);
      const [ix, iz] = inward(r.side);
      const along = r.side % 2 === 0;
      // Dải màu chủ đất ở mép ngoài ô, như con dấu son.
      const strip = new THREE.Mesh(ownerGeo, ownerMats[d.owner]);
      strip.scale.set(along ? r.w * 0.86 : 0.13, 1, along ? 0.13 : r.d * 0.86);
      strip.position.set(r.x - ix * (r.w / 2 - 0.11), SURF + 0.012, r.z - iz * (r.d / 2 - 0.11));
      deedGroup.add(strip);
      if (d.mortgaged) {
        const veil = new THREE.Mesh(mortgageGeo, mortgageMat);
        veil.rotation.x = -Math.PI / 2;
        veil.scale.set(r.w - GAP, r.d - GAP, 1);
        veil.position.set(r.x, SURF + 0.004, r.z);
        deedGroup.add(veil);
      }
    }
  };

  // --- Hiệu ứng (xây nhà): mỗi hiệu ứng chạy theo thời gian rồi tự dọn ---
  type Fx = { t0: number; ms: number; step: (k: number) => void; end?: () => void };
  let fxs: Fx[] = [];
  const dot = (() => {
    const [c, g] = canvas(64, 64);
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return keep(texture(c));
  })();
  const ringGeo = keep(new THREE.RingGeometry(0.85, 1, 40));
  const burst = (at: THREE.Vector3, level: number, up: boolean) => {
    const now = performance.now();
    // Bụi đất toả ra quanh chân nhà.
    const dust = Array.from({ length: 14 }, (_, k) => {
      const m = new THREE.SpriteMaterial({
        map: dot,
        color: '#e8d9b8',
        transparent: true,
        depthWrite: false,
      });
      const s = new THREE.Sprite(m);
      const a = (k / 14) * Math.PI * 2;
      s.userData.dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      s.position.copy(at);
      scene.add(s);
      return s;
    });
    fxs.push({
      t0: now,
      ms: 700,
      step: (k) =>
        dust.forEach((s) => {
          const d = s.userData.dir as THREE.Vector3;
          s.position.set(
            at.x + d.x * (0.2 + k * 0.55),
            at.y + 0.04 + k * 0.12,
            at.z + d.z * (0.2 + k * 0.55),
          );
          s.scale.setScalar(0.16 + k * 0.3);
          (s.material as THREE.SpriteMaterial).opacity = (1 - k) * 0.8;
        }),
      end: () =>
        dust.forEach((s) => {
          scene.remove(s);
          s.material.dispose();
        }),
    });
    if (!up) return;
    // Vòng sóng vàng loang ra trên mặt ô.
    const ringMat = new THREE.MeshBasicMaterial({
      color: PALETTE.goldHi,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(at.x, at.y + 0.01, at.z);
    scene.add(ring);
    fxs.push({
      t0: now,
      ms: 600,
      step: (k) => {
        ring.scale.setScalar(0.2 + k * 0.95);
        ringMat.opacity = 1 - k;
      },
      end: () => {
        scene.remove(ring);
        ringMat.dispose();
      },
    });
    // Tia vàng bắn lên, cấp càng cao càng nhiều.
    const sparks = Array.from({ length: 10 + level * 6 }, () => {
      const m = new THREE.SpriteMaterial({
        map: dot,
        color: Math.random() < 0.7 ? PALETTE.goldHi : '#ffffff',
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const s = new THREE.Sprite(m);
      const a = Math.random() * Math.PI * 2;
      const sp = 0.25 + Math.random() * 0.35;
      s.userData.v = new THREE.Vector3(
        Math.cos(a) * sp,
        1.1 + Math.random() * 0.9,
        Math.sin(a) * sp,
      );
      s.position.copy(at);
      scene.add(s);
      return s;
    });
    fxs.push({
      t0: now + 160,
      ms: 900,
      step: (k) =>
        sparks.forEach((s) => {
          const v = s.userData.v as THREE.Vector3;
          s.position.set(at.x + v.x * k, at.y + 0.2 + v.y * k * 0.6 - k * k * 0.5, at.z + v.z * k);
          s.scale.setScalar(0.13 * (1 - k * 0.5));
          (s.material as THREE.SpriteMaterial).opacity = k < 0.05 ? 0 : 1 - k;
        }),
      end: () =>
        sparks.forEach((s) => {
          scene.remove(s);
          s.material.dispose();
        }),
    });
  };
  /** Nhãn nổi lên trên nhà rồi mờ dần. */
  const floatLabel = (at: THREE.Vector3, text: string, gold: boolean) => {
    const tex = texture(
      drawLabel(text, { size: 52, ...(gold ? {} : { color: PALETTE.eggshell }) }),
    );
    const m = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
    const s = new THREE.Sprite(m);
    const img = tex.image as HTMLCanvasElement;
    const h = 0.5;
    s.scale.set((img.width / img.height) * h, h, 1);
    s.renderOrder = 10;
    scene.add(s);
    fxs.push({
      t0: performance.now() + 200,
      ms: 1300,
      step: (k) => {
        s.position.set(at.x, at.y + 1.55 + k * 0.45, at.z);
        m.opacity = k < 0.15 ? k / 0.15 : k > 0.7 ? (1 - k) / 0.3 : 1;
      },
      end: () => {
        scene.remove(s);
        m.dispose();
        tex.dispose();
      },
    });
  };

  // --- Quân: nhân vật trên đế vàng viền màu người chơi ---
  const baseGeo = keep(new THREE.CylinderGeometry(0.17, 0.19, 0.045, 32));
  const ringTokenGeo = keep(new THREE.TorusGeometry(0.19, 0.026, 10, 40));
  ringTokenGeo.rotateX(Math.PI / 2);
  type Token = {
    group: THREE.Group;
    /** Mô hình nhân vật (thay khi đổi nhân vật). */
    figure: THREE.Group | null;
    /** Hướng mặt hiện tại (radian quanh trục y), xoay dần về hướng cần nhìn. */
    yaw: number;
    ringMat: THREE.MeshStandardMaterial;
    character: string | null;
    square: number;
    queue: THREE.Vector3[];
    anim: null | { from: THREE.Vector3; to: THREE.Vector3; t0: number; ms: number; arc: number };
    done: (() => void) | null;
    /** Bước sắp tới là bay thẳng (bị tạm giữ, thẻ dịch chuyển) thay vì nhảy từng ô. */
    jump: boolean;
  };
  const tokens: Token[] = TOKENS.map((t) => {
    const group = new THREE.Group();
    const base = new THREE.Mesh(baseGeo, goldMat);
    base.position.y = 0.0225;
    const ringMat = keep(
      new THREE.MeshStandardMaterial({
        color: t.color,
        emissive: t.color,
        emissiveIntensity: 0.35,
        roughness: 0.35,
      }),
    );
    const ring = new THREE.Mesh(ringTokenGeo, ringMat);
    ring.position.y = 0.035;
    base.castShadow = true;
    group.add(base, ring);
    group.visible = false;
    scene.add(group);
    return {
      group,
      figure: null,
      yaw: 0,
      ringMat,
      character: null,
      square: 0,
      queue: [],
      anim: null,
      done: null,
      jump: false,
    };
  });
  let turn: number | null = null;
  /** Chỗ (thứ tự) của một quân trong ô, theo các quân đang đứng chung. */
  const restOf = (i: number) => {
    const t = tokens[i]!;
    const mates = tokens
      .map((x, k) => ({ x, k }))
      .filter(({ x }) => x.group.visible && x.square === t.square && !x.anim && !x.queue.length);
    return spotIn(
      t.square,
      Math.max(
        0,
        mates.findIndex((m) => m.k === i),
      ),
    );
  };

  // --- Xúc xắc ---
  const dieGeo = keep(new RoundedBoxGeometry(DIE, DIE, DIE, 5, 0.08));
  const dieMats = DIE_FACES.map((v) =>
    keep(new THREE.MeshStandardMaterial({ map: keep(texture(drawDieFace(v))), roughness: 0.4 })),
  );
  const dice = [0, 1].map(() => {
    const m = new THREE.Mesh(dieGeo, dieMats);
    m.castShadow = true;
    m.visible = false;
    scene.add(m);
    return m;
  });
  let rolling: null | {
    from: THREE.Vector3[];
    to: THREE.Vector3[];
    end: THREE.Quaternion[];
    axis: THREE.Vector3[];
    t0: number;
    done: () => void;
  } = null;
  let diceHideAt = 0;

  // --- Camera: nhìn chếch từ phía cạnh dưới ---
  let width = 1;
  let height = 1;
  /** Phần màn bị dải người chơi (trên) và khay nút (dưới) che, tính bằng px. */
  let insetTop = 0;
  const baseEye = new THREE.Vector3();
  const baseLook = new THREE.Vector3();
  /** Camera đang sà lại một chỗ (hiệu ứng xây nhà). */
  let focus: null | { at: THREE.Vector3; t0: number; ms: number } = null;
  const eye = new THREE.Vector3();
  const look = new THREE.Vector3();
  let insetBottom = 0;
  const fit = () => {
    const aspect = width / height;
    const vfov =
      aspect < 1
        ? Math.min(72, (2 * Math.atan(Math.tan((54 * Math.PI) / 360) / aspect) * 180) / Math.PI)
        : 38;
    camera.fov = vfov;
    const tv = Math.tan((vfov * Math.PI) / 360);
    const th = tv * aspect;
    const span = B + 0.6;
    // Bàn phải lọt khoảng trống giữa dải người chơi và khay nút; nhìn chếch, bàn cao chừng
    // span·sin(góc) trên màn, cộng phần quân hàng trên đứng nhô lên.
    const avail = Math.max(0.35, (height - insetTop - insetBottom) / height);
    const r = Math.max((span * 0.58) / th, (span * Math.sin(ELEVATION) * 0.5 + 0.5) / (tv * avail));
    baseEye.set(0, TOP + Math.sin(ELEVATION) * r, Math.cos(ELEVATION) * r + 0.4);
    baseLook.set(0, TOP, 0.4);
    camera.position.copy(baseEye);
    camera.lookAt(baseLook);
    // Dời khung hình để tâm bàn nằm giữa khoảng trống đó thay vì giữa màn.
    camera.setViewOffset(width, height, 0, (insetBottom - insetTop) / 2, width, height);
    camera.updateProjectionMatrix();
    (scene.fog as THREE.Fog).near = r + 4;
    (scene.fog as THREE.Fog).far = r + 30;
  };

  // --- Vòng vẽ ---
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const spin = new THREE.Quaternion();
  let raf = 0;
  const ease = (k: number) => k * k * (3 - 2 * k);
  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    if (focus) {
      const t = now - focus.t0;
      const IN = 380;
      const OUT = 450;
      const f =
        t < IN ? ease(t / IN) : t < focus.ms - OUT ? 1 : ease(Math.max(0, (focus.ms - t) / OUT));
      look.lerpVectors(baseLook, focus.at, f * 0.85);
      eye
        .subVectors(baseEye, baseLook)
        .multiplyScalar(1 - f * 0.55)
        .add(look);
      camera.position.copy(eye);
      camera.lookAt(look);
      if (t >= focus.ms) {
        focus = null;
        camera.position.copy(baseEye);
        camera.lookAt(baseLook);
      }
    }
    tokens.forEach((t, i) => {
      if (!t.group.visible) return;
      if (!t.anim && t.queue.length) {
        const to = t.queue.shift()!;
        t.anim = {
          from: t.group.position.clone(),
          to,
          t0: now,
          ms: reduce ? 1 : t.jump ? 650 : HOP_MS,
          arc: t.jump ? 2.2 : 0.35,
        };
        t.jump = false;
      }
      let squash = 0;
      if (t.anim) {
        const k = Math.min(1, (now - t.anim.t0) / t.anim.ms);
        t.group.position.lerpVectors(t.anim.from, t.anim.to, k);
        t.group.position.y += Math.sin(k * Math.PI) * t.anim.arc;
        squash = Math.sin(k * Math.PI);
        if (k >= 1) {
          t.anim = null;
          if (!t.queue.length && t.done) {
            const d = t.done;
            t.done = null;
            d();
          }
        }
      } else t.group.position.copy(restOf(i));
      // Đang bước thì quay mặt theo hướng đi; đứng yên thì quay về phía người xem.
      const want = t.anim
        ? Math.atan2(t.anim.to.x - t.anim.from.x, t.anim.to.z - t.anim.from.z)
        : Math.atan2(
            camera.position.x - t.group.position.x,
            camera.position.z - t.group.position.z,
          );
      let d = want - t.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      t.yaw += reduce ? d : d * 0.25;
      const f = t.figure;
      if (f) {
        // Nhún khi nhảy; người tới lượt nhún nhẹ và lắc lư; ai cũng thở nhè nhẹ.
        const active = turn === i && !reduce;
        const bob = active && !t.anim ? Math.abs(Math.sin(now / 240)) * 0.05 : 0;
        const breathe = reduce ? 0 : Math.sin(now / 600 + i) * 0.015;
        f.rotation.set(0, t.yaw, active && !t.anim ? Math.sin(now / 480) * 0.08 : 0);
        f.position.y = 0.045 + bob;
        f.scale.set(
          FIG * (1 + squash * 0.08 - breathe * 0.5),
          FIG * (1 - squash * 0.12 + breathe),
          FIG * (1 + squash * 0.08 - breathe * 0.5),
        );
      }
      t.ringMat.emissiveIntensity = turn === i ? 0.7 + Math.sin(now / 200) * 0.3 : 0.35;
    });

    if (rolling) {
      const k = Math.min(1, (now - rolling.t0) / (reduce ? 1 : ROLL_MS));
      const e = 1 - Math.pow(1 - k, 2.4);
      dice.forEach((m, j) => {
        m.position.lerpVectors(rolling!.from[j]!, rolling!.to[j]!, e);
        m.position.y += Math.abs(Math.sin(k * Math.PI * 3)) * (1 - k) * 1.2;
        spin.setFromAxisAngle(rolling!.axis[j]!, (1 - e) * Math.PI * 6);
        m.quaternion.copy(rolling!.end[j]!).multiply(spin);
      });
      if (k >= 1) {
        const d = rolling.done;
        rolling = null;
        diceHideAt = now + 2200;
        d();
      }
    } else if (diceHideAt && now > diceHideAt) {
      dice.forEach((m) => (m.visible = false));
      diceHideAt = 0;
    }

    if (fxs.length) {
      const live: Fx[] = [];
      for (const f of fxs) {
        const k = Math.max(0, Math.min(1, (now - f.t0) / f.ms));
        f.step(k);
        if (k >= 1) f.end?.();
        else live.push(f);
      }
      fxs = live;
    }

    // Ô đang hỏi mua: miếng khảm nhấc lên nhè nhẹ, quầng vàng thở bên dưới.
    tiles.forEach((m, i) => {
      const target =
        lifted === i
          ? TOP + TILE_H / 2 + 0.07 + (reduce ? 0 : Math.sin(now / 260) * 0.015)
          : TOP + TILE_H / 2;
      m.position.y += (target - m.position.y) * 0.2;
    });
    glowMat.opacity = lifted !== null ? 0.55 + Math.sin(now / 260) * 0.2 : 0;
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(tick);

  /**
   * Hiệu ứng dựng trên một ô: camera sà lại, nhà cũ lún xuống, nhà mới (nhà tranh khi vừa mua,
   * rồi lớn dần theo cấp) mọc lên bật nhẹ quá đà, bụi toả, tia vàng, nhãn nổi. Bán nhà thì chạy ngược lại.
   */
  const raise = (
    square: number,
    owner: number,
    level: number,
    up: boolean,
    label: string,
    done: () => void,
  ) => {
    const at = lotOf(square);
    busyLots.add(square);
    const ms = up ? 1650 : 950;
    const old = lots.get(square)?.obj;
    if (old) {
      lots.delete(square);
      fxs.push({
        t0: performance.now(),
        ms: up ? 160 : 320,
        step: (k) =>
          old.scale.set(
            BUILD * (1 - k * 0.3),
            BUILD * Math.max(0.01, 1 - k),
            BUILD * (1 - k * 0.3),
          ),
        end: () => scene.remove(old),
      });
    }
    focus = { at: at.clone(), t0: performance.now(), ms };
    burst(at, Math.max(1, level), up);
    floatLabel(at, label, up);
    const obj = placeLot(square, level, owner);
    if (obj) {
      obj.scale.set(BUILD * 0.6, 0.01, BUILD * 0.6);
      fxs.push({
        t0: performance.now() + (up ? 140 : 320),
        ms: up ? 560 : 300,
        step: (k) => {
          const e = up ? easeOutBack(k) : k;
          const w = BUILD * (0.6 + 0.4 * Math.min(1, k * 1.4));
          obj.scale.set(w, BUILD * Math.max(0.01, e), w);
        },
        end: () => obj.scale.setScalar(BUILD),
      });
    }
    setTimeout(() => {
      busyLots.delete(square);
      done();
    }, ms);
  };

  const raycaster = new THREE.Raycaster();

  return {
    setState: (pos, deeds, out) => {
      tokens.forEach((t, i) => {
        const at = pos[i];
        t.group.visible = at !== undefined && !out.includes(i);
        t.square = at ?? 0;
        t.queue = [];
        t.anim = null;
        t.done = null;
      });
      placeDeeds(deeds);
    },
    setDeeds: (deeds) => placeDeeds(deeds),
    setCharacters: (ids) => {
      tokens.forEach((t, i) => {
        const id = ids[i];
        if (!id || id === t.character) return;
        t.character = id;
        if (t.figure) {
          t.group.remove(t.figure);
          disposeFigure(t.figure);
        }
        t.figure = buildFigure(id);
        t.figure.scale.setScalar(FIG);
        t.group.add(t.figure);
      });
    },
    setTurn: (player) => {
      turn = player;
    },
    build: (square, level, owner, done) => {
      const prev = lots.get(square)?.level ?? 0;
      if (reduce || prev === level) {
        placeLot(square, level, owner);
        return done();
      }
      const up = level > prev;
      raise(
        square,
        owner,
        level,
        up,
        up ? LEVEL_NAME[level]! : `Còn ${LEVEL_NAME[level]!.toLowerCase()}`,
        done,
      );
    },
    claim: (square, owner, done) => {
      if (reduce) {
        placeLot(square, 0, owner);
        return done();
      }
      // Đất mua về dựng ngay nhà tranh; ga, điện, nước thì chỉ có hiệu ứng.
      raise(square, owner, 0, true, BOARD[square]!.kind === 'land' ? 'Nhà tranh' : 'Đã mua', done);
    },
    rollDice: (values, from, done) => {
      // Thả từ phía cạnh của người đổ (theo ô đang đứng), lăn vào vùng biển giữa bàn.
      const r = rectOf(from);
      const start = new THREE.Vector3(r.x, TOP + 1.6, r.z);
      rolling = {
        from: [
          start.clone().add(new THREE.Vector3(-0.3, 0, 0)),
          start.clone().add(new THREE.Vector3(0.3, 0, 0)),
        ],
        to: [
          new THREE.Vector3(1.05, BED + DIE / 2, 0.45),
          new THREE.Vector3(1.8, BED + DIE / 2, 0.75),
        ],
        end: values.map((v) =>
          new THREE.Quaternion()
            .setFromAxisAngle(UP, Math.random() * Math.PI * 2)
            .multiply(
              new THREE.Quaternion().setFromUnitVectors(DIE_NORMALS[DIE_FACES.indexOf(v)]!, UP),
            ),
        ),
        axis: [0, 1].map(() =>
          new THREE.Vector3(Math.random() - 0.5, 0.2, Math.random() - 0.5).normalize(),
        ),
        t0: performance.now(),
        done,
      };
      diceHideAt = 0;
      dice.forEach((m) => (m.visible = true));
    },
    move: (player, path, jump, done) => {
      const t = tokens[player]!;
      if (!path.length) return done();
      const last = path[path.length - 1]!;
      const hops = jump ? [last] : path;
      t.queue = hops.map((sq) => spotIn(sq, 0));
      t.jump = jump;
      t.square = last;
      t.done = done;
    },
    highlight: (square) => {
      lifted = square;
      if (square === null) return;
      const r = rectOf(square);
      glow.scale.set(r.w + 0.18, r.d + 0.18, 1);
      glow.position.set(r.x, BED + 0.002, r.z);
    },
    pick: (clientX, clientY) => {
      const rect = target.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(tiles, false)[0];
      return hit ? (hit.object.userData.square as number) : null;
    },
    retire: (player) => {
      tokens[player]!.group.visible = false;
    },
    setInsets: (top, bottom) => {
      insetTop = Math.max(0, top);
      insetBottom = Math.max(0, bottom);
      fit();
    },
    resize: (w, h) => {
      width = Math.max(1, w);
      height = Math.max(1, h);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      fit();
    },
    dispose: () => {
      cancelAnimationFrame(raf);
      for (const f of fxs) f.end?.();
      fxs = [];
      for (const t of tokens) if (t.figure) disposeFigure(t.figure);
      for (const d of disposables) d.dispose();
      renderer.dispose();
    },
  };
}
