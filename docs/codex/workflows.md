# Workflows

Repeated repository workflows that Codex should know.

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

2026-05-14
