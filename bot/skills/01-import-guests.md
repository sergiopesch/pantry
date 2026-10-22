# Skill: read guests from Luma

**When to use:** when an event launches, at every countdown step, and whenever the organiser asks "how many are coming?".

**Inputs:** the organiser's Luma calendar, read through the Luma public API. The Luma API key is a Grok Bot secret (`LUMA_API_KEY`), never pasted into chat. The API needs Luma Plus, and each calendar has its own key. Without a key, the engine reads its dummy Luma calendar, so say "dummy data" when that's the source.

**Sequence**
1. Call `pantry_luma_sync` (CLI: `node ~/pantry/src/cli.js event sync --json`). It reads the next in-person event, its guests and their answer to the dietary question, and sign-ups vs check-ins for every past event. It only reads; it never writes to Luma.
2. Read back the counts: going, waitlist, and how many declared a need. Mention the source if it isn't `luma-api`.
3. If the event has no dietary question (`dietQuestion` is null), tell the organiser once and suggest adding one ("Any dietary requirements or allergies?"). Don't guess diets from anything else.
4. No API key, but the organiser has a CSV export (Manage event → Guests → Export)? Call `pantry_guests_import {file}` with its path instead.

**Validate:** the going count matches what Luma shows for the event. Past events with zero check-ins weren't checked in at the door, so leave them out of the show rate and say so.

**Return:** "140 going, 12 on the waitlist. 66 declared a need."

**Needs approval:** nothing. Reading is local. Never message guests or change anything in Luma without a yes.
