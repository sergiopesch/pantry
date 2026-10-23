#!/usr/bin/env python3
"""Pantry's score, composed to picture from score.py: 120 BPM, A minor, an electronic launch track.

Every hit, riser and pop is placed from the score, so the music lands on the cuts. Synthesised here (kick, clap,
hats, sub and pumping bass, supersaw chords, pluck arpeggios, the finale's lead, risers), with ElevenLabs sound
effects for the impacts, whooshes, the stamp and the zap. Writes stems and mix.wav to $PANTRY_VIDEO_WORK/music, and, once Lily's lines are in
$PANTRY_VIDEO_WORK/vo, soundtrack.wav: the score ducked under the narration, cut to the film's length.
    uv run --with numpy --with scipy python story/video/music.py
"""
import json
import os
import sys

import numpy as np
from scipy import signal
from scipy.io import wavfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import score as S  # noqa: E402

SR = 48000
WORK = os.environ.get('PANTRY_VIDEO_WORK', '/tmp/pantry-video')
OUT = f'{WORK}/music'
SFX = os.environ.get('PANTRY_SFX', f'{WORK}/sfx')
os.makedirs(OUT, exist_ok=True)
DUR = S.TOTAL + 4.0
N = int(SR * DUR)
rng = np.random.default_rng(7)

# --- notes ----------------------------------------------------------------------------------------------
_PC = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}
def midi(n): return 12 * (int(n[-1]) + 1) + _PC[n[:-1]]
def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
CHORD = {'Am': ['A3', 'C4', 'E4', 'A4'], 'F': ['F3', 'A3', 'C4', 'F4'], 'C': ['G3', 'C4', 'E4', 'G4'],
         'G': ['G3', 'B3', 'D4', 'G4'], 'Dm': ['D3', 'F3', 'A3', 'D4'], 'E': ['E3', 'G#3', 'B3', 'E4']}
ROOT = {'Am': 'A1', 'F': 'F1', 'C': 'C2', 'G': 'G1', 'Dm': 'D2', 'E': 'E1'}
PENTA = ['A5', 'C6', 'D6', 'E6', 'G6', 'A6', 'C7', 'D7']

# --- buses ---------------------------------------------------------------------------------------------
BUS = {k: np.zeros((N, 2)) for k in ('kick', 'drums', 'bass', 'pad', 'arp', 'lead', 'fx', 'send')}

def put(bus, t0, y, pan=0.0, gain=1.0, send=0.0):
    i = int(round(t0 * SR))
    if i >= N or i + len(y) <= 0: return
    if i < 0: y, i = y[-i:], 0
    y = y[: N - i]
    if y.ndim == 1:
        th = (pan + 1) * np.pi / 4
        y = np.stack([y * np.cos(th), y * np.sin(th)], 1) * np.sqrt(2)
    BUS[bus][i:i + len(y)] += y * gain
    if send: BUS['send'][i:i + len(y)] += y * gain * send

# --- building blocks -----------------------------------------------------------------------------------
def sos(kind, f, order=2): return signal.butter(order, f, kind, fs=SR, output='sos')
def filt(x, kind, f, order=2): return signal.sosfilt(sos(kind, f, order), x, axis=0)

def saw(freq, n, ph0=None):
    """Band-limited (PolyBLEP) sawtooth."""
    dt = np.broadcast_to(np.asarray(freq, float) / SR, (n,))
    ph = ((rng.random() if ph0 is None else ph0) + np.cumsum(dt)) % 1.0
    y = 2 * ph - 1
    a = ph < dt; x = ph[a] / dt[a]; y[a] -= x + x - x * x - 1
    b = ph > 1 - dt; x = (ph[b] - 1) / dt[b]; y[b] -= x * x + x + x + 1
    return y

def supersaw(f, n, voices=7, detune=0.18, width=0.9):
    """Detuned saws spread across the stereo field (detune in semitones at the outer voices)."""
    out = np.zeros((n, 2))
    for k in range(voices):
        off = (k / (voices - 1) * 2 - 1) if voices > 1 else 0
        y = saw(f * 2 ** (off * detune / 12), n)
        pan = off * width
        th = (pan + 1) * np.pi / 4
        out[:, 0] += y * np.cos(th); out[:, 1] += y * np.sin(th)
    return out / np.sqrt(voices)

def env(n, a=0.005, d=0.2, s=0.0, rel_at=None, r=0.05):
    t = np.arange(n) / SR
    e = np.where(t < a, t / a, s + (1 - s) * np.exp(-(t - a) / d))
    if rel_at is not None:
        k = t >= rel_at
        e[k] *= np.exp(-(t[k] - rel_at) / r)
    e[-64:] *= np.linspace(1, 0, 64)
    return e

def pluck(f, length, bright=1.0, decay=0.22):
    """Additive pluck: higher harmonics die faster, like a closing filter."""
    n = int(length * SR); t = np.arange(n) / SR
    K = int(max(3, min(40, (SR / 2.2) / f) * (0.35 + 0.65 * bright)))
    y = np.zeros(n)
    for k in range(1, K + 1):
        y += np.sin(2 * np.pi * f * k * t + rng.random() * 6.28) / k * np.exp(-t * (1 / decay + k * (6 - 3.5 * bright)))
    a = min(n, 48); y[:a] *= np.linspace(0, 1, a)
    return y * 0.6

def tv_filter(x, fc_of_t, kind='lowpass', block=256, order=2, q=None):
    """Time-varying filter: coefficients per block, state carried across."""
    y = np.zeros_like(x); zi = None
    for i in range(0, len(x), block):
        fc = float(np.clip(fc_of_t(i / SR), 30, SR / 2.2))
        s = (signal.butter(order, [fc / (1 + q), fc * (1 + q)], 'bandpass', fs=SR, output='sos') if kind == 'bandpass'
             else signal.butter(order, fc, kind, fs=SR, output='sos'))
        if zi is None: zi = np.zeros((s.shape[0], 2) + x.shape[1:])
        y[i:i + block], zi = signal.sosfilt(s, x[i:i + block], axis=0, zi=zi)
    return y

def load_sfx(name):
    path = f'{SFX}/{name}.wav'
    if not os.path.exists(path): return None
    sr, x = wavfile.read(path)
    x = x.astype(np.float64) / 32768.0
    if x.ndim == 1: x = np.stack([x, x], 1)
    if sr != SR: x = signal.resample_poly(x, SR, sr, axis=0)
    return x

def onset(x, frac=0.12):
    m = np.abs(x).max(1)
    return int(np.argmax(m > m.max() * frac))

def peak(x):
    m = np.convolve(np.abs(x).max(1), np.ones(480) / 480, 'same')
    return int(np.argmax(m))

# --- drums ---------------------------------------------------------------------------------------------
def kick_one():
    n = int(SR * 0.5); t = np.arange(n) / SR
    f = 46 + 115 * np.exp(-t / 0.028)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.27)
    y += 0.28 * np.sin(2 * np.pi * 2400 * t) * np.exp(-t / 0.0025)
    y = np.tanh(1.7 * y)
    y[:24] *= np.linspace(0, 1, 24)
    return y

def clap_one():
    n = int(SR * 0.4); t = np.arange(n) / SR
    e = np.zeros(n)
    for o, g in ((0.0, 0.7), (0.012, 0.8), (0.024, 1.0)):
        e += (t >= o) * np.exp(-np.clip(t - o, 0, None) / 0.006) * g
    e += (t >= 0.03) * np.exp(-np.clip(t - 0.03, 0, None) / 0.13) * 0.55
    return filt(rng.standard_normal(n), 'bandpass', [900, 4200]) * e * 0.9

def snare_one():
    n = int(SR * 0.3); t = np.arange(n) / SR
    y = filt(rng.standard_normal(n), 'bandpass', [1400, 7000]) * np.exp(-t / 0.11)
    y += 0.5 * np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.07)
    return y * 0.8

def hat_one(open_=False):
    n = int(SR * (0.35 if open_ else 0.08)); t = np.arange(n) / SR
    y = filt(rng.standard_normal(n), 'highpass', 7500, 4) * np.exp(-t / (0.2 if open_ else 0.028))
    y[:16] *= np.linspace(0, 1, 16)
    return y * (0.55 if open_ else 0.6)

def crash_one():
    n = int(SR * 2.6); t = np.arange(n) / SR
    y = filt(rng.standard_normal((n, 2)), 'highpass', 4200, 2) * np.exp(-t / 0.9)[:, None]
    y += 0.25 * filt(rng.standard_normal((n, 2)), 'bandpass', [2500, 6000]) * np.exp(-t / 0.25)[:, None]
    return y * 0.45

KICK, CLAP, SNARE, HAT_C, HAT_O, CRASH = kick_one(), clap_one(), snare_one(), hat_one(), hat_one(True), crash_one()
KICKS = []  # kick times, for the sidechain

def kick(t, v=1.0):
    KICKS.append(t); put('kick', t, KICK, gain=v)

# --- arrangement ---------------------------------------------------------------------------------------
BARS = int(S.TOTAL / S.BAR)
HOOK = [  # the finale's lead: (beat offset in the 4-bar phrase, length in beats, note)
    (0, 1, 'E5'), (1, 0.5, 'E5'), (1.5, 0.5, 'D5'), (2, 1, 'C5'), (3, 1, 'D5'),
    (4, 1.5, 'C5'), (5.5, 0.5, 'A4'), (6, 2, 'A4'),
    (8, 1, 'G4'), (9, 1, 'C5'), (10, 1, 'E5'), (11, 1, 'G5'),
    (12, 1.5, 'D5'), (13.5, 0.5, 'B4'), (14, 2, 'D5'),
]
LEVEL = {  # per section: drums, bass, pad, arp, supersaw chords, lead (0..1)
    'intro': (0.0, 0.0, 0.7, 0.45, 0.0, 0), 'build1': (0.6, 0.55, 0.55, 0.6, 0.0, 0), 'build2': (0.85, 0.75, 0.5, 0.75, 0.25, 0),
    'turn': (0.0, 0.0, 0.6, 0.0, 0.0, 0), 'drop': (1.0, 1.0, 0.3, 0.9, 1.0, 0), 'grooveA': (0.9, 0.9, 0.45, 0.75, 0.3, 0),
    'connect': (0.85, 0.85, 0.5, 0.55, 0.3, 0), 'grooveB': (0.95, 0.95, 0.5, 0.8, 0.55, 0), 'grooveC': (0.95, 0.95, 0.5, 0.8, 0.5, 0),
    'grooveD': (0.95, 0.9, 0.5, 0.75, 0.45, 0), 'tension': (0.5, 0.6, 0.7, 0.45, 0.0, 0), 'agentcard': (1.0, 1.0, 0.45, 0.7, 0.35, 0),
    'resolve': (0.85, 0.85, 0.7, 0.7, 0.6, 0), 'finale': (1.0, 1.0, 0.4, 0.95, 1.0, 1.0), 'breakdown': (0.0, 0.0, 0.9, 0.55, 0.0, 0.0),
    'final': (1.0, 1.0, 0.4, 0.95, 1.0, 1.0), 'outro': (0.0, 0.0, 0.8, 0.25, 0.5, 0.0),
}

def quiet(t):
    """The breath before each big hit: nothing starts in the 1/8 before it."""
    return any(h - 0.25 <= t < h for h in (24.0, 96.0, 112.0))

for bar in range(1, BARS + 1):
    t0 = S.at(bar); sec = S.section(bar); ch = S.chord(bar)
    dr, ba, pa, ar, ss, le = LEVEL[sec]
    notes = CHORD[ch]
    # drums
    if sec == 'intro' and bar >= 3:
        for k in range(16): put('drums', t0 + k * S.BEAT / 4, HAT_C, pan=0.25, gain=0.18 + 0.08 * (k % 4 == 0))
    elif sec in ('build1', 'tension'):
        for b in (0, 2): kick(t0 + b * S.BEAT, 0.85 * dr / 0.6)
        for k in range(8): put('drums', t0 + k * S.BEAT / 2, HAT_C, pan=0.25, gain=0.3 * dr)
    elif sec == 'build2':
        for b in range(4): kick(t0 + b * S.BEAT, 0.72)
        steps = 8 if bar == 9 else 16
        for k in range(steps):
            tk = t0 + k * S.BAR / steps
            put('drums', tk, SNARE, pan=-0.1, gain=(0.2 + 0.45 * (k / steps)) * (0.7 if bar == 9 else 1.0), send=0.15)
            put('drums', tk, HAT_C, pan=0.3, gain=0.25)
    elif sec == 'turn':
        for b in ((0, 0.9), (0.75, 0.55)): kick(t0 + b[0] * S.BEAT, b[1] * 0.8)
    elif sec in ('breakdown',):
        if bar == 56:
            for k in range(16):
                tk = t0 + k * S.BEAT / 4
                if not quiet(tk): put('drums', tk, SNARE, gain=0.15 + 0.6 * k / 16, send=0.2)
    elif sec != 'outro':
        for b in range(4):
            tb = t0 + b * S.BEAT
            if not quiet(tb): kick(tb, 1.0 * dr)
            if b in (1, 3) and not quiet(tb): put('drums', tb, CLAP, pan=-0.05, gain=0.75 * dr, send=0.18)
            if not quiet(tb + S.BEAT / 2): put('drums', tb + S.BEAT / 2, HAT_O, pan=0.35, gain=0.32 * dr)
            for s in range(4):
                ts = tb + s * S.BEAT / 4
                if not quiet(ts): put('drums', ts, HAT_C, pan=-0.3 + 0.6 * (s % 2), gain=(0.32, 0.14, 0.22, 0.14)[s] * dr)
        if sec in ('finale', 'final') and not quiet(t0 + 3.5 * S.BEAT):
            put('drums', t0 + 3.75 * S.BEAT, SNARE, gain=0.3, send=0.2)
    # bass
    root = hz(midi(ROOT[ch]))
    if sec == 'build1':
        for b in (0, 2):
            n = int(0.9 * S.BEAT * SR); put('bass', t0 + b * S.BEAT, np.sin(2 * np.pi * root * np.arange(n) / SR) * env(n, 0.004, 0.35, 0.4) * ba)
    elif sec in ('build2', 'drop', 'grooveA', 'connect', 'grooveB', 'grooveC', 'grooveD', 'resolve', 'finale', 'final', 'agentcard'):
        rolling = sec == 'agentcard'
        hits = [b * S.BEAT + o for b in range(4) for o in ((0.0, 0.125, 0.25, 0.375) if rolling else (0.25,))]
        for h in hits:
            tb = t0 + h
            if quiet(tb): continue
            ln = 0.11 if rolling else 0.22
            n = int(ln * SR); tt = np.arange(n) / SR
            sub = np.sin(2 * np.pi * root * tt)
            mid = (saw(root * 2 * 2 ** (0.06 / 12), n) + saw(root * 2 * 2 ** (-0.06 / 12), n)) / 2
            mid = filt(mid, 'lowpass', 750 if not rolling else 1100, 2)
            y = np.tanh(1.4 * (sub * 0.9 + mid * 0.7)) * env(n, 0.003, 0.09 if rolling else 0.16, 0.5, ln - 0.03, 0.02)
            put('bass', tb, y, gain=ba)
    elif sec == 'tension':
        n = int(S.BAR * SR); tt = np.arange(n) / SR
        y = np.sin(2 * np.pi * root * tt) + 0.3 * filt(saw(root * 2, n), 'lowpass', 400 + 400 * (bar - 39))
        put('bass', t0, y * env(n, 0.05, 2.0, 0.8, S.BAR - 0.05, 0.03) * 0.7)
    elif sec == 'turn' and bar == 11:
        n = int((2 * S.BAR - 0.25) * SR); tt = np.arange(n) / SR
        y = np.sin(2 * np.pi * hz(midi('A1')) * tt) * np.clip(tt / 3.0, 0, 1) ** 2
        put('bass', t0, y * 0.42)
    elif sec == 'outro' and bar == 59:
        n = int(5.0 * SR); tt = np.arange(n) / SR
        put('bass', t0, np.sin(2 * np.pi * hz(midi('A1')) * tt) * np.exp(-tt / 1.6) * 0.6)
    # pad (always under, long notes)
    if pa > 0:
        n = int((S.BAR + 0.6) * SR)
        pad = np.zeros((n, 2))
        for nt in (notes if sec != 'intro' else ['A2', 'E3', 'A3']):
            pad += supersaw(hz(midi(nt)), n, voices=5, detune=0.12, width=0.8)
        cut = {'intro': 700, 'turn': 1100, 'tension': 900, 'breakdown': 2200, 'outro': 1800}.get(sec, 1600)
        pad = filt(filt(pad, 'lowpass', cut, 2), 'highpass', 160, 2)
        e = env(n, 0.25, 4.0, 0.9, S.BAR + 0.1, 0.25)[:, None]
        if sec == 'turn' and bar == 12: e = e * (np.arange(n)[:, None] < int((S.BAR - 0.25) * SR))
        put('pad', t0, pad * e * pa * 0.5, send=0.35)
    # supersaw chords: on the beat with a pump in the drops, sustained in the finale
    if ss > 0:
        for b in range(4):
            tb = t0 + b * S.BEAT
            if quiet(tb): continue
            n = int(S.BEAT * SR)
            y = np.zeros((n, 2))
            for nt in notes[1:] + [notes[1][:-1] + str(int(notes[1][-1]) + 1)]:
                y += supersaw(hz(midi(nt)), n, voices=7, detune=0.2, width=1.0)
            y = filt(filt(y, 'lowpass', 5200 if sec in ('drop', 'finale', 'final') else 3200, 2), 'highpass', 220, 2)
            put('pad', tb, y * env(n, 0.006, 0.45, 0.55, S.BEAT - 0.04, 0.03)[:, None] * ss * 0.32, send=0.3)
    # arpeggio (16ths; 8ths when it should breathe)
    if ar > 0:
        tones = sorted(midi(x) + 12 for x in notes)
        seq = [tones[0], tones[2], tones[3], tones[1] + 12, tones[2] + 12, tones[1] + 12, tones[3], tones[2]]
        step = S.BEAT / 2 if sec in ('tension', 'breakdown', 'intro') else S.BEAT / 4
        bright = {'intro': 0.25, 'build1': 0.45 + 0.1 * (bar - 5), 'build2': 0.85, 'tension': 0.45, 'agentcard': 0.75,
                  'breakdown': 0.6, 'outro': 0.3}.get(sec, 0.95)
        k = 0; tk = t0
        while tk < t0 + S.BAR - 1e-6:
            if not quiet(tk):
                f = hz(seq[k % len(seq)])
                put('arp', tk, pluck(f, 0.32, bright, 0.18), pan=(-0.5 if k % 2 else 0.5) * 0.6, gain=ar * (1.0 if k % 4 == 0 else 0.75), send=0.3)
            k += 1; tk = t0 + k * step
    # lead hook (finale and the last hit)
    if le > 0 and bar in (49, 53, 57):
        # the whole 4-bar hook from bar 49; its first half from 53 (the breakdown follows) and from the last hit
        for off, ln, nt in HOOK:
            if bar != 49 and off >= 8: continue
            tb = S.at(bar) + off * S.BEAT
            n = int(ln * S.BEAT * SR); tt = np.arange(n) / SR
            f = hz(midi(nt)) * (1 + 0.004 * np.sin(2 * np.pi * 5.2 * tt) * np.clip((tt - 0.15) / 0.2, 0, 1))
            y = filt(supersaw(f, n, voices=3, detune=0.1, width=0.4), 'lowpass', 6500, 2)
            put('lead', tb, y * env(n, 0.012, 0.6, 0.7, ln * S.BEAT - 0.05, 0.08)[:, None] * 0.55, send=0.4)

# --- accents and sound design --------------------------------------------------------------------------
SFXS = {k: load_sfx(k) for k in ('impact1', 'impact2', 'whoosh1', 'whoosh2', 'pop1', 'pop2', 'swipe', 'stamp', 'zap', 'glitch')}

def sfx(name, t, gain, align='onset', pan=0.0):
    x = SFXS.get(name)
    if x is None: return
    off = (onset(x) if align == 'onset' else peak(x)) / SR
    put('fx', t - off, x, gain=gain)

def stab(t, v):
    ch = S.chord(int(t // S.BAR) + 1)
    n = int(0.6 * SR); y = np.zeros((n, 2))
    for nt in CHORD[ch]:
        y += supersaw(hz(midi(nt) + 12), n, voices=7, detune=0.22, width=1.0)
    y = filt(filt(y, 'lowpass', 6000, 2), 'highpass', 300, 2) * env(n, 0.003, 0.12, 0.0)[:, None]
    put('fx', t, y * 0.45 * v, send=0.6)

def boom(t, v):
    n = int(2.2 * SR); tt = np.arange(n) / SR
    f = 32 + 40 * np.exp(-tt / 0.18)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.7)
    y += 0.4 * filt(rng.standard_normal(n), 'lowpass', 1800) * np.exp(-tt / 0.12)
    put('fx', t, np.tanh(1.3 * y) * 0.8 * v, send=0.5)

for t, kind, v in S.ACCENTS:
    if kind == 'stab': stab(t, v)
    elif kind == 'boom': boom(t, v); sfx('impact2', t, 0.7 * v)
    elif kind == 'impact': boom(t, v); sfx('impact1', t, 0.95 * v); put('drums', t, CRASH, gain=0.9 * v, send=0.3)
    elif kind == 'crash': put('drums', t, CRASH, gain=0.7 * v, send=0.3)
    elif kind == 'hit': sfx('impact2', t, 0.55 * v); stab(t, 0.5 * v)
    elif kind == 'glitch': sfx('glitch', t, 0.8 * v)
    elif kind == 'whoosh': sfx('whoosh1', t, 0.7 * v, 'peak')
    elif kind == 'swish': sfx('whoosh2', t, 0.6 * v, 'peak')
    elif kind == 'pop': sfx('pop1', t, 0.8 * v)
    elif kind == 'stamp': sfx('stamp', t, 1.0 * v); boom(t, 0.35)
    elif kind == 'zap': sfx('zap', t, 0.7 * v)
    elif kind == 'lock':   # two short metal clicks
        for k2, (fc, g) in enumerate(((4200, 1.0), (2600, 0.7))):
            n = int(0.06 * SR); tt = np.arange(n) / SR
            put('fx', t + k2 * 0.055, filt(rng.standard_normal(n), 'bandpass', [fc / 1.4, fc * 1.4]) * np.exp(-tt / 0.006) * 0.9 * v * g, send=0.25)
    elif kind == 'chime': sfx('swipe', t, 2.2 * v)
    elif kind == 'blip':
        f = hz(midi(PENTA[int(v) % len(PENTA)]))
        y = pluck(f, 0.45, 1.0, 0.25) + 0.5 * np.sin(2 * np.pi * f * 2 * np.arange(int(0.45 * SR)) / SR) * np.exp(-np.arange(int(0.45 * SR)) / SR / 0.08)
        put('fx', t, y * 0.5, pan=(int(v) % 3 - 1) * 0.4, send=0.5)
    elif kind == 'ping':
        n = int(1.6 * SR); tt = np.arange(n) / SR; f = hz(midi('E6'))
        y = sum(a * np.sin(2 * np.pi * f * r * tt) * np.exp(-tt / d) for r, a, d in ((1, 1, 0.9), (2.76, 0.4, 0.4), (5.4, 0.2, 0.2)))
        put('fx', t, y * 0.22 * v, send=0.6)
    elif kind == 'confirm':
        for k2, nt in enumerate(('E6', 'A6')):
            n = int(0.5 * SR); tt = np.arange(n) / SR
            put('fx', t + k2 * 0.12, np.sin(2 * np.pi * hz(midi(nt)) * tt) * np.exp(-tt / 0.18) * 0.25 * v, send=0.5)

for a, b, v in S.RISERS:
    n = int((b - a) * SR); tt = np.arange(n) / SR; u = tt / (b - a)
    noise = rng.standard_normal((n, 2))
    sweep = tv_filter(noise, lambda s, a=a, b=b: 350 * (9000 / 350) ** min(1, s / (b - a)), 'bandpass', q=0.35)
    tone = supersaw(hz(midi('A3')) * 2 ** (u * 1.0), n, voices=5, detune=0.25)
    y = (sweep * 0.9 + filt(tone, 'lowpass', 3000) * 0.25) * (u ** 2.2)[:, None]
    y[-480:] *= np.linspace(1, 0, 480)[:, None]
    put('fx', a, y * 0.55 * v, send=0.3)

# --- mix -----------------------------------------------------------------------------------------------
def sidechain(depth, rel=0.12):
    g = np.ones(N); att = int(0.004 * SR); ln = int(0.45 * SR)
    shape = np.concatenate([np.linspace(0, 1, att), np.exp(-np.arange(ln - att) / SR / rel)])
    for t in KICKS:
        i = int(t * SR)
        seg = 1 - depth * shape[: max(0, min(ln, N - i))]
        g[i:i + len(seg)] = np.minimum(g[i:i + len(seg)], seg)
    return g[:, None]

def rms_db(x, a=None, b=None):
    seg = x[int((a or 0) * SR):int((b or DUR) * SR)]
    return 20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-12)

# balance the stems on the first drop (bars 13-14): kick leads, bass under it, the rest around
TARGET = {'kick': -14.0, 'bass': -17.5, 'drums': -24.0, 'pad': -21.0, 'arp': -23.5, 'lead': -20.0}
for k, tgt in TARGET.items():
    span = (S.at(49), S.at(53)) if k == 'lead' else (S.at(13), S.at(15))
    cur = rms_db(BUS[k], *span)
    if cur > -90: BUS[k] *= 10 ** ((tgt - cur) / 20)
ir_t = np.arange(int(2.6 * SR)) / SR
IR = filt(rng.standard_normal((len(ir_t), 2)) * np.exp(-6.9 * ir_t / 2.3)[:, None], 'lowpass', 5500, 1)
IR[: int(0.018 * SR)] = 0
IR /= np.sqrt((IR ** 2).sum() / 2)
verb = np.stack([signal.fftconvolve(BUS['send'][:, c], IR[:, c])[:N] for c in range(2)], 1)
verb = filt(verb, 'highpass', 250, 2) * 0.22
dl = np.zeros((N, 2)); d = int(0.375 * SR)
mono = BUS['arp'].mean(1)
for k in range(1, 6):
    if k * d < N: dl[k * d:, k % 2] += mono[: N - k * d] * (0.32 ** k)
dl = filt(dl, 'lowpass', 4000, 1)

# the bed is the music; the effects bus carries every hit, riser and pop
bed = (BUS['kick'] + BUS['drums'] + BUS['bass'] * sidechain(0.65) + BUS['pad'] * sidechain(0.45)
       + (BUS['arp'] + dl) * sidechain(0.3) + BUS['lead'] * sidechain(0.2) + verb)
fx = BUS['fx']

def master(x, end=N):
    """Soft-clip the peaks, normalise to -1 dBFS and fade the last 1.5 s before `end`."""
    x = filt(x, 'highpass', 28, 2)
    x = np.tanh(x * 2.0 / np.max(np.abs(x))) / np.tanh(1.6)
    x *= 10 ** (-1.0 / 20) / np.max(np.abs(x))
    fade = int(1.5 * SR); x[end - fade:end] *= np.linspace(1, 0, fade)[:, None]; x[end:] = 0
    return x

mix = master(bed + fx)

def write(name, x):
    wavfile.write(f'{OUT}/{name}.wav', SR, (np.clip(x, -1, 1) * 32767).astype(np.int16))

write('mix', mix)
for k in ('kick', 'drums', 'bass', 'pad', 'arp', 'lead', 'fx'):
    write(f'stem-{k}', BUS[k] / max(1e-9, np.max(np.abs(BUS[k]))) * 0.9)
for a, b, name in S.SECTIONS:
    print(f'{name:10s} bars {a:2d}-{b:2d}  rms {rms_db(mix, S.at(a), S.at(b + 1)):6.1f} dB')
print('peak', 20 * np.log10(np.max(np.abs(mix))), 'dBFS ->', f'{OUT}/mix.wav')

# --- the soundtrack: the score under Lily's narration ------------------------------------------------------
# Each line is levelled on its speech, 2 dB over the groove. While she speaks the bed ducks 6 dB and the effects
# 3 dB, both 5 dB more in the voice's band (0.7-4.5 kHz), so the kick, bass and booms keep driving under her.
# Pauses under 0.8 s stay ducked; longer ones let the music breathe back up into the next hit. The attack of each
# impact breaks through; its tail ducks.
VO_DIR = f'{WORK}/vo'
if all(os.path.exists(f'{VO_DIR}/{v}.wav') for v, _ in S.VO):
    MS = int(DUR * 1000)
    def one_pole(m, att, rel):
        out = np.zeros(len(m)); g = 0.0
        a, r = 1 - np.exp(-1 / (att * 1000)), 1 - np.exp(-1 / (rel * 1000))
        for i, x in enumerate(m):
            g += (x - g) * (a if x > g else r); out[i] = g
        return out
    def to_sr(env_ms): return np.interp(np.arange(N) / SR, np.arange(MS) / 1000, env_ms)
    ref = rms_db(bed + fx, 28.0, 34.0)
    vo = np.zeros(N); spans = []
    for v, t in S.VO:
        sr, y = wavfile.read(f'{VO_DIR}/{v}.wav'); y = y.astype(float) / 32768
        if y.ndim > 1: y = y.mean(1)
        if sr != SR: y = signal.resample_poly(y, SR, sr)
        words = json.load(open(f'{VO_DIR}/{v}.json'))['words']
        speech = y[int(words[0][1] * SR):int(words[-1][2] * SR)]
        y *= 10 ** ((ref + 2.0) / 20) / (np.sqrt(np.mean(speech ** 2)) + 1e-12)
        i = int(t * SR); vo[i:i + len(y)] += y[:N - i]
        spans.append((t + words[0][1] - 0.15, t + words[-1][2] + 0.25))
    held = []
    for a, b in sorted(spans):
        if held and a - held[-1][1] < 0.8 - 0.4: held[-1][1] = max(held[-1][1], b)
        else: held.append([a, b])
    talk = np.zeros(MS)
    for a, b in held: talk[int(a * 1000):int(b * 1000)] = 1
    hits = np.zeros(MS)
    for t, kind, _ in S.ACCENTS:
        if kind in ('impact', 'boom'): hits[int((t - 0.02) * 1000):int((t + 0.15) * 1000)] = 1
    duck = one_pole(talk, 0.06, 0.45) * (1 - one_pole(hits, 0.01, 0.15))
    d = to_sr(duck)[:, None]
    end = int(S.TOTAL * SR)
    def ducked(x, db): return (x - (1 - 10 ** (-5 / 20)) * d * filt(x, 'bandpass', [700, 4500], 2)) * 10 ** (-db * d / 20)
    soundtrack = master(ducked(bed, 6) + ducked(fx, 3) + filt(vo, 'highpass', 70, 2)[:, None], end=end)[:end]
    write('soundtrack', soundtrack)
    for (a, b) in held: print(f'  ducked {a:6.2f}-{b:6.2f}')
    print('soundtrack', len(soundtrack) / SR, 's ->', f'{OUT}/soundtrack.wav')
