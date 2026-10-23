# Track the organiser's own email address in grok60.mp4 (window coords), every frame, so mask.py can blur it.
# It's in Pantry's brief reply ("The brief is in your inbox at …") and scrolls with the chat until the end of the
# take. Template match on the address as rendered, along the reply's column; where it's hidden or mid-scroll the
# last good position is held, which is harmless: blurring empty background changes nothing.
import subprocess, numpy as np, json, os
RUN = os.environ.get('PANTRY_VIDEO_WORK', '/tmp/pantry-video') + '/run'
SRC = f'{RUN}/grok60.mp4'
W, H, FPS = 1568, 900, 60
BOX = (534, 715, 160, 20)          # x, y, w, h of the address at T_REF, with a little room
T_REF, T_START = 135.0, 129.0      # a still frame of the reply; a second before it starts to stream in
x0, y0, bw, bh = BOX
_t = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(T_REF), '-i', SRC, '-frames:v', '1', '-vf', f'crop={bw}:{H}:{x0}:0,format=gray',
                     '-f', 'rawvideo', '-'], capture_output=True).stdout
TM = np.frombuffer(_t, dtype=np.uint8).reshape(H, bw).astype(np.float32)[y0:y0 + bh].copy()
def sad(f, y):
    if y < 0 or y + bh > H: return 1e9
    return float(np.abs(f[y:y + bh] - TM).mean())
p = subprocess.Popen(['ffmpeg', '-v', 'error', '-ss', str(T_START), '-i', SRC, '-vf', f'crop={bw}:{H}:{x0}:0,format=gray', '-f', 'rawvideo', '-'],
                     stdout=subprocess.PIPE)
out, i, last = [], 0, y0
while True:
    buf = p.stdout.read(bw * H)
    if len(buf) < bw * H: break
    t = round(T_START + i / FPS, 4); i += 1
    f = np.frombuffer(buf, dtype=np.uint8).reshape(H, bw).astype(np.float32)
    d0, yc = min((sad(f, y), y) for y in range(0, H - bh, 4))
    d, y = min((sad(f, y), y) for y in range(yc - 4, yc + 5))
    if d < 9: last = y
    out.append((t, int(last), round(d, 2), d < 9))
p.wait()
json.dump({'box': BOX, 'start': T_START, 'track': out}, open(f'{RUN}/email.json', 'w'))
prev = None
for t, y, d, ok in out:
    if (y, ok) != prev: print(f'{t:7.2f} y={y} sad={d}{"" if ok else "  (held)"}'); prev = (y, ok)
print('tracked', len(out))
