"""Synthesise an original background loop + a few SFX (no samples, no copyrighted material)."""
import numpy as np
import wave

SR = 44100
rng = np.random.default_rng(7)


def write(path, stereo):
    stereo = np.clip(stereo, -1, 1)
    data = (stereo * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


def one_pole_lp(x, a):
    y = np.zeros_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += a[i] * (x[i] - acc) if hasattr(a, "__len__") else a * (x[i] - acc)
        y[i] = acc
    return y


# ---------------- Music ----------------
DUR = 85.5
BPM = 124
beat = 60 / BPM
bar = 4 * beat
N = int(DUR * SR)
L = np.zeros(N)
R = np.zeros(N)

chords = [
    (82.41, [164.81, 196.00, 246.94]),  # Em
    (65.41, [130.81, 164.81, 196.00]),  # C
    (98.00, [196.00, 246.94, 293.66]),  # G
    (73.42, [146.83, 185.00, 220.00]),  # D
]


def add(buf, start_s, sig):
    s = int(start_s * SR)
    if s >= N:
        return
    e = min(N, s + len(sig))
    buf[s:e] += sig[: e - s]


n_bars = int(DUR / bar) + 1
kick_env = np.zeros(N)

for b in range(n_bars):
    t0 = b * bar
    root, notes = chords[b % 4]
    # pad
    tt = np.arange(int(bar * SR)) / SR
    env = np.minimum(1, tt / 0.25) * np.exp(-tt * 0.35)
    pad = np.zeros_like(tt)
    for f in notes:
        for d in (-0.003, 0, 0.003):
            pad += np.sin(2 * np.pi * f * (1 + d) * tt) + 0.25 * np.sin(4 * np.pi * f * (1 + d) * tt)
    pad = pad / 12 * env * 0.22
    add(L, t0, pad * 0.9)
    add(R, t0, pad)

    drums_on = b >= 1  # quieter intro under the hook
    for k in range(4):
        tb = t0 + k * beat
        # bass on 1, 3 and the "and" of 2
        if k in (0, 2) or (k == 1):
            off = 0.5 * beat if k == 1 else 0
            bt = np.arange(int(0.45 * SR)) / SR
            bass = np.tanh(1.6 * np.sin(2 * np.pi * root * bt)) * np.exp(-bt * 5) * 0.28
            add(L, tb + off, bass)
            add(R, tb + off, bass)
        if drums_on:
            kt = np.arange(int(0.3 * SR)) / SR
            freq = 50 + 110 * np.exp(-kt * 30)
            phase = 2 * np.pi * np.cumsum(freq) / SR
            kick = np.sin(phase) * np.exp(-kt * 11) * 0.55
            add(L, tb, kick)
            add(R, tb, kick)
            add(kick_env, tb, np.exp(-kt * 9))
            if k in (1, 3):
                ct = np.arange(int(0.18 * SR)) / SR
                n = rng.standard_normal(len(ct))
                n = np.diff(n, prepend=0)
                clap = n * np.exp(-ct * 22) * 0.10
                add(L, tb, clap)
                add(R, tb, clap)
            # off-beat hats
            ht = np.arange(int(0.05 * SR)) / SR
            h = np.diff(np.diff(rng.standard_normal(len(ht) + 2)))
            hat = h * np.exp(-ht * 90) * 0.035
            add(L, tb + beat / 2, hat * 0.6)
            add(R, tb + beat / 2, hat)
        # pluck arp on 8ths
        for e in range(2):
            idx = (k * 2 + e) % 3
            f = notes[idx] * 2
            pt = np.arange(int(0.3 * SR)) / SR
            pl = (np.sin(2 * np.pi * f * pt) + 0.3 * np.sin(4 * np.pi * f * pt)) * np.exp(-pt * 14) * 0.07
            pan = 0.35 if e == 0 else -0.35
            add(L, tb + e * beat / 2, pl * (1 - pan))
            add(R, tb + e * beat / 2, pl * (1 + pan))

# gentle sidechain feel
duck = 1 - 0.35 * np.clip(kick_env, 0, 1)
L *= duck
R *= duck

# fades
t = np.arange(N) / SR
fade = np.minimum(1, t / 1.5) * np.minimum(1, (DUR - t) / 3.0)
L *= fade
R *= fade
peak = max(np.abs(L).max(), np.abs(R).max())
L, R = L / peak * 0.8, R / peak * 0.8
write("public/audio/music.wav", np.stack([L, R], axis=1))

# ---------------- SFX ----------------
# whoosh: noise through a sweeping low-pass
wt = np.arange(int(0.5 * SR)) / SR
noise = rng.standard_normal(len(wt))
cut = 0.02 + 0.25 * np.sin(np.pi * wt / wt[-1]) ** 2
wh = one_pole_lp(noise, cut)
wh *= np.sin(np.pi * wt / wt[-1]) ** 1.5
wh = wh / np.abs(wh).max() * 0.6
write("public/audio/whoosh.wav", np.stack([wh, wh], axis=1))

# pop
pt = np.arange(int(0.14 * SR)) / SR
f = 900 * np.exp(-pt * 12) + 300
pop = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-pt * 30) * 0.7
write("public/audio/pop.wav", np.stack([pop, pop], axis=1))

# ding
dt = np.arange(int(1.0 * SR)) / SR
ding = (np.sin(2 * np.pi * 1318.5 * dt) + 0.4 * np.sin(2 * np.pi * 2637 * dt)) * np.exp(-dt * 4) * 0.45
write("public/audio/ding.wav", np.stack([ding, ding], axis=1))

# stamp (low thud + noise)
st = np.arange(int(0.3 * SR)) / SR
thud = np.sin(2 * np.pi * (60 + 120 * np.exp(-st * 25)) * st) * np.exp(-st * 14) * 0.8
thud += rng.standard_normal(len(st)) * np.exp(-st * 40) * 0.15
write("public/audio/stamp.wav", np.stack([thud, thud], axis=1))

# tick (rep counter)
tt = np.arange(int(0.06 * SR)) / SR
tick = np.sin(2 * np.pi * 2200 * tt) * np.exp(-tt * 80) * 0.5
write("public/audio/tick.wav", np.stack([tick, tick], axis=1))

# buzz (wrong)
bt = np.arange(int(0.45 * SR)) / SR
buzz = np.sign(np.sin(2 * np.pi * 140 * bt)) * 0.25 * np.minimum(1, (0.45 - bt) / 0.05)
buzz += np.sign(np.sin(2 * np.pi * 147 * bt)) * 0.2 * np.minimum(1, (0.45 - bt) / 0.05)
buzz = one_pole_lp(buzz, 0.15)
write("public/audio/buzz.wav", np.stack([buzz, buzz], axis=1))

# clap (high five)
ct = np.arange(int(0.25 * SR)) / SR
cl = np.zeros_like(ct)
for d in (0, 0.008, 0.017):
    s0 = int(d * SR)
    n = rng.standard_normal(len(ct) - s0)
    cl[s0:] += np.diff(n, prepend=0) * np.exp(-ct[: len(ct) - s0] * 35)
cl = cl / np.abs(cl).max() * 0.8
write("public/audio/clap.wav", np.stack([cl, cl], axis=1))
print("ok")
