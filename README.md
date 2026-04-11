# BMS Lunch Menu

A mobile-first web app that displays the school lunch menu for Benton Middle School. Designed to feel like a native app — no page scrolling, fluid layout, instant navigation.

**Live:** https://ajrc-star.github.io/PWCS_Lunch/

## Features

- 📱 Full-screen native app feel — menu fills the screen, no page scroll
- 🗓 Horizontal day-selector tabs for quick navigation across the week
- 🍗 Automatic menu categorization (Entree, Sides, Fruit, Grains, Drink, etc.)
- 💾 Smart caching — shows cached menu instantly, refreshes in the background
- ⚡ Skeleton loading screens while data loads
- 🌙 Dark and light mode (follows system preference)
- 📐 Fluid layout — scales to any screen size with no device-specific breakpoints

## Tech Stack

- **React 18** — UI framework
- **TypeScript** — type safety
- **Vite** — build tool and dev server
- **CSS3** — fluid sizing with `clamp()`, `dvh`, and CSS Grid/Flexbox
- **gh-pages** — GitHub Pages deployment

## API

Menu data is pulled from the MealViewer public API:

```
https://api.mealviewer.com/api/v4/school/BENTONMIDDLE/{startDate}/{endDate}
```

The app fetches 21 days of data starting from today. Items are categorized by `item_Type` field with name-based regex fallback for robustness.

## Caching

The app uses `localStorage` to cache raw API responses:

- **Fresh:** served from network, cache saved
- **Preview:** stale cache shown immediately, fresh data fetched in background
- **Offline:** stale cache served with an offline warning banner

Cache is considered stale if more than 4 hours have elapsed **or** the cached date is from a different calendar day.

## Development

```bash
npm install       # install dependencies
npm run dev       # start dev server at http://localhost:5173
npm run build     # build for production → dist/
npm run deploy    # build + push to gh-pages branch
```

Requires Node.js 18+.

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
```

## Browser Support

- iOS Safari 13+
- Android Chrome / Firefox
- All modern desktop browsers (layout is capped at 480px, centered)
