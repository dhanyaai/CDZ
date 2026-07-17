# [Project name]

_Replace the heading above with the project's name, and this line with one sentence describing what this app does for users._

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Production runs on DigitalOcean App Platform (GitHub repo dhanyaai/CDZ, branch main) with `deploy_on_push` enabled — every push to main auto-deploys to https://customizeduniya-dqjm2.ondigitalocean.app
- DB connection selection lives in `lib/db/src/index.ts`: development prefers local `DATABASE_URL` (Replit Postgres, no SSL); production prefers `DO_DATABASE_URL ?? DATABASE_URL` with sslmode stripped and relaxed TLS (DO self-signed CA)
- `pnpm --filter @workspace/db run push` targets the LOCAL dev database only (`lib/db/drizzle.config.ts`); production schema changes go through generated migrations applied by `migrate()` at server startup
- Both dev and prod databases are baselined in `drizzle.__drizzle_migrations`; never use `db push` against prod
- The `DO_DATABASE_URL` Replit secret has a stale password; the DO database is firewalled to the app only

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
