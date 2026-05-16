# Codex Workflows

Repeated repository workflows that Codex should know.

## Workflow Maturity Ladder

1. Manual prompt: use for one-off or exploratory work.
2. Documented workflow: add here after the workflow proves useful more than once.
3. App action: use for repeated commands such as dev server, test, typecheck, build, and artifact validation.
4. Skill: use when a workflow needs reusable instructions, references, scripts, or decision logic.
5. Automation: use only after the workflow is stable, safe to run unattended, and produces reviewable results.

## Development Loop

1. Read relevant code and docs.
2. Make the smallest useful change.
3. Run targeted verification.
4. Run broader verification when warranted.
5. Inspect the diff.
6. Summarize changes, verification, and residual risk.

## Git and Review

- Keep diffs focused.
- Preserve user changes and dirty worktrees.
- Do not stage unrelated changes.
- Do not commit unless the user asks or the active workflow clearly requires it.
- Use concise imperative commit messages.
- Use the Codex app review pane before finalizing when available.
- For code reviews, lead with findings ordered by severity, then summarize.

## Dependency Changes

- Avoid new production dependencies unless necessary.
- Explain why a dependency is needed.
- Prefer existing project libraries and patterns.
- Ask before introducing significant dependencies, frameworks, services, schemas, migrations, or architecture changes.

## Debugging

- Reproduce before fixing when possible.
- Prefer targeted instrumentation over broad rewrites.
- Remove temporary debugging code before finishing.
- When behavior depends on menu data, distinguish cached app state from the committed artifact and from fresh MealViewer responses.

## Menu Refresh

The normal refresh path is local because MealViewer blocks GitHub-hosted runner IPs:

```bash
scripts/local-fetch.sh
```

The script pulls `origin/main`, fetches fresh MealViewer data, regenerates `public/menu-data.json`, commits only if the artifact changed, and pushes to `main`.

After a refresh or menu-rule change, run:

```bash
npm run validate:artifact
```

The manual GitHub Actions fetch workflow remains available for dispatch/testing, but its schedule is intentionally disabled.

## Recommended App Actions

| Action | Command | Purpose | When to use |
|---|---|---|---|
| Dev server | `npm run dev` | Start Vite locally. | Frontend implementation and browser verification. |
| Typecheck | `npm run typecheck` | Check app, shared code, and scripts. | TypeScript and script changes. |
| Test | `npm test` | Run Vitest regression tests. | Behavior and UI changes. |
| Validate artifact | `npm run validate:artifact` | Validate the committed menu artifact. | Menu data, normalization, contract, or refresh changes. |
| Build | `npm run build` | Generate icons, compile, and build production output. | Deploy-sensitive frontend changes. |

## Skill Candidates

| Candidate | Purpose | Trigger phrasing | Status |
|---|---|---|---|
| Menu artifact triage | Diagnose menu artifact validation or freshness failures. | "Fix menu artifact failure" or "why did refresh fail?" | Proposed; keep as documented workflow until repeated further. |

Only create a skill after the workflow is stable and repeated enough to justify reusable instructions or scripts.

## Automation Candidates

See `docs/codex/automations.md` for the active weekly menu refresh automation and candidate automations.

## Documentation Updates

Update docs when behavior, commands, architecture, setup, workflows, or user-facing behavior changes.

Use:

- `docs/codex/project-context.md` for stable project overview and architecture.
- `docs/codex/verification.md` for setup and checks.
- `docs/codex/decisions.md` for durable decisions and rationale.
- `docs/codex/workflows.md` for repeated repository workflows.
- `docs/codex/codex-app.md` for Codex app workflow notes.

Do not update docs for temporary implementation details.

## Last Reviewed

2026-05-16
