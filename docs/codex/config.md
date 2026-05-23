# Codex Configuration

Repo-specific Codex configuration guidance. This is not a dumping ground for personal preferences.

## Scope

Codex configuration can live at the user level in `~/.codex/config.toml` and, for trusted projects, in project-level `.codex/config.toml` files.

Prefer documenting commands and workflow expectations before modifying shared config. Do not edit user-level config, trusted-project entries, permission profiles, hooks, rules, MCP servers, plugins, skills, custom agents, or automations unless the task explicitly requires it and the user approves the risk.

Global or personal Codex instructions should provide communication style, safety defaults, and workflow preferences. Repo facts, commands, and shared team rules belong in `AGENTS.md` or the checked-in `docs/codex/` files.

## Models and Reasoning

Use the current recommended Codex model by default. For complex coding, architecture, hard debugging, broad refactors, security-sensitive review, or computer use, prefer the strongest available model and reasoning setting in the active Codex surface. For narrow edits, formatting, simple checks, or low-risk exploration, a faster/lower-cost model may be appropriate.

Do not pin model names in repo docs unless there is a durable team reason. Model availability and defaults can change.

## Memories

Use native Codex Memories for private local recall of stable preferences, recurring workflows, project conventions, and known pitfalls.

Required team rules belong in `AGENTS.md` or checked-in documentation, not only in Memories.

If Memories are not enabled and durable private context matters, enable them through Codex settings or with user approval in `~/.codex/config.toml`:

```toml
[features]
memories = true
```

Do not manually edit `~/.codex/memories/`. Treat those files as generated Codex state.

## Permission Profiles

Permission profiles govern local sandboxed command execution. They do not replace separate controls for app connectors, MCP servers, browser/computer-use surfaces, Codex Cloud environment settings, or approved escalations.

No repo-specific permission profile is currently required. Do not mix permission-profile config with older sandbox config without checking current Codex docs and getting user approval.

## Project Configuration

Only add project `.codex/config.toml` when there is a clear repo-specific need, such as:

- shared sandbox expectations;
- project-specific MCP servers;
- project-specific permission profiles;
- trusted local hooks or rules.

Do not add broad permissions, dangerous allowlists, or broad trusted parent directories.

## Hooks

No project hooks are currently required.

| Hook | Trigger | Command | Purpose | Risk |
|---|---|---|---|---|
| None | N/A | N/A | No repo-specific hook need has been identified. | Avoid adding lifecycle side effects without review. |

## Rules

Rules control which commands Codex can run outside the sandbox. Prefer narrow prefix rules with examples. Do not broad-allow destructive commands.

Good candidates:

- Read-only GitHub CLI queries.
- Safe local test commands.
- Repeated non-destructive project commands.

Poor candidates:

- Broad shell access.
- Recursive deletion.
- Secret management.
- Production deployments.

| Rule | Allows/forbids | Scope | Rationale | Example |
|---|---|---|---|---|
| Candidate: read-only GitHub status | Allows read-only `gh run list` / `gh run view` patterns. | This repo only. | Speeds CI triage without write access. | `gh run list --repo AJRC-Star/PWCS_Lunch --limit 5` |
| Avoid: broad shell | Forbids broad unrestricted shell allowlists. | All contexts. | Prevents accidental destructive or privileged commands. | Do not broad-allow `rm`, `git reset`, or production deploy commands. |

## MCP

No repo-specific MCP server is currently required. Use MCP only when Codex needs external context or tools that cannot be represented by local files, GitHub CLI, or project scripts.

| Name | Scope | Config location | Required for | Least-privilege rationale |
|---|---|---|---|---|
| None | N/A | N/A | N/A | Avoid unnecessary external access. |

Do not add MCP servers that expose secrets, production systems, school/family data, or broad personal data without explicit user approval.

## Plugins

Use installed plugins opportunistically for GitHub, frontend verification, browser work, or documents only when they fit the task. No project-specific plugin bundle is required.

| Plugin | Provides | Scope | Install/config notes | Risk |
|---|---|---|---|---|
| GitHub | CI/run/PR context when needed. | Repository status and automation debugging. | Use existing connector or `gh` CLI when available. | Avoid write actions unless explicitly requested. |
| Browser | Localhost and public-page inspection. | UI verification. | Prefer in-app browser for unauthenticated pages. | Do not use for sensitive signed-in systems. |

## Local Environments and Actions

Recommended actions:

| Action | Command | Purpose | When to use |
|---|---|---|---|
| Dev server | `npm run dev` | Start Vite locally. | Frontend implementation and browser checks. |
| Typecheck | `npm run typecheck` | Check TypeScript. | TypeScript/script changes. |
| Test | `npm test` | Run Vitest. | Behavior changes and CI reproduction. |
| Validate artifact | `npm run validate:artifact` | Validate menu snapshot. | Menu artifact or normalization changes. |
| Build | `npm run build` | Verify production output. | Deploy-sensitive frontend changes. |

## Last Reviewed

2026-05-22
