# Skill: pay

**When to use:** when the organiser approves the plan, at T-2 at the latest.

**Inputs:** the chosen plan and provider, and Pantry's Link card in Grok Bot.

**Sequence**
1. Call `pantry_checkout_request`. It creates an approval bound to this provider, this amount and this plan: "Pantry wants to spend £995.50 with Little Feast."
2. Tell the organiser the request is waiting for their approval. You can't approve, and no Pantry tool can pay. That's on purpose. Don't say the approval is on their phone: nothing sends it there yet. Until a real provider and Link checkout are wired, it stays pending, and no money moves.
3. Pay with Link at the provider's checkout. Card details never enter the chat, and you never see the number.
4. Poll `pantry_status`. Say "paid" only when it reads charged.
5. If the plan changes after the request, the old approval is void. Ask again.

**Validate:** the amount charged is the amount the organiser saw. One approval, one charge.

**Return:** "Payment request raised: £995.50 to Little Feast. It needs your approval; I can't approve it." Only once the status reads charged: "Paid £995.50. Lands by 6."

**Needs approval:** yes, always. Every charge, every time.
