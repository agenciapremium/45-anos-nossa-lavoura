# Nossa Lavoura — 45 Anos · Design System

Design system for the **45th anniversary campaign of Nossa Lavoura**, an agricultural supply and animal-nutrition business serving cattle and crop producers (the supplied material is Brazilian Portuguese, Rondônia-region context). The system covers the campaign key visual, the anniversary seal, the octagon shape language, the two type families and the three-colour palette, plus reusable UI primitives and a click-through recreation of the institutional site.

## Sources given
All inputs were files dropped into `uploads/` — **no codebase, Figma file, deck or live site was provided**:

| Upload | Used as |
|---|---|
| `background.png` | Campaign key visual — nelore herd in pasture, golden hour → `assets/images/kv-gado-pasto.png` |
| `selo_45_anos.png` | 3D "45 Anos" anniversary seal with the Nossa Lavoura mark → `assets/selo-45-anos.png` |
| `boi.svg`, `saco.svg`, `grama.svg`, `seta.svg` | The complete pictogram set → `assets/icons/` |
| `Parkinsans-Bold.ttf`, `Parkinsans-Light.ttf` | Display family |
| `HankenGrotesk-Light/Regular/Bold.ttf` | Text family |
| `octogono_*.svg`, `linha_octogono_*.svg` | Brand octagon geometry, solid and line, lima and terra → `assets/shapes/` |
| Brief note | Palette `#3d201b` / `#b8db3d` / `#fffadc`; "shapes are octagons aligned so only two edges are visible, as in the KV" |

Because there was no product source, the component inventory here is the standard from-scratch set (see *Components*), and the UI kit is an interpretation built strictly from the assets above — it is not a recreation of an existing screen.

---

## CONTENT FUNDAMENTALS

**Language.** Brazilian Portuguese, always. Regional, rural, unpretentious — the voice of someone who has been at the counter for 45 years, not a marketing department.

**Person.** Speaks as *we* about the company ("acompanhamos o produtor", "abrimos as portas em 1980") and as *you* (`você` / `seu`) to the producer ("na sua fazenda", "o seu rebanho"). Never `tu`, never third-person corporate ("a empresa oferece").

**Casing.** Sentence case in headlines and body. UPPERCASE reserved for three things: eyebrows/labels, button text, and badges. Never uppercase a whole headline — the display face is wide and it stops reading.

**Length.** Headlines 4–10 words, at most two lines. Body paragraphs one to three sentences, max ~62 characters of measure. Labels one or two words.

**Numbers.** Written large and bare as brand furniture: `45`, `+3.200`, `24h`, `1980 — 2026`. Brazilian conventions: `.` for thousands, `,` for decimals, weights as `30 kg`, `1 t`.

**Tone examples (write like this):**
- Headline: "45 anos ao lado de quem faz o campo"
- Headline: "Começou com um armazém. Virou parceria de gerações."
- Lead: "Nutrição animal, sal mineral, sementes e insumos com consultoria técnica na porteira — do plantio ao pasto."
- Button: "FALAR COM CONSULTOR", "VER OFERTAS", "AGENDAR VISITA" (verb first, ≤3 words)
- Eyebrow: "NUTRIÇÃO ANIMAL", "DESDE 1980 · RONDÔNIA"
- Badge: "45 ANOS", "MAIS VENDIDO", "EM FALTA"
- Confirmation: "Recebemos seu contato. Nosso consultor liga em até 1 dia útil."

**Avoid:** startup vocabulary (*solução*, *plataforma*, *ecossistema*, *inovação disruptiva*), exclamation marks, ALL-CAPS shouting, superlatives without a number behind them, and any English.

**Emoji: never.** Not in UI, not in copy. The pictogram set covers every place an emoji would be tempting.

---

## VISUAL FOUNDATIONS

**Shape language — the octagon is a background element, never a container, and never shows more than two faces.** The motif always appears as a *corner fragment*: one straight edge plus one 45° edge, anchored to a corner of a coloured band or panel, its remaining edges flush off-frame — exactly as in the key visual. Solid-filled or outlined with a transparent centre; the outline is a constant **2px at every size** (non-scaling stroke), never visually thicker on a big fragment and thinner on a small one. Corners carry the source geometry's soft 2% radius. One or two per section, in lima, creme or terra, at low opacity when outlined over photography. It never clips a card, button, image or field, and content is never poured into it. Use the `Octagon` component (parent needs `position:relative; overflow:hidden`); reference shapes live in `assets/shapes/`.

**Corner radii — everything in the UI is rounded.** `--radius-xs 8px` (checkbox, tooltip) · `--radius-control 12px` (buttons, fields, select, icon buttons) · `--radius-card 20px` (cards, panels, toasts) · `--radius-surface 32px` (dialogs, hero blocks, full-bleed image blocks) · `--radius-pill` (tags, switch track, radio markers). Angular, chamfered or clipped corners on interface elements are out of the system.

**Colour.** Three exact values, nothing else at full strength: terra `#3d201b`, lima `#b8db3d`, creme `#fffadc`. Ramps around them (`--terra-900…300`, `--lima-700…100`, `--creme-500…700`) exist for hover, hairlines and soft fills. Roughly a 60/30/10 split: creme grounds, terra structures, lima punctuates. Lima is *only* for primary action, active state and accent numerals — never a large field of it except the campaign strip and the campaign hero. At most two background colours per page (creme + terra, or creme + lima).

**Type.** Parkinsans Bold for everything display (headlines, numerals, the wordmark), tracked `-2%` to `-3%` with leading down to 0.94 at hero size; Parkinsans Light only for oversized date ranges. Hanken Grotesk for text: Light at lead size (19px), Regular for body (15px), Bold for emphasis, labels and buttons. Uppercase micro-type (12px, 0.14–0.22em tracking) is the connective tissue between the two.

**Spacing & layout.** 4-based ramp, 4 → 128px. Page gutter `clamp(20px, 5vw, 64px)`; content maxes at 1400px on marketing surfaces, 1200px (`--content-max`) for text-led pages; prose measure 62ch. Sections breathe at 96px vertical. Nothing is fixed-positioned except the site header (sticky, 76px, terra) and the filter panel (sticky at 100px). Full-bleed colour bands stack against each other with no gaps — the band edge *is* the divider.

**Backgrounds & imagery.** Photography is warm golden-hour field work — nelore cattle, deep green pasture, hazy pale sky; no cool tones, no grain, no black-and-white, no duotone. It is always used full-bleed inside a rounded block, never as a small inset. Over photography, text sits on `--overlay-protection` (terra 76% → transparent, top-down) or a 96° terra side gradient; never on bare image. No repeating patterns, no textures, no decorative gradients — the only gradients in the system are those two protection ramps. The seal PNG is the one 3D/rendered element and is never recoloured, retyped or cropped.

**Elevation.** Flat-first. Depth is an offset slab of solid colour, not blur: `--shadow-slab-sm` (4px 4px terra), `--shadow-slab-md` (8px 8px terra), `--shadow-slab-accent` (8px 8px lima). Blur shadows are reserved for things that genuinely float — `--shadow-lifted` under a dialog or the seal. Cards carry **no** shadow by default: they separate by fill and chamfer alone.

**Borders.** `1px` hairline at 16% terra for field rests and dividers; `2px` for anything intentional (button outlines, active field borders, tab rules, bordered panels); `4px` slab rules for section breaks. Border colour is always a terra mix or lima — never grey.

**Transparency & blur.** Sparingly. `color-mix` terra at 16–76% for hairlines, muted inverse text and scrims. No frosted glass, no backdrop blur anywhere — a chamfered opaque panel does that job.

**Motion.** Short and mechanical: 90ms instant, 160ms controls, 240ms surfaces, 420ms only for a hero reveal. `--ease-standard` cubic-bezier(.2,.7,.3,1) for most things, `--ease-out-firm` for entrances. No bounce, no spring, no parallax, no scroll-jacking, no autoplaying carousels. Fades are paired with a small translate (≤8px), never a scale.

**States.**
- *Hover*: darken one ramp step (lima 500→600, terra 700→900); outline/ghost fill with terra or creme-700 and flip text to creme. Never opacity-based hover.
- *Press*: `translateY(1px)`. No scale-down, no colour change beyond hover.
- *Focus*: 3px lima ring, 2px offset, plus a lima 2px border on fields. Never removed.
- *Disabled*: `opacity .42` and `not-allowed`, colours unchanged.
- *Selected*: solid terra fill with creme text (tags, radio) or lima fill with terra text (tabs, switch).

**Cards.** Rounded 20px, solid fill (white on creme pages, terra for one highlight per grid), no border unless `bordered` is set, no shadow, cover image flush to the top edge at 168px, contents on a 24px pad with a 12px stack. Hover lifts 3px *only* when the card is a link.

---

## ICONOGRAPHY

- **The set is exactly four pictograms**, supplied by the brand and copied verbatim into `assets/icons/`: `boi` (ox, side view), `saco` (feed/seed sack), `grama` (grass tuft), `seta` (thick block arrow, points right at 0°).
- **Style:** solid single-colour silhouettes with cut-out interior details — no strokes, no outline variants, no two-tone. They are illustrative and chunky, matching Parkinsans Bold's weight; they are *not* a UI icon set and should be used at 22px and above (typically 26–72px).
- **Colour:** the four SVGs are inlined in the `Icon` component and inherit `currentColor` — terra on light surfaces, lima on terra. Never multi-colour, never gradient-filled.
- **No icon font, no sprite sheet, no CDN icon library** is part of this brand. If a genuine UI glyph is unavoidable (a close ×, a checkmark tick), use a text character or a 2px-stroke inline path in terra, as `Checkbox` and `Toast` do — and keep it invisible-by-design, never decorative. **Do not** add Lucide/Heroicons/Font Awesome: an icon that isn't one of the four is a brand violation, and rotating `seta` covers direction needs.
- **Unicode as icon:** only `×` (dismiss) and `·` (separator in eyebrows). **Emoji: never.**
- **Logo:** no logotype file was supplied. The seal PNG contains a rendered mark, but no flat/vector logo exists in this system, so the wordmark is set as plain Parkinsans Bold type ("NOSSA / LAVOURA", second line in lima) everywhere a mark would go. **Ask the brand for the vector logo** before shipping anything public.

---

## INDEX

**Root**
- `styles.css` — the single entry point consumers link (`@import` list only).
- `readme.md` — this file. `SKILL.md` — Agent-Skills wrapper. `thumbnail.html` — homepage tile.

**`tokens/`** — `fonts.css` (@font-face), `colors.css`, `typography.css`, `spacing.css`, `shape.css` (radius tokens + the `.nl-octagon` background clip), `elevation.css`, `motion.css`, `base.css` (resets, `.nl-eyebrow`, `.nl-hero`).

**`assets/`** — `selo-45-anos.png`, `images/kv-gado-pasto.png`, `icons/{boi,saco,grama,seta}.svg`, `shapes/{octogono,linha-octogono}-{verde,marrom}.svg` (brand-supplied octagon geometry), `fonts/*.ttf`.

**`guidelines/`** — 22 specimen cards feeding the Design System tab, grouped Colors / Type / Spacing / Brand.

**`components/`**
- `core/` — `Icon`, `Octagon`, `Button`, `IconButton`, `Badge`, `Tag`, `Panel`, `Card`
- `forms/` — `Input`, `Select`, `Checkbox`, `Radio`, `Switch`
- `navigation/` — `Tabs`
- `feedback/` — `Dialog`, `Toast`, `Tooltip`

Each has `<Name>.jsx`, `<Name>.d.ts` and `<Name>.prompt.md`; each directory has one `@dsCard` demo HTML.

**Intentional additions** (no source defined a component inventory, so the standard set was authored):
- `Icon` — wrapper for the four supplied pictograms, so nobody hand-rolls SVG.
- `Panel` — the rounded surface as a primitive, so radius and tone stay consistent.
- `Octagon` — the background motif as a component (corner fragment, solid or 2px outline), so nobody re-cuts it onto a container or exposes a third face.

**`ui_kits/site-45-anos/`** — click-through institutional site: header/footer chrome, home, catalogue, campaign landing. See its own README for gaps.

## Caveats
- Fonts are the brand's own TTFs (no substitution needed). Only the weights supplied exist: Parkinsans 300/700, Hanken Grotesk 300/400/700 — do not use 500/600.
- No logotype, no product photography, no real SKU/price data, no live site or codebase was available; all product names, prices, unit counts, phone numbers and city lists in the UI kit are placeholders.
