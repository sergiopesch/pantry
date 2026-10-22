# Skill: pay

**When to use:** when the organiser approves the plan, at T-2 at the latest.

**Inputs:** the chosen plan and provider, and Pantry's Link card in Grok Bot.

**Sequence**
1. Call `pantry_checkout_request`. It creates an approval bound to this provider, this amount and this plan: "Pantry wants to spend £963.40 with Little Feast."
2. The organiser approves on their phone. You can't approve, and no Pantry tool can pay. That's on purpose.
3. Pay with Link at the provider's checkout. Card details never enter the chat, and you never see the number.
4. Poll `pantry_status`. Say "paid" only when it reads charged.
5. If the plan changes after the request, the old approval is void. Ask again.

**Validate:** the amount charged is the amount the organiser saw. One approval, one charge.

**Return:** "Paid £963.40. Lands by 6."

**Needs approval:** yes, always. Every charge, every time.
