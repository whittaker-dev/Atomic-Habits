import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CATALOG, ITEM, type Kind } from './catalog';
import { LOT, parseEdge, type House, type Rot, type WallKind } from './engine';
import { PALETTE, SEAT } from './theme';
import { drawTile, type TileId } from './tiles';

// Cảnh 3D của Nhà Mình (three.js): căn nhà cắt lớp trên bệ xi măng, nhìn như mô hình thu nhỏ. Sàn lát
// đúng viên gạch bông của từng ô (vẽ bằng tiles.ts). Tường trên mép lô quay về phía camera tự hạ
// thành gờ thấp để nhìn được vào trong; vách trong cao ngang hông. Kéo một ngón để xoay, chụm hai
// ngón hoặc cuộn chuột để phóng to; góc nhìn bị giới hạn để không chui xuống dưới sàn.
// Cảnh chỉ vẽ: chạm vào đâu thì báo toạ độ (và món đồ, nếu chạm trúng) cho giao diện tự quyết.

const WALL_H = 2.4;
const INNER_H = 1.3;
/** Chiều cao gờ còn lại của tường mép lô khi bị hạ (để vẫn thấy đường viền căn nhà). */
const STUB_H = 0.3;
const WALL_T = 0.14;
const DOOR_W = 0.9;
const WINDOW_W = 0.8;
const CENTER = new THREE.Vector3(LOT.w / 2, 0, LOT.d / 2);
/** Tám góc của khối bao lô đất (bệ tới đỉnh tường), để canh khung camera. */
const BOUNDS = [-0.8, LOT.w + 0.8].flatMap((x) =>
  [-0.8, LOT.d + 0.8].flatMap((z) => [-0.45, WALL_H].map((y) => new THREE.Vector3(x, y, z))),
);
const CORNERS = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
] as const;

export type Tap = { x: number; y: number; piece: string | null };
export type Ghost = { seat: 0 | 1; kind: Kind; x: number; y: number; rot: Rot; valid: boolean };
export type WallDraft = {
  seat: 0 | 1;
  x1: number;
  y1: number;
  x2: number | null;
  y2: number | null;
};
export type Label = { move: (pos: [number, number, number] | null) => void; remove: () => void };

export type HouseView = {
  setHouse: (h: House) => void;
  setGhosts: (g: Ghost[]) => void;
  setDrafts: (d: WallDraft[]) => void;
  setSelections: (s: { seat: 0 | 1; id: string }[]) => void;
  /** Chế độ xây: hiện lưới trên sàn. */
  setGrid: (on: boolean) => void;
  /** Đang đặt đồ: phần còn lại của căn nhà tối đi để món đang đặt nổi lên. */
  setFocus: (on: boolean) => void;
  zoom: (step: number) => void;
  resetView: () => void;
  /** Gắn một nhãn DOM bám theo một điểm trong cảnh. */
  label: (el: HTMLElement) => Label;
  dispose: () => void;
};

const mat = (color: string, roughness = 0.85) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });

/** Một khối hộp có bóng đổ, đặt theo đáy (y là mặt dưới). */
function box(w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

function cylinder(r: number, h: number, m: THREE.Material, x = 0, y = 0, z = 0, seg = 16) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), m);
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

type Mats = ReturnType<typeof makeMats>;

function makeMats() {
  return {
    wood: mat('#a8794f'),
    woodDark: mat('#6e4b2f'),
    white: mat('#efeae0', 0.6),
    metal: mat('#3a3631', 0.4),
    screen: mat('#1b1d20', 0.3),
    // Đỏ rượu và xanh rêu là màu của hai người chơi (bóng mờ, viền chọn, nhãn), nên đồ đạc không dùng
    // hai màu đó: sofa xanh rêu đặt cạnh nhãn của B sẽ bị đọc là đồ "của B".
    fabric: mat('#8a7f6e'),
    sand: mat('#d8c7a3'),
    ochre: mat(PALETTE.ochre),
    linen: mat('#f6f2ea'),
    leaf: new THREE.MeshStandardMaterial({ color: '#4f7a3a', roughness: 0.9, flatShading: true }),
    clay: mat('#b4623e'),
    red: mat('#b3261e', 0.5),
    gold: mat('#d9a93a', 0.35),
  };
}

/** Dựng một món đồ quanh gốc, mặt trước quay về +z, kích thước theo danh mục. */
function buildKind(kind: Kind, m: Mats): THREE.Group {
  const g = new THREE.Group();
  const { w, d } = ITEM[kind];
  const legs = (h: number, inset: number, mm: THREE.Material, size = 0.05) => {
    for (const [x, z] of CORNERS)
      g.add(box(size, h, size, mm, (x * (w - inset)) / 2, 0, (z * (d - inset)) / 2));
  };
  switch (kind) {
    case 'sofa':
      g.add(box(w, 0.4, d, m.fabric));
      g.add(box(w, 0.45, 0.22, m.fabric, 0, 0.4, -d / 2 + 0.11));
      g.add(box(0.2, 0.25, d, m.fabric, -w / 2 + 0.1, 0.4));
      g.add(box(0.2, 0.25, d, m.fabric, w / 2 - 0.1, 0.4));
      for (const x of [-w / 4, w / 4])
        g.add(box(w / 2 - 0.25, 0.1, d - 0.3, m.linen, x, 0.4, 0.08));
      break;
    case 'coffee':
      g.add(box(w, 0.05, d, m.wood, 0, 0.38));
      legs(0.38, 0.1, m.woodDark);
      break;
    case 'tv':
      g.add(box(w, 0.45, d, m.wood));
      g.add(box(1.2, 0.68, 0.05, m.screen, 0, 0.5, -0.05));
      g.add(box(0.3, 0.05, 0.2, m.metal, 0, 0.45, -0.05));
      break;
    case 'altar':
      // Bàn thờ: bàn gỗ sẫm cao, khăn đỏ, bát hương và hai cây nến vàng, đĩa quả.
      g.add(box(w, 0.06, d, m.woodDark, 0, 1.0));
      legs(1.0, 0.1, m.woodDark, 0.07);
      g.add(box(w - 0.1, 0.02, d - 0.06, m.red, 0, 1.06));
      g.add(cylinder(0.09, 0.12, m.gold, 0, 1.08, 0));
      for (const x of [-0.4, 0.4]) g.add(cylinder(0.03, 0.22, m.gold, x, 1.08, -0.05, 8));
      g.add(cylinder(0.12, 0.04, m.gold, 0.22, 1.08, 0.08));
      g.add(cylinder(0.07, 0.08, m.ochre, 0.22, 1.12, 0.08, 10));
      break;
    case 'rug':
      g.add(box(w, 0.015, d, m.ochre));
      g.add(box(w - 0.3, 0.02, d - 0.3, m.sand));
      break;
    case 'plant':
      g.add(cylinder(0.18, 0.35, m.clay));
      for (const [x, y, z, r] of [
        [0, 0.6, 0, 0.26],
        [0.12, 0.85, 0.05, 0.18],
        [-0.1, 0.8, -0.08, 0.2],
      ] as const) {
        const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), m.leaf);
        leaf.position.set(x, y, z);
        leaf.castShadow = true;
        g.add(leaf);
      }
      break;
    case 'fridge':
      g.add(box(w, 1.8, d, m.white));
      g.add(box(w - 0.04, 0.02, 0.02, m.metal, 0, 1.15, d / 2));
      g.add(box(0.04, 0.4, 0.04, m.metal, w / 2 - 0.12, 1.3, d / 2 + 0.02));
      break;
    case 'stove':
      g.add(box(w, 0.86, d, m.white));
      g.add(box(w, 0.04, d, m.woodDark, 0, 0.86));
      for (const x of [-0.25, 0.25]) g.add(cylinder(0.11, 0.03, m.metal, x, 0.9, 0));
      g.add(box(0.5, 0.18, 0.4, m.metal, -w / 2 + 0.35, 0.9, 0));
      break;
    case 'dining':
      g.add(box(w, 0.05, d, m.wood, 0, 0.72));
      legs(0.72, 0.12, m.woodDark, 0.06);
      for (const [x, z, r] of [
        [-0.35, -d / 2 - 0.25, 0],
        [0.35, -d / 2 - 0.25, 0],
        [-0.35, d / 2 + 0.25, Math.PI],
        [0.35, d / 2 + 0.25, Math.PI],
      ] as const) {
        const chair = new THREE.Group();
        chair.add(box(0.42, 0.05, 0.42, m.ochre, 0, 0.44));
        chair.add(box(0.42, 0.45, 0.05, m.wood, 0, 0.49, -0.19));
        for (const [a, b] of CORNERS)
          chair.add(box(0.04, 0.44, 0.04, m.woodDark, a * 0.18, 0, b * 0.18));
        chair.position.set(x, 0, z);
        chair.rotation.y = r;
        g.add(chair);
      }
      break;
    case 'bed2':
    case 'bed1': {
      const blanket = kind === 'bed2' ? m.sand : m.ochre;
      g.add(box(w, 0.3, d, m.wood));
      g.add(box(w - 0.08, 0.18, d - 0.1, m.linen, 0, 0.3));
      g.add(box(w - 0.06, 0.06, d * 0.55, blanket, 0, 0.47, d * 0.2));
      g.add(box(w, 0.7, 0.08, m.woodDark, 0, 0, -d / 2 + 0.04));
      const pillows = kind === 'bed2' ? [-w / 4, w / 4] : [0];
      for (const x of pillows)
        g.add(box(w / pillows.length - 0.2, 0.12, 0.35, m.white, x, 0.48, -d / 2 + 0.32));
      break;
    }
    case 'wardrobe':
      g.add(box(w, 2.0, d, m.wood));
      g.add(box(0.02, 1.8, 0.02, m.woodDark, 0, 0.1, d / 2));
      for (const x of [-0.08, 0.08]) g.add(box(0.03, 0.2, 0.03, m.metal, x, 1.0, d / 2 + 0.02));
      break;
    case 'desk':
      g.add(box(w, 0.04, d, m.wood, 0, 0.72));
      g.add(box(0.05, 0.72, d, m.woodDark, -w / 2 + 0.03));
      g.add(box(0.05, 0.72, d, m.woodDark, w / 2 - 0.03));
      g.add(cylinder(0.06, 0.02, m.metal, w / 2 - 0.2, 0.76, -0.1));
      g.add(cylinder(0.015, 0.35, m.metal, w / 2 - 0.2, 0.78, -0.1, 6));
      g.add(box(0.2, 0.1, 0.12, m.ochre, w / 2 - 0.2, 1.1, -0.05));
      g.add(box(0.42, 0.05, 0.42, m.fabric, 0, 0.44, d / 2 + 0.2));
      break;
    case 'shelf':
      // Khung hở mặt trước (hậu, hai hông, nóc) để thấy sách trên từng tầng.
      g.add(box(w, 1.6, 0.03, m.wood, 0, 0, -d / 2 + 0.015));
      for (const x of [-w / 2 + 0.015, w / 2 - 0.015]) g.add(box(0.03, 1.6, d, m.wood, x));
      g.add(box(w, 0.03, d, m.wood, 0, 1.57));
      for (const [y, c] of [
        [0.35, m.clay],
        [0.75, m.sand],
        [1.15, m.ochre],
      ] as const) {
        g.add(box(w - 0.08, 0.03, d - 0.04, m.woodDark, 0, y, 0.02));
        g.add(box(w * 0.55, 0.26, d - 0.12, c, -w * 0.12, y + 0.03, 0.04));
      }
      break;
  }
  return g;
}

let thumbs: Map<Kind, string> | null = null;

/**
 * Ảnh từng món đồ cho thẻ chọn đồ: dựng đúng mô hình buildKind, cùng ánh sáng và góc nhìn của cảnh,
 * chụp một lần rồi giữ lại. Dùng một ngữ cảnh WebGL tạm và trả nó ngay (trình duyệt giới hạn số ngữ
 * cảnh đang mở cùng lúc).
 */
export function furnitureThumbs(size = 192): Map<Kind, string> {
  if (thumbs) return thumbs;
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(size, size, false);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#fdf8ee', PALETTE.cementDeep, 1.5));
  const sun = new THREE.DirectionalLight('#fff1d6', 2.4);
  sun.position.set(-6, 14, 9);
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 100);
  const half = THREE.MathUtils.degToRad(camera.fov) / 2;
  const m = makeMats();
  const sphere = new THREE.Sphere();
  thumbs = new Map();
  for (const it of CATALOG) {
    const g = buildKind(it.kind, m);
    scene.add(g);
    new THREE.Box3().setFromObject(g).getBoundingSphere(sphere);
    const s = new THREE.Spherical(sphere.radius / Math.sin(half), 0.95, 0.72);
    camera.position.setFromSpherical(s).add(sphere.center);
    camera.lookAt(sphere.center);
    renderer.render(scene, camera);
    thumbs.set(it.kind, renderer.domElement.toDataURL());
    scene.remove(g);
    disposeGeometry(g);
  }
  Object.values(m).forEach((x) => x.dispose());
  renderer.dispose();
  renderer.forceContextLoss();
  return thumbs;
}

/**
 * Khung chữ nhật mảnh nằm trên sàn quanh một món (viền chọn, khung bóng mờ). Khung màu người chơi
 * nằm trên một viền vôi rộng hơn: gạch hoa thị nền đỏ rượu sẽ nuốt mất khung đỏ rượu nếu không có
 * viền sáng lót dưới.
 */
function footprint(w: number, d: number, m: THREE.Material, halo: THREE.Material) {
  const g = new THREE.Group();
  const W = w + 0.24;
  const D = d + 0.24;
  for (const [t, y, mm] of [
    [0.14, 0.008, halo],
    [0.07, 0.016, m],
  ] as const)
    for (const [sx, sz, x, z] of [
      [W + t, t, 0, -D / 2],
      [W + t, t, 0, D / 2],
      [t, D + t, -W / 2, 0],
      [t, D + t, W / 2, 0],
    ] as const) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.016, sz), mm);
      bar.position.set(x, y, z);
      g.add(bar);
    }
  return g;
}

/** Dựng một đoạn tường 1 m dọc trục x, có thể khoét cửa đi hoặc cửa sổ ở giữa. */
function wallUnit(
  kind: WallKind,
  h: number,
  wallMat: THREE.Material,
  capMat: THREE.Material,
  glass: THREE.Material,
) {
  const g = new THREE.Group();
  const solid = (from: number, to: number, y0: number, y1: number) => {
    if (to - from <= 0.001 || y1 - y0 <= 0.001) return;
    g.add(box(to - from, y1 - y0, WALL_T, wallMat, (from + to) / 2, y0, 0));
  };
  // Kéo dài mỗi đoạn ra nửa bề dày ở hai đầu để các góc tường liền nhau.
  const a = -WALL_T / 2;
  const b = 1 + WALL_T / 2;
  if (kind === 'wall') solid(a, b, 0, h);
  else {
    const width = kind === 'door' ? DOOR_W : WINDOW_W;
    const at = (1 - width) / 2;
    solid(a, at, 0, h);
    solid(at + width, b, 0, h);
    if (kind === 'door') solid(at, at + width, Math.min(2.05, h), h);
    else {
      solid(at, at + width, 0, Math.min(0.9, h));
      solid(at, at + width, Math.min(2.0, h), h);
      if (h > 1.2) {
        const pane = new THREE.Mesh(new THREE.BoxGeometry(width, 1.1, 0.03), glass);
        pane.position.set(at + width / 2, 1.45, 0);
        g.add(pane);
      }
    }
  }
  g.add(box(b - a, 0.03, WALL_T + 0.02, capMat, 0.5, h, 0));
  return g;
}

/** Huỷ hình học trong một nhóm (vật liệu dùng chung, huỷ một lần lúc đóng cảnh). */
function disposeGeometry(o: THREE.Object3D) {
  o.traverse((c) => {
    if (c instanceof THREE.Mesh) c.geometry.dispose();
  });
}

export function createHouseView(
  container: HTMLElement,
  /** insetTop: số px phía trên khung bị giao diện nổi che, camera canh nhà nằm dưới phần đó. */
  opts: { onTap?: (t: Tap) => void; insetTop?: number } = {},
): HouseView {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.style.touchAction = 'none';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.5, 200);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(CENTER);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.rotateSpeed = 0.6;
  controls.minPolarAngle = 0.35;
  controls.maxPolarAngle = 1.12;
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE };

  // Khoảng cách camera được tính lại theo khung (xem resize) để cả lô đất vừa màn, dọc hay ngang.
  const home = { radius: 22, polar: 0.82, azimuth: 0.72, target: CENTER.clone() };
  const resetView = () => {
    const s = new THREE.Spherical(home.radius, home.polar, home.azimuth);
    camera.position.copy(new THREE.Vector3().setFromSpherical(s).add(home.target));
    controls.target.copy(home.target);
    controls.update();
  };

  // Ánh sáng ban ngày trong nhà: trời sáng ấm từ trên, mặt trời chếch tạo bóng của đồ đạc.
  scene.add(new THREE.HemisphereLight('#fdf8ee', PALETTE.cementDeep, 1.5));
  const sun = new THREE.DirectionalLight('#fff1d6', 2.4);
  sun.position.set(CENTER.x - 6, 14, CENTER.z + 9);
  sun.target.position.copy(CENTER);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.radius = 4;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
  scene.add(sun, sun.target);

  const mats = makeMats();
  const dimmable: THREE.MeshStandardMaterial[] = [];
  const track = <T extends THREE.MeshStandardMaterial>(m: T) => (dimmable.push(m), m);
  Object.values(mats).forEach(track);

  // Bệ xi măng của lô đất; mặt bệ là sàn xi măng trơn của những ô chưa lát.
  const plinth = box(
    LOT.w + 1.4,
    0.35,
    LOT.d + 1.4,
    track(mat(PALETTE.cement)),
    CENTER.x,
    -0.35,
    CENTER.z,
  );
  plinth.castShadow = false;
  scene.add(plinth);
  const lip = box(
    LOT.w + 1.6,
    0.1,
    LOT.d + 1.6,
    track(mat(PALETTE.cementDeep)),
    CENTER.x,
    -0.45,
    CENTER.z,
  );
  lip.castShadow = false;
  scene.add(lip);

  // Vật liệu gạch: mỗi loại một vật liệu dùng chung, một ô 1 m lát 2×2 viên.
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const tileMats = new Map<TileId, THREE.MeshStandardMaterial>();
  const tileMat = (id: TileId) => {
    let m = tileMats.get(id);
    if (!m) {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 256;
      drawTile(cv.getContext('2d')!, id, 256);
      const tex = new THREE.CanvasTexture(cv);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(2, 2);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = aniso;
      m = track(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 }));
      base.set(m, m.color.clone());
      tileMats.set(id, m);
    }
    return m;
  };
  const cellGeo = new THREE.PlaneGeometry(1, 1);

  const wallMat = track(mat(PALETTE.lime, 0.95));
  const capMat = track(mat(PALETTE.cementDeep, 0.9));
  const glass = new THREE.MeshStandardMaterial({
    color: '#bcd8e0',
    transparent: true,
    opacity: 0.35,
    roughness: 0.1,
  });

  const ghostMats = SEAT.map(
    (s) =>
      new THREE.MeshStandardMaterial({
        color: s.color,
        // Tự phát sáng nhẹ để bóng mờ vẫn nổi khi căn nhà tối đi và khi nằm trên gạch cùng tông màu.
        emissive: s.color,
        emissiveIntensity: 0.45,
        transparent: true,
        opacity: 0.8,
        roughness: 0.6,
      }),
  );
  const badMat = new THREE.MeshStandardMaterial({
    color: '#7a726a',
    transparent: true,
    opacity: 0.4,
    roughness: 0.8,
  });
  const seatLine = SEAT.map((s) => new THREE.MeshBasicMaterial({ color: s.color }));
  const badLine = new THREE.MeshBasicMaterial({ color: PALETTE.ink });
  const halo = new THREE.MeshBasicMaterial({ color: PALETTE.lime });

  // Lớp của căn nhà, dựng lại mỗi khi nhà đổi.
  const floorGroup = new THREE.Group();
  const wallGroup = new THREE.Group();
  const pieceGroup = new THREE.Group();
  const overlay = new THREE.Group();
  scene.add(floorGroup, wallGroup, pieceGroup, overlay);

  /** Tường trên mép lô: dựng hai bản (cao và gờ) để bật tắt theo hướng camera. */
  type EdgeWall = { full: THREE.Group; stub: THREE.Group; normal: THREE.Vector3 };
  let rim: EdgeWall[] = [];
  const pieces = new Map<string, THREE.Group>();
  let house: House | null = null;

  const setHouse = (h: House) => {
    house = h;
    for (const g of [floorGroup, wallGroup, pieceGroup]) {
      disposeGeometry(g);
      g.clear();
    }
    pieces.clear();
    rim = [];

    h.floor.forEach((t, i) => {
      if (!t) return;
      const f = new THREE.Mesh(cellGeo, tileMat(t));
      f.rotation.x = -Math.PI / 2;
      f.position.set((i % LOT.w) + 0.5, 0.004, Math.floor(i / LOT.w) + 0.5);
      f.receiveShadow = true;
      floorGroup.add(f);
    });

    for (const [e, w] of Object.entries(h.walls)) {
      const p = parseEdge(e);
      if (!p) continue;
      const onRim = p.dir === 'h' ? p.y === 0 || p.y === LOT.d : p.x === 0 || p.x === LOT.w;
      const mk = (height: number) => {
        const g = wallUnit(w.kind, height, wallMat, capMat, glass);
        g.position.set(p.x, 0, p.y);
        // Cạnh dọc đi theo trục z: xoay để trục x của đoạn tường chạy theo +z.
        if (p.dir === 'v') g.rotation.y = -Math.PI / 2;
        g.traverse((o) => (o.userData.wall = e));
        wallGroup.add(g);
        return g;
      };
      if (onRim) {
        const normal =
          p.dir === 'h'
            ? new THREE.Vector3(0, 0, p.y === 0 ? -1 : 1)
            : new THREE.Vector3(p.x === 0 ? -1 : 1, 0, 0);
        rim.push({ full: mk(WALL_H), stub: mk(STUB_H), normal });
      } else mk(INNER_H);
    }

    for (const p of h.pieces) {
      const g = buildKind(p.kind, mats);
      g.position.set(p.x, 0.02, p.y);
      g.rotation.y = (-p.rot * Math.PI) / 2;
      g.traverse((o) => (o.userData.piece = p.id));
      pieces.set(p.id, g);
      pieceGroup.add(g);
    }
    drawOverlay();
  };

  // Lớp phủ: bóng mờ đồ đang cầm, đoạn tường đang vẽ, viền chọn, lưới.
  let ghosts: Ghost[] = [];
  let drafts: WallDraft[] = [];
  let selections: { seat: 0 | 1; id: string }[] = [];
  let grid = false;
  const gridLines = (() => {
    const pts: number[] = [];
    for (let x = 0; x <= LOT.w; x++) pts.push(x, 0.02, 0, x, 0.02, LOT.d);
    for (let y = 0; y <= LOT.d; y++) pts.push(0, 0.02, y, LOT.w, 0.02, y);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const lines = new THREE.LineSegments(
      geo,
      new THREE.LineBasicMaterial({ color: PALETTE.ink, transparent: true, opacity: 0.28 }),
    );
    lines.visible = false;
    scene.add(lines);
    return lines;
  })();
  const dotGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.04, 20);

  function drawOverlay() {
    disposeGeometry(overlay);
    overlay.clear();
    for (const gh of ghosts) {
      const g = buildKind(gh.kind, mats);
      const m = gh.valid ? ghostMats[gh.seat]! : badMat;
      g.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.material = m;
          o.castShadow = false;
        }
      });
      const it = ITEM[gh.kind];
      g.add(footprint(it.w, it.d, gh.valid ? seatLine[gh.seat]! : badLine, halo));
      g.position.set(gh.x, 0.02, gh.y);
      g.rotation.y = (-gh.rot * Math.PI) / 2;
      overlay.add(g);
    }
    for (const d of drafts) {
      const dot = new THREE.Mesh(dotGeo, seatLine[d.seat]!);
      dot.position.set(d.x1, 0.03, d.y1);
      overlay.add(dot);
      if (d.x2 === null || d.y2 === null) continue;
      const len = Math.hypot(d.x2 - d.x1, d.y2 - d.y1);
      if (len < 0.5) continue;
      const wall = box(len + WALL_T, INNER_H, WALL_T, ghostMats[d.seat]!);
      wall.castShadow = false;
      const g = new THREE.Group();
      g.add(wall);
      wall.position.x = len / 2;
      g.position.set(d.x1, 0, d.y1);
      g.rotation.y = -Math.atan2(d.y2 - d.y1, d.x2 - d.x1);
      overlay.add(g);
      const end = new THREE.Mesh(dotGeo, seatLine[d.seat]!);
      end.position.set(d.x2, 0.03, d.y2);
      overlay.add(end);
    }
    for (const s of selections) {
      const p = house?.pieces.find((q) => q.id === s.id);
      if (!p) continue;
      const it = ITEM[p.kind];
      const f = footprint(it.w, it.d, seatLine[s.seat]!, halo);
      f.position.set(p.x, 0.02, p.y);
      f.rotation.y = (-p.rot * Math.PI) / 2;
      overlay.add(f);
    }
    gridLines.visible = grid;
  }

  const camDir = new THREE.Vector3();
  const updateCutaway = () => {
    camDir.copy(camera.position).sub(controls.target).setY(0).normalize();
    for (const w of rim) {
      const facing = w.normal.dot(camDir) > 0.15;
      w.full.visible = !facing;
      w.stub.visible = facing;
    }
  };

  // Đang đặt đồ: mọi thứ trừ bóng mờ tối đi.
  const base = new Map(dimmable.map((m) => [m, m.color.clone()]));
  let focused = false;
  const setFocus = (on: boolean) => {
    focused = on;
    for (const m of dimmable) {
      // Màu của three.js là tuyến tính: 0,3 ở đây là tối đi chừng 40% khi nhìn bằng mắt.
      m.color.copy(base.get(m) ?? m.color).multiplyScalar(on ? 0.3 : 1);
    }
  };

  // Chạm (không kéo): báo điểm trên sàn và món đồ trúng (nếu có). Chạm vào thân tường thì lấy điểm
  // chạm trên tường, không lấy điểm sàn phía sau tường.
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hitPoint = new THREE.Vector3();
  let down: { x: number; y: number; id: number } | null = null;
  const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY, id: e.pointerId });
  const onUp = (e: PointerEvent) => {
    if (
      !down ||
      down.id !== e.pointerId ||
      Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8
    ) {
      down = null;
      return;
    }
    down = null;
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const visibleWalls = wallGroup.children.filter((c) => c.visible);
    const hit = ray.intersectObjects([...pieceGroup.children, ...visibleWalls], true)[0];
    if (hit?.object.userData.piece) {
      const p = hit.object.userData.piece as string;
      const q = house?.pieces.find((x) => x.id === p);
      opts.onTap?.({ x: q?.x ?? hit.point.x, y: q?.y ?? hit.point.z, piece: p });
      return;
    }
    if (hit?.object.userData.wall) {
      opts.onTap?.({ x: hit.point.x, y: hit.point.z, piece: null });
      return;
    }
    if (ray.ray.intersectPlane(ground, hitPoint))
      opts.onTap?.({ x: hitPoint.x, y: hitPoint.z, piece: null });
  };
  renderer.domElement.addEventListener('pointerdown', onDown);
  renderer.domElement.addEventListener('pointerup', onUp);

  // Nhãn DOM bám theo điểm trong cảnh.
  const labels = new Set<{ el: HTMLElement; pos: THREE.Vector3 | null }>();
  const v = new THREE.Vector3();
  const updateLabels = (w: number, h: number) => {
    for (const l of labels) {
      if (!l.pos) {
        l.el.style.visibility = 'hidden';
        continue;
      }
      v.copy(l.pos).project(camera);
      l.el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, -100%)`;
      l.el.style.visibility = v.z > 1 ? 'hidden' : 'visible';
    }
  };

  const size = { w: 1, h: 1 };
  let placed = false;
  const resize = () => {
    size.w = container.clientWidth || 1;
    size.h = container.clientHeight || 1;
    renderer.setSize(size.w, size.h, false);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    camera.aspect = size.w / size.h;
    camera.updateProjectionMatrix();
    // Khoảng cách gần nhất mà cả tám góc lô đất, nhìn từ góc ban đầu, vẫn nằm trong khung (chừa
    // lề 6%). Chiếu đúng các góc thay vì khối cầu bao: lô đất dẹt và nhìn chếch, khối cầu bao để
    // thừa cả mảng xi măng trống, nhất là trên màn ngang.
    // Nhìn chếch thì góc gần to hơn góc xa, nên lô đất lệch xuống dưới khung: hạ tâm nhìn cho tới
    // khi khối bao nằm giữa khung theo chiều dọc rồi canh lại khoảng cách.
    const probe = camera.clone();
    const v3 = new THREE.Vector3();
    const target = CENTER.clone();
    const place = (dist: number) => {
      probe.position.setFromSpherical(new THREE.Spherical(dist, home.polar, home.azimuth));
      probe.position.add(target);
      probe.lookAt(target);
      probe.updateMatrixWorld();
    };
    const top = 0.94 - (2 * (opts.insetTop ?? 0)) / size.h;
    const fits = (dist: number) => {
      place(dist);
      return BOUNDS.every((c) => {
        v3.copy(c).project(probe);
        return Math.abs(v3.x) <= 0.94 && v3.y <= top && v3.y >= -0.94;
      });
    };
    let fit = 200;
    // Ba lượt hạ tâm, lượt thứ tư chỉ canh khoảng cách cho tâm cuối cùng.
    for (let pass = 0; pass < 4; pass++) {
      let lo = 4;
      let hi = 200;
      for (let i = 0; i < 24; i++) {
        const mid = (lo + hi) / 2;
        if (fits(mid)) hi = mid;
        else lo = mid;
      }
      fit = hi;
      if (pass === 3) break;
      place(fit);
      let minY = Infinity;
      let maxY = -Infinity;
      for (const c of BOUNDS) {
        const y = v3.copy(c).project(probe).y;
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
      const halfH = fit * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
      const off = (minY + maxY) / 2 - (top - 0.94) / 2;
      target.y += (off * halfH) / Math.sin(home.polar);
    }
    home.radius = fit;
    home.target.copy(target);
    controls.minDistance = fit * 0.45;
    controls.maxDistance = fit * 1.5;
    if (!placed) {
      placed = true;
      resetView();
    }
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  renderer.setAnimationLoop(() => {
    controls.update();
    updateCutaway();
    renderer.render(scene, camera);
    updateLabels(size.w, size.h);
  });

  return {
    setHouse,
    setGhosts: (g) => {
      ghosts = g;
      drawOverlay();
    },
    setDrafts: (d) => {
      drafts = d;
      drawOverlay();
    },
    setSelections: (s) => {
      selections = s;
      drawOverlay();
    },
    setGrid: (on) => {
      grid = on;
      gridLines.visible = on;
    },
    setFocus: (on) => on !== focused && setFocus(on),
    zoom: (step) => {
      const offset = camera.position.clone().sub(controls.target);
      const len = THREE.MathUtils.clamp(
        offset.length() * (step > 0 ? 0.82 : 1.22),
        controls.minDistance,
        controls.maxDistance,
      );
      camera.position.copy(controls.target).add(offset.setLength(len));
    },
    resetView,
    label: (el) => {
      const entry = { el, pos: null as THREE.Vector3 | null };
      labels.add(entry);
      return {
        move: (pos) => (entry.pos = pos ? new THREE.Vector3(...pos) : null),
        remove: () => void labels.delete(entry),
      };
    },
    dispose: () => {
      renderer.setAnimationLoop(null);
      ro.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) {
          o.geometry.dispose();
          const ms = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of ms) {
            (m as THREE.MeshStandardMaterial).map?.dispose();
            m.dispose();
          }
        }
      });
      for (const m of [
        ...ghostMats,
        badMat,
        ...seatLine,
        badLine,
        halo,
        glass,
        ...tileMats.values(),
      ]) {
        m.map?.dispose();
        m.dispose();
      }
      cellGeo.dispose();
      dotGeo.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
