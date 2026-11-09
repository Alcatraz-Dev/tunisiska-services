#!/usr/bin/env python3
"""Deterministic 120 BPM, print-shop inspired score and dry foley."""
import math, wave
import json
from pathlib import Path
import numpy as np

ROOT = Path(__file__).parent
TIMELINE = json.loads((ROOT/'timeline.json').read_text())
SR = 48000
DUR = TIMELINE['duration']
n = SR * DUR
t = np.arange(n, dtype=np.float64) / SR
mix = np.zeros(n, dtype=np.float64)
rng = np.random.default_rng(9021)

def add(t0, sig, gain=1.0):
    i = max(0, round(t0 * SR)); end = min(n, i + len(sig))
    if end > i: mix[i:end] += sig[:end-i] * gain

def tone(freq, dur, amp=.2, decay=7, slide=0):
    m = max(1, round(dur * SR)); x = np.arange(m)/SR
    f = freq + slide*np.exp(-x*25)
    phase = 2*math.pi*np.cumsum(f)/SR
    env = np.exp(-decay*x) * np.minimum(1, x/.004)
    return amp*np.sin(phase)*env

def click(dur=.055, amp=.10):
    m=max(1,round(dur*SR)); x=np.arange(m)/SR
    noise=rng.normal(0,1,m)
    return amp*noise*np.exp(-x*95)

# Dry low pulse; the graphic chapters change every five seconds.
beat_s = 60 / TIMELINE['bpm']
silences = TIMELINE['silence']
is_silent = lambda x: any(a <= x < b for a,b in silences)
for beat in np.arange(0, DUR, beat_s):
    # planned hard near-silences before status and end-card reveals
    if is_silent(beat): continue
    add(beat, tone(74, .30, .20, 8, 16), .75)
    if int(beat*2) % 2 == 0 and beat >= 4:
        add(beat+.04, tone(392, .20, .07, 13), .6)
    if beat in (4, 9, 14, 19, 25): add(beat, click(.08,.16), .8)

# Two-note marimba-like figure enters with services, thins at the route, and opens at the wall.
scale=[220.00, 277.18, 329.63, 277.18]
sections = TIMELINE['sections']
for j, beat in enumerate(np.arange(sections[1], sections[-2], beat_s)):
    if is_silent(beat): continue
    if beat < 9: gain=.16
    elif beat < 14: gain=.07
    else: gain=.13 if beat<19 else .18
    add(beat, tone(scale[j%4], .38, gain, 5.5), 1)

# Print-room micro-foley: pencil sweep, paper cuts, and an end stamp.
for at in TIMELINE['foleyHits']:
    if is_silent(at): continue
    add(at, click(.045,.12), .75)
add(26.45, tone(150, .18, .18, 18, 80), .7)

stereo=np.column_stack([mix, mix*.985 + np.roll(mix, 170)*.015])
peak=np.max(np.abs(stereo)) or 1
stereo=np.tanh(stereo/peak*.78*5.0)/5.0
path=ROOT/'out'/'mix.wav'; path.parent.mkdir(parents=True,exist_ok=True)
pcm=(stereo*32767).astype('<i2')
with wave.open(str(path),'wb') as f:
    f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR); f.writeframes(pcm.tobytes())
print(f'Wrote {path} ({DUR}s, 48 kHz stereo)')
