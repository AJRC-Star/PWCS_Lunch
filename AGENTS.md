# PWCS Lunch Agent Guide

This file is the repo-local operating guide for Codex and other coding agents.
Keep it short, practical, and updated when repeated friction shows up.

## Persistent Memory Protocol

Codex must use this repository-local memory system in every interaction/chat.
The protocol lives here in `AGENTS.md` so Codex loads it automatically.
The memory data files are intentionally local-only.

Before responding, planning, editing, or running commands, Codex must read:

- `memory/decisions.md`
- `memory/people.md`
- `memory/preferences.md`
- `memory/user.md`
- `knowledge-base/wiki/index.md` if it exists

Codex must treat those files as durable project context.

At the beginning of every new session or chat, Codex must:

1. Read all files listed above.
2. Review only wiki pages from `knowledge-base/wiki/index.md` that are relevant to the current task, unless broader context is needed.
3. Incorporate durable context into planning and responses.
4. Avoid asking the user to repeat stable context that is already stored.

During every interaction, Codex must continuously identify durable long-term knowledge, including project decisions, architectural patterns, constraints, user preferences, recurring workflows, people/roles, important domain knowledge, and reusable troubleshooting discoveries.

At the end of each substantive interaction, Codex must update relevant files only when durable knowledge changed:

- `memory/*.md` for concise curated facts
- `knowledge-base/learnings.md` for chronological session summaries
- Relevant `knowledge-base/wiki/*.md` pages when durable structured knowledge was discovered
- `knowledge-base/wiki/index.md` when wiki pages are added or changed

If no durable knowledge changed, leave memory and knowledge files unchanged and note that no durable updates were needed.

Memory rules:

- Do not store secrets, tokens, credentials, private keys, highly sensitive personal data, or raw private conversations.
- Store distilled, concise, factual summaries rather than raw transcripts.
- Include dates when useful.
- Avoid duplicates and prefer updating existing entries.
- Track uncertainty explicitly.
- Preserve useful existing content.

Recall priority:

1. `memory/*`
2. Relevant `knowledge-base/wiki/*` pages
3. Recent session context

Raw knowledge ingestion:

- Files placed in `knowledge-base/raw/` are unprocessed inputs.
- If relevant raw files exist, extract durable knowledge, update or create wiki pages, add source references, and move processed files into `knowledge-base/raw/.processed/`.
- Preserve the original filename when moving processed files; if a filename conflict exists, append a timestamp before the file extension.
- Do not delete raw files after processing unless explicitly instructed.

## Project Overview

- Mobile-first React/Vite app for the Benton Middle School lunch menu.
- Production site is GitHub Pages at `https://ajrc-star.github.io/PWCS_Lunch/`.
- The app uses the committed `public/menu-data.json` artifact as the published source of truth.
- Meal data is fetched from MealViewer and normalized by `scripts/fetch-menu.ts`.

## Important Paths

- `src/`: React app, UI, caching, and browser behavior.
- `shared/`: shared menu normalization, contracts, and calendar logic used by app and scripts.
- `scripts/`: artifact fetch/validation/summarization and local scheduled refresh helpers.
- `public/menu-data.json`: committed menu artifact served by GitHub Pages.
- `.github/workflows/`: CI, deploy, freshness checks, and manual fetch workflow.

## Local Setup

- Use Node 22 locally to match GitHub Actions.
- Install dependencies with `npm install`.
- Start the app with `npm run dev`.
- Preview production output with `npm run build` then `npm run preview`.

## Verification

Run the relevant checks before calling code changes complete:

- `npm run typecheck`
- `npm test`
- `npm run validate:artifact` when menu data, normalization, or artifact rules change
- `npm run build` before deploy-sensitive or frontend changes

For frontend behavior changes, also verify in a browser when practical.

## Menu Refresh Workflow

- GitHub Actions scheduling for `fetch-menu.yml` is intentionally disabled because MealViewer blocks GitHub-hosted runner IPs.
- Weekly refresh is handled by the Codex automation `weekly-pwcs-lunch-menu-refresh`, which runs `scripts/local-fetch.sh` on Saturdays at 06:00 America/New_York.
- A launchd plist remains in `scripts/com.pwcs-lunch.fetch-menu.plist` as a local fallback; if the repo location changes and launchd is used, update and reinstall the plist so its absolute paths point at the current checkout.
- The fetch script pulls `origin/main`, regenerates `public/menu-data.json`, commits only if the artifact changed, and pushes to `main`.

## Privacy And Safety

- Treat student, school, and family-related data as sensitive.
- Do not commit secrets, private credentials, raw student data, or personal records.
- Prefer summarized, redacted reporting for menu/debug outputs when sensitive context may be present.
- Ask before using authenticated school systems or student-data-adjacent sites unless the task clearly requires it.

## Git And Review Expectations

- Keep edits scoped to the requested task.
- Preserve user changes and dirty worktrees; never revert unrelated work without explicit instruction.
- Use concise imperative commit messages.
- For code reviews, lead with findings ordered by severity, then summarize.
- When a repeated agent mistake happens, update this file with the smallest useful rule.
