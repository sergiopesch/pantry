# Pantry — TASKS

_Last updated: Fri 23 Oct 2026, 16:10 BST. The hackathon was 22 Oct; this pass polished the demo and filmed it._

## Status in one line
**Pantry is a Grok Bot that plans catering for community events. "Order for who shows up." The demo flow is polished end to end, rehearsed twice and filmed: `story/VIDEO.md` (3:14, kept out of the repo in `~/Desktop/Pantry demo video/`).**
- Repo: github.com/sergiopesch/pantry (**public**: keep guest data, secrets and the video out of it).
- 78 tests pass.

## What changed on 23 Oct
- **Payment works end to end.** Last night's Agentcard step failed: the sandbox's simulated Visa authorises at most $100 per card, and the pooled company wallet needs Agentcard to switch it on. Sergio's call: the demo pays the **£70 deposit** that holds the date (`pantry_checkout_request {deposit}`), on one single-use sandbox card via `scripts/agentcard-pay.mjs`; the balance comes on the caterer's invoice.
- **Cards in one call.** `event card <kind>` and `event cards dish` render PNGs with no dependencies; prompt 2 went from about 45 s to about 25–30 s, and no more blank cards.
- **Meals say who they feed** (from the plan's own record), and plans say "£5.51 a plate" instead of a per-head figure that didn't divide.
- **Stage:** panels lay out properly full screen; prompts are filled and sent through accessibility (`story/streamdeck/bin/grok`), never keystrokes; Grok Bot is sized to whichever screen it's on.
- **Live bot:** pulled, MCP server re-added as `pantry-video` (new tool schemas), persona (3,987 characters) and the pay and show-it skills updated.

## Live bot status (23 Oct)
- MCP servers: `pantry-video` (the engine), plus Cognee and Notion. Agentcard: the sandbox client only (`AGENTCARD_CLIENT_ID`/`SECRET` as Grok Bot secrets); the personal live connector stays disconnected.
- Rehearsal reset before any run: `node ~/pantry/src/cli.js event reset rehearsal`.
- Rehearsed times: setup about 35–50 s, meals about 25–35 s, brief about 25 s, deposit about 50 s.

## Pick up here
1. Watch `~/Desktop/Pantry demo video/Pantry demo.mp4`. To re-cut or re-film, follow `story/VIDEO.md`.
2. Optional: ask Agentcard to enable company flow for the sandbox org (`org_e8842541752e08a7574037b6`); then a full order could be paid on one card. A $1,000 sandbox test pool is already in place.
3. Optional: decide whether the repo should stay public.
4. Later (deferred by Sergio): move supplier logins into the 1Password vault "Shared with Grok Bot".

## Events engine (new)
- `src/events/luma.js`: Luma CSV → approved guests and declared needs. Free text is normalised (vegan, coeliac, nut allergy, …). Nothing is inferred; X profiling is out by decision.
- `src/events/plan.js`:
  - Show rate is learned from past events, with the same kind of event weighted ×2.
  - Plan-for = expected + 10% spare. Allergies and coeliac are planned at 100%.
  - Lanes: Everyone / Vegan / Gluten-free / Allergy-safe.
  - Hard filters: safe plate for every declared need, budget, lead time, delivery area.
  - Ranking puts quality first inside the budget, and needs that ran out before get a +25% buffer.
  - Late providers get an earlier drop.
- `src/events/index.js`:
  - The venue's 18:00 cut-off is learned from the inbox.
  - Drafted briefs; quotes replace estimates.
  - The payment approval is bound to the plan hash, and a changed plan voids it.
  - Debriefs update the show rate and the ledger.
- `src/events/luma-api.js`: the live Luma client (List Events, Get Event, List Guests, paginated) plus a dummy-calendar client. Both are mapped by the same code: registration answers → diets, `event_tickets[].checked_in_at` → attendance, `geo_address_json` → venue and postcode area.
- Data in `data/events/`: catering settings (`event.json`), the catering ledger keyed by Luma event id (`history.json`), eight providers, fixture inbox mail, and the dummy Luma calendar (`luma/`, plus `guests.csv` as a Luma CSV export).
- **Honesty:** the supermarket brands are real but their prices are estimates. Caterers and restaurants (Little Feast, Hearth & Co, Mezze Collective, Slice Theory, Bao Down) are **fictional examples**.
- MCP (`src/mcp.js`) now serves 15 event tools; none can approve, pay, send or file. CLI: `pantry event <cmd>`.

## Grok Bot facts (from Grok Bot.app 0.75)
- Profile fields: name, description (the persona), avatarShape (25 shapes), avatarColor (11), voiceId (28 voices), voiceSpeed.
- Templates: name, shape, colour, body ≤4000 chars, visibility.
- Bots also get: a dedicated email (permanent once on), a vault (1Password service account), Link card payments, routines, skills, phone calls and voice chat.

---

## Before the pivot (household version, kept for reference)

## Build order (spec Part Eight)
- [~] **1 Scaffold.** `bot/system-prompt.md` is ready to paste. **Yours:** create the bot on x.ai.
- [x] **2 Household profile.** `data/household.json`. **Yours:** replace the `Wife` / `Daughter` placeholder names.
- [x] **3 Prediction engine.** Eggs: 24 a week; Monday's dozen runs out Thu 22 Oct ~8 PM. The Today hero shows a live carton, 9 of 12 left at 6:02 AM.
- [~] **4 Sainsbury's browser.** Done: extractor, DevTools snippet and `catalog import`. Not done: live CDN image capture, because scripted clients are blocked (below).
- [x] **5 Cart builder.** One cart, three lanes, with steppers, swaps, adds, treats left off and items not needed yet.
- [x] **6 Visual cards.** In the real app: the usual-vs-pick card, the swipeable review, the delivery sheet with its glowing pin, and cards inline in chat.
- [x] **7 Deals.** Clips Nectar salmon and the yoghurt coupon; next week's six-pack "covers half your run", and switching saves £1.10.
- [~] **8 Payment.** The gate is built and tested, and the approval sits inline in the cart, not in a modal. It runs on the demo driver. **Yours:** wire `agentcardDriver` to Agentcard's real tools.
- [x] **9 Delivery + inbox.** One-off Thu 4–6 PM slot. Progress follows the household clock (booked → picking → on its way → delivered). The inbox handles keep vs refund, cases and learnings.
- [~] **10 Stream Deck + polish.** Keys 0–9 drive the real app, and auto-run (A) is verified at 2:45. **Yours:** the physical Stream Deck mapping.

## New in this pass
- **Brand:** a small round bowl with two eyes under the rim (moods: idle, notice, think, happy, blink); an iOS-style app icon; a custom monoline wordmark. All of it renders identically everywhere, with no font dependency.
- **App:** iOS conventions with Airbnb clarity. Large titles, inset cards, a translucent tab bar with live badges, a status bar with its material, sheets, a 6:02 AM lock screen with Pantry's notification, and a splash screen.
- **Chat that acts:** deterministic intents over the engine (add, drop, swap, why, run-outs, delivery, deals, inbox, insight, rules, checkout). It's instant and offline-safe.
- **Phone pairing:** `HOST=0.0.0.0 npm run demo` prints a `?key=` link. Without the key, the API refuses every call.

## Open items (spec Part Nine)
- [ ] Agentcard UK coverage tested with a real Sainsbury's checkout (Visa needs a US-issued card; Mastercard works anywhere).
- [ ] 1Password ↔ Grok Bot login autofill confirmed. (`op` CLI is installed; the vault was not touched.)
- [~] Sainsbury's anti-bot tolerance (22 Oct, 14:00–14:07): plain HTTP got a 403 on request 1; headed Chrome loaded fine; headless got a 403 on load 1. Stopped there per the spec.
- [ ] One-off delivery slot for demo day. Fallback in place: a stubbed slot.
- [ ] Pantry's own email address provisioned. Fallback: fixture mail.
- [ ] Stream Deck mapping finalised (deferred, yours).
- [x] Three-minute run-through timed: 2:45 hands-free (`?auto=1`). The spec's Part Three budget adds up to 4:00 and omits Beat 3.

## Stubs & workarounds (and why)
- **Prices:** eggs are live; the rest are estimates, and the cart's fine print says so.
- **Images:** illustrations until CDN URLs are captured. Real images replace them, and fall back to the illustration if they fail to load.
- **Payment, order placement, case filing:** demo drivers, each behind the same explicit approval it needs live. The Connections panel in Home labels every status honestly.
- **Household clock:** the scenario runs Tue 20 Oct 06:02 → Thu 22 Oct. The presenter keys move the clock; a real install would follow real time.

## Decisions made
- The default route is the app; the slide deck is removed. Beats are performed inside the product.
- Deals (Beat 8) act on next week's draft, so "cart quietly rerouted" stays true after payment.
- The state file is the single source of truth, shared by the app, the CLI and MCP.

## Check before the demo
- [ ] **Hackathon rules:** this was built before 18:00. If the rules require code written during the event, disclose it or treat this as a reference build.
- [ ] `npm test`; `npm run demo`; open full screen; Shift+R; run 0 → 9 once.
- [ ] Safari renders the headlines in SF Rounded; Chrome uses SF Pro. Both are fine.
