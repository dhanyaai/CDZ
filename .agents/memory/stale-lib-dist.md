---
name: Stale lib/db dist after merges
description: Phantom TS errors ("no exported member X", column "does not exist") after task merges mean stale built d.ts, not missing schema.
---

**Rule:** If api-server typecheck says a table/column/export doesn't exist on `@workspace/db` but `lib/db/src/schema` clearly has it, the composite-project output in `lib/db/dist/*.d.ts` is stale. Force a rebuild: `npx tsc -b lib/db --force` (equivalently `pnpm --filter @workspace/db exec tsc --build --force`, or root `typecheck:libs`) — lib/db has no `build` script. Also run `pnpm --filter @workspace/db run push`: the dev database can lag the schema the same way (runtime 500s on missing columns).

**Why:** Task merges land schema changes from sibling tasks without rebuilding dist or pushing the DB, and tsc's `--build` incremental cache doesn't always rebuild after git updates source files.

**How to apply:** After any merge lands underneath your branch (or on fresh task envs), rebuild lib/db and re-run typecheck before trusting errors. Also re-verify route files — auto-merges have scrambled them (undefined vars, duplicated/orphaned blocks), and the scrambled version can be COMMITTED at HEAD with a clean working tree. Always `npx tsc --noEmit` in api-server before building on a fresh branch; if a file at HEAD is corrupted, `git checkout <last-clean-commit> -- <file>` and re-apply the corrupted commit's *intent* (read its diff for the +lines) rather than the diff itself.
