import { migrate } from "drizzle-orm/node-postgres/migrator";
import {
  db,
  dbConnectionInfo,
  companiesTable,
  usersTable,
  userCompaniesTable,
} from "@workspace/db";
import { hashPassword } from "./password";
import { logger } from "./logger";
import path from "node:path";
import { fileURLToPath } from "node:url";

export async function bootstrap(): Promise<void> {
  const migrationsFolder = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "migrations",
  );

  // Log the DB host we're connecting to (password redacted) to aid debugging
  logger.info(
    {
      host: dbConnectionInfo.host,
      port: dbConnectionInfo.port,
      db: dbConnectionInfo.database,
    },
    "DB connection target",
  );

  logger.info({ migrationsFolder }, "Running database migrations");
  await migrate(db, { migrationsFolder });
  logger.info("Migrations complete");

  const existing = await db.select({ id: usersTable.id }).from(usersTable).limit(1);
  if (existing.length > 0) {
    logger.info("Database already seeded, skipping");
    return;
  }

  logger.info("Empty database — seeding admin user");

  const [company] = await db
    .insert(companiesTable)
    .values({ name: "Customize Duniya" })
    .returning();

  const [admin] = await db
    .insert(usersTable)
    .values({
      name: "Admin",
      email: "admin@gifterp.com",
      passwordHash: hashPassword("admin123"),
      role: "Admin",
      companyId: company.id,
      isActive: true,
    })
    .returning();

  await db.insert(userCompaniesTable).values({
    userId: admin.id,
    companyId: company.id,
  });

  logger.info("Admin user ready: admin@gifterp.com / admin123");
}
