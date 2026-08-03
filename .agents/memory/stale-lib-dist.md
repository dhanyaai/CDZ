---
name: Stale lib/db dist after merges
description: Phantom TS errors like "no exported member X" after task merges; fix with forced rebuild
---
After a sibling task merges into your branch, `lib/db/dist` can be stale, causing api-server typecheck errors like "Module '@workspace/db' has no exported member 'xTable'" even though the schema/index exports exist.

**Why:** tsc --build incremental cache doesn't always rebuild after git updates source files.

**How to apply:** run `pnpm --filter @workspace/db exec tsc --build --force` (or root `typecheck:libs`) before trusting api-server type errors. Also: merges can silently corrupt route files (undefined vars, duplicated routes) — if a file you didn't touch fails typecheck, `git checkout <merged-commit> -- <file>` and re-apply your change.
