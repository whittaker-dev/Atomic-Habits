// Âm thanh của Bắn Bi Bá Khí, tự tổng hợp bằng WebAudio (không có file âm thanh): tiếng bắn, dội
// tường, nổ bi lách tách cao dần theo combo, bi rơi leng keng, trần sắt hạ, tiếng ù nạp khí trầm dần
// lên theo cấp, cú bùng nổ khi lên cấp, sét nổ lách tách, thắng và thua.
// Trình duyệt chỉ cho phát tiếng sau một lần chạm/bấm, nên nơi nhận thao tác đầu tiên gọi unlockAudio().

const MUTE_KEY = 'banbi.muted';

let ctx: AudioContext | null = null;
let bus: GainNode | null = null;
let hum: { a: OscillatorNode; b: OscillatorNode; filter: BiquadFilterNode; gain: GainNode } | null =
  null;

export function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setMuted(m: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, m ? '1' : '0');
  } catch {
    // Không lưu được thì chỉ áp dụng cho phiên này.
  }
  if (ctx && bus) bus.gain.setTargetAtTime(m ? 0 : 0.8, ctx.currentTime, 0.02);
}

export function unlockAudio() {
  if (typeof window === 'undefined') return;
  if (!ctx) {
    ctx = new AudioContext();
    bus = ctx.createGain();
    bus.gain.value = loadMuted() ? 0 : 0.8;
    bus.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType,
  vol: number,
  delay = 0,
  to?: number,
) {
  if (!ctx || !bus) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(bus);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(
  dur: number,
  vol: number,
  freq: number,
  type: BiquadFilterType,
  delay = 0,
  toFreq?: number,
) {
  if (!ctx || !bus) return;
  const t = ctx.currentTime + delay;
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (toFreq) f.frequency.exponentialRampToValueAtTime(toFreq, t + dur);
  f.Q.value = type === 'bandpass' ? 2.5 : 0.7;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.05, dur / 4));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(bus);
  src.start(t);
}

export const sfx = {
  shoot: () => {
    tone(520, 0.12, 'triangle', 0.18, 0, 1300);
    noise(0.1, 0.12, 2500, 'highpass');
  },
  bounce: () => tone(900, 0.04, 'square', 0.05),
  stick: () => tone(220, 0.08, 'sine', 0.18, 0, 140),
  /** Nổ bi: mỗi bi một tiếng "pốp", combo càng cao càng thanh. */
  pop: (count: number, combo: number) => {
    const base = 520 * 1.06 ** Math.min(combo, 10);
    for (let i = 0; i < Math.min(count, 10); i++)
      tone(base * (1 + Math.random() * 0.4), 0.09, 'sine', 0.16, i * 0.035, base * 0.5);
  },
  /** Bi rơi: leng keng thuỷ tinh đi xuống. */
  drop: (count: number) => {
    for (let i = 0; i < Math.min(count, 8); i++)
      tone(1500 - i * 110, 0.14, 'triangle', 0.07, 0.12 + i * 0.05);
  },
  /** Hàng bi mới chen vào, cả mảng dồn xuống: tiếng trượt nặng. */
  push: () => {
    noise(0.25, 0.35, 180, 'lowpass');
    tone(70, 0.3, 'sine', 0.35, 0, 45);
  },
  /** Bùng nổ lên cấp: hút gió dâng lên, nổ trầm, hợp âm sáng; cấp càng cao càng dày. */
  levelUp: (level: number) => {
    noise(0.9, 0.3, 300, 'bandpass', 0, 4000);
    tone(90, 0.9, 'sawtooth', 0.12, 0, 220 + level * 40);
    noise(0.6, 0.55, 140, 'lowpass', 0.85);
    tone(65, 0.8, 'sine', 0.6, 0.85, 32);
    const root = 220 * 2 ** (level / 12);
    [1, 1.25, 1.5, 2].forEach((m, i) => tone(root * m, 0.9, 'sawtooth', 0.05, 0.85 + i * 0.02));
    for (let i = 0; i < level; i++) noise(0.05, 0.2, 5000, 'highpass', 0.9 + i * 0.07);
  },
  /** Tia sét nổ lách tách. */
  zap: () => {
    noise(0.07, 0.18, 4000, 'highpass');
    noise(0.05, 0.12, 2500, 'bandpass', 0.05);
  },
  win: () => {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.35, 'triangle', 0.16, i * 0.11));
    noise(0.8, 0.2, 800, 'bandpass', 0.5, 6000);
  },
  lose: () => {
    [392, 330, 262, 196].forEach((f, i) => tone(f, 0.4, 'sawtooth', 0.08, i * 0.16, f * 0.9));
  },
  countdown: (last: boolean) => tone(last ? 1046 : 523, last ? 0.4 : 0.15, 'square', 0.1),
};

/** Tiếng ù nạp khí chạy nền suốt ván: cấp càng cao càng gắt và to. level < 0 là tắt. */
export function setHum(level: number) {
  if (!ctx || !bus) return;
  const now = ctx.currentTime;
  if (level < 0) {
    if (hum) {
      hum.gain.gain.setTargetAtTime(0, now, 0.15);
      const h = hum;
      setTimeout(() => {
        h.a.stop();
        h.b.stop();
      }, 800);
      hum = null;
    }
    return;
  }
  if (!hum) {
    const a = ctx.createOscillator();
    const b = ctx.createOscillator();
    a.type = b.type = 'sawtooth';
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const gain = ctx.createGain();
    gain.gain.value = 0;
    a.connect(filter);
    b.connect(filter);
    filter.connect(gain).connect(bus);
    a.start();
    b.start();
    hum = { a, b, filter, gain };
  }
  const f = 55 * 1.12 ** level;
  hum.a.frequency.setTargetAtTime(f, now, 0.3);
  hum.b.frequency.setTargetAtTime(f * 1.006 + 0.5, now, 0.3);
  hum.filter.frequency.setTargetAtTime(160 + level * 170, now, 0.3);
  hum.gain.gain.setTargetAtTime(0.025 + level * 0.012, now, 0.3);
}
