# Codex Platform Workflows

Repository-specific guidance for using Codex across app, Web/Cloud, CLI, and IDE surfaces.

## Recommended Surfaces

| Surface | Use for this repo | Avoid when |
|---|---|---|
| Codex app Local | Normal local development, menu refresh, verification, and GitHub Pages checks from the configured checkout. | The task is speculative, risky, or should not touch current local work. |
| Codex app Worktree | Isolated feature work, risky experiments, long-running tasks, parallel work, and reviewable automation output. | The task needs local-only credentials, current dirty worktree state, or the exact configured checkout. |
| Codex Web/Cloud | Clean-checkout code changes, review, or PR-style work where setup is captured by repository files. | The task needs local MealViewer network access, browser/session state, local credentials, or uncommitted files. |
| Codex CLI | Terminal-first local work, scripted checks, and direct repository operations. | The task needs visual browser inspection or app review-pane workflows. |
| Codex IDE extension | Editor-context work, selected-code review, and inline local iteration. | The task needs isolated worktree execution or remote clean-checkout behavior. |

## Project Mapping

Use the narrowest Codex project root that still contains the app, scripts, shared code, workflows, and docs.

| Codex project | Folder | Use case |
|---|---|---|
| PWCS Lunch | `/Users/ajstaranowicz/Library/Mobile Documents/com~apple~CloudDocs/Codex/PWCS Lunch` | Local development, menu refresh, verification, and GitHub Pages work. |

Do not trust broad parent folders such as the home directory, `~/Documents`, or all of iCloud Drive for this repo.

## Thread Modes

Use Local mode when:

- the task needs existing uncommitted local changes;
- the task needs a running local dev server;
- the task depends on local credentials, machine state, or browser/session state;
- the task needs IDE/editor context or the current checkout path;
- the task runs the local menu refresh workflow.

Use Worktree mode when:

- the task is speculative;
- multiple Codex threads should run in parallel;
- the change might be risky or large;
- the task is suitable for isolated review.

Use Codex Web/Cloud only when the repo and environment are intentionally prepared for remote execution and no local-only network, browser, credential, or machine state is needed. Cloud mode is a poor fit for the normal MealViewer refresh path.

Do not add a separate `docs/codex/cloud.md` unless this repo gains meaningful Cloud-specific setup beyond `npm install`, Node 22, and the clean-checkout limitations documented here and in `docs/codex/verification.md`.

## Worktrees

Worktrees keep parallel code changes isolated. Prefer them for risky work, experiments, background automation, or large changes that should not touch a dirty local checkout.

Before merging or handing work back:

- Inspect the full diff.
- Run relevant checks.
- Remove unrelated generated files.
- Confirm changes do not overwrite user work.

## Review and Git

Use the Codex app review pane or normal Git review before committing:

- inspect the full diff;
- stage only intended files or chunks;
- leave inline comments for targeted fixes when useful;
- avoid reverting user changes;
- commit only after verification or after clearly documenting why verification could not run.

## Local Environments and Actions

Recommended Codex app actions:

| Action | Command | Notes |
|---|---|---|
| Install | `npm install` | Use Node 22 locally. |
| Dev server | `npm run dev` | Vite dev server, default `http://localhost:5173`. |
| Typecheck | `npm run typecheck` | Checks app/shared code and scripts. |
| Test | `npm test` | Runs Vitest regression tests. |
| Validate artifact | `npm run validate:artifact` | Use for menu data, normalization, or artifact changes. |
| Build | `npm run build` | Generates icons, runs `tsc`, and builds with Vite. |
| Preview | `npm run preview` | Preview production output after build. |

Configure these through Codex app Local Environments settings. Check in generated `.codex` local-environment config only if it is safe and useful for collaborators.

## Browser and GUI Work

Use the in-app browser for:

- local development servers;
- GitHub Pages public production checks;
- public pages that do not require sign-in;
- rendered UI inspection and visual comments.

Use Chrome only when signed-in browser state, extensions, existing tabs, or normal profile cookies are required and the user has approved the relevant site access.

Use computer use only when command-line tools, files, browser previews, or structured integrations are insufficient. Keep tasks narrowly scoped to project-relevant apps and flows. Do not use browser or computer-use tools for unrelated personal accounts, sensitive school/family systems, production admin consoles, secrets, or credentials by default.

## Automations

Create automations only after the workflow is proven manually.

Guidelines:

- Prefer worktrees for Git repositories when practical.
- Keep automation prompts narrow and outcome-based.
- Avoid full-access sandbox settings unless truly required.
- Require reviewable diffs or clear findings.
- Archive old automation runs and worktrees when no longer needed.

Active repository automation:

- `weekly-pwcs-lunch-menu-refresh`: runs `scripts/local-fetch.sh` on Saturdays at 06:00 America/New_York from the local checkout. See `docs/codex/automations.md`.

## Last Reviewed

2026-05-22
