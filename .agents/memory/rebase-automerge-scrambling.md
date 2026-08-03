---
name: Rebase auto-merge scrambles large route files
description: markTaskComplete rebase's semantic auto-merge corrupts big Express route files; reconstruct from a known-good commit instead of hand-fixing markers.
---
The task-completion rebase uses a semantic auto-merge that repeatedly corrupts large route files (kpi.ts, leads.ts): interleaved handlers, duplicated/dropped routes, undeclared identifiers — sometimes with NO conflict markers, so it lands silently in the commit and even on main.

**Why:** the merger matches code structurally, and files with many similar handlers/loops get cross-spliced.

**How to apply:**
- After every rebase round, typecheck the whole api-server (not just conflicted files) and grep for markers; also check upstream main itself — it may already be scrambled by a prior task's merge.
- Don't hand-fix markers in a scrambled file. Overwrite from a known-good commit (`git show <good>:<path>`) and re-apply each task's intended edits coherently; `git reflog` finds the last green rebase result.
- After resolving, `git commit --amend` the fix into the task commit before markTaskComplete, or the review sees the scrambled committed state.
