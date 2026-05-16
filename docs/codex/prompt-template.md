# Codex Prompt Template

Use this template for larger Codex tasks.

## Goal

What should Codex accomplish?

## Context

Relevant files, docs, issues, PRs, screenshots, errors, logs, examples, or deployment links.

## Scope

In scope:

- TODO

Out of scope:

- TODO

## Constraints

- TODO: architecture, compatibility, UI, data, security, performance, dependencies, or deployment requirements.

## Verification

Run:

- TODO

Also verify:

- TODO

## Done When

- Tests/checks pass.
- User-visible behavior is correct.
- Docs are updated if needed.
- Diff is focused and reviewable.

## Risks / Watchouts

- TODO

## For Complex Work

Ask Codex to plan first before editing:

```text
Use Plan mode first. Inspect the repo, identify the smallest safe implementation path, list open questions, and wait only if a blocking question remains.
```

## For Debugging

```text
First reproduce or localize the bug. Then explain the likely cause, make the minimal fix, and run the most targeted verification available.
```

## For Refactors

```text
Preserve behavior. Keep changes small and reviewable. Run tests before and after if practical. Do not mix unrelated cleanup with the refactor.
```
