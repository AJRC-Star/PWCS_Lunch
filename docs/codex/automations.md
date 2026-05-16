# Codex Automations

Automations are for stable, repeatable tasks that are safe to run unattended and produce reviewable results.

## Existing Automations

| Automation | Schedule | Project | Mode | Output | Risk |
|---|---|---|---|---|---|
| `weekly-pwcs-lunch-menu-refresh` | Saturdays at 06:00 America/New_York | PWCS Lunch checkout | Local | Runs `scripts/local-fetch.sh`, commits `public/menu-data.json` only when changed, pushes to `main`, and reports CI/deploy status. | Pushes to `main`, so failures must be reviewable and CI/deploy must be checked. |

## Candidate Automations

| Candidate | Cadence | Why useful | Required checks | Risk controls |
|---|---|---|---|---|
| CI failure triage | On failed GitHub Actions run | Summarize likely cause and next action quickly. | `gh run view`, targeted local reproduction when possible. | Read-only by default; patch only after user asks. |
| Documentation drift check | Monthly | Keep `AGENTS.md` and `docs/codex/` aligned with repo workflows. | Link/reference check, `git diff` review. | Report findings before broad edits. |

## Safety Rules

- Test automation prompts manually before scheduling.
- Review the first few outputs.
- Prefer worktrees for automation changes in Git repositories.
- Avoid production mutations, secrets, sensitive accounts, or fragile credentials.
- Prefer read-only or workspace-write sandbox settings unless there is a strong reason otherwise.
- Keep outputs reviewable with clear changed files, commits, verification, and blockers.

## Last Reviewed

2026-05-16
