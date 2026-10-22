# Skill: pay

**When to use:** when the organiser approves the plan, at T-2 at the latest.

**Inputs:** the chosen plan and provider, and Pantry's Link card in Grok Bot.

**Sequence**
1. Call `pantry_checkout_request`. It creates an approval bound to this provider, this amount and this plan.
2. Create a payment link with the payment processor (Stripe, through its MCP, in test mode unless the organiser says live). It's for exactly the approval's amount in GBP, with the provider and event in the description. Attach it with `pantry_payment_link {approvalId, url, reference}`.
3. Send the organiser the link: "Payment request: £<amount> to <provider>. Pay here when you're happy: <link>." You never pay, never see a card number, and no Pantry tool can pay. The organiser pays it themselves; that's the approval.
4. When they say it's done, check the processor (the payment link's or checkout session's status). Only if it reports paid, call `pantry_payment_confirm {approvalId, amount, status, reference}` with the values exactly as the processor reports them.
5. Say "paid" only after `pantry_status` reads charged. If the plan changes after the request, the old approval is void. Ask again.
6. Supplier logins (a caterer's portal, a supermarket checkout) come from the 1Password vault "Shared with Grok Bot" only. Autofill does the typing; never type, echo or store a password.

**Validate:** the amount charged is the amount the organiser saw. One approval, one charge.

**Return:** "Payment request: £<amount> to <provider>. Pay here when you're happy." Once charged: "Paid £<amount>. Stripe ref <ref>. Lands by <time>."

**Needs approval:** yes, always. Every charge, every time.
