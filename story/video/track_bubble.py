# Track the top edge of prompt 1's bubble in grok60.mp4 (window coords), every frame, for the history mask.
# Coarse-to-fine global search (robust to jumps), frames with the image viewer open are skipped (held).
import subprocess, numpy as np, json, os
RUN = os.environ.get('PANTRY_VIDEO_WORK', '/tmp/pantry-video') + '/run'
SRC = f'{RUN}/grok60.mp4'
X0, W, H, TH = 748, 560, 900, 80
FPS = 60
T_START, T_END = 8.17, 95.0
VIEWERS = [(57.70, 66.30), (98.10, 105.20)]
_t = subprocess.run(['ffmpeg', '-v', 'error', '-ss', '12', '-i', SRC, '-frames:v', '1', '-vf', f'crop={W}:{H}:{X0}:0,format=gray', '-f', 'rawvideo', '-'], capture_output=True).stdout
TM = np.frombuffer(_t, dtype=np.uint8).reshape(H, W).astype(np.float32)[694:694 + TH, :].copy()
def sad(f, y):
    a0, a1 = max(0, y), min(H, y + TH)
    if a1 - a0 < 16: return 1e9
    return float(np.abs(f[a0:a1] - TM[a0 - y:a1 - y]).mean())
cmd = ['ffmpeg', '-v', 'error', '-ss', str(T_START), '-t', str(T_END - T_START), '-i', SRC, '-vf', f'crop={W}:{H}:{X0}:0,format=gray', '-f', 'rawvideo', '-']
p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
out, i, last = [], 0, 694
while True:
    buf = p.stdout.read(W * H)
    if len(buf) < W * H: break
    t = round(T_START + i / FPS, 4); i += 1
    if any(a <= t <= b for a, b in VIEWERS):
        out.append((t, last, -1.0)); continue
    f = np.frombuffer(buf, dtype=np.uint8).reshape(H, W).astype(np.float32)
    coarse = [(sad(f, y), y) for y in range(-TH + 16, H - 16, 6)]
    d0, y0 = min(coarse)
    best = min((sad(f, y), y) for y in range(y0 - 6, y0 + 7))
    d, y = best
    if d > 14:  # not on screen any more (scrolled away) or hidden
        out.append((t, None, round(d, 2)))
    else:
        last = y; out.append((t, int(y), round(d, 2)))
p.wait()
json.dump(out, open(f'{RUN}/bubble.json', 'w'))
prev = 'x'
for t, y, d in out:
    key = None if y is None else y // 20
    if key != prev: print(f'{t:7.2f} y={y} sad={d}'); prev = key
print('tracked', len(out))
