#!/usr/bin/env python3
"""
The sound for the "we hit the goal" video (scripts/video-goal-reached.mjs): sound effects timed to what happens on screen, and a short
original music bed under them. Everything is synthesised here from sine waves, filtered noise and arithmetic, so there is nothing to
license and nothing for Instagram or Facebook to match against a catalogue: a business account may not use popular music in its own videos,
and a soundtrack that is ours has no such problem.

The video's own timeline is read from video-goal-reached.mjs (the `const T = {...}` block), so if the pictures are re-timed the sounds follow:
  counting ticks and a riser up to the goal, the goal itself (impact, crash, bells, confetti pops), the whoosh between scenes, the "unlocked"
  chime, a ping as each check mark lands, the second burst when the total reaches $1,500, a warm swell for "Thank you", a soft pop for the
  button, and a last bell that rings out into the fade.
The music is 75 BPM, so one bar is 3.2 s and the goal lands exactly on a bar line: Am F G to build, then C G Am F C G, then C to finish.
A pad, a soft bass, a plucked arpeggio, a kick on the beat, a clap on two and four, a quiet hat. It starts under the count, drops at the goal,
keeps going under the matches, and settles for the thank-you.

Writes, into --out:
  goal-reached-video-sound.mp4    the video with the music and the effects
  goal-reached-video-effects.mp4  the video with the effects only (a clean base to add Instagram's own music over)
  and, with --keep, the two mixes as WAV plus a spectrogram of each and a short report.
The picture is copied, not re-encoded. Audio is AAC, 48 kHz stereo.

Run:  python3 scripts/audio-goal-reached.py --video assets/social/goal-reached-video.mp4 --out assets/social
      (needs numpy and scipy, and ffmpeg: set FFMPEG=/path/to/ffmpeg if it is not on PATH)
"""
import argparse, json, os, re, subprocess, sys, tempfile
import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
DUR = 15.0                       # the video's length
TAIL = 2.5                       # reverb and bells run past the end; it is cut and faded
N = int((DUR + TAIL) * SR)
RNG = np.random.default_rng(20261011)
BPM = 75.0
BEAT = 60.0 / BPM                # 0.8 s
MUSIC_RMS_DB = -21.0             # the music's average level while it plays in full, before the final loudness step
SFX_PEAK_DB = -3.0               # the goal's peak, before the final loudness step
HERE = os.path.dirname(os.path.abspath(__file__))


# ───────────────────────────── the picture's timeline ─────────────────────────────
def read_timeline(path):
    src = open(path, encoding='utf-8').read()
    m = re.search(r'const T = \{(.*?)\n\}', src, re.S)
    if not m:
        sys.exit('could not find the timeline (const T = {...}) in ' + path)
    body = re.sub(r'//[^\n]*', '', m.group(1))
    T = {k: json.loads(v) for k, v in re.findall(r'(\w+):\s*(\[[^\]]*\]|-?[\d.]+)', body)}
    for k in ('count', 'hit', 'aOut', 'bIn', 'rows', 'total', 'burst2', 'bFor', 'bOut', 'cIn', 'cSub', 'cPill', 'cBrand', 'burst3'):
        if k not in T:
            sys.exit('the video timeline has no "%s"; the sounds are tied to it' % k)
    return T


# ───────────────────────────── small tools ─────────────────────────────
NOTES = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
def hz(name):
    """'A4' -> 440.0"""
    midi = 12 * (int(name[-1]) + 1) + NOTES[name[0]] + (1 if '#' in name else 0)
    return 440.0 * 2 ** ((midi - 69) / 12)

def tt(n):
    return np.arange(n) / SR

def fade_edges(y, a=0.002, r=0.01):
    """No sound starts or ends on a step: a click is the cheapest way to make synthesis sound cheap."""
    n = len(y); t = np.arange(n) / SR
    env = np.minimum(1.0, t / a) * np.minimum(1.0, (n - 1 - np.arange(n)) / SR / r)
    return y * env

def smooth_ramp(x):
    x = np.clip(x, 0.0, 1.0)
    return 0.5 * (1 - np.cos(np.pi * x))

def lp(x, fc, order=2):
    return signal.sosfilt(signal.butter(order, fc, 'low', fs=SR, output='sos'), x, axis=0)

def hp(x, fc, order=2):
    return signal.sosfilt(signal.butter(order, fc, 'high', fs=SR, output='sos'), x, axis=0)

def bp(x, lo, hi, order=2):
    return signal.sosfilt(signal.butter(order, [lo, hi], 'band', fs=SR, output='sos'), x, axis=0)

def place(buf, sig, t0, gain=1.0, pan=0.0):
    """Mix a mono signal (or an n x 2 one) into the stereo buffer at t0 seconds, equal-power panned."""
    i = int(round(t0 * SR))
    if i >= buf.shape[0] or i + len(sig) <= 0:
        return
    s0 = max(0, -i); i = max(0, i)
    n = min(len(sig) - s0, buf.shape[0] - i)
    seg = sig[s0:s0 + n]
    if seg.ndim == 1:
        th = (pan + 1) * np.pi / 4
        buf[i:i + n, 0] += seg * gain * np.cos(th)
        buf[i:i + n, 1] += seg * gain * np.sin(th)
    else:
        buf[i:i + n] += seg * gain

def place_ramp(buf, sig, t0, pan0, pan1, gain=1.0):
    """The same, with the pan moving across the sound: a whoosh that travels."""
    i = int(round(t0 * SR)); n = min(len(sig), buf.shape[0] - i)
    p = np.linspace(pan0, pan1, n); th = (p + 1) * np.pi / 4
    buf[i:i + n, 0] += sig[:n] * gain * np.cos(th)
    buf[i:i + n, 1] += sig[:n] * gain * np.sin(th)


# ───────────────────────────── sounds ─────────────────────────────
def swept_noise(dur, f0, f1, q=1.2, block=0.02):
    """Noise through a band-pass whose centre glides from f0 to f1: the body of a whoosh or a riser."""
    n = int(dur * SR); x = RNG.standard_normal(n); out = np.zeros(n); blk = int(block * SR); zi = None
    for s in range(0, n, blk):
        fc = f0 * (f1 / f0) ** (s / n); bw = fc / q
        lo, hi = max(40.0, fc - bw / 2), min(SR / 2 - 200.0, fc + bw / 2)
        sos = signal.butter(2, [lo, hi], 'band', fs=SR, output='sos')
        if zi is None:
            zi = np.zeros((sos.shape[0], 2))
        seg, zi = signal.sosfilt(sos, x[s:s + blk], zi=zi)
        out[s:s + blk] = seg
    return out / (np.std(out) + 1e-9)

def whoosh(dur, f0, f1, peak=0.5):
    n = int(dur * SR); t = np.arange(n) / n
    env = np.sin(np.pi * np.clip(t, 0, 1) ** peak * 0.999) ** 2           # up, then away
    return fade_edges(swept_noise(dur, f0, f1) * env * 0.5, 0.01, 0.03)

def riser(dur):
    """Noise climbing and a tone climbing, getting louder: the held breath before the goal."""
    n = int(dur * SR); t = np.arange(n) / n
    noise = swept_noise(dur, 250.0, 9000.0, q=0.8) * t ** 2.2 * 0.55
    f = 140.0 * (950.0 / 140.0) ** t
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * t ** 2.6 * 0.35
    return fade_edges(noise + tone, 0.05, 0.004)

def impact(dur=1.2, depth=1.0):
    """A low thump that falls in pitch, with a puff of low noise on the front of it."""
    n = int(dur * SR); t = tt(n)
    f = 40.0 + 110.0 * np.exp(-t / 0.06)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.32)
    puff = lp(RNG.standard_normal(n), 420.0) * np.exp(-t / 0.05) * 1.2
    knock = np.sin(2 * np.pi * 190.0 * t) * np.exp(-t / 0.03) * 0.5      # so a phone, which cannot play the 40 Hz, still hits
    return fade_edges((boom + puff + knock) * depth, 0.001, 0.05)

def crash(dur=1.8, gain=1.0):
    n = int(dur * SR); t = tt(n)
    x = hp(RNG.standard_normal(n), 3500.0) * np.exp(-t / 0.55)
    return fade_edges(x * gain * 0.5, 0.001, 0.05)

def bell(freq, dur=2.5, decay=1.0, bright=1.0):
    """A struck bell: a handful of partials that are not whole multiples of the pitch, the higher ones dying first."""
    n = int(dur * SR); t = tt(n); y = np.zeros(n)
    for ratio, amp, d in ((1.0, 1.0, 1.0), (2.0, 0.55, 0.7), (2.76, 0.36, 0.5), (4.07, 0.2, 0.32), (5.4, 0.1, 0.22), (6.8, 0.05, 0.15)):
        f = freq * ratio
        if f > 11000:
            continue
        y += amp * (bright if ratio > 2 else 1.0) * np.sin(2 * np.pi * f * t + RNG.uniform(0, 6.283)) * np.exp(-t / (decay * d))
    return fade_edges(y / 1.9, 0.002, 0.08)

def pluck(freq, dur=0.55, tau=0.17):
    n = int(dur * SR); t = tt(n); y = np.zeros(n)
    for k in range(1, 9):
        f = freq * k
        if f > 9000:
            break
        y += (1.0 / k ** 1.1) * np.exp(-t / (tau / (1 + 0.55 * (k - 1)))) * np.sin(2 * np.pi * f * t)
    return fade_edges(y / 1.5, 0.003, 0.03)

def tick(freq):
    n = int(0.035 * SR); t = tt(n)
    return fade_edges(np.sin(2 * np.pi * freq * t) * np.exp(-t / 0.008), 0.0005, 0.004)

def pop(freq0=620.0, freq1=240.0, dur=0.16):
    n = int(dur * SR); t = tt(n)
    f = freq1 + (freq0 - freq1) * np.exp(-t / 0.02)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.035)
    air = lp(RNG.standard_normal(n), 2600.0) * np.exp(-t / 0.012) * 0.6
    return fade_edges(body + air, 0.0008, 0.02)

def cannon(gain=1.0):
    """The confetti cannon: a thump, a puff of air, and paper."""
    n = int(0.5 * SR); t = tt(n)
    thump = np.sin(2 * np.pi * np.cumsum(70.0 + 140.0 * np.exp(-t / 0.025)) / SR) * np.exp(-t / 0.07)
    air = bp(RNG.standard_normal(n), 700.0, 5200.0) * np.exp(-t / 0.05) * 0.9
    paper = hp(RNG.standard_normal(n), 4500.0) * np.exp(-t / 0.18) * 0.22
    return fade_edges((thump * 0.9 + air + paper) * gain, 0.001, 0.05)

def crackle(dur, density, seed):
    """Paper settling: tiny bright ticks at random moments, fewer as it goes."""
    r = np.random.default_rng(seed); n = int(dur * SR); y = np.zeros(n)
    t = 0.0
    while t < dur:
        rate = density * (1 - t / dur) ** 1.4 + 1.0
        t += r.exponential(1.0 / rate)
        i = int(t * SR); m = int(r.uniform(0.002, 0.008) * SR)
        if i + m >= n:
            break
        seg = hp(r.standard_normal(m), r.uniform(3500, 7000)) * np.hanning(m)
        y[i:i + m] += seg * r.uniform(0.2, 1.0)
    return y

def kick():
    n = int(0.5 * SR); t = tt(n)
    f = 46.0 + 110.0 * np.exp(-t / 0.032)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.15)
    click = hp(RNG.standard_normal(n), 1800.0) * np.exp(-t / 0.002) * 0.40
    return fade_edges(body * 0.8 + click, 0.0008, 0.04)

def clap():
    n = int(0.6 * SR); t = tt(n)
    x = bp(RNG.standard_normal(n), 900.0, 3800.0)
    env = sum(np.exp(-np.maximum(t - d, 0) / 0.009) * (t >= d) for d in (0.0, 0.011, 0.023)) + 0.5 * np.exp(-t / 0.11) * (t >= 0.023)
    return fade_edges(x * env * 0.5, 0.0005, 0.05)

def hat(open_=False):
    n = int((0.22 if open_ else 0.07) * SR); t = tt(n)
    return fade_edges(hp(RNG.standard_normal(n), 7000.0) * np.exp(-t / (0.07 if open_ else 0.011)), 0.0005, 0.01)

def pad(freqs, dur, attack=0.42, release=0.6):
    """A warm pad: each note three slightly detuned voices of a soft saw, the voices spread left and right, then rolled off."""
    n = int((dur + release) * SR); t = tt(n); L = np.zeros(n); R = np.zeros(n)
    for f in freqs:
        for cents, side in ((-8, 0), (0, 2), (8, 1)):
            ff = f * 2 ** (cents / 1200); y = np.zeros(n)
            for k in range(1, 7):
                if ff * k > 5000:
                    break
                y += np.sin(2 * np.pi * ff * k * t + RNG.uniform(0, 6.283)) / k ** 1.3
            wl, wr = (0.82, 0.18) if side == 0 else (0.18, 0.82) if side == 1 else (0.5, 0.5)
            L += y * wl; R += y * wr
    env = smooth_ramp(t / attack) * np.where(t < dur, 1.0, 0.5 * (1 + np.cos(np.pi * np.clip((t - dur) / release, 0, 1))))
    out = np.stack([lp(L, 2300.0) * env, lp(R, 2300.0) * env], axis=1)
    return out / (len(freqs) * 1.6)

def bass(freq, dur=1.5):
    n = int(dur * SR); t = tt(n)
    y = np.sin(2 * np.pi * freq * t) + 0.75 * np.sin(2 * np.pi * 2 * freq * t) + 0.38 * np.sin(2 * np.pi * 3 * freq * t) + 0.12 * np.sin(2 * np.pi * 4 * freq * t)
    return fade_edges(lp(y, 900.0) * np.exp(-t / 0.7), 0.008, 0.06) * 0.6


# ───────────────────────────── the room ─────────────────────────────
def make_ir(rt60=1.9, predelay=0.018, damp=5200.0, seed=7):
    r = np.random.default_rng(seed); n = int(rt60 * 1.15 * SR); t = tt(n)
    decay = np.exp(-6.9078 * t / rt60)
    ir = np.stack([lp(r.standard_normal(n) * decay, damp) for _ in range(2)], axis=1)
    ir = np.vstack([np.zeros((int(predelay * SR), 2)), ir])
    return ir / np.sqrt(np.sum(ir ** 2))

IR = make_ir()
def reverb(x):
    return np.stack([signal.fftconvolve(x[:, c], IR[:, c])[:len(x)] for c in range(2)], axis=1)


# ───────────────────────────── the score ─────────────────────────────
CHORDS = {
    'Am': dict(pad=['A2', 'E3', 'A3', 'C4', 'E4'], bass='A2', arp=['A4', 'C5', 'E5', 'A5', 'E5', 'C5']),
    'F':  dict(pad=['F2', 'C3', 'F3', 'A3', 'C4'], bass='F2', arp=['F4', 'A4', 'C5', 'F5', 'C5', 'A4']),
    'C':  dict(pad=['C3', 'G3', 'C4', 'E4', 'G4'], bass='C3', arp=['C5', 'E5', 'G5', 'C6', 'G5', 'E5']),
    'G':  dict(pad=['G2', 'D3', 'G3', 'B3', 'D4'], bass='G2', arp=['G4', 'B4', 'D5', 'G5', 'D5', 'B4']),
}
# bar lines at 0, 3.2, 6.4, 9.6, 12.8: the goal (3.2) is the first beat of the second bar
SCORE = [(0.0, 1.6, 'Am'), (1.6, 2.4, 'F'), (2.4, 3.2, 'G'), (3.2, 4.8, 'C'), (4.8, 6.4, 'G'), (6.4, 8.0, 'Am'),
         (8.0, 9.6, 'F'), (9.6, 11.2, 'C'), (11.2, 12.8, 'G'), (12.8, 16.0, 'C')]
ACCENT = [1.0, 0.55, 0.62, 0.85, 0.55, 0.62]

def stereo():
    return np.zeros((N, 2))

def music_bus(T):
    dry, send = stereo(), stereo()
    hit = T['hit']
    # pad: a swell under the count, full from the goal, a little back for the thank-you
    for (s, e, name) in SCORE:
        c = CHORDS[name]
        voicing = c['pad'] + (['D4'] if (name == 'C' and s >= 12.8) else [])
        p = pad([hz(x) for x in voicing[1:]], (e - s) + 0.3 + (0.28 if s > 0 else 0.0))
        lvl = 0.62 + 0.33 * min(1.0, s / hit) if s < hit else (0.95 if s < 9.6 else 0.85)
        pre = 0.28 if s > 0 else 0.0
        place(dry, p, s - pre, lvl * 0.85); place(send, p, s - pre, lvl * 0.55)
    # bass: the root on each chord, from the goal to the last chord
    for (s, e, name) in SCORE:
        if s >= hit and s < 12.8:
            place(dry, bass(hz(CHORDS[name]['bass']), 1.5), s, 0.50)
    # arpeggio: eighth notes an octave down while the count builds, sixteenths from the goal, sparse again for the finish
    for (s, e, name) in SCORE:
        pattern = CHORDS[name]['arp']
        if s < hit:
            step, octave, base = 0.4, 1.0, 0.55 + 0.35 * (s / hit)
        elif s < 12.8:
            step, octave, base = 0.2, 1.0, 0.95 if s < 9.6 else 0.78
        else:
            step, octave, base = 0.4, 1.0, 0.45
        i, t = 0, max(s, 0.4)
        while t < min(e, 15.2):
            f = hz(pattern[i % len(pattern)]) * octave
            v = base * ACCENT[i % len(ACCENT)] * (1.0 if s < 12.8 else max(0.0, 1 - (t - 12.8) / 2.2))
            if v > 0.02:
                pan = 0.38 if i % 2 else -0.38
                p = pluck(f)
                place(dry, p, t, 0.46 * v, pan); place(send, p, t, 0.34 * v, pan)
                place(dry, p, t + 0.4, 0.13 * v, -pan); place(dry, p, t + 0.8, 0.05 * v, pan)       # a ping-pong echo
            i += 1; t += step
    # drums from the goal to the end of the thank-you, lighter for the thank-you
    K, C, H, HO = kick(), clap(), hat(), hat(True)
    for bar in (3.2, 6.4, 9.6):
        light = 0.7 if bar >= 9.6 else 1.0
        for beat, k in ((0, 1.0), (2, 0.85), (2.5, 0.55)):
            if bar >= 9.6 and beat == 2.5:
                continue
            place(dry, K, bar + beat * BEAT, 0.42 * k * light)
        for beat in (1, 3):
            place(dry, C, bar + beat * BEAT, 0.34 * light, 0.05); place(send, C, bar + beat * BEAT, 0.20 * light, 0.05)
        for h in range(8):
            t = bar + h * BEAT / 2
            place(dry, H, t, (0.12 if h % 2 == 0 else 0.20) * light, 0.25 if h % 2 else -0.25)
        if bar == 3.2 or bar == 6.4:                                           # a roll into the next bar
            for j in range(4):
                place(dry, H, bar + 3.0 * BEAT + j * BEAT / 4, (0.12 + 0.07 * j) * light, 0.1)
        place(dry, HO, bar + 3.5 * BEAT, 0.16 * light, 0.3)
    place(dry, K, 12.8, 0.34)
    # the music gives way for an instant before each goal, the way a held breath does
    pts_t, pts_g = [0.0], [1.0]
    for t_hit, depth in ((hit, 0.06), (T['burst2'], 0.25)):
        for tp, gp in ((t_hit - 0.15, 1.0), (t_hit - 0.115, depth), (t_hit - 0.006, depth), (t_hit + 0.004, 0.85), (t_hit + 0.32, 1.0)):
            pts_t.append(tp); pts_g.append(gp)
    pts_t.append(DUR + TAIL); pts_g.append(1.0)
    duck = np.interp(np.arange(N) / SR, pts_t, pts_g)                               # dip, then a little room for the impact
    return dry * duck[:, None], send * duck[:, None]

def sfx_bus(T):
    dry, send = stereo(), stereo()
    hit, b2, b3 = T['hit'], T['burst2'], T['burst3']
    c0, cd = T['count']
    # the count: a tick each time the number passes a multiple of ten, rising in pitch, slowing as the number does
    for k in range(1, 50):
        p = 1 - (1 - k / 50) ** (1 / 3); t = c0 + cd * p
        place(dry, tick(560.0 * 2 ** (1.6 * k / 50)), t, 0.08, ((k * 37) % 11 - 5) / 18)
    place(dry, riser(hit - 0.11 - 1.15), 1.15, 0.22); place(send, riser(hit - 0.11 - 1.15), 1.15, 0.06)
    rc = crash(1.6, 1.0)[::-1]
    place(dry, rc, hit - 1.6 - 0.04, 0.10)                                                       # a reversed crash climbing into the goal
    # THE GOAL
    def big(t, scale, notes, spark):
        place(dry, impact(1.3, 1.0), t, 0.95 * scale); place(dry, crash(2.0), t, 0.55 * scale)
        place(dry, cannon(), t + 0.02, 0.5 * scale, -0.7); place(dry, cannon(), t + 0.06, 0.5 * scale, 0.7)
        for f in notes:
            b = bell(hz(f), 3.0, 1.1); place(dry, b, t, 0.22 * scale); place(send, b, t, 0.22 * scale)
        for j, f in enumerate(spark):
            b = bell(hz(f), 1.6, 0.8, 1.3); pan = (-1) ** j * min(0.8, 0.2 + 0.1 * j)
            place(dry, b, t + 0.03 + 0.05 * j, 0.14 * scale * (1 - 0.06 * j), pan); place(send, b, t + 0.03 + 0.05 * j, 0.16 * scale, pan)
        place(dry, crackle(1.1, 70, int(t * 100)), t + 0.08, 0.5 * scale, -0.2); place(dry, crackle(1.1, 70, int(t * 100) + 1), t + 0.08, 0.5 * scale, 0.2)
    big(hit, 1.0, ['C5', 'E5', 'G5', 'C6'], ['C6', 'E6', 'G6', 'C7', 'E7', 'G7'])
    # between scenes
    a_out = T['aOut'][0]
    place_ramp(dry, whoosh(0.55, 400.0, 3200.0), a_out - 0.02, -0.6, 0.6, 0.8)
    # the matches
    place_ramp(dry, whoosh(0.4, 700.0, 2800.0), T['bIn'] - 0.05, 0.5, -0.5, 0.55)
    place(dry, hp(RNG.standard_normal(int(0.03 * SR)), 5000) * np.hanning(int(0.03 * SR)), T['bIn'] + 0.2, 0.5)      # the unlock: a latch,
    for f, dt in (('E6', 0.26), ('G6', 0.36)):
        b = bell(hz(f), 1.8, 0.8); place(dry, b, T['bIn'] + dt, 0.20); place(send, b, T['bIn'] + dt, 0.20)           # then two notes up
    pings = ['G5', 'B5', 'E6']
    for i, r in enumerate(T['rows']):
        place_ramp(dry, whoosh(0.35, 500.0, 2200.0, peak=0.7), r - 0.02, -0.7 if i != 1 else 0.7, 0.0, 0.5)
        place(dry, pop(520.0, 220.0, 0.14), r + 0.30, 0.32, 0.0)
        b = bell(hz(pings[i]), 1.4, 0.7); place(dry, b, r + 0.42, 0.24); place(send, b, r + 0.42, 0.22)
    # the total counts up to $1,500 and then goes off
    t0 = T['total']
    for k in range(1, 30):
        p = 1 - (1 - k / 30) ** (1 / 3); t = t0 + 0.05 + 0.75 * p
        if t < b2 - 0.11:
            place(dry, tick(640.0 * 2 ** (1.4 * k / 30)), t, 0.08, ((k * 29) % 9 - 4) / 14)
    pr = riser(0.66); place(dry, pr, b2 - 0.11 - 0.66, 0.18)
    big(b2, 1.15, ['A4', 'E5', 'A5', 'C6'], ['A5', 'C6', 'E6', 'A6', 'C7', 'E7'])
    # "every gift goes directly to the family": a soft lift, no more
    place_ramp(dry, whoosh(0.5, 300.0, 1400.0), T['bFor'] - 0.05, -0.2, 0.2, 0.28)
    place_ramp(dry, whoosh(0.5, 500.0, 3000.0), T['bOut'][0] - 0.02, 0.5, -0.5, 0.75)
    # thank you
    place(dry, impact(1.0, 0.55), T['cIn'], 0.55); place(dry, crash(1.6), T['cIn'], 0.22)
    for j, f in enumerate(['C5', 'E5', 'G5', 'C6', 'E6']):
        b = bell(hz(f), 3.4, 1.4); pan = (-1) ** j * 0.15 * j
        place(dry, b, T['cIn'] + 0.02 + 0.07 * j, 0.19, pan); place(send, b, T['cIn'] + 0.02 + 0.07 * j, 0.24, pan)
    place(dry, cannon(0.6), b3, 0.3, -0.5); place(dry, cannon(0.6), b3 + 0.04, 0.3, 0.5)
    r = np.random.default_rng(99)
    scale_notes = ['C6', 'D6', 'E6', 'G6', 'A6', 'C7', 'D7', 'E7']
    t = b3 + 0.25
    while t < b3 + 1.9:
        b = bell(hz(scale_notes[int(r.integers(0, len(scale_notes)))]), 1.4, 0.55, 1.2)
        place(dry, b, t, 0.065 * (1 - (t - b3) / 2.4), r.uniform(-0.8, 0.8)); place(send, b, t, 0.09, r.uniform(-0.8, 0.8))
        t += r.exponential(0.11)
    place(dry, crackle(1.6, 45, 4), b3 + 0.2, 0.35, -0.3)
    place(dry, pop(700.0, 280.0, 0.16), T['cPill'], 0.36)
    b = bell(hz('G6'), 1.6, 0.7); place(dry, b, T['cPill'] + 0.06, 0.16); place(send, b, T['cPill'] + 0.06, 0.18)
    b = bell(hz('C7'), 1.4, 0.6); place(dry, b, T['cBrand'] + 0.05, 0.11); place(send, b, T['cBrand'] + 0.05, 0.13)
    for j, f in enumerate(['G6', 'C7']):                                                      # the last bell, which rings into the fade
        b = bell(hz(f), 3.2, 1.5); place(dry, b, 12.82 + 0.05 * j, 0.20, -0.2 + 0.4 * j); place(send, b, 12.82 + 0.05 * j, 0.26, -0.2 + 0.4 * j)
    return dry, send


# ───────────────────────────── the mix ─────────────────────────────
def _sos(b, a):
    return signal.tf2sos(np.array(b) / a[0], np.array(a) / a[0])

def eq_peak(f0, gain_db, q):
    A = 10 ** (gain_db / 40); w = 2 * np.pi * f0 / SR; al = np.sin(w) / (2 * q); c = np.cos(w)
    return _sos([1 + al * A, -2 * c, 1 - al * A], [1 + al / A, -2 * c, 1 - al / A])

def eq_shelf(f0, gain_db, high, S=1.0):
    A = 10 ** (gain_db / 40); w = 2 * np.pi * f0 / SR; c = np.cos(w); sq = 2 * np.sqrt(A) * (np.sin(w) / 2 * np.sqrt((A + 1 / A) * (1 / S - 1) + 2))
    if high:
        return _sos([A * ((A + 1) + (A - 1) * c + sq), -2 * A * ((A - 1) + (A + 1) * c), A * ((A + 1) + (A - 1) * c - sq)],
                    [(A + 1) - (A - 1) * c + sq, 2 * ((A - 1) - (A + 1) * c), (A + 1) - (A - 1) * c - sq])
    return _sos([A * ((A + 1) - (A - 1) * c + sq), 2 * A * ((A - 1) - (A + 1) * c), A * ((A + 1) - (A - 1) * c - sq)],
                [(A + 1) + (A - 1) * c + sq, -2 * ((A - 1) + (A + 1) * c), (A + 1) + (A - 1) * c - sq])

def master(x, fade_from=14.0):
    # Most people will hear this on a phone, which plays almost nothing below 150 Hz: take weight off the bottom, add some presence and air.
    x = hp(x, 45.0, 2)
    for sos in (eq_shelf(170.0, -3.5, False), eq_peak(3000.0, 3.0, 0.8), eq_shelf(9000.0, 2.0, True)):
        x = signal.sosfilt(sos, x, axis=0)
    t = np.arange(len(x)) / SR
    fade = 0.5 * (1 + np.cos(np.pi * np.clip((t - fade_from) / (DUR - fade_from), 0, 1))) * np.minimum(1.0, t / 0.02)
    return x * fade[:, None]

def soft_limit(x, th=0.80):
    a = np.abs(x)
    over = a > th
    y = x.copy()
    y[over] = np.sign(x[over]) * (th + (1 - th) * np.tanh((a[over] - th) / (1 - th)))
    return y

def compress(x, threshold_db=-15.0, ratio=3.0, attack=0.012, release=0.16, lookahead=0.003):
    """Feed-forward peak compressor. Returns the processed signal and the most it turned anything down, in dB."""
    rate = 2000                                                   # the control signal runs at 2 kHz
    blk = SR // rate; n = x.shape[0]; m = n // blk
    c = np.max(np.abs(x[:m * blk]).reshape(m, blk, 2), axis=(1, 2))
    ca, cr = np.exp(-1.0 / (attack * rate)), np.exp(-1.0 / (release * rate))
    env = np.zeros(m); e = 0.0
    for i in range(m):
        coef = ca if c[i] > e else cr
        e = coef * e + (1 - coef) * c[i]
        env[i] = e
    over = np.maximum(20 * np.log10(env + 1e-9) - threshold_db, 0.0)
    gr = -over * (1 - 1 / ratio)
    gain = np.interp(np.arange(n) / SR + lookahead, (np.arange(m) + 0.5) / rate, 10 ** (gr / 20))
    return x * gain[:, None], float(-gr.min())

def true_peak_db(x):
    up = signal.resample_poly(x, 4, 1, axis=0)
    return 20 * np.log10(np.max(np.abs(up)) + 1e-12)

def ffmpeg_bin():
    return os.environ.get('FFMPEG', 'ffmpeg')

def measure(wav):
    r = subprocess.run([ffmpeg_bin(), '-nostats', '-hide_banner', '-i', wav, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True)
    tail = r.stderr[r.stderr.rfind('Summary:'):]
    lufs = float(re.search(r'I:\s+(-?[\d.]+) LUFS', tail).group(1))
    peak = float(re.search(r'Peak:\s+(-?[\d.]+) dBFS', tail).group(1))
    return lufs, peak

def write_wav(path, x):
    wavfile.write(path, SR, x[:int(DUR * SR)].astype(np.float32))

COMPRESSION = {}

def finish(stereo_sig, target_lufs, ceiling_db, tmp, name):
    """Scale to the loudness target, ease anything over the ceiling, and check what a streaming service would measure."""
    x = master(stereo_sig)[:int(DUR * SR)]
    x, reduced = compress(x)
    COMPRESSION[name] = reduced
    g = 1.0
    for _ in range(4):
        y = soft_limit(x * g)
        p = os.path.join(tmp, name + '-probe.wav'); wavfile.write(p, SR, y.astype(np.float32))
        lufs, _ = measure(p)
        if abs(lufs - target_lufs) < 0.3:
            break
        g *= 10 ** ((target_lufs - lufs) / 20)
    ceiling = 10 ** (ceiling_db / 20)
    tp = true_peak_db(y)
    if tp > ceiling_db:
        y = y * 10 ** ((ceiling_db - tp) / 20)
    return y


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--video', default=os.path.join(HERE, '..', 'assets', 'social', 'goal-reached-video.mp4'))
    ap.add_argument('--out', default=os.path.join(HERE, '..', 'assets', 'social'))
    ap.add_argument('--timeline', default=os.path.join(HERE, 'video-goal-reached.mjs'))
    ap.add_argument('--keep', action='store_true', help='also write the WAVs, spectrograms and a report next to the videos')
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    T = read_timeline(a.timeline)
    m_dry, m_send = music_bus(T)
    s_dry, s_send = sfx_bus(T)
    music = m_dry + 0.42 * reverb(m_send)
    sfx = s_dry + 0.35 * reverb(s_send)
    tmp = tempfile.mkdtemp(prefix='goal-audio-')
    # The music is the room and the effects are what happens in it: the music is set to a fixed average level over the part where it plays
    # in full, and the loudest effect (the goal) is set to a fixed peak, so the balance does not depend on how the pieces were written.
    w0, w1 = int(3.4 * SR), int(12.7 * SR)
    music *= 10 ** (MUSIC_RMS_DB / 20) / (np.sqrt(np.mean(music[w0:w1] ** 2)) + 1e-12)
    sfx *= 10 ** (SFX_PEAK_DB / 20) / (np.max(np.abs(sfx)) + 1e-12)
    mixes = {
        'sound': finish(music + sfx, -14.0, -1.6, tmp, 'sound'),
        'effects': finish(sfx, -17.0, -1.6, tmp, 'effects'),
    }
    report = []
    def rms_db(x):
        return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
    report.append('music bus %.1f dBFS rms / peak %.2f ; effects bus %.1f dBFS rms / peak %.2f (before the mix)' % (
        rms_db(music[:int(DUR * SR)]), np.max(np.abs(music)), rms_db(sfx[:int(DUR * SR)]), np.max(np.abs(sfx))))
    for key, y in mixes.items():
        wav = os.path.join(tmp, key + '.wav'); write_wav(wav, y)
        lufs, peak = measure(wav)
        report.append('%-8s %.1f LUFS integrated, sample peak %.1f dBFS, true peak %.1f dBTP; the compressor turned the loudest moment down %.1f dB' % (key, lufs, peak, true_peak_db(y), COMPRESSION[key]))
        # the loudest 50 ms windows, and where they are: they should be the goal, the total and the thank-you
        win = int(0.05 * SR); env = np.sqrt(np.convolve(np.mean(y ** 2, axis=1), np.ones(win) / win, mode='same'))
        order = np.argsort(env)[::-1]; picked = []
        for i in order:
            if all(abs(i - j) > SR * 0.4 for j in picked):
                picked.append(i)
            if len(picked) == 8:
                break
        report.append('         loudest moments at ' + ', '.join('%.2fs (%.1f dB)' % (i / SR, 20 * np.log10(env[i] + 1e-12)) for i in sorted(picked)))
        mp4 = os.path.join(a.out, 'goal-reached-video-%s.mp4' % key)
        r = subprocess.run([ffmpeg_bin(), '-y', '-hide_banner', '-loglevel', 'error', '-i', a.video, '-i', wav, '-map', '0:v:0', '-map', '1:a:0',
                            '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', '-t', str(DUR), '-movflags', '+faststart', mp4])
        if r.returncode != 0:
            sys.exit('ffmpeg could not join the sound to the picture')
        print('wrote ' + mp4)
        if a.keep:
            os.replace(wav, os.path.join(a.out, 'goal-reached-audio-%s.wav' % key))
            subprocess.run([ffmpeg_bin(), '-y', '-hide_banner', '-loglevel', 'error', '-i', os.path.join(a.out, 'goal-reached-audio-%s.wav' % key),
                            '-lavfi', 'showspectrumpic=s=1800x700:legend=1:scale=log:stop=16000', '-frames:v', '1',
                            os.path.join(a.out, 'goal-reached-audio-%s-spectrogram.png' % key)])
    print('\n'.join(report))


if __name__ == '__main__':
    main()
