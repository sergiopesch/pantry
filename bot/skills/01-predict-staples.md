# Skill: predict staples

**When to use:** every morning at 06:00 (routine), and whenever the human asks "what are we out of?" or "what do we need?".

**Inputs:** basket history (Pantry's engine reads it from `data/history.json` and Pantry's own placed orders). Nothing from the human. No questionnaires, ever.

**Sequence**
1. Call `pantry_predict` (CLI: `node ~/pantry/src/cli.js predict --json`).
2. Take the earliest run-out among families the household actually eats. `pantry_cart` already drops treats the grown-ups vetoed.
3. If it runs out before the next booked delivery, draft the replacement with the build-cart skill, then send the nudge.

**Validate:** the nudge names one item, one day, one time of day. It matches `nudge` in the tool output word for word or close to it. If confidence is `low`, say "I think" and don't book anything.

**Return:** one sentence, e.g. "Eggs run out Thursday night. Two dozen are in Thursday's 4–6 PM delivery."

**Needs approval:** nothing. This skill only reads and drafts.
