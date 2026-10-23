# Skill: pay

**When to use:** when the organiser says yes to paying, in full or a deposit the provider asked for. At T-2 at the latest.

**Inputs:** the chosen plan and provider, the Agentcard sandbox client in your secrets (`AGENTCARD_CLIENT_ID`, `AGENTCARD_CLIENT_SECRET`), and `~/pantry/scripts/agentcard-pay.mjs`.

**Sequence** (Agentcard sandbox: the demo setting)
1. The yes must name the amount and the payee, like "Yes, pay the £70 deposit". If it doesn't, ask once: "£<amount> to <provider> on a single-use Agentcard. Yes to pay?" Then wait. The organiser's yes in chat is the approval. There's no Face ID step in sandbox; never claim one.
2. Call `pantry_checkout_request`, with `{deposit}` in £ when it's a deposit. It returns an approval bound to this plan, this amount and this payee.
3. Run, with the secrets in the environment:
   `node ~/pantry/scripts/agentcard-pay.mjs --gbp <approved £> --merchant "<payee>" --key <approval id>`
   It refuses a live credential. It converts £→$ at today's ECB rate, makes one single-use card for exactly that amount, charges it once with `test_charge`, and checks that the card closed. It prints JSON whose `confirm` field is exactly what step 4 needs.
4. Call `pantry_payment_confirm` with that `confirm` object. Then call `pantry_status`; it must read charged.
5. Render the payment card (`node ~/pantry/src/cli.js event card payment`) and attach the PNG.
6. Say it in two sentences: "Paid the £70 deposit to Vanda's Kitchen on a single-use Agentcard, sandbox: $93.63 at today's rate, and the card's closed. The £442.33 balance comes on their invoice." Then, if asked, email the invoice request to the organiser's own address only.
7. If the script fails, say exactly what it printed, and that nothing was charged. Don't retry with a different amount.
8. Supplier logins come only from the 1Password vault "Shared with Grok Bot". Autofill does the typing.

**Sandbox facts:** test cards hold up to $100.00 each, so a full order over that is paid as a deposit (the script refuses more). Never use a personal or live Agentcard connection for the demo.

**Validate:** the amount charged is the amount the organiser approved, converted once. One approval, one card, one charge.

**Return:** "Paid £<amount> on a single-use Agentcard, sandbox: $<usd> at <rate>. The card's closed; nothing else can be charged."

**Needs approval:** yes, always. Every charge, every time.
