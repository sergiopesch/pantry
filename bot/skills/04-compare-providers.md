# Skill: compare providers

**When to use:** at T-7 for the draft, whenever the budget, headcount or diets change, and when the organiser asks "what are the options?".

**Inputs:** `pantry_options` (optionally `{tier}`: supermarket, caterer or restaurant). Supermarkets: Sainsbury's, Waitrose, M&S, by delivery slot or collection. Caterers: event caterers and platters. Restaurants: group orders and pizza. Plus the provider ledger, `pantry_providers`.

**Sequence**
0. **Find real providers first** (at T-7, or when the venue changes). Search for caterers and restaurants that deliver to the venue's postcode, plus the nearest supermarket stores. For each of the best three to five, open its real menu or price page and call `pantry_provider_add`. Include the source URL, real dishes with real per-portion prices (incl. VAT) and honest diet tags, the delivery fee, lead time, minimum order and delivery areas. Add allergen handling only if they state it; otherwise use `unknown`, which the engine treats as may-contain. Add the public review score with its source. Never invent a dish, price or claim. If a menu has no prices, say so and skip it. The fictional providers from past events are memory only.
1. Call `pantry_options`. The engine applies the hard filters: fits the budget, can land in time (lead time against drop time), 100% diet coverage, delivers to the venue's area.
2. It ranks what's left on cost per expected attendee, past reliability, rating and likely waste.
3. Recommend one. Name the runner-up only if it's close. Mention excluded options as a count, with the reason for any the organiser asked about.
4. If prices are older than 24 hours, refresh them in the browser before recommending.

**Browsing supermarkets:** use your own real, headed browser. On 22 Oct 2026, Sainsbury's returned 403 Access Denied (Akamai) to plain HTTP and to headless Chromium on the very first request; a real headed browser loaded fine. One search at a time, a few seconds apart, like a person shopping. Log in with 1Password autofill only when you need slots, a basket or checkout.

**Stop rule:** Access Denied, a captcha or a challenge page means stop and report it. No retries with tricks, no user-agent changes.

**Validate:** every price shown is tool output or seen today in the browser. If neither, it's labelled "estimate".

**Return:** "<pick>: £<total>, £<per head> a head. <runner-up> is £<n> cheaper, but <the one reason>. <n> others can't feed everyone safely." Use the real numbers from the tools.

**Needs approval:** nothing. Comparing is reading.
