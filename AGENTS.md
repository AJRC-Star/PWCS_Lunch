# PWCS Lunch Agent Guide

This file is the authoritative Codex instruction entry point for this repo.
Keep it short, practical, and updated when repeated friction shows up.

For broader shared context, see:

- `docs/codex/project-context.md`
- `docs/codex/verification.md`
- `docs/codex/decisions.md`
- `docs/codex/workflows.md`
- `docs/codex/platform-workflows.md`
- `docs/codex/config.md`
- `docs/codex/automations.md`

## Instruction Priority

1. Direct user instructions for the current task.
2. Current repository code and checked-in docs.
3. This `AGENTS.md` file and any more specific nested `AGENTS.md` / `AGENTS.override.md` files.
4. Global/personal Codex instructions for communication style, safety defaults, and workflow preferences, unless they conflict with higher-priority repo or task guidance.
5. Codex native Memories for private preferences and recurring context.
6. Prior chat context.

If guidance conflicts, explain the conflict and follow the highest-priority source.

## Repository Context

- Mobile-first React/Vite app for the Benton Middle School lunch menu.
- Production site is GitHub Pages at `https://ajrc-star.github.io/PWCS_Lunch/`.
- The app uses the committed `public/menu-data.json` artifact as the published source of truth.
- Meal data is fetched from MealViewer and normalized by `scripts/fetch-menu.ts`.
- Use Node 22 locally to match GitHub Actions.

## Important Paths

- `src/`: React app, UI, caching, and browser behavior.
- `shared/`: shared menu normalization, contracts, tests, and calendar logic used by app and scripts.
- `scripts/`: artifact fetch, validation, summarization, icon generation, and local scheduled refresh helpers.
- `public/menu-data.json`: committed menu artifact served by GitHub Pages.
- `.github/workflows/`: CI, deploy, freshness checks, and manual fetch workflow.
- `docs/codex/`: checked-in durable Codex/project guidance.

## Working Agreement

- Prefer small, reviewable changes.
- Preserve existing architecture and style unless the task explicitly asks for a change.
- Read relevant files before editing.
- For complex or ambiguous tasks, use a plan before making changes.
- Ask at most one clarifying question when needed; otherwise state assumptions and proceed.
- Avoid new production dependencies unless there is a clear reason and user approval when practical.
- Do not store secrets, credentials, tokens, private keys, raw transcripts, or sensitive personal data.
- Treat student, school, and family-related data as sensitive.

## Codex Platform Workflow

- Use Local mode when work depends on this checkout, local credentials, a running dev server, browser/session state, or machine-specific context.
- Use Worktree mode for speculative, risky, large, or parallel changes.
- Use Codex Web/Cloud only when the repo and environment are intentionally prepared for clean-checkout remote execution.
- Prefer Handoff when moving work safely between Local and Worktree.
- Use the review pane before finalizing changes.
- Stage, commit, or push only when the user asks or the active workflow clearly requires it.
- Use app actions for common commands such as install, typecheck, test, build, preview, and dev server when available.

## Verification

Before finishing code changes, run the smallest relevant checks first, then broader checks when appropriate.

Known commands:

| Check | Command | When to run |
|---|---|---|
| Install | `npm install` | When dependencies are missing or lockfile changes need validation. |
| Dev server | `npm run dev` | For local frontend development and browser verification. |
| Typecheck | `npm run typecheck` | Before completing TypeScript or script changes. |
| Test | `npm test` | Before completing behavior, contract, or UI changes. |
| Validate menu artifact | `npm run validate:artifact` | When menu data, normalization, contracts, or artifact rules change. |
| Check artifact freshness | `npm run check:artifact-freshness` | When refresh workflows or freshness rules change. |
| Build | `npm run build` | Before deploy-sensitive or frontend production changes. |
| Preview | `npm run preview` | To inspect production output after `npm run build`. |

Run `npm run validate:artifact` when menu data, normalization, or artifact rules change.
Run `npm run build` before deploy-sensitive or frontend changes.
For frontend behavior changes, also verify in a browser when practical.

If a check cannot be run, explain why and provide the exact command the user should run.

## Project Memory and Documentation

- Required shared project facts belong in checked-in docs, especially `docs/codex/`.
- Private cross-thread recall should use Codex native Memories, not repo-local private markdown by default.
- Do not create new repo-local private memory folders unless explicitly requested.
- If native Memories are disabled and durable private context matters, tell the user to enable Memories in Codex settings or set `[features].memories = true` in `~/.codex/config.toml`.

## Durable Updates

When durable shared project knowledge changes, update the appropriate checked-in doc:

- `docs/codex/project-context.md` for stable project overview, architecture, constraints, and integrations.
- `docs/codex/verification.md` for setup, commands, and verification guidance.
- `docs/codex/decisions.md` for durable decisions and rationale.
- `docs/codex/workflows.md` for repeated repository workflows.
- `docs/codex/platform-workflows.md` for Codex app, Web/Cloud, CLI, IDE, browser, worktree, and automation notes.
- `docs/codex/config.md` for repo-specific Codex configuration guidance.
- `docs/codex/automations.md` for active or candidate Codex automations and safeguards.

Do not update docs for temporary implementation details.

## Menu Refresh Workflow

- GitHub Actions scheduling for `fetch-menu.yml` is intentionally disabled because MealViewer blocks GitHub-hosted runner IPs.
- Weekly refresh is handled by the Codex automation `weekly-pwcs-lunch-menu-refresh`, which runs `scripts/local-fetch.sh` on Saturdays at 06:00 America/New_York.
- A launchd plist remains in `scripts/com.pwcs-lunch.fetch-menu.plist` as a local fallback; if the repo location changes and launchd is used, update and reinstall the plist so its absolute paths point at the current checkout.
- The fetch script pulls `origin/main`, regenerates `public/menu-data.json`, commits only if the artifact changed, and pushes to `main`.

## MCP, Skills, Rules, and Automations

- Use MCP only when required context or actions live outside the repo or change frequently.
- Create skills only for stable repeated workflows; prefer instruction-only skills first.
- Use rules only for narrow, repeated command-approval patterns. Do not broadly allow destructive commands.
- Create automations only after the workflow has been manually run successfully and produces reviewable results. Prefer worktrees for Git repositories.
