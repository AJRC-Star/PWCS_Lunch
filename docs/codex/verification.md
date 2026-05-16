# Verification

Commands and checks Codex should use before finishing changes.

## Setup

```bash
npm install
```

Use Node 22 locally to match GitHub Actions.

## Standard Checks

| Check | Command | When to run |
|---|---|---|
| Lint | not discovered | No lint script exists in `package.json` as of 2026-05-16. |
| Typecheck | `npm run typecheck` | Before completing TypeScript, shared logic, or script changes. |
| Test | `npm test` | Before completing behavior, contract, or UI changes. |
| Build | `npm run build` | Before deploy-sensitive, frontend production, or asset-generation changes. |
| Validate artifact | `npm run validate:artifact` | When menu data, normalization, contracts, calendar assumptions, or artifact rules change. |
| Check freshness | `npm run check:artifact-freshness` | When refresh workflow, schedule, or freshness behavior changes. |

There is no dedicated lint or format script in `package.json` as of 2026-05-16.

## Targeted Testing

| Area | Command | Notes |
|---|---|---|
| App shell | `npm test -- src/App.test.tsx` | Use for app state and rendering changes. |
| API/cache behavior | `npm test -- src/api.test.ts` | Use for artifact loading and cache behavior. |
| Day card UI | `npm test -- src/components/DayCard.test.tsx` | Use for menu card rendering changes. |
| Menu normalization | `npm test -- shared/menu-core.test.ts` | Use for classification and normalization changes. |
| Artifact contract | `npm test -- shared/menu-contract.test.ts` | Use for validation contract changes. |
| Published artifact | `npm test -- shared/menu-artifact.test.ts` | Use for current artifact semantic checks. |

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

## CI and Deployment

- **CI provider:** GitHub Actions.
- **Required push check:** `CI` workflow validates install, typecheck, tests, artifact validation, and artifact summary.
- **Production deploy flow:** `Build and Deploy` runs after successful CI and deploys GitHub Pages.
- **Freshness check:** `Check Menu Freshness` monitors the deployed artifact schedule.
- **Manual fetch workflow:** `.github/workflows/fetch-menu.yml` remains available for dispatch/testing, but its schedule is intentionally disabled.

Do not run production deploys, destructive CI actions, or external-service mutations from Codex without explicit user approval for the current task. Pushing to `main` triggers CI and production deploy, so verify locally first and keep commits focused.

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

2026-05-16
