import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, advanceReceiptsTable } from "@workspace/db";

const router = Router();

router.get("/v1/advance-receipts", async (req, res): Promise<void> => {
  const { opportunityId } = req.query as { opportunityId?: string };
  if (!opportunityId) { res.status(400).json({ error: "opportunityId is required" }); return; }
  const rows = await db.select().from(advanceReceiptsTable)
    .where(and(eq(advanceReceiptsTable.opportunityId, parseInt(opportunityId, 10)), eq(advanceReceiptsTable.companyId, req.companyId)))
    .orderBy(desc(advanceReceiptsTable.receiptDate));
  res.json(rows.map(r => ({
    id: r.id, opportunityId: r.opportunityId, amount: Number(r.amount),
    paymentMode: r.paymentMode ?? null, referenceNo: r.referenceNo ?? null,
    receiptDate: r.receiptDate.toISOString(), notes: r.notes ?? null,
    createdAt: r.createdAt.toISOString(),
  })));
});

router.post("/v1/advance-receipts", async (req, res): Promise<void> => {
  const { opportunityId, amount, paymentMode, referenceNo, receiptDate, notes } = req.body ?? {};
  if (!opportunityId || amount == null || !receiptDate) {
    res.status(400).json({ error: "opportunityId, amount, and receiptDate are required" }); return;
  }
  const [row] = await db.insert(advanceReceiptsTable).values({
    companyId: req.companyId, opportunityId, amount: String(amount),
    paymentMode: paymentMode ?? null, referenceNo: referenceNo ?? null,
    receiptDate: new Date(receiptDate), notes: notes ?? null,
  }).returning();
  res.status(201).json({
    id: row.id, opportunityId: row.opportunityId, amount: Number(row.amount),
    paymentMode: row.paymentMode ?? null, referenceNo: row.referenceNo ?? null,
    receiptDate: row.receiptDate.toISOString(), notes: row.notes ?? null,
    createdAt: row.createdAt.toISOString(),
  });
});

router.delete("/v1/advance-receipts/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.delete(advanceReceiptsTable).where(and(eq(advanceReceiptsTable.id, id), eq(advanceReceiptsTable.companyId, req.companyId)));
  res.status(204).end();
});

export default router;
