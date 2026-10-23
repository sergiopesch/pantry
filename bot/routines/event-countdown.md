# Routine: the event countdown

**Trigger:** when a new event appears on the organiser's Luma calendar, or when they share a Luma link. Every hour until T-2, `pantry_luma_sync` refreshes sign-ups and diet answers, and Pantry speaks up only if the plan changes. Set it up by asking Pantry in chat: "Run the countdown for Thursday's meetup." Each step is scheduled relative to the event date. The inbox is triaged at every step.

1. **T-7, draft (automatic, read-only):** read guests from Luma, forecast the headcount, read the diets, compare providers, build the plan. Send one heads-up: the plan-for number, the pick, the cost per head.
2. **T-3, brief (organiser's yes):** draft the brief for the chosen provider and show it. Send it from Pantry's email only on a yes. Quotes land in the inbox; surface one only if it changes the pick.
3. **T-2, lock (organiser's yes):** sync Luma for late sign-ups and new diet answers. Lock the headcount. Refresh any price older than 24 hours. Then `pantry_checkout_request` (in full, or the deposit the provider asked for): the organiser says yes in chat, Pantry pays on one single-use Agentcard (`scripts/agentcard-pay.mjs`, sandbox in the demo), and it says "paid" only when the status reads charged.
4. **Day of, 2 hours before the drop (automatic, read-only):** check the inbox for confirmations and delays, read the logistics checklist to the organiser, and remind whoever collects if it's a collection.
5. **Day of, at the drop:** confirm arrival and the 45-minute margin before serving. If there's a delay, give one fix.
6. **T+1, debrief:** ask the four questions, sync Luma for the real check-ins, and record it with `pantry_debrief`. Read back what changes next time.

**After every event:** the provider ledger updates (on time, leftovers, what ran out, rating), and the show rate learns from the real check-ins. The next countdown starts from better numbers.

**Retries:** the same plan and amount reuse the same approval; a changed plan needs a fresh one.

Anything that sends, orders, pays, books or calls waits for the organiser. Every time.
