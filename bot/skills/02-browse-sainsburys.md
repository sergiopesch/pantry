# Skill: browse Sainsbury's

**When to use:** before building a cart if product data is more than 7 days old, when a product is new to the household, or when a card shows an illustration instead of a photo.

**Inputs:** the 1Password item named `Sainsbury's`. You reference it; you never read the password into chat, files or logs. A list of product families to look up (from the cart).

**Sequence**
1. Use your own real, headed browser. Measured 22 Oct 2026: plain HTTP to the product API and headless Chromium both get **403 Access Denied (Akamai) on the first request**. A real headed browser loads fine.
2. Log in with 1Password autofill only if you need slots, basket or checkout. Search pages don't need a login.
3. For each family, open `https://www.sainsburys.co.uk/groceries/search?searchTerm=<term>`. One search at a time, a few seconds apart, like a person shopping.
4. Run the extractor (`src/sainsburys/extract.js`, the `extractProducts(document)` function) in the page. It returns name, product URL, CDN image URL, price, Nectar price and unit price. It is read-only: it never clicks and never touches the basket.
5. Save the results to a file and run `node ~/pantry/src/cli.js catalog import results.json --dry-run`. Check the matches, then run it again without `--dry-run`.

**Validate:** at least one product with a non-null `image` on a CDN host (not a screenshot). Prices look like prices. If the extractor returns nothing, Sainsbury's changed their markup: read the page yourself, don't guess.

**Stop rule:** any "Access Denied", captcha or challenge page means stop immediately and report it to the human. Don't retry with tricks. Don't change user agents. Don't fight it.

**Return:** "Refreshed 18 products, 18 with photos. Eggs are £3.35, or £3 with Nectar."

**Needs approval:** nothing for browsing. Adding to the basket is part of checkout and goes through the pay skill.
