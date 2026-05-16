# Codex App Notes

Repository-specific guidance for using the Codex app.

## Local vs Worktree

Use Local mode when:

- The task needs existing uncommitted local changes.
- The task needs a running local dev server.
- The task depends on local credentials or machine state.
- The task requires browser/session state, IDE/editor context, or the current checkout path.
- The task runs the local menu refresh workflow.

Use Worktree mode when:

- The task is speculative.
- Multiple Codex threads should run in parallel.
- The change might be risky or large.
- The task is suitable for isolated review.

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

Configure these through the Codex app Local Environments settings. Check in generated `.codex` local-environment config only if it is safe and useful for collaborators.

## Review Workflow

Before finalizing:

1. Open the review pane when available.
2. Inspect every changed file.
3. Revert accidental or unrelated changes.
4. Confirm verification results.
5. Summarize behavior changes and risk.

## Automations

Create automations only after the workflow is proven manually.

Guidelines:

- Prefer worktrees for Git repositories.
- Keep automation prompts narrow and outcome-based.
- Avoid full-access sandbox settings unless truly required.
- Require reviewable diffs or clear findings.
- Archive old automation runs and worktrees when no longer needed.

Active repository automation:

- `weekly-pwcs-lunch-menu-refresh`: runs `scripts/local-fetch.sh` on Saturdays at 06:00 America/New_York from the local checkout.

## Last Reviewed

2026-05-14
