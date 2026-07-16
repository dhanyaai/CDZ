import app from "./app";
import { logger } from "./lib/logger";
import { bootstrap } from "./lib/bootstrap";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Start listening immediately so health checks pass, then run bootstrap.
// If bootstrap fails (e.g. bad DATABASE_URL) the server keeps running
// and returns 503 for DB-dependent endpoints — but the deploy succeeds.
const server = app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});

bootstrap().catch((err) => {
  logger.error({ err }, "Bootstrap failed (migrations/seed error) — check DATABASE_URL / DO_DATABASE_URL");
});
