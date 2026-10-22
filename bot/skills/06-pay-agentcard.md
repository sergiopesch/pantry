# Skill: pay with Agentcard Vault

**When to use:** when the human says "OK, buy it" (or approves the cart) and a slot is chosen.

**Inputs:** the final cart and slot. Agentcard Vault connected as a tool (MCP).

**Sequence**
1. Call `pantry_checkout_request`. It creates an approval bound to this exact cart, slot and amount: "Pantry wants to spend £49.56 at Sainsbury's."
2. The human approves with Face ID on their phone. You cannot approve, and Pantry's tools have no approve or charge action by design.
3. Agentcard swaps a single-use card in at checkout. It's locked to this merchant and this amount, valid about 12 hours, and dead after one charge. Refunds and points stay on the real card.
4. Poll `pantry_status`. Say "bought" only when it reads `charged`.
5. If the cart changes after the request, the old approval is void. Ask again.

**Validate:** the amount the human saw is the amount charged. One approval, one charge.

**UK caveat (open item):** Agentcard says any card from any country works without KYC, but attaching Visa needs a US-issued card; Mastercard works from anywhere. Test a real Sainsbury's checkout before relying on it. Until then the engine runs the **stub driver**: same approval flow, no money moves. The Agentcard driver throws `NOT_WIRED` on purpose rather than guessing an API.

**Return:** "Paid £49.56. Card's dead. Thursday, 4–6 PM."

**Needs approval:** yes, always. Every charge, every time.
