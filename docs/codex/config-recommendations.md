# Codex Configuration Recommendations

Codex configuration can live at the user level in `~/.codex/config.toml` and, for trusted projects, in project-level `.codex/config.toml` files.

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

## Last Reviewed

2026-05-14
