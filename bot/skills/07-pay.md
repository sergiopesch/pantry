# Skill: pay

**When to use:** when the organiser approves the plan, at T-2 at the latest.

**Inputs:** the chosen plan and provider, and Pantry's Link card in Grok Bot.

**Sequence** (Agentcard sandbox: the demo setting)
1. Call `pantry_checkout_request`. It creates an approval bound to this provider, this amount and this plan. Show `pantry_card {kind: order}`, then `pantry_card {kind: payment}`.
2. Ask: "£<amount> to <provider> on a single-use Agentcard. Yes to pay?" Wait for the organiser's explicit yes in chat. That yes is the approval. In Agentcard's sandbox there is no Face ID step; never claim one.
3. On yes, get a one-hour sandbox token with the secrets `AGENTCARD_CLIENT_ID` and `AGENTCARD_CLIENT_SECRET` (`POST https://api.agentcard.sh/api/v2/oauth/token`, or the `agent-cards` CLI in test mode). Then:
   - `create_card`: `single_use`, `amount_cents` = the amount (USD; state the £→$ conversion you used), merchant = the provider.
   - `test_charge {card_id, amount, merchant}`: authorised → cleared → card closed.
   Never use the personal live Agentcard connection for the demo.
4. Check `list_transactions {card_id}`. When it's SETTLED (or cleared), call `pantry_payment_confirm {approvalId, amount (the approved £), status, processor 'agentcard', card (masked), reference (transaction id), sandbox: true}`. Then show `pantry_card {kind: payment}`.
5. Say "paid" only after `pantry_status` reads charged: "Paid £<amount> on a single-use Agentcard, sandbox. The card's closed; nothing else can be charged."
6. Supplier logins come only from the 1Password vault "Shared with Grok Bot". Autofill does the typing.

**Validate:** the amount charged is the amount the organiser saw. One approval, one charge.

**Return:** "Payment request: £<amount> to <provider>. Pay here when you're happy." Once charged: "Paid £<amount>. Stripe ref <ref>. Lands by <time>."

**Needs approval:** yes, always. Every charge, every time.
