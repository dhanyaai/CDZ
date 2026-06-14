import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, companiesTable, usersTable, userCompaniesTable } from "@workspace/db";
import { updateSessionCompany } from "../lib/sessions";
import { requireAdmin } from "../lib/requireAdmin";

const router = Router();

function serializeCompany(c: typeof companiesTable.$inferSelect, isCurrent: boolean) {
  return {
    id: c.id,
    name: c.name,
    gstin: c.gstin ?? null,
    gstAddress: c.gstAddress ?? null,
    city: c.city ?? null,
    state: c.state ?? null,
    pincode: c.pincode ?? null,
    logoUrl: c.logoUrl ?? null,
    createdAt: c.createdAt.toISOString(),
    isCurrent,
  };
}

router.get("/v1/companies", async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));

  let companies: (typeof companiesTable.$inferSelect)[];
  if (user?.role === "Admin") {
    companies = await db.select().from(companiesTable).orderBy(companiesTable.name);
  } else {
    const rows = await db
      .select({ company: companiesTable })
      .from(userCompaniesTable)
      .innerJoin(companiesTable, eq(userCompaniesTable.companyId, companiesTable.id))
      .where(eq(userCompaniesTable.userId, req.userId))
      .orderBy(companiesTable.name);
    companies = rows.map((r) => r.company);
  }

  res.json(companies.map((c) => serializeCompany(c, c.id === req.companyId)));
});

router.post("/v1/companies", requireAdmin, async (req, res): Promise<void> => {
  const { name, gstin, gstAddress, city, state, pincode, logoUrl } = req.body ?? {};
  if (!name) { res.status(400).json({ error: "name is required" }); return; }

  const [company] = await db.insert(companiesTable)
    .values({ name, gstin, gstAddress, city, state, pincode, logoUrl })
    .returning();

  await db.insert(userCompaniesTable)
    .values({ userId: req.userId, companyId: company.id })
    .onConflictDoNothing();

  res.status(201).json(serializeCompany(company, false));
});

router.patch("/v1/companies/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);

  if (id !== req.companyId) {
    res.status(403).json({ error: "You can only edit the currently active company" });
    return;
  }

  const [membership] = await db.select().from(userCompaniesTable)
    .where(and(eq(userCompaniesTable.userId, req.userId), eq(userCompaniesTable.companyId, id)));
  if (!membership) { res.status(403).json({ error: "You are not a member of this company" }); return; }

  const { name, gstin, gstAddress, city, state, pincode, logoUrl } = req.body ?? {};
  if (!name) { res.status(400).json({ error: "name is required" }); return; }

  const [company] = await db.update(companiesTable)
    .set({ name, gstin, gstAddress, city, state, pincode, logoUrl })
    .where(eq(companiesTable.id, id))
    .returning();
  if (!company) { res.status(404).json({ error: "Company not found" }); return; }

  res.json(serializeCompany(company, true));
});

router.post("/v1/companies/:id/switch", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);

  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, id));
  if (!company) { res.status(404).json({ error: "Company not found" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  if (user.role !== "Admin") {
    const [membership] = await db.select().from(userCompaniesTable)
      .where(and(eq(userCompaniesTable.userId, req.userId), eq(userCompaniesTable.companyId, id)));
    if (!membership) {
      res.status(403).json({ error: "You do not have access to this company" });
      return;
    }
  }

  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    updateSessionCompany(auth.slice(7), id);
  }

  await db.update(usersTable).set({ companyId: id }).where(eq(usersTable.id, req.userId));

  res.json({ success: true, companyId: id, companyName: company.name });
});

router.delete("/v1/companies/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (id === req.companyId) {
    res.status(400).json({ error: "Cannot delete the currently active company" });
    return;
  }
  await db.delete(companiesTable).where(eq(companiesTable.id, id));
  res.sendStatus(204);
});

export default router;
