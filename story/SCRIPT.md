# Pantry: stage script (about 5:00), driven by the Stream Deck

Stream Deck profile **Pantry Demo** (MK.2, 5×3):

| Row | Key 1 | Key 2 | Key 3 | Key 4 | Key 5 |
|---|---|---|---|---|---|
| 1 | **Scene** | **Pantry** | **Grok Bot** | **Next prompt** | **Send** |
| 2 | **Connections** | **How it works** | **Agentcard** | **Grok full** | **Wrap** |
| 3 | **Prompt reset** | | | | **Reset deck** |

- **Scene / Pantry / Wrap / Reset deck:** the full-screen deck (kiosk Chrome). Wrap is pulled in front of Grok Bot.
- **Grok Bot:** opens Pantry's chat (deep link) and makes Grok Bot full width (0,25, 1710×1087).
- **Next prompt / Send / Prompt reset:** `prompt.sh next|send|reset`. Next types the next line of `prompts.txt` into Pantry's chat box without sending, Send sends it, and Prompt reset starts again from prompt 1.
- **Connections / How it works / Agentcard:** the split view. The deck panel opens on the LEFT half (0–855) and Grok Bot moves to the RIGHT half (855–1710).
- **Grok full:** Grok Bot goes back to full width and to the front; the panel stays behind.

## Before you go on
- [ ] Press **Reset deck** (black) and **Prompt reset**.
- [ ] Grok Bot is on **Pantry**, in a fresh chat, with the MCP and Cognee connected.
- [ ] **Press every key once off stage.** macOS asks once per key app for Accessibility, which moving or typing into Grok Bot needs: System Settings, Privacy & Security, Accessibility, then allow "Pantry …". Until you do, Connections, How it works, Agentcard, Grok full, Next prompt and Send can't move or type into Grok Bot.
- [ ] Optional: `tonight.env` with numbers you've actually counted.

---

## Run of show

| # | Key | Time | On screen | You say |
|---|---|---|---|---|
| 1 | **Scene** | 0:00–0:20 | The coeliac email, February, June, 41% in the bin (plays by itself) | [Silent over the email.] "February. Pizza for eighty. Forty-four came. The coeliac guest couldn't eat." "June. Ninety-six signed up. Fifty-one came. Forty-one percent, in the bin." |
| 2 | **Pantry** | 0:20–0:30 | "We order for who ~~signs up~~ shows up", then Pantry lands in its hat | "Too much food, and still not the right food, because we order for who signs up. Pantry orders for who shows up. It's a Grok Bot. Let me show you." |
| 3 | **Grok Bot**, then **Next prompt** | 0:30–0:45 | Pantry's chat, full width. Prompt 1 appears in the box: the hack night, check past events, plan for who shows up, best local caterer | "This is the whole job in one sentence." Then **Send**. |
| 4 | **Connections** | 0:45–1:30 | LEFT: "Where Pantry is connected" (Pantry at the centre: Notion, Cognee, Luma, web and places, Sainsbury's, 1Password, Agentcard, Grok Bot). RIGHT: Pantry working | "While it works: Pantry reads the organiser's events in Notion and the Luma guest export, with diets. It remembers every past event in Cognee. It searches the web for real local caterers, live. Logins come from 1Password and it never sees them. Payments go through Agentcard." Land it on Pantry's answer: the headcount (planned for who shows up, not the sign-ups) and the caterer it picks. |
| 5 | **Next prompt**, **Send** | 1:30–2:00 | Prompt 2: one level deeper, one card per meal | "One level deeper." The meal cards arrive as images. Use **Grok full** if you want them bigger. |
| 6 | **Next prompt**, **Send** | 2:00–2:15 | Prompt 3: contact them. The brief is emailed to your own address, not the provider | "Go ahead and contact them. For tonight it emails me, not the caterer." |
| 7 | **How it works** | 2:15–3:00 | LEFT: "How Pantry works": tools by job, three card thumbnails, the rules | "Under the hood it's an engine with tools for each job: who's coming, what to serve, making it happen, and remembering. Answers come back as cards, one idea each, number first. And the rules: allergies planned at a hundred percent, nothing invented, every source linked, and no tool can pay." |
| 8 | **Next prompt**, **Send** | 3:00–3:20 | Prompt 4: the simulated reply (coeliac meals sealed, delivery to W6 by 6 PM at the price). "Yes, pay them with Agentcard and request the invoice." | "The caterer said yes. So do I." |
| 9 | **Agentcard** | 3:20–4:00 | LEFT: "How Pantry pays": 5 steps, "Pantry never sees a card number. It can't approve." "Sandbox tonight" | "Pantry raises the request, bound to this plan, this amount and this provider. I say yes. Agentcard issues a single-use card for exactly that amount. Tonight the charge is simulated in sandbox, and then the card closes. Pantry never sees the number, and 1Password does the same for logins." Approve when Grok Bot asks. |
| 10 | **Wrap** | 4:00–4:25 | 93 / 47 / 0, then "Time for the community, not the logistics.", then brief out, quotes back, one card, one yes, then "Nobody should have to bring their own." | "Ninety-three plates, not a hundred and forty. Forty-seven never bought for empty chairs. Not one declared need without a safe plate. For community builders it's the same tools, agentic workflows and agentic payments, so organisers spend their time on the community, not the logistics. So the next time a guest asks if they should bring their own, nobody should have to." |
| 11 | (Wrap continues) | 4:25 | Pantry happy: "Order for who shows up." then "Thank you." | "Pantry. Order for who shows up. Thank you." |

**Payment line:** Pantry raises the payment and it waits for your approval in Grok Bot. Never point the audience to a phone.
**If a prompt misfires:** type it yourself from `story/streamdeck/prompts.txt`, or use Prompt reset and step again.
**If the bot is down:** use Grok full, then Terminal with `node src/cli.js event headcount`, `options`, `plan`, `inbox`. Say "Same engine Pantry calls." Don't fake a chat.

Deck URLs, for testing in a browser: `index.html#scene`, `#pantry`, `#wrap`, `#idle`, plus the panels `#connect`, `#tools`, `#agentcard` (designed for an 855×1087 window).

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
