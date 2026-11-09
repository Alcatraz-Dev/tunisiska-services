"""Beat-locked original synth score for the launch ad."""
import json, math, wave
from pathlib import Path
import numpy as np

ROOT=Path(__file__).parent
TL=json.loads((ROOT/'timeline.json').read_text())
SR=48000; DUR=TL['duration']; N=round(SR*DUR); t=np.arange(N)/SR
mix=np.zeros(N,dtype=np.float64); rng=np.random.default_rng(121225)
def add(at, sig, gain=1.0):
    i=max(0,round(at*SR)); end=min(N,i+len(sig))
    if end>i: mix[i:end]+=sig[:end-i]*gain
def env(n,attack=.006,decay=8):
    x=np.arange(n)/SR
    return np.minimum(1,x/max(attack,.0001))*np.exp(-x*decay)
def kick(d=.32,amp=.42):
    n=round(d*SR); x=np.arange(n)/SR; f=48+80*np.exp(-x*20)
    phase=2*np.pi*np.cumsum(f)/SR
    return amp*np.sin(phase)*np.exp(-x*12)*np.minimum(1,x/.003)
def bass(freq,d=.28,amp=.12):
    n=round(d*SR); x=np.arange(n)/SR
    phase=2*np.pi*freq*x
    return amp*(np.sin(phase)+.25*np.sin(2*phase))*np.exp(-x*5)*np.minimum(1,x/.006)
def pluck(freq,d=.20,amp=.065):
    n=round(d*SR); x=np.arange(n)/SR; ph=2*np.pi*freq*x
    return amp*(np.sin(ph)+.42*np.sin(2.01*ph)+.14*np.sin(3.97*ph))*np.exp(-x*15)*np.minimum(1,x/.004)
def clap(d=.12,amp=.075):
    n=round(d*SR); x=np.arange(n)/SR; noise=rng.normal(0,1,n)
    hp=np.r_[noise[0],np.diff(noise)]
    return amp*hp*np.exp(-x*31)*np.minimum(1,x/.002)
def whoosh(d=.30,amp=.035,reverse=False):
    n=round(d*SR); x=np.arange(n)/SR; z=rng.normal(0,1,n)
    hp=np.r_[z[0],np.diff(z)]
    e=np.sin(np.pi*np.minimum(x/d,1))**1.6
    if reverse: e=e[::-1]
    return hp*e*amp
# Deep, restrained opening pulse; tension rises without a startling level jump.
for b in range(0,18):
    at=b*.5
    if at<3: add(at,kick(.4,.11+.025*b),.5)
    elif at<8.5: add(at,bass(55+8*(at-3),.36,.035+.004*(at-3)))
# A breath immediately before the reveal, with a rising filtered-noise sweep.
for i in range(round(3*SR)):
    x=i/SR
    f=240+1700*x/3
    mix[round(6*SR)+i]+=rng.normal(0,1)*.032*(x/3)**1.7*math.sin(math.pi*x/3)*math.sin(2*math.pi*f*x)
# Main 120 BPM groove. All cuts in timeline.json align to this half-second grid.
scale=[55.00,55.00,73.42,82.41,110.00,82.41,73.42,65.41]
for b in range(18,51):
    at=b*.5
    if at>=25.5: break
    add(at,kick(.34,.36 if b%4 in (0,2) else .27))
    if b%4 in (1,3): add(at,clap(.12,.048))
    add(at+.12,bass(scale[(b//2)%len(scale)],.32,.11))
    if b%2==0: add(at+.22,pluck([220,261.63,329.63,392,440,392,329.63,261.63][(b//2)%8],.20,.052))
# Short transition swishes. The reveal impact is part of the groove, not stacked volume.
for at in [3,5,7,13,15.5,18,20.5,23]: add(at-.20,whoosh(.28,.042,True))
add(8.68,whoosh(.30,.075,True))
add(9.0,clap(.18,.095))
for at in [13,15.5,18,20.5,23]: add(at+.02,whoosh(.22,.035))
# Resolve into the CTA; drums stop, chord and a small final tag remain.
for at,f in [(25.5,164.81),(25.5,220),(25.5,261.63),(28,523.25)]:
    d=2.8 if at==25.5 else .5
    n=round(d*SR); x=np.arange(n)/SR
    sig=.028*np.sin(2*np.pi*f*x)*np.sin(np.pi*np.minimum(x/d,1))
    add(at,sig)
add(27.95,pluck(659.25,.34,.07))
# Smooth saturation and conservative peak ceiling.
peak=np.max(np.abs(mix)) or 1
mix=np.tanh(mix/peak*2.55)/2.75
st=np.column_stack((mix,mix*.985+np.roll(mix,round(SR*.004))*.015))
st=np.clip(st,-.92,.92)
out=ROOT/'out'/'mix.wav';out.parent.mkdir(parents=True,exist_ok=True)
with wave.open(str(out),'wb') as f:
    f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR);f.writeframes((st*32767).astype('<i2').tobytes())
print(f'Wrote {out} · {DUR}s · {TL["bpm"]} BPM · reveal drop {TL["reveal_drop"]:.3f}s')
