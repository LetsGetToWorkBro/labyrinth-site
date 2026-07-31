#!/usr/bin/env python3
"""Render the timer's cues to WAV, using the same recipe as Cues.swift.

Lets you audition a change to the bell or the clapper without a Mac in the
room. The partials, the filter and the noise seed all match the Swift, so what
comes out of here is what comes out of the Apple TV.

    python3 tvos/tools/render_cues.py [output-directory]
"""
import math
import os
import struct
import sys
import wave

RATE = 44_100


# ---------------------------------------------------------------- primitives
class Noise:
    """Seeded exactly as in Cues.swift, so the clap is bit-for-bit the same."""

    MASK = (1 << 64) - 1

    def __init__(self, seed):
        self.state = seed

    def next(self):
        self.state = (self.state * 6_364_136_223_846_793_005 + 1_442_695_040_888_963_407) & self.MASK
        return (self.state >> 40) / float(1 << 23) - 1.0


class Bandpass:
    """Two-pole bandpass, RBJ cookbook. Turns flat noise into a pitched crack."""

    def __init__(self, centre, q, rate=RATE):
        w = 2 * math.pi * min(centre, rate * 0.45) / rate
        alpha = math.sin(w) / (2 * max(q, 0.1))
        a0 = 1 + alpha
        self.b0 = alpha / a0
        self.b2 = -alpha / a0
        self.a1 = -2 * math.cos(w) / a0
        self.a2 = (1 - alpha) / a0
        self.x1 = self.x2 = self.y1 = self.y2 = 0.0

    def process(self, x):
        y = self.b0 * x + self.b2 * self.x2 - self.a1 * self.y1 - self.a2 * self.y2
        self.x2, self.x1 = self.x1, x
        self.y2, self.y1 = self.y1, y
        return y


def render(partials, bursts, length):
    """partials: (freq, gain, decay, start). bursts: dict of burst params."""
    frames = int(length * RATE)
    mix = [0.0] * frames
    attack = max(1.0, 0.003 * RATE)

    for freq, gain, decay, start in partials:
        first = int(start * RATE)
        for n in range(frames - first):
            index = first + n
            t = n / RATE
            envelope = min(n / attack, 1) * math.exp(-t / decay)
            if envelope < 0.0002 and t > 0.02:
                break
            mix[index] += math.sin(2 * math.pi * freq * t) * envelope * gain

    noise = Noise(0x5EED_1A6B)
    for b in bursts:
        bright = Bandpass(b["centre"], b["q"])
        body = Bandpass(max(b.get("body_centre", 20), 20), b.get("body_q", 1))
        first = int(b["start"] * RATE)
        for n in range(int(b["duration"] * RATE)):
            index = first + n
            if index >= frames:
                break
            t = n / RATE
            source = noise.next()
            envelope = math.exp(-t / b["decay"])
            sample = bright.process(source) * b["gain"]
            if b.get("body_gain", 0) > 0:
                sample += body.process(source) * b["body_gain"]
            mix[index] += sample * envelope

    peak = max(abs(v) for v in mix) if mix else 0
    scale = 0.92 / peak if peak > 0.92 else 1.0
    # A bell is still ringing when the buffer runs out, and a hard edge on the
    # end of a buffer is a click. Taper the last half second.
    release = min(0.5 * RATE, frames * 0.3)
    return [v * scale * min(1.0, (frames - n) / release) for n, v in enumerate(mix)]


# ---------------------------------------------------------------- the cues
def bell():
    # A fifth lower than a hand bell and a good deal shorter: a ring bell is
    # struck brass with somebody's hand near it, not a church tower.
    f0 = 392.0
    shape = [
        (1.00, 1.00, 1.05), (1.19, 0.50, 0.85), (1.51, 0.38, 0.70),
        (2.00, 0.72, 0.62), (2.51, 0.28, 0.46), (2.99, 0.26, 0.36),
        (4.13, 0.16, 0.26), (5.42, 0.11, 0.19), (6.79, 0.07, 0.14),
    ]
    partials = [(f0 * r, g, d, 0.0) for r, g, d in shape]
    # Detuned twins on the low partials give the tail its warble.
    partials += [(f0 * r * 1.004, g * 0.6, d * 0.85, 0.0) for r, g, d in shape[:4]]
    strike = [dict(start=0.0, duration=0.05, decay=0.009, gain=0.55,
                   centre=2_600, q=0.8, body_centre=900, body_q=1.4, body_gain=0.45)]
    return render(partials, strike, 2.2)


def clap():
    # Two pieces of hardwood struck together: a hard broadband crack, a short
    # ring from the block itself around 2.4 kHz, and a click on top.
    bursts = []
    for i in range(3):
        t = i * 0.20
        bursts.append(dict(start=t, duration=0.12, decay=0.0045, gain=2.2,
                           centre=1_150, q=0.7, body_centre=520, body_q=2.0, body_gain=0.55))
        bursts.append(dict(start=t, duration=0.12, decay=0.0095, gain=1.5, centre=2_400, q=2.6))
        bursts.append(dict(start=t, duration=0.12, decay=0.0028, gain=1.3, centre=4_800, q=1.2))
    return render([], bursts, 0.75)


def tick():
    return render([(2_100, 0.13, 0.012, 0.0), (3_150, 0.06, 0.008, 0.0)], [], 0.1)


def select():
    return render([(880, 0.14, 0.03, 0.0), (1_320, 0.05, 0.02, 0.0)], [], 0.14)


CUES = {"bell": bell, "clap": clap, "tick": tick, "select": select}


def write(path, samples):
    with wave.open(path, "w") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(RATE)
        out.writeframes(b"".join(
            struct.pack("<h", max(-32768, min(32767, int(v * 32767)))) for v in samples
        ))


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "."
    os.makedirs(target, exist_ok=True)
    for name, make in CUES.items():
        samples = make()
        path = os.path.join(target, name + ".wav")
        write(path, samples)
        peak = max(abs(v) for v in samples)
        print("%-7s %5.2f s  peak %.2f  ->  %s" % (name, len(samples) / RATE, peak, path))
