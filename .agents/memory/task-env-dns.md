---
name: Task env DNS failure for main-repl fetch
description: Fix for markTaskComplete failing with UNAUTHENTICATED git fetch from main-repl
---

**Rule:** If `markTaskComplete` fails with `git fetch main-repl ... UNAUTHENTICATED`, check DNS first: `getent hosts ssh.sisko.replit.dev`. The task environment's resolver can fail to resolve the Replit SSH proxy host.

**Why:** The tool's error says UNAUTHENTICATED but the underlying cause was "Could not resolve hostname". Retrying blindly wastes many attempts.

**How to apply:** Resolve the host via a public DNS (e.g. query 8.8.8.8 directly), then add a `~/.ssh/config` entry `Host ssh.sisko.replit.dev` / `HostName <ip>`. Retry markTaskComplete afterwards.
