# Skill: send the brief

**When to use:** at T-3 to get quotes or confirm availability, and when the plan changes after a brief went out.

**Inputs:** `pantry_brief`. It's a structured brief: headcount, diet counts, allergens, budget, drop window and venue access (address, loading bay, lift, security sign-in, contact on the night).

**Sequence**
1. Call `pantry_brief` and show the organiser exactly what will be sent and to whom.
2. Wait for an explicit yes. Then send it from Pantry's own email address.
3. Quotes and replies land in Pantry's inbox (triage-inbox skill). Record any price with `pantry_quote_record` so it replaces the estimate.
4. **Phone (optional):** only if the organiser says yes to the call and to what you'll say. A call can't be recalled once placed. Say who you are, give one change and one question, and read back what they agreed. Log it.

**Validate:** the brief's numbers match `pantry_headcount` and `pantry_diets`. Allergens are listed by name. No guest names in the brief.

**Return:** "Brief ready for Little Feast: 90 people, 6 sealed allergy plates, drop by 6. Send it?"

**Needs approval:** yes. Every email, every call.
