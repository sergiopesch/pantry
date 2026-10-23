#!/usr/bin/env python3
"""Pantry demo video: two minutes on one 120 BPM score (score.py). No subtitles; Lily narrates over the music.

Stage live   live.mp4         the real Grok Bot take, cut to the score: real time while Pantry answers, faster while
                              it works, the window full or beside an explainer.
Stage video  video.mp4        the deck's story -> the turn -> live -> what changed -> the email again -> the end.
Stage final  pantry-demo.mp4  the picture with music.py's soundtrack (score + effects + narration), at -14 LUFS.

Inputs in $PANTRY_VIDEO_WORK: run/grok_masked.mp4 (record-run.sh, mask.py), deck/ and explainers/ (render.mjs),
labels/ (labels.mjs), music/soundtrack.wav (music.py). VIDEO.md has the commands.
"""
import json, os, subprocess, sys

import score as S

WORK = os.environ.get('PANTRY_VIDEO_WORK', '/tmp/pantry-video')
RUN, DECK, EXPL, LAB, MUSIC, OUT = (f'{WORK}/{d}' for d in ('run', 'deck', 'explainers', 'labels', 'music', 'out'))
os.makedirs(OUT, exist_ok=True)
FPS = 60
STAGE = sys.argv[1] if len(sys.argv) > 1 else 'all'

def sh(cmd, **kw):
    print('$', ' '.join(cmd)[:300] + (' …' if len(' '.join(cmd)) > 300 else ''))
    subprocess.run(cmd, check=True, **kw)

def dur(path):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path], capture_output=True, text=True).stdout)

# ---------------------------------------------------------------------------------------------------
# Live: score.LIVE maps film time to the take's time, segment by segment.
X_FULL, X_SPLIT, LAYER_Y = 220, 620, 92      # the 1480x898 Grok layer (sidebar cropped)
PANEL_W, SLIDE = 800, 0.5
L0, L1 = S.LIVE[0][0], S.LIVE[-1][1]          # the live section on the film clock

def speed(seg):
    a, b, s0, s1 = seg[:4]
    return (s1 - s0) / (b - a)

def fast_spans():
    """Film spans played faster than real time (over 1.25x), merged, for the 'Sped up' badge."""
    spans = []
    for seg in S.LIVE:
        if speed(seg) < 1.25: continue
        if spans and abs(spans[-1][1] - seg[0]) < 1e-6: spans[-1][1] = seg[1]
        else: spans.append([seg[0], seg[1]])
    return spans

def stage_live():
    src = f'{RUN}/grok_masked.mp4'
    total = L1 - L0
    g = []
    for i, seg in enumerate(S.LIVE):
        a, b, s0, s1 = seg[:4]
        g.append(f"[0:v]trim=start={s0:.4f}:end={s1:.4f},setpts=(PTS-STARTPTS)/{speed(seg):.6f},crop=1480:898:88:2,fps={FPS},"
                 f"tpad=stop_mode=clone:stop_duration=0.1,trim=duration={b - a:.4f},setpts=PTS-STARTPTS[s{i}]")
    g.append(f"{''.join(f'[s{i}]' for i in range(len(S.LIVE)))}concat=n={len(S.LIVE)}:v=1:a=0[grok]")
    # layout: the Grok layer and the panel ease between full and split over SLIDE seconds from each switch
    switches = [(b[0] - L0, 1 if b[4] == 'split' else -1) for a, b in zip(S.LIVE, S.LIVE[1:]) if a[4] != b[4]]
    def ease(t0):
        u = f"clip((t-{t0:.4f})/{SLIDE},0,1)"
        return f"({u}*{u}*(3-2*{u}))"
    x_layer = f"{X_FULL}" + ''.join(f"{'+' if d > 0 else '-'}{X_SPLIT - X_FULL}*{ease(t0)}" for t0, d in switches)
    x_panel = f"{-PANEL_W}" + ''.join(f"{'+' if d > 0 else '-'}{PANEL_W}*{ease(t0)}" for t0, d in switches)
    g.append(f"color=c=0x111111:s=1920x1080:r={FPS}:d={total:.4f}[bg]")
    g.append(f"[bg][grok]overlay=x='{x_layer}':y={LAYER_Y}:eval=frame:shortest=1[v0]")
    inputs = ['-i', src]
    cur = 'v0'
    for k, (name, (a, b)) in enumerate((n, w) for n, w in S.EXPLAINERS.items() if n != 'callback'):
        inputs += ['-i', f'{EXPL}/{name}.mp4']
        idx = len(inputs) // 2 - 1
        g.append(f"[{idx}:v]tpad=stop_mode=clone:stop_duration=1,trim=duration={b - a:.4f},setpts=PTS-STARTPTS+{a - L0:.4f}/TB[p{k}]")
        g.append(f"[{cur}][p{k}]overlay=x='{x_panel}':y=0:eval=frame:eof_action=pass:enable='between(t,{a - L0:.4f},{b - L0:.4f})'[v{k + 1}]")
        cur = f'v{k + 1}'
    # the live tag rides above the chat column in either layout; the badge sits top right while sped up
    inputs += ['-i', f'{LAB}/live.png', '-i', f'{LAB}/fast.png']
    li = len(inputs) // 2 - 2
    g.append(f"[{cur}][{li}:v]overlay=x='{x_layer}+259':y=23:eval=frame[vl]")
    en = '+'.join(f'between(t,{a - L0 + 0.1:.3f},{b - L0 - 0.05:.3f})' for a, b in fast_spans())
    g.append(f"[vl][{li + 1}:v]overlay=x=1920-40-144:y=27:enable='{en}'[vb]")
    g.append("[vb]format=yuv420p[out]")
    open(f'{OUT}/live.filter', 'w').write(';\n'.join(g))
    sh(['ffmpeg', '-y', '-v', 'error', *inputs, '-filter_complex_script', f'{OUT}/live.filter', '-map', '[out]', '-r', str(FPS),
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '12', '-pix_fmt', 'yuv420p', f'{OUT}/live.mp4'])
    for seg in S.LIVE:
        print(f"  {seg[0]:6.2f}–{seg[1]:6.2f}  {seg[4]:5}  x{speed(seg):4.2f}  {seg[5] or ''}")
    print('sped up:', fast_spans())
    print(f'live section: {total:.2f} s, file {dur(f"{OUT}/live.mp4"):.3f} s')

# ---------------------------------------------------------------------------------------------------
# The film: each part on the score's clock. Hard cuts on 20 and the impacts (96, 112); crossfades into the live
# take (on the whoosh) and into the email (the deck's own slide fade).
XF = 0.5

def stage_video():
    D = S.DECK
    cb0, cb1 = S.EXPLAINERS['callback']
    parts = [  # (file, film start of the file, shown from, shown to, fade in)
        (f'{DECK}/scene.mp4', D['scene']['start'], D['scene']['cut'], D['pantry']['cut'], 0),
        (f'{DECK}/pantry.mp4', D['pantry']['start'], D['pantry']['cut'], L0 + XF, 0),
        (f'{OUT}/live.mp4', L0, L0, L1, XF),
        (f'{DECK}/changed.mp4', D['changed']['start'], D['changed']['cut'], cb0 + XF, 0),
        (f'{DECK}/callback.mp4', cb0, cb0, D['end']['cut'], XF),
        (f'{DECK}/end.mp4', D['end']['start'], D['end']['cut'], S.TOTAL, 0),
    ]
    inputs, g = [], [f"color=c=black:s=1920x1080:r={FPS}:d={S.TOTAL:.4f}[base]"]
    cur = 'base'
    for k, (path, start, a, b, fade) in enumerate(parts):
        inputs += ['-i', path]
        f = f"[{k}:v]trim=start={a - start:.4f}:end={b - start:.4f},setpts=PTS-STARTPTS+{a:.4f}/TB"
        if fade: f += f",format=yuva420p,fade=t=in:st={a:.4f}:d={fade}:alpha=1"
        g.append(f + f"[c{k}]")
        g.append(f"[{cur}][c{k}]overlay=eof_action=pass:enable='between(t,{a:.4f},{b:.4f})'[o{k}]")
        cur = f'o{k}'
    g.append(f"[{cur}]fade=t=out:st={S.TOTAL - 1.5:.4f}:d=1.5,format=yuv420p[out]")
    sh(['ffmpeg', '-y', '-v', 'error', *inputs, '-filter_complex', ';'.join(g), '-map', '[out]', '-r', str(FPS),
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-t', f'{S.TOTAL:.4f}', f'{OUT}/video.mp4'])
    print('video', dur(f'{OUT}/video.mp4'), 'expected', S.TOTAL)

# ---------------------------------------------------------------------------------------------------
def stage_final():
    src = f'{MUSIC}/soundtrack.wav'
    # loudness: one gain to -14 LUFS, and a gentle limiter that keeps the peaks under -1 dBTP (no dynamic riding)
    m = loudness(src)
    af = f"volume={-14.0 - m['I']:.2f}dB,alimiter=limit={10 ** (-1.6 / 20):.4f}:attack=2:release=80:level=false:latency=true,aresample=48000"
    sh(['ffmpeg', '-y', '-v', 'error', '-i', f'{OUT}/video.mp4', '-i', src, '-map', '0:v', '-map', '1:a', '-af', af,
        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-metadata', 'title=Pantry: Order for who shows up',
        '-movflags', '+faststart', '-t', f'{S.TOTAL:.4f}', f'{OUT}/pantry-demo.mp4'])
    print('soundtrack', m, '-> final', loudness(f'{OUT}/pantry-demo.mp4'))
    print('final', dur(f'{OUT}/pantry-demo.mp4'), 's ->', f'{OUT}/pantry-demo.mp4')

def loudness(path):
    r = subprocess.run(['ffmpeg', '-v', 'info', '-i', path, '-map', '0:a', '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    tail = r[r.rindex('Summary:'):]
    num = lambda key: float(tail.split(key)[1].split()[0])
    return {'I': num('I:'), 'LRA': num('LRA:'), 'TP': num('Peak:')}

if STAGE in ('live', 'all'): stage_live()
if STAGE in ('video', 'all'): stage_video()
if STAGE in ('final', 'all'): stage_final()
if STAGE == 'plan':
    for seg in S.LIVE: print(f"  {seg[0]:6.2f}–{seg[1]:6.2f}  {seg[4]:5}  x{speed(seg):4.2f}")
    print('sped up:', fast_spans())
