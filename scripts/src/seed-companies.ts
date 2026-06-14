import { db, companiesTable, usersTable, userCompaniesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

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
