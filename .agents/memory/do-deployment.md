---
name: DigitalOcean App Platform deployment
description: How the prod deployment works, DB TLS/firewall quirks, and drizzle baseline lessons for the Gifting ERP on DO.
---

# DigitalOcean deployment (Customize Duniya ERP)

- App id `c3ec2771-9b98-40a3-a6b0-0197fc041f6b` ("customizeduniya"), builds from GitHub `dhanyaai/CDZ` branch `main`, live at https://customizeduniya-dqjm2.ondigitalocean.app. `deploy_on_push: true` — every push to main (including Replit checkpoints) auto-deploys.
- Manage via API with `DIGITALOCEAN_API_TOKEN`: `GET/PUT /v2/apps/{id}` (PUT spec triggers deploy), poll `GET .../deployments/{id}`, runtime logs via `GET .../logs?type=RUN` → `live_url`.
- DB is a managed PG cluster `czddb` (id `396fca38-8813-4560-957b-e1c30cb1b0e1`). Service env binds it as `postgresql://${czddb.USERNAME}:${czddb.PASSWORD}@${czddb.HOSTNAME}:${czddb.PORT}/${czddb.DATABASE}` — component name must match the actual DB component, and NO `sslmode` in the URL.
- **Why no sslmode:** pg ≥8.x treats `sslmode=require` in the URL as strict verify-full → "self-signed certificate in certificate chain" against DO. Fix: strip sslmode, pass explicit `ssl: { rejectUnauthorized: false }`.
- **Firewall (Trusted Sources):** only the app itself is whitelisted. To touch the DB from Replit: GET existing rules, PUT full list + `{type:'ip_addr', value:<egress IP from api.ipify.org>}`, do the work, PUT the original list back. Always remove the rule afterwards.
- **Stale secret:** the `DO_DATABASE_URL` Replit secret has an outdated password. Fetch live credentials via `GET /v2/databases/{id}` → `database.connection` instead.
- **How to apply:** any prod DB surgery goes: temp-whitelist → connect with live creds → fix → verify → un-whitelist. Never leave dev with write access to prod.
- **No in-memory state:** prod runs 2+ replicas behind a round-robin LB. In-memory session maps caused "login works but next request 401" (login stored on replica A, /me hit replica B). Sessions now live in the `sessions` DB table; any future per-request state (caches, rate-limit buckets) must be DB/shared-store backed or explicitly per-instance-safe.
- **Spaces (object storage):** bucket is `czd-erp` in `sgp1` — NOT blr1 and NOT `czd`. New-bucket creation in blr1 returns AccessDenied for this account regardless of key permissions (region restriction); sgp1 works. The name `czd` is taken by another account in sgp1. Both existing Spaces keys are fullaccess; keys can be minted/deleted via DO API `/v2/spaces/keys` using the API token.
- **Upload fallback policy:** local-disk upload fallback is dev-only and fail-closed (requires NODE_ENV=development or explicit override). Never enable it in prod: multi-replica → per-replica files 404 behind the LB and vanish on redeploy; prod must fail loudly if Spaces breaks.
- **Git push:** shell `git push` fails (no credentials). Use the `gitPush` callback from the git-remote skill.
