# Pantry

**Order for who shows up.** Pantry is a custom Grok Bot for people who run community events: meetups, hackathons, socials. It plans the catering for the people who actually turn up. Its job is safe, on budget, on time, and nothing in the bin.

It isn't an app. You talk to Pantry in Grok Bot (desktop, mobile, X DMs). It works through Grok Bot's real features: persona, skills, routines, its own email, a 1Password vault, Link payments and voice. Its hands are this repo's MCP server, and its long-term memory is Cognee.

## What it does

1. **Who's coming.** Reads the Luma guest export: sign-ups and what guests declared about diet. It forecasts turnout from the organiser's past events (check-ins vs sign-ups). Allergies and coeliac are planned at 100%, whatever the forecast.
2. **What to serve.** Compares supermarkets (Sainsbury's, Waitrose, M&S), event caterers and restaurants. An option is out if any guest with a declared need would go without a safe plate, if it breaks the budget, if it can't land in time, or if it doesn't deliver to the venue's area. The rest are ranked on rating, punctuality, cost per expected guest, and what ran out before.
3. **Logistics.** The food lands 45 minutes before serving, or earlier if the venue says so. Pantry reads the venue's email and catches a quote that would miss the cut-off.
4. **Brief and pay.** It drafts the brief for the provider. Payment is an approval on the organiser's phone with a single-use card. Pantry can't approve, pay, send or file anything by itself.
5. **After.** A debrief updates the show rate and the provider ledger. Lanes that ran out get a buffer next time, and providers that ran late get an earlier drop.

```
npm test                              # 58 tests, zero dependencies (Node 20+)
node src/cli.js event headcount       # 140 signed up → plan for 93
node src/cli.js event options         # every provider, and why each is in or out
node src/cli.js event plan            # plates by lane, cost, logistics
node src/cli.js event inbox           # Pantry's own inbox, triaged
npm run mcp                           # the bot's MCP tool server (stdio)
```

## How the pieces connect

| Piece | How it's real |
|---|---|
| **Grok Bot** | `bot/persona.md` (under the 4,000-character limit), ten skills, the event countdown routine, and the profile (dome character, yellow, voice). Setup steps with checks: `bot/SETUP.md` |
| **Luma** | Grok Bot has no Luma connector. Pantry reads Luma's guest CSV export, which works on any plan. With Luma Plus it reads the public API instead (`src/events/luma-api.js`; the key is stored as a Grok Bot secret) |
| **Cognee** | The memory of past events: guest exports, quotes, invoices and debriefs as a knowledge graph in Cognee Cloud. The bot connects to Cognee's hosted MCP. The engine does the arithmetic; Cognee answers "what happened, and why" |
| **Payments** | Grok Bot's Link card behind an explicit approval. The engine's driver is a stub: same approval flow, no money moves |

## What's real, what's dummy

- **Dummy data:** the organiser's ten past events (`data/events/archive/`) and tonight's guest list. Guests, names and emails are made up.
- **Providers:** supermarket brands are real, but their prices are estimates. The caterers and restaurants (Little Feast, Hearth & Co, Mezze Collective, Slice Theory, Bao Down) are fictional examples.
- **Diets:** they come only from what guests declare. Pantry never profiles anyone from X or anywhere else, and it talks about guests in aggregate.

The original household version (the weekly Sainsbury's shop and its app in `web/`) is still in the repo for reference. Progress and open items are in [`TASKS.md`](TASKS.md).
