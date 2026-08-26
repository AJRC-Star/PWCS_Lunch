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

- Mobile-first React/Vite app for the Colgan High School lunch menu.
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

**Active mechanism (as of 2026-08-08): the Claude Code scheduled task `pwcs-lunch-weekly-menu-refresh`**, cron `7 6 * * 6` (Saturdays ~06:10 America/New_York after scheduler jitter), defined at `~/.claude/scheduled-tasks/pwcs-lunch-weekly-menu-refresh/SKILL.md`. It runs `scripts/local-fetch.sh` unchanged. Verified end to end on 2026-08-08, lost on 2026-08-24, recreated and re-verified on 2026-08-26 (see the outage note below).

- The fetch script refuses to run off `main`, autostashes unrelated local changes and restores them via an EXIT trap, pulls `origin/main` ff-only, regenerates `public/menu-data.json`, validates it, and commits + pushes **only if the artifact changed**. The push triggers CI, and CI success triggers the Pages deploy.
- **This must run from a home network connection.** MealViewer blocks datacenter IPs, which is why `fetch-menu.yml`'s schedule is deliberately disabled (manual `workflow_dispatch` still works). Do not "fix" this by moving it back into GitHub Actions or a cloud runner. Whether Anthropic's cloud IPs are blocked was never established — a probe was scheduled but its result was not retrieved.
- **It must also run as an app with TCC consent, not as a bare launchd agent.** This checkout lives in iCloud Drive (`~/Library/Mobile Documents`), which macOS protects with TCC. A launchd agent carries no consent: it can `stat` and `cd` into the repo but cannot read a single file inside it, dying at once with `Operation not permitted` (exit 126). Verified 2026-08-08 that a wrapper script stored **outside** iCloud does not work around this — the restriction is on reading iCloud contents, not on where the invoked script lives. Claude Code works because the app already holds that access.
- Trade-off to know: a scheduled task only runs while the Claude Code app is open. If the app is closed when Saturday passes, the task runs at next launch rather than being skipped, so it self-heals but can drift late.
- **The task itself can vanish, and did.** On 2026-08-24 `~/.claude/scheduled-tasks/` was recreated holding only the unrelated `ashland-menu` task, taking `pwcs-lunch-weekly-menu-refresh` with it. The 2026-08-22 refresh never ran, so production served the 2026-08-15 snapshot — correct menu text, but a dead `today` flag and no days past 2026-09-04 — until a manual recovery on 2026-08-26. Nothing local noticed. Before trusting that the weekly refresh is healthy, confirm the task is actually **present in the scheduled-task list**, not merely described in this file; a documented mechanism and a running one are different claims.

**Retired:** the launchd fallback (`scripts/com.pwcs-lunch.fetch-menu.plist`) was unloaded and removed from `~/Library/LaunchAgents/` on 2026-08-08 because it could never run (the TCC failure above) and a silently failing scheduled job implies coverage that does not exist. The plist is kept in `scripts/` as reference only. To revive it you must first grant `/bin/bash` Full Disk Access under System Settings > Privacy & Security, then reinstall and verify with a real run — `launchctl kickstart -k gui/$(id -u)/com.pwcs-lunch.fetch-menu`. Column 2 of `launchctl list | grep pwcs` is the last exit status: `0` success, `126` the TCC failure, `78` launchd could not even open its log paths. Its logs were pointed at `~/Library/Logs/pwcs-lunch/`, deliberately outside iCloud, because launchd cannot create them inside the protected volume and fails before anything runs — which is why the original breakage left no log at all.

**Also retired:** the Codex automation `weekly-pwcs-lunch-menu-refresh`, which was the mechanism that actually worked through 2026-07-04 and then stopped for unknown reasons. The ~5-week gap in `public/menu-data.json` commits is that outage.

**Pattern to respect:** two successive refresh mechanisms have now disappeared silently — the Codex automation by 2026-07-04, the scheduled task by 2026-08-24. Neither announced its own death; both were caught only by the `Check Menu Freshness` workflow, and the second only once PWCS classes resumed on 2026-08-24 and lifted the summer-break suppression in `isPWCSSummerBreak`. That workflow is the project's only end-to-end detector. Treat its failures as true statements about the data until proven otherwise, and do not weaken, silence, or "fix" it to go green.

## MCP, Skills, Rules, and Automations

- Use MCP only when required context or actions live outside the repo or change frequently.
- Create skills only for stable repeated workflows; prefer instruction-only skills first.
- Use rules only for narrow, repeated command-approval patterns. Do not broadly allow destructive commands.
- Create automations only after the workflow has been manually run successfully and produces reviewable results. Prefer worktrees for Git repositories.
