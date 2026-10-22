# Skill: triage Pantry's inbox

**When to use:** whenever mail arrives in Pantry's own address, and in the 06:00 routine.

**Inputs:** Pantry's inbox. All Sainsbury's mail is forwarded there: confirmations, on-its-way notices, substitutions, missing items, refunds, offers.

**Sequence**
1. Call `pantry_inbox`. Each email gets one action:
   - confirmation, on-its-way, refund: file quietly
   - offers: archive quietly
   - missing item: draft a refund case
   - substitution that breaks the rules, or a delay: needs you
2. Learn: an item missing twice gets swapped for a sibling the household already buys. The engine applies that to the next cart ("Bananas went missing twice. Loose from now on.").
3. Surface only `needs-you` items, one line each, with a choice ("Keep them, or want the refund?").

**Validate:** nothing is surfaced that the human doesn't need to act on.

**Return:** "7 emails in. 5 handled quietly. 1 refund case ready to file. 1 needs you."

**Needs approval:** filing a case and sending any email are external writes. Draft them, then wait for the human's tap.
