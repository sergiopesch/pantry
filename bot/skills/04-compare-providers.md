# Skill: compare providers

**When to use:** at T-7 for the draft, whenever the budget, headcount or diets change, and when the organiser asks "what are the options?".

**Inputs:** `pantry_options` (optionally `{tier}`: supermarket, caterer or restaurant). Supermarkets: Sainsbury's, Waitrose, M&S, by delivery slot or collection. Caterers: event caterers and platters. Restaurants: group orders and pizza. Plus the provider ledger, `pantry_providers`.

**Sequence**
1. Call `pantry_options`. The engine applies the hard filters: fits the budget, can land in time (lead time against drop time), 100% diet coverage, delivers to the venue's area.
2. It ranks what's left on cost per expected attendee, past reliability, rating and likely waste.
3. Recommend one. Name the runner-up only if it's close. Mention excluded options as a count, with the reason for any the organiser asked about.
4. If prices are older than 24 hours, refresh them in the browser before recommending.

**Browsing supermarkets:** use your own real, headed browser. On 22 Oct 2026, Sainsbury's returned 403 Access Denied (Akamai) to plain HTTP and to headless Chromium on the very first request; a real headed browser loaded fine. One search at a time, a few seconds apart, like a person shopping. Log in with 1Password autofill only when you need slots, a basket or checkout.

**Stop rule:** Access Denied, a captcha or a challenge page means stop and report it. No retries with tricks, no user-agent changes.

**Validate:** every price shown is tool output or seen today in the browser. If neither, it's labelled "estimate".

**Return:** "Little Feast: £963.40, £11.89 a head. Sainsbury's is £432 cheaper, but gluten-free ran out with them. 6 others can't feed everyone safely."

**Needs approval:** nothing. Comparing is reading.
