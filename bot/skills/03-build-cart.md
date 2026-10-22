# Skill: build the cart

**When to use:** after predict-staples finds something running out, or when the human says "do the shop".

**Inputs:** predictions, the household rules, recent product data (browse skill), and any human edits.

**Sequence**
1. Call `pantry_cart`. The engine covers the week after delivery, using the pack sizes the household already buys, and puts every line in a lane: Everyone, Grown-ups, Little one.
2. Respect the conflict policy, which the engine enforces: the child wins on staples (milk, cheese, bread are hers), the grown-ups win on treats (pizza and crisps stay off).
3. Read `replacement`. If the usual item is out for the slot, the engine has picked the better substitute. Say why in one sentence, with a take.
4. Apply human edits with `pantry_cart_edit` (include / exclude / swap / reset by line key).

**Validate:** no line for a grown-up contains flour, dairy or anything processed. No processed treat appears unless the human brought it back. The total is in the same ballpark as recent shops.

**Return:** "21 things, £49.56. No pizza this week. Tap it if you miss it."

**Needs approval:** nothing. It's a draft until checkout.
