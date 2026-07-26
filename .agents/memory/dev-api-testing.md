---
name: Dev API e2e testing
description: How to authenticate and hit the ERP dev API from the shell for endpoint testing
---

# Dev API e2e testing

- Base URL from the shell: `http://localhost:80/api` (root artifact proxies `/api` to the api-server).
- Auth is **Bearer token, not cookie sessions**: `POST /v1/auth/login` with a seeded user (creds listed in `scripts/src/seed.ts`, also printed by the seed script) returns `{ token }`; send `Authorization: Bearer <token>` on every request. Cookie-jar approaches fail with 401.
- Login is rate-limited (~20/15min) — reuse one token per test script.
- Test-data hygiene: prefix titles with `__TEST`, and DELETE routes exist for quotes, sample orders, and opportunities (204) — clean up after e2e runs.

**Why:** burned two test attempts assuming cookie sessions; the API only reads the Authorization header.
**How to apply:** any time an endpoint needs curl/python verification against the dev DB.
