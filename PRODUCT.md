# BMS Lunch

## Register
product

## Purpose
Mobile-first web app that lets Benton Middle School students, parents, and staff instantly see the school lunch menu for any day of the current week. Primary goal: answer "what's for lunch today?" in under two seconds, from any device.

## Users
- **Students** (primary): checking during homeroom or the walk to the cafeteria. One-handed, glancing, fast. They want the entree first.
- **Parents**: quick scan before packing alternatives. Desktop or phone.
- **Staff**: occasional reference. Same quick-lookup behavior as students.

## Product goals
1. Load the today view instantly (cached-first, skeleton on miss).
2. Show the week at a glance via the day chip strip.
3. Surface the entree prominently — it's what 90% of users care about.
4. Work offline after a first load.

## Brand personality
Utility-first. Feels like a native iOS app on mobile. Clean, precise, no chrome. The school branding is implicit (PWCS/BMS context) — no heavy institutional look. Slightly playful through emoji category icons and the end-of-year countdown, but the baseline is calm and purposeful.

## Anti-references
- Heavy school-district portals (cluttered, dated, desktop-first)
- Consumer food apps (too much photography/marketing chrome)
- Generic dashboard templates (sidebar nav, widget grids)

## Accessibility
WCAG 2.1 AA target. Keyboard tab-strip navigation implemented. Reduced motion honored. Screen reader roles and labels in place.

## Tech
React 18 + TypeScript + Vite + CSS3 (no UI framework). Deployed to GitHub Pages. CSS tokens for dual dark/light theme.
