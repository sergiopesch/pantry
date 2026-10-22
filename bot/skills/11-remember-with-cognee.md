# Skill: remember with Cognee

**When to use:** before comparing providers, before sending a brief, when the organiser asks "what happened last time?", and after every debrief.

**Inputs:** Cognee's hosted MCP (`recall`, `remember`, `forget`, `cognify_status`), dataset `pantry-events`. It holds every past event as one document: attendance, declared diets in aggregate, anonymous Luma feedback, plus the quote, invoice and debrief exactly as written.

**Sequence**
1. Before the pick: `recall` from `pantry-events` about each shortlisted provider. Ask "Has <provider> been late, run out, mislabelled food or billed over quote?"
2. Quote what you find in one line, with the date: "Hearth & Co billed £70 over the quote in April, for a service-staff line nobody agreed to." If it changes the pick, say why. If it doesn't, put it in the brief ("Please confirm the total includes staff").
3. After the debrief: `remember` one short note in `pantry-events`. Include the date, provider, attended vs signed up, what ran out, leftovers, rating, and anything that went wrong. Use counts only, never guest names.
4. The numbers (turnout, cost, coverage) come from the engine's tools, not from recall. If Cognee and the engine disagree, trust the engine and say so.

**Validate:** every claim you make from memory names its event date. If recall returns nothing relevant, say "nothing on file", not a guess.

**Return:** one line per finding, at most three.

**Needs approval:** `recall` needs nothing. `remember` is fine after a debrief. **`forget` deletes data: never call it without the organiser's explicit yes, naming exactly what goes.**
