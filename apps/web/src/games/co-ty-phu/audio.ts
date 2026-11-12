// Âm thanh của Cờ tỷ phú, tự tổng hợp bằng WebAudio (không có file âm thanh, không dính bản quyền):
// xúc xắc ngà lăn trên mặt sơn mài, quân gõ nhẹ mỗi ô, tiền xu leng keng, con dấu son khi mua đất,
// tiếng chiêng khi qua Xuất phát, chiêng và đàn ngũ cung khi thắng.
// Trình duyệt chỉ cho phát tiếng sau một lần chạm/bấm, nên nơi nhận thao tác đầu tiên gọi unlockAudio().

const MUTE_KEY = 'cotyphu.muted';

let ctx: AudioContext | null = null;
let bus: GainNode | null = null;

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
  if (ctx && bus) bus.gain.setTargetAtTime(m ? 0 : 0.85, ctx.currentTime, 0.02);
}

export function unlockAudio() {
  if (typeof window === 'undefined') return;
  if (!ctx) {
    ctx = new AudioContext();
    bus = ctx.createGain();
    bus.gain.value = loadMuted() ? 0 : 0.85;
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

function noise(dur: number, vol: number, freq: number, type: BiquadFilterType, delay = 0) {
  if (!ctx || !bus) return;
  const t = ctx.currentTime + delay;
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(bus);
  src.start(t);
}

/** Tiếng chiêng: hai tần số lệch nhau ngân dài. */
function gong(vol: number, delay = 0) {
  tone(110, 2.2, 'sine', vol, delay, 104);
  tone(167, 1.8, 'sine', vol * 0.5, delay, 160);
  noise(0.05, vol * 0.4, 600, 'lowpass', delay);
}

export const sfx = {
  /** Xúc xắc ngà lộc cộc trên mặt sơn mài. */
  roll: () =>
    [0, 0.08, 0.17, 0.27, 0.4, 0.55].forEach((d, i) =>
      noise(0.04, 0.3 - i * 0.03, 2400, 'bandpass', d),
    ),
  /** Quân gõ nhẹ xuống một ô. */
  step: () => tone(520, 0.05, 'triangle', 0.12, 0, 380),
  /** Tiền xu leng keng (nhận hoặc trả). */
  coin: (gain: boolean) => {
    tone(gain ? 1568 : 988, 0.12, 'square', 0.06);
    tone(gain ? 2093 : 784, 0.18, 'square', 0.05, 0.07);
  },
  /** Đóng dấu son khi mua đất hay xây nhà. */
  stamp: () => {
    noise(0.08, 0.5, 300, 'lowpass');
    tone(90, 0.15, 'sine', 0.4, 0, 60);
  },
  /** Xây nhà: đóng dấu rồi chuỗi nốt ngũ cung dài dần theo cấp; khách sạn thêm tiếng chiêng. Bán nhà: tiếng trầm. */
  build: (level: number, up: boolean) => {
    if (!up) {
      noise(0.12, 0.35, 220, 'lowpass');
      tone(140, 0.25, 'sine', 0.3, 0, 70);
      return;
    }
    noise(0.08, 0.5, 300, 'lowpass');
    tone(90, 0.15, 'sine', 0.4, 0, 60);
    [523, 587, 659, 784, 880]
      .slice(0, level)
      .forEach((f, i) => tone(f, 0.22, 'triangle', 0.12, 0.18 + i * 0.09));
    if (level >= 5) gong(0.3, 0.6);
  },
  /** Lật thẻ. */
  card: () => noise(0.18, 0.18, 3000, 'highpass'),
  /** Qua Xuất phát. */
  go: () => gong(0.35),
  /** Thắng: chiêng rồi đàn ngũ cung. */
  win: () => {
    gong(0.5);
    [392, 440, 523, 587, 659, 784].forEach((f, i) =>
      tone(f, 0.4, 'triangle', 0.14, 0.5 + i * 0.16),
    );
  },
};
