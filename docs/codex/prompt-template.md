# Codex Prompt Template

Use this template for high-quality Codex tasks.

```text
Goal:
- What should change or be built?

Context:
- Relevant files, folders, docs, screenshots, errors, logs, or examples.

Constraints:
- Architecture, compatibility, style, security, performance, dependencies, or product requirements.

Done when:
- Tests/checks pass.
- User-visible behavior is correct.
- Docs are updated if needed.
- Diff is focused and reviewable.
```

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
