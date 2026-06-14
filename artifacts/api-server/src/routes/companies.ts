import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, companiesTable, usersTable } from "@workspace/db";
import { updateSessionCompany } from "../lib/sessions";

const router = Router();

router.get("/v1/companies", async (req, res): Promise<void> => {
  const companies = await db.select().from(companiesTable).orderBy(companiesTable.name);
  res.json(companies.map((c) => ({
    id: c.id,
    name: c.name,
    createdAt: c.createdAt.toISOString(),
    isCurrent: c.id === req.companyId,
  })));
});

router.post("/v1/companies", async (req, res): Promise<void> => {
  const { name } = req.body ?? {};
  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const [company] = await db.insert(companiesTable).values({ name }).returning();
  res.status(201).json({ id: company.id, name: company.name, createdAt: company.createdAt.toISOString() });
});

router.patch("/v1/companies/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { name } = req.body ?? {};
  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const [company] = await db.update(companiesTable).set({ name }).where(eq(companiesTable.id, id)).returning();
  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }
  res.json({ id: company.id, name: company.name, createdAt: company.createdAt.toISOString() });
});

router.post("/v1/companies/:id/switch", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, id));
  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }

  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    updateSessionCompany(auth.slice(7), id);
  }

  await db.update(usersTable).set({ companyId: id }).where(eq(usersTable.id, req.userId));

  res.json({ success: true, companyId: id, companyName: company.name });
});

export default router;
