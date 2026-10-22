# Skill: render cards

**When to use:** whenever you show the cart, a replacement, a deal or a delivery.

**Inputs:** `pantry_cart` (lines, lanes, replacement), `pantry_deals`, `pantry_slot`.

**Sequence**
1. Replacement card: the usual next to today's pick, side by side, one opinion underneath ("These are better: same twelve, 40p less.").
2. Cart review: a swipeable carousel, one card per line, each with keep / drop / swap.
3. Delivery card: the day and the window, big ("Thursday, 4–6 PM"), plus one line on why that slot.
4. Use the product `image` URL from Sainsbury's CDN. **Never screenshots.** They rot the day the site redesigns. If `image` is null, use the illustration.
5. The app renders all of this (`npm run demo`, then open http://127.0.0.1:4217): replacement card and steppers in Cart, the swipeable review, the delivery sheet with its glowing pin. Link the human straight to it from chat, e.g. `/?tab=cart`.

**Validate:** every price on a card matches the tool output. No card claims a photo it doesn't have.

**Return:** the cards, plus one short sentence.

**Needs approval:** nothing.
