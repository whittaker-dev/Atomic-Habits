import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
  boardFloor,
  drawBoardBump,
  drawDieFace,
  drawGround,
  drawGroundBump,
  texture,
  warhorseShape,
} from './art';
import { N, pointOf, spotOf, type Cell, type House } from './board';
import { HOUSES } from './theme';

// Cảnh 3D của Cờ cá ngựa — bãi chiến trường Tây Sơn về đêm (three.js): bàn cờ là một đài đá khắc
// giữa bãi đá lát, bốn góc là bốn lò đuốc rực lửa và bốn lá cờ trận bay phần phật. Quân là chiến mã
// sơn màu nhà. Xúc xắc xương được thả từ phía người đổ, lăn vào giữa bàn. Đá ngựa: tia lửa, vòng
// xung kích, chớp sáng, camera sà vào rồi rung, con bị đá lộn vòng bay về chuồng. Camera nhìn toàn
// bàn từ phía nhà của người cầm máy và đứng yên ở đó (không quay theo lượt người khác).
// Toạ độ: điểm (x, y) liên tục trên bàn (tâm ô (c, r) là (c + 0.5, r + 0.5)) nằm ở (x - 7.5, 0, y - 7.5).

/** Độ cao mặt bàn cờ so với mặt đất. */
const SURFACE = 0.5;
const FRAME = N + 0.8;
const HOP_MS = 210;
const KICK_MS = 560;
/** Xúc xắc lăn từ mép bàn vào giữa trong chừng này. */
const ROLL_MS = 1300;
/** Xúc xắc nằm giữa bàn chừng này rồi lặn đi, để khỏi che quân gần tâm. */
const DIE_REST_MS = 2600;
const DIE = 0.72;
const ELEVATION = (56 * Math.PI) / 180;
const CAMERA_EASE = 0.05;
const EMBERS = 140;
const SPARKS = 200;
/** Hiệu ứng đá ngựa: tia lửa bay chừng này giây, vòng xung kích lan trong chừng này giây. */
const SPARK_S = 1.4;
const RING_S = 0.7;

export type HorseState = { house: House; slot: number; progress: number };

export type BoardView = {
  /** Đặt ngay mọi con ngựa vào chỗ (không hoạt ảnh). */
  setHorses: (horses: HorseState[]) => void;
  /** Đặt camera ở phía một nhà (nhà của người cầm máy này). */
  face: (house: House) => void;
  /** Thả xúc xắc từ phía một nhà, lăn vào giữa bàn; nằm yên với mặt trên là `value` thì gọi `done`. */
  rollDie: (value: number, house: House, done: () => void) => void;
  /** Cho một con ngựa nhảy từng ô theo `steps` (các số bước liên tiếp), rồi gọi `done`. */
  move: (
    house: House,
    slot: number,
    steps: number[],
    done: () => void,
    /** Gọi mỗi khi ngựa bắt đầu một bước nhảy (để phát tiếng vó). */
    onHop?: () => void,
  ) => void;
  /** Đá một con ngựa về chuồng: tóe lửa, rung camera. */
  kick: (house: House, slot: number) => void;
  resize: (width: number, height: number) => void;
  dispose: () => void;
};

const world = ([x, y]: Cell, lift = 0) => new THREE.Vector3(x - N / 2, SURFACE + lift, y - N / 2);

/** Hướng (x, z) từ tâm bàn ra góc chuồng của mỗi nhà. */
const CORNER: [number, number][] = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
];
/** Camera đứng ở cạnh bàn sao cho góc chuồng của nhà đang đi nằm phía trước bên trái. */
const sideAzimuth = (h: House) => ((3 - h) * Math.PI) / 2;

/** Mặt xúc xắc theo thứ tự vật liệu của khối hộp (+x, -x, +y, -y, +z, -z); mặt đối diện cộng lại 7. */
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

/** Đốm sáng tròn mềm cho tàn lửa và tia lửa. */
function glowSprite() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,240,200,1)');
  grad.addColorStop(0.35, 'rgba(255,150,60,0.9)');
  grad.addColorStop(1, 'rgba(255,80,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

/** Ngọn lửa: lõi trắng vàng thuôn lên, quầng cam tắt dần ra mép (vẽ một lần, dùng cho mọi lò đuốc). */
function flameSprite() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 96;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 66, 2, 32, 58, 40);
  grad.addColorStop(0, 'rgba(255,250,220,1)');
  grad.addColorStop(0.25, 'rgba(255,200,90,0.95)');
  grad.addColorStop(0.6, 'rgba(255,110,30,0.55)');
  grad.addColorStop(1, 'rgba(255,60,0,0)');
  g.fillStyle = grad;
  // Dáng giọt lửa: tròn ở dưới, nhọn ở trên.
  g.beginPath();
  g.moveTo(32, 2);
  g.bezierCurveTo(52, 34, 62, 58, 32, 94);
  g.bezierCurveTo(2, 58, 12, 34, 32, 2);
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createBoardView(target: HTMLCanvasElement): BoardView {
  const renderer = new THREE.WebGLRenderer({ canvas: target, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  const night = new THREE.Color('#0b0d10');
  scene.background = night;
  scene.fog = new THREE.Fog(night, 30, 70);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(x: T) => {
    disposables.push(x);
    return x;
  };

  // Phản chiếu mềm cho sơn bóng của chiến mã.
  const pmrem = keep(new THREE.PMREMGenerator(renderer));
  scene.environment = keep(pmrem.fromScene(new RoomEnvironment(), 0.04).texture);
  scene.environmentIntensity = 0.18;

  // --- Ánh sáng: trăng lạnh đổ bóng, bốn lò đuốc cam lập loè ---
  scene.add(new THREE.HemisphereLight('#3b4658', '#0b0d10', 0.55));
  const moon = new THREE.DirectionalLight('#a9bde0', 1.1);
  moon.position.set(-10, 20, 6);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  Object.assign(moon.shadow.camera, {
    left: -13,
    right: 13,
    top: 13,
    bottom: -13,
    near: 1,
    far: 50,
  });
  moon.shadow.bias = -0.0005;
  scene.add(moon);

  // --- Mặt đất: đá lát bãi chiến trường ---
  const groundTex = keep(texture(drawGround()));
  const groundBump = keep(new THREE.CanvasTexture(drawGroundBump()));
  for (const t of [groundTex, groundBump]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(26, 26);
  }
  const ground = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(130, 130)),
    keep(
      new THREE.MeshStandardMaterial({
        map: groundTex,
        bumpMap: groundBump,
        bumpScale: 2,
        roughness: 0.9,
      }),
    ),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // --- Đài đá: hai bậc đá sẫm, mặt bàn khắc ---
  const darkStone = keep(new THREE.MeshStandardMaterial({ color: '#2a2e34', roughness: 0.85 }));
  const step = new THREE.Mesh(
    keep(new RoundedBoxGeometry(FRAME + 1.6, 0.22, FRAME + 1.6, 2, 0.08)),
    darkStone,
  );
  step.position.y = 0.11;
  const dais = new THREE.Mesh(
    keep(new RoundedBoxGeometry(FRAME, SURFACE - 0.2, FRAME, 3, 0.1)),
    darkStone,
  );
  dais.position.y = 0.2 + (SURFACE - 0.2) / 2;
  for (const m of [step, dais]) {
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
  }
  const floorTex = keep(texture(boardFloor()));
  const board = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(N, N)),
    keep(
      new THREE.MeshStandardMaterial({
        map: floorTex,
        bumpMap: keep(new THREE.CanvasTexture(drawBoardBump())),
        bumpScale: 2.2,
        roughness: 0.78,
      }),
    ),
  );
  board.rotation.x = -Math.PI / 2;
  board.position.y = SURFACE + 0.002;
  board.receiveShadow = true;
  scene.add(board);
  // Chữ số trên mặt bàn vẽ trước khi font kịp tải thì vẽ lại khi font sẵn sàng (mặt bàn màn loading
  // đã vẽ sẵn với đúng font thì boardFloor trả lại đúng bản đó, khỏi vẽ lại).
  void document.fonts?.ready.then(() => {
    const floor = boardFloor();
    if (floor === floorTex.image) return;
    floorTex.image = floor;
    floorTex.needsUpdate = true;
  });

  // --- Bốn góc: lò đuốc và cờ trận ---
  const ironMat = keep(
    new THREE.MeshStandardMaterial({ color: '#30353c', metalness: 0.7, roughness: 0.45 }),
  );
  // Lửa: hai tấm sáng cộng màu (lõi trắng vàng, quầng cam) thay cho khối đặc, để đọc ra là lửa.
  const flameTex = keep(flameSprite());
  const flameMat = (opacity: number) =>
    keep(
      new THREE.SpriteMaterial({
        map: flameTex,
        transparent: true,
        opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      }),
    );
  const bowlGeo = keep(new THREE.CylinderGeometry(0.55, 0.3, 0.45, 18, 1, true));
  const legGeo = keep(new THREE.CylinderGeometry(0.08, 0.12, 1.6, 8));
  const poleGeo = keep(new THREE.CylinderGeometry(0.06, 0.07, 4.2, 8));
  const flagGeo = keep(new THREE.PlaneGeometry(1.7, 1.1, 14, 6));
  const torches: {
    corner: THREE.Group;
    light: THREE.PointLight;
    flames: THREE.Sprite[];
    seed: number;
  }[] = [];
  const flags: { geo: THREE.BufferGeometry; rest: Float32Array }[] = [];
  CORNER.forEach(([cx, cz], h) => {
    // Mỗi góc là một nhóm (lò đuốc + cờ) đặt theo khổ màn ở resize(): màn dọc kéo vào gần bàn.
    const corner = new THREE.Group();
    const out = new THREE.Vector3(cx, 0, cz).normalize();
    const leg = new THREE.Mesh(legGeo, ironMat);
    leg.position.y = 0.8;
    const bowl = new THREE.Mesh(bowlGeo, ironMat);
    bowl.position.y = 1.75;
    leg.castShadow = bowl.castShadow = true;
    const glow = new THREE.Sprite(flameMat(0.85));
    glow.scale.set(1.6, 2.1, 1);
    glow.position.y = 2.6;
    const core = new THREE.Sprite(flameMat(1));
    core.scale.set(0.8, 1.2, 1);
    core.position.y = 2.35;
    const light = new THREE.PointLight('#ff8a3c', 26, 22, 1.6);
    light.position.y = 2.6;
    corner.add(leg, bowl, glow, core, light);
    torches.push({ corner, light, flames: [glow, core], seed: h * 1.7 });

    // Cờ trận cắm cạnh lò đuốc, lệch ra ngoài một chút.
    const pole = new THREE.Mesh(poleGeo, ironMat);
    pole.position.copy(out).multiplyScalar(1.1).setY(2.1);
    pole.castShadow = true;
    const geo = keep(flagGeo.clone());
    // Cán cờ ở mép trái: dời lá cờ để mép trái nằm sát cán.
    geo.translate(0.85, 0, 0);
    const flag = new THREE.Mesh(
      geo,
      keep(
        new THREE.MeshStandardMaterial({
          color: HOUSES[h]!.hex,
          side: THREE.DoubleSide,
          roughness: 0.8,
          emissive: HOUSES[h]!.deep,
          emissiveIntensity: 0.25,
        }),
      ),
    );
    flag.position.copy(pole.position).setY(3.55);
    flag.rotation.y = Math.atan2(cx, cz) + Math.PI / 2;
    flag.castShadow = true;
    corner.add(pole, flag);
    scene.add(corner);
    flags.push({ geo, rest: Float32Array.from(geo.attributes.position!.array) });
  });
  /**
   * Đặt bốn góc. Màn ngang: ra hẳn ngoài đài đá. Màn dọc (bàn chiếm hết bề ngang): hai góc phía xa
   * sát mép bàn, hai góc phía gần dời vào dải đá trống giữa bàn và khay dưới, để cả bốn lọt khung.
   */
  const placeCorners = (portrait: boolean, viewer: House) => {
    const az = sideAzimuth(viewer);
    const toCam = new THREE.Vector3(Math.sin(az), 0, Math.cos(az));
    torches.forEach((t, h) => {
      const [cx, cz] = CORNER[h]!;
      const dir = new THREE.Vector3(cx, 0, cz);
      if (!portrait) return t.corner.position.copy(dir).multiplyScalar(FRAME / 2 + 1.3);
      if (dir.dot(toCam) <= 0) return t.corner.position.copy(dir).multiplyScalar(FRAME / 2 + 0.1);
      // Gần camera: giữ phía trái/phải của góc nhưng thu vào trong, đẩy ra trước mép bàn.
      const side = dir.clone().addScaledVector(toCam, -dir.dot(toCam)).normalize();
      t.corner.position
        .copy(toCam)
        .multiplyScalar(FRAME / 2 + 1.6)
        .addScaledVector(side, FRAME * 0.3);
    });
  };
  placeCorners(false, 0);

  // --- Tàn lửa bay lên từ các lò đuốc ---
  const spriteTex = keep(glowSprite());
  const emberGeo = keep(new THREE.BufferGeometry());
  const emberPos = new Float32Array(EMBERS * 3);
  const emberLife = new Float32Array(EMBERS);
  const resetEmber = (i: number) => {
    const at = torches[i % torches.length]!.corner.position;
    emberPos[i * 3] = at.x + (Math.random() - 0.5) * 0.6;
    emberPos[i * 3 + 1] = 2.2 + Math.random() * 0.3;
    emberPos[i * 3 + 2] = at.z + (Math.random() - 0.5) * 0.6;
    emberLife[i] = Math.random();
  };
  for (let i = 0; i < EMBERS; i++) {
    resetEmber(i);
    emberPos[i * 3 + 1] = 2.2 + Math.random() * 3;
  }
  emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
  scene.add(
    new THREE.Points(
      emberGeo,
      keep(
        new THREE.PointsMaterial({
          size: 0.16,
          map: spriteTex,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      ),
    ),
  );

  // --- Tia lửa khi đá ngựa ---
  const sparkGeo = keep(new THREE.BufferGeometry());
  const sparkPos = new Float32Array(SPARKS * 3);
  const sparkVel = new Float32Array(SPARKS * 3);
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  const sparkMat = keep(
    new THREE.PointsMaterial({
      size: 0.4,
      map: spriteTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0,
    }),
  );
  scene.add(new THREE.Points(sparkGeo, sparkMat));
  const flash = new THREE.PointLight('#ffb15c', 0, 14, 1.5);
  scene.add(flash);
  // Vòng xung kích lan trên mặt đá ở chỗ va.
  const ringMat = keep(
    new THREE.MeshBasicMaterial({
      color: '#ffb15c',
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }),
  );
  const ring = new THREE.Mesh(keep(new THREE.RingGeometry(0.75, 1, 56)), ringMat);
  ring.rotation.x = -Math.PI / 2;
  scene.add(ring);
  let sparkT0 = -1e9;
  let shake = 0;
  /** Camera sà lại gần chỗ va một nhịp rồi lùi về. */
  let punch: null | { at: THREE.Vector3; t0: number } = null;
  const punchPos = new THREE.Vector3();
  const lookAt = new THREE.Vector3();

  // --- Chiến mã ---
  const bodyGeo = keep(
    new THREE.ExtrudeGeometry(warhorseShape(), {
      depth: 0.22,
      bevelEnabled: true,
      bevelThickness: 0.07,
      bevelSize: 0.05,
      bevelSegments: 5,
      curveSegments: 20,
    }),
  );
  bodyGeo.center();
  const baseGeo = keep(
    new THREE.LatheGeometry(
      [
        [0, 0],
        [0.42, 0],
        [0.44, 0.05],
        [0.4, 0.1],
        [0.3, 0.14],
        [0.26, 0.2],
        [0.28, 0.24],
        [0, 0.24],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
      40,
    ),
  );
  const bandGeo = keep(new THREE.TorusGeometry(0.4, 0.035, 8, 40));
  const eyeGeo = keep(new THREE.SphereGeometry(0.045, 12, 8));
  const eyeMat = keep(new THREE.MeshBasicMaterial({ color: '#ffd38a' }));
  const paints = HOUSES.map((h) =>
    keep(
      new THREE.MeshPhysicalMaterial({
        color: h.hex,
        metalness: 0.6,
        roughness: 0.5,
      }),
    ),
  );
  const bands = HOUSES.map((h) =>
    keep(new THREE.MeshStandardMaterial({ color: h.hex, emissive: h.hex, emissiveIntensity: 0.6 })),
  );

  type Piece = {
    group: THREE.Group;
    house: House;
    slot: number;
    progress: number;
    anim: null | {
      from: THREE.Vector3;
      to: THREE.Vector3;
      t0: number;
      ms: number;
      arc: number;
      /** Số vòng lộn khi bay (con bị đá). */
      spin?: number;
    };
    queue: THREE.Vector3[];
    done: (() => void) | null;
    onHop: (() => void) | null;
  };
  const pieces: Piece[] = [];
  for (let h = 0; h < 4; h++)
    for (let slot = 0; slot < 4; slot++) {
      const group = new THREE.Group();
      const base = new THREE.Mesh(baseGeo, ironMat);
      const band = new THREE.Mesh(bandGeo, bands[h]);
      band.rotation.x = Math.PI / 2;
      band.position.y = 0.06;
      const body = new THREE.Mesh(bodyGeo, paints[h]);
      body.position.y = 0.24 + 0.53;
      // Mắt hai bên đầu: thân đã được dời về tâm khối, đầu nằm cao và lệch về phía mõm.
      const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
      eyeL.position.set(0.2, body.position.y + 0.3, 0.19);
      const eyeR = eyeL.clone();
      eyeR.position.z = -0.19;
      for (const m of [base, body]) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
      group.add(base, band, body, eyeL, eyeR);
      scene.add(group);
      pieces.push({
        group,
        house: h as House,
        slot,
        progress: -1,
        anim: null,
        queue: [],
        done: null,
        onHop: null,
      });
    }
  const pieceOf = (h: House, slot: number) => pieces[h * 4 + slot]!;

  /** Chỗ đặt một con ngựa; ngựa cùng nhà chung một ô thì xếp lệch nhau cho thấy đủ. */
  const restOf = (p: Piece) => {
    const pt = pointOf(p.house, spotOf(p.house, p.progress, p.slot));
    if (p.progress < 0) return world(pt);
    const mates = pieces.filter(
      (q) =>
        q.progress >= 0 &&
        q.house === p.house &&
        pointOf(q.house, spotOf(q.house, q.progress, q.slot)).join() === pt.join(),
    );
    const i = mates.indexOf(p);
    const off = mates.length > 1 ? (i - (mates.length - 1) / 2) * 0.22 : 0;
    return world([pt[0] + off, pt[1] - off]);
  };

  // --- Xúc xắc xương ---
  const die = new THREE.Mesh(
    keep(new RoundedBoxGeometry(DIE, DIE, DIE, 5, 0.12)),
    DIE_FACES.map((v) =>
      keep(
        new THREE.MeshStandardMaterial({
          map: keep(texture(drawDieFace(v))),
          roughness: 0.45,
        }),
      ),
    ),
  );
  die.castShadow = true;
  die.visible = false;
  scene.add(die);
  let dieAnim: null | {
    from: THREE.Vector3;
    to: THREE.Vector3;
    end: THREE.Quaternion;
    axis: THREE.Vector3;
    t0: number;
    done: () => void;
  } = null;
  /** Lúc xúc xắc bắt đầu lặn đi (0 là không có). */
  let dieSinkAt = 0;

  // --- Camera ---
  let width = 1;
  let height = 1;
  let house: House = 0;
  const camPos = new THREE.Vector3(0, 20, 30);
  const wantPos = new THREE.Vector3();
  const look = new THREE.Vector3(0, SURFACE, 0);
  let snapped = false;

  /** Nhìn toàn bàn từ phía nhà đang đi, đủ xa để bàn lọt khung theo khổ màn; trả về khoảng cách. */
  const overview = () => {
    const aspect = width / height;
    // Màn dọc: giữ góc nhìn ngang đủ rộng (góc dọc lớn hơn); màn ngang: góc dọc cố định.
    const vfov =
      aspect < 1
        ? Math.min(74, (2 * Math.atan(Math.tan((56 * Math.PI) / 360) / aspect) * 180) / Math.PI)
        : 40;
    camera.fov = vfov;
    const tv = Math.tan((vfov * Math.PI) / 360);
    const th = tv * aspect;
    const r = Math.max((FRAME * 0.62) / th, (FRAME * Math.sin(ELEVATION) * 0.74 + 1.2) / tv);
    const az = sideAzimuth(house);
    wantPos.set(
      Math.sin(az) * Math.cos(ELEVATION) * r,
      SURFACE + Math.sin(ELEVATION) * r,
      Math.cos(az) * Math.cos(ELEVATION) * r,
    );
    return r;
  };

  // --- Vòng vẽ ---
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const spin = new THREE.Quaternion();
  let raf = 0;
  let last = performance.now();
  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    // Camera lướt vòng quanh bàn tới phía nhà được chọn (nội suy theo cung tròn, không cắt ngang bàn).
    const dist = overview();
    if (!snapped || reduce) camPos.copy(wantPos);
    else {
      const r0 = Math.hypot(camPos.x, camPos.z);
      const a0 = Math.atan2(camPos.x, camPos.z);
      const a1 = Math.atan2(wantPos.x, wantPos.z);
      const da = Math.atan2(Math.sin(a1 - a0), Math.cos(a1 - a0));
      const a = a0 + da * CAMERA_EASE * 1.6;
      const r = r0 + (Math.hypot(wantPos.x, wantPos.z) - r0) * CAMERA_EASE;
      camPos.set(Math.sin(a) * r, camPos.y + (wantPos.y - camPos.y) * CAMERA_EASE, Math.cos(a) * r);
    }
    snapped = true;
    camera.position.copy(camPos);
    lookAt.copy(look);
    if (punch && !reduce) {
      // Lao vào nhanh, giữ một nhịp, rồi lùi về chậm.
      const t = (now - punch.t0) / 1000;
      const env = t < 0.15 ? t / 0.15 : t < 0.45 ? 1 : Math.max(0, 1 - (t - 0.45) / 0.5);
      punchPos.subVectors(camPos, punch.at).normalize().multiplyScalar(8).add(punch.at);
      camera.position.lerp(punchPos, env * 0.55);
      lookAt.lerp(punch.at, env * 0.7);
      if (t > 0.95) punch = null;
    }
    if (shake > 0.001 && !reduce) {
      camera.position.x += (Math.random() - 0.5) * shake;
      camera.position.y += (Math.random() - 0.5) * shake;
      shake *= 0.88;
    }
    camera.lookAt(lookAt);
    camera.updateProjectionMatrix();
    (scene.fog as THREE.Fog).near = dist + 4;
    (scene.fog as THREE.Fog).far = dist + 40;

    // Ngựa nhảy theo hàng đợi, luôn quay mình nghiêng về phía camera để thấy rõ dáng chiến mã.
    for (const p of pieces) {
      if (!p.anim && p.queue.length) {
        p.onHop?.();
        p.anim = {
          from: p.group.position.clone(),
          to: p.queue.shift()!,
          t0: now,
          ms: reduce ? 1 : HOP_MS,
          arc: 0.55,
        };
      }
      if (p.anim) {
        const t = Math.min(1, (now - p.anim.t0) / p.anim.ms);
        p.group.position.lerpVectors(p.anim.from, p.anim.to, t);
        p.group.position.y += Math.sin(t * Math.PI) * p.anim.arc;
        p.group.rotation.x = p.anim.spin ? t * p.anim.spin * Math.PI * 2 : 0;
        if (t >= 1) {
          p.group.rotation.x = 0;
          p.anim = null;
          if (!p.queue.length && p.done) {
            const d = p.done;
            p.done = null;
            d();
          }
        }
      } else p.group.position.copy(restOf(p));
      p.group.rotation.y = Math.atan2(camPos.x - p.group.position.x, camPos.z - p.group.position.z);
    }

    // Xúc xắc: lăn lộn từ mép bàn vào giữa, nảy ba lần nhỏ dần rồi nằm yên.
    if (dieAnim) {
      const t = Math.min(1, (now - dieAnim.t0) / (reduce ? 1 : ROLL_MS));
      const e = 1 - Math.pow(1 - t, 2.4);
      die.position.lerpVectors(dieAnim.from, dieAnim.to, e);
      die.position.y += Math.abs(Math.sin(t * Math.PI * 3)) * (1 - t) * 1.6;
      spin.setFromAxisAngle(dieAnim.axis, (1 - e) * Math.PI * 7);
      die.quaternion.copy(dieAnim.end).multiply(spin);
      if (t >= 1) {
        const d = dieAnim.done;
        dieAnim = null;
        shake = Math.max(shake, 0.06);
        dieSinkAt = now + DIE_REST_MS;
        d();
      }
    } else if (dieSinkAt && now > dieSinkAt) {
      // Lặn xuống mặt bàn rồi ẩn, để khỏi che quân ở gần tâm.
      const k = Math.min(1, (now - dieSinkAt) / 400);
      die.scale.setScalar(1 - k);
      if (k >= 1) {
        die.visible = false;
        dieSinkAt = 0;
      }
    }

    // Lửa đuốc lập loè, tàn lửa bay lên rồi tắt.
    for (const t of torches) {
      const f = Math.sin(now / 90 + t.seed) * 0.5 + Math.sin(now / 37 + t.seed * 3) * 0.3;
      t.light.intensity = 24 + f * 6;
      const [glow, core] = t.flames as [THREE.Sprite, THREE.Sprite];
      glow.scale.set(1.6 * (1 + f * 0.08), 2.1 * (1 + f * 0.16), 1);
      core.scale.set(0.8 * (1 - f * 0.06), 1.2 * (1 + f * 0.2), 1);
      glow.material.opacity = 0.75 + f * 0.15;
    }
    // Giảm chuyển động: tàn lửa đứng yên (vẫn thấy đốm sáng quanh lò, không bay liên tục).
    if (!reduce) {
      for (let i = 0; i < EMBERS; i++) {
        emberLife[i]! += dt * 0.5;
        emberPos[i * 3 + 1]! += dt * (0.9 + (i % 5) * 0.15);
        emberPos[i * 3]! += Math.sin(now / 400 + i) * dt * 0.3;
        if (emberLife[i]! > 1 || emberPos[i * 3 + 1]! > 7) resetEmber(i);
      }
      emberGeo.attributes.position!.needsUpdate = true;
    }

    // Cờ trận bay: sóng chạy từ cán ra mép ngoài.
    for (const fl of flags) {
      const pos = fl.geo.attributes.position!;
      for (let i = 0; i < pos.count; i++) {
        const x = fl.rest[i * 3]!;
        const wave = reduce ? 0 : Math.sin(x * 3.2 - now / 260) * 0.14 * (x / 1.7);
        pos.setZ(i, fl.rest[i * 3 + 2]! + wave);
      }
      pos.needsUpdate = true;
      fl.geo.computeVertexNormals();
    }

    // Tia lửa đá ngựa: văng ra, rơi xuống, tắt dần.
    const st = (now - sparkT0) / 1000;
    if (st < SPARK_S) {
      for (let i = 0; i < SPARKS; i++) {
        sparkVel[i * 3 + 1]! -= 9.8 * dt;
        sparkPos[i * 3]! += sparkVel[i * 3]! * dt;
        sparkPos[i * 3 + 1]! += sparkVel[i * 3 + 1]! * dt;
        sparkPos[i * 3 + 2]! += sparkVel[i * 3 + 2]! * dt;
      }
      sparkGeo.attributes.position!.needsUpdate = true;
      sparkMat.opacity = Math.max(0, 1 - st / SPARK_S);
      flash.intensity = Math.max(0, 90 * (1 - st * 3));
      const rk = Math.min(1, st / RING_S);
      ring.scale.setScalar(0.3 + (1 - Math.pow(1 - rk, 3)) * 4.2);
      ringMat.opacity = Math.max(0, 1 - rk);
    } else {
      sparkMat.opacity = 0;
      flash.intensity = 0;
      ringMat.opacity = 0;
    }

    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(tick);

  return {
    setHorses: (horses) => {
      for (const h of horses) {
        const p = pieceOf(h.house, h.slot);
        p.progress = h.progress;
        p.anim = null;
        p.queue = [];
      }
    },
    face: (h) => {
      house = h;
      placeCorners(width < height, h);
    },
    rollDie: (value, h, done) => {
      // Thả từ mép bàn phía người đổ, lăn vào giữa bàn.
      const az = sideAzimuth(h);
      const edge = new THREE.Vector3(Math.sin(az), 0, Math.cos(az));
      const from = edge.multiplyScalar(N / 2 - 0.6).setY(SURFACE + 2.2);
      const to = new THREE.Vector3(0, SURFACE + DIE / 2, 0);
      const face = DIE_FACES.indexOf(value);
      const end = new THREE.Quaternion()
        .setFromAxisAngle(UP, Math.random() * Math.PI * 2)
        .multiply(new THREE.Quaternion().setFromUnitVectors(DIE_NORMALS[face]!, UP));
      // Lăn quanh trục nằm ngang vuông góc với hướng lăn, như xúc xắc lộn vòng trên mặt bàn.
      const axis = new THREE.Vector3()
        .crossVectors(UP, to.clone().sub(from).setY(0).normalize())
        .add(new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).multiplyScalar(0.3))
        .normalize();
      die.visible = true;
      die.scale.setScalar(1);
      dieSinkAt = 0;
      dieAnim = { from, to, end, axis, t0: performance.now(), done };
    },
    move: (h, slot, steps, done, onHop) => {
      const p = pieceOf(h, slot);
      p.queue = steps.map((s) => world(pointOf(h, spotOf(h, s, slot))));
      p.progress = steps[steps.length - 1] ?? p.progress;
      p.onHop = onHop ?? null;
      p.done = () => {
        p.onHop = null;
        done();
      };
      if (!steps.length) p.done();
    },
    kick: (h, slot) => {
      const p = pieceOf(h, slot);
      const at = p.group.position.clone();
      const home = world(pointOf(h, spotOf(h, -1, slot)));
      p.progress = -1;
      p.anim = {
        from: at,
        to: home,
        t0: performance.now(),
        ms: reduce ? 1 : KICK_MS,
        arc: 3.2,
        spin: 2,
      };
      for (let i = 0; i < SPARKS; i++) {
        sparkPos[i * 3] = at.x;
        sparkPos[i * 3 + 1] = at.y + 0.6;
        sparkPos[i * 3 + 2] = at.z;
        const a = Math.random() * Math.PI * 2;
        const v = 3 + Math.random() * 5;
        sparkVel[i * 3] = Math.cos(a) * v;
        sparkVel[i * 3 + 1] = 3 + Math.random() * 5;
        sparkVel[i * 3 + 2] = Math.sin(a) * v;
      }
      flash.position.copy(at).setY(at.y + 1);
      ring.position.copy(at).setY(SURFACE + 0.03);
      // Giảm chuyển động: bỏ tia lửa, vòng lan, chớp sáng và rung; con ngựa vẫn về chuồng ngay,
      // chữ "ĐÁ!" và dòng báo vẫn hiện.
      if (reduce) return;
      sparkT0 = performance.now();
      punch = { at: at.clone().setY(SURFACE), t0: sparkT0 };
      shake = 0.7;
    },
    resize: (w, h) => {
      width = Math.max(1, w);
      height = Math.max(1, h);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      placeCorners(width < height, house);
    },
    dispose: () => {
      cancelAnimationFrame(raf);
      for (const d of disposables) d.dispose();
      renderer.dispose();
    },
  };
}
