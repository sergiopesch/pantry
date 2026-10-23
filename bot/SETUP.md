# Setting up Pantry as a Grok Bot

Pantry plans the food for community events. These steps need your logins, so they're yours to run, in the Grok Bot app. Each one ends with a check.

A "Pantry" bot already exists in your Grok Bot app with the old household persona. Update it rather than creating a second one.

## 1. Profile
- Open Pantry → edit the Bot.
- **Description:** paste all of `bot/persona.md`. It's under 4,000 characters, so it also fits a template.
- **Character:** shape **Dome** (a serving cloche), colour **Yellow** (#FF9800, the closest to Pantry's saffron). Turn on Bot colour for 1:1 messages and cards.
- **Sidebar line:** "Plans the food for community events. Order for who shows up."
- **Check:** say "hello". The answer is short and warm, with no "I'd be happy to".

## 2. Voice
- Audition **Sal**, **Eve** and **Atlas** in voice chat, using the line in `bot/profile.json` → `voice.auditionLine`. These were picked by name only, not by ear. Keep the one that reads the numbers most calmly. Speed 1x, language English.
- **Check:** in voice chat, "How many are we planning for?" Numbers come out as words, unhurried, with allergies said in full.

## 3. Luma
- There's no built-in Luma connector in Grok Bot, and the Luma API needs Luma Plus. So tonight Pantry works from Luma's **guest CSV export**, which every plan has (event → Guests → download as CSV). Drop the file into Pantry's chat, and Pantry calls `pantry_guests_import`.
- The export carries approval status, check-ins, the dietary question and Luma's feedback-survey rating. For past events, those are the check-ins and feedback.
- Later, with Luma Plus: add the calendar's API key as the Grok Bot secret `LUMA_API_KEY`. `pantry_luma_sync` then reads the live API (`src/events/luma-api.js`), read-only.
- **Check:** drop tonight's export in. Pantry answers "140 going, 12 on the waitlist" and the plan-for number.

## 4. Cognee (memory)
- In Pantry's chat: "Add the MCP server https://mcp.aws.cognee.ai/mcp" (remote, Streamable HTTP, OAuth). When it asks you to authenticate, click **Allow Access** once and sign in with your Cognee account. The hosted server takes no API key.
- Load the past events once, from your Mac. In Cognee Cloud → API Keys, copy the API Base URL and create a key. Store both in 1Password as an item called `Cognee` (fields `url` and `key`; Sergio's is in Personal), then run:
  `node scripts/cognee-docs.js && COGNEE_SERVICE_URL=$(op read "op://<vault-id>/Cognee/url") COGNEE_API_KEY=$(op read "op://<vault-id>/Cognee/key") uv run --with cognee python scripts/cognee-load.py load`
  This sends 11 documents to the dataset `pantry-events`: ten events plus the provider list. Graph building runs on your Cognee credits and takes a few minutes. Guest names and emails are not sent, only counts and anonymous feedback.
- **Check:** "Has Hearth & Co ever billed over quote?" Pantry recalls April's £70 service-staff line, with the date.

## 4b. Notion (the organiser's events)
- In Pantry's chat: "Add the MCP server https://mcp.notion.com/mcp" (OAuth; approve the sign-in once).
- Pantry builds **Pantry · Events**: a **Past events** database (one row per archived event, all marked demo, with debrief, quote and invoice in the page body) and a page per upcoming event. The upcoming event page is the source for `pantry_event_set`: name, start, food time, venue address, delivery cut-off, budget and payer.
- Nothing about the event is hard-coded in the engine. The clock is real, and the venue address comes from Pantry's own search, with a source.
- **Check:** "What's the next event?" Pantry answers from Notion with the date relative to today.

## 4c. Real providers
- For each event, Pantry searches for real caterers and restaurants that deliver to the venue's postcode. It adds them with `pantry_provider_add`, each with a source URL, real dishes and prices, delivery terms, stated allergen handling (unknown counts as may-contain) and public reviews.
- **Check:** `pantry_options` lists real providers, each with a source link.

## 4d. Payments: Agentcard (sandbox)
- In the Agentcard dashboard (app.agentcard.sh → Organization → Developer → Credentials), create a **sandbox** client. Save its ID and secret as the Grok Bot secrets `AGENTCARD_CLIENT_ID` and `AGENTCARD_CLIENT_SECRET` (Pantry asks for each with a masked secret card; never paste them into chat).
- Pantry pays with `~/pantry/scripts/agentcard-pay.mjs`, only after your explicit yes for that amount: one single-use card for exactly the approved amount (£ to $ at the ECB rate), charged once with `test_charge`, checked closed. The script refuses a live credential and needs no funding in sandbox.
- Sandbox limits (checked 23 Oct 2026): a simulated Visa authorises at most $100 per card, so the demo pays the deposit a caterer asks for. The pooled company wallet ("company flow") would avoid the limit, but Agentcard has to switch it on for the organisation.
- Don't connect the personal (live) Agentcard connector for the demo.
- **Check:** "Pay the £70 deposit." Pantry raises the approval, pays, and says "paid" only once `pantry_status` reads charged, with the card masked and closed.

## 5. Pantry's own email
- Turn on the Bot's dedicated email address. You can't change it once it's on, so choose carefully.
- Point quotes, caterer confirmations and invoices at it.
- **Check:** email it a test quote. Pantry files it and surfaces it only if it changes the pick.

## 6. 1Password (later)
- The vault **Shared with Grok Bot** already exists, and it's empty. Grok Bot sees only what you move into it.
- When you're ready: move the supplier logins Pantry needs (Sainsbury's, Waitrose, M&S, any caterer portal) into that vault, add each site's URL so autofill matches, then Refresh vault in Grok Bot.
- **Check:** Pantry signs in to Sainsbury's with autofill and never echoes the password.

## 7. Payment: Link (not used)
- Grok Bot can pay with a Link card (Settings → payments), with an approval on your phone. The demo uses Agentcard's sandbox instead (step 4d), so leave Link off for it.

## 8. Skills
- Add each file in `bot/skills/` as a skill, in order. The skill name is the file's title, and the description is its "When to use" line.
- **Check:** "What do you do when someone shares a Luma export?" It describes import, headcount, diets.

## 9. Routine
- In chat: "Run the event countdown for <event>, using bot/routines/event-countdown.md." Pantry sets up the T-7, T-3, T-2, day-of and T+1 steps.
- **Check:** the routine appears under Routines with the right dates.

## 10. The engine on the Bot's computer
- In Pantry's chat: "Clone https://github.com/sergiopesch/pantry into ~/pantry." The repo is public; Grok Bot may still ask you to connect GitHub. You need Node 20 or later. There are no dependencies.
- Ask Pantry in chat to add the MCP server (it's `pantry-video` now): command `node`, args `~/pantry/src/mcp.js`, with `LUMA_API_KEY` passed from its secrets. Grok caches tool schemas, so after a tool change add it again under a new name and remove the old one. If MCP isn't available, the CLI does the same: `node ~/pantry/src/cli.js event <cmd> --json`.
- None of the tools can approve, pay, send or file.
- **Check:** "How many are we planning for tonight?" It answers with sign-ups, the show rate and plan-for, without being told the maths.

## 11. Supermarket browsing
- Use the Bot's real, headed browser. On 22 Oct, Sainsbury's blocked plain HTTP and headless Chromium (Akamai 403) on the first request; a real browser loaded fine.
- Any Access Denied or captcha: Pantry stops and tells you.
- **Check:** one live price and product URL from a Sainsbury's search, quoted with today's date.

## 12. Publish as a template
- Once the checks pass: Pantry → Create Template. Name Pantry, shape dome, colour yellow, body = `bot/persona.md`, visibility Public.
- Any organiser can import it and get their own Pantry, with their own ledger and their own vault.
- **Check:** open the template link in a private window. The name, character and description are right.

## Demo mode
- Tell Pantry "demo mode on". It narrates each action in one short sentence so the room can follow.
- Everything happens in Grok Bot itself: chat, voice, cards, approvals on the phone. There's no separate app.
