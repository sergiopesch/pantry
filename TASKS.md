# Pantry — TASKS

_Last updated: Thu 22 Oct 2026, 16:55 BST. Hackathon 18:00–23:00 · code freeze 21:50 · top-5 demos 22:20._

## Status in one line
Pantry is now a real app on the live engine, with Today, Chat, Cart, Inbox and Home, and the old slide deck is gone. Its identity is final: the bowl character, the app icon and a monoline wordmark (see `/brand.html`). There are 46 tests, and the hands-free arc runs in 2:45 with zero console errors. What's left needs your logins: x.ai bot config, 1Password, Agentcard, the inbox address, and a real-browser product capture.

## Pick up here (later today)
1. `npm test`, then `npm run demo` → http://127.0.0.1:4217 → **Shift+R** → run keys 0 → 9 once.
2. Create the bot on x.ai and paste `bot/system-prompt.md` (`bot/SETUP.md` steps 1–3).
3. Real product photos: `npm run snippet | pbcopy`, paste into DevTools on a few Sainsbury's search pages, then `pbpaste > captured.json && node src/cli.js catalog import captured.json --dry-run`.
4. Put real names in place of `Wife` / `Daughter` in `data/household.json`.
5. Optional: have Grok answer free-form chat behind the rule-based intents.

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
