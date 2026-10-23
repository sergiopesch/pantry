# Pantry: the demo video (3:14)

The finished film is `Pantry demo.mp4` (1920×1080, 60 fps, H.264, AAC), with `Pantry demo.srt` and a poster frame. It's kept out of the repo because the repo is public; it lives in `~/Desktop/Pantry demo video/`. The MP4 also carries the subtitles as a soft English track.

## What it shows

| Time | Part | What's on screen |
|---|---|---|
| 0:00 | Scene | The coeliac guest's email, February (pizza for 80, 44 came), June (96 signed up, 51 came, 41% in the bin): the deck's `#scene` |
| 0:20 | The turn | "We order for who ~~signs up~~ shows up." Pantry lands in its hat: `#pantry` |
| 0:32 | Live in Grok Bot | Pantry's real chat, filmed on 23 Oct 2026 with the four prompts in `streamdeck/prompts.txt`, split with the deck's panels while Pantry works |
| 0:41 | Prompt 1 | Notion, past events in Cognee, the engine: 93 plates, not 140; Vanda's Kitchen plus sealed allergy plates from Sainsbury's; £512.33, £5.51 a plate; the plan card full screen |
| 1:15 | Prompt 2 | Seven meal cards, each saying exactly who it feeds; the coeliac meal full screen ("remember that email?") |
| 1:42 | Prompt 3 | The brief, emailed to the organiser's own inbox, while "How Pantry works" explains the tools and the rules |
| 2:12 | Prompt 4 | The caterer confirms and asks for a £70 deposit. One yes, one single-use Agentcard in sandbox ($93.58 at the ECB rate), charged once and closed; the receipt full screen |
| 2:46 | Wrap | 93 / 47 / 0, "Time for the community, not the logistics.", "Nobody should have to bring their own." Credit: 22 October 2026 |

Narration: ElevenLabs, voice "Lily" (UK), `eleven_multilingual_v2`, 19 lines in `video/narration.tsv`. Every claim matches what Pantry did in that run, as it reported afterwards: setup called Cognee recall, Notion (search, then the event page) and the engine, then rendered the plan card; the deposit called `pantry_quote_record`, `pantry_checkout_request`, `scripts/agentcard-pay.mjs`, `pantry_payment_confirm` and Gmail, then rendered the receipt. (An earlier rehearsal had skipped Cognee, so the memory line was only kept once a run used it.)

## Honesty notes
- **The chat is real.** Every message, card and number in the live part is Pantry's own output, filmed window-only. Nothing in the chat is drawn or retouched.
- **Older history is hidden.** Pantry's chat holds last night's setup and rehearsals, and Grok Bot offers no "new conversation" outside its error screens. So the film covers everything above prompt 1 in the chat's background colour, tracked frame by frame (`video/track_bubble.py`, `video/mask.py`), until that history has scrolled away by itself (about 0:55 into the live part).
- **Waiting is sped up, and labelled.** The parts where Pantry works run at 3× or 4×, with a badge on screen. Answers and cards play in real time. The plan card is held for two seconds.
- **Data:** the organiser, past events and guests are demo data (the deck and the on-screen tag say so). The venue, the date and the providers are real. The payment is Agentcard's sandbox: a real single-use test card, no real money.

## Re-cutting it

Everything runs on this Mac: Node 20+, ffmpeg, Python 3 with numpy, Swift, Chrome's headless shell (`CHROME`), and `playwright-core` (`PLAYWRIGHT_CORE`). Work files go to `PANTRY_VIDEO_WORK` (default `/tmp/pantry-video`).

1. **Narration:** `ELEVENLABS_API_KEY=… python3 video/voiceover.py` makes `vo/*.wav` and word timings `vo/*.json` (pass line ids to redo some).
2. **Deck parts, headless:** `node video/screencast.mjs "<index.html URL>" <dir> <seconds> <w> <h> <scale>` records the deck as frames; encode each with the frames' own durations. The cue times follow the narration:
   - `?date=2026-10-22&cues.scene=0,8.4,10.3,11.6,14.4,16.6,17.8#scene` (21.8 s, 1920×1080)
   - `?date=2026-10-22&cues.pantry=0,3.9,5.2,7.0#pantry` (11.8 s)
   - `?date=2026-10-22&cues.wrap=0,3.2,6.0,10.0,13.0,16.5,21.6,24.0#wrap` (27.5 s)
   - `#connect`, `#tools`, `#agentcard` at 800×1080, scale 2, saved as `deck/p-<name>.mp4`
3. **Labels:** `node video/labels.mjs` renders the "Live in Grok Bot" tag and the speed badges in the deck's fonts.
4. **The live run:** `zsh video/record-run.sh` films Pantry's window (about 4 minutes; nobody at the Mac). Convert it to 60 fps (`run/grok60.mp4`), then run `python3 video/track_bubble.py` and `python3 video/mask.py`. Both are tuned to the 23 Oct take's positions, so check them against a new take.
5. **Edit:** `python3 video/build_video.py plan` prints the timeline and where each line falls; `python3 video/build_video.py` builds `out/pantry-demo.mp4` and its subtitles. The cut list (`EDL`) and the line placements are at the top of the script.
