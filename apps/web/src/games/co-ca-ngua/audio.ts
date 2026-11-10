// Âm thanh của Cờ cá ngựa, tự tổng hợp bằng WebAudio (không có file âm thanh nào, nên không dính
// bản quyền và không phải tải gì): trống trận dồn khi đổ, xúc xắc xương lạch cạch khi chạm bàn,
// vó ngựa mỗi ô, tiếng va trầm và tiếng sắt khi đá ngựa, kèn trống khi thắng.
// Trình duyệt chỉ cho phát tiếng sau một lần chạm/bấm, nên nơi nhận thao tác đầu tiên gọi unlockAudio().

const MUTE_KEY = 'cocangua.muted';

let ctx: AudioContext | null = null;
let bus: GainNode | null = null;
let muted = false;

export function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setMuted(m: boolean) {
  muted = m;
  try {
    localStorage.setItem(MUTE_KEY, m ? '1' : '0');
  } catch {
    // Không lưu được thì chỉ áp dụng cho phiên này.
  }
  if (ctx && bus) bus.gain.setTargetAtTime(m ? 0 : 0.9, ctx.currentTime, 0.02);
}

export function unlockAudio() {
  if (typeof window === 'undefined') return;
  if (!ctx) {
    ctx = new AudioContext();
    muted = loadMuted();
    bus = ctx.createGain();
    bus.gain.value = muted ? 0 : 0.9;
    bus.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType,
  vol: number,
  opts: { to?: number; delay?: number } = {},
) {
  if (!ctx || !bus) return;
  const t = ctx.currentTime + (opts.delay ?? 0);
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(bus);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(dur: number, vol: number, freq: number, filter: BiquadFilterType, delay = 0) {
  if (!ctx || !bus) return;
  const t = ctx.currentTime + delay;
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = filter;
  f.frequency.setValueAtTime(freq, t);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(bus);
  src.start(t);
}

/** Một tiếng trống trận: thân trống trầm tụt cao độ, kèm tiếng dùi chạm mặt da. */
function drum(vol: number, delay = 0, pitch = 110) {
  tone(pitch, 0.42, 'sine', vol, { to: pitch * 0.38, delay });
  noise(0.06, vol * 0.5, 900, 'lowpass', delay);
}

export const sfx = {
  /** Trống dồn lúc thả xúc xắc. */
  roll: () => {
    [0, 0.13, 0.24, 0.33, 0.4].forEach((d, i) => drum(0.35 + i * 0.05, d, 95 + i * 6));
  },
  /** Xúc xắc xương chạm mặt đá, nảy lạch cạch. */
  land: () => {
    [0, 0.09, 0.15].forEach((d, i) => noise(0.04, 0.28 - i * 0.07, 2600, 'bandpass', d));
    tone(320, 0.08, 'triangle', 0.12, { to: 180 });
  },
  /** Một nhịp vó ngựa trên đá. */
  hoof: () => {
    noise(0.05, 0.22, 1800, 'bandpass');
    tone(240, 0.06, 'triangle', 0.14, { to: 120 });
  },
  /** Đá ngựa: tiếng va trầm, tiếng sắt chạm sắt, trống chốt. */
  kick: () => {
    noise(0.55, 0.6, 2800, 'lowpass');
    tone(130, 0.5, 'sine', 0.7, { to: 34 });
    tone(620, 0.3, 'square', 0.12, { to: 310 });
    tone(930, 0.22, 'square', 0.08, { to: 470, delay: 0.02 });
    drum(0.6, 0.18, 80);
  },
  /** Thắng: trống ba tiếng rồi kèn ngũ cung. */
  win: () => {
    [0, 0.22, 0.44].forEach((d) => drum(0.5, d, 90));
    [392, 523, 587, 784, 784].forEach((f, i) =>
      tone(f, i === 4 ? 0.7 : 0.22, 'sawtooth', 0.12, { delay: 0.6 + i * 0.2 }),
    );
  },
};
