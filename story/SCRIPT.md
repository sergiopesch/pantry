# Pantry: stage script (3:00), driven by the Stream Deck

One key per segment, left to right on the top row of the Stream Deck profile **Pantry Demo**:

| # | Key | What it does | Length | Running |
|---|---|---|---|---|
| 1 | **Scene** | Opens the deck full screen and plays the opening by itself: the coeliac email, February, June, then 41% in the bin. | 0:20 | 0:20 |
| 2 | **Pantry** | Plays the turn by itself: "We order for who ~~signs up~~ shows up", then Pantry lands in its chef's hat. It ends on a still. | 0:10 | 0:30 |
| 3 | **Grok Bot** | Switches to the Grok Bot app on Pantry's chat (`grokbot://app/v1/agent?id=5ab715a0-…`). You drive the conversation. | ~2:10 | 2:40 |
| 4 | **Wrap** | Brings the deck back and plays the close by itself: 93 / 47 / 0, then the template and agentic commerce, then "Nobody should have to bring their own." | 0:20 | 3:00 |
| 5 | **Reset** | Reloads the deck at the start, idle: black, nothing playing. Press it before you go on. | | |

Nothing needs a click once a key is pressed. While a segment plays, **Right/Space** skips to its next cue and **Left** steps back one cue and pauses. With no Stream Deck, the same segments open from the browser at `story/index.html#scene`, `#pantry`, `#wrap` or `#idle`. Plain `index.html` opens idle, and Right then steps through every slide by hand.

---

## Before you go on
- [ ] Press **Reset**. The projector should show black.
- [ ] Grok Bot is open on **Pantry**, in a fresh chat. The window is maximised and the text is large enough to read from the back.
- [ ] The Pantry MCP and Cognee are connected. Ask once, off stage: "How many signed up?" The answer should say 140.
- [ ] If you rehearsed a payment, reset the engine: `node src/cli.js event reset`.
- [ ] Payment on stage: Pantry raises the request and it stays pending. It needs your approval in Grok Bot, and it's fine to leave it unapproved (the caterer is fictional).
- [ ] A Terminal window is open at the repo, behind Grok Bot, for the fallbacks. Every fallback command is read-only except `pay`.
- [ ] Optional live number: put `CAME=…` (and `SIGNED=…`) in `story/streamdeck/tonight.env`, but **only numbers you've actually counted**. The Wrap key then adds "Tonight, in this room" to the close.

---

## 1 · Scene (20 s, plays by itself)
| Time | On screen | You say |
|---|---|---|
| 0:00 | The guest's email types itself; "bring my own?" lands in yellow | Nothing. Let it land. |
| 0:07 | February: "Pizza for 80." "44 came." "The coeliac guest couldn't eat." | "February. Pizza for eighty. Forty-four came. And the coeliac guest couldn't eat a thing." |
| 0:12 | June: 96 dots, then "51 came" as 45 empty out | "June. Ninety-six signed up. Fifty-one came." |
| 0:16 | "41% of the food in the bin." Holds to 0:20 | "Forty-one percent, in the bin." [beat] |

## 2 · Pantry (10 s, plays by itself)
| Time | On screen | You say |
|---|---|---|
| 0:00 | "We order for who signs up." | "Too much food, and still not the right food. Because we order for who signs up." |
| 0:02 | Red strike, then "Order for who shows up." | "Pantry orders for who shows up." |
| 0:05 | Pantry lands (dome, hat bounce): "A Grok Bot that plans the food for your event." Holds still | "Pantry is a Grok Bot that plans the food for your event. Let me show you." |

## 3 · Grok Bot (live, about 2:00)
Press **Grok Bot**. Type the prompts exactly as written. Everything Pantry says now is live:
- the real date and the venue's real address;
- real providers near the venue, with Sainsbury's prices it checked in its own browser;
- Cognee for memory, Notion for the events, and Agentcard's sandbox for the payment.

Only the past events and the upcoming event's guest list are demo data. Prices can move, so **don't quote a number before Pantry does.** Say "a demo organiser's data" once, at the start of this section.

### Beat 1 · The event (0:00–0:20)
**Type:** `What's my next event, and how many should I plan for?`

**Pantry says (from Notion + the engine):** Grok Builders Hack Night, next Thursday, at Expedite London HQ, 7 Lyric Square, W6. 140 signed up; past events point to 60%, so plan for 93. Six allergy or coeliac guests get sealed plates regardless.

**If it doesn't show a card, type:** `Show me.` It renders the headcount card: 93 big, bars for 140 / 84 / 93, turnout at the last 10 events.
**Land it:** "Ninety-three. Not a hundred and forty."

### Beat 2 · What we're serving (0:20–1:00)
**Type:** `What are we serving?`

**Pantry says:** it checked real caterers that deliver to W6, and none of them can guarantee a safe plate for the two coeliac guests and the nut-allergy guests. So the pick is Sainsbury's, with tonight's prices: about £240 for 93 plates. The six allergy plates are sealed, labelled and on their own table. It shows the **plan card**: total, budget bar, plates by lane.

**Land it:** "Real caterers, real menus, real prices, checked tonight. It turned down every one that would have left somebody without a safe plate."
**Payoff (don't skip):** "Remember the email from the start? That guest gets a sealed sandwich labelled 'suitable for coeliacs'."

### Beat 3 · What it remembers (1:00–1:20)
**Type:** `Anything I should know from past events?`

**Pantry says (from Cognee):**
- Gluten-free ran out with Sainsbury's in July, so it has added a buffer.
- Hearth & Co billed £70 over its quote in April.
- Vegan ran out twice, at Bao Down and Slice Theory.

**Say:** "That's Cognee: Pantry's memory of every event I've run. The plans get better every time."

### Beat 4 · Order it (1:20–1:55)
**Type:** `Order it. Send the brief to me first.`

**Pantry:**
1. Emails the brief to your own address, not to a business.
2. Raises the payment request.
3. Creates a **single-use Agentcard** for the amount (sandbox).
4. Asks you to approve it in Agentcard.

**Do:** approve in Agentcard, on your phone or the dashboard.
**Then type:** `Approved.`
**Pantry:** places the simulated order (sandbox `test_charge`), checks the transaction has settled, and confirms: "Paid £… on a single-use card. It's closed now."

**Say:** "Pantry can't approve anything. I said yes, the card paid once and died. Nothing else can be charged."

If you're past 2:30 overall, skip Beat 3 and press **Wrap**.

> If the bot is down completely: `node src/cli.js event headcount`, then `options` and `plan`, in Terminal. Say "Same engine Pantry calls. The Bot is having a moment." Don't fake a chat.

## 4 · Wrap (about 20 s, plays by itself)
| Time | On screen | You say |
|---|---|---|
| 0:00 | **93** (plates, not 140) | "Ninety-three plates, not a hundred and forty." |
| 0:02 | **47** (never bought for empty chairs) | "Forty-seven never bought for empty chairs." |
| 0:04 | **0** (declared needs without a safe plate) | "And not one declared need without a safe plate." |
| (0:06) | Only with `tonight.env` set: "Tonight, in this room…" | Read the number. |
| 0:07 | "A public Grok Bot template." | "Pantry is a public Grok Bot template. Any organiser imports it, and it learns their room." |
| 0:09.5 | Brief out, Quotes back, One card, one yes | "And it speaks commerce. A structured brief goes out, quotes come back, and a single-use card pays only on a human yes." |
| 0:14.5 | "Nobody should have to bring their own." | "So the next time a guest asks if they should bring their own" [beat] "nobody should have to." |
| 0:17 | Pantry, happy: "Order for who shows up." | "Pantry. Order for who shows up. Thank you." |

With `tonight.env` set, everything after 0:04 shifts about 2 s later.

---

## Keys on the laptop (fallback for the Stream Deck)
Right / Space / PageDown / Enter go forward, Left / PageUp go back, F is fullscreen (in a normal browser window), N shows notes with timers, 1/2/3 jump to the opening, hand-off and close, Home and End go to the start and end. The kiosk window has no browser UI; Cmd+Q closes it.

## How the keys work (story/streamdeck/)
- Each key is the Stream Deck's built-in **System: Open** action, pointing at a small AppleScript applet in `story/streamdeck/` (`Pantry Scene.app`, `Pantry Pantry.app`, `Pantry Grok Bot.app`, `Pantry Wrap.app`, `Pantry Reset.app`). Each one runs `deck.sh <mode>`.
- `deck.sh scene|pantry|wrap|idle` opens `story/index.html#<mode>` in a separate, full-screen (kiosk) Chrome with its own profile (`~/Library/Application Support/PantryDeckChrome`), so your normal Chrome is untouched and no permissions are needed. Every press loads the deck fresh. Old tabs pile up behind it, which is harmless.
- `deck.sh grok` opens the Pantry deep link and brings Grok Bot forward.
- `Pantry Demo.streamDeckProfile` is the same profile as a file. Double-click it to import if the profile isn't listed.

## Honesty notes
- Every number on screen comes from the **demo dataset** (`data/events/`): one fictional organiser's ten past events. The slides label it that way. There are no real-world statistics in the deck.
- The only date on screen, in the closing credit, comes from the browser clock (en-GB, Europe/London). Nothing else is dated, and no venue is named.
- Little Feast, Hearth & Co, Mezze Collective, Slice Theory and Bao Down are fictional and appear only in past events. In the live demo the providers are real, found tonight with sourcesd prices.
- No real names appear on screen. "47" is simply 140 minus 93.

## Where the look comes from (Grok Bot.app 0.75)
- **Fonts:** `XVF` and `XVF Mono` (variable, weights 200–800), declared in `dist/renderer/assets/index-CEV-0tKx.css`. The app's sans stack is `'XVF', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` (in `index.eager-app-*.js`). They're copied to `story/assets/fonts/` (gitignored). Without them, the deck falls back to the system stack.
- **Type scale:** the app's heading-1 is 26/32 with −0.015em tracking, scaled up here for the stage with tighter tracking.
- **Bot colours:** from the avatar colour list in `index.eager-common-*.js`. Yellow is #FF9800 (Pantry), red #FF263C, green #00C972.
- **Text on dark:** #fcfcfc (`--sand-text-inverted`) and #f5f5f5a8 (secondary on dark).
- **The dome:** the shape generator in `index.eager-common-*.js` is `dome:()=>Ho(114,82,26)` with `B=114.2705`: a half-ellipse (rx 114, ry 138) on a base with 26-unit rounded corners. The eye capsules use the app's dome eye metrics `{width:.2132, height:.4674, gap:.47872, shiftY:.106}`, measured in units of B. The app renders bots in 3D (`dome:{kind:'revolve'}`). The deck draws the 2D silhouette with a soft shade, and its states (idle blink, thinking glance, happy eyes, landing) are hand-built in CSS.
- **The chef's hat:** drawn for Pantry (not from the bundle): a pleated band and a three-lobe puff in #FFFFFF with light grey shading, tilted 8° on the dome. It bounces once when Pantry lands and when it turns happy. The avatar files are `bot/assets/pantry-avatar.svg`, `pantry-avatar.png` (1024², transparent) and `pantry-avatar-black.png`.
