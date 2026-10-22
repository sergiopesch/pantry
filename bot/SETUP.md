# Wiring Pantry into a Grok Bot

These steps need your logins, so they're yours to run. Each ends with the check from the spec's build order.

## 1. Create the bot (build step 1)
- One primary job, in operational terms: *"Does this household's weekly Sainsbury's shop end to end: predicts, builds the cart, gets approval, books delivery, triages the inbox."*
- Paste `bot/system-prompt.md` into the bot's instructions. Keep the TOOLS appendix only once step 3 is done.
- Turn demo mode on for tonight (tell the bot: "demo mode on").
- **Check:** say "hello". It should answer in Pantry's voice: short, warm, no "I'd be happy to".

## 2. Household profile (step 2)
- Edit `data/household.json`: put real names in place of `Wife` and `Daughter`.
- **Check:** "What are everyone's rules?" It should recite three members, three rules and the conflict policy.

## 3. Put the engine on the bot's computer
- Copy this folder to the bot's cloud computer, e.g. `~/pantry`. You need Node 20 or later. There are no dependencies and no install step.
- If the bot supports MCP tool servers, register a stdio server: command `node`, args `~/pantry/src/mcp.js`. It exposes 11 tools. None of them can approve, charge or file anything.
- If it doesn't, the CLI works the same way: `node ~/pantry/src/cli.js <command> --json`.
- Upload `bot/skills/*.md` as skills and `bot/routines/weekly-shop.md` as the routine. Then teach by demonstration: walk it through one Sainsbury's search, let it save the skill, correct it, and rerun.
- **Check (step 3):** "When do we run out of eggs?" It should answer Thursday night, without being told.

## 4. 1Password (open item)
- Create a login item named `Sainsbury's` in the vault the bot can reach. The bot points at the item, and the secret never leaves the vault.
- Note: at launch, per-bot credential isolation on the shared computer was roadmap, not shipped. Every bot on the account can see the same files and logins. Keep only Pantry on this account tonight, or keep the approval boundaries tight.
- **Check:** the bot logs in to Sainsbury's with autofill and never echoes the password.

## 5. Sainsbury's browsing (step 4)
- Use the bot's real, headed browser. On 22 Oct, plain HTTP and headless Chromium were both blocked (Akamai 403) on the very first request. Only a real browser got through.
- Run the browse skill. Or capture products yourself in about two minutes: run `npm run snippet | pbcopy`, paste the result into DevTools on a few Sainsbury's search pages, then `pbpaste > captured.json && node src/cli.js catalog import captured.json --dry-run`.
- **Check:** one product name plus a CDN image URL from a live search. The app's product cards switch from illustrations to photos.

## 6. Agentcard Vault (step 8, open item)
- Register as a developer, add your card on the phone (passkey), and connect Agentcard's MCP to the bot.
- **Test the UK rails before you rely on it:** Mastercard works from anywhere; attaching Visa needs a US-issued card.
- `src/vault.js` has an `agentcardDriver` that throws `NOT_WIRED` until it's wired to Agentcard's real tools. That's deliberate: no guessed API. Until then the app uses the stub driver, with the same approval flow and no money moving.
- **Check:** the approval prompt fires ("Pantry wants to spend £… at Sainsbury's") and the stubbed charge appears in `data/state.json` → `log`.

## 7. Pantry's inbox (step 9, open item)
- Give Pantry its own address and forward Sainsbury's mail to it with a filter. Until then, `data/inbox.json` holds realistic fixture mail.
- **Check:** `node src/cli.js inbox` handles the delivery notice quietly.

## 8. The app, for the room and for your phone (step 10)
- `npm run demo`, then open http://127.0.0.1:4217. On a laptop or projector the phone stands on the counter; press F for full screen.
- Keys **0–9** run the ten beats inside the real app; pressing a beat's key again steps through it. **A** runs the whole arc hands-free (2:45). **Shift+R** resets.
- Stream Deck: one Hotkey action per button, sending 0 through 9.
- On your phone: `HOST=0.0.0.0 npm run demo` prints a pairing link (`?key=…`) for the same Wi-Fi. Without the key, the API refuses every call, so nobody else on the venue network can see the cart or press approve.
- The bot links into the app from chat. For example, it can send "Review Thursday's cart" pointing at `/?tab=cart`.
