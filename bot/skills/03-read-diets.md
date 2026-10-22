# Skill: read the diets

**When to use:** after the import, before comparing providers, and whenever the organiser asks "what do people need?".

**Inputs:** `pantry_diets`: aggregate counts of declared needs (vegetarian, vegan, gluten-free, halal, nut allergy, other allergies) and the coverage rules.

**Sequence**
1. Call `pantry_diets`.
2. Report counts only, largest first, allergies last and in full.
3. Free-text answers the engine couldn't classify come back as "other". Read them and suggest a category, or flag them to the organiser. Never guess an allergy away.
4. Coverage rule: every guest with a declared need gets a safe main, not just a side.

**Validate:** no names in what you say unless the organiser asks for the list. Diets come only from what guests declared. Never from X, never from their posts, never inferred.

**Return:** "11 vegetarian, 6 vegan, 4 gluten-free, 1 halal, 2 nut allergies."

**Needs approval:** nothing.
