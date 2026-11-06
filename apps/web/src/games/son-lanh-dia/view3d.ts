import * as THREE from 'three';
import { cellHash, COLS, ROWS } from '../bong-bong-bum/map';
import { arenaById, propAt, type Prop } from './arenas';
import type { Match } from './engine';
import { drawPaint } from './render';
import { squadById, squadImage, teamColors } from './squad';

// Sân 3D của Sơn Lãnh Địa (three.js): camera nhìn chếch từ trên xuống, tường bao, vật cản khối thật
// đổ bóng, sơn là một tấm ảnh vẽ lên mặt sàn. Nhân vật là ảnh render 3D của đội sơn dựng đứng
// (billboard), mỗi người ba góc nhìn (trước, sau, ngang) chọn theo hướng chạy, cử động theo bước chân.
// Toạ độ: ô (x, y) của engine nằm ở (x, 0, y) trong không gian 3D, mỗi ô rộng 1 đơn vị.

/** Điểm ảnh cho mỗi ô trên tấm sàn: đủ nét khi nhìn chếch mà vẫn nhẹ để cập nhật mỗi lần sơn đổi. */
const FLOOR_CELL = 64;
/** Mỗi bước chạy dài chừng này ô: nhịp bước đi theo quãng đường thật nên chạy nhanh thì bước dồn. */
const STEP_LENGTH = 0.45;
/** Nhân vật chuyển từ đứng sang chạy (và ngược lại) trong khoảng 1/RUN_BLEND giây. */
const RUN_BLEND = 10;
/** Tốc độ "quay người" khi đổi ảnh theo hướng chạy (càng lớn càng nhanh). */
const TURN_SPEED = 9;
/** Chiều cao nhân vật (đơn vị ô): cao hơn ô một chút cho rõ trên điện thoại. */
const CHARACTER_HEIGHT = 1.9;
const HIT_TINT = new THREE.Color('#ff7070');
const WHITE = new THREE.Color('#ffffff');
const DROPLETS = 72;
const DROPLET_LIFE = 0.45;
const TILT = (50 * Math.PI) / 180;
const FOV = 30;
const STONE = '#cfd4dc';

/** walk: đang chạy · hit: đang đứng hình · fire: vừa bắn · win: ăn mừng. */
export type Pose = 'idle' | 'walk' | 'hit' | 'fire' | 'win';

export type ArenaView = {
  render: (m: Match, poses: Pose[], frame: number) => void;
  resize: (width: number, height: number) => void;
  dispose: () => void;
};

const CX = (COLS - 1) / 2;
const CZ = (ROWS - 1) / 2;

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!] as const;
}

function texture(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Sàn gạch đá sáng: mỗi ô một viên, mạch vữa sẫm hơn, sắc độ đổi nhẹ theo ô cho đỡ phẳng. */
function drawStoneFloor() {
  const [c, g] = canvas(COLS * FLOOR_CELL, ROWS * FLOOR_CELL);
  g.fillStyle = '#b4bcc8';
  g.fillRect(0, 0, c.width, c.height);
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++) {
      const h = cellHash(x, y);
      const l = 84 + (h % 5);
      g.fillStyle = `hsl(216 14% ${l}%)`;
      g.beginPath();
      g.roundRect(x * FLOOR_CELL + 2, y * FLOOR_CELL + 2, FLOOR_CELL - 4, FLOOR_CELL - 4, 6);
      g.fill();
      if (h % 4 === 0) {
        g.strokeStyle = 'rgba(120,130,145,0.35)';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(x * FLOOR_CELL + 14 + (h % 20), y * FLOOR_CELL + 18);
        g.lineTo(x * FLOOR_CELL + 26 + (h % 20), y * FLOOR_CELL + 30);
        g.stroke();
      }
    }
  return c;
}

/** Mặt thùng gỗ: ván ngang, khung viền và thanh chéo chữ X. */
function crateTexture() {
  const [c, g] = canvas(128, 128);
  g.fillStyle = '#c98a4b';
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#9a6330';
  g.lineWidth = 3;
  for (let y = 21; y < 128; y += 21) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(128, y);
    g.stroke();
  }
  g.strokeStyle = '#7a4a22';
  g.lineWidth = 14;
  g.strokeRect(7, 7, 114, 114);
  g.lineWidth = 12;
  g.beginPath();
  g.moveTo(14, 14);
  g.lineTo(114, 114);
  g.moveTo(114, 14);
  g.lineTo(14, 114);
  g.stroke();
  return texture(c);
}

function waterTexture() {
  const [c, g] = canvas(128, 128);
  g.fillStyle = '#35b4ef';
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(255,255,255,0.45)';
  g.lineWidth = 3;
  for (let i = 0; i < 6; i++) {
    const y = 12 + i * 21;
    g.beginPath();
    for (let x = 0; x <= 128; x += 8) g.lineTo(x, y + Math.sin((x + i * 30) / 12) * 4);
    g.stroke();
  }
  const t = texture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function createArenaView(target: HTMLCanvasElement, m: Match): ArenaView {
  const renderer = new THREE.WebGLRenderer({ canvas: target, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 200);
  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(x: T) => {
    disposables.push(x);
    return x;
  };

  scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa6bd, 1.9));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(CX - 6, 18, CZ - 8);
  sun.target.position.set(CX, 0, CZ);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -12,
    right: 12,
    top: 12,
    bottom: -12,
    near: 1,
    far: 50,
  });
  sun.shadow.bias = -0.0005;
  scene.add(sun, sun.target);

  // --- Sàn và lớp sơn ---
  const stone = drawStoneFloor();
  const [floorCanvas, floorCtx] = canvas(stone.width, stone.height);
  floorCtx.drawImage(stone, 0, 0);
  const floorTex = keep(texture(floorCanvas));
  const floor = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(COLS, ROWS)),
    keep(new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.55 })),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(CX, 0, CZ);
  floor.receiveShadow = true;
  scene.add(floor);

  // --- Tường bao: khối đá sẫm, góc là trụ cao có đai vàng ---
  const wallGeo = keep(new THREE.BoxGeometry(1, 0.6, 1));
  const wallMat = keep(new THREE.MeshStandardMaterial({ color: '#566074', roughness: 0.8 }));
  const capMat = keep(new THREE.MeshStandardMaterial({ color: '#ffd23f', roughness: 0.6 }));
  const postGeo = keep(new THREE.BoxGeometry(1.1, 1, 1.1));
  const postMat = keep(new THREE.MeshStandardMaterial({ color: STONE, roughness: 0.75 }));
  const bandGeo = keep(new THREE.BoxGeometry(1.14, 0.16, 1.14));
  for (let x = -1; x <= COLS; x++)
    for (let z = -1; z <= ROWS; z++) {
      const edge = x === -1 || x === COLS || z === -1 || z === ROWS;
      if (!edge) continue;
      const corner = (x === -1 || x === COLS) && (z === -1 || z === ROWS);
      if (corner) {
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.set(x, 0.5, z);
        const band = new THREE.Mesh(bandGeo, capMat);
        band.position.set(x, 0.7, z);
        post.castShadow = true;
        scene.add(post, band);
      } else {
        // Vạch vàng cứ bốn khối một lần, như vạch sơn trên tường sân.
        const yellow = (x + z) % 4 === 0;
        const block = new THREE.Mesh(wallGeo, yellow ? capMat : wallMat);
        block.position.set(x, 0.3, z);
        block.castShadow = true;
        block.receiveShadow = true;
        scene.add(block);
      }
    }

  // --- Vật cản trong sân ---
  const arena = arenaById(m.arena);
  const crateGeo = keep(new THREE.BoxGeometry(0.88, 0.88, 0.88));
  const crateMat = keep(
    new THREE.MeshStandardMaterial({ map: keep(crateTexture()), roughness: 0.85 }),
  );
  const pillarGeo = keep(new THREE.CylinderGeometry(0.34, 0.38, 1.1, 24));
  const pillarCapGeo = keep(new THREE.CylinderGeometry(0.42, 0.42, 0.14, 24));
  const stoneMat = keep(new THREE.MeshStandardMaterial({ color: STONE, roughness: 0.75 }));
  const lowWallH = keep(new THREE.BoxGeometry(1.02, 0.55, 0.72));
  const lowWallV = keep(new THREE.BoxGeometry(0.72, 0.55, 1.02));
  const waterTex = keep(waterTexture());
  const waterGeo = keep(new THREE.PlaneGeometry(1, 1));
  const waterMat = keep(
    new THREE.MeshStandardMaterial({ map: waterTex, roughness: 0.15, metalness: 0.1 }),
  );
  const rimGeoH = keep(new THREE.BoxGeometry(1.16, 0.2, 0.18));
  const rimGeoV = keep(new THREE.BoxGeometry(0.18, 0.2, 1.16));
  const at = (x: number, y: number): Prop | null => propAt(arena, x, y);

  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++) {
      const prop = at(x, y);
      if (!prop) continue;
      const add = (mesh: THREE.Mesh, h: number) => {
        mesh.position.set(x, h, y);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
      };
      if (prop === 'crate') {
        const crate = new THREE.Mesh(crateGeo, crateMat);
        crate.rotation.y = ((cellHash(x, y) % 7) - 3) * 0.03;
        add(crate, 0.44);
      } else if (prop === 'pillar') {
        add(new THREE.Mesh(pillarGeo, stoneMat), 0.55);
        add(new THREE.Mesh(pillarCapGeo, stoneMat), 1.12);
      } else if (prop === 'wall') {
        const horizontal = at(x - 1, y) === 'wall' || at(x + 1, y) === 'wall';
        add(new THREE.Mesh(horizontal ? lowWallH : lowWallV, stoneMat), 0.275);
      } else {
        const water = new THREE.Mesh(waterGeo, waterMat);
        water.rotation.x = -Math.PI / 2;
        water.position.set(x, 0.02, y);
        water.receiveShadow = true;
        scene.add(water);
        // Thành hồ ở những cạnh giáp sàn.
        const rims: [number, number, THREE.BufferGeometry][] = [
          [0, -0.5, rimGeoH],
          [0, 0.5, rimGeoH],
          [-0.5, 0, rimGeoV],
          [0.5, 0, rimGeoV],
        ];
        for (const [dx, dz, geo] of rims) {
          if (at(x + Math.sign(dx), y + Math.sign(dz)) === 'pool') continue;
          const rim = new THREE.Mesh(geo, stoneMat);
          rim.position.set(x + dx, 0.1, y + dz);
          rim.castShadow = true;
          scene.add(rim);
        }
      }
    }

  // --- Người chơi: ảnh render của đội sơn dựng đứng, chọn ảnh theo hướng chạy ---
  const colors = teamColors(m);
  const loader = new THREE.TextureLoader();
  const image = (url: string) => {
    const t = keep(loader.load(url));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  };
  const ringGeo = keep(new THREE.RingGeometry(0.3, 0.42, 32));
  const blobGeo = keep(new THREE.CircleGeometry(0.34, 24));
  const blobMat = keep(
    new THREE.MeshBasicMaterial({
      color: '#1d2147',
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    }),
  );
  const actors = m.players.map((p) => {
    const sprite = new THREE.Sprite(keep(new THREE.SpriteMaterial({ alphaTest: 0.3 })));
    sprite.center.set(0.5, 0.03);
    const ring = new THREE.Mesh(
      ringGeo,
      keep(
        new THREE.MeshBasicMaterial({
          color: colors[p.team] ?? '#ffffff',
          transparent: true,
          opacity: 0.95,
          depthWrite: false,
        }),
      ),
    );
    ring.rotation.x = -Math.PI / 2;
    const blob = new THREE.Mesh(blobGeo, blobMat);
    blob.rotation.x = -Math.PI / 2;
    scene.add(sprite, ring, blob);
    const id = squadById(p.charId).id;
    return {
      sprite,
      ring,
      blob,
      views: {
        front: image(squadImage(id, 'front')),
        back: image(squadImage(id, 'back')),
        side: image(squadImage(id, 'side')),
      },
      // Trạng thái chuyển động riêng của phần vẽ (không thuộc trận): vị trí khung trước, pha bước,
      // độ "đang chạy" 0..1, độ bóp ngang lúc vừa đổi ảnh (quay người).
      lastX: p.x,
      lastY: p.y,
      phase: 0,
      run: 0,
      turn: 0,
    };
  });

  // --- Giọt sơn văng ra dưới chân mỗi bước chạy ---
  const dropGeo = keep(new THREE.SphereGeometry(0.055, 8, 6));
  const drops = Array.from({ length: DROPLETS }, () => {
    const mesh = new THREE.Mesh(
      dropGeo,
      keep(new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false })),
    );
    mesh.visible = false;
    scene.add(mesh);
    return { mesh, vx: 0, vy: 0, vz: 0, age: DROPLET_LIFE };
  });
  let nextDrop = 0;
  const splashStep = (x: number, z: number, dirX: number, dirZ: number, color: string) => {
    for (let k = 0; k < 3; k++) {
      const d = drops[nextDrop]!;
      nextDrop = (nextDrop + 1) % DROPLETS;
      const spread = (Math.random() - 0.5) * 1.4;
      // Văng ra sau lưng và sang hai bên, hơi nảy lên rồi rơi xuống.
      d.vx = -dirX * 0.9 + (dirZ !== 0 ? spread : 0) * 0.9;
      d.vz = -dirZ * 0.9 + (dirX !== 0 ? spread : 0) * 0.9;
      d.vy = 1.1 + Math.random() * 0.8;
      d.age = 0;
      d.mesh.position.set(x + (Math.random() - 0.5) * 0.2, 0.05, z + (Math.random() - 0.5) * 0.2);
      (d.mesh.material as THREE.MeshBasicMaterial).color.set(color);
      d.mesh.visible = true;
    }
  };
  let lastTime = performance.now();

  // --- Bóng sơn đang bay ---
  const shotGeo = keep(new THREE.SphereGeometry(0.17, 20, 14));
  const shotMats = new Map<number, THREE.MeshStandardMaterial>();
  const shotMeshes = new Map<number, THREE.Mesh>();

  let lastPaint = m.paint.slice();
  let hadSplashes = false;

  const render = (cur: Match, poses: Pose[], frame: number) => {
    // Vẽ lại tấm sàn chỉ khi sơn đổi hoặc còn giọt sơn đang văng — tải ảnh lên GPU mỗi khung hình là phí.
    const changed =
      hadSplashes || cur.splashes.length > 0 || cur.paint.some((t, k) => t !== lastPaint[k]);
    if (changed) {
      floorCtx.drawImage(stone, 0, 0);
      drawPaint(floorCtx, cur, FLOOR_CELL, colors);
      floorTex.needsUpdate = true;
      lastPaint = cur.paint.slice();
      hadSplashes = cur.splashes.length > 0;
    }
    waterTex.offset.x = (frame * 0.0015) % 1;

    const now = performance.now();
    const dt = Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;

    cur.players.forEach((p, i) => {
      const actor = actors[i];
      if (!actor) return;
      const pose = poses[i] ?? 'idle';
      // Ảnh theo hướng: xuống = mặt trước, lên = sau lưng, ngang = ảnh nhìn nghiêng (sang trái thì lật gương).
      const tex =
        p.dir === 'up' ? actor.views.back : p.dir === 'down' ? actor.views.front : actor.views.side;
      const mat = actor.sprite.material;
      if (mat.map !== tex) {
        if (mat.map) actor.turn = 1;
        mat.map = tex;
        mat.needsUpdate = true;
      }
      const img = tex.image as HTMLImageElement | undefined;
      const aspect = img?.width && img.height ? img.width / img.height : 0.8;

      // Nhịp bước tính theo quãng đường đi được trong khung hình này.
      const moved = Math.hypot(p.x - actor.lastX, p.y - actor.lastY);
      actor.lastX = p.x;
      actor.lastY = p.y;
      const running = pose === 'walk' && moved > 0 && moved < 1;
      actor.run += ((running ? 1 : 0) - actor.run) * Math.min(1, dt * RUN_BLEND);
      const stepBefore = Math.floor(actor.phase / Math.PI);
      if (running) actor.phase += (moved / STEP_LENGTH) * Math.PI;
      const stepNow = Math.floor(actor.phase / Math.PI);
      const [dirX, dirZ] =
        p.dir === 'left' ? [-1, 0] : p.dir === 'right' ? [1, 0] : p.dir === 'up' ? [0, -1] : [0, 1];
      if (running && stepNow > stepBefore)
        splashStep(p.x, p.y, dirX, dirZ, colors[p.team] ?? '#ffffff');

      // Cử động: bước chạy (nảy + nén khi chạm đất + giãn khi bật lên + lắc + nghiêng về trước),
      // rung + ửng đỏ khi trúng, khom khi bắn, nhảy khi thắng, thở khi đứng.
      let lift = 0;
      let stretch = 1;
      let shake = 0;
      let tilt = 0;
      let flash = 0;
      const r = actor.run;
      if (r > 0.01) {
        const hop = Math.abs(Math.sin(actor.phase));
        lift = Math.pow(hop, 0.7) * 0.13 * r;
        stretch = 1 + (hop * 0.05 - Math.pow(1 - hop, 3) * 0.1) * r;
        tilt = (Math.sin(actor.phase) * 0.05 - dirX * 0.1) * r;
      }
      if (pose === 'hit') {
        shake = Math.sin(frame * 1.3) * 0.06;
        stretch = 0.92;
        flash = 0.5 + Math.sin(frame * 0.6) * 0.5;
      } else if (pose === 'fire') {
        stretch *= 0.92;
      } else if (pose === 'win') {
        const j = Math.abs(Math.sin(frame * 0.12 + i));
        lift = j * 0.35;
        stretch = 1 + (j - 0.5) * 0.08;
      } else if (r < 0.5) {
        // Thở khi đứng, cộng một nhịp nhún nhẹ ngay lúc vừa dừng chạy.
        stretch *= 1 + Math.sin(frame * 0.08 + i) * 0.02 - r * 0.06;
      }

      // Vừa đổi ảnh (quay người): bóp ngang một thoáng rồi bung ra.
      actor.turn = Math.max(0, actor.turn - dt * TURN_SPEED);
      const flip = p.dir === 'left' ? -1 : 1;
      const width = flip * (1 - actor.turn * 0.45);
      // Giữ thể tích: dẹt xuống thì phình ngang, vươn lên thì thon lại.
      const bulge = 1 + (1 - stretch) * 0.6;
      actor.sprite.scale.set(
        CHARACTER_HEIGHT * aspect * width * bulge,
        CHARACTER_HEIGHT * stretch,
        1,
      );
      mat.rotation = tilt;
      mat.color.copy(WHITE).lerp(HIT_TINT, flash);
      actor.sprite.position.set(p.x + shake, lift, p.y + 0.15);
      actor.ring.position.set(p.x, 0.03, p.y);
      actor.blob.position.set(p.x, 0.025, p.y);
      // Bóng dưới chân co lại khi nhân vật nảy lên khỏi mặt sàn.
      const shadow = 1 - Math.min(0.5, lift * 1.6);
      actor.blob.scale.set(shadow, shadow, 1);
    });

    for (const d of drops) {
      if (d.age >= DROPLET_LIFE) continue;
      d.age += dt;
      d.vy -= 7 * dt;
      d.mesh.position.x += d.vx * dt;
      d.mesh.position.z += d.vz * dt;
      d.mesh.position.y = Math.max(0.03, d.mesh.position.y + d.vy * dt);
      (d.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - d.age / DROPLET_LIFE;
      if (d.age >= DROPLET_LIFE) d.mesh.visible = false;
    }

    const live = new Set<number>();
    for (const s of cur.shots) {
      live.add(s.id);
      let mesh = shotMeshes.get(s.id);
      if (!mesh) {
        let mat = shotMats.get(s.team);
        if (!mat) {
          mat = keep(
            new THREE.MeshStandardMaterial({ color: colors[s.team] ?? '#ffffff', roughness: 0.25 }),
          );
          shotMats.set(s.team, mat);
        }
        mesh = new THREE.Mesh(shotGeo, mat);
        mesh.castShadow = true;
        shotMeshes.set(s.id, mesh);
        scene.add(mesh);
      }
      mesh.position.set(s.x, 0.5, s.y);
    }
    for (const [id, mesh] of shotMeshes)
      if (!live.has(id)) {
        scene.remove(mesh);
        shotMeshes.delete(id);
      }

    renderer.render(scene, camera);
  };

  /** Lùi camera tới khi cả sân (kể cả tường bao và trụ góc) lọt khung, chừa một chút lề. */
  const resize = (width: number, height: number) => {
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const corners: THREE.Vector3[] = [];
    for (const x of [-1.6, COLS + 0.6])
      for (const z of [-1.6, ROWS + 0.6])
        for (const y of [0, 1.3]) corners.push(new THREE.Vector3(x, y, z));
    const target = new THREE.Vector3(CX, 0, CZ);
    let dist = 20;
    for (let i = 0; i < 8; i++) {
      camera.position.set(CX, Math.sin(TILT) * dist, CZ + Math.cos(TILT) * dist);
      camera.lookAt(target);
      camera.updateMatrixWorld();
      let ext = 0;
      let top = -Infinity;
      let bottom = Infinity;
      for (const c of corners) {
        const v = c.clone().project(camera);
        ext = Math.max(ext, Math.abs(v.x));
        top = Math.max(top, v.y);
        bottom = Math.min(bottom, v.y);
      }
      ext = Math.max(ext, (top - bottom) / 2);
      dist *= ext / 0.96;
      // Đẩy tâm nhìn để phần trên và dưới của sân cách mép khung bằng nhau.
      target.z -= ((top + bottom) / 2) * 1.5;
    }
  };

  const dispose = () => {
    for (const d of disposables) d.dispose();
    renderer.dispose();
  };

  return { render, resize, dispose };
}
