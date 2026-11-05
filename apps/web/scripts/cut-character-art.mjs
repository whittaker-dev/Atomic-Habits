// Chuẩn bị ảnh nhân vật cho Bong Bóng Bùm: xoá nền ô caro (vẽ cứng trong ảnh, không phải nền trong suốt thật),
// cắt gọn quanh nhân vật và lưu PNG nền trong suốt theo mã nhân vật.
//
//   node scripts/cut-character-art.mjs art-source/characters
//
// Ảnh gốc để ở art-source/ (ngoài public/) để không bị deploy công khai — gồm cả hai ảnh cố ý không dùng.
//
// Chỉ dùng thư viện có sẵn của Node (zlib), đọc được PNG 8-bit RGBA/RGB không xen kẽ.
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync, inflateSync } from 'node:zlib';

// Tên file gốc → mã nhân vật trong characters.ts. Bone Melody và Cyber Girl cố ý bỏ ra:
// hai thiết kế đó quá giống nhân vật có bản quyền của người khác.
const MAP = {
  '01_Captain_Blaze': 'blaze',
  '02_Blade_Ronin': 'ronin',
  '03_Treasure_Fox': 'fox',
  '04_Storm_Fang': 'storm',
  '06_Mecha_Pop': 'mecha',
  '07_Dragon_Kid': 'dragon',
  '08_Sky_Archer': 'archer',
  '09_Ice_Knight': 'iceknight',
  '10_Flame_Mage': 'flamemage',
  '11_Forest_Spirit': 'forest',
  '12_Desert_Outlaw': 'outlaw',
  '13_Shadow_Ninja': 'ninja',
  '14_Mushroom_Healer': 'mushroom',
  '15_Robot_Inventor': 'inventor',
  '16_Shark_Warrior': 'shark',
  '17_Thunder_Monk': 'monk',
  '18_Ghost_Musician': 'ghost',
  '19_Sand_Warrior': 'sand',
  '20_Flower_Dancer': 'dancer',
  '22_Beast_Tamer': 'tamer',
  '23_Time_Mage': 'time',
  '24_King_Pirate': 'wave',
  // Hai nhân vật gốc thay cho 05 và 21, tạo bằng Figma AI (file "Bong Bóng Bùm — Nhân vật mới").
  '25_Skeleton_Sailor': 'sailor',
  '26_Neon_Girl': 'neon',
  // Nhóm võ sĩ gốc, cũng tạo bằng Figma AI.
  '27_Tieu_Ho': 'tieuho',
  '28_Truc_Lan': 'truclan',
  '29_Ong_Do_Gio': 'ongdo',
  '30_Sumo_Sam': 'sumo',
  '31_Oc_Vit': 'ocvit',
  '32_Dao_Si_Giay': 'daosi',
  '33_Ho_Mang_Tim': 'homang',
  '34_Gang_Do': 'gangdo',
  // Nhóm chiến binh năng lượng gốc (Figma AI, mô hình sunburst).
  '35_Hoa_Quyen': 'hoaquyen',
  '36_Loi_Phong': 'loiphong',
  '37_Bang_Nguyet': 'bangnguyet',
  '38_Thach_Giap': 'thachgiap',
  '39_Phong_Linh': 'phonglinh',
  // Khói tím bao kín vài mảng nền trắng: xoá cả mảng trắng bị bao (chỉ bật cho ảnh này, vì ảnh khác có áo trắng thật).
  '40_Hac_Anh': { id: 'hacanh', fillHoles: true },
  '41_Liet_Ung': 'lietung',
  '42_Thuy_Long': 'thuylong',
};

const OUT = join(import.meta.dirname, '../public/games/bong-bong-bum/characters');
const PAD = 4;

// ---------------------------------------------------------------- PNG đọc/ghi tối giản
function decodePng(buf) {
  let p = 8;
  let w = 0,
    h = 0,
    type = 0;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const kind = buf.toString('ascii', p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (kind === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      if (data[8] !== 8 || data[12] !== 0) throw new Error('Chỉ hỗ trợ PNG 8-bit không xen kẽ');
      type = data[9];
    } else if (kind === 'IDAT') idat.push(data);
    p += 12 + len;
  }
  const bpp = type === 6 ? 4 : type === 2 ? 3 : 0;
  if (!bpp) throw new Error(`Kiểu màu PNG ${type} chưa hỗ trợ`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * bpp;
  const px = Buffer.alloc(w * h * 4);
  const prev = Buffer.alloc(stride);
  const cur = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    raw.copy(cur, 0, y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      let v = cur[i];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const pa = Math.abs(b - c),
          pb = Math.abs(a - c),
          pc = Math.abs(a + b - 2 * c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[i] = v & 255;
    }
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      px[o] = cur[x * bpp];
      px[o + 1] = cur[x * bpp + 1];
      px[o + 2] = cur[x * bpp + 2];
      px[o + 3] = bpp === 4 ? cur[x * bpp + 3] : 255;
    }
    cur.copy(prev);
  }
  return { w, h, px };
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(kind, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(kind, 'ascii'), data]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc(body));
  return Buffer.concat([len, body, c]);
}
function encodePng(w, h, px) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) px.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- xoá nền ô caro
/** Điểm ảnh "nền": sáng và gần như không màu (ô caro trắng / xám nhạt). */
let backdropMin = 196;
const isBackdrop = (px, o) => {
  const r = px[o],
    g = px[o + 1],
    b = px[o + 2];
  return Math.min(r, g, b) >= backdropMin && Math.max(r, g, b) - Math.min(r, g, b) <= 16;
};

function removeBackdrop({ w, h, px }) {
  // Loang từ mép ảnh vào; dừng ở nét viền tối của nhân vật nên phần trắng bên trong (tóc bạc, áo) vẫn giữ.
  const bg = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const k = stack.pop();
    if (bg[k] || !isBackdrop(px, k * 4)) continue;
    bg[k] = 1;
    const x = k % w,
      y = (k / w) | 0;
    if (x > 0) stack.push(k - 1);
    if (x < w - 1) stack.push(k + 1);
    if (y > 0) stack.push(k - w);
    if (y < h - 1) stack.push(k + w);
  }
  // Viền mờ sát nền (điểm ảnh pha giữa nét và ô caro): làm trong một nửa để khỏi có quầng trắng.
  for (let k = 0; k < w * h; k++) {
    if (bg[k]) {
      px[k * 4 + 3] = 0;
      continue;
    }
    const x = k % w,
      y = (k / w) | 0;
    const touches =
      (x > 0 && bg[k - 1]) ||
      (x < w - 1 && bg[k + 1]) ||
      (y > 0 && bg[k - w]) ||
      (y < h - 1 && bg[k + w]);
    const o = k * 4;
    if (
      touches &&
      Math.min(px[o], px[o + 1], px[o + 2]) >= 170 &&
      Math.max(px[o], px[o + 1], px[o + 2]) - Math.min(px[o], px[o + 1], px[o + 2]) <= 28
    )
      px[o + 3] = 110;
  }
}

/**
 * Bóng đổ xám nhạt dưới chân (ảnh 3D): loang tiếp từ phần đã trong suốt nhưng chỉ trong dải dưới cùng,
 * nên tóc/áo trắng ở phía trên không bị đụng tới.
 */
function removeFloorShadow({ w, h, px }) {
  const top = Math.floor(h * 0.85);
  const shadow = (k) => {
    const o = k * 4;
    return (
      px[o + 3] > 0 &&
      Math.min(px[o], px[o + 1], px[o + 2]) >= 200 &&
      Math.max(px[o], px[o + 1], px[o + 2]) - Math.min(px[o], px[o + 1], px[o + 2]) <= 16
    );
  };
  const stack = [];
  for (let k = top * w; k < w * h; k++) if (px[k * 4 + 3] === 0) stack.push(k);
  while (stack.length) {
    const k = stack.pop();
    const x = k % w,
      y = (k / w) | 0;
    for (const n of [
      x > 0 ? k - 1 : -1,
      x < w - 1 ? k + 1 : -1,
      y > top ? k - w : -1,
      y < h - 1 ? k + w : -1,
    ]) {
      if (n >= 0 && shadow(n)) {
        px[n * 4 + 3] = 0;
        stack.push(n);
      }
    }
  }
}

/** Xoá mảng nền trắng tinh bị nét vẽ bao kín (phép loang từ mép ảnh không chạm tới). */
function removeEnclosedBackdrop({ w, h, px }, minSize = 120) {
  const seen = new Uint8Array(w * h);
  const pureWhite = (k) => {
    const o = k * 4;
    return (
      px[o + 3] > 0 &&
      Math.min(px[o], px[o + 1], px[o + 2]) >= 238 &&
      Math.max(px[o], px[o + 1], px[o + 2]) - Math.min(px[o], px[o + 1], px[o + 2]) <= 10
    );
  };
  for (let start = 0; start < w * h; start++) {
    if (seen[start] || !pureWhite(start)) continue;
    const comp = [];
    const stack = [start];
    seen[start] = 1;
    while (stack.length) {
      const k = stack.pop();
      comp.push(k);
      const x = k % w,
        y = (k / w) | 0;
      for (const n of [
        x > 0 ? k - 1 : -1,
        x < w - 1 ? k + 1 : -1,
        y > 0 ? k - w : -1,
        y < h - 1 ? k + w : -1,
      ]) {
        if (n >= 0 && !seen[n] && pureWhite(n)) {
          seen[n] = 1;
          stack.push(n);
        }
      }
    }
    if (comp.length >= minSize) for (const k of comp) px[k * 4 + 3] = 0;
  }
}

/** Xoá các mảng rời rất nhỏ (vụn ô caro bị nét vẽ bao quanh, chấm lấm tấm) — giữ nhân vật và hiệu ứng lớn. */
function dropSpecks({ w, h, px }, minSize = 40) {
  const seen = new Uint8Array(w * h);
  for (let start = 0; start < w * h; start++) {
    if (seen[start] || px[start * 4 + 3] === 0) continue;
    const comp = [];
    const stack = [start];
    seen[start] = 1;
    while (stack.length) {
      const k = stack.pop();
      comp.push(k);
      const x = k % w,
        y = (k / w) | 0;
      for (const n of [
        x > 0 ? k - 1 : -1,
        x < w - 1 ? k + 1 : -1,
        y > 0 ? k - w : -1,
        y < h - 1 ? k + w : -1,
      ]) {
        if (n >= 0 && !seen[n] && px[n * 4 + 3] > 0) {
          seen[n] = 1;
          stack.push(n);
        }
      }
    }
    if (comp.length < minSize) for (const k of comp) px[k * 4 + 3] = 0;
  }
}

function trim({ w, h, px }) {
  let x0 = w,
    y0 = h,
    x1 = -1,
    y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (px[(y * w + x) * 4 + 3] > 0) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  x0 = Math.max(0, x0 - PAD);
  y0 = Math.max(0, y0 - PAD);
  x1 = Math.min(w - 1, x1 + PAD);
  y1 = Math.min(h - 1, y1 + PAD);
  const nw = x1 - x0 + 1,
    nh = y1 - y0 + 1;
  const out = Buffer.alloc(nw * nh * 4);
  for (let y = 0; y < nh; y++)
    px.copy(out, y * nw * 4, ((y0 + y) * w + x0) * 4, ((y0 + y) * w + x1 + 1) * 4);
  return { w: nw, h: nh, px: out };
}

const src = process.argv[2];
if (!src) throw new Error('Cách dùng: node scripts/cut-character-art.mjs <thư mục ảnh gốc> [--hd]');
// --hd: làm bản 512px cho banner/ảnh bìa từ ảnh `<tên>_512.png` (thu nhỏ từ ảnh gốc 1024px bằng
// `sips -Z 512`), ghi vào characters/hd/. Nhân vật chỉ có ảnh 256px thì bỏ qua — phóng to sẽ mờ.
// --agents <thư mục ra>: bộ đặc vụ 3D (art-source/agents). Mỗi file `<mã>.png` (mặt trước) và
// `<mã>-back.png` (sau lưng) giữ nguyên tên; ảnh đã được thu nhỏ trước bằng `sips -Z 256|512`.
// Nhân vật tóc/áo trắng sát nền: chỉ coi trắng tinh là nền, kẻo phép loang ăn vào tóc.
const PALE_AGENTS = ['frostline', 'galeweaver', 'mirage', 'hollowfang'];
const agentsAt = process.argv.indexOf('--agents');
if (agentsAt > 0) {
  const outDir = join(process.cwd(), process.argv[agentsAt + 1]);
  mkdirSync(outDir, { recursive: true });
  for (const file of readdirSync(src).filter((f) => f.endsWith('.png'))) {
    const img = decodePng(readFileSync(join(src, file)));
    const scale = (img.w / 256) ** 2;
    const pale = PALE_AGENTS.some((id) => file.startsWith(id));
    backdropMin = pale ? 247 : 196;
    removeBackdrop(img);
    if (pale) removeFloorShadow(img);
    dropSpecks(img, 40 * scale);
    const t = trim(img);
    writeFileSync(join(outDir, file), encodePng(t.w, t.h, t.px));
    console.log(`${file}  ${t.w}×${t.h}`);
  }
  process.exit(0);
}
const hd = process.argv.includes('--hd');
const outDir = hd ? join(OUT, 'hd') : OUT;
// Ngưỡng tính theo điểm ảnh nên phải lớn theo cỡ ảnh.
const scale = hd ? 4 : 1;
mkdirSync(outDir, { recursive: true });
for (const [file, entry] of Object.entries(MAP)) {
  const { id, fillHoles = false } = typeof entry === 'string' ? { id: entry } : entry;
  const path = join(src, hd ? `${file}_512.png` : `${file}.png`);
  if (hd && !existsSync(path)) continue;
  const img = decodePng(readFileSync(path));
  removeBackdrop(img);
  if (fillHoles) removeEnclosedBackdrop(img, 120 * scale);
  dropSpecks(img, 40 * scale);
  const t = trim(img);
  writeFileSync(join(outDir, `${id}.png`), encodePng(t.w, t.h, t.px));
  const kept = t.px.reduce((n, v, i) => n + (i % 4 === 3 && v > 0 ? 1 : 0), 0);
  console.log(
    `${file} → ${id}.png  ${t.w}×${t.h}  giữ ${Math.round((kept / (t.w * t.h)) * 100)}% điểm ảnh`,
  );
}
