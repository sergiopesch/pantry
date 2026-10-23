# Skill: show it

**Why visual.** These rules come from sources checked on 22 Oct 2026.
1. **One idea per card:** a clear header, then the detail, then at most 1–3 actions. ([Microsoft Teams, Designing Adaptive Cards](https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/design-effective-cards))
2. **Design for the narrow screen first.** "Cards designed for a narrow screen scale well on wider screens (the opposite isn't true)." ([same](https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/design-effective-cards))
3. **Don't flood the chat.** Once cards scroll out of view they stop being useful, so limit yourself to the essentials. ([same, "Frequency"](https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/design-effective-cards))
4. **Length and position carry quantities.** Use bars, ordered where you can. Avoid pies, gauges and 3D. ([NN/g, Dashboards: preattentive attributes](https://www.nngroup.com/articles/dashboards-preattentive/))
5. **Colour groups things; it never carries a quantity alone.** Pair every colour with a label. ([NN/g, same](https://www.nngroup.com/articles/dashboards-preattentive/))
6. **Numbers as numerals, big and first.** Digits stop the scanning eye, and precise counts read as more credible. ([NN/g, Show numbers as numerals](https://www.nngroup.com/articles/web-writing-show-numbers-as-numerals/))
7. **A card is worth it only when it's faster than text,** such as a comparison, a receipt or a choice. Start with the minimum. ([Microsoft Bot Service, Design the user experience](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-design-user-experience))
8. **Always keep a text equivalent.** Channels may down-render a card to text or an image. ([same](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-design-user-experience))

**When to use:** whenever an answer carries numbers or a comparison: the headcount, the diets, the options, the plan, the inbox, a payment request, a debrief, or a finding from memory. At most **one card per answer**. Small talk, yes/no answers and single facts stay as text.

**Inputs:** the card kinds: `headcount`, `diets`, `options`, `provider`, `plan`, `dish`, `order`, `inbox`, `payment`, `debrief` or `memory` (for `memory`, the finding and date from the Cognee recall). `pantry_card {kind}` returns the same card as `{title, html, alt}`; the CLI renders it to a PNG.

| Moment | Card | What it shows |
|---|---|---|
| "How many?" | headcount | Plan-for in huge type. Bars for signed up, expected and plan-for. Turnout at past events, with events like this one in yellow. Allergy and coeliac guests planned at 100% |
| "What do they need?" | diets | Declared needs as one stacked bar with labelled counts. Critical needs tagged 100% |
| "What are the options?" | options | Each provider's total as a bar. The pick tagged. Excluded options dimmed, each with its reason |
| "What are we serving?" | plan | Total in huge type, cost against budget, plates by lane, drop time |
| "Check my inbox" | inbox | How many need you, then one line each |
| "Pay for it" | payment | Amount, payee, status ("Needs your approval" until charged), card state |
| After the event | debrief | Who came against what was ordered, and what changes next time |
| "What happened last time?" | memory | The finding as a quote, with its date and source |

**Sequence**
1. Answer in one or two spoken sentences first, numbers first, as always.
2. Render the card as a PNG on your computer: `node ~/pantry/src/cli.js event card <kind> [dish|provider]`. For a meal-by-meal walk, `node ~/pantry/src/cli.js event cards dish` renders every meal of the plan in one call. Each prints the PNG path and the alt text (`--json` adds `covers`: who each meal feeds). Spec: `~/pantry/scripts/card-png.md`.
3. Attach the PNG to your message. Put nothing else alongside it. For a meal walk, one short message per meal, each with its card, and say who it feeds from `covers`, never from a guess.
4. If rendering fails, the text answer is enough. Add the card's `alt` only if it says something the text didn't.
5. Diagrams that are really flows or timelines can be Mermaid in markdown instead.

**Validate:** every number on the card is in the tool output. The card's numbers and your sentence agree. Never edit the html by hand.

**Return:** the sentence, plus at most one card.

**Needs approval:** nothing. Cards only show; they never act.
