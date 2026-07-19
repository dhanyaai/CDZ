import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, advanceReceiptsTable, opportunitiesTable, clientsTable } from "@workspace/db";

const router = Router();

function serializeReceipt(
  r: typeof advanceReceiptsTable.$inferSelect,
  opportunityTitle: string | null,
  clientName: string | null,
) {
  return {
    id: r.id,
    opportunityId: r.opportunityId,
    opportunityTitle: opportunityTitle ?? null,
    clientName: clientName ?? null,
    amount: Number(r.amount),
    paymentMode: r.paymentMode ?? null,
    referenceNo: r.referenceNo ?? null,
    receiptDate: r.receiptDate.toISOString(),
    notes: r.notes ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

router.get("/v1/advance-receipts", async (req, res): Promise<void> => {
  const { opportunityId } = req.query as { opportunityId?: string };

  const query = db
    .select({
      receipt: advanceReceiptsTable,
      opportunityTitle: opportunitiesTable.title,
      clientName: clientsTable.companyName,
    })
    .from(advanceReceiptsTable)
    .leftJoin(opportunitiesTable, eq(advanceReceiptsTable.opportunityId, opportunitiesTable.id))
    .leftJoin(clientsTable, eq(opportunitiesTable.clientId, clientsTable.id))
    .orderBy(desc(advanceReceiptsTable.receiptDate));

  const rows = opportunityId
    ? await query.where(and(
        eq(advanceReceiptsTable.opportunityId, parseInt(opportunityId, 10)),
        eq(advanceReceiptsTable.companyId, req.companyId),
      ))
    : await query.where(eq(advanceReceiptsTable.companyId, req.companyId));

  res.json(rows.map(r => serializeReceipt(r.receipt, r.opportunityTitle, r.clientName)));
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

  const [joined] = await db
    .select({ receipt: advanceReceiptsTable, opportunityTitle: opportunitiesTable.title, clientName: clientsTable.companyName })
    .from(advanceReceiptsTable)
    .leftJoin(opportunitiesTable, eq(advanceReceiptsTable.opportunityId, opportunitiesTable.id))
    .leftJoin(clientsTable, eq(opportunitiesTable.clientId, clientsTable.id))
    .where(eq(advanceReceiptsTable.id, row.id));

  res.status(201).json(serializeReceipt(joined.receipt, joined.opportunityTitle, joined.clientName));
});

router.delete("/v1/advance-receipts/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.delete(advanceReceiptsTable).where(and(eq(advanceReceiptsTable.id, id), eq(advanceReceiptsTable.companyId, req.companyId)));
  res.status(204).end();
});

export default router;
