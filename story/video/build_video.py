#!/usr/bin/env python3
"""Pantry demo video: deck story + the real Grok Bot run + wrap, with Lily's voiceover.

Stage 1  live.mp4   the Grok take re-timed (real time while Pantry answers, faster while it works),
                    on a 1920x1080 canvas: full window, or split with a deck panel on the left.
Stage 2  video.mp4  scene -> turn -> live -> wrap with crossfades.
Stage 3  vo.wav     the voice lines placed on the global timeline, loudness-normalised.
Stage 4  final      muxed MP4 + SRT subtitles.
"""
import json, os, subprocess, sys

WORK = os.environ.get('PANTRY_VIDEO_WORK', '/tmp/pantry-video')
RUN, DECK, OV, VO, OUT = (f'{WORK}/{d}' for d in ('run', 'deck', 'labels', 'vo', 'out'))
os.makedirs(OUT, exist_ok=True)
FPS = 60
STAGE = sys.argv[1] if len(sys.argv) > 1 else 'all'

def sh(cmd, **kw):
    print('$', ' '.join(cmd)[:300] + (' …' if len(' '.join(cmd)) > 300 else ''))
    subprocess.run(cmd, check=True, **kw)

def dur(path):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path], capture_output=True, text=True).stdout)

# ---------------------------------------------------------------------------------------------------
# The live EDL, in grok_masked.mp4 time (video time = event log + 1.05 s).
# (src_start, src_end, speed, layout, panel, label)   layout: 'full' | 'split'   speed 0 = freeze (src_end = seconds)
EDL = [
    (0.60, 9.60, 1, 'full', None, 'prompt 1 typed and sent'),
    (9.60, 17.00, 1, 'split', 'connect', 'Pantry starts: reading Notion'),
    (17.00, 49.80, 4, 'split', 'connect', 'working'),
    (49.80, 58.70, 1, 'full', None, 'answer + plan card'),
    (58.70, 66.95, 1, 'full', None, 'plan card in the viewer'),
    (66.95, 2.00, 0, 'full', None, 'hold the plan card'),
    (66.95, 74.30, 1, 'full', None, 'prompt 2 typed and sent'),
    (74.30, 86.20, 4, 'full', None, 'rendering the meal cards'),
    (86.20, 94.50, 1, 'full', None, 'seven meal cards arrive'),
    (94.50, 99.10, 3, 'full', None, ''),
    (99.10, 106.10, 1, 'full', None, 'the coeliac meal in the viewer'),
    (106.10, 113.40, 1, 'full', None, 'prompt 3 typed and sent'),
    (113.40, 131.00, 1, 'split', 'tools', 'brief drafted and emailed'),
    (131.00, 135.50, 1, 'full', None, 'brief answer'),
    (138.20, 145.40, 1, 'full', None, 'prompt 4 typed and sent'),
    (145.40, 190.60, 3, 'split', 'agentcard', 'quote, approval, single-use card, test charge'),
    (190.60, 195.20, 1, 'full', None, 'paid'),
    (195.20, 199.90, 3, 'full', None, ''),
    (199.90, 206.60, 1, 'full', None, 'payment card in the viewer'),
]
X_FULL, X_SPLIT, LAYER_Y = 220, 620, 92      # the 1480x900 Grok layer (sidebar cropped)
PANEL_W, SLIDE = 800, 0.6

def live_timeline():
    t, rows = 0.0, []
    for s, e, sp, lay, panel, label in EDL:
        d = e if sp == 0 else (e - s) / sp
        rows.append(dict(src=s, src_end=(s if sp == 0 else e), speed=sp, layout=lay, panel=panel, label=label, out=t, out_end=t + d))
        t += d
    return rows, t

def out_at(src, rows):
    """Output time of a source moment (first segment containing it, never a freeze)."""
    for r in rows:
        if r['speed'] and r['src'] <= src <= r['src_end']:
            return r['out'] + (src - r['src']) / r['speed']
    raise ValueError(f'source time {src} not in the EDL')

# ---------------------------------------------------------------------------------------------------
def stage_live():
    rows, total = live_timeline()
    src = f'{RUN}/grok_masked.mp4'
    parts, labels = [], []
    for i, r in enumerate(rows):
        if r['speed'] == 0:
            parts.append(f"[0:v]trim=start={r['src'] - 1/FPS:.4f}:end={r['src']:.4f},setpts=PTS-STARTPTS,crop=1480:898:88:2,tpad=stop_mode=clone:stop_duration={r['out_end'] - r['out']:.4f},trim=duration={r['out_end'] - r['out']:.4f},fps={FPS}[s{i}]")
        else:
            parts.append(f"[0:v]trim=start={r['src']:.4f}:end={r['src_end']:.4f},setpts=(PTS-STARTPTS)/{r['speed']},crop=1480:898:88:2,fps={FPS}[s{i}]")
        labels.append(f'[s{i}]')
    graph = parts + [f"{''.join(labels)}concat=n={len(rows)}:v=1:a=0[grok]"]
    # layout: x of the Grok layer and of the panel, eased between 'full' and 'split'
    switches = []
    for a, b in zip(rows, rows[1:]):
        if a['layout'] != b['layout']: switches.append((b['out'], 1 if b['layout'] == 'split' else -1))
    first_split = 1 if rows[0]['layout'] == 'split' else 0
    def ease(t0):
        u = f"clip((t-{t0:.4f})/{SLIDE},0,1)"
        return f"({u}*{u}*(3-2*{u}))"
    x_layer = f"{X_FULL + first_split * (X_SPLIT - X_FULL)}" + ''.join(f"{'+' if d > 0 else '-'}{X_SPLIT - X_FULL}*{ease(t0)}" for t0, d in switches)
    x_panel = f"{-PANEL_W + first_split * PANEL_W}" + ''.join(f"{'+' if d > 0 else '-'}{PANEL_W}*{ease(t0)}" for t0, d in switches)
    graph.append(f"color=c=0x111111:s=1920x1080:r={FPS}:d={total:.4f}[bg]")
    graph.append(f"[bg][grok]overlay=x='{x_layer}':y={LAYER_Y}:eval=frame:shortest=1[v0]")
    # panels: each starts its own entrance animation as it slides in, and holds its last frame
    inputs = ['-i', src]
    panel_windows = {}
    for r in rows:
        if r['panel']:
            w = panel_windows.setdefault(r['panel'], [r['out'], r['out_end']])
            w[1] = r['out_end']
    cur = 'v0'
    for k, (p, (a, b)) in enumerate(panel_windows.items()):
        inputs += ['-i', f'{DECK}/p-{p}.mp4']
        idx = len(inputs) // 2 - 1
        hold = b - a + SLIDE + 1.0
        graph.append(f"[{idx}:v]tpad=stop_mode=clone:stop_duration={hold:.3f},trim=duration={hold:.3f},setpts=PTS-STARTPTS+{a:.4f}/TB,fps={FPS}[p{k}]")
        graph.append(f"[{cur}][p{k}]overlay=x='{x_panel}':y=0:eval=frame:enable='between(t,{a:.4f},{b + SLIDE:.4f})'[v{k + 1}]")
        cur = f'v{k + 1}'
    # labels: live tag top-left; speed badges top-right while sped up
    inputs += ['-i', f'{OV}/live.png']
    li = len(inputs) // 2 - 1
    graph.append(f"[{cur}][{li}:v]overlay=x='{x_layer}+259':y=23:eval=frame[vl]")   # above the chat column, in either layout
    cur = 'vl'
    for sp in (4, 3):
        spans = [(r['out'], r['out_end']) for r in rows if r['speed'] == sp]
        if not spans: continue
        inputs += ['-i', f'{OV}/x{sp}.png']
        bi = len(inputs) // 2 - 1
        en = '+'.join(f'between(t,{a + 0.15:.3f},{b - 0.1:.3f})' for a, b in spans)
        graph.append(f"[{cur}][{bi}:v]overlay=x=1920-40-127:y=27:enable='{en}'[vb{sp}]")
        cur = f'vb{sp}'
    graph.append(f"[{cur}]format=yuv420p[out]")
    open(f'{OUT}/live.filter', 'w').write(';\n'.join(graph))
    sh(['ffmpeg', '-y', '-v', 'error', *inputs, '-filter_complex_script', f'{OUT}/live.filter', '-map', '[out]', '-r', str(FPS),
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '12', '-tune', 'stillimage', '-pix_fmt', 'yuv420p', f'{OUT}/live.mp4'])
    json.dump(dict(rows=rows, total=total), open(f'{OUT}/live.json', 'w'), indent=1)
    for r in rows:
        print(f"  {r['out']:7.2f}–{r['out_end']:7.2f}  {r['layout']:5} {('×' + str(r['speed'])) if r['speed'] != 1 else '  '}  {r['label']}")
    print(f'live section: {total:.2f} s')

# ---------------------------------------------------------------------------------------------------
# The global timeline: scene (A) -> turn (B) -> live (L) -> wrap (W), crossfades between.
DA, DB, DW = 21.0, 12.0, 27.6
XF_AB, XF_BL, XF_LW = 0.5, 0.8, 0.8

def timeline():
    _, dl = live_timeline()
    a = 0.0
    b = a + DA - XF_AB
    l = b + DB - XF_BL
    w = l + dl - XF_LW
    return dict(A=a, B=b, L=l, W=w, end=w + DW, DL=dl)

def stage_video():
    T = timeline()
    def norm(src, d, name):
        sh(['ffmpeg', '-y', '-v', 'error', '-i', src, '-vf', f"tpad=stop_mode=clone:stop_duration=6,trim=duration={d},fps={FPS},format=yuv420p,setsar=1",
            '-c:v', 'libx264', '-preset', 'slow', '-crf', '12', f'{OUT}/{name}.mp4'])
    norm(f'{DECK}/scene.mp4', DA, 'A')
    norm(f'{DECK}/pantry.mp4', DB, 'B')
    norm(f'{DECK}/wrap.mp4', DW, 'W')
    g = [f"[0:v][1:v]xfade=transition=fade:duration={XF_AB}:offset={DA - XF_AB:.4f}[ab]",
         f"[ab][2:v]xfade=transition=fade:duration={XF_BL}:offset={T['L']:.4f}[abl]",
         f"[abl][3:v]xfade=transition=fade:duration={XF_LW}:offset={T['W']:.4f}[ablw]",
         f"[ablw]fade=t=out:st={T['end'] - 1.2:.4f}:d=1.2,format=yuv420p[out]"]
    sh(['ffmpeg', '-y', '-v', 'error', '-i', f'{OUT}/A.mp4', '-i', f'{OUT}/B.mp4', '-i', f'{OUT}/live.mp4', '-i', f'{OUT}/W.mp4',
        '-filter_complex', ';'.join(g), '-map', '[out]', '-r', str(FPS), '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', f'{OUT}/video.mp4'])
    print('video', dur(f'{OUT}/video.mp4'), 'expected', T['end'])

# ---------------------------------------------------------------------------------------------------
def vo_placements():
    T = timeline()
    rows, _ = live_timeline()
    L = lambda src: T['L'] + out_at(src, rows)
    # (line, global start). Deck lines follow the cue times; live lines follow what's on screen.
    return [
        ('v01', T['A'] + 4.9), ('v02', T['A'] + 8.4), ('v03', T['A'] + 14.4),
        ('v04', T['B'] + 0.4), ('v05', T['B'] + 5.3),
        ('v06', L(3.4)),            # the prompt is in the box
        ('v07', L(10.0)),           # Pantry starts working; connections slide in
        ('v08', L(51.2)),           # the answer has landed
        ('v09', L(69.3)),           # prompt 2 in the box
        ('v10', L(99.9)),           # the coeliac meal, full screen
        ('v11', L(108.3)),          # prompt 3 in the box
        ('v12', L(114.0)),          # how it works, while the brief goes out
        ('v13', L(139.3)),          # prompt 4 in the box ("The organiser says yes" lands on send)
        ('v14', L(150.0)),          # Agentcard, while the card is made and charged
        ('v19', L(193.6)),          # the payment card lands in the chat
        ('v15', T['W'] + 0.0), ('v16', T['W'] + 10.3), ('v17', T['W'] + 16.8), ('v18', T['W'] + 21.8),
    ]

def stage_audio():
    T = timeline()
    place = vo_placements()
    ins, filt = [], []
    for i, (v, t) in enumerate(place):
        ins += ['-i', f'{VO}/{v}.wav']
        filt.append(f"[{i}:a]aresample=48000,adelay={int(t * 1000)}|{int(t * 1000)}[a{i}]")
    filt.append(f"{''.join(f'[a{i}]' for i in range(len(place)))}amix=inputs={len(place)}:normalize=0:dropout_transition=0,apad=whole_dur={T['end']:.3f},atrim=duration={T['end']:.3f},loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[out]")
    sh(['ffmpeg', '-y', '-v', 'error', *ins, '-filter_complex', ';'.join(filt), '-map', '[out]', '-ac', '2', f'{OUT}/vo.wav'])
    # overlap check: no two lines at once
    spans = sorted((t, t + dur(f'{VO}/{v}.wav'), v) for v, t in place)
    for (a0, a1, va), (b0, b1, vb) in zip(spans, spans[1:]):
        if b0 < a1 - 0.05: print(f'  !! {va} overlaps {vb} by {a1 - b0:.2f} s')
    for v, t in place: print(f'  {v} at {t:7.2f}')

def srt_time(t):
    h, rem = divmod(t, 3600); m, s = divmod(rem, 60)
    return f'{int(h):02d}:{int(m):02d}:{int(s):02d},{int(round((s - int(s)) * 1000)):03d}'

DIGITS = [  # subtitles read numbers as numerals
    ('A hundred and forty', '140'), ('a hundred and forty', '140'), ('Forty-one percent', '41%'), ('sixty percent', '60%'),
    ('a hundred percent', '100%'), ('five pounds fifty-one', '£5.51'), ('seventy-pound', '£70'), ('Seventy pounds', '£70'),
    ('Ninety-three', '93'), ('ninety-three', '93'), ('Ninety-six', '96'), ('Forty-four', '44'), ('Fifty-one', '51'),
    ('Forty-seven', '47'), ('eighty', '80'), ('Cog-nee', 'Cognee'), ('ten past events', '10 past events'),
]
def subtitle_text(t):
    for a, b in DIGITS: t = t.replace(a, b)
    return t

def stage_final():
    T = timeline()
    # subtitles: one sentence per cue; a long one splits at the comma nearest its middle, short ones join up
    cues = []
    for v, t in vo_placements():
        words = json.load(open(f'{VO}/{v}.json'))['words']
        sents, cur = [], []
        for w in words:
            cur.append(w)
            if w[0].endswith(('.', '?', '!', '...')): sents.append(cur); cur = []
        if cur: sents.append(cur)
        pieces = []
        for sn in sents:
            text = ' '.join(w[0] for w in sn)
            if len(text) > 74:
                commas = [i for i, w in enumerate(sn[:-1]) if w[0].endswith(',')]
                if commas:
                    mid = min(commas, key=lambda i: abs(len(' '.join(w[0] for w in sn[:i + 1])) - len(text) / 2))
                    pieces += [sn[:mid + 1], sn[mid + 1:]]; continue
            pieces.append(sn)
        merged = []
        for pc in pieces:
            if merged and len(' '.join(w[0] for w in merged[-1] + pc)) <= 64 and len(' '.join(w[0] for w in merged[-1])) < 30:
                merged[-1] = merged[-1] + pc
            else:
                merged.append(pc)
        for pc in merged:
            cues.append([t + pc[0][1], t + pc[-1][2] + 0.3, subtitle_text(' '.join(w[0] for w in pc))])
    for a, b in zip(cues, cues[1:]):
        a[1] = min(max(a[1], a[0] + 1.0), b[0] - 0.04)
    with open(f'{OUT}/pantry-demo.srt', 'w') as f:
        for i, (a, b, text) in enumerate(cues, 1):
            f.write(f'{i}\n{srt_time(a)} --> {srt_time(b)}\n{text}\n\n')
    sh(['ffmpeg', '-y', '-v', 'error', '-i', f'{OUT}/video.mp4', '-i', f'{OUT}/vo.wav', '-i', f'{OUT}/pantry-demo.srt',
        '-map', '0:v', '-map', '1:a', '-map', '2:s', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-c:s', 'mov_text',
        '-metadata:s:s:0', 'language=eng', '-metadata', 'title=Pantry: Order for who shows up', '-movflags', '+faststart',
        f'{OUT}/pantry-demo.mp4'])
    print('final', dur(f'{OUT}/pantry-demo.mp4'), 's ->', f'{OUT}/pantry-demo.mp4')

if STAGE in ('live', 'all'): stage_live()
if STAGE in ('video', 'all'): stage_video()
if STAGE in ('audio', 'all'): stage_audio()
if STAGE in ('final', 'all'): stage_final()
if STAGE == 'plan':
    rows, total = live_timeline(); T = timeline()
    for r in rows: print(f"  {T['L'] + r['out']:7.2f}  {r['layout']:5} x{r['speed']}  {r['label']}")
    print(T)
    for v, t in vo_placements(): print(v, round(t, 2), round(t + dur(f'{VO}/{v}.wav'), 2))
