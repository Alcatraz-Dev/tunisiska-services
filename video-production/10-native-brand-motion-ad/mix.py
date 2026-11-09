#!/usr/bin/env python3
"""Original, deterministic warm-electronic score synced to timeline.json."""
import json, math, wave
from pathlib import Path
import numpy as np

ROOT=Path(__file__).parent
TL=json.loads((ROOT/'timeline.json').read_text())
SR=48000; DUR=TL['duration']; N=int(SR*DUR); t=np.arange(N)/SR
mix=np.zeros(N,dtype=np.float64); rng=np.random.default_rng(241107)
def add(at,signal,gain=1):
    i=max(0,round(at*SR)); end=min(N,i+len(signal))
    if end>i: mix[i:end]+=signal[:end-i]*gain
def bell(freq,dur=.36,amp=.13,decay=8):
    n=max(1,round(dur*SR)); x=np.arange(n)/SR
    phase=2*np.pi*freq*x
    return amp*(np.sin(phase)+.3*np.sin(phase*2.01)+.12*np.sin(phase*3.97))*np.exp(-decay*x)*np.minimum(1,x/.003)
def kick(dur=.24,amp=.23):
    n=round(dur*SR); x=np.arange(n)/SR
    f=83+42*np.exp(-x*18); phase=2*np.pi*np.cumsum(f)/SR
    return amp*np.sin(phase)*np.exp(-x*16)*np.minimum(1,x/.002)
def click(dur=.05,amp=.08):
    n=round(dur*SR); x=np.arange(n)/SR
    return rng.normal(0,1,n)*amp*np.exp(-x*110)
def hush(dur=.46,amp=.035):
    n=round(dur*SR); x=np.arange(n)/SR; z=rng.normal(0,1,n)
    hp=np.r_[z[0],np.diff(z)]
    env=np.sin(np.pi*np.minimum(x/dur,1))**1.4
    return hp*env*amp

beat=60/TL['bpm']; silences=TL['silence']
is_silent=lambda x:any(a<=x<b for a,b in silences)
# Warm, low drone makes the percussive grid feel musical and carries across edits.
phaseA=2*np.pi*110*t; phaseB=2*np.pi*164.81*t; phaseC=2*np.pi*220*t
pad=(.030*np.sin(phaseA)+.017*np.sin(phaseB)+.010*np.sin(phaseC))
section_levels=[.72,.82,1.0,.76,1.08,.78,.66]
for i,start in enumerate(TL['sections'][:-1]):
    end=TL['sections'][i+1]
    pad[(t>=start)&(t<end)]*=section_levels[i]
for a,b in silences: pad[(t>=a)&(t<b)]=0
mix+=pad
scale=[220.00,246.94,293.66,329.63,392.00,329.63,293.66,246.94]
kick_levels=[.68,.86,1.05,.78,1.12,.72,.58]
bell_levels=[.50,.78,1.0,.72,1.05,.72,.58]
for i,at in enumerate(np.arange(0,DUR,beat)):
    if is_silent(at): continue
    ch=max(0,min(len(kick_levels)-1,np.searchsorted(TL['sections'][1:],at,side='right')))
    add(at,kick(),kick_levels[ch])
    if i%2==0 and at>=3.5: add(at+.025,bell(scale[(i//2)%len(scale)],.34,.095*bell_levels[ch],7.5))
    if i%4==2 and at>=7.5: add(at+.12,bell(scale[(i//2+2)%len(scale)]*2,.24,.042*bell_levels[ch],10))
for at in TL['hits']:
    if not is_silent(at):
        add(at,click(.065,.13)); add(max(0,at-.14),hush(.36,.04))
for i,at in enumerate(TL['foley']):
    if not is_silent(at): add(at,click(.042,.11 if i not in (1,2,3,4,5) else .15))
# Soft saturation preserves rounded, non-fatiguing transients before final loudness mastering.
peak=np.max(np.abs(mix)) or 1
mix=np.tanh(mix/peak*.72*3.2)/3.2
st=np.column_stack((mix,mix*.99+np.roll(mix,round(SR*.006))*.01))
st=np.clip(st,-.95,.95)
out=ROOT/'out'/'mix.wav'; out.parent.mkdir(parents=True,exist_ok=True)
with wave.open(str(out),'wb') as f:
    f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR); f.writeframes((st*32767).astype('<i2').tobytes())
print(f'Wrote {out} · {DUR:.1f}s · {TL["bpm"]} BPM · original synthesis')
