// Âm thanh của Bắn Bi Bá Khí bằng WebAudio: tiếng bắn, dội tường, nổ bi lách tách cao dần theo
// combo, bi rơi leng keng, sét nổ lách tách, tiếng hết ván đều tự tổng hợp.
// Tiếng hào quang chạy nền là đoạn lặp 8 giây cắt từ bản thu "Super Saiyan base line" (Pixabay, cộng
// đồng Freesound; public/games/ban-bi/aura.m4a), to và sáng dần theo cấp; lên cấp thì nó dâng vọt
// lên kèm cú nổ trầm, gió hút, điện lách tách. Chưa tải được bản thu thì dùng tiếng hào quang tự tạo.
// Trình duyệt chỉ cho phát tiếng sau một lần chạm/bấm, nên nơi nhận thao tác đầu tiên gọi unlockAudio().

const MUTE_KEY = 'banbi.muted';

let ctx: AudioContext | null = null;
let bus: GainNode | null = null;
/** Đường tiếng có vang (tiếng gồng, sét): tiếng gốc cộng tiếng vọng như giữa đấu trường. */
let fx: GainNode | null = null;
let hum: {
  a: OscillatorNode;
  b: OscillatorNode;
  lfo: OscillatorNode;
  depth: GainNode;
  fire: AudioBufferSourceNode;
  fireFilter: BiquadFilterNode;
  fireGain: GainNode;
  filter: BiquadFilterNode;
  gain: GainNode;
} | null = null;

/** Đoạn lặp hào quang: file chứa hai vòng liền nhau, lặp ở vòng giữa để tránh phần đệm của bộ mã hoá. */
const AURA_URL = '/games/ban-bi/aura.m4a';
const AURA_LOOP: [number, number] = [4, 4 + 7.998667];
let auraBuf: AudioBuffer | null = null;
let auraLoading = false;
let aura: { src: AudioBufferSourceNode; filter: BiquadFilterNode; gain: GainNode } | null = null;
/** Cấp đang chạy tiếng nền (-1 là tắt), để đổi sang bản thu khi nó vừa tải xong. */
let humLevel = -1;

function loadAura() {
  if (!ctx || auraBuf || auraLoading) return;
  auraLoading = true;
  const c = ctx;
  fetch(AURA_URL)
    .then((r) => r.arrayBuffer())
    .then((b) => c.decodeAudioData(b))
    .then((buf) => {
      auraBuf = buf;
      if (humLevel >= 0) setHum(humLevel);
    })
    .catch(() => {
      // Tải lỗi: giữ tiếng tự tạo, lần mở khoá sau thử lại.
      auraLoading = false;
    });
}

/** Âm lượng, độ sáng, tốc độ của tiếng hào quang theo cấp. */
const auraGain = (level: number) => 0.16 + level * 0.08;
const auraTone = (level: number) => 700 + level * 1400;

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
    // Tiếng vọng tự tạo: nhiễu hai kênh tắt dần trong ~2,4 giây.
    const len = Math.floor(ctx.sampleRate * 2.4);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
    }
    const verb = ctx.createConvolver();
    verb.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.4;
    fx = ctx.createGain();
    fx.connect(bus);
    fx.connect(verb).connect(wet).connect(bus);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  loadAura();
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType,
  vol: number,
  delay = 0,
  to?: number,
  dest: AudioNode | null = bus,
) {
  if (!ctx || !dest) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(dest);
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
  dest: AudioNode | null = bus,
) {
  if (!ctx || !dest) return;
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
  src.connect(f).connect(g).connect(dest);
  src.start(t);
}

/** Bộ đệm nhiễu trắng dùng lại (tạo một lần). */
let noiseBuf: AudioBuffer | null = null;
function whiteNoise(c: AudioContext) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

/** Đường cong làm méo tiếng (bão hoà mềm kiểu tanh): tiếng dày và gắt hơn. */
let drive: Float32Array<ArrayBuffer> | null = null;
function driveCurve() {
  if (!drive) {
    const n = 1024;
    drive = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      drive[i] = Math.tanh(3.5 * x) / Math.tanh(3.5);
    }
  }
  return drive;
}

/** Một tia điện lách tách, đặt ngẫu nhiên bên trái hay bên phải tai. */
function crackle(delay: number) {
  if (!ctx || !fx) return;
  const pan = ctx.createStereoPanner();
  pan.pan.value = Math.random() * 1.6 - 0.8;
  pan.connect(fx);
  noise(
    0.03 + Math.random() * 0.06,
    0.28,
    2500 + Math.random() * 4500,
    'bandpass',
    delay,
    undefined,
    pan,
  );
}

/**
 * Hào quang gầm khi gồng: hai sóng răng cưa lệch nhau cộng lớp nhiễu lửa, cùng rung biên độ thật
 * nhanh (tiếng "vù vù" của khí), cao và sáng dần lên, giữ một nhịp rồi tắt.
 */
function auraRoar(level: number, delay: number, dur: number) {
  if (!ctx || !fx) return;
  const t = ctx.currentTime + delay;
  const end = t + dur;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(0.32 + level * 0.03, t + 0.18);
  env.gain.setValueAtTime(0.32 + level * 0.03, end - 0.6);
  env.gain.exponentialRampToValueAtTime(0.0001, end);
  // Rung biên độ: 1 ± độ sâu, nhịp nhanh dần.
  const trem = ctx.createGain();
  trem.gain.value = 1;
  const lfo = ctx.createOscillator();
  lfo.frequency.setValueAtTime(18 + level * 2, t);
  lfo.frequency.linearRampToValueAtTime(30 + level * 3, end);
  const depth = ctx.createGain();
  depth.gain.value = 0.55;
  lfo.connect(depth).connect(trem.gain);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 1.2;
  filter.frequency.setValueAtTime(400, t);
  filter.frequency.exponentialRampToValueAtTime(1800 + level * 300, t + dur * 0.6);
  const shaper = ctx.createWaveShaper();
  shaper.curve = driveCurve();
  shaper.oversample = '4x';
  filter.connect(shaper).connect(trem).connect(env).connect(fx);
  const base = 70 * 1.08 ** level;
  const oscs = [1, 1.012, 2.005].map((m, i) => {
    const o = ctx!.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(base * m, t);
    o.frequency.exponentialRampToValueAtTime(base * m * 1.6, t + dur * 0.7);
    const g = ctx!.createGain();
    g.gain.value = i === 2 ? 0.08 : 0.16;
    o.connect(g).connect(filter);
    return o;
  });
  const fire = ctx.createBufferSource();
  fire.buffer = whiteNoise(ctx);
  fire.loop = true;
  const fireBand = ctx.createBiquadFilter();
  fireBand.type = 'bandpass';
  fireBand.Q.value = 0.8;
  fireBand.frequency.setValueAtTime(300, t);
  fireBand.frequency.exponentialRampToValueAtTime(1400, t + dur * 0.7);
  const fireGain = ctx.createGain();
  fireGain.gain.value = 0.9;
  fire.connect(fireBand).connect(fireGain).connect(trem);
  for (const n of [...oscs, lfo, fire]) {
    n.start(t);
    n.stop(end + 0.05);
  }
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
  /**
   * Gồng lên cấp (khớp với màn chớp sáng và cảnh võ sĩ hét): nứt chát, nổ trầm và sóng chấn ngay lập
   * tức, rồi hào quang gầm rung vù vù (méo tiếng cho dày) chừng 2 giây, gió hút vút lên, điện nổ
   * lách tách chạy hai bên tai; có vang như giữa đấu trường; cấp càng cao càng dày.
   */
  levelUp: (level: number) => {
    // Cú nổ: tiếng nứt chát, nổ trầm, lớp siêu trầm, sóng chấn quét xuống; tất cả có vang.
    noise(0.12, 0.45, 3000, 'highpass', 0, undefined, fx);
    tone(85, 1.3, 'sine', 0.8, 0, 32, fx);
    tone(42, 1.0, 'sine', 0.5, 0, 28, fx);
    tone(170, 0.5, 'triangle', 0.3, 0, 60, fx);
    noise(0.9, 0.6, 220, 'lowpass', 0, 60, fx);
    noise(0.6, 0.35, 3200, 'bandpass', 0, 180, fx);
    // Hào quang dâng vọt lên (bản thu, hoặc tiếng tự tạo khi chưa có), gió hút vút lên, điện lách
    // tách hai bên tai.
    if (!surgeAura(level)) auraRoar(level, 0.04, 1.95);
    noise(1.5, 0.26, 400, 'bandpass', 0.15, 6000, fx);
    for (let i = 0; i < 6 + level * 3; i++) crackle(0.12 + Math.random() * 1.6);
  },
  /** Hạ khí về dạng đầu: gió hút xuống, tiếng trầm lắng dần. */
  powerDown: () => {
    noise(0.6, 0.28, 2400, 'bandpass', 0, 260, fx);
    tone(320, 0.7, 'triangle', 0.18, 0, 110, fx);
  },
  /** Tia sét nổ lách tách. */
  zap: () => {
    noise(0.07, 0.18, 4000, 'highpass', 0, undefined, fx);
    noise(0.05, 0.12, 2500, 'bandpass', 0.05, undefined, fx);
  },
  lose: () => {
    [392, 330, 262, 196].forEach((f, i) => tone(f, 0.4, 'sawtooth', 0.08, i * 0.16, f * 0.9));
  },
  countdown: (last: boolean) => tone(last ? 1046 : 523, last ? 0.4 : 0.15, 'square', 0.1),
};

/** Tiếng hào quang chạy nền suốt ván, cấp càng cao càng to và sáng. level < 0 là tắt. */
export function setHum(level: number) {
  humLevel = level;
  if (!ctx || !bus) return;
  if (auraBuf) {
    synthHum(-1);
    sampleHum(level);
  } else synthHum(level);
}

/** Tiếng hào quang từ bản thu, lặp liền mạch. */
function sampleHum(level: number) {
  if (!ctx || !bus || !auraBuf) return;
  const now = ctx.currentTime;
  if (level < 0) {
    if (aura) {
      aura.gain.gain.setTargetAtTime(0, now, 0.15);
      const a = aura;
      setTimeout(() => a.src.stop(), 800);
      aura = null;
    }
    return;
  }
  if (!aura) {
    const src = ctx.createBufferSource();
    src.buffer = auraBuf;
    src.loop = true;
    [src.loopStart, src.loopEnd] = AURA_LOOP;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = auraTone(level);
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(filter).connect(gain).connect(bus);
    src.start(now, AURA_LOOP[0]);
    aura = { src, filter, gain };
  }
  aura.gain.gain.setTargetAtTime(auraGain(level), now, 0.3);
  aura.filter.frequency.setTargetAtTime(auraTone(level), now, 0.3);
  aura.src.playbackRate.setTargetAtTime(0.94 + level * 0.03, now, 0.3);
}

/**
 * Gồng lên cấp bằng bản thu: tiếng hào quang dâng vọt lên, mở sáng hết cỡ chừng 1,3 giây rồi lắng về
 * mức của cấp mới. Chưa chạy tiếng nền thì phát riêng một đoạn. Trả về false nếu chưa có bản thu.
 */
function surgeAura(level: number) {
  if (!ctx || !bus || !auraBuf) return false;
  const now = ctx.currentTime;
  if (aura) {
    aura.gain.gain.setTargetAtTime(1, now, 0.04);
    aura.filter.frequency.setTargetAtTime(14000, now, 0.04);
    aura.gain.gain.setTargetAtTime(auraGain(level), now + 1.3, 0.35);
    aura.filter.frequency.setTargetAtTime(auraTone(level), now + 1.3, 0.35);
    return true;
  }
  const src = ctx.createBufferSource();
  src.buffer = auraBuf;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(1, now + 0.05);
  gain.gain.setValueAtTime(1, now + 1.3);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 2);
  src.connect(gain).connect(bus);
  src.start(now, AURA_LOOP[0]);
  src.stop(now + 2.05);
  return true;
}

/**
 * Tiếng hào quang tự tạo (khi chưa có bản thu): hai sóng răng cưa trầm cộng lớp nhiễu lửa, rung biên
 * độ "vù vù"; cấp càng cao càng gắt, to, rung nhanh và sâu. level < 0 là tắt.
 */
function synthHum(level: number) {
  if (!ctx || !bus) return;
  const now = ctx.currentTime;
  if (level < 0) {
    if (hum) {
      hum.gain.gain.setTargetAtTime(0, now, 0.15);
      const h = hum;
      setTimeout(() => {
        for (const n of [h.a, h.b, h.lfo, h.fire]) n.stop();
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
    // Rung biên độ: tín hiệu đi qua `trem` có độ lợi 1 ± độ sâu theo nhịp lfo.
    const trem = ctx.createGain();
    trem.gain.value = 1;
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.connect(depth).connect(trem.gain);
    const fire = ctx.createBufferSource();
    fire.buffer = whiteNoise(ctx);
    fire.loop = true;
    const fireFilter = ctx.createBiquadFilter();
    fireFilter.type = 'lowpass';
    const fireGain = ctx.createGain();
    const gain = ctx.createGain();
    gain.gain.value = 0;
    a.connect(filter);
    b.connect(filter);
    filter.connect(trem);
    fire.connect(fireFilter).connect(fireGain).connect(trem);
    trem.connect(gain).connect(bus);
    for (const n of [a, b, lfo, fire]) n.start();
    hum = { a, b, lfo, depth, fire, fireFilter, fireGain, filter, gain };
  }
  const f = 55 * 1.12 ** level;
  hum.a.frequency.setTargetAtTime(f, now, 0.3);
  hum.b.frequency.setTargetAtTime(f * 1.006 + 0.5, now, 0.3);
  hum.filter.frequency.setTargetAtTime(160 + level * 170, now, 0.3);
  hum.lfo.frequency.setTargetAtTime(9 + level * 3.5, now, 0.3);
  hum.depth.gain.setTargetAtTime(0.25 + level * 0.07, now, 0.3);
  hum.fireFilter.frequency.setTargetAtTime(250 + level * 160, now, 0.3);
  hum.fireGain.gain.setTargetAtTime(0.25 + level * 0.12, now, 0.3);
  hum.gain.gain.setTargetAtTime(0.025 + level * 0.012, now, 0.3);
}
