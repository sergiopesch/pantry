# Pantry: stage script (about 5:00), driven by the Stream Deck

Start the stage server once, from a terminal that has Accessibility access: `node story/streamdeck/stage.js`. Every Stream Deck key is a silent GET to it (`http://127.0.0.1:4321/key/<name>`), so no key app needs its own permission. One full-screen deck window (kiosk Chrome) changes in place and never reloads. Grok Bot is sized to whichever screen it's on.

Stream Deck profile **Pantry Demo** (MK.2, 5×3):

| Row | Key 1 | Key 2 | Key 3 | Key 4 | Key 5 |
|---|---|---|---|---|---|
| 1 | **Scene** | **Pantry** | **Grok Bot** | **Next prompt** | **Send** |
| 2 | **Connections** | **How it works** | **Agentcard** | **Grok full** | **Wrap** |
| 3 | **Prompt reset** | | | | **Reset deck** |

- **Scene / Pantry / Wrap / Reset deck:** the full-screen deck. Wrap comes in front of Grok Bot.
- **Grok Bot:** opens Pantry's chat (deep link) and fits Grok Bot to its screen, below the menu bar.
- **Next prompt / Send / Prompt reset:** `prompt.sh next|send|reset`. Next puts the next line of `prompts.txt` in Pantry's message box without sending, Send sends it, and Prompt reset starts again from prompt 1. They work through the accessibility API (`bin/grok`): no keystrokes and no clicks, so nothing can land in another app, and they refuse unless Pantry's chat is the one open.
- **Connections / How it works / Agentcard:** the panels, full screen. On a 16:9 screen they use a two-column layout; in a half-width window (`index.html#connect` at about 855×1087) the one-column layout.
- **Grok full:** back to Grok Bot, in front.

## Before you go on
- [ ] Press **Reset deck** (black) and **Prompt reset**.
- [ ] Grok Bot is on **Pantry**, with the `pantry-video` MCP server, Cognee and Notion connected.
- [ ] Rehearsal reset: in Pantry's chat, "Run node ~/pantry/src/cli.js event reset rehearsal, then reply Ready." It clears approvals, orders, briefs, quotes and choices, and keeps the event, guests and real providers.
- [ ] Optional: `tonight.env` with numbers you've actually counted.

---

## Run of show

Times are from the rehearsal and the filmed run on 23 Oct 2026.

| # | Key | Time | On screen | You say |
|---|---|---|---|---|
| 1 | **Scene** | 0:00–0:20 | The coeliac email, February, June, 41% in the bin (plays by itself) | [Silent over the email.] "February. Pizza for eighty. Forty-four came. The coeliac guest couldn't eat." "June. Ninety-six signed up. Fifty-one came. Forty-one percent, in the bin." |
| 2 | **Pantry** | 0:20–0:30 | "We order for who ~~signs up~~ shows up", then Pantry lands in its hat | "Too much food, and still not the right food, because we order for who signs up. Pantry orders for who shows up. It's a Grok Bot. Let me show you." |
| 3 | **Grok Bot**, then **Next prompt** | 0:30–0:40 | Pantry's chat. Prompt 1 appears in the box: the hack night, check past events, plan for who shows up, best local caterer | "This is the whole job in one sentence." Then **Send**. |
| 4 | **Connections** | 0:40–1:20 | "Where Pantry is connected" while Pantry works (about 35–50 s: Notion, Cognee, the engine, the plan card) | "Pantry has the event from Notion and the Luma guest export, with diets. It remembers every past event in Cognee. It found real local caterers, with sources. Logins come from 1Password and it never sees them. Payments go through Agentcard." **Grok full** when it answers: 93, not 140; Vanda's Kitchen plus sealed allergy plates from Sainsbury's; £512.33, £5.51 a plate; the plan card. |
| 5 | **Next prompt**, **Send** | 1:20–1:50 | Prompt 2: one card per meal, and who each one feeds (about 25–35 s, seven cards) | "One level deeper." Click the coeliac meal card to show it full screen: "Remember the email? Both coeliac guests get a sealed plate." |
| 6 | **Next prompt**, **Send** | 1:50–2:10 | Prompt 3: the brief, emailed to your own address, not the provider (about 25 s) | "Go ahead and contact them. For tonight it emails me, not the caterer." |
| 7 | **How it works** | 2:10–2:50 | Tools by job, four current cards, the rules | "Under the hood it's an engine with tools for each job: who's coming, what to serve, making it happen, and remembering. Answers come back as cards, one idea each, number first. And the rules: allergies planned at a hundred percent, nothing invented, every source linked, and no engine tool can pay." |
| 8 | **Next prompt**, **Send** | 2:50–3:00 | Prompt 4: the caterer confirmed and needs a £70 deposit. "Yes, pay the £70 deposit with Agentcard and ask them to invoice the balance." | "The caterer said yes, and asked for a deposit. So do I." |
| 9 | **Agentcard** | 3:00–3:50 | "How Pantry pays" while Pantry records the quote, raises the approval, makes one single-use sandbox card for exactly £70 (about $94 at the ECB rate), charges it once and confirms it (about 50 s) | "Pantry raises the request, bound to this plan, this amount and this payee. I say yes. Agentcard issues a single-use card for exactly that amount. It's charged once in sandbox, and then the card closes. Pantry never sees the number, and 1Password does the same for logins." **Grok full** for the receipt card: £70 deposit, £442.33 balance on their invoice, card closed. |
| 10 | **Wrap** | 3:50–4:15 | 93 / 47 / 0, then "Time for the community, not the logistics.", then brief out, quotes back, one card, one yes, then "Nobody should have to bring their own." | "Ninety-three plates, not a hundred and forty. Forty-seven never bought for empty chairs. Not one declared need without a safe plate. For community builders it's the same tools, agentic workflows and agentic payments, so organisers spend their time on the community, not the logistics. So the next time a guest asks if they should bring their own, nobody should have to." |
| 11 | (Wrap continues) | 4:15 | Pantry happy: "Order for who shows up." then "Thank you." | "Pantry. Order for who shows up. Thank you." |

**Payment line:** the yes in chat is the approval, and it names the amount. Agentcard's sandbox issues test cards up to $100.00 each, which is why the demo pays the deposit that holds the date, not the full order. Never point the audience to a phone.
**If a prompt misfires:** type it yourself from `story/streamdeck/prompts.txt`, or use Prompt reset and step again.
**If the bot is down:** use Grok full, then Terminal with `node src/cli.js event headcount`, `options`, `plan`, `inbox`. Say "Same engine Pantry calls." Don't fake a chat.

Deck URLs, for testing in a browser: `index.html#scene`, `#pantry`, `#wrap`, `#idle`, plus the panels `#connect`, `#tools`, `#agentcard`. A recording can pace the plays to its narration with `?pace=` or `?cues.<play>=<seconds,…>`, and pin the closing credit's date with `?date=YYYY-MM-DD`. The demo video's cuts and narration are in `story/VIDEO.md`.

---

## Appendix: the earlier rehearsed prompts (fallback)
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

**Do:** approve in Agentcard when it asks.
**Then type:** `Approved.`
**Pantry:** places the simulated order (sandbox `test_charge`), checks the transaction has settled, and confirms: "Paid £… on a single-use card. It's closed now."

**Say:** "Pantry can't approve anything. I said yes, the card paid once and died. Nothing else can be charged."

## Honesty notes
- Every number on screen comes from the **demo dataset** (`data/events/`): one fictional organiser's ten past events. The slides label it that way. There are no real-world statistics in the deck.
- The only date on the deck, in the closing credit, comes from the browser clock (en-GB, Europe/London), or from `?date=` (the video pins the hackathon, 22 October 2026). Nothing else on the deck is dated, and no venue is named.
- Little Feast, Hearth & Co, Mezze Collective, Slice Theory and Bao Down are fictional and appear only in past events. In the live demo the providers are real (Frank's, Route, Pique, Vanda's Kitchen, Sainsbury's), found with sources and their published prices.
- No real names appear on screen. "47" is simply 140 minus 93.

## Where the look comes from (Grok Bot.app 0.75)
- **Fonts:** `XVF` and `XVF Mono` (variable, weights 200–800), declared in `dist/renderer/assets/index-CEV-0tKx.css`. The app's sans stack is `'XVF', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` (in `index.eager-app-*.js`). They're copied to `story/assets/fonts/` (gitignored). Without them, the deck falls back to the system stack.
- **Type scale:** the app's heading-1 is 26/32 with −0.015em tracking, scaled up here for the stage with tighter tracking.
- **Bot colours:** from the avatar colour list in `index.eager-common-*.js`. Yellow is #FF9800 (Pantry), red #FF263C, green #00C972.
- **Text on dark:** #fcfcfc (`--sand-text-inverted`) and #f5f5f5a8 (secondary on dark).
- **The dome:** the shape generator in `index.eager-common-*.js` is `dome:()=>Ho(114,82,26)` with `B=114.2705`: a half-ellipse (rx 114, ry 138) on a base with 26-unit rounded corners. The eye capsules use the app's dome eye metrics `{width:.2132, height:.4674, gap:.47872, shiftY:.106}`, measured in units of B. The app renders bots in 3D (`dome:{kind:'revolve'}`). The deck draws the 2D silhouette with a soft shade, and its states (idle blink, thinking glance, happy eyes, landing) are hand-built in CSS.
- **The chef's hat:** drawn for Pantry (not from the bundle): a pleated band and a three-lobe puff in #FFFFFF with light grey shading, tilted 8° on the dome. It bounces once when Pantry lands and when it turns happy. The avatar files are `bot/assets/pantry-avatar.svg`, `pantry-avatar.png` (1024², transparent) and `pantry-avatar-black.png`.
