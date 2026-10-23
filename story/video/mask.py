# Hide the chat history above prompt 1 (it predates the demo), frame-exact, from the bubble track, and blur the
# organiser's own email address wherever it's on screen, from track_email.py's track.
import subprocess, numpy as np, json, bisect, os
RUN = os.environ.get('PANTRY_VIDEO_WORK', '/tmp/pantry-video') + '/run'
SRC, OUT = f'{RUN}/grok60.mp4', f'{RUN}/grok_masked.mp4'
W, H, FPS = 1568, 900, 60
BG, VIEW = 17, 1
X0 = 88                      # chat area starts right of the sidebar
VIEWER = (58.85, 67.05)      # the plan card's viewer; the history is gone before the next one
GAP, EDGE = 20, 14
track = json.load(open(f'{RUN}/bubble.json'))
ts = [r[0] for r in track]
def top(t):
    if t < 2.817: return 839                # nothing typed yet: everything above the message box
    if t < 3.0:                             # the box grows to three lines as the prompt goes in
        for a, y in ((2.833, 828), (2.867, 820), (2.883, 807), (2.917, 798), (2.950, 793), (2.967, 790), (3.0, 788)):
            if t < a: return y
    if t < 9.02: return 787                 # prompt 1 in the box, not sent yet
    if t > 95: return None
    i = min(len(ts) - 1, max(0, bisect.bisect_left(ts, t)))
    y = track[i][1]
    if y is None:
        if t >= 86.0: return None           # scrolled away: nothing older on screen
        for j in range(i, -1, -1):          # a dropped frame mid-scroll: hold the last good position
            if track[j][1] is not None: return track[j][1]
        return 839
    return y
def email_boxes():
    """Frame -> (y0, y1) of the address to blur. Mid-scroll misses cover both ends of the scroll; before the reply
    lands and just after the receipt viewer covers it, the nearest position is held for a moment."""
    path = f'{RUN}/email.json'
    if not os.path.exists(path): return 0, 0, {}
    d = json.load(open(path)); x, y0, w, h = d['box']
    good = [(t, y) for t, y, _, ok in d['track'] if ok]
    times = [t for t, _ in good]
    boxes = {}
    for t, y, _, ok in d['track']:
        i = round(t * FPS)
        if ok: boxes[i] = (y, y + h); continue
        k = bisect.bisect_left(times, t)
        prev, nxt = (good[k - 1] if k > 0 else None), (good[k] if k < len(good) else None)
        if prev and nxt and nxt[0] - prev[0] <= 0.25: boxes[i] = (min(prev[1], nxt[1]), max(prev[1], nxt[1]) + h)
        elif prev is None and nxt: boxes[i] = (min(y0, nxt[1]), max(y0, nxt[1]) + h)
        elif prev and t - prev[0] <= 0.25: boxes[i] = (prev[1], prev[1] + h)
        elif nxt and nxt[0] - t <= 0.25: boxes[i] = (nxt[1], nxt[1] + h)
    return x, w, boxes
EX, EW, EMAIL = email_boxes()
def box_blur(a, r, axis):
    pad = [(0, 0)] * a.ndim; pad[axis] = (r + 1, r)
    c = np.cumsum(np.pad(a, pad, mode='edge'), axis=axis)
    n = a.shape[axis]
    return (np.take(c, range(2 * r + 1, 2 * r + 1 + n), axis=axis) - np.take(c, range(0, n), axis=axis)) / (2 * r + 1)
def blur(f, x, w, ya, yb, m=12, r=5, feather=3):
    """A heavy blur (three box passes), blended in over a 3 px edge; the address sits 4 px or more inside the box."""
    a0, a1 = max(0, ya - m), min(H, yb + m)
    reg = f[a0:a1, x - m:x + w + m].astype(np.float32)
    for _ in range(3): reg = box_blur(box_blur(reg, r, 0), r, 1)
    hy, wx = np.minimum(np.arange(yb - ya), np.arange(yb - ya)[::-1]), np.minimum(np.arange(w), np.arange(w)[::-1])
    k = np.clip((np.minimum(hy[:, None], wx[None, :]) + 1) / (feather + 1), 0, 1)[:, :, None]
    orig = f[ya:yb, x:x + w].astype(np.float32)
    f[ya:yb, x:x + w] = np.clip(orig * (1 - k) + reg[ya - a0:yb - a0, m:m + w] * k, 0, 255).astype(np.uint8)
pill = subprocess.run(['ffmpeg', '-v', 'error', '-ss', '87.5', '-i', SRC, '-frames:v', '1', '-vf', 'crop=140:60:760:0', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
PILL = np.frombuffer(pill, dtype=np.uint8).reshape(60, 140, 3)
ramp = np.linspace(1.0, 0.0, EDGE, dtype=np.float32)[:, None, None]
dec = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', SRC, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                        '-c:v', 'libx264', '-preset', 'slow', '-crf', '10', '-tune', 'stillimage', '-pix_fmt', 'yuv420p', OUT], stdin=subprocess.PIPE)
n = W * H * 3
i = 0
while True:
    buf = dec.stdout.read(n)
    if len(buf) < n: break
    t = i / FPS
    f = np.frombuffer(buf, dtype=np.uint8).reshape(H, W, 3).copy()
    if VIEWER[0] <= t < VIEWER[1]:
        f[0:80, X0:1440] = VIEW
    else:
        m = top(t)
        if m is not None:
            h = max(0, m - GAP)
            f[0:h, X0:W] = BG
            e = min(EDGE, H - h)
            if e > 0:
                seg = f[h:h + e, X0:W].astype(np.float32)
                f[h:h + e, X0:W] = (seg * (1 - ramp[:e]) + BG * ramp[:e]).astype(np.uint8)
            if h >= 60: f[0:60, 760:900] = PILL
    if i in EMAIL: blur(f, EX, EW, *EMAIL[i])
    enc.stdin.write(f.tobytes())
    i += 1
enc.stdin.close(); enc.wait(); dec.wait()
print('frames', i, '· email blurred on', len(EMAIL))
