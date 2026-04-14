# BMS Lunch Menu

A mobile-first web app that displays the school lunch menu for Benton Middle School. Designed to feel like a native app — no page scrolling, fluid layout, instant navigation.

**Live:** https://ajrc-star.github.io/PWCS_Lunch/

## Features

- 📱 Full-screen native app feel — menu fills the screen, no page scroll
- 🗓 Horizontal day-selector tabs for quick navigation across the week
- 🍗 Automatic menu categorization (Entree, Sides, Fruit, Grains, Drink, etc.)
- 💾 Smart caching — shows cached menu instantly when available, then refreshes in the background without discarding the last known good snapshot first
- 🕐 Freshness-aware — shows when the current menu snapshot was generated and warns when the local cache is stale
- ⚡ Skeleton loading screens while data loads
- 🌙 Dark and light mode that follows the device by default, with a manual in-app override
- 📐 Fluid layout — scales to any screen size with no device-specific breakpoints

## Tech Stack

- **React 18** — UI framework
- **TypeScript** — type safety (covers `src/`, `shared/`, and `scripts/`)
- **Vite** — build tool and dev server
- **CSS3** — fluid sizing with `clamp()`, `dvh`, and CSS Grid/Flexbox
- **GitHub Actions + Pages** — production deployment

## API

Menu data is pulled from the MealViewer public API:

```
https://api.mealviewer.com/api/v4/school/BENTONMIDDLE/{startDate}/{endDate}
```

The app fetches 21 days of data starting from today (using the school's local timezone, `America/New_York`). Items are categorized by `item_Type` field with name-based regex fallback for robustness.

## Caching & Data Flow

Menu data is pre-normalized and cached for offline access:

- **Network available:** Latest data fetched from pre-built `menu-data.json` (updated weekly by GitHub Actions) or live API fallback
- **Preview mode:** Shows cached data immediately when available, then re-fetches fresh data in the background. Every read path re-applies the same visible-day filtering so past days never come back after preview mode has already cleaned them up.
- **Offline:** Shows cached data with warning banner
- **Staleness:** The 4-hour TTL is enforced on the local cache, and the app also warns when the normalized snapshot itself is older than the expected weekly refresh window.

Data is normalized server-side in `scripts/fetch-menu.ts` to reduce payload from ~5MB → ~8KB.

## Development

```bash
npm install       # install dependencies
npm run dev       # start dev server at http://localhost:5173
npm run typecheck # TypeScript validation (src/, shared/, scripts/)
npm test          # run regression tests
npm run build     # build for production → dist/
```

Requires Node.js 20.19+ locally. GitHub Actions runs Node.js 22.

Deployment is automated via GitHub Actions:
- **Menu data:** `scripts/fetch-menu.ts` runs weekly on Saturday at 10:00 UTC, fetches the latest data, and pushes to `main`
- **Failures:** If menu ingestion breaks or a new snapshot fails plausibility checks, the scheduled workflow fails so the issue is visible in GitHub Actions
- **CI:** Pushes to `main` and pull requests run install, typecheck, tests, and build
- **Site deployment:** validated `main` commits are deployed by the GitHub Pages Actions artifact flow

The deploy base path defaults to `/PWCS_Lunch/` but can be overridden with the `VITE_BASE_PATH` environment variable for alternative deploy targets (custom domains, root paths, etc.).

## Project Structure

```
src/
  api.ts                  # MealViewer API client, caching, data normalization
  types.ts                # TypeScript interfaces (MenuData, MenuDay, MenuItem)
  App.tsx                 # Root component — data loading and layout shell
  App.css                 # All styles — fluid, no device breakpoints
  components/
    DayTabs.tsx           # Horizontal scrollable day-selector chip row
    DayCard.tsx           # Full-screen menu display for a single day
    SkeletonLoader.tsx    # Animated placeholder shown during load
shared/
  menu-core.ts            # Shared normalization logic (used by app and scripts)
scripts/
  fetch-menu.ts           # GitHub Actions menu fetcher
```

## Browser Support

- iOS Safari 13+
- Android Chrome / Firefox
- All modern desktop browsers (layout is capped at 480px, centered)
