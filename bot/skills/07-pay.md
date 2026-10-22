# Skill: pay

**When to use:** when the organiser approves the plan, at T-2 at the latest.

**Inputs:** the chosen plan and provider, and Pantry's Link card in Grok Bot.

**Sequence** (Agentcard, sandbox for the demo)
1. Call `pantry_checkout_request`. It creates an approval bound to this provider, this amount and this plan.
2. With Agentcard's MCP (`https://mcp.agentcard.sh/mcp`), `create_card`: `type single_use`, `amount_cents` = the approved amount (Agentcard cards are in USD; say the £ amount and the $ conversion you used), and the merchant locked to the provider if a preset allows.
3. Tell the organiser: "Single-use card for £<amount> to <provider>. Approve it in Agentcard." Only the organiser approves. **Never call `approve_request` yourself**, never see or echo the card number, and never pay without their yes.
4. Once they've approved, place the order. In sandbox, the simulated order is `test_charge {card_id, amount, merchant}`: authorised, then cleared, then the card closes. Live, it's the provider's checkout with the card.
5. Check `list_transactions {card_id}`. Only when it reads SETTLED (or cleared), call `pantry_payment_confirm {approvalId, amount (the approved £), status, processor 'agentcard', card, reference (transaction id), sandbox}`.
6. Say "paid" only after `pantry_status` reads charged: "Paid £<amount> on a single-use Agentcard. It's closed now." In the demo, say it's the sandbox.
7. Supplier logins come only from the 1Password vault "Shared with Grok Bot". Autofill does the typing.

**Validate:** the amount charged is the amount the organiser saw. One approval, one charge.

**Return:** "Payment request: £<amount> to <provider>. Pay here when you're happy." Once charged: "Paid £<amount>. Stripe ref <ref>. Lands by <time>."

**Needs approval:** yes, always. Every charge, every time.
