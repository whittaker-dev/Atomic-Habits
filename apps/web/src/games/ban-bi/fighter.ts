import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FORMS, type Form } from './forms';
import { loadHero } from './hero-asset';

// Võ sĩ nạp khí của Bắn Bi Bá Khí (nhân vật nguyên bản, dựng bằng khối three.js): dáng anh hùng vai
// rộng eo thon, tô kiểu hoạt hình có viền nét và viền sáng màu khí, mặt vẽ tay (mắt xếch, mày chau,
// hét khi gồng), tóc nhiều lọn nhọn rủ xuống lúc thường và dựng ngược theo khí, đuôi tóc dài và băng
// đô đỏ hai đuôi bay. Sáu dạng (forms.ts) đổi màu khí, màu tóc, áo rách, mắt phát sáng; hiệu ứng: hào
// quang lửa bằng shader, khói bốc dưới chân, tia khí bay lên, sét giật quanh người, đá bay lơ lửng,
// vầng sáng và cột khí xuyên trời ở dạng cuối. Lên cấp thì võ sĩ gồng người hét, sóng chấn loang trên
// đất, màn chớp sáng, camera rung.

export type FighterView = {
  /** Đổi dạng (0..5). Lên cấp có màn bùng nổ; tụt cấp thì khí lịm đi. */
  setLevel: (level: number) => void;
  /** Mỗi lần nổ bi: hào quang bừng lên một nhịp. */
  pulse: (strength: number) => void;
  /** Ván xong: thắng thì giơ tay ăn mừng, thua thì gục xuống. */
  finish: (won: boolean) => void;
  /** Sét giật (để bên ngoài phát tiếng). */
  onZap: (fn: () => void) => void;
  resize: (w: number, h: number) => void;
  dispose: () => void;
};

const INK = '#140f22';
/** Kích thước đặt model nhân vật (Tripo, toàn thân đứng trên phiến đá) trong cảnh. */
/** Chiều cao cả model, tính từ đáy phiến đá tới ngọn tóc. */
const HERO_HEIGHT = 2.75;
/** Phiến đá dưới chân chìm xuống đất bấy nhiêu, cho bàn chân đặt đúng mặt đất. */
const HERO_BASE = -0.12;
/** Tầm đầu, theo tỉ lệ chiều cao model (cho vầng sáng sau đầu). */
const HERO_HEAD = 0.84;
const SKIN = '#f0c39c';
const CRIMSON = '#d8284c';

/* ─────────────────────────────── vật liệu ─────────────────────────────── */

const gradient = (() => {
  const t = new THREE.DataTexture(new Uint8Array([80, 165, 255]), 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
})();

// Viền nét: vỏ mặt trái đẩy ra theo pháp tuyến nên dày đều quanh khối (khác kiểu phóng to cả khối,
// chỗ dài chỗ ngắn sẽ lệch nét).
const outlineMaterial = (width: number) =>
  new THREE.ShaderMaterial({
    uniforms: { uWidth: { value: width }, uColor: { value: new THREE.Color(INK) } },
    vertexShader: /* glsl */ `
    uniform float uWidth;
    void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * uWidth, 1.0); }`,
    fragmentShader: /* glsl */ `
    uniform vec3 uColor;
    void main(){ gl_FragColor = vec4(uColor, 1.0); }`,
    side: THREE.BackSide,
  });
const outlineMat = outlineMaterial(0.011);

// Tô mềm cho model: bốn nấc sáng tối nội suy liền (khác bảng ba nấc sắc cạnh của võ sĩ dựng khối).
const softGradient = (() => {
  const t = new THREE.DataTexture(new Uint8Array([125, 178, 222, 255]), 4, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
})();

// Viền sáng màu khí ôm mép người (kiểu anime): dùng chung cho mọi vật liệu của võ sĩ, cảnh chỉnh
// màu và độ mạnh mỗi khung hình.
const rim = { uRimColor: { value: new THREE.Color('#ffffff') }, uRim: { value: 0 } };
/** Gắn viền sáng màu khí vào một vật liệu có sẵn của three (toon hay PBR đều được). */
function injectRim(s: THREE.WebGLProgramParametersWithUniforms) {
  s.uniforms.uRimColor = rim.uRimColor;
  s.uniforms.uRim = rim.uRim;
  s.fragmentShader = s.fragmentShader
    .replace('void main() {', 'uniform vec3 uRimColor;\nuniform float uRim;\nvoid main() {')
    .replace(
      '#include <dithering_fragment>',
      `float rimF = 1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);
        gl_FragColor.rgb += uRimColor * smoothstep(0.55, 0.75, rimF) * uRim;
        #include <dithering_fragment>`,
    );
}
function withRim<T extends THREE.Material>(m: T) {
  m.onBeforeCompile = injectRim;
  return m;
}

/**
 * Gió khí cho model Tripo (một khối liền, không xương): lay từng đỉnh theo vùng. Tóc (trên trán)
 * bập bùng dựng lên như ngọn lửa; quần và đai (từ trên cổ chân tới thắt lưng) gợn sóng như vải bay.
 * Mặt, tay, giày đứng yên. Vùng tính theo độ cao trong model (0 đáy phiến đá, 1 ngọn tóc).
 */
const HERO_WIND = /* glsl */ `
  uniform float uTime;
  uniform float uKi;
  uniform float uMinY;
  uniform float uSpanY;
  vec3 heroWind(vec3 p, vec3 n) {
    float f = (p.y - uMinY) / uSpanY;
    float hair = smoothstep(0.84, 0.9, f) * (f - 0.84) * 6.0;
    float cloth = smoothstep(0.14, 0.2, f) * (1.0 - smoothstep(0.5, 0.56, f));
    float k = 0.35 + uKi;
    float ripple = sin(p.x * 70.0 + uTime * 6.0) * sin(p.z * 64.0 - uTime * 5.0)
      + 0.6 * sin(p.y * 90.0 + uTime * 7.5);
    vec3 off = n * ripple * 0.0035 * k * cloth;
    float flick = 0.5 + 0.5 * sin(uTime * (5.0 + uKi * 6.0) + p.x * 30.0 + p.z * 26.0);
    off += (n * 0.6 + vec3(0.0, 0.5, 0.0)) * flick * 0.011 * k * hair;
    return off;
  }
`;
type Wind = Record<'uTime' | 'uKi' | 'uMinY' | 'uSpanY', { value: number }>;
/** Vật liệu tô mềm cho model: viền sáng màu khí và gió khí. */
/** Nhuộm tóc: màu tóc hiện tại; tâm đầu (x, z trong toạ độ model) để đặt gốc tóc dài. */
type Dye = { uHair: { value: THREE.Color }; uHeadC: { value: THREE.Vector2 } };

/**
 * Vật liệu tô mềm cho model: viền sáng màu khí, gió khí, và tóc đổi màu theo dạng. Tóc vàng nằm sẵn
 * trong ảnh màu: nhuộm những điểm vừa ở vùng đầu (từ ngang cằm lên) vừa mang màu tóc vàng trong ảnh
 * (xem điều kiện trong shader). Da hồng đào, mắt, miệng, răng giữ nguyên; quần vàng nằm dưới vùng đầu.
 */
function heroMaterial(params: THREE.MeshToonMaterialParameters, wind: Wind, dye: Dye) {
  const m = new THREE.MeshToonMaterial(params);
  m.onBeforeCompile = (s) => {
    injectRim(s);
    Object.assign(s.uniforms, wind, dye);
    s.vertexShader = s.vertexShader
      .replace(
        'void main() {',
        `${HERO_WIND}
        varying float vHair;
        void main() {`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vHair = smoothstep(0.79, 0.82, (position.y - uMinY) / uSpanY);
        transformed += heroWind(position, objectNormal);`,
      );
    s.fragmentShader = s.fragmentShader
      // Pháp tuyến model Tripo lởm chởm nên viền sáng bắt vào cả mảng lớn: giảm còn một phần ba,
      // kẻo khí mạnh thì cả người trắng xoá.
      .replace('* uRim;', '* uRim * 0.35;')
      .replace('void main() {', 'uniform vec3 uHair;\nvarying float vHair;\nvoid main() {')
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        float hairLum = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
        // Vàng đậm, nâu: rất ít xanh lam. Vàng nhạt, ánh sáng trên tóc: nhiều xanh lục mà vẫn ít
        // xanh lam (da hồng ít xanh lục; răng, lòng trắng mắt nhiều xanh lam).
        float br = diffuseColor.b / max(diffuseColor.r, 0.001);
        float gr = diffuseColor.g / max(diffuseColor.r, 0.001);
        float hairMask = vHair
          * max(smoothstep(0.2, 0.12, br), smoothstep(0.58, 0.66, gr) * smoothstep(0.62, 0.5, br));
        vec3 dyed = uHair * (0.3 + 1.25 * hairLum) + pow(hairLum, 3.0) * 0.35;
        diffuseColor.rgb = mix(diffuseColor.rgb, dyed, hairMask);`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        totalEmissiveRadiance = mix(totalEmissiveRadiance, dyed * 0.22, hairMask);`,
      );
  };
  return m;
}
/** Viền nét của model, lay cùng gió khí để không tách khỏi người. */
const heroOutlineMaterial = (width: number, wind: Wind) =>
  new THREE.ShaderMaterial({
    uniforms: { uWidth: { value: width }, uColor: { value: new THREE.Color(INK) }, ...wind },
    vertexShader: /* glsl */ `
    uniform float uWidth;
    ${HERO_WIND}
    void main(){
      vec3 p = position + heroWind(position, normal) + normal * uWidth;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }`,
    fragmentShader: /* glsl */ `
    uniform vec3 uColor;
    void main(){ gl_FragColor = vec4(uColor, 1.0); }`,
    side: THREE.BackSide,
  });
function toon(color: string, extra: THREE.MeshToonMaterialParameters = {}) {
  return withRim(new THREE.MeshToonMaterial({ color, gradientMap: gradient, ...extra }));
}

/** Khối có viền nét. */
function part(geo: THREE.BufferGeometry, material: THREE.Material, outline = true) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = true;
  if (outline) m.add(new THREE.Mesh(geo, outlineMat));
  return m;
}
const at = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number) => {
  o.position.set(x, y, z);
  return o;
};

/** Bán kính nội suy mượt qua các mốc [t, r] (t tăng dần từ 0 tới 1). */
const profile = (keys: [number, number][]) => (t: number) => {
  let i = 0;
  while (i < keys.length - 2 && t > keys[i + 1]![0]) i++;
  const [t0, r0] = keys[i]!;
  const [t1, r1] = keys[i + 1]!;
  const k = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
  return r0 + (r1 - r0) * (0.5 - Math.cos(k * Math.PI) / 2);
};
/** Bo tròn đầu khối: bán kính về 0 theo cung tròn trong đoạn `e` ở hai đầu (hoặc một đầu). */
const cap = (t: number, e = 0.12, ends: 'both' | 'top' | 'bottom' = 'both') => {
  const a = ends === 'top' ? 1 : Math.min(1, t / e);
  const b = ends === 'bottom' ? 1 : Math.min(1, (1 - t) / e);
  return Math.sqrt(1 - (1 - a) ** 2) * Math.sqrt(1 - (1 - b) ** 2);
};
/**
 * Khối tròn xoay cao `h` theo bán kính r(t), t = 0 ở đáy, 1 ở đỉnh. Các mốc cách đều theo chiều cao
 * nên toạ độ ảnh dọc ≈ độ cao (để vẽ áo lên). Đường nối nằm ở mặt sau, mặt trước là giữa ảnh (u = 0.5).
 */
function lathe(h: number, r: (t: number) => number, steps = 24, seg = 28) {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pts.push(new THREE.Vector2(Math.max(r(t), 1e-4), t * h));
  }
  return new THREE.LatheGeometry(pts, seg, Math.PI, Math.PI * 2);
}
/** Chi treo dưới khớp: đỉnh ở gốc toạ độ, thòng xuống theo -y. */
const limb = (h: number, keys: [number, number][], e = 0.14) =>
  lathe(h, (t) => profile(keys)(t) * cap(t, e)).translate(0, -h, 0);

/* ─────────────────────────────── shader hào quang ─────────────────────────────── */

const NOISE = /* glsl */ `
  float hash(vec3 p){ p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419)); p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float noise(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z); }
  float fbm(vec3 p){ float v = 0.0; float a = 0.5; for (int i = 0; i < 4; i++){ v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
`;

function auraMaterial(side: THREE.Side, sharp: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPower: { value: 0 },
      uColor: { value: new THREE.Color('#ffffff') },
      uCore: { value: new THREE.Color('#ffffff') },
      uRainbow: { value: 0 },
    },
    vertexShader: /* glsl */ `
      uniform float uTime; uniform float uPower;
      varying vec3 vN; varying vec3 vView; varying vec3 vLocal;
      ${NOISE}
      void main(){
        vec3 p = position;
        float h = clamp(p.y * 0.5 + 0.5, 0.0, 1.0);
        // Dáng lửa luôn có (không phụ thuộc cấp): đáy phình, trên thuôn nhọn; nhiễu chạy ngược lên kéo
        // từng lưỡi lửa vươn cao. Cấp càng cao lửa càng vươn dài.
        float shape = 0.55 + uPower * 0.6;
        float n = fbm(vec3(p.x * 3.4, p.y * 1.6 - uTime * 3.2, p.z * 3.4));
        p.xz *= 1.0 - h * h * 0.6;
        p += normal * (n - 0.4) * 0.28 * shape;
        p.y += h * h * pow(n, 1.5) * 1.9 * shape;
        vLocal = p;
        vec4 world = modelMatrix * vec4(p, 1.0);
        vN = normalize(mat3(modelMatrix) * normal);
        vView = normalize(cameraPosition - world.xyz);
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform float uPower; uniform vec3 uColor; uniform vec3 uCore; uniform float uRainbow;
      varying vec3 vN; varying vec3 vView; varying vec3 vLocal;
      ${NOISE}
      vec3 hue(float h){ return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
      void main(){
        float rim = 1.0 - abs(dot(normalize(vN), normalize(vView)));
        rim = pow(rim, ${sharp.toFixed(1)});
        float h = clamp(vLocal.y * 0.5 + 0.5, 0.0, 1.0);
        // Lưỡi lửa: nhiễu kéo dài theo chiều dọc, cắt ngưỡng tăng dần theo độ cao nên chân lửa dày,
        // đỉnh chỉ còn những ngọn nhọn liếm lên.
        float n = fbm(vec3(vLocal.x * 4.0, vLocal.y * 1.3 - uTime * 3.6, vLocal.z * 4.0 + uTime * 0.6));
        float tongue = smoothstep(0.26 + h * 0.18, 0.5 + h * 0.18, n);
        float core = smoothstep(0.7, 0.9, n);
        float a = (rim * 0.8 + 0.2) * tongue * uPower * (1.0 - smoothstep(0.9, 1.35, h));
        vec3 col = mix(uColor, uCore, core);
        col = mix(col, hue(fract(vLocal.y * 0.4 - uTime * 0.3)) * 1.2, uRainbow * 0.75);
        // Cộng sáng vừa phải để giữ được màu khí (quá tay là cháy trắng hết).
        gl_FragColor = vec4(col * (1.0 + core * 0.6), clamp(a * 0.8, 0.0, 1.0));
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side,
  });
}

/* ─────────────────────────────── ảnh vẽ bằng canvas ─────────────────────────────── */

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const softDot = () =>
  canvasTex(64, 64, (g) => {
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.4, 'rgba(255,255,255,0.5)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
  });
const smokeTex = () =>
  canvasTex(128, 128, (g) => {
    for (let i = 0; i < 14; i++) {
      const x = 40 + Math.random() * 48;
      const y = 40 + Math.random() * 48;
      const r = g.createRadialGradient(x, y, 0, x, y, 30 + Math.random() * 20);
      r.addColorStop(0, 'rgba(255,255,255,0.35)');
      r.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = r;
      g.fillRect(0, 0, 128, 128);
    }
  });

/** Nền đá đấu trường: phiến đá lục giác, vết nứt (dùng làm lớp nứt phát sáng ở cấp cao). */
function groundTex(cracksOnly: boolean) {
  return canvasTex(512, 512, (g) => {
    if (!cracksOnly) {
      g.fillStyle = '#211b36';
      g.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 260; i++) {
        g.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '120,100,180'},${0.05 + Math.random() * 0.08})`;
        g.beginPath();
        g.arc(Math.random() * 512, Math.random() * 512, 4 + Math.random() * 24, 0, Math.PI * 2);
        g.fill();
      }
      g.strokeStyle = 'rgba(10,6,20,0.7)';
      g.lineWidth = 3;
      for (let r = 60; r < 260; r += 60) {
        g.beginPath();
        g.arc(256, 256, r, 0, Math.PI * 2);
        g.stroke();
      }
      for (let a = 0; a < 12; a++) {
        g.beginPath();
        g.moveTo(256, 256);
        g.lineTo(
          256 + Math.cos((a / 12) * Math.PI * 2) * 300,
          256 + Math.sin((a / 12) * Math.PI * 2) * 300,
        );
        g.stroke();
      }
    } else {
      g.strokeStyle = '#ffffff';
      g.lineCap = 'round';
      for (let i = 0; i < 9; i++) {
        let x = 256;
        let y = 256;
        const a0 = (i / 9) * Math.PI * 2 + Math.random() * 0.4;
        g.lineWidth = 5;
        g.beginPath();
        g.moveTo(x, y);
        for (let s = 0; s < 8; s++) {
          const a = a0 + (Math.random() - 0.5) * 0.9;
          x += Math.cos(a) * 26;
          y += Math.sin(a) * 26;
          g.lineWidth = Math.max(1, 5 - s * 0.6);
          g.lineTo(x, y);
        }
        g.stroke();
      }
    }
  });
}

/** Phông nền: trời chạng vạng tím, núi đá nhiều lớp, trăng mờ. */
const skyTex = () =>
  canvasTex(1024, 512, (g) => {
    const sky = g.createLinearGradient(0, 0, 0, 512);
    sky.addColorStop(0, '#05030c');
    sky.addColorStop(0.55, '#2a1650');
    sky.addColorStop(1, '#5b2a6e');
    g.fillStyle = sky;
    g.fillRect(0, 0, 1024, 512);
    g.fillStyle = 'rgba(255,240,255,0.85)';
    g.beginPath();
    g.arc(760, 150, 46, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(255,200,255,0.12)';
    g.beginPath();
    g.arc(760, 150, 90, 0, Math.PI * 2);
    g.fill();
    for (let i = 0; i < 120; i++) {
      g.fillStyle = `rgba(255,255,255,${Math.random() * 0.7})`;
      g.fillRect(Math.random() * 1024, Math.random() * 260, 2, 2);
    }
    const ridge = (y: number, amp: number, color: string, seed: number) => {
      g.fillStyle = color;
      g.beginPath();
      g.moveTo(0, 512);
      for (let x = 0; x <= 1024; x += 16) {
        const h =
          Math.sin(x / 90 + seed) * 0.5 +
          Math.sin(x / 37 + seed * 2) * 0.3 +
          Math.sin(x / 13) * 0.08;
        g.lineTo(x, y - h * amp);
      }
      g.lineTo(1024, 512);
      g.fill();
    };
    ridge(330, 70, '#2b1a4a', 1);
    ridge(390, 60, '#1c1233', 4);
    ridge(450, 40, '#120b22', 7);
  });

/* ─────────────────────────────── mặt và áo vẽ tay ─────────────────────────────── */

type Expr = 'fierce' | 'shout' | 'grin' | 'hurt';

/** Màu bóng đổ (tô phẳng kiểu hoạt hình, đè lên phần sáng tối của đèn). */
const SKIN_SHADE = '#d39276';
const GI = '#2a2640';
const GI_SHADE = '#1a1729';
const GOLD = '#e6b03a';
const UNDERSHIRT = '#efe9dc';

/** Dải bóng thuôn hai đầu theo đường cong bậc hai (nét cơ, nếp áo). */
function wedge(
  g: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  qx: number,
  qy: number,
  x1: number,
  y1: number,
  w: number,
) {
  // Đường biên hai bên lệch nhau `w` ở điểm uốn, chụm lại ở hai đầu.
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * w;
  const ny = (dx / len) * w;
  g.beginPath();
  g.moveTo(x0, y0);
  g.quadraticCurveTo(qx + nx, qy + ny, x1, y1);
  g.quadraticCurveTo(qx - nx, qy - ny, x0, y0);
  g.fill();
}

/**
 * Vẽ mặt lên ảnh bọc đầu (1024×512, giữa mặt ở x = 512, xích đạo của đầu ở y = 256). `g` là ảnh
 * màu, `e` là ảnh phát sáng (chỉ tròng mắt, khi mắt rực). Nét thiếu niên võ sĩ kiểu anime: mắt to
 * xếch, mí trên đen dày kéo chéo xuống sống mũi, tròng to; mày rậm góc cạnh ghì sát mắt, cùng màu
 * tóc; nếp chau trên trán và sống mũi; hét thì há rộng thấy răng nanh.
 */
function drawFace(
  g: CanvasRenderingContext2D,
  e: CanvasRenderingContext2D,
  expr: Expr,
  iris: string,
  glow: boolean,
  browColor: string,
) {
  g.fillStyle = SKIN;
  g.fillRect(0, 0, 1024, 512);
  e.fillStyle = '#000';
  e.fillRect(0, 0, 1024, 512);
  g.lineCap = g.lineJoin = 'round';
  const cx = 512;
  // Mắt nằm dưới xích đạo một chút: trán thấp dưới băng đô, mặt không bị dài.
  const ey = 282;

  // Bóng tóc mái đổ lên trán: mảng tối mép răng cưa ngay dưới chân tóc.
  g.fillStyle = SKIN_SHADE;
  g.beginPath();
  g.moveTo(1024, 0);
  g.lineTo(0, 0);
  for (let x = 0; x <= 1024; x += 26) g.lineTo(x, (x / 26) % 2 ? 200 : 222);
  g.closePath();
  g.fill();

  const angry = expr === 'fierce' || expr === 'shout';
  for (const s of [-1, 1]) {
    const x = cx + s * 62;
    const inner = x - s * 36;
    const outer = x + s * 48;
    const open = expr === 'shout' ? 30 : expr === 'grin' ? 22 : 28;
    if (expr === 'hurt') {
      // Nhắm nghiền: nét gãy chụm vào giữa, nếp nhăn ở đuôi mắt.
      g.strokeStyle = INK;
      g.lineWidth = 7;
      g.beginPath();
      g.moveTo(outer, ey - 16);
      g.lineTo(x - s * 4, ey - 2);
      g.lineTo(inner, ey - 8);
      g.stroke();
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(outer + s * 4, ey + 2);
      g.lineTo(outer + s * 14, ey + 6);
      g.moveTo(outer + s * 2, ey - 28);
      g.lineTo(outer + s * 12, ey - 32);
      g.stroke();
    } else {
      // Mắt: khoé trong nhọn và thấp, mí trên là đường gần thẳng dốc lên tới gần đuôi mắt rồi bẻ
      // xuống; mí dưới gần phẳng. Giận thì mí trên ép xuống phía trong.
      const dip = angry ? 0.25 : 0;
      const top = ey - open;
      const shape = (c: CanvasRenderingContext2D) => {
        c.beginPath();
        c.moveTo(inner, ey - 2);
        c.lineTo(x - s * 6, top + open * (0.35 + dip));
        c.quadraticCurveTo(x + s * 26, top - 2, outer, ey - open * 0.55);
        c.quadraticCurveTo(x + s * 30, ey + 8, x, ey + 8);
        c.quadraticCurveTo(x - s * 22, ey + 7, inner, ey - 2);
        c.closePath();
      };
      shape(g);
      g.fillStyle = '#fbf8f3';
      g.fill();
      const ix = x + s * 2;
      const iy = ey - open * 0.4;
      const rx = expr === 'shout' ? 13 : 19;
      const ry = expr === 'shout' ? 16 : 24;
      for (const c of glow ? [g, e] : [g]) {
        c.save();
        shape(c);
        c.clip();
        if (c === e) {
          c.fillStyle = '#fff';
        } else {
          // Tròng: đỉnh sẫm (bóng mí), giữa màu mắt, đáy sáng trong.
          const grad = c.createLinearGradient(0, iy - ry, 0, iy + ry);
          grad.addColorStop(0, glow ? '#ffffff' : '#0b1a24');
          grad.addColorStop(0.45, iris);
          grad.addColorStop(1, glow ? '#ffffff' : '#9df2e4');
          c.fillStyle = grad;
        }
        c.beginPath();
        c.ellipse(ix, iy, rx, ry, 0, 0, Math.PI * 2);
        c.fill();
        if (c === g) {
          c.strokeStyle = '#08131b';
          c.lineWidth = 3;
          c.stroke();
          c.fillStyle = glow ? '#ffffff' : '#05090d';
          c.beginPath();
          c.ellipse(ix, iy - 1, rx * 0.45, ry * 0.5, 0, 0, Math.PI * 2);
          c.fill();
          // Bóng mí trên đổ xuống lòng trắng và tròng.
          c.fillStyle = 'rgba(40,40,80,0.3)';
          c.fillRect(x - 70, top - 20, 140, open * 0.45 + 18);
          c.fillStyle = '#fff';
          c.beginPath();
          c.ellipse(ix + s * 6, iy - ry * 0.3, 5, 7, -s * 0.4, 0, Math.PI * 2);
          c.fill();
          c.beginPath();
          c.arc(ix - s * 6, iy + ry * 0.45, 2.5, 0, Math.PI * 2);
          c.fill();
        }
        c.restore();
      }
      // Mí trên đen dày, dày nhất ở nửa ngoài, đuôi vuốt hất ra; nếp mí mảnh; mí dưới nửa ngoài.
      g.strokeStyle = INK;
      g.lineWidth = 8;
      g.beginPath();
      g.moveTo(inner - s * 3, ey - 1);
      g.lineTo(x - s * 6, top + open * (0.35 + dip));
      g.quadraticCurveTo(x + s * 26, top - 2, outer, ey - open * 0.55);
      g.lineTo(outer + s * 14, ey - open * 0.75);
      g.stroke();
      g.lineWidth = 12;
      g.beginPath();
      g.moveTo(x + s * 8, top + 3);
      g.quadraticCurveTo(x + s * 30, top + 2, outer + s * 2, ey - open * 0.6);
      g.stroke();
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(x + s * 2, top - 10);
      g.quadraticCurveTo(x + s * 30, top - 12, outer + s * 6, ey - open * 0.75 - 8);
      g.stroke();
      g.beginPath();
      g.moveTo(outer - s * 2, ey - open * 0.45);
      g.quadraticCurveTo(x + s * 30, ey + 8, x - s * 4, ey + 8);
      g.stroke();
    }

    // Lông mày rậm góc cạnh cùng màu tóc: giận thì đầu trong ghì sát khoé mắt, đuôi xếch; đau thì
    // nhướng đầu trong lên; cười thì nằm ngang hơn.
    const by = ey - open;
    const bin = expr === 'hurt' ? by - 30 : angry ? by + 4 : by - 12;
    const bout = expr === 'hurt' ? by - 14 : angry ? by - 30 : by - 26;
    const brow = new Path2D();
    brow.moveTo(x - s * 40, bin + 9);
    brow.lineTo(x - s * 44, bin - 6);
    brow.lineTo(x + s * 10, (bin + bout) / 2 - 14);
    brow.quadraticCurveTo(x + s * 40, bout - 10, x + s * 58, bout - 2);
    brow.quadraticCurveTo(x + s * 30, bout + 4, x + s * 8, (bin + bout) / 2 + 2);
    brow.closePath();
    g.fillStyle = browColor;
    g.fill(brow);
    g.strokeStyle = INK;
    g.lineWidth = 3;
    g.stroke(brow);
  }

  // Nếp chau trên trán và sống mũi khi giận hay đau.
  if (expr !== 'grin') {
    g.strokeStyle = 'rgba(120,55,45,0.75)';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(cx - 9, ey - 52);
    g.quadraticCurveTo(cx - 4, ey - 40, cx - 6, ey - 28);
    g.moveTo(cx + 9, ey - 52);
    g.quadraticCurveTo(cx + 4, ey - 40, cx + 6, ey - 28);
    g.moveTo(cx - 10, ey - 6);
    g.lineTo(cx + 10, ey - 6);
    g.stroke();
  }

  // Mũi nhỏ: mảng bóng một bên sống mũi và nét chóp.
  g.fillStyle = SKIN_SHADE;
  g.beginPath();
  g.moveTo(cx + 2, ey + 8);
  g.quadraticCurveTo(cx + 12, ey + 32, cx + 11, ey + 46);
  g.lineTo(cx + 2, ey + 48);
  g.quadraticCurveTo(cx + 6, ey + 28, cx + 2, ey + 8);
  g.fill();
  g.strokeStyle = '#8f523f';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(cx - 6, ey + 48);
  g.quadraticCurveTo(cx + 2, ey + 53, cx + 10, ey + 47);
  g.stroke();

  // Miệng.
  const my = ey + 80;
  g.strokeStyle = INK;
  if (expr === 'fierce') {
    // Mím chặt, khoé trễ; bóng môi dưới.
    g.lineWidth = 4.5;
    g.beginPath();
    g.moveTo(cx - 24, my + 5);
    g.quadraticCurveTo(cx, my - 4, cx + 24, my + 5);
    g.stroke();
    g.fillStyle = SKIN_SHADE;
    wedge(g, cx - 12, my + 15, cx, my + 18, cx + 12, my + 15, 3);
    return;
  }
  const mouth = new Path2D();
  if (expr === 'shout') {
    // Há rộng: môi trên gần thẳng, môi dưới tròn sâu.
    mouth.moveTo(cx - 46, my - 12);
    mouth.quadraticCurveTo(cx, my - 22, cx + 46, my - 12);
    mouth.quadraticCurveTo(cx + 44, my + 50, cx, my + 64);
    mouth.quadraticCurveTo(cx - 44, my + 50, cx - 46, my - 12);
  } else if (expr === 'grin') {
    // Cười nhếch một bên, lộ răng.
    mouth.moveTo(cx - 28, my);
    mouth.quadraticCurveTo(cx, my + 2, cx + 30, my - 10);
    mouth.quadraticCurveTo(cx + 8, my + 18, cx - 28, my);
  } else {
    // Nghiến răng.
    mouth.moveTo(cx - 26, my - 6);
    mouth.lineTo(cx + 26, my - 6);
    mouth.quadraticCurveTo(cx + 30, my + 6, cx + 22, my + 12);
    mouth.lineTo(cx - 22, my + 12);
    mouth.quadraticCurveTo(cx - 30, my + 6, cx - 26, my - 6);
  }
  g.fillStyle = expr === 'hurt' ? '#ffffff' : '#3a0c16';
  g.fill(mouth);
  g.save();
  g.clip(mouth);
  g.fillStyle = '#ffffff';
  if (expr === 'shout') {
    // Hàm răng trên có hai răng nanh nhọn, hàm dưới thấp, lưỡi đỏ.
    g.fillRect(cx - 52, my - 26, 104, 22);
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(cx + s * 30, my - 6);
      g.lineTo(cx + s * 22, my - 6);
      g.lineTo(cx + s * 27, my + 8);
      g.closePath();
      g.fill();
    }
    g.fillRect(cx - 52, my + 50, 104, 18);
    g.fillStyle = '#c4424f';
    g.beginPath();
    g.ellipse(cx, my + 50, 26, 13, 0, 0, Math.PI * 2);
    g.fill();
  } else if (expr === 'grin') {
    g.fillRect(cx - 34, my - 14, 70, 17);
  } else {
    g.strokeStyle = 'rgba(40,20,30,0.55)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(cx - 30, my + 3);
    g.lineTo(cx + 30, my + 3);
    for (const tx of [-14, 0, 14]) {
      g.moveTo(cx + tx, my - 8);
      g.lineTo(cx + tx, my + 14);
    }
    g.stroke();
  }
  g.restore();
  g.strokeStyle = INK;
  g.lineWidth = 3.5;
  g.stroke(mouth);
}

/**
 * Áo võ bọc thân (ảnh 1024×512 bọc quanh khối thân: giữa ảnh là ngực, đỉnh ảnh là cổ, đáy là đai).
 * Áo lành màu sẫm, hai vạt chéo nhau viền vàng, cổ chữ V lộ áo lót trắng, huy hiệu tròn trên ngực;
 * áo rách thì toạc mặt trước, lộ ngực và bụng sáu múi tô bóng kiểu hoạt hình.
 */
function drawTorso(g: CanvasRenderingContext2D, torn: boolean) {
  const W = 1024;
  const cx = 512;
  g.lineCap = g.lineJoin = 'round';
  g.fillStyle = GI;
  g.fillRect(0, 0, W, 512);
  // Nếp áo: mảng bóng sắc cạnh kéo từ nách chụm xuống đai, và nếp ngang sau lưng.
  g.fillStyle = GI_SHADE;
  for (const s of [-1, 1]) {
    wedge(g, cx + s * 205, 110, cx + s * 160, 330, cx + s * 110, 512, 14);
    wedge(g, cx + s * 262, 150, cx + s * 245, 330, cx + s * 205, 512, 10);
    wedge(g, cx + s * 160, 300, cx + s * 150, 410, cx + s * 150, 505, 6);
  }
  for (const x of [80, 944]) wedge(g, x - 70, 260, x, 300, x + 70, 260, 8);

  const skin = new Path2D();
  if (!torn) {
    // Vạt trên (từ vai trái màn hình) đè chéo xuống hông phải; vạt dưới chỉ lộ ở cổ.
    skin.moveTo(cx - 116, 0);
    skin.quadraticCurveTo(cx - 52, 108, cx + 4, 214);
    skin.quadraticCurveTo(cx + 54, 108, cx + 116, 0);
    skin.closePath();
    // Bóng vạt trên đổ sang vạt dưới, rồi viền vàng dọc mép vạt và quanh gáy.
    g.fillStyle = GI_SHADE;
    wedge(g, cx + 4, 214, cx + 50, 360, cx + 92, 512, 12);
    g.strokeStyle = GOLD;
    g.lineWidth = 30;
    g.beginPath();
    g.moveTo(cx - 132, -10);
    g.quadraticCurveTo(cx - 60, 110, cx + 4, 224);
    g.quadraticCurveTo(cx + 36, 360, cx + 72, 520);
    g.moveTo(cx + 132, -10);
    g.quadraticCurveTo(cx + 62, 110, cx + 4, 224);
    g.stroke();
    g.fillStyle = GOLD;
    g.fillRect(0, 0, cx - 130, 24);
    g.fillRect(cx + 130, 0, W, 24);
    g.strokeStyle = INK;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(cx + 16, 228);
    g.quadraticCurveTo(cx + 50, 360, cx + 88, 520);
    g.stroke();
    // Huy hiệu tròn trên ngực: chữ 霸 (bá, như tên game).
    const ex = cx + 128;
    const ey = 150;
    g.fillStyle = UNDERSHIRT;
    g.beginPath();
    g.arc(ex, ey, 40, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = 5;
    g.stroke();
    g.fillStyle = INK;
    g.font =
      'bold 52px "Songti SC", "Noto Serif CJK SC", "Noto Sans CJK SC", "Microsoft YaHei", serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('霸', ex, ey + 3);
  } else {
    const jag = [
      [-300, 0],
      [-282, 50],
      [-262, 96],
      [-240, 120],
      [-232, 175],
      [-206, 228],
      [-196, 290],
      [-166, 336],
      [-150, 400],
      [-112, 418],
      [-92, 462],
      [-48, 430],
      [-10, 480],
      [30, 440],
      [76, 468],
      [112, 420],
      [148, 392],
      [168, 330],
      [200, 286],
      [214, 222],
      [244, 168],
      [252, 118],
      [276, 82],
      [300, 0],
    ];
    skin.moveTo(cx + jag[0]![0]!, jag[0]![1]!);
    for (const [x, y] of jag.slice(1)) skin.lineTo(cx + x!, y!);
    skin.closePath();
  }
  // Áo lành: áo lót trắng trong cổ chữ V. Áo rách: lộ da.
  g.fillStyle = torn ? SKIN : UNDERSHIRT;
  g.fill(skin);
  if (!torn) {
    g.fillStyle = '#cfc6b2';
    wedge(g, cx - 40, 0, cx - 20, 120, cx + 4, 214, 10);
    g.lineWidth = 3;
    g.strokeStyle = INK;
    g.stroke(skin);
    return;
  }

  // Áo rách: cơ ngực, bụng sáu múi tô bóng kiểu hoạt hình.
  g.save();
  g.clip(skin);
  g.fillStyle = SKIN_SHADE;
  for (const s of [-1, 1]) {
    // Bóng dưới bầu ngực: dày ở giữa, vuốt nhọn ra nách.
    g.beginPath();
    g.moveTo(cx + s * 14, 158);
    g.quadraticCurveTo(cx + s * 70, 206, cx + s * 168, 150);
    g.quadraticCurveTo(cx + s * 80, 178, cx + s * 14, 172);
    g.fill();
    // Xương quai xanh.
    wedge(g, cx + s * 18, 34, cx + s * 80, 22, cx + s * 150, 40, 3);
  }
  wedge(g, cx, 52, cx, 120, cx, 178, 5);
  // Bụng sáu múi: rãnh giữa, ba rãnh ngang cong mỗi bên, viền ngoài cơ bụng, cơ răng cưa, chữ V hông.
  wedge(g, cx, 196, cx, 330, cx, 470, 6);
  for (const s of [-1, 1]) {
    for (const [row, y] of [250, 312, 376].entries()) {
      const w = 62 - row * 4;
      wedge(g, cx + s * 6, y, cx + s * (w / 2), y - 12, cx + s * w, y - 2, 6);
    }
    wedge(g, cx + s * 70, 200, cx + s * 74, 330, cx + s * 44, 440, 5);
    for (let i = 0; i < 3; i++) {
      const y = 200 + i * 34;
      wedge(g, cx + s * 120, y, cx + s * 104, y + 12, cx + s * 92, y + 28, 4);
    }
    wedge(g, cx + s * 96, 380, cx + s * 70, 450, cx + s * 30, 500, 5);
  }
  // Bóng mép áo rách đổ lên da.
  g.strokeStyle = SKIN_SHADE;
  g.lineWidth = 18;
  g.stroke(skin);
  g.restore();

  g.strokeStyle = INK;
  g.lineWidth = 4;
  g.stroke(skin);
  // Vài vết rách sau lưng.
  for (const x of [140, 230, 800, 900]) {
    g.fillStyle = SKIN;
    g.beginPath();
    g.moveTo(x, 120);
    g.lineTo(x + 18, 190);
    g.lineTo(x + 4, 260);
    g.lineTo(x - 12, 180);
    g.closePath();
    g.fill();
    g.stroke();
  }
}

/* ─────────────────────────────── võ sĩ ─────────────────────────────── */

/** Lọn tóc: dẹt, thuôn nhọn, hơi cong ra ngoài. Gốc ở toạ độ 0, mũi theo +y. */
function lockGeo(len: number, r: number) {
  const g = lathe(
    len,
    (t) => r * Math.pow(1 - t, 1.15) * (0.75 + 0.25 * Math.min(1, t / 0.2)),
    12,
    8,
  );
  g.scale(1, 1, 0.55);
  const p = g.attributes.position!;
  for (let i = 0; i < p.count; i++) {
    const t = p.getY(i) / len;
    p.setZ(i, p.getZ(i) + t * t * len * 0.3);
  }
  return g;
}

/** Hướng theo góc phương vị `a` (0 là trước mặt, dương sang trái màn hình... +x) và góc ngẩng `e`. */
const dirOf = (a: number, e: number, out = new THREE.Vector3()) =>
  out.set(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e));

const _x = new THREE.Vector3();
const _z = new THREE.Vector3();
const _m = new THREE.Matrix4();
/** Xoay khối để +y trỏ theo `dir`, +z ngả theo `out` (để lọn tóc cong ra phía ngoài đầu). */
function orient(o: THREE.Object3D, dir: THREE.Vector3, out: THREE.Vector3) {
  _z.copy(out).addScaledVector(dir, -out.dot(dir));
  if (_z.lengthSq() < 1e-6) _z.set(0, 0, 1).addScaledVector(dir, -dir.z);
  _z.normalize();
  _x.crossVectors(dir, _z);
  _m.makeBasis(_x, dir, _z);
  o.quaternion.setFromRotationMatrix(_m);
}

type Lock = {
  g: THREE.Group;
  out: THREE.Vector3;
  /** Hướng lúc khí lặng và lúc khí bùng: [phương vị, góc ngẩng]. */
  rest: [number, number];
  up: [number, number];
  phase: number;
};

type Joint = THREE.Group;
type Rig = {
  root: THREE.Group;
  body: THREE.Group;
  torso: THREE.Group;
  neck: THREE.Group;
  head: THREE.Group;
  /** Chỉ số 0: tay/chân phía -x (bên trái màn hình), 1: phía +x. */
  shoulders: [Joint, Joint];
  elbows: [Joint, Joint];
  hips: [Joint, Joint];
  knees: [Joint, Joint];
  ankles: [Joint, Joint];
  arms: THREE.Object3D[];
  sleeves: THREE.Object3D[];
  hairMat: THREE.MeshToonMaterial;
  locks: Lock[];
  ribbons: THREE.Group[];
  sashTails: THREE.Group[];
  setFace: (expr: Expr, form: Form) => void;
  setTorn: (torn: boolean) => void;
  textures: THREE.Texture[];
};

const THIGH = 0.46;
const SHIN = 0.44;
/** Từ cổ chân tới đế giày. */
const FOOT = 0.07;
/** Khớp hông nằm dưới gốc thân bấy nhiêu. */
const HIP_Y = -0.08;

function buildFighter(): Rig {
  const skin = toon(SKIN);
  const gi = toon(GI, { side: THREE.DoubleSide });
  const sole = toon('#ece8f4');
  const gold = toon(GOLD);
  // Băng quấn cổ tay, cổ chân sẫm như áo; đỏ chỉ còn ở băng đô.
  const wrap = toon('#1f1b31');
  const textures: THREE.Texture[] = [];
  const canvas = (w: number, h: number) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    textures.push(t);
    return { ctx: c.getContext('2d')!, tex: t };
  };

  // Quần võ: nếp vải tô bóng chạy dọc ống (ảnh bọc quanh khối, giữa ảnh là mặt trước).
  const pantsArt = canvas(256, 256);
  pantsArt.ctx.fillStyle = '#25213a';
  pantsArt.ctx.fillRect(0, 0, 256, 256);
  pantsArt.ctx.fillStyle = '#16131f';
  for (const [x, w] of [
    [40, 7],
    [96, 5],
    [150, 6],
    [208, 8],
  ] as const) {
    wedge(pantsArt.ctx, x, 0, x + 10, 128, x - 6, 256, w);
  }
  const pants = toon('#ffffff', { map: pantsArt.tex });
  const dark = toon('#17111f');
  const red = toon(CRIMSON);
  // Tóc: gốc tối hơn ngọn cho các lớp lọn tách nhau.
  const hairShade = canvas(64, 128);
  {
    const grad = hairShade.ctx.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.65, '#ffffff');
    grad.addColorStop(1, '#8a8a8a');
    hairShade.ctx.fillStyle = grad;
    hairShade.ctx.fillRect(0, 0, 64, 128);
  }
  const hairMat = toon('#1b1626', { map: hairShade.tex });

  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  // Hông và chân: quần võ ống phồng, bó ống bằng dải đỏ, giày vải đen.
  const pelvis = part(
    lathe(
      0.26,
      (t) =>
        profile([
          [0, 0.1],
          [0.35, 0.165],
          [0.75, 0.175],
          [1, 0.165],
        ])(t) * cap(t, 0.25, 'bottom'),
    ).translate(0, -0.2, 0),
    pants,
  );
  pelvis.scale.z = 0.78;
  body.add(pelvis);
  const hips: Joint[] = [];
  const knees: Joint[] = [];
  const ankles: Joint[] = [];
  for (const s of [-1, 1]) {
    const hip = at(new THREE.Group(), s * 0.1, HIP_Y, 0);
    body.add(hip);
    hip.add(
      part(
        limb(
          THIGH,
          [
            [0, 0.1],
            [0.4, 0.13],
            [0.8, 0.135],
            [1, 0.115],
          ],
          0.1,
        ),
        pants,
      ),
    );
    const knee = at(new THREE.Group(), 0, -THIGH, 0);
    hip.add(knee);
    // Đầu gối: lấp khe giữa đùi và ống quần khi khuỵu.
    knee.add(part(new THREE.SphereGeometry(0.112, 18, 14), pants));
    knee.add(
      part(
        limb(
          SHIN,
          [
            [0, 0.065],
            [0.15, 0.072],
            [0.45, 0.112],
            [0.8, 0.118],
            [1, 0.1],
          ],
          0.1,
        ),
        pants,
      ),
    );
    knee.add(at(part(new THREE.CylinderGeometry(0.07, 0.068, 0.08, 16), wrap), 0, -SHIN + 0.04, 0));
    const ankle = at(new THREE.Group(), 0, -SHIN, 0);
    knee.add(ankle);
    // Giày vải võ mũi tròn, đế trắng dày: bàn chân nổi rõ trên nền đất tối.
    const shoe = new THREE.SphereGeometry(0.085, 20, 14)
      .scale(0.9, 0.66, 1.9)
      .translate(0, -0.014, 0.07);
    ankle.add(part(shoe, dark));
    const soleGeo = new THREE.CylinderGeometry(1, 1, 1, 24)
      .scale(0.08, 0.022, 0.165)
      .translate(0, -0.06, 0.07);
    ankle.add(part(soleGeo, sole));
    hips.push(hip);
    knees.push(knee);
    ankles.push(ankle);
  }

  // Thân: áo võ vẽ tay bọc khối ngực nở eo thon; đai đen thắt nút, hai đuôi đai. Mặt cắt rộng ngang
  // hơn sâu và nở ngang ở tầm vai thành bờ vai liền với cổ (khối tròn thì vai thành hai quả cầu gắn
  // rời); ngực hơi nhô.
  const torso = at(new THREE.Group(), 0, 0.02, 0);
  body.add(torso);
  const torsoArt = canvas(1024, 512);
  const tornArt = canvas(1024, 512);
  drawTorso(torsoArt.ctx, false);
  drawTorso(tornArt.ctx, true);
  const giTop = toon('#ffffff', { map: torsoArt.tex });
  const TORSO_H = 0.64;
  const torsoX = profile([
    [0, 0.165],
    [0.18, 0.157],
    [0.4, 0.178],
    [0.62, 0.214],
    [0.78, 0.238],
    [0.88, 0.25],
    [0.95, 0.2],
    [1, 0.075],
  ]);
  const torsoZ = profile([
    [0, 0.112],
    [0.18, 0.103],
    [0.4, 0.116],
    [0.62, 0.146],
    [0.78, 0.152],
    [0.88, 0.128],
    [0.95, 0.098],
    [1, 0.062],
  ]);
  const chestGeo = lathe(TORSO_H, torsoX, 32, 40);
  {
    const p = chestGeo.attributes.position!;
    for (let i = 0; i < p.count; i++) {
      const t = p.getY(i) / TORSO_H;
      let z = p.getZ(i) * (torsoZ(t) / torsoX(t));
      if (z > 0) {
        const pec =
          Math.exp(-(((t - 0.74) / 0.08) ** 2)) *
          Math.exp(-(((Math.abs(p.getX(i)) - 0.1) / 0.07) ** 2));
        z += 0.022 * pec;
      }
      p.setZ(i, z);
    }
    chestGeo.computeVertexNormals();
  }
  const chest = part(chestGeo, giTop);
  torso.add(chest);
  const sash = part(
    new THREE.TorusGeometry(0.17, 0.042, 10, 36).rotateX(Math.PI / 2).scale(1, 1, 0.7),
    dark,
  );
  torso.add(at(sash, 0, 0.03, 0));
  torso.add(
    at(part(new THREE.SphereGeometry(0.05, 12, 10).scale(1.3, 1, 0.7), dark), 0.05, 0.03, 0.125),
  );
  const sashTails: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const tail = at(new THREE.Group(), 0.05 + s * 0.02, 0.02, 0.125);
    tail.add(
      part(
        limb(
          0.38,
          [
            [0, 0.042],
            [1, 0.048],
          ],
          0.08,
        ).scale(1, 1, 0.3),
        dark,
      ),
    );
    tail.rotation.z = s * 0.18;
    torso.add(tail);
    sashTails.push(tail);
  }

  // Tay: vai tròn, bắp tay, cẳng tay nở; tay áo ngắn (mất khi áo rách), quấn cổ tay đỏ, nắm đấm.
  const shoulders: Joint[] = [];
  const elbows: Joint[] = [];
  const arms: THREE.Object3D[] = [];
  const sleeves: THREE.Object3D[] = [];
  const delts: THREE.Object3D[] = [];
  for (const s of [-1, 1]) {
    const shoulder = at(new THREE.Group(), s * 0.25, 0.53, -0.01);
    shoulder.rotation.order = 'XZY';
    torso.add(shoulder);
    const arm = new THREE.Group();
    shoulder.add(arm);
    arms.push(arm);
    // Cơ vai thuôn dài xuống bắp tay (chỉ lộ khi áo rách; áo lành thì tay áo trùm lên).
    const delt = part(new THREE.SphereGeometry(0.088, 20, 14).scale(1, 1.25, 1.05), skin);
    arm.add(at(delt, s * 0.014, -0.045, 0));
    delts.push(delt);
    arm.add(
      part(
        limb(0.3, [
          [0, 0.062],
          [0.3, 0.074],
          [0.62, 0.088],
          [0.88, 0.084],
          [1, 0.08],
        ]),
        skin,
      ),
    );
    // Áo cụt tay: chỉ còn miếng vai loe ra, viền vàng ở mép.
    const sleeve = new THREE.Group();
    sleeve.add(
      part(
        lathe(
          0.15,
          (t) =>
            t > 0.45
              ? 0.11 * Math.sqrt(Math.max(0, 1 - ((t - 0.45) / 0.55) ** 2))
              : 0.11 + (0.45 - t) * 0.03,
          12,
          24,
        ).translate(0, -0.1, 0),
        gi,
      ),
    );
    sleeve.add(
      at(part(new THREE.TorusGeometry(0.122, 0.011, 8, 32).rotateX(Math.PI / 2), gold), 0, -0.1, 0),
    );
    arm.add(sleeve);
    sleeves.push(sleeve);
    const elbow = at(new THREE.Group(), 0, -0.29, 0);
    arm.add(elbow);
    elbow.add(
      part(
        limb(0.27, [
          [0, 0.05],
          [0.25, 0.057],
          [0.7, 0.075],
          [1, 0.066],
        ]),
        skin,
      ),
    );
    elbow.add(at(part(new THREE.CylinderGeometry(0.063, 0.06, 0.1, 16), wrap), 0, -0.21, 0));
    const fist = at(new THREE.Group(), 0, -0.27, 0);
    elbow.add(fist);
    fist.add(at(part(new RoundedBoxGeometry(0.092, 0.1, 0.105, 3, 0.03), skin), 0, -0.05, 0.005));
    const thumb = part(new THREE.CapsuleGeometry(0.022, 0.045, 4, 10), skin);
    thumb.rotation.z = Math.PI / 2;
    fist.add(at(thumb, -s * 0.005, -0.035, 0.058));
    shoulders.push(shoulder);
    elbows.push(elbow);
  }

  // Cổ và đầu.
  const neck = at(new THREE.Group(), 0, 0.6, 0.0);
  torso.add(neck);
  neck.add(
    part(
      lathe(
        0.16,
        profile([
          [0, 0.068],
          [1, 0.058],
        ]),
        6,
        18,
      ).translate(0, -0.04, 0),
      skin,
    ),
  );
  const head = at(new THREE.Group(), 0, 0.17, 0.02);
  // Đầu to hơn tỉ lệ thật một chút cho mặt đọc rõ ở khung nhỏ.
  head.scale.setScalar(1.07);
  neck.add(head);
  // Hộp sọ: má đầy, cằm nhỏ bo tròn, gáy tròn. Đường nối của ảnh nằm sau gáy (bị tóc che).
  const skullGeo = new THREE.SphereGeometry(0.13, 48, 36, -Math.PI / 2);
  {
    const p = skullGeo.attributes.position!;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i);
      let y = p.getY(i);
      let z = p.getZ(i);
      x *= 0.92;
      if (y < 0) {
        const k = Math.min(1, -y / 0.13);
        // Má đầy giữ bề ngang tới ngang miệng rồi mới thu về cằm nhỏ tròn.
        x *= 1 - 0.34 * k ** 2.4;
        z *= 1 - 0.1 * k;
        z += 0.01 * k * k;
        y *= 1.05;
      }
      if (z < 0) z *= 1.08;
      p.setXYZ(i, x, y, z);
    }
    skullGeo.computeVertexNormals();
  }
  const face = canvas(1024, 512);
  const glowArt = canvas(1024, 512);
  const faceMat = toon('#ffffff', {
    map: face.tex,
    emissiveMap: glowArt.tex,
    emissive: new THREE.Color('#000000'),
  });
  head.add(part(skullGeo, faceMat));
  for (const s of [-1, 1]) {
    const ear = part(new THREE.SphereGeometry(0.03, 12, 10).scale(0.5, 1, 0.8), skin);
    head.add(at(ear, s * 0.115, -0.012, -0.01));
  }

  // Tóc: chỏm tóc ôm sọ, mép trước cao để lộ trán.
  const capGeo = new THREE.SphereGeometry(0.142, 32, 18, 0, Math.PI * 2, 0, Math.PI / 2).scale(
    0.96,
    1,
    1.06,
  );
  const hairCap = part(capGeo, hairMat);
  hairCap.rotation.x = -0.45;
  head.add(at(hairCap, 0, 0.004, -0.004));
  const locks: Lock[] = [];
  const lock = (
    base: [number, number],
    len: number,
    r: number,
    rest: [number, number],
    up: [number, number],
  ) => {
    const out = dirOf(base[0], base[1]);
    const g = new THREE.Group();
    g.position.copy(out).multiplyScalar(0.118);
    g.add(part(lockGeo(len, r), hairMat));
    head.add(g);
    locks.push({ g, out, rest, up, phase: Math.random() * 6 });
  };
  // Số giả ngẫu nhiên cố định theo chỉ số: mái tóc lần nào dựng cũng y như nhau.
  const jit = (i: number) => {
    const v = Math.sin(i * 127.1 + 3.7) * 43758.5453;
    return v - Math.floor(v);
  };
  // Ba vòng lọn quanh đỉnh đầu: vòng trong ngắn và dựng cao, vòng ngoài dài hơn (chừa trước trán cho
  // mái). Lúc khí lặng cả mái vuốt ngược ra sau lởm chởm; khí bùng thì dựng thẳng như ngọn lửa, toả
  // ra theo phía của gốc.
  const RINGS = [
    { e: 1.38, n: 4, len: 0.25, r: 0.068, restE: 0.62 },
    { e: 1.0, n: 9, len: 0.29, r: 0.072, restE: 0.42 },
    { e: 0.6, n: 11, len: 0.31, r: 0.07, restE: 0.12 },
  ];
  let seed = 0;
  RINGS.forEach((ring, ri) => {
    for (let i = 0; i < ring.n; i++) {
      const j = jit(seed++);
      const around =
        ri === 2
          ? 0.8 + (i / (ring.n - 1)) * (Math.PI * 2 - 1.6)
          : ((i + (ri % 2) * 0.5) / ring.n) * Math.PI * 2;
      const a = Math.atan2(Math.sin(around), Math.cos(around));
      const back = a === 0 ? Math.PI : a + Math.sign(a) * (Math.PI - Math.abs(a)) * 0.6;
      lock(
        [a, ring.e + (j - 0.5) * 0.1],
        ring.len * (0.85 + j * 0.35),
        ring.r,
        [back, ring.restE + (j - 0.5) * 0.25],
        [a, 1.1 + (ring.e - 0.6) * 0.3 + (j - 0.5) * 0.2],
      );
    }
  });
  // Gáy: rủ xuống, khí bùng thì hất ngược lên.
  for (let i = 0; i < 6; i++) {
    const a = Math.PI + (i - 2.5) * 0.36;
    lock([a, 0.15], 0.25 + jit(seed++) * 0.08, 0.072, [a, -1.0], [a, 0.7]);
  }
  // Đuôi tóc dài sau lưng (dấu hiệu của võ sĩ này): thòng xuống lưng, khí bùng thì bay ngược lên trời.
  for (let i = 0; i < 3; i++) {
    const a = Math.PI + (i - 1) * 0.16;
    lock([a, -0.25], 0.58 + (i === 1 ? 0.12 : 0), 0.08, [a, -1.32], [a, 0.92]);
  }
  // Mái ngắn hất chéo sang hai bên trán (chừa mắt và lông mày), khí bùng thì vuốt ngược.
  for (const s of [-1, 1]) {
    lock([s * 0.22, 0.7], 0.14, 0.058, [s * 0.85, -0.12], [s * 0.4, 0.85]);
    lock([s * 0.5, 0.62], 0.16, 0.06, [s * 1.1, -0.42], [s * 0.7, 0.7]);
    lock([s * 0.82, 0.5], 0.17, 0.06, [s * 1.35, -0.75], [s * 1.0, 0.55]);
  }
  // Tóc mai hai bên.
  for (const s of [-1, 1]) {
    lock([s * 1.4, 0.32], 0.2, 0.06, [s * 1.55, -1.1], [s * 1.6, 0.2]);
    lock([s * 1.15, 0.22], 0.15, 0.052, [s * 1.3, -1.2], [s * 1.3, 0.3]);
  }

  // Băng đô đỏ quanh trán (gần như nằm ngang, hơi trễ ra sau), nút sau gáy, hai đuôi dài bay theo khí.
  const band = part(new THREE.TorusGeometry(0.138, 0.016, 8, 48).scale(0.94, 1.07, 1), red);
  band.rotation.x = Math.PI / 2 - 0.15;
  head.add(at(band, 0, 0.045, 0));
  const ribbons: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const g = at(new THREE.Group(), s * 0.02, 0.022, -0.146);
    g.add(
      part(
        limb(
          0.44,
          [
            [0, 0.03],
            [0.5, 0.034],
            [1, 0.024],
          ],
          0.06,
        ).scale(1, 1, 0.25),
        red,
      ),
    );
    g.rotation.set(0.5, s * 0.25, s * 0.15);
    head.add(g);
    ribbons.push(g);
  }

  let faceKey = '';
  const setFace = (expr: Expr, form: Form) => {
    const key = `${expr}|${form.name}`;
    if (key === faceKey) return;
    faceKey = key;
    drawFace(
      face.ctx,
      glowArt.ctx,
      expr,
      form.glowEyes ? form.aura : '#1fae9c',
      form.glowEyes,
      form.hair,
    );
    face.tex.needsUpdate = true;
    glowArt.tex.needsUpdate = true;
    faceMat.emissive.set(form.glowEyes ? form.core : '#000000');
  };
  const setTorn = (torn: boolean) => {
    giTop.map = torn ? tornArt.tex : torsoArt.tex;
    for (const s of sleeves) s.visible = !torn;
    for (const d of delts) d.visible = torn;
  };

  return {
    root,
    body,
    torso,
    neck,
    head,
    shoulders: shoulders as [Joint, Joint],
    elbows: elbows as [Joint, Joint],
    hips: hips as [Joint, Joint],
    knees: knees as [Joint, Joint],
    ankles: ankles as [Joint, Joint],
    arms,
    sleeves,
    hairMat,
    locks,
    ribbons,
    sashTails,
    setFace,
    setTorn,
    textures,
  };
}

/* ─────────────────────────────── tư thế ─────────────────────────────── */

// Góc các khớp (radian). Chỉ số 0 là tay/chân phía -x, phía võ sĩ quay mặt về (bàn bi nằm bên trái).
// Vai: x âm là đưa tay ra trước, z dang ra ngoài (âm với tay 0, dương với tay 1), y vặn để cẳng tay
// quặp vào trong. Khuỷu và gối: góc gập.
const POSES = {
  // Thủ thế: tay trước giơ nắm đấm ngang ngực, tay sau thu nắm đấm bên hông.
  guard: {
    twist: -0.32,
    lean: 0.06,
    headX: 0.08,
    headY: 0.2,
    sh0x: -1.1,
    sh0y: 0.35,
    sh0z: -0.28,
    el0: -1.4,
    sh1x: 0.45,
    sh1y: -0.2,
    sh1z: 0.32,
    el1: -1.95,
    hip0: -0.3,
    hip1: 0.18,
    spread: 0.2,
    knee0: 0.38,
    knee1: 0.34,
  },
  // Nạp khí: tấn rộng, khuỵu gối, hai nắm đấm siết bên hông, khuỷu bạnh ra, cúi đầu gằm mắt.
  charge: {
    twist: -0.12,
    lean: 0.12,
    headX: 0.14,
    headY: 0.08,
    sh0x: 0.12,
    sh0y: 0.65,
    sh0z: -0.55,
    el0: -1.3,
    sh1x: 0.12,
    sh1y: -0.65,
    sh1z: 0.55,
    el1: -1.3,
    hip0: -0.3,
    hip1: -0.2,
    spread: 0.3,
    knee0: 0.5,
    knee1: 0.45,
  },
  // Gồng lên cấp: ưỡn ngực, ngửa đầu hét, hai tay dang xuống siết chặt.
  surge: {
    twist: 0,
    lean: -0.14,
    headX: -0.42,
    headY: 0,
    sh0x: 0.15,
    sh0y: 0.3,
    sh0z: -0.9,
    el0: -0.45,
    sh1x: 0.15,
    sh1y: -0.3,
    sh1z: 0.9,
    el1: -0.45,
    hip0: -0.25,
    hip1: -0.25,
    spread: 0.36,
    knee0: 0.5,
    knee1: 0.5,
  },
  won: {
    twist: -0.12,
    lean: -0.04,
    headX: -0.18,
    headY: 0.12,
    sh0x: -0.2,
    sh0y: 0,
    sh0z: -2.75,
    el0: -0.35,
    sh1x: 0.3,
    sh1y: -0.4,
    sh1z: 0.35,
    el1: -1.6,
    hip0: -0.15,
    hip1: 0.1,
    spread: 0.2,
    knee0: 0.15,
    knee1: 0.15,
  },
  lost: {
    twist: -0.2,
    lean: 0.5,
    headX: 0.5,
    headY: 0,
    sh0x: -0.3,
    sh0y: 0,
    sh0z: -0.12,
    el0: -0.3,
    sh1x: -0.3,
    sh1y: 0,
    sh1z: 0.12,
    el1: -0.3,
    hip0: -0.7,
    hip1: -0.7,
    spread: 0.18,
    knee0: 1.2,
    knee1: 1.2,
  },
};
type Pose = (typeof POSES)['guard'];

/** Chiều cao từ hông xuống đất của một chân theo góc hông, góc gối và độ dạng. */
const legDrop = (hip: number, knee: number, spread: number) =>
  (THIGH * Math.cos(hip) + SHIN * Math.cos(hip + knee)) * Math.cos(spread) + FOOT;

function applyPose(rig: Rig, p: Pose) {
  rig.root.rotation.y = p.twist;
  rig.torso.rotation.x = p.lean;
  rig.head.rotation.set(p.headX, p.headY, 0);
  rig.shoulders[0].rotation.set(p.sh0x, p.sh0y, p.sh0z);
  rig.shoulders[1].rotation.set(p.sh1x, p.sh1y, p.sh1z);
  rig.elbows[0].rotation.x = p.el0;
  rig.elbows[1].rotation.x = p.el1;
  const legs: [number, number][] = [
    [p.hip0, p.knee0],
    [p.hip1, p.knee1],
  ];
  legs.forEach(([h, k], i) => {
    const side = i === 0 ? -1 : 1;
    rig.hips[i]!.rotation.set(h, 0, side * p.spread);
    rig.knees[i]!.rotation.x = k;
    // Bàn chân luôn đặt phẳng trên đất.
    rig.ankles[i]!.rotation.set(-(h + k), 0, -side * p.spread);
  });
  // Hạ hông cho hai bàn chân chạm đất (lấy trung bình nếu hai chân co khác nhau).
  rig.body.position.y =
    (legDrop(p.hip0, p.knee0, p.spread) + legDrop(p.hip1, p.knee1, p.spread)) / 2 - HIP_Y;
}

/* ─────────────────────────────── cảnh ─────────────────────────────── */

export function createFighterView(canvas: HTMLCanvasElement): FighterView {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // Neutral giữ được độ đậm của màu khí (ACES kéo chỗ sáng về trắng, lửa đỏ thành hồng nhạt).
  renderer.toneMapping = THREE.NeutralToneMapping;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#120a24', 9, 22);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
  // Toả sáng (bloom): hào quang, sét, mắt và cột khí loé sáng ra xung quanh; cấp càng cao càng chói.
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  // Ngưỡng cao: chỉ những gì thật sự phát sáng mới loé (áo trắng dưới đèn thì không).
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.5, 0.85);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(x: T) => {
    disposables.push(x);
    return x;
  };

  // Phông trời và mặt đất đấu trường.
  const sky = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(36, 18)),
    keep(new THREE.MeshBasicMaterial({ map: keep(skyTex()), fog: false })),
  );
  sky.position.set(0, 5.5, -10);
  scene.add(sky);
  const ground = new THREE.Mesh(
    keep(new THREE.CircleGeometry(9, 64)),
    keep(new THREE.MeshStandardMaterial({ map: keep(groundTex(false)), roughness: 0.9 })),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const crackMat = keep(
    new THREE.MeshBasicMaterial({
      map: keep(groundTex(true)),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const cracks = new THREE.Mesh(keep(new THREE.PlaneGeometry(5, 5)), crackMat);
  cracks.rotation.x = -Math.PI / 2;
  cracks.position.y = 0.01;
  scene.add(cracks);

  scene.add(new THREE.HemisphereLight('#c9b8ff', '#1a1030', 0.9));
  const key = new THREE.DirectionalLight('#ffffff', 1.6);
  key.position.set(3, 6, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -3, right: 3, top: 4, bottom: -1 });
  scene.add(key);
  // Ánh khí hắt lên người và mặt đất.
  const auraLight = new THREE.PointLight('#ffffff', 0, 6, 1.5);
  auraLight.position.set(0, 1.3, 1.4);
  scene.add(auraLight);

  const rig = buildFighter();
  scene.add(rig.root);

  // Nhân vật từ model Tripo (toàn thân, không khung xương): tải xong thì thay võ sĩ dựng bằng khối;
  // tải lỗi thì võ sĩ cũ vẫn đứng đó. Vật liệu PBR gốc (bóng như kim loại, ảnh màu có sẵn vệt tối)
  // được đổi sang tô hoạt hình mềm, nâng vùng tối, thêm viền nét mảnh và viền sáng màu khí cho hợp
  // phong cách game. Chỉ chuyển động cả khối: thở, run theo khí, nhún khi lên cấp, ngả khi thắng thua.
  const hero = new THREE.Group();
  hero.visible = false;
  scene.add(hero);
  const heroHead = new THREE.Vector3(0, HERO_BASE + HERO_HEIGHT * HERO_HEAD, 0);
  /** Màu tóc hiện tại (chuyển dần sang màu tóc của dạng mới). */
  const dye: Dye = {
    uHair: { value: new THREE.Color(FORMS[0]!.hair) },
    uHeadC: { value: new THREE.Vector2() },
  };
  const wind: Wind = {
    uTime: { value: 0 },
    uKi: { value: 0 },
    uMinY: { value: 0 },
    uSpanY: { value: 1 },
  };
  let heroReady = false;
  let heroLean = 0;

  // Mái tóc dài tới gót (cấp 3 và 4): model có tóc ngắn đúc liền nên dựng thêm các lọn to bản gắn
  // sau gáy, thả xuống xoè hai bên lưng; mọc dần từ gáy xuống khi vào cấp đó, thu lại khi rời.
  // Cùng màu tóc theo dạng, tô mềm, viền nét, viền sáng màu khí, đung đưa theo khí.
  const longHairMat = withRim(
    new THREE.MeshToonMaterial({
      color: FORMS[0]!.hair,
      gradientMap: softGradient,
      // Tự sáng nhẹ theo màu tóc để nổi trên nền hào quang, sáng ngang tóc trên đầu.
      emissive: FORMS[0]!.hair,
      emissiveIntensity: 0.3,
    }),
  );
  const longHairOutline = outlineMaterial(0.012);
  const longHair = new THREE.Group();
  longHair.visible = false;
  hero.add(longHair);
  /** Hướng sau lưng của model (model xoay -90° rồi ngoảnh thêm 0,3 rad về phía bàn bi). */
  const heroBack = new THREE.Vector3(Math.sin(0.3), 0, -Math.cos(0.3));
  const heroSide = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), heroBack);
  // Gốc tóc dài đặt sau gáy khi model tải xong (tính từ tâm đầu thật của model).
  /** Mỗi lọn: khớp xoay (đung đưa) chứa khối lọn đã định hướng. */
  const longLocks: { pivot: THREE.Group; mesh: THREE.Mesh; phase: number }[] = [];
  const LONG_LOCKS = 11;
  for (let i = 0; i < LONG_LOCKS; i++) {
    const u = i / (LONG_LOCKS - 1) - 0.5; // -0.5 (bên trái) .. 0.5 (bên phải)
    const len = HERO_HEIGHT * (0.86 - Math.abs(u) * 0.2);
    const mesh = new THREE.Mesh(lockGeo(len, 0.2 - Math.abs(u) * 0.08), longHairMat);
    mesh.castShadow = true;
    mesh.add(new THREE.Mesh(mesh.geometry, longHairOutline));
    // Thả xuống, xoè sang hai bên theo vị trí lọn, ngả ra sau lưng; ngọn cong ra ngoài.
    const dir = new THREE.Vector3(0, -1, 0)
      .addScaledVector(heroSide, u * 1.0)
      .addScaledVector(heroBack, 0.16)
      .normalize();
    const out = heroBack
      .clone()
      .addScaledVector(heroSide, u * 1.2)
      .normalize();
    orient(mesh, dir, out);
    const pivot = new THREE.Group();
    pivot.position.copy(heroSide).multiplyScalar(u * 0.42);
    pivot.add(mesh);
    longHair.add(pivot);
    longLocks.push({ pivot, mesh, phase: i * 1.7 });
  }
  let longGrow = 0;
  let headMesh: THREE.Mesh | null = null;
  let headY = 0;
  let disposed = false;
  const disposeTree = (root: THREE.Object3D) =>
    root.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      o.geometry.dispose();
      for (const m of [o.material].flat() as THREE.Material[]) {
        for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose();
        m.dispose();
      }
    });
  const gltfLoader = new GLTFLoader();
  gltfLoader.setMeshoptDecoder(MeshoptDecoder);
  const onHero = (gltf: { scene: THREE.Group }) => {
    const model = gltf.scene;
    if (disposed) {
      disposeTree(model);
      return;
    }
    // Model nhìn theo +x: xoay cho nhìn ra máy quay, hơi ngoảnh về phía bàn bi (bên trái).
    model.rotation.y = -Math.PI / 2 - 0.3;
    const box = new THREE.Box3().setFromObject(model);
    const scale = HERO_HEIGHT / (box.max.y - box.min.y);
    model.scale.setScalar(scale);
    box.setFromObject(model);
    model.position.set(
      -(box.min.x + box.max.x) / 2,
      HERO_BASE - box.min.y,
      -(box.min.z + box.max.z) / 2,
    );
    // Viền nét tính trong toạ độ model (trước khi phóng), nên chia cho tỉ lệ để nét mảnh đều.
    const heroOutline = heroOutlineMaterial(0.005 / scale, wind);
    // Gom khối trước rồi mới xử lý: lớp viền gắn thêm vào khối sẽ bị traverse duyệt lại vô tận.
    const meshes: THREE.Mesh[] = [];
    model.traverse((o) => o instanceof THREE.Mesh && meshes.push(o));
    for (const o of meshes) {
      const pbr = o.material as THREE.MeshStandardMaterial;
      const map = pbr.map;
      if (map) map.anisotropy = renderer.capabilities.getMaxAnisotropy();
      // Gió khí tính theo độ cao trong toạ độ của chính khối (trước khi xoay, phóng).
      o.geometry.computeBoundingBox();
      const gb = o.geometry.boundingBox!;
      wind.uMinY.value = gb.min.y;
      wind.uSpanY.value = gb.max.y - gb.min.y;
      // Tâm đầu: trung bình x, z của các điểm trên đỉnh tóc (10% trên cùng).
      {
        const pos = o.geometry.attributes.position!;
        const top = gb.min.y + (gb.max.y - gb.min.y) * 0.9;
        let sx = 0;
        let sz = 0;
        let n = 0;
        for (let i = 0; i < pos.count; i++)
          if (pos.getY(i) > top) {
            sx += pos.getX(i);
            sz += pos.getZ(i);
            n++;
          }
        if (n) dye.uHeadC.value.set(sx / n, sz / n);
        headMesh = o;
        headY = gb.min.y + (gb.max.y - gb.min.y) * 0.87;
      }
      o.material = heroMaterial(
        {
          map,
          normalMap: pbr.normalMap,
          gradientMap: softGradient,
          // Ảnh màu tự soi một phần lên chính nó: vệt tối nướng sẵn nhạt bớt, màu tươi hơn.
          emissive: new THREE.Color('#ffffff'),
          emissiveMap: map,
          emissiveIntensity: 0.22,
        },
        wind,
        dye,
      );
      pbr.metalnessMap?.dispose();
      pbr.dispose();
      o.castShadow = true;
      o.add(new THREE.Mesh(o.geometry, heroOutline));
    }
    hero.add(model);
    // Gốc tóc dài: sau gáy, tính từ tâm đầu thật của model rồi đổi sang toạ độ của nhóm hero.
    if (headMesh) {
      hero.updateMatrixWorld(true);
      const root = new THREE.Vector3(dye.uHeadC.value.x, headY, dye.uHeadC.value.y);
      hero.worldToLocal(headMesh.localToWorld(root));
      longHair.position.copy(root).addScaledVector(heroBack, HERO_HEIGHT * 0.045);
    }
    hero.visible = true;
    rig.root.visible = false;
    heroReady = true;
  };
  // Không tải được model: giữ võ sĩ dựng bằng khối.
  const noHero = () => undefined;
  loadHero()
    .then((data) => gltfLoader.parse(data, '', onHero, noHero))
    .catch(noHero);

  // Hào quang: hai lớp vỏ lửa (ngoài mềm, trong sắc).
  const auraOuter = auraMaterial(THREE.FrontSide, 1.6);
  const auraInner = auraMaterial(THREE.BackSide, 2.6);
  keep(auraOuter);
  keep(auraInner);
  const auraGeo = keep(new THREE.SphereGeometry(1, 48, 40));
  const aura1 = new THREE.Mesh(auraGeo, auraOuter);
  aura1.scale.set(0.95, 1.35, 0.75);
  aura1.position.y = 1.15;
  const aura2 = new THREE.Mesh(auraGeo, auraInner);
  aura2.scale.set(0.8, 1.2, 0.6);
  aura2.position.y = 1.1;
  aura1.renderOrder = aura2.renderOrder = 5;
  scene.add(aura1, aura2);

  // Cột khí xuyên trời và vầng sáng sau đầu (dạng cuối).
  const pillarMat = auraMaterial(THREE.DoubleSide, 1.2);
  keep(pillarMat);
  const pillar = new THREE.Mesh(
    keep(new THREE.CylinderGeometry(0.9, 1.1, 2, 32, 8, true)),
    pillarMat,
  );
  pillar.scale.set(1, 6, 1);
  pillar.position.y = 6;
  pillar.visible = false;
  scene.add(pillar);
  const haloMat = keep(
    new THREE.MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const halo = new THREE.Mesh(keep(new THREE.TorusGeometry(0.42, 0.025, 8, 48)), haloMat);
  scene.add(halo);

  // Tia khí bay lên.
  const SPARKS = 220;
  const sparkGeo = keep(new THREE.BufferGeometry());
  const sparkPos = new Float32Array(SPARKS * 3);
  const sparkVel = new Float32Array(SPARKS);
  const resetSpark = (i: number) => {
    const a = Math.random() * Math.PI * 2;
    const r = 0.3 + Math.random() * 0.6;
    sparkPos[i * 3] = Math.cos(a) * r;
    sparkPos[i * 3 + 1] = Math.random() * 0.4;
    sparkPos[i * 3 + 2] = Math.sin(a) * r * 0.7;
    sparkVel[i] = 1.2 + Math.random() * 2.5;
  };
  for (let i = 0; i < SPARKS; i++) {
    resetSpark(i);
    sparkPos[i * 3 + 1] = Math.random() * 3;
  }
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  const sparkMat = keep(
    new THREE.PointsMaterial({
      map: keep(softDot()),
      size: 0.09,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: '#ffffff',
    }),
  );
  const sparks = new THREE.Points(sparkGeo, sparkMat);
  scene.add(sparks);

  // Khói cuộn quanh người (cấp nào cũng có, khí càng mạnh càng dày).
  const smokeMap = keep(smokeTex());
  type Puff = { s: THREE.Sprite; t: number; life: number; vx: number; vz: number };
  const puffs: Puff[] = [];
  const spawnPuff = (big = false) => {
    const m = new THREE.SpriteMaterial({
      map: smokeMap,
      transparent: true,
      depthWrite: false,
      opacity: 0,
      color: '#8a7fb0',
    });
    const s = new THREE.Sprite(m);
    // Khói thường cuộn hai bên và sau lưng (khói phía trước phủ mờ cả chân); khói bùng nổ toả mọi hướng.
    const a = big ? Math.random() * Math.PI * 2 : Math.PI * (0.95 + Math.random() * 1.1);
    const r = 0.45 + Math.random() * 0.3;
    s.position.set(
      Math.cos(a) * r,
      big ? 0.15 : 0.08 + Math.random() * 0.45,
      Math.sin(a) * r * 0.7,
    );
    scene.add(s);
    puffs.push({
      s,
      t: 0,
      life: big ? 1.6 : 2 + Math.random(),
      vx: Math.cos(a) * (big ? 2.5 : 0.35),
      vz: Math.sin(a) * (big ? 2.5 : 0.25),
    });
  };

  // Đá vụn bay lơ lửng (Băng ngân trở lên).
  const rockMat = new THREE.MeshToonMaterial({ color: '#4a3f6e', gradientMap: gradient });
  keep(rockMat);
  const rocks = Array.from({ length: 9 }, (_, i) => {
    const m = part(new THREE.DodecahedronGeometry(0.06 + Math.random() * 0.08, 0), rockMat);
    const a = (i / 9) * Math.PI * 2;
    m.userData = {
      a,
      r: 0.9 + Math.random() * 0.6,
      h: 0.3 + Math.random() * 1.6,
      spd: 0.3 + Math.random() * 0.4,
      rise: 0,
    };
    m.visible = false;
    scene.add(m);
    return m;
  });

  // Sét: ống mảnh gấp khúc quanh người, sống vài chục mili giây.
  type Bolt = { mesh: THREE.Mesh; t: number };
  let bolts: Bolt[] = [];
  let zapFn: () => void = () => {};
  const boltMat = keep(
    new THREE.MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const spawnBolt = (color: THREE.Color) => {
    const pts: THREE.Vector3[] = [];
    const a = Math.random() * Math.PI * 2;
    let p = new THREE.Vector3(Math.cos(a) * 0.5, 0.2 + Math.random() * 1.8, Math.sin(a) * 0.35);
    for (let i = 0; i < 7; i++) {
      pts.push(p.clone());
      p = p.add(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.35,
          (Math.random() - 0.3) * 0.3,
          (Math.random() - 0.5) * 0.25,
        ),
      );
    }
    const geo = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0),
      24,
      0.012,
      4,
    );
    const m = boltMat.clone();
    m.color.copy(color).lerp(new THREE.Color('#ffffff'), 0.4);
    const mesh = new THREE.Mesh(geo, m);
    scene.add(mesh);
    bolts.push({ mesh, t: 0 });
  };

  // Sóng chấn khi lên cấp.
  const shockMat = keep(
    new THREE.MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  const shock = new THREE.Mesh(keep(new THREE.RingGeometry(0.8, 1, 64)), shockMat);
  shock.rotation.x = -Math.PI / 2;
  shock.position.y = 0.02;
  scene.add(shock);
  // Chớp sáng phủ khung hình.
  const flashMat = keep(
    new THREE.MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
    }),
  );
  const flash = new THREE.Mesh(keep(new THREE.PlaneGeometry(4, 4)), flashMat);
  flash.position.z = -0.5;
  flash.renderOrder = 99;
  camera.add(flash);
  scene.add(camera);

  // ------------------------------------------------------------------ trạng thái

  let level = 0;
  let form: Form = FORMS[0]!;
  const auraColor = new THREE.Color(form.aura);
  const coreColor = new THREE.Color(form.core);
  const hairColor = new THREE.Color(form.hair);
  const targetAura = new THREE.Color();
  const targetCore = new THREE.Color();
  const targetHair = new THREE.Color();
  let power = form.power;
  let bump = 0;
  /** Độ dựng tóc hiện tại 0..1 (tiến dần về mức của dạng). */
  let rise = 0;
  /** Đang gồng lên cấp: thời điểm bắt đầu (ms), 0 là không. */
  let surgeAt = 0;
  let shockAt = 0;
  let shake = 0;
  let mood: 'fight' | 'won' | 'lost' = 'fight';
  let nextBolt = 0;
  let width = 1;
  let height = 1;
  const pose: Pose = { ...POSES.guard };
  const headPos = new THREE.Vector3();
  const lockDir = new THREE.Vector3();
  /** Mức dựng tóc của từng dạng. */
  const RISE = [0, 0.22, 0.45, 0.7, 0.88, 1];

  const applyForm = (f: Form) => {
    form = f;
    rig.setTorn(f.torn);
    rocks.forEach((r) => (r.visible = f.rocks));
    pillar.visible = f.ascended;
  };
  applyForm(form);
  applyPose(rig, pose);

  const fit = () => {
    camera.aspect = width / height;
    // Khung hình chứa trọn võ sĩ, ngọn lửa trên đầu và mặt đất: khung hẹp thì lùi xa. Máy quay đặt
    // thấp hơn ngực, ngước lên cho võ sĩ trông sừng sững.
    const dist = Math.max(5.2, 4.1 / camera.aspect);
    camera.position.set(0.3, 1.0, dist);
    camera.lookAt(0, 1.32, 0);
    camera.updateProjectionMatrix();
  };

  // ------------------------------------------------------------------ vòng vẽ

  const start = performance.now();
  let prev = start;
  let raf = 0;
  const tick = () => {
    raf = requestAnimationFrame(tick);
    const now = performance.now();
    const dt = Math.min(0.05, (now - prev) / 1000);
    prev = now;
    const t = (now - start) / 1000;
    /** Hệ số tiến dần theo thời gian (không theo số khung hình): màn 60Hz hay 120Hz chuyển như nhau. */
    const ease = (rate: number) => 1 - Math.exp(-dt * rate);

    // Màu chuyển dần sang dạng mới.
    auraColor.lerp(targetAura.set(form.aura), ease(7));
    coreColor.lerp(targetCore.set(form.core), ease(7));
    hairColor.lerp(targetHair.set(form.hair), ease(3));
    rig.hairMat.color.copy(hairColor);
    dye.uHair.value.copy(hairColor);
    const surge = surgeAt ? Math.min(1, (now - surgeAt) / 1400) : 1;
    const surging = surgeAt && surge < 1;
    if (surgeAt && surge >= 1) surgeAt = 0;
    power += (form.power - power) * ease(3);
    bump *= 1 - ease(6);
    const glow =
      mood === 'lost'
        ? power * 0.2
        : power + bump + (surging ? Math.sin(surge * Math.PI) * 0.6 : 0);

    for (const m of [auraOuter, auraInner, pillarMat]) {
      m.uniforms.uTime!.value = reduce ? 0 : t;
      (m.uniforms.uColor!.value as THREE.Color).copy(auraColor);
      (m.uniforms.uCore!.value as THREE.Color).copy(coreColor);
      m.uniforms.uRainbow!.value = form.ascended ? 1 : 0;
    }
    auraOuter.uniforms.uPower!.value = glow;
    auraInner.uniforms.uPower!.value = glow * 0.8;
    // Cột khí mờ hơn hào quang để không thành ống kính che người.
    pillarMat.uniforms.uPower!.value = form.ascended ? 0.32 + Math.sin(t * 3) * 0.06 : 0;
    const swell = 1 + glow * 0.25;
    aura1.scale.set(0.95 * swell, 1.35 * swell, 0.75 * swell);
    aura2.scale.set(0.8 * swell, 1.2 * swell, 0.6 * swell);
    auraLight.color.copy(auraColor);
    auraLight.intensity = Math.min(1.2, glow) * 2.2;
    crackMat.color.copy(auraColor);
    crackMat.opacity += ((form.torn ? 0.55 + glow * 0.3 : 0) - crackMat.opacity) * ease(3);
    // Viền sáng màu khí ôm người: khí càng mạnh viền càng dày sáng.
    rim.uRimColor.value.copy(auraColor).lerp(coreColor, 0.3);
    rim.uRim.value = mood === 'lost' ? 0.05 : Math.min(1.3, glow) * 0.8;
    // Giảm chuyển động thì tóc, áo đứng yên hẳn.
    wind.uTime.value = reduce ? 0 : t;
    wind.uKi.value = reduce ? -0.35 : Math.min(1.6, glow);

    // Tư thế: thủ thế lúc khí còn yếu, tấn nạp khí từ cấp 3; gồng khi lên cấp; ăn mừng hay gục khi
    // hết ván. Các khớp tiến dần về tư thế đích.
    const target = surging
      ? POSES.surge
      : mood === 'won'
        ? POSES.won
        : mood === 'lost'
          ? POSES.lost
          : level >= 2
            ? POSES.charge
            : POSES.guard;
    const k = ease(surging ? 12 : 6);
    for (const key of Object.keys(pose) as (keyof Pose)[])
      pose[key] += (target[key] - pose[key]) * k;
    applyPose(rig, pose);
    // Thở; khí mạnh thì cả người run lên.
    const breathe = reduce ? 0 : Math.sin(t * 2.4) * 0.012;
    const tremble =
      reduce || mood !== 'fight'
        ? 0
        : (surging ? 0.025 : Math.max(0, level - 2) * 0.004) * (Math.random() - 0.5);
    rig.torso.scale.set(1 + breathe, 1 + breathe * 0.5, 1 + breathe);
    rig.torso.rotation.z = tremble;
    rig.root.position.set(tremble, 0, tremble * 0.5);
    const muscle = 1 + (form.torn ? 0.08 : 0) + level * 0.015;
    rig.body.scale.set(muscle, 1, muscle);
    for (const a of rig.arms) a.scale.set(form.torn ? 1.12 : 1, 1, form.torn ? 1.12 : 1);
    rig.setFace(
      surging ? 'shout' : mood === 'won' ? 'grin' : mood === 'lost' ? 'hurt' : 'fierce',
      form,
    );

    // Tóc dựng ngược và bay phần phật theo khí; đuôi băng đô, đuôi đai bay theo.
    rise += ((mood === 'lost' ? 0 : RISE[level]! + (surging ? 0.25 : 0)) - rise) * ease(4);
    const lift = Math.min(1, rise + bump * 0.3);
    for (const l of rig.locks) {
      const wave = reduce ? 0 : Math.sin(t * (3 + lift * 7) + l.phase) * (0.04 + lift * 0.1);
      const a = l.rest[0] + (l.up[0] - l.rest[0]) * lift + wave * 0.5;
      const e = l.rest[1] + (l.up[1] - l.rest[1]) * lift + wave;
      orient(l.g, dirOf(a, e, lockDir), l.out);
      l.g.scale.setScalar(1 + lift * 0.18);
    }
    rig.ribbons.forEach((r, i) => {
      const wave = reduce ? 0 : Math.sin(t * (5 + lift * 8) + i * 1.7) * (0.15 + lift * 0.3);
      r.rotation.x = 0.5 + lift * 1.2 + wave;
    });
    rig.sashTails.forEach((r, i) => {
      const wave = reduce ? 0 : Math.sin(t * (4 + lift * 8) + i * 2.1) * lift * 0.25;
      r.rotation.x = -lift * 0.5 + wave;
    });

    if (heroReady) {
      // Gồng lên cấp: bật lên, phồng người, ngửa ra; thắng thì ưỡn ngực; thua thì cúi gập về trước.
      const pop = surging ? Math.sin(surge * Math.PI) : 0;
      const lean = mood === 'lost' ? 0.14 : mood === 'won' ? -0.07 : -0.08 * pop;
      heroLean += (lean - heroLean) * ease(5);
      hero.rotation.x = heroLean;
      hero.position.set(tremble * 2, pop * 0.14, tremble);
      const puff = 1 + pop * 0.04 + bump * 0.025;
      hero.scale.set(puff * (1 + breathe), puff * (1 + breathe * 0.6), puff * (1 + breathe));
      // Tóc dài mọc ở các dạng có longHair (cấp 3 và 4), đung đưa theo khí.
      const wantLong = mood !== 'lost' && form.longHair ? 1 : 0;
      longGrow += (wantLong - longGrow) * ease(wantLong ? 2.2 : 4);
      longHair.visible = longGrow > 0.01;
      // Mỗi lọn dài ra theo chính hướng của nó (trục dọc của lọn), to dần một chút.
      const thick = 0.6 + longGrow * 0.4;
      // Sáng ngang tóc nhuộm trên đầu (tóc tối vẫn nổi trên nền hào quang).
      longHairMat.color.copy(hairColor).multiplyScalar(1.05).addScalar(0.08);
      longHairMat.emissive.copy(longHairMat.color);
      for (const l of longLocks) {
        const sway = reduce ? 0 : Math.sin(t * (2 + glow * 3) + l.phase) * (0.04 + glow * 0.05);
        l.pivot.rotation.set(sway * 0.6, 0, sway);
        l.mesh.scale.set(thick, longGrow, thick);
      }
      hero.updateMatrixWorld();
      hero.localToWorld(headPos.copy(heroHead));
    } else {
      rig.head.getWorldPosition(headPos);
    }
    halo.position.set(headPos.x, headPos.y + 0.05, headPos.z - 0.28);
    haloMat.color.copy(coreColor);
    haloMat.opacity += ((form.ascended ? 0.85 : 0) - haloMat.opacity) * ease(3);
    halo.rotation.z = t * 0.4;

    // Tia khí.
    sparkMat.color.copy(auraColor).lerp(new THREE.Color('#ffffff'), 0.3);
    sparkMat.opacity = Math.min(1, glow * 1.2);
    sparkMat.size = 0.06 + glow * 0.06;
    if (!reduce) {
      for (let i = 0; i < SPARKS; i++) {
        sparkPos[i * 3 + 1]! += sparkVel[i]! * dt * (0.6 + glow * 1.5);
        if (sparkPos[i * 3 + 1]! > 2.4 + glow) resetSpark(i);
      }
      sparkGeo.attributes.position!.needsUpdate = true;
    }

    // Khói.
    if (!reduce && Math.random() < (0.3 + form.smoke) * dt * 14) spawnPuff();
    for (let i = puffs.length - 1; i >= 0; i--) {
      const p = puffs[i]!;
      p.t += dt;
      const k = p.t / p.life;
      if (k >= 1) {
        scene.remove(p.s);
        p.s.material.dispose();
        puffs.splice(i, 1);
        continue;
      }
      p.s.position.x += p.vx * dt;
      p.s.position.z += p.vz * dt;
      p.s.position.y += dt * 0.28;
      p.vx *= 0.97;
      p.vz *= 0.97;
      p.s.scale.setScalar(0.6 + k * 1.5);
      // Đủ dày để thấy khói cuộn quanh người, vẫn mờ để không che mặt và lửa khí.
      p.s.material.opacity = Math.sin(k * Math.PI) * 0.45;
      p.s.material.color.set('#4a3f66').lerp(auraColor, 0.35);
    }

    // Đá bay.
    for (const r of rocks) {
      if (!r.visible) continue;
      const u = r.userData as { a: number; r: number; h: number; spd: number; rise: number };
      u.rise = Math.min(1, u.rise + dt * 0.6);
      u.a += dt * u.spd;
      r.position.set(
        Math.cos(u.a) * u.r,
        0.1 + u.h * u.rise + Math.sin(t * 2 + u.a) * 0.08,
        Math.sin(u.a) * u.r * 0.7,
      );
      r.rotation.x += dt;
      r.rotation.y += dt * 0.7;
    }

    // Sét.
    if (form.lightning && !reduce && mood !== 'lost' && now > nextBolt) {
      const n = 1 + Math.floor(Math.random() * (level - 1));
      for (let i = 0; i < n; i++) spawnBolt(auraColor);
      zapFn();
      nextBolt = now + 90 + Math.random() * (500 - level * 60);
    }
    bolts = bolts.filter((b) => {
      b.t += dt;
      (b.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - b.t / 0.12;
      if (b.t < 0.12) return true;
      scene.remove(b.mesh);
      b.mesh.geometry.dispose();
      (b.mesh.material as THREE.Material).dispose();
      return false;
    });

    // Sóng chấn, chớp sáng, rung camera.
    if (shockAt) {
      const k = Math.min(1, (now - shockAt) / 700);
      shock.scale.setScalar(0.5 + k * 4.5);
      shockMat.opacity = (1 - k) * 0.9;
      shockMat.color.copy(auraColor);
      flashMat.opacity = Math.max(0, 0.75 - k * 1.6);
      if (k >= 1) shockAt = 0;
    }
    fit();
    if (shake > 0 && !reduce) {
      camera.position.x += (Math.random() - 0.5) * shake;
      camera.position.y += (Math.random() - 0.5) * shake;
      shake *= 1 - ease(6);
      if (shake < 0.002) shake = 0;
    }
    bloom.strength = 0.3 + Math.min(1.4, glow) * 0.8;
    composer.render();
  };
  raf = requestAnimationFrame(tick);

  return {
    setLevel: (next) => {
      const lv = Math.max(0, Math.min(FORMS.length - 1, next));
      if (lv === level) return;
      const up = lv > level;
      level = lv;
      applyForm(FORMS[lv]!);
      if (up && !reduce) {
        surgeAt = performance.now();
        shockAt = surgeAt;
        shake = 0.06 + lv * 0.02;
        for (let i = 0; i < 10 + lv * 3; i++) spawnPuff(true);
      }
    },
    pulse: (s) => {
      bump = Math.min(0.6, bump + s * 0.08);
    },
    finish: (won) => {
      mood = won ? 'won' : 'lost';
      if (won && !reduce) {
        shockAt = performance.now();
        shake = 0.08;
      }
    },
    onZap: (fn) => {
      zapFn = fn;
    },
    resize: (w, h) => {
      width = Math.max(1, w);
      height = Math.max(1, h);
      renderer.setSize(width, height, false);
      composer.setSize(width, height);
      fit();
    },
    dispose: () => {
      cancelAnimationFrame(raf);
      disposed = true;
      disposeTree(hero);
      for (const b of bolts) b.mesh.geometry.dispose();
      for (const p of puffs) p.s.material.dispose();
      rig.root.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          if (o.material !== outlineMat) (o.material as THREE.Material).dispose();
        }
      });
      for (const tex of rig.textures) tex.dispose();
      for (const d of disposables) d.dispose();
      composer.dispose();
      renderer.dispose();
    },
  };
}
