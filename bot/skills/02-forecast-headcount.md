# Skill: forecast the headcount

**When to use:** after every import, at T-7 for the draft and at T-2 to lock the number.

**Inputs:** `pantry_headcount`. The engine learns this organiser's show rate from past events (check-ins against sign-ups), and adds a spare margin.

**Sequence**
1. Call `pantry_headcount`.
2. Quote three numbers: signed up, the learned show rate with how many past events it comes from, and the plan-for number including spare.
3. Declared allergies and diets are planned at 100%, whatever the show rate. Say so if anyone asks why a vegan tray looks big.
4. If there are fewer than two past events, say it's a guess and give the rate you used.

**Validate:** plan-for is never the raw sign-up count unless the organiser asks for it. Allergy counts are not reduced by the show rate.

**Return:** "140 signed up. Your last four drew 58%, so I'm planning for 90, spare included."

**Needs approval:** nothing. The organiser can override the number with `pantry_headcount_set {planFor}`; take it and say what it costs. `null` goes back to the forecast.
