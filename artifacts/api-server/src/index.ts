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

function startServer() {
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
  });
}

// Bootstrap (migrate + seed) only runs in production.
// In development the schema is managed via `pnpm --filter @workspace/db run push`.
if (process.env.NODE_ENV === "production") {
  bootstrap()
    .then(() => logger.info("Bootstrap succeeded"))
    .catch((err) =>
      logger.error({ err }, "Bootstrap failed — DB unavailable, API calls will fail until fixed"),
    )
    .finally(startServer);
} else {
  startServer();
}
