import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, vendorsTable } from "@workspace/db";

const router = Router();

function serializeVendor(v: typeof vendorsTable.$inferSelect) {
  return {
    id: v.id,
    name: v.name,
    contactPerson: v.contactPerson ?? null,
    email: v.email ?? null,
    phone: v.phone ?? null,
    leadTimeDays: v.leadTimeDays,
    createdAt: v.createdAt.toISOString(),
  };
}

router.get("/v1/vendors", async (req, res): Promise<void> => {
  const vendors = await db.select().from(vendorsTable).where(eq(vendorsTable.companyId, req.companyId)).orderBy(vendorsTable.name);
  res.json(vendors.map(serializeVendor));
});

router.post("/v1/vendors", async (req, res): Promise<void> => {
  const { name, contactPerson, email, phone, leadTimeDays } = req.body ?? {};
  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const [vendor] = await db
    .insert(vendorsTable)
    .values({ companyId: req.companyId, name, contactPerson, email, phone, leadTimeDays: leadTimeDays ?? 7 })
    .returning();
  res.status(201).json(serializeVendor(vendor));
});

router.get("/v1/vendors/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [vendor] = await db.select().from(vendorsTable).where(and(eq(vendorsTable.id, id), eq(vendorsTable.companyId, req.companyId)));
  if (!vendor) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }
  res.json(serializeVendor(vendor));
});

router.patch("/v1/vendors/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const fields = ["name", "contactPerson", "email", "phone", "leadTimeDays"] as const;
  const updates: Record<string, unknown> = {};
  for (const f of fields) {
    if (req.body[f] != null) updates[f] = req.body[f];
  }
  const [vendor] = await db.update(vendorsTable).set(updates).where(and(eq(vendorsTable.id, id), eq(vendorsTable.companyId, req.companyId))).returning();
  if (!vendor) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }
  res.json(serializeVendor(vendor));
});

export default router;
