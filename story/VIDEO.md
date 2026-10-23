# Pantry: the demo video (2:00)

The finished film is `Pantry demo.mp4` (1920×1080, 60 fps, H.264, AAC at −14 LUFS), with a poster frame. It's kept out of the repo because the repo is public; it lives in `~/Desktop/Pantry demo video/`. There are no subtitles: Lily narrates over an original score, and the picture is cut to that score.

## What it shows

| Time | Part | What's on screen |
|---|---|---|
| 0:00 | The email | The coeliac guest's email, typed. February: pizza for 80, 44 came. June: 96 signed up, 51 came, 41% in the bin |
| 0:20 | The turn | "We order for who ~~signs up~~" becomes "Order for who shows up." on the drop, and Pantry lands in its hat |
| 0:28 | Live in Grok Bot | Pantry's real chat, filmed on 23 Oct 2026 with the four prompts in `streamdeck/prompts.txt` |
| 0:34 | Connected | Prompt 1 goes out. Beside the chat, eight logos land one a beat, and Notion, Luma and Cognee light up and send their data in as they're named |
| 0:42 | The plan | 93 plates, not 140. Vanda's Kitchen at £5.51 a plate. The plan card full screen |
| 0:52 | Meal cards | Prompt 2. Seven meal cards land on seven beats; the coeliac meal full screen ("remember that email?") |
| 1:06 | The brief and the rules | Prompt 3. The brief, emailed to the organiser's own inbox; then allergies first, nothing invented, no engine tool can pay |
| 1:16 | Agentcard | Prompt 4: the caterer's £70 deposit, and one yes. The request is bound to the plan; Agentcard's mark turns into a single-use card, which is charged once ($93.58 = £70.00) and stamped closed. Then the receipt, full screen |
| 1:36 | What changed | 93 / 47 / 0, and "Time for the community, not the logistics." |
| 1:48 | The email again | The same email, typed again as Lily asks the question. On the last hit: "Nobody should have to bring their own." Then Pantry, and the credit (22 October 2026) |

Narration: ElevenLabs, voice "Lily" (UK), `eleven_multilingual_v2` at speed 1.06. There are 26 lines in `video/narration.tsv`, and `video/score.py` gives where each one starts. Every claim matches what Pantry did in that run, as it reported afterwards. Setup called Cognee recall, Notion (search, then the event page) and the engine, then rendered the plan card. The deposit called `pantry_quote_record`, `pantry_checkout_request`, `scripts/agentcard-pay.mjs`, `pantry_payment_confirm` and Gmail, then rendered the receipt.

## One score

Everything follows one 120 BPM timeline, `video/score.py`: a beat is 0.5 s and a bar is 2 s. Every cut, reveal, logo and card lands on a beat, and sections change on 4-bar lines. The drop is bar 13 (0:24), Agentcard is bar 41 (1:20), and the last hit is bar 57 (1:52). Each narration line also starts on the grid, where the picture says the same thing.
- `video/music.py` composes the track from the score in A minor: kick, clap, hats, sub and pumping bass, supersaw chords, pluck arpeggios, the finale's lead, and a riser into each big moment. Every accent (stab, pop, ping, blip, whoosh, stamp, zap, lock) sits where `ACCENTS` puts it, under what the picture does. The impacts, whooshes, stamp and zap are ElevenLabs sound effects (`video/sfx.tsv`). Then it writes the soundtrack: the music ducks 9 dB under Lily and the effects 3 dB, and the three impacts break through.
- `video/explainers.html` draws the panels beside the chat (800×1080) and the closing email in CSS keyframes. Every entrance is timed in beats.
- `video/render.mjs` renders the deck and the explainers frame by frame. The page's timers run on Playwright's paused clock, and every animation and transition is paused and seeked, so frame n is exactly n/60 s.
- `video/build_video.py` cuts the live take to `score.LIVE`, slides the split in and out, and assembles the film.

## Honesty notes
- **The chat is real.** Every message, card and number in the live part is Pantry's own output, filmed window-only. Nothing in the chat is drawn or retouched.
- **Older history is hidden.** Pantry's chat holds last night's setup and rehearsals, and Grok Bot offers no "new conversation" outside its error screens. So the film covers everything above prompt 1 in the chat's background colour, tracked frame by frame (`video/track_bubble.py`, `video/mask.py`), until that history has scrolled away by itself.
- **Waiting is sped up, and labelled.** A "Sped up" badge shows whenever the take runs faster than real time: up to 6×, while Pantry works or renders cards. Answers and full-screen cards play in real time. The seven meal cards are re-timed between their real arrivals so that each lands on a beat, at about 2× overall.
- **The explainers are diagrams.** They're drawn for the film, not screenshots, but their numbers are the run's own. The brief: 93 plates, 6 sealed allergy plates, an 18:00 drop for a 19:30 serve, £512.33. The card: Visa •••• 5392, $93.58 at £1 = $1.3368, `test_charge`, closed. The logos are the services Pantry uses. The logos are fetched by `video/logos.sh` and aren't committed, because they're their owners' trademarks.
- **Data:** the organiser, past events and guests are demo data (the deck and the on-screen tag say so). The venue, the date and the providers are real. The payment is Agentcard's sandbox: a real single-use test card, no real money.

## Re-cutting it

Everything runs on this Mac: Node 20+, ffmpeg, Python 3, `uv` (for numpy, scipy and Pillow), Swift, Chrome's headless shell (`CHROME`), and `playwright-core` (`PLAYWRIGHT_CORE`). Work files go to `PANTRY_VIDEO_WORK` (default `/tmp/pantry-video`). Serve `story/` over HTTP for the renders, for example `python3 -m http.server 8765` from `story/`.

1. **Narration:** `ELEVENLABS_API_KEY=… VO_SPEED=1.06 python3 video/voiceover.py` makes `vo/*.wav` and the word timings in `vo/*.json`. Pass line ids to redo only some.
2. **Sound effects:** `ELEVENLABS_API_KEY=… python3 video/sfx.py` makes `sfx/*.wav` from `video/sfx.tsv`.
3. **Music and soundtrack:** `uv run --with numpy --with scipy python video/music.py` writes `music/mix.wav` (the score alone) and `music/soundtrack.wav` (with the narration).
4. **Logos and labels:** `zsh video/logos.sh`, then `node video/labels.mjs`. The labels are the "Live in Grok Bot" tag and the "Sped up" badge.
5. **Deck and explainers:** `node video/render.mjs "<url>" <out.mp4> <seconds> <w> <h> 2 [--keys=t:Key,…]` for each part. The deck parts and their URLs, keys and lengths are `score.DECK`, opened with `index.html?date=2026-10-22`, at 1920×1080 into `deck/`. The explainers are `video/explainers.html?s=connect|rules|agentcard` at 800×1080 into `explainers/`; the callback (`?s=callback`) is 1920×1080 into `deck/`. Use `--at=t1,t2` for stills.
6. **The live run:** `zsh video/record-run.sh` films Pantry's window. It takes about 4 minutes, with nobody at the Mac. Convert the take to 60 fps (`run/grok60.mp4`), then run `python3 video/track_bubble.py` and `python3 video/mask.py`. Both are tuned to the 23 Oct take's positions, so check them against a new take, along with `score.LIVE`'s source times.
7. **Edit:** `python3 video/build_video.py` builds `out/live.mp4`, `out/video.mp4` and `out/pantry-demo.mp4`. `plan` prints the live cut and its speeds.
