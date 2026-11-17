// Âm thanh hiệu ứng của hai game du lịch, tự tổng hợp bằng WebAudio (không có file âm thanh): đáp
// đúng, đáp sai, gõ mảnh chữ, đóng dấu khi qua chặng, tiếng lên đường. Tắt tiếng thì tắt cả hiệu ứng
// lẫn giọng đọc tự động; nút loa vẫn đọc khi bấm (người chơi chủ động muốn nghe).
// Trình duyệt chỉ cho phát tiếng sau một lần chạm/bấm, nên nơi nhận thao tác đầu tiên gọi unlockAudio().

const MUTE_KEY = 'dulich.muted';

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
  if (ctx && bus) bus.gain.setTargetAtTime(m ? 0 : 0.7, ctx.currentTime, 0.02);
}

export function unlockAudio() {
  if (typeof window === 'undefined') return;
  if (!ctx) {
    ctx = new AudioContext();
    bus = ctx.createGain();
    bus.gain.value = loadMuted() ? 0 : 0.7;
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
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(bus);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(dur: number, vol: number, from: number, to: number, delay = 0) {
  if (!ctx || !bus) return;
  const t = ctx.currentTime + delay;
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 0.8;
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.4);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(bus);
  src.start(t);
}

export const sfx = {
  /** Hai nốt đi lên, trong như chuông quầy lễ tân. */
  right() {
    tone(784, 0.18, 'sine', 0.22);
    tone(1175, 0.32, 'sine', 0.2, 0.09);
  },
  /** Một nốt trầm đi xuống, nhẹ để không làm nản. */
  wrong() {
    tone(220, 0.28, 'triangle', 0.22, 0, 160);
  },
  /** Gõ một mảnh chữ. */
  tap() {
    tone(1400, 0.05, 'square', 0.04);
  },
  /** Con dấu nện xuống giấy: tiếng thịch trầm và tiếng giấy. */
  stamp() {
    tone(120, 0.22, 'sine', 0.5, 0, 60);
    noise(0.12, 0.25, 2400, 900);
  },
  /** Lên đường: tiếng gió lướt dâng lên. */
  depart() {
    noise(1.1, 0.18, 300, 2600);
  },
  /** Qua chặng: ba nốt đi lên rồi một hợp âm. */
  clear() {
    [523, 659, 784].forEach((f, i) => tone(f, 0.2, 'triangle', 0.16, i * 0.11));
    [523, 659, 784, 1047].forEach((f) => tone(f, 0.7, 'sine', 0.08, 0.36));
  },
  /** Trượt chặng: hai nốt đi xuống. */
  fail() {
    tone(392, 0.25, 'triangle', 0.18);
    tone(294, 0.45, 'triangle', 0.18, 0.2);
  },
};
