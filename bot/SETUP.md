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
- There's no built-in Luma connector in Grok Bot. Pantry connects through Luma's public API, from its own MCP server (step 9).
- The API needs **Luma Plus**. Create a key at luma.com → Calendar → Settings → API keys. A key belongs to one calendar and has full access to it, so treat it like a password.
- In Pantry's Bot settings → **Secrets** → Add new secret: name `LUMA_API_KEY`, value the key. Pantry only ever reads from Luma (events, guests, check-ins). It never writes.
- Live updates: Luma webhooks (`guest.registered`, `guest.updated`) can't send the auth header Grok Bot's webhook routines need. So the countdown polls Luma every hour instead.
- No key yet: Pantry runs on its dummy Luma calendar (`data/events/luma/`, in the API's exact response shapes) and says so.
- **Check:** "How many are coming?" Pantry answers from `pantry_luma_sync` and names the source (`luma-api`).

## 4. Pantry's own email
- Turn on the Bot's dedicated email address. You can't change it once it's on, so choose carefully.
- Point quotes, caterer confirmations and invoices at it.
- **Check:** email it a test quote. Pantry files it and surfaces it only if it changes the pick.

## 5. 1Password (later)
- The vault **Shared with Grok Bot** already exists, and it's empty. Grok Bot sees only what you move into it.
- When you're ready: move the supplier logins Pantry needs (Sainsbury's, Waitrose, M&S, any caterer portal) into that vault, add each site's URL so autofill matches, then Refresh vault in Grok Bot.
- **Check:** Pantry signs in to Sainsbury's with autofill and never echoes the password.

## 6. Payment: Link
- Add a card in Link (Settings → payments). Grok Bot never sees the number or the security code.
- **Check:** "Pay for the plan." The approval fires on your phone ("Pantry wants to spend £… with …"), and Pantry says "paid" only once the status reads charged.

## 7. Skills
- Add each file in `bot/skills/` as a skill, in order. The skill name is the file's title, and the description is its "When to use" line.
- **Check:** "What do you do when someone shares a Luma export?" It describes import, headcount, diets.

## 8. Routine
- In chat: "Run the event countdown for <event>, using bot/routines/event-countdown.md." Pantry sets up the T-7, T-3, T-2, day-of and T+1 steps.
- **Check:** the routine appears under Routines with the right dates.

## 9. The engine on the Bot's computer
- Copy this folder to the Bot's computer as `~/pantry`. You need Node 20 or later. There are no dependencies.
- Ask Pantry in chat to add the MCP server: command `node`, args `~/pantry/src/mcp.js`, with `LUMA_API_KEY` passed from its secrets. If MCP isn't available, the CLI does the same: `node ~/pantry/src/cli.js event <cmd> --json`.
- None of the tools can approve, pay, send or file.
- **Check:** "How many are we planning for tonight?" It answers with sign-ups, the show rate and plan-for, without being told the maths.

## 10. Supermarket browsing
- Use the Bot's real, headed browser. On 22 Oct, Sainsbury's blocked plain HTTP and headless Chromium (Akamai 403) on the first request; a real browser loaded fine.
- Any Access Denied or captcha: Pantry stops and tells you.
- **Check:** one live price and product URL from a Sainsbury's search, quoted with today's date.

## 11. Publish as a template
- Once the checks pass: Pantry → Create Template. Name Pantry, shape dome, colour yellow, body = `bot/persona.md`, visibility Public.
- Any organiser can import it and get their own Pantry, with their own ledger and their own vault.
- **Check:** open the template link in a private window. The name, character and description are right.

## Demo mode
- Tell Pantry "demo mode on". It narrates each action in one short sentence so the room can follow.
- Everything happens in Grok Bot itself: chat, voice, cards, approvals on the phone. There's no separate app.
