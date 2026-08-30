---
name: CHS Lunch
description: Mobile-first school lunch menu viewer — answers "what's for lunch today?" in under two seconds.
colors:
  # Colgan High School's three published school colors.
  brand-colgan-blue: "#041e42"
  brand-caribbean-blue: "#69b3e7"
  brand-shark-gray: "#706f6f"
  # Derived mid-tone. Caribbean Blue only reaches 2.0:1 on the light surface,
  # so light mode needs a darker brand blue for text, borders and focus rings.
  accent-dark: "#69b3e7"
  accent-light: "#0f5aa0"
  accent-fill-dark: "#69b3e7"
  accent-fill-light: "#041e42"
  accent-fill-text-dark: "#041e42"
  accent-fill-text-light: "#ffffff"
  bg-dark: "#05101e"
  bg-light: "#f2f5fa"
  text-dark: "#ffffff"
  text-light: "#0d1b2a"
  status-fresh: "#22c55e"
  status-stale: "#f59e0b"
  status-error: "#ef4444"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif"
    fontSize: "clamp(22px, 6.5vw, 32px)"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-1px"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif"
    fontSize: "clamp(20px, 5vw, 24px)"
    fontWeight: 900
    lineHeight: 1.1
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif"
    fontSize: "clamp(15px, 4.5vw, 21px)"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif"
    fontSize: "clamp(12px, 3.2vw, 15px)"
    fontWeight: 400
    lineHeight: 1.35
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif"
    fontSize: "clamp(0.625rem, 2.5vw, 0.6875rem)"
    fontWeight: 700
    letterSpacing: "0.08em"
rounded:
  pill: "999px"
  lg: "18px"
  md: "16px"
  sm: "14px"
  chip: "12px"
  # Two small radii that were always in the CSS but never recorded here.
  # Both are deliberate, not drift: skeleton bars sit a touch tighter than the
  # content they stand in for, and confetti must stay near-square — at any of
  # the larger radii a 10px piece becomes a disc.
  xs: "10px"
  hairline: "2px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
components:
  day-chip-default:
    backgroundColor: "transparent"
    textColor: "rgba(255,255,255,0.68)"
    rounded: "{rounded.chip}"
    padding: "8px 16px"
  day-chip-active:
    backgroundColor: "{colors.accent-fill-dark}"
    textColor: "{colors.accent-fill-text-dark}"
    rounded: "{rounded.chip}"
    padding: "8px 16px"
  day-chip-today:
    backgroundColor: "transparent"
    textColor: "{colors.accent-dark}"
    rounded: "{rounded.chip}"
  entree-block:
    backgroundColor: "rgba(255,255,255,0.065)"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
  section-block:
    backgroundColor: "rgba(255,255,255,0.065)"
    rounded: "{rounded.md}"
    padding: "11px 14px"
  theme-toggle:
    backgroundColor: "rgba(255,255,255,0.06)"
    textColor: "{colors.text-dark}"
    rounded: "{rounded.pill}"
    width: "42px"
    height: "42px"
  retry-button:
    backgroundColor: "{colors.accent-fill-dark}"
    textColor: "{colors.accent-fill-text-dark}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
  today-shortcut:
    backgroundColor: "transparent"
    textColor: "{colors.accent-dark}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  no-school-hero:
    artSize: "clamp(112px, 30vw, 168px)"
    artGround: "linear-gradient(#0B4078, #041E42)"
    artAccent: "{colors.brand-caribbean-blue}"
    artHighlight: "#F4FAFE"
---

# Design System: CHS Lunch

## 1. Overview

**Creative North Star: "The Quiet Instrument"**

This system disappears into its task. The interface exists to deliver one piece of information — what is for lunch today — and then yield. Every design decision is evaluated against that principle: does this help the student glance and go, or does it demand attention the task doesn't warrant? The answer governs everything from the deep navy background (no ambient glow to compete with the entree text) to the decision to use the system font stack (native rendering, zero download cost, familiar weight at every size).

The system is calm at rest and confident in motion. Transitions confirm selection rather than decorate it; the countdown number flips like a physical display rather than fading; confetti erupts exactly once per school year. Playfulness is rationed. The emoji category icons earn their place because they function: they speed scanning by making each food group pattern-matchable at a glance, not because they add personality for its own sake.

The dual theme (dark default, light optional) honors the physical context. Students check this in the hallway, under fluorescent lights, in dim homerooms. Dark is the right call for the modal use case. Light mode exists for parents at a bright desk. Both themes share the same semantic token layer; neither is an afterthought.

**Key Characteristics:**
- Single-column, full-viewport, no sidebars or nav chrome
- Content hierarchy: entree first, everything else secondary
- System font stack: zero FOUT, native weight rendering at any DPI
- Dual theme driven by CSS custom properties on `[data-theme]`
- Motion is confirmatory, not choreographic: transitions answer "did that work?" not "isn't this nice?"
- Reduced motion honored globally; all animations have an instant alternative

## 2. Colors: The Colgan Palette

Two surfaces, one signal — now carrying the school's own identity. The palette is Colgan High School's three published colors, applied so that the brand reads at a glance without the app turning into an institutional portal.

### Brand
Colgan High School publishes three colors. They are the source of truth for everything below.

- **Colgan Blue** (`#041e42`): The primary navy. Fills the selected state in light theme, letters it in dark theme, and is the PWA `theme_color`.
- **Caribbean Blue** (`#69b3e7`): The bright accent. Carries all interactive meaning in dark theme.
- **Shark Gray** (`#706f6f`): Reserved for neutral, non-text surfaces (the light-theme skeleton). It reaches only 4.47:1 on the light background — just under the 4.5:1 body-text floor — so it is never used for text.

The blues are water colors by design: the school chose them to complement its two-pool aquatic center, which is also why the app icon is a fin cutting a surface.

### Primary
- **Accent — Dark** (`#69b3e7` / `--c`, `--accent-text`): Caribbean Blue. The `border-top` stripe on the active day card, focus rings, today chip border, countdown border tint, accent text. 8.0:1 on the dark surface. Appears in ≤10% of any screen; its rarity is the point.
- **Accent — Light** (`#0f5aa0` / `--c`, `--accent-text` in light theme): A mid-tone derived from Colgan Blue. It exists because Caribbean Blue reaches only 2.0:1 on the light surface and cannot carry text or borders there. 6.5:1 on the light surface.
- **Selected fill** (`--accent-fill` / `--accent-fill-text`): The two brand blues swap roles by theme so the selected state always has maximum contrast against its own surface — dark theme fills Caribbean and letters Colgan (7.2:1); light theme fills Colgan and letters white (16:1).

### Neutral
- **Deep Navy** (`#05101e` / `--bg` dark): The dark body background. Colgan Blue driven down in lightness, so the app reads navy rather than neutral black, without the pure-black harshness.
- **Pale Tide** (`#f2f5fa` / `--bg` light): The light body background. A cool near-white tinted toward the brand's own hue rather than toward default warmth.
- **Glass Surface** (`rgba(255,255,255,0.065)` / `--card-bg` dark): All cards and section blocks in dark theme. Transparent enough to let the navy breathe.
- **Solid Surface** (`rgba(255,255,255,0.86)` / `--card-bg` light): Cards in light theme. Opaque white against the tinted background creates clear card lift.
- **Primary Text** (`#ffffff` dark / `#0d1b2a` light / `--text`): Body and display text. The light-theme ink is a very dark navy rather than pure black, so text sits in the brand family.
- **Muted Text** (`rgba(255,255,255,0.68)` dark / `rgba(4,30,66,0.68)` light / `--muted`): Secondary text: captions, meta labels, countdown labels. 5.3:1 in light theme. Always verify 4.5:1 before applying to small text.
- **Divider** (`rgba(255,255,255,0.08)` dark / `rgba(4,30,66,0.10)` light / `--line`): Borders, separators, chip outlines at rest.

### Status
- **Fresh Green** (`#22c55e`): Status dot — data is current. Never used decoratively.
- **Stale Amber** (`#f59e0b`): Status dot — data is past its TTL. Never used decoratively.
- **Error Red** (`#ef4444`): Status dot (offline). The error banner uses the darkened `#dc2626` for 4.5:1 text contrast. Never used as a text color on its own.

Status colors stay outside the brand palette deliberately. Fresh/stale/offline must be readable as universal semantics; recoloring them into school blues would make state indistinguishable from accent.

**The One Accent Rule.** Colgan Blue and Caribbean Blue are two forms of one brand identity — a filled form and a text-safe form — not two accents. `#0f5aa0` is a contrast-driven derivation of Colgan Blue, not a third color. No other accent hue is permitted. No purple, no teal, no orange alongside them.

**The Status-Only Rule.** Green, amber, and red are semantic status colors exclusively. They appear on the 6×6px status dot and the error banner background. They are prohibited on cards, section labels, chip backgrounds, or any decorative surface.

## 3. Typography

**Body / Display Font:** System font stack — `-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif`

No custom font is loaded. SF Pro renders on Apple devices at native quality; system-ui or BlinkMacSystemFont covers everything else. The result is zero download time and weight rendering identical to the OS UI the student just came from.

**Character:** Single-family, weight-driven hierarchy. SF Pro's full weight range (400 → 900) provides enough contrast to distinguish every level without a second typeface. The scale is aggressive: display text hits weight 900 and tight letter-spacing (-1px); labels drop to 10-11px with wide tracking (0.06-0.12em) and ALL CAPS.

### Hierarchy

- **Display** (weight 900, `clamp(22px, 6.5vw, 32px)`, line-height 1, letter-spacing -1px): The date name on the day card (`<span class="day-name">`). The largest text on screen. Compressed to a single line. Used once per view.
- **Headline** (weight 900, `clamp(20px, 5vw, 24px)`): Empty-state headings (`h2.no-school-title`, `h2` in error states). Used for non-data headings only.
- **Title** (weight 700, `clamp(15px, 4.5vw, 21px)`, line-height 1.2): Entree items — the most important food content. Heavier than body because the entree is what 90% of users open the app to read.
- **Body** (weight 400 / 600 implicit, `clamp(12px, 3.2vw, 15px)`, line-height 1.35): Section list items (sides, fruit, drink, etc.). Lighter weight signals secondary priority. Color is `--list-text` (75% white / 72% black).
- **Label** (weight 700-900, `clamp(0.625rem, 2.5vw, 0.6875rem)`, ALL CAPS, letter-spacing 0.06–0.12em): Section eyebrows (`🍗 ENTREE`, `🥗 SIDES`), chip weekday abbreviations (`MON`), caption text (freshness label), today badge. This is the only context where all-caps is used and the copy is always ≤2 words.
- **Brand Header** (weight 800, `clamp(14px, 3.8vw, 16px)`, letter-spacing -0.5px): The "CHS Lunch" `h1` in the sticky header. Deliberately small — the brand does not compete with the menu.

**The Label Cap Rule.** ALL CAPS is reserved for labels of ≤4 words at label scale (≤11px). No sentence-case text is set in all-caps. No body copy is uppercased. The uppercase budget is spent entirely on: chip weekday abbreviations, section category eyebrows, the "TODAY" badge, and the today-shortcut "↩ Today" label (mixed case there by exception).

**The No FOUT Rule.** No web fonts are loaded. The system font stack is non-negotiable for this use case: students check this on spotty school Wi-Fi. A font download adds latency and layout shift at exactly the wrong moment.

## 4. Elevation

This system uses **tonal layering**, not traditional drop shadows and not backdrop-blur. Depth is established by surface opacity, not shadow casting.

### Surface Layers (dark theme, bottom to top)
- **Base** (`--bg: #05101e`): The body background. Deepest layer. Colgan Blue driven down in lightness, so the app reads navy rather than neutral black.
- **Chrome** (`--header-bg: rgba(5,16,30,0.97)`, `--tabs-bg: rgba(5,16,30,0.95)`): The header and tab strip. Nearly opaque dark surfaces separated from content by a hairline border. They are ordinary flex items in a non-scrolling column, not sticky overlays — content scrolls *below* them, inside `.day-card`, never behind them.
- **Card Surface** (`--card-bg: rgba(255,255,255,0.065)`): Menu content cards. The lightest layer, making cards subtly legible against the deep navy base.
- **Active State** (`--accent-fill`): The selected day chip. Only fully opaque non-base layer. Makes the selection unmistakably clear. Caribbean Blue on dark, Colgan Blue on light — see The One Accent Rule.

### Shadow Vocabulary
- **Card inset highlight** (`inset 0 1px 0 rgba(255,255,255,0.09)`): Applied to cards in dark theme. Simulates a top-edge specular highlight, adding a slight sense of physical presence to the glass card.
- **Card ambient drop** (`0 2px 8px rgba(0,0,0,0.20), 0 8px 24px rgba(0,0,0,0.12)`): Applied to cards in dark theme. Subtle two-layer depth. Not structural — purely ambient.
- **Toggle ambient** (`0 10px 30px rgba(0,0,0,0.18)` dark / `0 10px 30px rgba(4,30,66,0.12)` light): The theme toggle button. In light mode, a Colgan Blue tinted glow links the button to the brand accent.

**The No-Blur Rule.** `backdrop-filter` is used nowhere in this stylesheet. It was previously set on the header and tab strip, which never satisfied the condition that made it meaningful: neither is `position: sticky`, and `#app`'s flex column means nothing is ever painted behind them, so the filter had only the flat body colour to blur. The visible cost was real — the compositing layer it forced was rasterised at the wrong scale by iOS Safari, leaving the header title and theme toggle soft while the rest of the screen stayed sharp. Default to tonal layering. Reach for blur only if an element is genuinely `position: sticky` or `fixed` with content passing underneath it, and verify on a real iOS device before keeping it.

**The Flat-Card Rule.** Cards are flat at rest. The inset highlight and ambient drop shadow are passive; they do not change on hover. Only the entree/section block's `:active` state fires (scale 0.97 press feedback). Hover elevation lift is prohibited.

## 5. Components

### Day Chip / Tab Strip

The week navigation. Compact, scrollable, keyboard-accessible tablist.

- **Shape:** Softly rounded (12px) rectangle
- **Default:** Transparent background, muted text (`rgba(255,255,255,0.68)`), 1px `--line` border. Padding `8px 16px` (clamps with viewport)
- **Today (unselected):** Accent border (`--c`), accent-text color, pulsing glow (`todayPulse` 2.4s ease-in-out infinite — opacity on a static-shadow `::after` layer, compositor-only)
- **Active (selected):** `--accent-fill` background with `--accent-fill-text` letters — Caribbean Blue on Colgan Blue in dark theme, Colgan Blue on white in light. `chipSpring` entrance (scale 0.86 → 1, `cubic-bezier(0.22, 1, 0.36, 1)`, 0.28s). Despite the name this is an ease-out-quint settle, not a bounce: both y control points are 1, so it never overshoots.
- **Layout:** Flex column; abbreviated weekday label on top (label scale, weight 800, uppercase), numeric date below (weight 900, `clamp(14px, 4vw, 18px)`)
- **Keyboard:** Full ARIA tablist with `ArrowLeft/Right/Up/Down/Home/End` navigation; selected chip auto-scrolls into center
- **Interaction:** `tabIndex={selected ? 0 : -1}` pattern — roving focus

### Entree Block

The primary content card. Always first in the day view.

- **Shape:** Gently rounded (18px)
- **Default variant (`compact`):** Solid card bg, 10px vertical padding. Used when ≤2 entree items
- **Featured variant:** Blue-tinted gradient overlay (`linear-gradient(160deg, color-mix(in srgb, var(--c) 12%, var(--card-bg)), var(--card-bg))`). Used when ≥3 entree items. The tint signals "there's more here" without changing the structure
- **Label:** `🍗 ENTREE` in accent text, label scale, weight 800, 6px gap before emoji
- **Items:** Title-scale text (weight 700, `clamp(15px, 4.5vw, 21px)`). Line-height 1.2 to pack 2-3 items cleanly
- **Entrance animation:** None — the entree renders statically so the answer to "what's for lunch" is readable the instant the card mounts

### Section Blocks

Secondary food categories (Sides, Fruit, Drink, Grains, Condiments, Dessert). Rendered in a 2-column CSS Grid.

- **Shape:** Gently rounded (16px)
- **Default:** Standard card bg, 11px vertical padding
- **Wide variant:** `grid-column: span 2` — used when `section.wide === true`. Spans the full row
- **Label:** `{emoji} {CATEGORY}` in muted color, label scale, weight 700. Emoji distinguishes category at a glance without reading the label
- **Items:** Body-scale text in `--list-text` (75% white / 72% black). Margin-bottom 1px — minimal vertical rhythm
- **Stagger:** `sectionFadeIn` 0.6s, `animationDelay: (i + 1) * 100ms` — sections float in after the static entree, reinforcing hierarchy; the last section settles within the 2-second glance budget
- **Press feedback:** `transform: scale(0.97)` on `:active`

### Skeleton Loader

Structural placeholder shown only when there is no cached data (no layout shift on repeat visits).

- **Role:** `role="status" aria-busy="true" aria-label="Loading menu"` — announced to screen readers
- **Shimmer:** `background: linear-gradient(90deg, var(--skeleton-base), var(--skeleton-highlight), var(--skeleton-base))` with `background-size: 200%` animated by `shimmer` (1.2s linear infinite). Tokens are themed (white rgba in dark, black rgba in light) so the shimmer is visible on both surfaces
- **Structure:** Mirrors the actual DayCard DOM (day head + entree block + two section blocks) so the layout doesn't reflow when real content arrives

### School Countdown Widget

Appears from May 1 through the last day of school each year.

- **Shape:** Rounded rectangle (14px), 1px accent border tint (`color-mix(in srgb, var(--c) 35%, var(--line))`), blue-tinted card bg
- **Content:** Plain-language label ("School ends in X days · Jun 12") with the exact end date inline. Accent text for the number (weight 900), muted for the label (weight 700)
- **Flip animation:** When the day count changes, `flipCount` fires (rotateX 0 → 90 → -90 → 0deg, 0.38s ease-in-out) — simulates a split-flap display
- **Perspective:** `perspective: 300px` on the container so the 3D rotation is legible
- **Last-day variant:** Replaced with "Today is the last day! 🎉" and triggers the Confetti component
- **Responsive:** At ≤360px viewport, detaches from the day-head flex row and renders full-width below the date block

### Theme Toggle

Circular button in the header, top-right corner.

- **Shape:** 42×42px circle (border-radius 999px)
- **Background:** Semi-transparent (`rgba(255,255,255,0.06)` dark / `rgba(4,30,66,0.06)` light), 1px `--line` border
- **Icon:** Emoji (`☀️` / `🌙`), 18px, aria-hidden. Button carries the accessible label
- **Hover:** `translateY(-1px)` — subtle lift, 0.15s ease
- **Active:** `translateY(0)` — returns to baseline
- **Shadow:** `toggle-shadow` token — in light mode includes blue glow linking to accent

### Status Dot

6×6px circle in the header meta-row conveying data freshness.

- **Fresh:** `#22c55e` dark / `#16a34a` light — data arrived this session within TTL
- **Stale:** `#f59e0b` dark / `#b45309` light — data is past its expected refresh deadline
- **Offline:** `#ef4444` — no network and serving cached data (passes 3:1 on both surfaces)
- **Refreshing:** Any color + `dotPulse` animation (opacity 1 → 0.35 → 1, 1.2s ease-in-out infinite) — background fetch in progress

### Today Shortcut

Appears in the meta-row when the selected day is not today.

- **Shape:** Pill (border-radius 999px), 1px accent border (`--c`). Visual pill is ~21px tall; an invisible `::before` overlay (`inset: -12px -8px`) extends the tap target to ≥44px
- **Text:** "↩ Today", 0.625rem, weight 800, accent-text color — the arrow signals navigation, not status
- **Hover:** Fills with `--accent-fill` and letters with `--accent-fill-text` — matching the day chip active state
- **Purpose:** One-tap and keyboard-accessible path back to today's menu from any day view

### Confetti

Full-viewport overlay on the last day of school. `aria-hidden="true"` — purely decorative.

- **48 pieces**, each 6-14px, random horizontal position, brand palette colors plus green/purple/pink
- **Fall animation:** `cubic-bezier(0.55, 0, 1, 0.45)` easing — accelerates like gravity
- **Duration:** 2.2–4.2s per piece, delay 0–1.8s — staggered to feel organic

### No-School Hero

The illustration shown when there is no menu to show and that is the correct answer: summer break, and a week with every day cancelled. Rendered by `NoSchoolHero` from `src/assets/hero/`, resolved by glob so a missing file degrades to the emoji each state used previously rather than breaking the build.

- **Art size:** `clamp(112px, 30vw, 168px)` — larger than the `clamp(56px, 16vw, 80px)` emoji it replaces. An emoji is a glyph tuned to read at text scale; an illustration carries interior detail that turns to mush at 80px
- **Self-contained ground:** each illustration is an opaque badge carrying its own navy gradient, not loose artwork on the theme surface. Referenced through `<img>`, no CSS variable or `currentColor` can reach inside to retint per theme, and no single brand value survives both surfaces — Caribbean Blue clears 7.9:1 on `--bg` dark but only ~2:1 on light. Same reasoning as `public/icon.svg`
- **No warm accent:** the obvious sun colour is a gold, but the only warm value in the system is Status Stale `#f59e0b`, which already means "this snapshot is old" in the freshness dot inches above. The sun is `#F4FAFE` instead, reading as a light source against the navy
- **Distinct per state:** summer is a sunrise over water — rays on the upper arc only, so the sun reads as coming up out of the water rather than floating above it — and a cancelled week is a cleared calendar. Both states previously used a sun emoji (🏖️ / ☀️) and were hard to tell apart at a glance; a calendar reads as *a week*, which is the actual distinction
- **Motion:** `heroFloat` — a 4s ±8px vertical drift, not the emoji's `sunPulse`. That animation rotates ±4deg, invisible on a radially symmetric emoji but visibly skewing a badge with a straight-edged calendar in it
- **Accessibility:** `alt=""`. The `h2.no-school-title` directly below states the same thing, so alt text would make a screen reader say it twice
- **Delivery:** excluded from Vite's inline limit in `vite.config.ts` so the art stays an external file. Inlined it added ~5.3KB of base64 to the entry chunk every visitor downloads, for artwork that never renders on an ordinary school day

### Error Banner

Fixed position, top of viewport, `role="alert"` for screen reader announcement.

- **Background:** `#dc2626` (darkened Error Red — 4.8:1 with white text at 13px; the status-dot red `#ef4444` stays unchanged)
- **Position:** `position: fixed`, above all content (z-index 30)
- **Typography:** 13px, weight 800, centered

### Swipe Hint

Temporary guidance element; shown once per browser session when multi-day data first loads.

- **Position:** Between tab strip and main content
- **Animation:** `hintFadeOut` — stays at 0.75 opacity for the first 50% of 2.5s, then fades to 0. Removed from DOM after JS timeout
- **Text:** "Swipe left or right to browse days"
- **Accessibility:** `aria-hidden="true"` — sighted mobile guidance only; screen reader users get the tablist role

## 6. Do's and Don'ts

### Do:
- **Do** keep the entree as the first and largest content block on every day view. If a day has no entree, the empty state still uses the entree block's position and shape.
- **Do** use the system font stack exclusively. No custom fonts. No Google Fonts. No icon fonts.
- **Do** use the brand blues for all interactive affordances — borders, fills, focus rings — via the `--c` / `--accent-fill` / `--accent-text` tokens rather than literal hex, so the light theme's darker blue swaps in automatically. There is no second accent color.
- **Do** leave `backdrop-filter` out. Nothing in the current layout scrolls behind anything, so it has no backdrop to act on. If a future overlay genuinely needs it, confirm the element is `position: sticky` or `fixed` with content passing underneath, and check the result on a real iOS device — a wrongly-rasterised compositing layer shows up as blurry text, not a blurry backdrop. (See: The No-Blur Rule.)
- **Do** stagger section entrance animations by 100ms per section (0.6s duration). The entree renders statically, then secondary sections float in order; the trio must settle within the 2-second glance budget.
- **Do** honor `prefers-reduced-motion` with the global `animation: none !important` override already in the stylesheet.
- **Do** give every status color a semantic purpose. Fresh green = data is current. Amber = data is stale. Red = offline or error. These colors mean specific things; their specificity is their value.
- **Do** use the `clamp()` scale for display and title text. Fixed sizes only for label and caption (0.6875rem) and the brand header.
- **Do** use `text-wrap: balance` on any heading that can wrap; it is already applied to `h1` and `.day-title-block`.
- **Do** test touch targets at 44×44px minimum. The day chips, theme toggle (42px — borderline), and retry button are the critical surfaces.

### Don't:
- **Don't** add sidebar navigation, widget grids, or any layout pattern from a generic dashboard template. This app has no nav; the week tabs are the only navigation surface. (Anti-reference: "Generic dashboard templates.")
- **Don't** add photography, hero images, or marketing chrome. The content is text. Decoration competes with the entree. (Anti-reference: "Consumer food apps — too much photography/marketing chrome.")
- **Don't** introduce a second accent color. No purple, teal, orange, or red alongside the Colgan blues for interactive surfaces. Status colors (green/amber/red) are semantic-only and never used as accent.
- **Don't** hardcode Caribbean Blue (`#69b3e7`) as text or a border in light theme. It reaches only 2.1:1 there and fails AA outright — that is what the derived `#0f5aa0` exists for, and why `App.css.test.ts` asserts real contrast ratios rather than literal hex values.
- **Don't** re-add `backdrop-filter` to the header, the tab strip, cards, or decorative surfaces. It was removed because it did nothing but blur the header's own text on iOS. (See: The No-Blur Rule.)
- **Don't** use `border-left` or `border-right` greater than 1px as a colored stripe on any card or list item. The day card's `border-top: 3px solid var(--c)` is the single permitted structural use of a colored border stripe.
- **Don't** add gradient text (`background-clip: text` with a gradient). Use solid accent colors for emphasis.
- **Don't** animate layout properties. The stagger uses `opacity` and `transform` only. Animating `height`, `padding`, `margin`, or `width` causes reflow.
- **Don't** add section eyebrows (small all-caps tracked labels) above new sections. The section category labels (`🍗 ENTREE`) are functional identifiers, not eyebrows. New content areas should not get decorative kickers.
- **Don't** set body copy or list items in all-caps. ALL CAPS is permitted only for: chip weekday abbreviations, the TODAY badge, and section category labels (which are single-word identifiers, not sentences).
- **Don't** build a heavy school-district portal: no cluttered header, no desktop-first multi-column layout, no institutional color palette (navy/maroon/gold). (Anti-reference: "Heavy school-district portals — cluttered, dated, desktop-first.")
- **Don't** use shadows to convey hover state on cards. Cards are `flat at rest, flat on hover`. Press feedback (`scale(0.97)` on `:active`) is the only touch feedback.
- **Don't** break the school countdown or confetti into reusable components used elsewhere. They are intentionally unique — the countdown's rarity and the confetti's once-a-year firing are the point.
