import { db, companiesTable, usersTable, userCompaniesTable } from "@workspace/db";
import { eq, isNull } from "drizzle-orm";
import { sql } from "drizzle-orm";

const TABLES_WITH_COMPANY_ID = [
  "activities",
  "artwork_approvals",
  "assembly_jobs",
  "bundles",
  "categories",
  "clients",
  "company_settings",
  "contacts",
  "credit_notes",
  "goods_receipts",
  "inventory_movements",
  "invoices",
  "leads",
  "opportunities",
  "payments",
  "product_variants",
  "products",
  "purchase_orders",
  "quotes",
  "sales_orders",
  "shipments",
  "users",
  "vendors",
  "warehouse_locations",
];

async function seedCompanies() {
  console.log("Backfill: ensuring default company and user memberships...");

  const existing = await db.select().from(companiesTable).where(eq(companiesTable.id, 1));
  if (existing.length === 0) {
    await db.insert(companiesTable).values({
      name: "Customize Duniya",
      city: "Mumbai",
      state: "Maharashtra",
    });
    console.log("Created default company 'Customize Duniya' (id=1)");
  } else {
    console.log(`Default company already exists: ${existing[0].name}`);
  }

  console.log("Backfilling company_id = 1 for any NULL rows across all tables...");
  for (const table of TABLES_WITH_COMPANY_ID) {
    try {
      const result = await db.execute(
        sql.raw(`UPDATE "${table}" SET company_id = 1 WHERE company_id IS NULL`)
      );
      const count = (result as { rowCount?: number }).rowCount ?? 0;
      if (count > 0) console.log(`  ${table}: backfilled ${count} row(s)`);
    } catch (err) {
      console.warn(`  Skipped ${table}: ${(err as Error).message}`);
    }
  }

  const users = await db.select().from(usersTable);
  console.log(`Found ${users.length} users to backfill memberships for.`);

  for (const user of users) {
    const cid = user.companyId;
    const companyExists = await db.select().from(companiesTable).where(eq(companiesTable.id, cid));
    if (companyExists.length === 0) {
      console.log(`  Skipping user ${user.email} — company ${cid} does not exist`);
      continue;
    }
    await db.insert(userCompaniesTable)
      .values({ userId: user.id, companyId: cid })
      .onConflictDoNothing();
    console.log(`  Ensured membership: ${user.email} → company ${cid}`);
  }

  console.log("Backfill complete.");
}

seedCompanies().catch(console.error).finally(() => process.exit());
