# Pantry

**You are what you shop.** Pantry is a Grok Bot that does a family's weekly Sainsbury's shop end to end. It predicts what runs out, builds one cart for three people with three sets of rules, clips the deals that matter, asks for Face ID before money moves, books a one-off slot, and quietly runs its own inbox. Its spine: it notices what you didn't.

This repo is Pantry's engine plus its app: the rich surface the bot opens from any chat (Grok mobile, Grok desktop, X DMs, Android). It shows the same conversation, cart and approvals wherever you are.

```
npm run demo                  # the app, on http://127.0.0.1:4217
HOST=0.0.0.0 npm run demo     # also on your phone: prints a pairing link for the same Wi-Fi
npm test                      # 46 tests, ~1 s, zero dependencies (Node 20+)
node src/cli.js say "why no pizza?"   # talk to Pantry from the terminal
npm run mcp                   # the bot's MCP tool server (stdio)
```

Brand sheet: http://127.0.0.1:4217/brand.html

## The app

| Tab | What it does |
|---|---|
| **Today** | The morning brief. The 6:02 AM notice (*"Eggs run out Thursday night"*) over a live egg carton showing 9 of 12 left; *Why?* shows the eight weeks of baskets behind it. Next delivery, the cart by person, the basket insight, inbox health, and next week's deal. |
| **Chat** | One conversation across Grok mobile, Android, X DMs and desktop. It understands plain English and acts on it: *"she's asking for blueberries"*, *"why no pizza?"*, *"cheaper eggs"*, *"drop the coffee"*, *"OK, buy it"*. Replies carry cards: products, approvals, delivery, deals. |
| **Cart** | Split by person (Everyone · Grown-ups · Little one). Shows the usual-vs-today's-pick card, steppers, swaps, treats left off, and what isn't needed yet. *Review one by one* opens a swipeable card stack. *Pay* turns into the Agentcard approval in place, not in a modal: Face ID, then the single-use card dies. |
| **Inbox** | Pantry's own address. What needs you (keep or refund the substituted yoghurt), refund cases ready to file, what it learned (bananas went missing twice, so loose from now on), and everything handled quietly. |
| **Home** | The household's rules, the basket drift since Saturday 3 October with one-tap bring-backs, Connections (honest status for Sainsbury's, 1Password, Agentcard, the inbox, Grok), and delivery preferences. |

The household clock drives everything: messages, the lock screen, and order progress (booked → being picked → on its way → delivered).

## On stage

On a laptop or projector, the phone stands on the kitchen counter at golden hour. Keys **0–9** map to the ten beats, one Stream Deck button each. Pressing a beat's key again (or →, space, or a clicker) steps through it. Every key does something real in the app.

| Key | Beat | What happens in the app |
|---|---|---|
| 0 | Opening | App icon, wordmark, *You are what you shop.* |
| 1 | Hook | Lock screen at Tue 6:02 AM with Pantry's notification → tap → Today → *Why?* |
| 2 | Split household | Cart, grouped by person |
| 3 | Identity | Home → the drift since Saturday 3 October |
| 4 | Trust | Home → Connections: 1Password, Agentcard Vault |
| 5 | Continuity | Clock to 7:12 PM; the chat fills with the day's thread |
| 6 | Visual layer | The usual-vs-pick card → the swipeable review |
| 7 | Close the loop | Pay → Face ID → card dies → delivery → on its way → delivered → inbox |
| 8 | Deals | Next week's Nectar six-pack → Switch → £1.10 off |
| 9 | Vision | *Same engine. Household to a room of fifty.* |

**A** runs the whole arc hands-free; it measures **2:45**. **N** shows presenter captions (off by default), **H** hides the presenter strip, **F** goes full screen, **Shift+R** resets. Note that the spec's per-beat budget adds up to 4:00 and leaves out the identity beat; this is the version that fits in three minutes.

## What's real, what's stubbed

| | Status |
|---|---|
| Prediction, cart, lanes, chat intents, deals, slot choice, inbox triage, drift detection | **Real code**, running on fake history (17 shops, 24 Aug – 19 Oct 2026) |
| Egg names, prices, product URLs | **Live** from sainsburys.co.uk, 22 Oct 2026 |
| Other prices and names | **Estimates** (`source: "estimate"`), flagged in the cart's fine print |
| Product photos | **Illustrations**, since no CDN URLs are captured yet. `npm run snippet` plus `catalog import` swaps in the real ones |
| Payment | **Demo driver**: same approval gate, no money moves. The Agentcard driver throws `NOT_WIRED` rather than guessing an API |
| Order placement, slot booking, case filing | **Stubbed**, each behind explicit approval |
| Pantry's inbox | **Fixture mail** until the address exists |

**Anti-bot, measured 22 Oct:** plain HTTP → 403 (Akamai) on request 1; a real headed Chrome loaded fine; headless Chromium → 403 on page load 1. Per the spec, testing stopped there.

## How it works

`src/predict.js` learns consumption from baskets: a midweek top-up means *we ran out*. `src/household.js` decides who eats what (the child wins on staples, the grown-ups on treats). `src/cart.js` covers the week after delivery using the pack sizes the household already buys. `src/chat.js` turns plain English into the same verbs the bot uses through MCP. `src/deals.js` clips only what's predicted. `src/delivery.js` books the latest one-off slot that still lands before the first run-out. `src/vault.js` is the payment gate. `src/inbox.js` triages, drafts cases and learns. `src/identity.js` finds the date the basket shifted. `src/narrate.js` writes Pantry's voice from live numbers. `src/server.js`, `src/cli.js` and `src/mcp.js` are three doors into one engine and one state file.

`web/` is the app: `brand.js` (the bowl character, app icon, monoline wordmark), `icons.js` (round, no arrowheads), `art.js` (product illustrations), `app.js` / `app.css`.

**Security as built:**
- The MCP server has no approve, charge or file-case tool.
- A cart edit after the request voids the approval.
- A booked slot can't be paid twice.
- The server binds to 127.0.0.1. Bound wider, every API call needs a pairing key.
- No credentials anywhere in the repo.

## Wiring the bot

See [`bot/SETUP.md`](bot/SETUP.md). The system prompt is in `bot/system-prompt.md`, nine skills are in `bot/skills/`, and the routine is in `bot/routines/weekly-shop.md`. Progress and open items: [`TASKS.md`](TASKS.md).
