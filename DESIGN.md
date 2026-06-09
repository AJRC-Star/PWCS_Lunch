---
name: BMS Lunch
description: Mobile-first school lunch menu viewer — answers "what's for lunch today?" in under two seconds.
colors:
  accent: "#3b82f6"
  accent-fill: "#2563eb"
  accent-text-dark: "#60a5fa"
  accent-text-light: "#1d4ed8"
  bg-dark: "#08080f"
  bg-light: "#f5f5f7"
  text-dark: "#ffffff"
  text-light: "#111111"
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
    backgroundColor: "{colors.accent-fill}"
    textColor: "{colors.text-dark}"
    rounded: "{rounded.chip}"
    padding: "8px 16px"
  day-chip-today:
    backgroundColor: "transparent"
    textColor: "{colors.accent-text-dark}"
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
    backgroundColor: "{colors.accent-fill}"
    textColor: "{colors.text-dark}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
  today-shortcut:
    backgroundColor: "transparent"
    textColor: "{colors.accent-text-dark}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
---

# Design System: BMS Lunch

## 1. Overview

**Creative North Star: "The Quiet Instrument"**

This system disappears into its task. The interface exists to deliver one piece of information — what is for lunch today — and then yield. Every design decision is evaluated against that principle: does this help the student glance and go, or does it demand attention the task doesn't warrant? The answer governs everything from the near-black background (no ambient glow to compete with the entree text) to the decision to use the system font stack (native rendering, zero download cost, familiar weight at every size).

The system is calm at rest and confident in motion. Transitions confirm selection rather than decorate it; the countdown number flips like a physical display rather than fading; confetti erupts exactly once per school year. Playfulness is rationed. The emoji category icons earn their place because they function: they speed scanning by making each food group pattern-matchable at a glance, not because they add personality for its own sake.

The dual theme (dark default, light optional) honors the physical context. Students check this in the hallway, under fluorescent lights, in dim homerooms. Dark is the right call for the modal use case. Light mode exists for parents at a bright desk. Both themes share the same semantic token layer; neither is an afterthought.

**Key Characteristics:**
- Single-column, full-viewport, no sidebars or nav chrome
- Content hierarchy: entree first, everything else secondary
- System font stack: zero FOUT, native weight rendering at any DPI
- Dual theme driven by CSS custom properties on `[data-theme]`
- Motion is confirmatory, not choreographic: transitions answer "did that work?" not "isn't this nice?"
- Reduced motion honored globally; all animations have an instant alternative

## 2. Colors: The Deep Signal Palette

Two surfaces, one signal. The palette is near-black or near-white with a single blue accent that carries all interactive meaning.

### Primary
- **Signal Blue** (`#3b82f6` / `--c`): The brand accent. Used as: the `border-top` stripe on the active day card, day chip active fill, focus rings, today chip border, countdown widget border tint. Appears in ≤10% of any given screen. Its rarity is the point.
- **Action Blue** (`#2563eb` / `--accent-fill`): Darker, filled variant. Used exclusively for primary action backgrounds: the active day chip fill, the Refresh Menu button, and the retry button. Never used for text.
- **Accessible Blue — Dark** (`#60a5fa` / `--accent-text`): Lighter blue, passes 4.5:1 on the dark background. Used for accent text, section labels on entree blocks, day weekday labels, today shortcut text. Dark theme only.
- **Accessible Blue — Light** (`#1d4ed8` / `--accent-text` in light theme): Darker blue, passes 4.5:1 on the light background. Swaps in via `[data-theme='light']`.

### Neutral
- **Deep Void** (`#08080f` / `--bg` dark): The dark body background. Not pure black; a near-black with a very slight violet cast. Prevents the pure-black harshness while still reading as dark.
- **Apple Silver** (`#f5f5f7` / `--bg` light): The light body background. Apple's canonical gray — familiar, neutral, slightly cool.
- **Glass Surface** (`rgba(255,255,255,0.065)` / `--card-bg` dark): All cards and section blocks in dark theme. Transparent enough to let the near-black breathe.
- **Solid Surface** (`rgba(255,255,255,0.82)` / `--card-bg` light): Cards in light theme. Opaque white against the silver background creates clear card lift.
- **Primary Text** (`#ffffff` dark / `#111111` light / `--text`): Body and display text.
- **Muted Text** (`rgba(255,255,255,0.68)` dark / `rgba(0,0,0,0.64)` light / `--muted`): Secondary text: captions, meta labels, countdown labels, list items at 0.75 opacity. Always verify 4.5:1 before applying to small text.
- **Divider** (`rgba(255,255,255,0.08)` dark / `rgba(0,0,0,0.08)` light / `--line`): Borders, separators, chip outlines at rest.

### Status
- **Fresh Green** (`#22c55e`): Status dot — data is current. Never used decoratively.
- **Stale Amber** (`#f59e0b`): Status dot — data is past its TTL. Never used decoratively.
- **Error Red** (`#ef4444`): Status dot (offline) and error banner background. Never used as a text color on its own.

**The One Accent Rule.** Signal Blue (`#3b82f6`) and Action Blue (`#2563eb`) are variants of one accent, not two separate accents. Treat them as a single brand identity with a filled and a text-safe form. No second accent hue is permitted. No purple, no teal, no orange alongside them.

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
- **Brand Header** (weight 800, `clamp(14px, 3.8vw, 16px)`, letter-spacing -0.5px): The "BMS Lunch" `h1` in the sticky header. Deliberately small — the brand does not compete with the menu.

**The Label Cap Rule.** ALL CAPS is reserved for labels of ≤4 words at label scale (≤11px). No sentence-case text is set in all-caps. No body copy is uppercased. The uppercase budget is spent entirely on: chip weekday abbreviations, section category eyebrows, the "TODAY" badge, and the today-shortcut "Today" label (mixed case there by exception).

**The No FOUT Rule.** No web fonts are loaded. The system font stack is non-negotiable for this use case: students check this on spotty school Wi-Fi. A font download adds latency and layout shift at exactly the wrong moment.

## 4. Elevation

This system uses **tonal layering with selective backdrop-blur**, not traditional drop shadows. Depth is established by surface opacity, not shadow casting.

### Surface Layers (dark theme, bottom to top)
- **Base** (`--bg: #08080f`): The body background. Deepest layer.
- **Glass Chrome** (`--header-bg: rgba(8,8,15,0.97)`, `--tabs-bg: rgba(8,8,15,0.95)` + `backdrop-filter: blur(12px)`): The sticky header and tab strip. Nearly opaque dark glass — content scrolls behind it but reads as blurred, not visible. The blur makes the chrome feel native iOS, not decorative.
- **Card Surface** (`--card-bg: rgba(255,255,255,0.065)`): Menu content cards. The lightest layer, making cards subtly legible against the near-black base.
- **Active State** (`--accent-fill: #2563eb`): The selected day chip. Only fully opaque non-base layer. Makes the selection unmistakably clear.

### Shadow Vocabulary
- **Card inset highlight** (`inset 0 1px 0 rgba(255,255,255,0.09)`): Applied to cards in dark theme. Simulates a top-edge specular highlight, adding a slight sense of physical presence to the glass card.
- **Card ambient drop** (`0 2px 8px rgba(0,0,0,0.20), 0 8px 24px rgba(0,0,0,0.12)`): Applied to cards in dark theme. Subtle two-layer depth. Not structural — purely ambient.
- **Toggle ambient** (`0 10px 30px rgba(0,0,0,0.18)` dark / `0 10px 30px rgba(59,130,246,0.12)` light): The theme toggle button. In light mode, a blue-tinted glow links the button to the brand accent.

**The Blur-is-Chrome Rule.** `backdrop-filter: blur(12px)` is used only on header and tabs — the chrome elements that must read as floating above content as the user scrolls. Cards do not blur their backgrounds. New surfaces should default to tonal layering; reach for blur only when the element is positionally sticky and content scrolls behind it.

**The Flat-Card Rule.** Cards are flat at rest. The inset highlight and ambient drop shadow are passive; they do not change on hover. Only the entree/section block's `:active` state fires (scale 0.97 press feedback). Hover elevation lift is prohibited.

## 5. Components

### Day Chip / Tab Strip

The week navigation. Compact, scrollable, keyboard-accessible tablist.

- **Shape:** Softly rounded (12px) rectangle
- **Default:** Transparent background, muted text (`rgba(255,255,255,0.68)`), 1px `--line` border. Padding `8px 16px` (clamps with viewport)
- **Today (unselected):** Signal Blue border, accent-text color, pulsing glow animation (`todayPulse` 2.4s ease-in-out infinite)
- **Active (selected):** Action Blue fill (`#2563eb`), white text, `chipSpring` entrance (scale 0.86 → 1, `cubic-bezier(0.22, 1, 0.36, 1)`, 0.28s)
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
- **Entrance animation:** `sectionFadeIn` 0.3s ease, `animationDelay: 0ms`

### Section Blocks

Secondary food categories (Sides, Fruit, Drink, Grains, Condiments, Dessert). Rendered in a 2-column CSS Grid.

- **Shape:** Gently rounded (16px)
- **Default:** Standard card bg, 11px vertical padding
- **Wide variant:** `grid-column: span 2` — used when `section.wide === true`. Spans the full row
- **Label:** `{emoji} {CATEGORY}` in muted color, label scale, weight 700. Emoji distinguishes category at a glance without reading the label
- **Items:** Body-scale text in `--list-text` (75% white / 72% black). Margin-bottom 1px — minimal vertical rhythm
- **Stagger:** `animationDelay: (i + 1) * 55ms` — sections enter in order after the entree, reinforcing hierarchy
- **Press feedback:** `transform: scale(0.97)` on `:active`

### Skeleton Loader

Structural placeholder shown only when there is no cached data (no layout shift on repeat visits).

- **Role:** `role="status" aria-busy="true" aria-label="Loading menu"` — announced to screen readers
- **Shimmer:** `background: linear-gradient(90deg, ...)` with `background-size: 200%` animated by `shimmer` (1.2s linear infinite). Simulates content arriving left-to-right
- **Structure:** Mirrors the actual DayCard DOM (day head + entree block + two section blocks) so the layout doesn't reflow when real content arrives

### School Countdown Widget

Appears from May 1 through the last day of school each year.

- **Shape:** Rounded rectangle (14px), 1px Signal Blue border tint (`color-mix(in srgb, var(--c) 35%, var(--line))`), blue-tinted card bg
- **Content:** Plain-language label ("School ends in X days · Jun 12") with the exact end date inline. Accent text for the number (weight 900), muted for the label (weight 700)
- **Flip animation:** When the day count changes, `flipCount` fires (rotateX 0 → 90 → -90 → 0deg, 0.38s ease-in-out) — simulates a split-flap display
- **Perspective:** `perspective: 300px` on the container so the 3D rotation is legible
- **Last-day variant:** Replaced with "Today is the last day! 🎉" and triggers the Confetti component
- **Responsive:** At ≤360px viewport, detaches from the day-head flex row and renders full-width below the date block

### Theme Toggle

Circular button in the header, top-right corner.

- **Shape:** 42×42px circle (border-radius 999px)
- **Background:** Semi-transparent (`rgba(255,255,255,0.06)` dark / `rgba(17,17,17,0.06)` light), 1px `--line` border
- **Icon:** Emoji (`☀️` / `🌙`), 18px, aria-hidden. Button carries the accessible label
- **Hover:** `translateY(-1px)` — subtle lift, 0.15s ease
- **Active:** `translateY(0)` — returns to baseline
- **Shadow:** `toggle-shadow` token — in light mode includes blue glow linking to accent

### Status Dot

6×6px circle in the header meta-row conveying data freshness.

- **Fresh:** `#22c55e` — data arrived this session within TTL
- **Stale:** `#f59e0b` — data is past its expected refresh deadline
- **Offline:** `#ef4444` — no network and serving cached data
- **Refreshing:** Any color + `dotPulse` animation (opacity 1 → 0.35 → 1, 1.2s ease-in-out infinite) — background fetch in progress

### Today Shortcut

Appears in the meta-row when the selected day is not today.

- **Shape:** Pill (border-radius 999px), 1px Signal Blue border
- **Text:** "Today", 0.625rem, weight 800, accent-text color
- **Hover:** Fills with Action Blue, white text — matching the day chip active state
- **Purpose:** One-tap and keyboard-accessible path back to today's menu from any day view

### Confetti

Full-viewport overlay on the last day of school. `aria-hidden="true"` — purely decorative.

- **48 pieces**, each 6-14px, random horizontal position, brand palette colors plus green/purple/pink
- **Fall animation:** `cubic-bezier(0.55, 0, 1, 0.45)` easing — accelerates like gravity
- **Duration:** 2.2–4.2s per piece, delay 0–1.8s — staggered to feel organic

### Error Banner

Fixed position, top of viewport, `role="alert"` for screen reader announcement.

- **Background:** `#ef4444` (Error Red), white text
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
- **Do** use Signal Blue (`#3b82f6`) and Action Blue (`#2563eb`) for all interactive affordances: borders, fills, focus rings. There is no second accent color.
- **Do** use `backdrop-filter: blur(12px)` only on chrome that is `position: sticky` with content scrolling behind it (header, tab strip). Nowhere else.
- **Do** stagger section entrance animations by 55ms per section. The entree appears first (0ms delay), then secondary sections in order.
- **Do** honor `prefers-reduced-motion` with the global `animation: none !important` override already in the stylesheet.
- **Do** give every status color a semantic purpose. Fresh green = data is current. Amber = data is stale. Red = offline or error. These colors mean specific things; their specificity is their value.
- **Do** use the `clamp()` scale for display and title text. Fixed sizes only for label and caption (0.6875rem) and the brand header.
- **Do** use `text-wrap: balance` on any heading that can wrap; it is already applied to `h1` and `.day-title-block`.
- **Do** test touch targets at 44×44px minimum. The day chips, theme toggle (42px — borderline), and retry button are the critical surfaces.

### Don't:
- **Don't** add sidebar navigation, widget grids, or any layout pattern from a generic dashboard template. This app has no nav; the week tabs are the only navigation surface. (Anti-reference: "Generic dashboard templates.")
- **Don't** add photography, hero images, or marketing chrome. The content is text. Decoration competes with the entree. (Anti-reference: "Consumer food apps — too much photography/marketing chrome.")
- **Don't** introduce a second accent color. No purple, teal, orange, or red alongside Signal Blue for interactive surfaces. Status colors (green/amber/red) are semantic-only and never used as accent.
- **Don't** apply `backdrop-filter: blur()` to cards or decorative surfaces. Blur is chrome-only. (See: The Blur-is-Chrome Rule.)
- **Don't** use `border-left` or `border-right` greater than 1px as a colored stripe on any card or list item. The day card's `border-top: 3px solid var(--c)` is the single permitted structural use of a colored border stripe.
- **Don't** add gradient text (`background-clip: text` with a gradient). Use solid accent colors for emphasis.
- **Don't** animate layout properties. The stagger uses `opacity` and `transform` only. Animating `height`, `padding`, `margin`, or `width` causes reflow.
- **Don't** add section eyebrows (small all-caps tracked labels) above new sections. The section category labels (`🍗 ENTREE`) are functional identifiers, not eyebrows. New content areas should not get decorative kickers.
- **Don't** set body copy or list items in all-caps. ALL CAPS is permitted only for: chip weekday abbreviations, the TODAY badge, and section category labels (which are single-word identifiers, not sentences).
- **Don't** build a heavy school-district portal: no cluttered header, no desktop-first multi-column layout, no institutional color palette (navy/maroon/gold). (Anti-reference: "Heavy school-district portals — cluttered, dated, desktop-first.")
- **Don't** use shadows to convey hover state on cards. Cards are `flat at rest, flat on hover`. Press feedback (`scale(0.97)` on `:active`) is the only touch feedback.
- **Don't** break the school countdown or confetti into reusable components used elsewhere. They are intentionally unique — the countdown's rarity and the confetti's once-a-year firing are the point.
