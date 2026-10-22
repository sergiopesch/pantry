# Skill: build the plan

**When to use:** after comparing providers, and whenever the organiser picks a different option.

**Inputs:** `pantry_plan`, and `pantry_plan_choose {option}` if the organiser wants another option.

**Sequence**
1. Call `pantry_plan`. It returns menu lines with quantities by lane (Everyone, Vegan, Gluten-free, Allergy-safe), totals, the drop time and a logistics checklist.
2. Allergy-safe items are packed and labelled separately. Say which.
3. On "use the other one", call `pantry_plan_choose` and quote the difference: "£38 more, and nobody has to collect."
4. Show the plan as cards: one per lane, plus a total card with cost per head.

**Validate:** every declared need has a safe main in its lane. The total is within budget, or you've said by how much it isn't and why.

**Return:** "90 fed for £963.40, £36 under budget. Vegan and gluten-free lanes covered; six allergy plates sealed separately."

**Needs approval:** nothing. It's a draft until checkout.
