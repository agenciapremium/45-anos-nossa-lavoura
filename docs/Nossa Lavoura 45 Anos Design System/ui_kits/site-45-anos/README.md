# UI kit — Site institucional / campanha 45 anos

Recreation of the Nossa Lavoura institutional site in the 45-anos campaign language. No production codebase or Figma file was provided, so the layout is composed strictly from the supplied key visual (`background.png`), the anniversary seal, the four pictograms, the two type families and the three-colour palette. Anything not derivable from those inputs (real product photography, real SKU list, real prices, the corporate logotype) is deliberately typographic or omitted.

## Files
- `index.html` — interactive shell: header nav routes between three screens, lead Dialog with a fake submit.
- `SiteChrome.jsx` — `SiteHeader`, `SiteFooter`, `SectionHead`.
- `HomeScreen.jsx` — hero with KV + seal, numbers strip, product lines, history timeline, CTA panel.
- `CatalogoScreen.jsx` — terra header with dark Tabs, sticky filter panel (Input/Select/Switch/Tag), product grid with alternating chamfers.
- `CampanhaScreen.jsx` — lime campaign hero, offer grid, lead form (Radio/Checkbox/Toast).

## Known gaps
- **No logotype was supplied.** The wordmark is set in Parkinsans Bold as plain type ("NOSSA / LAVOURA"); the seal PNG is the only real brand mark used.
- Product names, prices and unit counts are placeholders.
