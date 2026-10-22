# Pantry: stage script (3:00)

Open `story/index.html` in Chrome, press **F** for fullscreen, and **N** if you want your notes on the laptop screen.
Clicker: Right, Space, PageDown and Enter go forward. Left, PageUp and Backspace go back.
Sections: **1** opening, **2** live hand-off, **3** close. **R** resets the timer in the notes.

| Part | Slide | Target | Running |
|---|---|---|---|
| Opening | 1 The email | 0:10 | 0:10 |
| | 2 February | 0:10 | 0:20 |
| | 3 June | 0:13 | 0:33 |
| | 4 The turn | 0:12 | 0:45 |
| Hand-off | 5 Live in Grok Bot | 0:05 | 0:50 |
| **Live demo** | Grok Bot app | **1:40** | 2:30 |
| Close | 6 What changed | 0:10 | 2:40 |
| | 7 Vision | 0:10 | 2:50 |
| | 8 Last line | 0:08 | 2:58 |

`[click]` means one press. Each slide's builds are listed in order.

---

## Opening (45 s)

**1 · The email** (it types itself on arrival; don't click until it finishes)
> [Silence while it types. Let the last line land.]
> "If you've ever run a meetup, you've had this email."

**2 · February** (2 clicks)
> "February. One organiser's year. Pizza for eighty." [click] "Forty-four came." [click]
> "And the coeliac guest couldn't eat a thing. Shared oven."

**3 · June** (3 clicks; the dots are the 96 sign-ups)
> "June. Ninety-six signed up, so we ordered for ninety-six." [click]
> "Fifty-one came." [click]
> "Forty-one percent of the food went in the bin." [beat] [click]
> "And still, the vegan pizzas were gone by ten past seven."

**4 · The turn** (3 clicks)
> "Too much food, and still not the right food. Because we order for who signs up." [click: the red strike]
> [click] "Pantry orders for who shows up." [click: Pantry lands]
> "Pantry is a Grok Bot that plans the food for your event."

**5 · Live in Grok Bot**
> "It isn't an app. It's a Grok Bot. Let me show you."
> [Switch to the Grok Bot app: Cmd+Tab.]

---

## Live demo in Grok Bot (1:40)

### Before you go on stage
- [ ] Grok Bot is open on **Pantry**, in a fresh chat. The window is maximised and the text is large enough to read from the back (Cmd + a couple of times).
- [ ] The Pantry MCP and Cognee are connected. Ask once, off stage: "How many signed up?" The answer should say 140.
- [ ] If you rehearsed a payment, reset the engine: `node src/cli.js event reset`.
- [ ] Your phone is unlocked, with Grok Bot open and notifications on, ready for the approval. Put it under the document camera or hold it up.
- [ ] A Terminal window is open at the repo, hidden behind Grok Bot. It's for the fallbacks below; every fallback command is read-only except `pay`.
- [ ] The deck is in another Chrome window, already on slide 5, so Cmd+Tab gets you back.

Type the prompts exactly as written. Pantry's wording will vary; the **numbers** shouldn't. They come from the engine (`src/cli.js event …`), and these are the values it returns today.

### Beat 1 · Who's coming (0:00–0:20)
**Type:** `How many should I plan for on Thursday?`

**Pantry should say:** "140 signed up. Your last 10 events point to 60% turning up, so I'm planning for 93, not 140. Six allergy or coeliac guests get sealed plates regardless."

**While it thinks:** "It's reading the Luma guest export and my last ten events."
**Land it:** "Ninety-three. Not a hundred and forty."
**Fallback:** "Pantry's thinking. It'll tell you ninety-three, not a hundred and forty. Sixty percent of my sign-ups actually come." Then show `node src/cli.js event headcount` in Terminal.

### Beat 2 · What we're serving (0:20–0:50)
**Type:** `What are we serving?`

**Pantry should say:** "Little Feast. 93 plates, £995.50 of your £1,000. Sainsbury's is £446.50 cheaper, but gluten-free ran out with them last time."

**Then type:** `Why not pizza?`
**Pantry should say:** "Slice Theory has no safe option for coeliac. Two guests would go without." It may add that six of the eight options fail on a declared need (four on coeliac, two on nut allergy plus vegan).

**Land it:** "It threw out six of eight options, because somebody would have gone without."
**Fallback:** "It picks Little Feast, nine ninety-five fifty on a thousand-pound budget. Pizza's out: two coeliac guests would go without." Then show `node src/cli.js event options`.

### Beat 3 · What it caught (0:50–1:15)
**Type:** `Check my inbox.`

**Pantry should say:** "Three need you. Little Feast offered 18:45, but the venue stops deliveries at 18:00, so the brief asks for 6. A coeliac guest asked if there'll be anything safe. I've drafted: 'Yes. Sealed coeliac-safe plates, on their own table.' It sends on your yes. And the sponsor wants a PO number."

**Land it:** "Remember the email from the start? That's the reply." (This is the payoff of the opening. Don't skip it.)

**Only if you're under 1:05 here. Type:** `Anything I should know about caterers from past events?`
**Pantry should say (from Cognee):** "Hearth & Co billed £70 over the quote in April, for a service-staff line nobody agreed to." It may add that the brief asks Little Feast to confirm the total.
**Say:** "That's Cognee: Pantry's memory of every past event."

**Fallback:** "It read the venue's email, deliveries before six, and caught that the caterer's quote said six forty-five." Then show `node src/cli.js event inbox`.

### Beat 4 · Brief and payment (1:15–1:35)
**Type:** `Send the brief and pay Little Feast.`

**Pantry should say:** "Brief's drafted. It goes out on your yes. Ready to pay Little Feast £995.50 for 93. Approve on your phone."

**Do:** show the phone and approve. **Say:** "Single-use card. Nothing moves without a human yes."
**Pantry should then say:** "Paid £995.50. Lands by 6." It only says "paid" once the status reads charged.

**Fallback (no approval arrives):** "The approval goes to my phone. Pantry can't approve anything itself." Run `node src/cli.js event pay` in Terminal, then `node src/cli.js event status`, and say: "There it is, waiting for my yes." Don't run `approve` on stage unless you say out loud that it's the stub.

### Beat 5 · After (1:35–1:40), only if time allows
**Say:** "Fast-forward to Friday morning."
**Type:** `Debrief: 90 came, 8% left over, nothing ran out, 4.7.`
**Pantry should say:** a short learning: the show rate moves up a little, Little Feast stays top, and the note goes to memory. The wording will vary.
**Fallback:** skip it. "After every event it debriefs, and the next plan gets better."

**Back to the deck:** Cmd+Tab, then press **3**.

> If the bot is down completely: stay on slide 5 and run beats 1 to 4 in Terminal with `node src/cli.js event headcount`, `options`, `plan`, `inbox` and `brief`. Say "Same engine Pantry calls. The Bot is having a moment." Don't fake a chat.

---

## Close (30 s)

**6 · What changed** (2 clicks; a 3rd if `?came=` is set, see below)
> "Ninety-three plates, not a hundred and forty." [click]
> "Forty-seven never bought for empty chairs." [click]
> "And not one declared need without a safe plate."

**7 · Vision** (1 click)
> "Pantry is a public Grok Bot template. Any organiser imports it, and it learns their room." [click]
> "And it speaks commerce. A structured brief goes out. Quotes come back. A single-use card pays, only on a human yes."

**8 · Last line** (1 click)
> "So the next time a guest asks if they should bring their own" [beat] "nobody should have to." [click]
> "Pantry. Order for who shows up. Thank you."

---

## Optional "tonight" number
`index.html?came=118&signed=190` adds one more build to slide 6: "Tonight, in this room: 190 signed up. 118 came." Use `?came=118` alone for "118 came." Without the parameter, nothing about tonight appears. **Only use it with a number you've actually counted.**
Other parameters: `?notes=1` opens with notes on. `#6.2` jumps straight to slide 6, build 2.

## Honesty notes
- Every number on screen comes from the **demo dataset** (`data/events/`): one fictional organiser's ten events, Jan–Sep 2026. The slides label it that way. There are no real-world statistics in the deck.
- Little Feast, Hearth & Co, Mezze Collective, Slice Theory and Bao Down are fictional. The supermarkets appear only as examples in the live demo, with estimated prices.
- No real names appear on screen. The archive mentions a volunteer by name (March); the deck doesn't use it.
- "47" on slide 6 is simply 140 minus 93.

## Where the look comes from (Grok Bot.app 0.75)
- **Fonts:** `XVF` and `XVF Mono` (variable, weights 200–800), declared in `dist/renderer/assets/index-CEV-0tKx.css`. The app's sans stack is `'XVF', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` (in `index.eager-app-*.js`). They're copied to `story/assets/fonts/` (gitignored). Without them, the deck falls back to the system stack.
- **Type scale:** the app's heading-1 is 26/32 with −0.015em tracking, scaled up here for the stage with tighter tracking.
- **Bot colours:** from the avatar colour list in `index.eager-common-*.js`. Yellow is #FF9800 (Pantry), red #FF263C, green #00C972.
- **Text on dark:** #fcfcfc (`--sand-text-inverted`) and #f5f5f5a8 (secondary on dark).
- **The dome:** the shape generator in `index.eager-common-*.js` is `dome:()=>Ho(114,82,26)` with `B=114.2705`: a half-ellipse (rx 114, ry 138) on a base with 26-unit rounded corners. The eye capsules use the app's dome eye metrics `{width:.2132, height:.4674, gap:.47872, shiftY:.106}`, measured in units of B. The app renders bots in 3D (`dome:{kind:'revolve'}`). The deck draws the 2D silhouette with a soft shade, and its states (idle blink, thinking glance, happy eyes, landing) are hand-built in CSS.
