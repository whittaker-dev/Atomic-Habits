// Âm thanh tự tổng hợp bằng WebAudio: không có file âm thanh nào, nên không dính bản quyền
// và không phải tải gì. Trình duyệt chỉ cho phát tiếng sau một lần chạm/bấm phím,
// nên mọi nơi nhận thao tác đầu tiên gọi unlockAudio().

export type Volume = { music: number; sfx: number };
const KEY = 'bongbongbum.volume';
export const DEFAULT_VOLUME: Volume = { music: 0.5, sfx: 0.8 };

let ctx: AudioContext | null = null;
let sfxBus: GainNode | null = null;
let musicBus: GainNode | null = null;
let volume: Volume = DEFAULT_VOLUME;

export function loadVolume(): Volume {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Volume> | null;
    const clamp = (n: unknown, d: number) => (typeof n === 'number' && n >= 0 && n <= 1 ? n : d);
    return { music: clamp(v?.music, DEFAULT_VOLUME.music), sfx: clamp(v?.sfx, DEFAULT_VOLUME.sfx) };
  } catch {
    return DEFAULT_VOLUME;
  }
}

export function setVolume(v: Volume) {
  volume = v;
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    // Không lưu được thì chỉ áp dụng cho phiên này.
  }
  if (ctx && sfxBus && musicBus) {
    sfxBus.gain.setTargetAtTime(v.sfx, ctx.currentTime, 0.02);
    musicBus.gain.setTargetAtTime(v.music * 0.35, ctx.currentTime, 0.02);
  }
}

export function unlockAudio() {
  if (typeof window === 'undefined') return;
  if (!ctx) {
    ctx = new AudioContext();
    volume = loadVolume();
    sfxBus = ctx.createGain();
    sfxBus.gain.value = volume.sfx;
    sfxBus.connect(ctx.destination);
    musicBus = ctx.createGain();
    musicBus.gain.value = volume.music * 0.35;
    musicBus.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType,
  vol: number,
  opts: { to?: number; delay?: number; bus?: GainNode | null } = {},
) {
  const bus = opts.bus === undefined ? sfxBus : opts.bus;
  if (!ctx || !bus) return;
  const t = ctx.currentTime + (opts.delay ?? 0);
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(bus);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(dur: number, vol: number, cutoff: number, delay = 0) {
  if (!ctx || !sfxBus) return;
  const t = ctx.currentTime + delay;
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(cutoff, t);
  filter.frequency.exponentialRampToValueAtTime(120, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(g).connect(sfxBus);
  src.start(t);
}

export const sfx = {
  place: () => tone(520, 0.09, 'square', 0.18, { to: 260 }),
  boom: () => {
    noise(0.45, 0.5, 2400);
    tone(140, 0.35, 'sine', 0.5, { to: 45 });
  },
  trap: () => {
    tone(300, 0.35, 'triangle', 0.3, { to: 900 });
    tone(450, 0.25, 'sine', 0.15, { to: 1200, delay: 0.05 });
  },
  free: () =>
    [660, 880, 1320].forEach((f, i) => tone(f, 0.12, 'square', 0.14, { delay: i * 0.06 })),
  out: () => tone(700, 0.4, 'square', 0.2, { to: 110 }),
  pickup: () =>
    [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.08, 'square', 0.12, { delay: i * 0.04 })),
  sudden: () =>
    [0, 0.3, 0.6].forEach((d) => tone(880, 0.18, 'sawtooth', 0.18, { to: 440, delay: d })),
  win: () =>
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) =>
      tone(f, i === 5 ? 0.5 : 0.14, 'square', 0.18, { delay: i * 0.13 }),
    ),
  lose: () =>
    [392, 330, 262, 196].forEach((f, i) => tone(f, 0.25, 'triangle', 0.22, { delay: i * 0.2 })),
};

// ---------------------------------------------------------------------------
// Nhạc nền: vòng lặp chiptune 2 ô nhịp tự viết (bass vuông + giai điệu tam giác),
// lên lịch trước 0,15 giây để không bị giật khi luồng chính bận.
// ---------------------------------------------------------------------------

const BPM = 136;
const STEP = 60 / BPM / 2; // nốt móc đơn
const midi = (n: number) => 440 * 2 ** ((n - 69) / 12);
// Giai điệu ngũ cung Đô trưởng, 32 nốt; 0 là nghỉ.
const LEAD = [
  72, 0, 76, 79, 81, 79, 76, 0, 74, 0, 76, 74, 72, 0, 69, 0, 72, 0, 76, 79, 84, 81, 79, 0, 81, 79,
  76, 74, 76, 0, 72, 0,
];
const BASS = [48, 48, 55, 48, 45, 45, 52, 45, 43, 43, 50, 43, 48, 48, 55, 55];

let musicTimer: ReturnType<typeof setInterval> | null = null;

export function startMusic() {
  if (!ctx || musicTimer) return;
  let step = 0;
  let next = ctx.currentTime + 0.05;
  musicTimer = setInterval(() => {
    if (!ctx) return;
    while (next < ctx.currentTime + 0.15) {
      const delay = next - ctx.currentTime;
      const lead = LEAD[step % LEAD.length]!;
      if (lead) tone(midi(lead), STEP * 0.9, 'triangle', 0.25, { delay, bus: musicBus });
      if (step % 2 === 0)
        tone(midi(BASS[(step / 2) % BASS.length]!), STEP * 1.6, 'square', 0.12, {
          delay,
          bus: musicBus,
        });
      next += STEP;
      step++;
    }
  }, 30);
}

export function stopMusic() {
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = null;
}
