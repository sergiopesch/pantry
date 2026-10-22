# Skill: debrief and learn

**When to use:** the morning after the event (T+1), or when the organiser says "how did it go?".

**Inputs:** check-ins (Luma export after the event), the organiser's answers, and attendee feedback if a survey went out.

**Sequence**
1. Ask four quick things, in one message: roughly how much was left, what ran out and when, did it arrive on time, and a rating out of 5.
2. Re-import the guest list for actual check-ins. Call `pantry_debrief` with `attended`, `leftoverPct`, `minsLate`, `rating`, `ranOut` (need ids, e.g. `gluten-free`) and `notes`.
3. Read back the learnings it returns: the show rate update, the provider's new score, and a change for next time.
4. Suggest a surplus option for leftovers next time if waste was high (a local community fridge or food bank pickup), drafted, not booked.

**Validate:** the learnings match the tool output. A provider is never marked down for something the organiser changed.

**Return:** "88 came. 8% left over, nothing ran out, 4.7 out of 5. Little Feast stays top of the list. Show rate moves to 60%."

**Needs approval:** nothing to record. Anything sent to a provider or guests needs a yes.
