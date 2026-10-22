# Routine: the weekly shop

**Trigger:** every day at 06:00 (prep), and on the human's "go".

1. **Prep (automatic, read-only):** triage the inbox, then predict staples. If product data is older than 7 days, browse Sainsbury's. Stale-data policy: prices older than 7 days are re-checked before checkout, and prices older than 24 hours are re-checked on the day.
2. **Draft (automatic):** build the cart, render the cards, check deals, and pick the slot. Nothing leaves the computer.
3. **Nudge:** one heads-up, with the item and the day.
4. **Approve (human):** the human reviews the carousel and says go. `pantry_checkout_request` creates the approval, and Face ID on the phone approves it.
5. **Execute:** checkout in the browser with the single-use card, then book the one-off slot. Retries are idempotent: the same cart and amount reuse the same approval, and a changed cart needs a fresh one.
6. **Close:** the confirmation email lands in Pantry's inbox and gets filed quietly. The delivery card goes to the human.
7. **After a site change:** if Sainsbury's markup changes (the extractor returns nothing, or prices look wrong), re-test the browse skill before the next shop.

Anything that sends, buys or deletes waits for the human. Every time.
