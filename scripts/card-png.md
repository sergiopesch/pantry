# Posting a Pantry card as an image

Pantry has no Visualize tool here, so cards go into the chat as PNGs. The engine renders them itself, with a
headless Chrome on the bot's computer and no dependencies:

```
node ~/pantry/src/cli.js event card plan              # one card: plan, headcount, diets, options, order, payment, inbox, debrief
node ~/pantry/src/cli.js event card dish "Chicken curry meal"
node ~/pantry/src/cli.js event card provider vandas-kitchen
node ~/pantry/src/cli.js event card memory "Hearth & Co billed £70 over quote." 2026-04-23
node ~/pantry/src/cli.js event cards dish             # every meal of the plan, one PNG each, in one call
```

Each prints the PNG path and the card's alt text (`--json` for `{ kind, title, alt, png, covers }`). Attach the
PNG and say the one-sentence answer; use `alt` as the image description, and for meals read `covers` (who it
feeds) rather than guessing.

How it renders: 600 CSS px wide at 2x, with reduced motion (the card's final frame at once), clipped to
`#pantry-card` on a transparent background, so the rounded corners stay round and there are no margins. Chrome
is found automatically (Chrome, Chromium or Playwright's headless shell); set `PANTRY_CHROME` to point at one.
Cards land in `$TMPDIR/pantry-cards` unless `PANTRY_CARD_DIR` says otherwise. If rendering fails, send the text
answer alone.
