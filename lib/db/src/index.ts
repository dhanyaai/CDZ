import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// In development, prefer the local DATABASE_URL (Replit Postgres).
// In production (DigitalOcean), prefer DO_DATABASE_URL, falling back to
// the platform-provided DATABASE_URL.
const isDev = process.env.NODE_ENV === "development";
const rawConnectionString = isDev
  ? (process.env.DATABASE_URL ?? process.env.DO_DATABASE_URL)
  : (process.env.DO_DATABASE_URL ?? process.env.DATABASE_URL);

if (!rawConnectionString) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Strip sslmode from the URL: newer pg versions treat sslmode=require as
// strict verify-full, which fails against managed DBs with self-signed CA
// chains. The explicit `ssl` option below is authoritative instead.
function stripSslMode(conn: string): string {
  try {
    const u = new URL(conn);
    u.searchParams.delete("sslmode");
    return u.toString();
  } catch {
    return conn;
  }
}

// Local dev (Replit Postgres): use the URL as-is — pg honors its sslmode,
// and the local server may not support SSL at all.
// Managed DB (DigitalOcean): strip sslmode and force TLS with relaxed cert
// verification (DO uses a self-signed CA chain).
const usingLocalDev = isDev && !!process.env.DATABASE_URL;

export const pool = usingLocalDev
  ? new Pool({ connectionString: rawConnectionString })
  : new Pool({
      connectionString: stripSslMode(rawConnectionString),
      ssl: { rejectUnauthorized: false },
    });

export const dbConnectionInfo = (() => {
  try {
    const u = new URL(rawConnectionString);
    return { host: u.hostname, port: u.port, database: u.pathname };
  } catch {
    return { host: "unparseable", port: "", database: "" };
  }
})();
export const db = drizzle(pool, { schema });

export * from "./schema";
