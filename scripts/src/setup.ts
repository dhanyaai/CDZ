import { db, usersTable } from "@workspace/db";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

async function setup(): Promise<void> {
  let needsSeed = false;

  try {
    const rows = await db.select({ id: usersTable.id }).from(usersTable).limit(1);
    needsSeed = rows.length === 0;
    console.log(needsSeed ? "🌱 No users found — will seed." : "✅ Database already has data. Skipping seed.");
  } catch {
    console.log("⚠️  Could not query users table (may not exist yet) — will seed.");
    needsSeed = true;
  }

  if (!needsSeed) return;

  const result = spawnSync("pnpm", ["--filter", "@workspace/scripts", "run", "seed"], {
    stdio: "inherit",
    cwd: repoRoot,
    env: process.env,
    shell: true,
  });

  if (result.status !== 0) {
    console.error("❌ Seed failed with exit code", result.status);
    process.exit(1);
  }
}

setup()
  .catch((e) => { console.error("❌ Setup error:", e); process.exit(1); })
  .finally(() => process.exit(0));
