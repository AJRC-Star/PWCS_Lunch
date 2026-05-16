# Codex Configuration Recommendations

Codex configuration can live at the user level in `~/.codex/config.toml` and, for trusted projects, in project-level `.codex/config.toml` files. This file documents repo-specific recommendations; it is not a dumping ground for personal preferences.

## Recommended User-Level Memory Setting

Enable Codex Memories if available in your region and account:

```toml
[features]
memories = true
```

Do this through Codex settings or by editing `~/.codex/config.toml` with user approval.

Do not edit `~/.codex/memories/` manually. Treat those files as generated Codex state.

## Suggested Defaults

These are recommendations, not mandatory repo files:

```toml
approval_policy = "on-request"
sandbox_mode = "workspace-write"
```

Use stricter settings for unfamiliar or risky repositories.

## Project Configuration

Only add project `.codex/config.toml` when there is a clear repo-specific need, such as:

- Shared sandbox expectations.
- Project-specific MCP servers.
- Project-specific profiles.
- Trusted local hooks or rules.

Do not add broad permissions or dangerous allowlists.

## Hooks

No project hooks are currently required.

| Hook | Trigger | Command | Purpose | Risk |
|---|---|---|---|---|
| None | N/A | N/A | No repo-specific hook need has been identified. | Avoid adding lifecycle side effects without review. |

## Rules

Use rules for narrow repeated command approval patterns. Rules are not a substitute for judgment.

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

No repo-specific MCP server is currently required. Use MCP only when Codex needs external context or actions that cannot be represented by local files, GitHub CLI, or project scripts.

| Name | Scope | Config location | Required for | Least-privilege rationale |
|---|---|---|---|---|
| None | N/A | N/A | N/A | Avoid unnecessary external access. |

Do not add MCP servers that expose secrets, production systems, school/family data, or broad personal data without explicit user approval.

## Plugins

Use installed plugins opportunistically for GitHub, Vercel-style frontend verification, browser work, or documents only when they fit the task. No project-specific plugin bundle is required.

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

2026-05-16
