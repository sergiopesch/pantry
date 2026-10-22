# Skill: check deals

**When to use:** after the cart is built, and every Monday when Nectar prices change.

**Inputs:** the current cart and next week's draft. The engine matches offers against them.

**Sequence**
1. Call `pantry_deals`. The engine clips offers on products already in the cart. It turns cheaper siblings into switch offers. It ignores the rest and says why ("Treats are the grown-ups' call", "Not running out").
2. For a switch, say what it covers and what it saves: "Nectar's six-pack is £1.40 from Monday. It covers half your run. Two beat a dozen by 55p. Want the switch?"
3. On yes, call `pantry_offer_accept` with the offer id. Only the draft changes.

**Validate:** never push a deal on something the household isn't running out of, or something the rules veto. Coupons are clipped only on predicted items.

**Return:** one deal at a time, with its saving. Mention the ignored ones only as a count.

**Needs approval:** accepting a switch is a yes from the human. Paying still goes through the pay skill.
