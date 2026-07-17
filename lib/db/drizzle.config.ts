import { defineConfig } from "drizzle-kit";
import path from "path";

// drizzle-kit push is a dev-only command: always prefer the local
// DATABASE_URL (Replit Postgres). Only fall back to the managed DO URL
// if no local database exists — and only then apply relaxed TLS (the
// local server does not support SSL at all).
const localUrl = process.env.DATABASE_URL;
const managedUrl = process.env.DO_DATABASE_URL;
const connectionString = localUrl ?? managedUrl;

if (!connectionString) {
  throw new Error("DATABASE_URL (or DO_DATABASE_URL), ensure the database is provisioned");
}

function stripSslMode(conn: string): string {
  try {
    const u = new URL(conn);
    u.searchParams.delete("sslmode");
    return u.toString();
  } catch {
    return conn;
  }
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  out: path.join(__dirname, "./migrations"),
  dialect: "postgresql",
  dbCredentials: localUrl
    ? { url: localUrl }
    : {
        url: stripSslMode(connectionString),
        ssl: { rejectUnauthorized: false },
      },
});
