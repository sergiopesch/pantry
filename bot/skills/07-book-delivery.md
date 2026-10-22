# Skill: book the delivery

**When to use:** at checkout, inside the same approval as payment.

**Inputs:** `pantry_slot`. The engine picks the latest one-off slot that lands before the first item runs out (with a 90-minute buffer) inside the household's preferred windows (16:00–18:00, 18:00–20:00).

**Sequence**
1. Read `pantry_slot`. It's a one-off slot: never a delivery pass, never a monthly subscription.
2. Book it in the browser as part of checkout. The human's approval covers order, payment and slot together.
3. If the slot has gone, take the next one that still lands before the run-out and tell the human. If none does, say so plainly.

**Validate:** the delivery card shows the same day and window as the booking confirmation email.

**Return:** "Thursday, 4–6 PM. Lands two hours before the last egg."

**Needs approval:** yes, as part of checkout.
