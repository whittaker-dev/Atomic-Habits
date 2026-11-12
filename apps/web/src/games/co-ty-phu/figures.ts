import * as THREE from 'three';

// Nhân vật 3D của Cờ tỷ phú, dựng bằng khối three.js (không dùng ảnh hay mô hình ngoài): dáng chibi
// đầu to, mắt đen bóng, má hồng, tô kiểu hoạt hình (toon, ba bậc sáng) và viền nét nâu sẫm bằng cách
// bọc mỗi khối một lớp mặt trái phóng to. Mỗi nhân vật cao chừng 1 đơn vị, đứng ở y = 0, mặt quay +z.
// Cùng một hàm dựng dùng cho quân trên bàn (view3d.ts) và ảnh đại diện (portraits.ts).

const INK = '#2a1610';
const OUTLINE_W = 0.014;

/** Ba bậc sáng cho kiểu tô hoạt hình. */
const gradient = (() => {
  const t = new THREE.DataTexture(new Uint8Array([110, 190, 255]), 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
})();

const mats = new Map<string, THREE.Material>();
const toon = (color: string, map?: THREE.Texture) => {
  const key = `${color}|${map?.uuid ?? ''}`;
  let m = mats.get(key);
  if (!m) {
    m = new THREE.MeshToonMaterial({ color, gradientMap: gradient, ...(map ? { map } : {}) });
    mats.set(key, m);
  }
  return m;
};
const flat = (color: string) => {
  const key = `flat|${color}`;
  let m = mats.get(key);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color });
    mats.set(key, m);
  }
  return m;
};
const outlineMat = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
const blushMat = new THREE.MeshBasicMaterial({
  color: '#f08a8a',
  transparent: true,
  opacity: 0.65,
});
/** Quạt mỏng nhìn được cả hai mặt (vật liệu riêng, không đụng vật liệu dùng chung). */
const fanMat = new THREE.MeshToonMaterial({
  color: '#e2b13c',
  gradientMap: gradient,
  side: THREE.DoubleSide,
});

/** Một khối có viền nét: lớp vỏ mặt trái dày đều OUTLINE_W theo từng trục. */
function part(
  geo: THREE.BufferGeometry,
  material: THREE.Material,
  at: [number, number, number] = [0, 0, 0],
  outline = true,
) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(...at);
  m.castShadow = true;
  if (outline) {
    geo.computeBoundingBox();
    const size = geo.boundingBox!.getSize(new THREE.Vector3());
    const shell = new THREE.Mesh(geo, outlineMat);
    shell.scale.set(
      (size.x + OUTLINE_W * 2) / Math.max(size.x, 1e-3),
      (size.y + OUTLINE_W * 2) / Math.max(size.y, 1e-3),
      (size.z + OUTLINE_W * 2) / Math.max(size.z, 1e-3),
    );
    m.add(shell);
  }
  return m;
}

const sphere = (r: number, w = 24, h = 18) => new THREE.SphereGeometry(r, w, h);
const capsule = (r: number, len: number) => new THREE.CapsuleGeometry(r, len, 6, 14);
const cyl = (rt: number, rb: number, h: number, seg = 20) =>
  new THREE.CylinderGeometry(rt, rb, h, seg);
const lathe = (pts: [number, number][], seg = 28) =>
  new THREE.LatheGeometry(
    pts.map(([r, y]) => new THREE.Vector2(r, y)),
    seg,
  );

/** Ảnh sọc dùng cho nón lá và khăn rằn. */
const stripes = (() => {
  const cache = new Map<string, THREE.Texture>();
  return (a: string, b: string, check = false) => {
    const key = `${a}|${b}|${check}`;
    let t = cache.get(key);
    if (t) return t;
    const N = 8;
    const data = new Uint8Array(N * N * 4);
    const ca = new THREE.Color(a);
    const cb = new THREE.Color(b);
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const on = check ? (x >> 1) % 2 !== (y >> 1) % 2 : y % 4 === 0;
        const c = on ? cb : ca;
        const i = (y * N + x) * 4;
        data.set([c.r * 255, c.g * 255, c.b * 255, 255], i);
      }
    t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(check ? 6 : 1, check ? 2 : 3);
    t.magFilter = THREE.NearestFilter;
    t.needsUpdate = true;
    cache.set(key, t);
    return t;
  };
})();

type Look = {
  skin: string;
  top: string;
  bottom: string;
  shoes?: string;
  hair?: string;
  hairStyle?: 'short' | 'long' | 'bun' | 'tuft' | 'none';
  /** Mắt cười híp (^^) thay vì mắt tròn. */
  happy?: boolean;
  belly?: boolean;
  /** Áo dài thướt tha hay áo the dài tới chân. */
  robe?: 'aodai' | 'long';
  /** Góc tay (radian, quanh trục z, dương là dang ra ngoài) và góc đưa ra trước (quanh x). */
  arms?: { l?: [number, number]; r?: [number, number] };
};

type Rig = {
  root: THREE.Group;
  head: THREE.Group;
  /** Điểm bàn tay trái/phải (để gắn đồ cầm). */
  handL: THREE.Object3D;
  handR: THREE.Object3D;
};

const HEAD_Y = 0.7;
const HEAD_R = 0.25;

/** Mặt: mắt, ánh mắt, má hồng, miệng cười. Gắn vào nhóm đầu (tâm đầu ở gốc). */
function face(head: THREE.Group, happy: boolean, r = HEAD_R, eyeY = -0.02) {
  for (const s of [-1, 1]) {
    const x = s * r * 0.36;
    const z = Math.sqrt(r * r - x * x - eyeY * eyeY) * 0.97;
    if (happy) {
      const arc = new THREE.Mesh(
        new THREE.TorusGeometry(r * 0.13, r * 0.035, 6, 14, Math.PI),
        flat(INK),
      );
      arc.position.set(x, eyeY - r * 0.02, z + 0.004);
      head.add(arc);
    } else {
      const eye = part(sphere(r * 0.17, 16, 12), flat('#1a0f0a'), [x, eyeY, z - 0.01], false);
      eye.scale.set(0.85, 1.15, 0.5);
      head.add(eye);
      const glint = part(
        sphere(r * 0.055, 8, 6),
        flat('#ffffff'),
        [x - s * r * 0.04, eyeY + r * 0.07, z + 0.012],
        false,
      );
      head.add(glint);
    }
    const blush = new THREE.Mesh(new THREE.CircleGeometry(r * 0.13, 16), blushMat);
    const bp = new THREE.Vector3(s * r * 0.6, -r * 0.25, 0);
    bp.z = Math.sqrt(Math.max(0, r * r - bp.x * bp.x - bp.y * bp.y)) + 0.003;
    blush.position.copy(bp);
    blush.lookAt(bp.clone().multiplyScalar(2));
    head.add(blush);
  }
  const mouth = new THREE.Mesh(
    new THREE.TorusGeometry(r * 0.12, r * 0.035, 6, 14, Math.PI),
    flat('#7a2a1a'),
  );
  mouth.rotation.z = Math.PI;
  mouth.position.set(0, -r * 0.33, Math.sqrt(r * r - (r * 0.33) ** 2) * 0.98);
  head.add(mouth);
}

/** Thân người chibi dùng chung; trang phục và đồ cầm thêm theo từng nhân vật. */
function body(o: Look): Rig {
  const root = new THREE.Group();
  const top = toon(o.top);
  const bottom = toon(o.bottom);
  const skin = toon(o.skin);
  const shoes = toon(o.shoes ?? '#3b2a1e');

  // Chân và giày (áo the dài thì chỉ thấy mũi giày).
  for (const s of [-1, 1]) {
    if (!o.robe || o.robe === 'aodai')
      root.add(part(capsule(0.062, 0.08), bottom, [s * 0.075, 0.11, 0]));
    const shoe = part(sphere(0.065, 14, 10), shoes, [s * 0.075, 0.035, 0.025]);
    shoe.scale.set(1, 0.6, 1.4);
    root.add(shoe);
  }

  // Thân áo.
  const r0 = o.belly ? 0.21 : 0.16;
  if (o.robe === 'long') {
    root.add(
      part(
        lathe([
          [0, 0.04],
          [0.2, 0.04],
          [0.18, 0.2],
          r0 > 0.16 ? [0.2, 0.3] : [0.16, 0.3],
          [0.13, 0.44],
          [0.06, 0.5],
          [0, 0.5],
        ]),
        top,
      ),
    );
  } else {
    root.add(
      part(
        lathe([
          [0, 0.16],
          [0.15, 0.16],
          [r0, o.belly ? 0.27 : 0.26],
          [0.13, 0.44],
          [0.06, 0.5],
          [0, 0.5],
        ]),
        top,
      ),
    );
  }
  if (o.robe === 'aodai') {
    // Hai vạt áo dài trước sau, xoè nhẹ xuống gần mắt cá.
    for (const z of [0.1, -0.1]) {
      const flap = part(new THREE.BoxGeometry(0.2, 0.32, 0.02), top, [0, 0.18, z]);
      flap.rotation.x = z > 0 ? 0.12 : -0.12;
      root.add(flap);
    }
  }

  // Tay: nhóm xoay ở vai, tay áo, bàn tay.
  const arm = (s: -1 | 1, pose?: [number, number]) => {
    const g = new THREE.Group();
    g.position.set(s * 0.14, 0.44, 0);
    g.rotation.z = s * (pose?.[0] ?? 0.45);
    g.rotation.x = -(pose?.[1] ?? 0);
    g.add(part(capsule(0.048, 0.13), top, [0, -0.09, 0]));
    g.add(part(sphere(0.052, 14, 10), skin, [0, -0.19, 0]));
    const hand = new THREE.Object3D();
    hand.position.set(0, -0.2, 0);
    g.add(hand);
    root.add(g);
    return hand;
  };
  const handL = arm(-1, o.arms?.l);
  const handR = arm(1, o.arms?.r);

  // Đầu: nhóm riêng để xoay/nhún.
  const head = new THREE.Group();
  head.position.y = HEAD_Y;
  const skull = part(sphere(HEAD_R, 32, 24), skin);
  skull.scale.set(1, 0.95, 0.98);
  head.add(skull);
  for (const s of [-1, 1]) head.add(part(sphere(0.05, 12, 8), skin, [s * 0.245, -0.02, 0]));
  face(head, !!o.happy);

  // Tóc.
  const hair = toon(o.hair ?? '#1f1612');
  const style = o.hairStyle ?? 'short';
  if (style !== 'none' && style !== 'tuft') {
    const cap = part(
      new THREE.SphereGeometry(HEAD_R + 0.018, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.47),
      hair,
    );
    // Ngả ra sau để chừa trán: mép trước cao, gáy thấp.
    cap.rotation.x = -0.55;
    head.add(cap);
    // Mái tóc trước trán.
    for (const x of [-0.11, 0, 0.11]) {
      const bang = part(sphere(0.07, 12, 8), hair, [x, 0.17, 0.165], false);
      bang.scale.set(1, 0.6, 0.6);
      head.add(bang);
    }
  }
  if (style === 'long') {
    const back = part(capsule(0.17, 0.26), hair, [0, -0.17, -0.12]);
    back.scale.set(1, 1, 0.5);
    head.add(back);
  }
  if (style === 'bun') head.add(part(sphere(0.09), hair, [0, 0.16, -0.2]));
  if (style === 'tuft') {
    // Tóc chỏm: đầu cạo, một chỏm trên đỉnh.
    const tuft = part(sphere(0.07, 12, 8), hair, [0, 0.24, 0.04]);
    tuft.scale.set(1, 1.3, 1);
    head.add(tuft);
  }
  root.add(head);
  return { root, head, handL, handR };
}

/* ─────────────────────────────── Đồ đội, đồ cầm ─────────────────────────────── */

function nonLa(head: THREE.Group, r = 0.4) {
  const hat = part(
    new THREE.ConeGeometry(r, r * 0.5, 40, 1),
    toon('#ead48f', stripes('#ead48f', '#b79a52')),
    [0, HEAD_R * 0.82 + r * 0.25 - 0.02, 0],
  );
  hat.rotation.x = -0.18;
  head.add(hat);
}

function fan(hand: THREE.Object3D) {
  const g = new THREE.Group();
  const leaf = part(new THREE.CircleGeometry(0.16, 24, 0, Math.PI), fanMat, [0, 0.05, 0], false);
  g.add(leaf, part(cyl(0.01, 0.01, 0.1), toon('#7a4a2a'), [0, 0, 0]));
  g.rotation.set(0, 0, 0.4);
  hand.add(g);
}

/* ─────────────────────────────── Các nhân vật ─────────────────────────────── */

const BUILDERS: Record<string, () => THREE.Group> = {
  // Cô Sen: áo dài hồng phấn, tóc dài, nón lá.
  sen: () => {
    const r = body({
      skin: '#f6d3b8',
      top: '#f4a7bd',
      bottom: '#f7f2ea',
      shoes: '#f7f2ea',
      hair: '#1f1612',
      hairStyle: 'long',
      robe: 'aodai',
      arms: { l: [0.3, 0], r: [0.3, 0] },
    });
    nonLa(r.head);
    return r.root;
  },
  // Ông Phúc: bụng phệ, áo đỏ cam, cười híp, quạt vàng.
  phuc: () => {
    const r = body({
      skin: '#f2c49b',
      top: '#d9542b',
      bottom: '#efe3c8',
      hairStyle: 'none',
      happy: true,
      belly: true,
      arms: { l: [0.55, 0], r: [0.9, 0.6] },
    });
    // Lông mày bạc.
    for (const s of [-1, 1]) {
      const brow = part(capsule(0.018, 0.05), toon('#f4f1ea'), [s * 0.09, 0.06, 0.22], false);
      brow.rotation.z = Math.PI / 2 + s * 0.2;
      r.head.add(brow);
    }
    fan(r.handR);
    return r.root;
  },
  // Cụ Đồ: áo the xanh chàm dài, khăn xếp đen, râu bạc, bút lông.
  do: () => {
    const r = body({
      skin: '#f0c7a2',
      top: '#2b3f7a',
      bottom: '#2b3f7a',
      shoes: '#1a1a1a',
      hairStyle: 'none',
      happy: true,
      robe: 'long',
      arms: { l: [0.35, 0], r: [0.7, 0.7] },
    });
    const turban = part(
      new THREE.TorusGeometry(0.17, 0.07, 12, 32),
      toon('#1d1a1a'),
      [0, 0.19, -0.03],
    );
    turban.rotation.x = Math.PI / 2 - 0.45;
    r.head.add(turban);
    r.head.add(part(cyl(0.15, 0.17, 0.06), toon('#1d1a1a'), [0, 0.22, -0.06]));
    const beard = part(new THREE.ConeGeometry(0.08, 0.2, 14), toon('#f4f1ea'), [0, -0.27, 0.17]);
    beard.rotation.x = Math.PI + 0.35;
    r.head.add(beard);
    const brush = new THREE.Group();
    brush.add(part(cyl(0.012, 0.012, 0.2), toon('#8a5a2b'), [0, 0.06, 0]));
    brush.add(part(new THREE.ConeGeometry(0.02, 0.05, 10), toon('#1a1a1a'), [0, -0.06, 0]));
    brush.children[1]!.rotation.x = Math.PI;
    r.handR.add(brush);
    return r.root;
  },
  // Bé Tí: tóc chỏm, áo nâu, chân đất, thổi sáo trúc.
  ti: () => {
    const r = body({
      skin: '#e9b68c',
      top: '#8a5a33',
      bottom: '#3b2a1e',
      shoes: '#e9b68c',
      hair: '#1f1612',
      hairStyle: 'tuft',
      arms: { l: [-0.5, 1.25], r: [0.5, 1.25] },
    });
    const flute = part(cyl(0.018, 0.018, 0.4), toon('#c9a54a'), [0.1, -0.1, 0.25]);
    flute.rotation.z = Math.PI / 2 - 0.15;
    r.head.add(flute);
    return r.root;
  },
  // Bé Lân: đội đầu lân đỏ vàng, sừng, mắt to, râu bông.
  lan: () => {
    const r = body({
      skin: '#f2c49b',
      top: '#e2b13c',
      bottom: '#c0392b',
      hairStyle: 'none',
      arms: { l: [0.8, 0.4], r: [0.8, 0.4] },
    });
    r.head.clear();
    const lion = part(sphere(0.3, 28, 20), toon('#c0392b'));
    lion.scale.set(1.05, 0.95, 1);
    r.head.add(lion);
    r.head.add(part(sphere(0.16, 18, 12), toon('#e2b13c'), [0, -0.08, 0.2]));
    face(r.head, false, 0.3, 0.06);
    const horn = part(new THREE.ConeGeometry(0.05, 0.16, 12), toon('#e2b13c'), [0, 0.32, 0.05]);
    r.head.add(horn);
    for (const s of [-1, 1]) {
      const ear = part(sphere(0.08, 12, 8), toon('#f4f1ea'), [s * 0.28, 0.12, 0]);
      ear.scale.set(0.6, 1.1, 0.6);
      r.head.add(ear);
    }
    // Râu bông trắng quanh hàm.
    for (let k = -3; k <= 3; k++)
      r.head.add(
        part(
          sphere(0.05, 10, 8),
          toon('#f4f1ea'),
          [k * 0.07, -0.27 + Math.abs(k) * 0.025, 0.17 - Math.abs(k) * 0.02],
          false,
        ),
      );
    return r.root;
  },
  // Anh Biển: áo cánh xanh, quần xắn, nón lá, mái chèo vác vai.
  bien: () => {
    const r = body({
      skin: '#d69c6f',
      top: '#3a7ca5',
      bottom: '#2c3e50',
      shoes: '#d69c6f',
      hairStyle: 'short',
      arms: { l: [0.4, 0], r: [2.6, 0.2] },
    });
    nonLa(r.head, 0.34);
    const oar = new THREE.Group();
    oar.add(part(cyl(0.018, 0.018, 0.7), toon('#a87a46'), [0, 0, 0]));
    oar.add(part(new THREE.BoxGeometry(0.1, 0.2, 0.02), toon('#a87a46'), [0, -0.42, 0]));
    oar.rotation.z = -0.9;
    oar.position.y = 0.05;
    r.handR.add(oar);
    return r.root;
  },
  // Chị Hoa: áo bà ba tím, khăn rằn, tóc búi, gánh hai thúng hoa.
  hoa: () => {
    const r = body({
      skin: '#f2c9a5',
      top: '#8b4bb5',
      bottom: '#1d1a1a',
      hair: '#1f1612',
      hairStyle: 'bun',
      arms: { l: [0.4, 0], r: [2.7, 0] },
    });
    const scarf = part(
      new THREE.TorusGeometry(0.11, 0.035, 10, 24),
      toon('#ffffff', stripes('#2a1610', '#efe6d2', true)),
      [0, 0.5, 0],
    );
    scarf.rotation.x = Math.PI / 2;
    r.root.add(scarf);
    // Đòn gánh qua vai phải, hai thúng hoa.
    const pole = new THREE.Group();
    pole.position.set(0.12, 0.52, 0);
    pole.add(part(cyl(0.016, 0.016, 0.9), toon('#a87a46')));
    pole.children[0]!.rotation.z = Math.PI / 2;
    for (const s of [-1, 1]) {
      const basket = new THREE.Group();
      basket.position.set(s * 0.4, -0.3, 0);
      for (const dx of [-0.07, 0.07]) {
        const rope = part(cyl(0.005, 0.005, 0.24, 6), toon('#5a3a1e'), [dx, 0.14, 0], false);
        basket.add(rope);
      }
      basket.add(part(cyl(0.12, 0.09, 0.1), toon('#b98c4a')));
      for (const [x, z, c] of [
        [-0.05, 0.03, '#e84a6f'],
        [0.05, -0.02, '#f2c94c'],
        [0, 0.06, '#f28cb1'],
        [0.03, -0.06, '#ffffff'],
      ] as const)
        basket.add(part(sphere(0.045, 10, 8), toon(c), [x, 0.07, z], false));
      pole.add(basket);
    }
    r.root.add(pole);
    return r.root;
  },
  // Bà Tư: khăn vấn, áo bà ba nâu, cười híp, ôm túi vàng.
  tu: () => {
    const r = body({
      skin: '#eebd96',
      top: '#7a4a2a',
      bottom: '#1d1a1a',
      hair: '#b9b4ad',
      hairStyle: 'short',
      happy: true,
      arms: { l: [-0.2, 1.0], r: [0.2, 1.0] },
    });
    const wrap = part(
      new THREE.TorusGeometry(0.17, 0.06, 10, 28),
      toon('#4a2c1a', stripes('#4a2c1a', '#6e4428')),
      [0, 0.19, -0.02],
    );
    wrap.rotation.x = Math.PI / 2 - 0.45;
    r.head.add(wrap);
    const bag = new THREE.Group();
    bag.position.set(0, 0.3, 0.2);
    bag.add(part(sphere(0.12, 18, 14), toon('#e2b13c')));
    bag.add(part(new THREE.ConeGeometry(0.06, 0.08, 12), toon('#e2b13c'), [0, 0.13, 0]));
    bag.add(part(new THREE.TorusGeometry(0.035, 0.012, 6, 14), toon('#c0392b'), [0, 0.1, 0]));
    bag.children[2]!.rotation.x = Math.PI / 2;
    r.root.add(bag);
    return r.root;
  },
  // Mèo Vàng: mèo cam đứng hai chân, ôm đồng xu vàng.
  meo: () => {
    const fur = toon('#f0a64a');
    const cream = toon('#fbe7c6');
    const root = new THREE.Group();
    for (const s of [-1, 1]) {
      const foot = part(sphere(0.07, 12, 10), cream, [s * 0.08, 0.04, 0.02]);
      foot.scale.set(1, 0.6, 1.3);
      root.add(foot);
    }
    root.add(
      part(
        lathe([
          [0, 0.05],
          [0.17, 0.06],
          [0.19, 0.22],
          [0.12, 0.42],
          [0, 0.46],
        ]),
        fur,
      ),
    );
    root.add(part(sphere(0.11, 14, 10), cream, [0, 0.24, 0.11]));
    const tail = part(
      new THREE.TorusGeometry(0.14, 0.035, 8, 20, Math.PI * 1.2),
      fur,
      [0, 0.22, -0.18],
    );
    tail.rotation.y = Math.PI / 2;
    root.add(tail);
    const head = new THREE.Group();
    head.position.y = 0.66;
    const skull = part(sphere(0.25, 30, 22), fur);
    skull.scale.set(1.08, 0.92, 0.95);
    head.add(skull);
    for (const s of [-1, 1]) {
      const ear = part(new THREE.ConeGeometry(0.08, 0.14, 4), fur, [s * 0.15, 0.2, 0]);
      ear.rotation.z = -s * 0.35;
      head.add(ear);
      for (const dy of [0, -0.035]) {
        const wh = part(cyl(0.004, 0.004, 0.14, 4), flat(INK), [s * 0.2, -0.06 + dy, 0.17], false);
        wh.rotation.z = Math.PI / 2 + s * dy * 4;
        head.add(wh);
      }
    }
    head.add(part(sphere(0.1, 14, 10), cream, [0, -0.08, 0.17], false));
    face(head, false);
    root.add(head);
    // Đồng xu vàng ôm trước ngực.
    const coin = part(cyl(0.12, 0.12, 0.03, 28), toon('#e2b13c'), [0, 0.32, 0.2]);
    coin.rotation.x = Math.PI / 2;
    root.add(coin);
    for (const s of [-1, 1]) root.add(part(sphere(0.06, 12, 10), cream, [s * 0.12, 0.33, 0.2]));
    return root;
  },
  // Trâu Con: trâu xám đứng hai chân, sừng cong, yếm đỏ.
  trau: () => {
    const hide = toon('#6f7480');
    const root = new THREE.Group();
    for (const s of [-1, 1]) {
      root.add(part(capsule(0.07, 0.08), hide, [s * 0.09, 0.11, 0]));
      const hoof = part(sphere(0.07, 12, 10), toon('#2f3138'), [s * 0.09, 0.035, 0.02]);
      hoof.scale.set(1, 0.55, 1.2);
      root.add(hoof);
    }
    root.add(
      part(
        lathe([
          [0, 0.16],
          [0.19, 0.17],
          [0.21, 0.28],
          [0.14, 0.45],
          [0, 0.48],
        ]),
        hide,
      ),
    );
    const bib = part(
      new THREE.CircleGeometry(0.13, 20, Math.PI, Math.PI),
      toon('#c0392b'),
      [0, 0.43, 0.15],
    );
    bib.rotation.x = -0.35;
    root.add(bib);
    for (const s of [-1, 1]) {
      const g = new THREE.Group();
      g.position.set(s * 0.17, 0.42, 0);
      g.rotation.z = s * 0.5;
      g.add(part(capsule(0.055, 0.1), hide, [0, -0.08, 0]));
      root.add(g);
    }
    const head = new THREE.Group();
    head.position.y = 0.68;
    const skull = part(sphere(0.24, 30, 22), hide);
    skull.scale.set(1.1, 0.9, 0.95);
    head.add(skull);
    const snout = part(sphere(0.13, 18, 12), toon('#9aa0aa'), [0, -0.08, 0.17]);
    snout.scale.set(1.2, 0.8, 0.8);
    head.add(snout);
    for (const s of [-1, 1]) {
      head.add(part(sphere(0.02, 8, 6), flat(INK), [s * 0.05, -0.07, 0.27], false));
      const horn = part(
        new THREE.TorusGeometry(0.15, 0.035, 8, 18, Math.PI * 0.6),
        toon('#e8dcc4'),
        [s * 0.2, 0.12, -0.02],
      );
      horn.rotation.set(0, s > 0 ? 0 : Math.PI, 0.2);
      head.add(horn);
      const ear = part(sphere(0.06, 10, 8), hide, [s * 0.26, 0.0, 0]);
      ear.scale.set(1.4, 0.6, 0.8);
      head.add(ear);
    }
    face(head, false, 0.24, 0.04);
    root.add(head);
    return root;
  },
};

/** Thứ tự nhân vật trong bảng chọn (khớp ROSTER trong roster.ts). */
export const FIGURE_IDS = Object.keys(BUILDERS);

/** Dựng một nhân vật (mỗi lần gọi là một bản mới; vật liệu dùng chung). */
export function buildFigure(id: string): THREE.Group {
  const build = BUILDERS[id] ?? BUILDERS[FIGURE_IDS[0]!]!;
  const g = build();
  g.name = id;
  return g;
}

/** Bỏ hình học của một nhân vật khi gỡ khỏi cảnh (vật liệu dùng chung nên giữ lại). */
export function disposeFigure(g: THREE.Object3D) {
  g.traverse((o) => {
    if (o instanceof THREE.Mesh) o.geometry.dispose();
  });
}
