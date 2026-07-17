---
name: Drizzle migrate baseline for push-created DBs
description: How to make drizzle-orm migrate() work on a DB whose schema came from drizzle-kit push (no journal), and the partial-push column gap trap.
---

# Baseline a push-created DB for migrate()

**Problem:** `migrate()` fails with `relation "..." already exists` when the schema was created by `drizzle-kit push` (push writes no journal). Bootstrap then dies before seeding.

**Fix (applied to both prod DO DB and local Replit DB):**
1. Replay `lib/db/migrations/0000_*.sql` statement-by-statement (split on `--> statement-breakpoint`), ignoring pg codes 42P07/42710/42701/42P06 (already-exists family).
2. Insert a baseline row: `CREATE SCHEMA IF NOT EXISTS drizzle; CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)`, then insert `(sha256hex(sql file contents), <entry.when from meta/_journal.json>)`. This is byte-for-byte what drizzle would write, so migrations 0001+ apply cleanly.

**Trap — partial push:** skipping whole `CREATE TABLE` statements hides missing columns if the old push predates schema changes. After replay, do a column-level diff of the DB against `meta/0000_snapshot.json` and `ALTER TABLE ADD COLUMN` any gaps (snapshot has type/default/notNull ready to use). Prod was missing 46 columns across 10 tables this way.

**Why:** push and migrate are two incompatible histories; baselining reconciles them once so startup `migrate()` becomes the single path going forward.
