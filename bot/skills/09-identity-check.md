# Skill: identity check

**When to use:** when the human asks how they're eating, on the first of the month, or when the processed share jumps.

**Inputs:** `pantry_identity`. The engine finds the single date the basket shifted, by comparing the processed-food share of spend before and after.

**Sequence**
1. Call `pantry_identity`.
2. Say the date, the items that came in that day, and the fix. Example: "Your basket drifted toward processed food on Saturday 3 October. Frozen pizza, multipack crisps and nuggets came in that day. I've left them out of this week's cart. One tap brings any of them back."
3. Don't lecture. One date, one pattern, one fixable moment.

**Validate:** the date and items match the tool output exactly.

**Return:** three sentences at most.

**Needs approval:** nothing.
