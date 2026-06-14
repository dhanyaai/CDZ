import { Router } from "express";
import { eq, and, SQL } from "drizzle-orm";
import { db, assemblyJobsTable, assemblyItemsTable, salesOrdersTable, productsTable } from "@workspace/db";

const router = Router();

async function getJobDetail(id: number) {
  const [row] = await db
    .select({ job: assemblyJobsTable, orderNumber: salesOrdersTable.orderNumber })
    .from(assemblyJobsTable)
    .leftJoin(salesOrdersTable, eq(assemblyJobsTable.salesOrderId, salesOrdersTable.id))
    .where(eq(assemblyJobsTable.id, id));

  if (!row) return null;

  const items = await db
    .select({ item: assemblyItemsTable, product: productsTable })
    .from(assemblyItemsTable)
    .leftJoin(productsTable, eq(assemblyItemsTable.productId, productsTable.id))
    .where(eq(assemblyItemsTable.assemblyJobId, id));

  return {
    id: row.job.id,
    jobNumber: row.job.jobNumber,
    salesOrderId: row.job.salesOrderId,
    orderNumber: row.orderNumber ?? null,
    status: row.job.status,
    totalKits: row.job.totalKits,
    completedKits: row.job.completedKits,
    items: items.map((r) => ({
      id: r.item.id,
      productId: r.item.productId,
      productName: r.product?.name ?? "Unknown",
      quantity: r.item.quantity,
      status: r.item.status,
      qcNotes: r.item.qcNotes ?? null,
    })),
    createdAt: row.job.createdAt.toISOString(),
  };
}

router.get("/v1/assembly", async (req, res): Promise<void> => {
  const { status, salesOrderId } = req.query as { status?: string; salesOrderId?: string };
  const conditions: SQL[] = [eq(assemblyJobsTable.companyId, req.companyId)];
  if (status) conditions.push(eq(assemblyJobsTable.status, status));
  if (salesOrderId) conditions.push(eq(assemblyJobsTable.salesOrderId, parseInt(salesOrderId, 10)));

  const rows = await db
    .select({ job: assemblyJobsTable, orderNumber: salesOrdersTable.orderNumber })
    .from(assemblyJobsTable)
    .leftJoin(salesOrdersTable, eq(assemblyJobsTable.salesOrderId, salesOrdersTable.id))
    .where(and(...conditions))
    .orderBy(assemblyJobsTable.createdAt);

  res.json(rows.map((r) => ({
    id: r.job.id,
    jobNumber: r.job.jobNumber,
    salesOrderId: r.job.salesOrderId,
    orderNumber: r.orderNumber ?? null,
    status: r.job.status,
    totalKits: r.job.totalKits,
    completedKits: r.job.completedKits,
    createdAt: r.job.createdAt.toISOString(),
  })));
});

router.post("/v1/assembly", async (req, res): Promise<void> => {
  const { salesOrderId, totalKits, notes } = req.body ?? {};
  if (!salesOrderId || !totalKits) {
    res.status(400).json({ error: "salesOrderId and totalKits are required" });
    return;
  }

  const [job] = await db.insert(assemblyJobsTable).values({
    companyId: req.companyId,
    jobNumber: "AJ-TEMP",
    salesOrderId,
    totalKits,
    completedKits: 0,
    status: "Pending",
    notes,
  }).returning();

  await db.update(assemblyJobsTable).set({ jobNumber: `AJ-${String(job.id).padStart(5, "0")}` }).where(eq(assemblyJobsTable.id, job.id));

  const detail = await getJobDetail(job.id);
  res.status(201).json(detail);
});

router.get("/v1/assembly/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const detail = await getJobDetail(id);
  if (!detail) {
    res.status(404).json({ error: "Assembly job not found" });
    return;
  }
  res.json(detail);
});

router.patch("/v1/assembly/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const updates: Record<string, unknown> = {};
  if (req.body.completedKits != null) updates.completedKits = req.body.completedKits;
  if (req.body.notes != null) updates.notes = req.body.notes;

  await db.update(assemblyJobsTable).set(updates).where(and(eq(assemblyJobsTable.id, id), eq(assemblyJobsTable.companyId, req.companyId)));
  const detail = await getJobDetail(id);
  if (!detail) {
    res.status(404).json({ error: "Assembly job not found" });
    return;
  }
  res.json(detail);
});

router.patch("/v1/assembly/:id/status", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { status } = req.body ?? {};
  if (!status) {
    res.status(400).json({ error: "status is required" });
    return;
  }
  const [job] = await db.update(assemblyJobsTable).set({ status }).where(and(eq(assemblyJobsTable.id, id), eq(assemblyJobsTable.companyId, req.companyId))).returning();
  if (!job) {
    res.status(404).json({ error: "Assembly job not found" });
    return;
  }
  const [row] = await db
    .select({ job: assemblyJobsTable, orderNumber: salesOrdersTable.orderNumber })
    .from(assemblyJobsTable)
    .leftJoin(salesOrdersTable, eq(assemblyJobsTable.salesOrderId, salesOrdersTable.id))
    .where(eq(assemblyJobsTable.id, id));

  res.json({
    id: row.job.id,
    jobNumber: row.job.jobNumber,
    salesOrderId: row.job.salesOrderId,
    orderNumber: row.orderNumber ?? null,
    status: row.job.status,
    totalKits: row.job.totalKits,
    completedKits: row.job.completedKits,
    createdAt: row.job.createdAt.toISOString(),
  });
});

export default router;
