# Codex-Relevant Project Decisions

Record only durable decisions that future Codex work should know.

## Entry Template

### YYYY-MM-DD - Decision title

- **Decision:** What was decided.
- **Rationale:** Why this decision was made.
- **Status:** Proposed | Active | Superseded
- **Scope:** Repo-wide | Area-specific
- **Related files:** Paths, issues, PRs, or docs.

## Decisions

### 2026-05-14 - Use AGENTS.md as the Codex instruction source

- **Decision:** Use `AGENTS.md` as the Codex-native repository instruction entry point.
- **Rationale:** Codex automatically discovers `AGENTS.md`, while detailed durable project knowledge belongs in checked-in docs and private recall belongs in Codex native Memories.
- **Status:** Active
- **Scope:** Repo-wide
- **Related files:** `AGENTS.md`, `docs/codex/`

### 2026-05-14 - Prefer Codex native Memories for private recall

- **Decision:** Keep shared durable project guidance in checked-in docs and use Codex native Memories for private preferences and recurring cross-thread context.
- **Rationale:** This avoids a heavy repo-local private memory framework and keeps startup guidance short.
- **Status:** Active
- **Scope:** Repo-wide
- **Related files:** `AGENTS.md`, `docs/codex/config-recommendations.md`, `.gitignore`

### 2026-05-14 - Run weekly menu refresh as a Codex local automation

- **Decision:** Use the Codex automation `weekly-pwcs-lunch-menu-refresh` to run `scripts/local-fetch.sh` weekly on Saturdays at 06:00 America/New_York from the PWCS Lunch checkout.
- **Rationale:** MealViewer blocks GitHub-hosted runner IPs, while a local Codex automation runs through the user's network and can reuse the established refresh script.
- **Status:** Active
- **Scope:** Area-specific
- **Related files:** `scripts/local-fetch.sh`, `public/menu-data.json`, `scripts/com.pwcs-lunch.fetch-menu.plist`, `.github/workflows/fetch-menu.yml`

### 2026-05-14 - Use committed menu artifact as published source of truth

- **Decision:** The published app reads `public/menu-data.json` as its authoritative menu snapshot.
- **Rationale:** A validated committed artifact keeps production stable, small, and cacheable, and avoids relying on live MealViewer availability in the browser.
- **Status:** Active
- **Scope:** Area-specific
- **Related files:** `public/menu-data.json`, `src/api.ts`, `scripts/fetch-menu.ts`, `scripts/validate-menu-artifact.ts`

## Decision Criteria

Add a decision here only when it changes future implementation, verification, architecture, or workflow choices. Do not record ephemeral project-management notes.

## Last Reviewed

2026-05-16
