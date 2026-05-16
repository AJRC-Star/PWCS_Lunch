# Verification

Commands and checks Codex should use before finishing changes.

## Setup

```bash
npm install
```

Use Node 22 locally to match GitHub Actions.

## Common Checks

```bash
npm run typecheck
npm test
npm run build
```

Artifact-specific checks:

```bash
npm run validate:artifact
npm run check:artifact-freshness
```

Local development and production preview:

```bash
npm run dev
npm run preview
```

There is no dedicated lint or format script in `package.json` as of 2026-05-14.

## Targeted Testing

Run a focused Vitest file when a change is localized:

```bash
npm test -- src/App.test.tsx
npm test -- src/api.test.ts
npm test -- src/components/DayCard.test.tsx
npm test -- shared/menu-core.test.ts
npm test -- shared/menu-contract.test.ts
npm test -- shared/menu-artifact.test.ts
```

Then broaden to `npm test`, `npm run typecheck`, and `npm run build` when the change affects shared behavior, deploy output, or user-facing UI.

## Frontend or Browser Verification

For frontend behavior changes, start the dev server and verify the relevant flow in a browser:

```bash
npm run dev
```

Check mobile-sized behavior, day navigation, cached/fresh menu states, warning banners, and dark/light mode when those surfaces are affected.

For production output concerns, build first and preview:

```bash
npm run build
npm run preview
```

## Menu Artifact Verification

Run artifact validation when changing menu data, normalization, contracts, calendar assumptions, or the generated artifact:

```bash
npm run validate:artifact
```

Run freshness checks when changing refresh workflows, CI freshness behavior, or scheduled automation assumptions:

```bash
npm run check:artifact-freshness
```

## Known Slow or Flaky Checks

- MealViewer fetches can fail from GitHub-hosted runner IPs; prefer the local refresh path for real menu updates.
- Browser verification depends on a local dev or preview server being available.

## When Checks Cannot Run

If a command cannot be run locally, Codex should report:

- Command attempted or skipped.
- Reason it could not run.
- Confidence level.
- Exact command for the user to run.

## Last Reviewed

2026-05-14
