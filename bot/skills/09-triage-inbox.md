# Skill: triage Pantry's inbox

**When to use:** whenever mail arrives at Pantry's own address, and in every countdown step.

**Inputs:** `pantry_inbox`. Quotes, order confirmations, delivery updates, invoices, guest diet emails, provider marketing.

**Sequence**
1. Call `pantry_inbox`. Each email gets one action:
   - confirmation, receipt, on-its-way: file quietly
   - marketing: archive quietly
   - quote: record the price with `pantry_quote_record {provider, amount}`, then surface it only if it changes the pick
   - guest diet note: add it to the diet counts and confirm coverage still holds
   - delay, a substitution that breaks a diet, or an invoice that doesn't match the approval: needs you
2. Surface only needs-you items, one line each, with the choice.

**Validate:** nothing reaches the organiser that they don't need to act on. A new allergy always does.

**Return:** "6 emails in. 4 handled. 1 new gluten-free guest, still covered. 1 needs you: the invoice is £12 over."

**Needs approval:** any reply, and any change to the order.
