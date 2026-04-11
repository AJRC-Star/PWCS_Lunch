# BMS Lunch Menu

A mobile-first web app that displays the school lunch menu for Benton Middle School, powered by the MealViewer API.

## Features

- 📱 Mobile-optimized design
- 🎨 Dark and light mode support
- 💾 Smart caching with 4-hour freshness + day-aware updates
- ⚡ Instant loading with skeleton screens
- 🔄 Background data refresh while viewing preview
- 📍 Sticky navigation with dot indicators
- 🎯 Scroll-snap navigation between days

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **CSS3** - Styling with CSS Grid and Flexbox

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
npm install
```

### Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
```

The static files are generated in the `dist` directory.

### Deploy to GitHub Pages

```bash
npm run deploy
```

This builds the project and pushes the compiled files to the `gh-pages` branch.

## API

The app fetches menu data from:
- **Base URL:** `https://api.mealviewer.com/api/v4/school`
- **School ID:** `BENTONMIDDLE`
- **Range:** 21 days of menu data

## Caching

The app uses `localStorage` to cache:
- Raw API responses (4-hour freshness)
- Processed menu data for offline access

Cache is considered stale if:
- More than 4 hours have elapsed, OR
- The cached date differs from today's date

## Menu Categories

Menu items are automatically categorized as:
- Entree
- Sides
- Fruit
- Grains
- Drink
- Condiments
- Dessert
- Other (fallback)

Categorization is based on item type and name patterns for robustness.

## Browser Support

- All modern browsers supporting ES2020
- iOS Safari 13+
- Android Chrome/Firefox

## License

MIT
