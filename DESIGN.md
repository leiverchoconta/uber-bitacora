---
name: "Bitácora de ruta"
description: "Weekly logbook for a Uber driver: what the shift actually paid, after fuel."
colors:
  bg: "#f3eee1"
  paper: "#fbf8f0"
  ink: "#1c1b17"
  ink-soft: "#5b5648"
  teal: "#16403d"
  teal-soft: "#3e6663"
  gold: "#d6a13c"
  rust: "#b3492e"
  moss: "#4f7a52"
  line: "#dad1ba"
typography:
  display:
    fontFamily: "Fraunces, Georgia, 'Times New Roman', serif"
    fontSize: "1.5rem"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "normal"
  body:
    fontFamily: "'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.6875rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.025em"
rounded:
  sm: "2px"
  md: "6px"
spacing:
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.teal}"
    textColor: "{colors.paper}"
    rounded: "{rounded.sm}"
    padding: "0.625rem 1rem"
  button-secondary:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0.375rem 0.75rem"
  input:
    backgroundColor: "#ffffff"
    borderColor: "{colors.line}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0.5rem 0.75rem"
  card:
    backgroundColor: "{colors.paper}"
    borderColor: "{colors.line}"
    accentBorderColor: "{colors.gold}"
    rounded: "0"
    padding: "0.875rem 1rem"
  stat-tile:
    backgroundColor: "{colors.paper}"
    dividerColor: "{colors.line}"
    rounded: "0"
    padding: "0.75rem 1rem"
---

# Design System: Bitácora de ruta

Visual contract for `uber-bitacora`. Pairs with `PRODUCT.md` (strategy), `UX.md` (behavior) and `DECISIONS.md` (gaps and open calls). Frontmatter tokens are normative; the implementation carries them as Tailwind v4 `@theme` variables in `app/globals.css`.

## 1. Overview

**Creative North Star: "The professional's paper logbook"**

This is a printed page that happens to compute. The ground is warm paper, not a screen; the structure comes from hairline rules and a two-pixel headline underline, the way a well-set results page is organized. Figures are monospaced so a column of pesos aligns down the page and a change in magnitude is visible as width. Headlines are a serif with optical sizing, which gives the numbers a byline instead of a badge.

Density is deliberately high in the top third — progress, six stat tiles, and the pace statement fit above the fold on a phone — then loosens into the log below. This inverts the usual app shape: the answer comes first, the form second. A driver opening this after a shift gets the state of the week before being asked to type anything.

What it rejects: the gamified gig-driver aesthetic (streaks, confetti, encouragement), the SaaS analytics dashboard (dark cards on grey, gradient KPI tiles, a chart library's default palette), crypto neon, and the scaffolded admin-panel look of Material or Bootstrap defaults. Nothing glows, nothing animates on arrival, nothing congratulates.

**Key Characteristics:**
- Warm paper ground with ink figures — the palette of print, not of interfaces.
- Hairline structure: 1px rules and 1px grid gaps carry the layout; borders are the divider.
- Monospaced numerals throughout, so figures compare by shape.
- Flat by default. No shadow anywhere in the system.
- Editorial hierarchy: serif headlines against monospaced labels in lowercase.

## 2. Colors: The Paper and Ink Palette

Warm, printed, and low-chroma except where a number needs to be believed — one gold for progress, one rust for trouble, one moss for done.

### Primary
- **Deep Teal** (`#16403d`): the structural voice. Headlines, the header's 2px underline, the pace panel's filled ground, primary buttons, and the outline marking the current week's bar in the chart. Everything that organizes the page is teal; nothing decorative is.
- **Teal Soft** (`#3e6663`): hover state for teal surfaces and the settings drawer's summary text. Never used for a figure.

### Secondary
- **Signal Gold** (`#d6a13c`): progress in motion. The weekly progress bar below target, unreached chart bars, the left accent rule on a session card, and secondary buttons offering a correction. Gold means "counting, not there yet".
- **Moss** (`#4f7a52`): a target reached. The progress bar and chart bars switch to moss at or above target, and healthy derived figures (empty-kilometer share under 40%, fare per km at or above expectation) read moss.

### Tertiary
- **Rust** (`#b3492e`): the uncomfortable number. Negative nets, an empty-kilometer share over 40%, a fare per productive kilometer below what was planned, the chart's dashed target line, validation banners, and delete actions. Rust is a statement of fact, never an alarm.

### Neutral
- **Page Ground** (`#f3eee1`): the body ground, and the inset ground of a session card's metric strip.
- **Paper** (`#fbf8f0`): every raised surface — cards, stat tiles, forms, chart box, settings drawer. One step lighter than the page, which is the whole elevation system.
- **Ink** (`#1c1b17`): body text and primary figures. 16.2:1 on paper.
- **Ink Soft** (`#5b5648`): labels, captions, hints, secondary figures. 6.9:1 on paper, 6.3:1 on the page ground — comfortably AA at small sizes, which is why it carries 11px labels.
- **Rule** (`#dad1ba`): every border, divider, and the unfilled track of a progress bar. Also the ground behind 1px-gap grids, where the gap *is* the rule.
- **White** (`#ffffff`): input fields only. An input is the one surface lighter than paper, which is how it reads as writable.

### Named Rules

**The Empty Ink Rule.** A figure that does not exist yet is an em dash (`—`) in ink-soft, never a zero and never a blank. Zero means measured zero; the dash means nothing measured. The fuel panel disappears entirely rather than showing dashes for everything, and a stat whose basis is missing says so in words in its sub-caption ("sin margen medido aún") rather than showing a plausible number.

**The Three Signals Rule.** Exactly three colors carry meaning about numbers: gold (counting), moss (reached), rust (trouble). No fourth signal color is added, and none of the three is ever used decoratively — a gold rule on a card means that card holds a session in progress toward the week, not that gold looked good there.

## 3. Typography

**Display Font:** Fraunces, Georgia, 'Times New Roman', serif
**Body / Label / Mono Font:** 'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace

**Character:** Fraunces is a variable serif with optical sizing and a slight wobble in its curves — it reads as set type rather than as UI, which is what keeps the figures from feeling like a dashboard. Against it, IBM Plex Mono in lowercase gives every label the tone of a pencil annotation, and gives every number a fixed-width column. The pairing is print: headline and marginalia, nothing in between.

### Hierarchy
- **Progress figure** (Fraunces 500, `3rem`, line-height 1): the single number the page exists to show — percentage of the weekly target. Its unit label rides at `0.4em` in ink-soft, so the figure dominates without a second line.
- **Display** (Fraunces 500, `1.5rem`, line-height 1.15): the page title (`Semana del 31 ago — 6 sep`) and section headings, in teal.
- **Headline** (Fraunces 500, `1.125rem`): the pace statement, the measured-fuel figure, the month's net total. Prose-shaped numbers — a full sentence carrying one figure.
- **Title** (Fraunces 500, `1.25rem`): stat tile values and a session card's net. The largest monospaced-context figures.
- **Body** (IBM Plex Mono 400, `0.875rem`, line-height 1.5): captions that explain a derivation, session card metadata, service rows. Comfortable to about 70ch; the page caps at `max-w-3xl` well before that.
- **Label** (IBM Plex Mono 400, `0.6875rem`, letter-spacing `0.025em`, lowercase): every field label, tile label, and hint. Uppercase is reserved for field labels in forms, where scannability beats tone.

### Named Rules

**The Lowercase Label Rule.** Labels are lowercase Spanish, unpunctuated, and describe the figure in the driver's own words — `km en vacío`, `tarifa por km productivo`, `ritmo para cerrar la semana`. Never title case, never a translated product term.

**The Serif-For-Answers Rule.** Fraunces appears only on figures and headings that answer a question. A number the driver typed in stays monospaced; a number the app derived is set in the serif.

## 4. Elevation

**No shadows anywhere.** Depth is entirely tonal and linear: the page ground (`#f3eee1`) sits under paper surfaces (`#fbf8f0`), and every edge is a 1px `#dad1ba` rule. The one-step tonal lift plus a hairline border is the complete elevation vocabulary — there is no second level, no floating layer, and no modal.

Two structural devices replace elevation:

- **The hairline grid.** Stat tiles and a session card's metric strip are laid out on a `#dad1ba` ground with 1px gaps, so the divider is the background showing through rather than a border on each cell. This is what gives the stat block its printed-table feel.
- **Inversion for emphasis.** The pace panel — the one element that is an instruction rather than a record — is filled teal with paper text. It is the only inverted surface in the app, which is why it reads as the loudest thing on the page without any shadow or accent.

### Named Rules

**The Flat Forever Rule.** No `box-shadow` is added to this system, in any state. Focus is an outline, hover is a color change, and the current week's chart bar is marked by an inset outline. If something needs to feel raised, it gets the paper tone and a rule — or it does not need to feel raised.

## 5. Components

### Buttons
- **Shape:** near-square, 2px radius (`{rounded.sm}`). Buttons are stamps, not pills.
- **Primary:** teal ground, paper text, `0.625rem 1rem` padding, `0.875rem` monospace. One per form — the commit action.
- **Secondary:** gold ground, ink text, `0.375rem 0.75rem`, `0.75rem`. Used only for offers the app makes to the driver: add a trip, adopt the measured fuel cost.
- **Link:** no ground, rust text, underlined, `0.6875rem`. Destructive and low-stakes actions (`borrar`, `eliminar sesión`, `cerrar sesión`). Underline drops on hover.
- **Hover / Focus / Disabled:** teal darkens to teal-soft; gold uses `brightness(0.95)`; focus is a 2px teal outline with 1px offset, never a glow. Disabled state does not exist on buttons — an unavailable action is not rendered.

### Fieldsets
- The refuel block is a real `<fieldset>` separated by a 1px top rule, opening with the checkbox and a 10px explanatory line, then its two fields. Grouping is the only affordance available: without JavaScript the fields cannot be hidden when the box is unticked, so the border and the caption carry the conditionality that a disabled state would otherwise show.

### Inputs
- White ground against paper surfaces, 1px rule border, 2px radius, `0.5rem 0.75rem` padding, `1rem` text — the size floor exists so iOS Safari does not zoom on focus.
- Labels sit above the field, always visible, uppercase `0.6875rem` ink-soft with `0.025em` tracking. Hints sit below at `0.625rem`. Placeholders carry examples only (`8`, `Tráfico, zonas, clima…`) and never replace a label.
- Native controls throughout: `type="date"` for dates, `type="number"` with `inputMode` for figures, `<select>` for the week's start day, a real checkbox for the airport flag. No custom pickers.
- **Compact variant** for the inline trip row: `0.375rem 0.5rem` padding, fixed widths (`5rem` for km, `7rem` for amount), so three fields and a button fit one phone line.
- Focus is a 2px teal outline, 1px offset. The date input's picker indicator is set to 50% opacity, since the browser default is invisible on paper.

### Cards
- **Pass list:** paper ground, 1px rule border, no accent. Each payment is one dashed-underlined row — date, amount, and a rust `borrar` link — closed by a total line and the record form. Deliberately the plainest surface in the app: it is a ledger, not a metric.
- **Session card:** paper ground, 1px rule border, a 3px gold left accent rule, zero radius. Bands: a header (date, hours, kilometers, trip count, and net right-aligned), a hairline metric strip on the page ground, an optional 10px caveat line when the shift carried a refuel, then the trip list with its add row. Zero radius is deliberate — the card is a torn page, not a chip. The right-hand label under the net changes with the shift ("neto, con el tanqueo" versus "ingresos del turno") because the two are not comparable figures.
- **Stat tile:** paper ground, no border of its own, `0.75rem 1rem` padding. Label (`0.6875rem` ink-soft), value (Fraunces `1.25rem`), optional sub-caption naming the target it is measured against. Tiles are two-up on a phone and stay two-up — three across would drop each figure below reading size.
- **Chart box:** paper ground, 1px rule border, `1.25rem` top padding. Bars are 70% of column width with a 2px top radius, gold below target and moss at or above. The target line is a 1px dashed rust rule positioned by percentage, labelled at `0.625rem` in rust. The current week's bar carries a 2px inset teal outline.

### Navigation
- Time arrows are 32px squares with a 1px rule border and teal glyphs (`‹` `›`); hover inverts to a teal ground with paper glyph. Disabled arrows drop to 30% opacity and are removed from the accessibility tree — a dead end, not a control.
- Section headings are their own navigation surface: an `h2` in teal over a 1px rule, with the month arrows riding on the baseline at the right.
- Settings are a native `<details>` drawer with a `⚙` summary in teal-soft. No route, no modal.

### Banners
- Full-width, 1px border, 2px radius, `0.75rem 1rem` padding, `0.875rem` text, `role="status"`. Paper ground in both variants — error is rust text on a rust border, success is moss text on a moss border. A tinted 10% wash was tried and dropped: it pushed rust to 4.08:1 and moss to 3.80:1, below AA. Positioned directly below the header so it is the first thing read after the progress figure.

## 6. Do's and Don'ts

**Do**
- Say in words when a figure has no basis yet ("sin margen medido aún", "aún sin promedio") instead of printing a default that reads as measured.
- Set every derived figure in Fraunces and every typed figure in IBM Plex Mono, so the driver can tell what the app concluded from what he entered.
- Use the 1px `#dad1ba` gap-as-divider grid for any block of adjacent figures.
- State a target next to the figure that is measured against it (`meta 1.240 km`), in ink-soft at `0.6875rem`.
- Render an em dash for an unmeasured figure and hide the whole panel when nothing in it has been measured.
- Keep the pace panel the only inverted (teal-filled) surface on the page.
- Give every control a visible label and a 2px teal focus outline.

**Don't**
- Don't add streak badges, confetti, or encouragement copy — no *"¡Vas por buen camino!"*. This is the gamified gig-driver aesthetic named in `PRODUCT.md` → Anti-references.
- Don't build dark navy cards on grey with gradient KPI tiles; the SaaS analytics dashboard look is explicitly rejected.
- Don't introduce glowing accents, black grounds, or animated counters — no crypto/fintech neon.
- Don't fall back to Material or Bootstrap defaults; the app must not read as a scaffolded admin panel.
- Don't add a `box-shadow`, in any state, for any reason (see The Flat Forever Rule).
- Don't add a fourth signal color, and don't use gold, moss, or rust decoratively.
- Don't set input text below `1rem`, which would make iOS Safari zoom on focus and break one-handed use.
- Don't replace a native control (date, number, select, checkbox) with a custom widget.
