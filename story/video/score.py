"""The score: one 120 BPM timeline that the music, the deck renders, the explainers and the edit all follow.

Every cut, reveal, logo, card and hit sits on a beat (0.5 s) or a bar (2 s). Sections start on 4-bar
boundaries: the drop on bar 13, Agentcard on bar 41, the finale on bar 49, the last hit on bar 57.
Times are seconds on the film's clock.
"""
BPM = 120
BEAT = 60 / BPM
BAR = 4 * BEAT
TOTAL = 120.0


def at(bar, beat=1.0):
    """Seconds at a 1-based bar and beat."""
    return (bar - 1) * BAR + (beat - 1) * BEAT


# Narration (story/video/narration.tsv) and where each line starts.
VO = [
    ('n01', 5.0), ('n02', 8.0), ('n03', 11.0), ('n04', 14.0), ('n05', 20.2), ('n06', 24.1), ('n07', 26.0),
    ('n08', 29.0), ('n09', 34.5), ('n10', 42.5), ('n11', 48.3), ('n12', 53.0), ('n13', 62.3), ('n14', 68.3),
    ('n15', 76.3), ('n16', 82.5), ('n17', 86.3), ('n18', 88.8), ('n19', 94.3), ('n20', 96.3), ('n21', 98.9),
    ('n22', 101.3), ('n23', 104.2), ('n24', 108.2), ('n25', 112.15), ('n26', 114.0),
]

# The deck (story/index.html), rendered headless by render.mjs. Each part starts at `start` on the film clock and is
# shown from `cut`. A play runs on its own cue times; a slide opened by its number steps on key presses.
# Times inside a part are seconds from its start.
DECK = {
    'scene': dict(start=0.0, cut=0.0, end=20.0, url='?cues.scene=0,8,9.5,11,14,16,17#scene'),   # the email, February, June
    'pantry': dict(start=20.0, cut=20.0, end=28.5, url='?cues.pantry=0,2,4,5#pantry'),         # signs up struck out; Pantry
    # 93, 47, 0, then the vision line. The parts that open on an impact start early, so their fade is already up on the hit.
    'changed': dict(start=95.75, cut=96.0, end=108.5, url='#6', keys=[(2.75, 'ArrowRight'), (5.25, 'ArrowRight'), (8.25, 'ArrowRight')]),
    'end': dict(start=111.85, cut=112.0, end=TOTAL, url='#8', keys=[(2.15, 'ArrowRight'), (4.15, 'ArrowRight')]),  # Pantry; thank you
}
DECK_DATE = '2026-10-22'   # the hackathon, in the end card's credit

# Explainers (story/video/explainers.html): left of the split (800x1080) with the slide out included, and the
# callback to the opening email, full screen.
EXPLAINERS = {'connect': (34.0, 42.5), 'rules': (68.0, 76.5), 'agentcard': (80.0, 92.5), 'callback': (108.0, 112.0)}

# The live run (run/grok_masked.mp4 time), cut to the grid. (out start, out end, src start, src end, layout, panel)
# The seven meal cards land on seven beats (57.0 to 60.0): the source is warped between their arrivals.
_CARDS = [86.400, 87.450, 88.200, 89.233, 90.450, 91.667, 92.383]
LIVE = [
    (27.75, 34.0, 2.50, 9.08, 'full', None),            # crossfade in; prompt 1 in the box, sent on bar 18
    (34.0, 42.0, 9.08, 49.90, 'split', 'connect'),       # Pantry works: Notion, Cognee, the engine
    (42.0, 46.6, 49.90, 54.50, 'full', None),            # the answer lands
    (46.6, 48.0, 54.50, 58.85, 'full', None),
    (48.0, 52.0, 58.85, 62.85, 'full', None),            # the plan card, full screen, on bar 25
    (52.0, 55.0, 67.05, 74.03, 'full', None),            # prompt 2
    (55.0, 57.0, 74.03, _CARDS[0], 'full', None),
    *[(57.0 + 0.5 * i, 57.5 + 0.5 * i, _CARDS[i], _CARDS[i + 1], 'full', None) for i in range(6)],
    (60.0, 62.0, _CARDS[6], 99.27, 'full', None),
    (62.0, 66.0, 99.27, 103.27, 'full', None),           # the coeliac meal, full screen, on bar 32
    (66.0, 68.0, 105.93, 113.08, 'full', None),          # prompt 3
    (68.0, 76.0, 113.08, 131.00, 'split', 'rules'),      # the brief goes out; the rules
    (76.0, 80.0, 138.40, 145.20, 'full', None),          # prompt 4, sent on "One yes"
    (80.0, 92.0, 145.20, 190.90, 'split', 'agentcard'),  # quote, approval, single-use card, test charge
    (92.0, 94.0, 190.90, 193.90, 'full', None),          # paid
    (94.0, 96.0, 200.14, 202.14, 'full', None),          # the receipt, full screen
]

# Accents the music and the sound design hit, with what's on screen.
ACCENTS = [
    (8.0, 'stab', 0.5), (9.5, 'stab', 0.5), (11.0, 'stab', 0.7), (14.0, 'stab', 0.7), (16.0, 'stab', 0.8),
    (17.0, 'boom', 1.0),                                   # 41% in the bin
    (22.0, 'glitch', 1.0),                                 # "signs up" struck out
    (24.0, 'impact', 1.0),                                 # the drop: "Order for who shows up."
    (25.0, 'pop', 0.6),                                    # Pantry lands
    (28.0, 'whoosh', 0.8),                                 # into Grok Bot
    (34.0, 'swish', 0.7),
    *[(35.0 + 0.5 * i, 'blip', i) for i in range(8)],      # eight logos
    (36.0, 'ping', 0.8), (38.0, 'ping', 0.8), (40.0, 'ping', 0.8),  # Notion, Luma, Cognee
    (41.0, 'pop', 0.35),                                   # Pantry has it all
    (42.0, 'swish', 0.6), (48.0, 'hit', 0.7), (52.0, 'swish', 0.4),
    *[(57.0 + 0.5 * i, 'blip', i) for i in range(7)],      # seven meal cards
    (62.0, 'hit', 0.6), (66.0, 'swish', 0.4), (68.0, 'swish', 0.7), (68.5, 'pop', 0.6),
    (71.5, 'stab', 0.6), (72.5, 'stab', 0.6), (74.0, 'hit', 0.8),   # allergies first, nothing invented, no tool can pay
    (75.0, 'lock', 0.7),                                   # the lock shuts on "pay"
    (76.0, 'swish', 0.6),
    (80.0, 'whoosh', 0.9), (80.0, 'stab', 0.8),            # Agentcard
    (80.5, 'confirm', 0.8), (81.5, 'pop', 0.6),            # your yes; the request, bound to the plan
    (82.5, 'hit', 0.7),                                    # Agentcard's mark lands as it's named
    (84.0, 'whoosh', 0.8), (84.0, 'stab', 0.7),            # the card turns out of the mark
    (86.0, 'zap', 0.9), (86.0, 'chime', 0.8),              # charged once
    (87.5, 'stamp', 1.0),                                  # closed
    (89.0, 'stab', 0.7), (90.5, 'stab', 0.9),
    (92.0, 'swish', 0.6), (94.0, 'hit', 0.8),              # the receipt
    (96.0, 'impact', 1.0),                                 # 93
    (98.5, 'stab', 0.9), (101.0, 'stab', 0.9),             # 47, 0
    (104.0, 'crash', 0.7),
    (112.0, 'impact', 1.0),                                # "Nobody should have to."
    (114.0, 'pop', 0.6),                                   # Pantry signs off
    (116.0, 'stab', 0.8),                                  # thank you
]
RISERS = [(18.0, 20.0, 0.38), (22.0, 23.75, 1.0), (78.0, 80.0, 0.6), (94.0, 96.0, 1.0), (110.0, 112.0, 0.9)]

# Arrangement by bar (inclusive ranges).
SECTIONS = [
    (1, 4, 'intro'), (5, 8, 'build1'), (9, 10, 'build2'), (11, 12, 'turn'), (13, 14, 'drop'), (15, 17, 'grooveA'),
    (18, 21, 'connect'), (22, 26, 'grooveB'), (27, 33, 'grooveC'), (34, 38, 'grooveD'), (39, 40, 'tension'),
    (41, 46, 'agentcard'), (47, 48, 'resolve'), (49, 54, 'finale'), (55, 56, 'breakdown'), (57, 58, 'final'),
    (59, 62, 'outro'),
]
_CYCLE = ['Am', 'F', 'C', 'G']
_OVERRIDE = {11: 'Am', 12: 'E', 39: 'Dm', 40: 'E', 41: 'Am', 42: 'F', 43: 'Dm', 44: 'E', 45: 'Am', 46: 'E', 47: 'F', 48: 'G',
             49: 'Am', 50: 'F', 51: 'C', 52: 'G', 53: 'Am', 54: 'F', 55: 'F', 56: 'G', 57: 'Am', 58: 'F'}


def chord(bar):
    if bar in _OVERRIDE: return _OVERRIDE[bar]
    return 'Am' if bar < 5 or bar > 58 else _CYCLE[(bar - 5) % 4]


def section(bar):
    for a, b, name in SECTIONS:
        if a <= bar <= b: return name
    return 'outro'
