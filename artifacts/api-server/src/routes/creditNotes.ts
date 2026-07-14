import { Router } from "express";
import { eq, and, SQL, isNull, desc } from "drizzle-orm";
import { db, creditNotesTable, invoicesTable, clientsTable, paymentsTable } from "@workspace/db";

const router = Router();

async function nextCnNumber(companyId: number): Promise<string> {
  const [last] = await db
    .select({ n: creditNotesTable.creditNoteNumber })
    .from(creditNotesTable)
    .where(eq(creditNotesTable.companyId, companyId))
    .orderBy(desc(creditNotesTable.id))
    .limit(1);

  if (!last) return `CN-${companyId}-0001`;
  const match = last.n.match(/(\d+)$/);
  const num = match ? parseInt(match[1], 10) + 1 : 1;
  return `CN-${companyId}-${String(num).padStart(4, "0")}`;
}

router.get("/v1/credit-notes", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      cn: creditNotesTable,
      clientName: clientsTable.companyName,
      invoiceNumber: invoicesTable.invoiceNumber,
    })
    .from(creditNotesTable)
    .leftJoin(clientsTable, eq(creditNotesTable.clientId, clientsTable.id))
    .leftJoin(invoicesTable, eq(creditNotesTable.invoiceId, invoicesTable.id))
    .where(eq(creditNotesTable.companyId, req.companyId))
    .orderBy(desc(creditNotesTable.createdAt));

  res.json(rows.map((r) => ({
    id: r.cn.id,
    creditNoteNumber: r.cn.creditNoteNumber,
    clientId: r.cn.clientId,
    clientName: r.clientName ?? "Unknown",
    invoiceId: r.cn.invoiceId ?? null,
    invoiceNumber: r.invoiceNumber ?? null,
    amount: Number(r.cn.amount),
    reason: r.cn.reason,
    status: r.cn.status,
    issuedDate: r.cn.issuedDate.toISOString(),
    createdAt: r.cn.createdAt.toISOString(),
  })));
});

router.post("/v1/credit-notes", async (req, res): Promise<void> => {
  const { clientId, invoiceId, amount, reason } = req.body ?? {};
  if (!clientId || amount == null || !reason) {
    res.status(400).json({ error: "clientId, amount, and reason are required" }); return;
  }

  const [client] = await db.select({ id: clientsTable.id })
    .from(clientsTable)
    .where(and(eq(clientsTable.id, clientId), eq(clientsTable.companyId, req.companyId)));
  if (!client) { res.status(404).json({ error: "Client not found" }); return; }

  if (invoiceId) {
    const [inv] = await db.select({ id: invoicesTable.id })
      .from(invoicesTable)
      .where(and(eq(invoicesTable.id, invoiceId), eq(invoicesTable.companyId, req.companyId)));
    if (!inv) { res.status(404).json({ error: "Invoice not found" }); return; }
  }

  const creditNoteNumber = await nextCnNumber(req.companyId);

  const [cn] = await db.insert(creditNotesTable).values({
    companyId: req.companyId,
    creditNoteNumber,
    clientId,
    invoiceId: invoiceId ?? null,
    amount: String(amount),
    reason,
    status: "Issued",
    issuedDate: new Date(),
  }).returning();

  res.status(201).json({
    id: cn.id,
    creditNoteNumber: cn.creditNoteNumber,
    clientId: cn.clientId,
    clientName: null,
    invoiceId: cn.invoiceId ?? null,
    invoiceNumber: null,
    amount: Number(cn.amount),
    reason: cn.reason,
    status: cn.status,
    issuedDate: cn.issuedDate.toISOString(),
    createdAt: cn.createdAt.toISOString(),
  });
});

router.patch("/v1/credit-notes/:id/apply", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [cn] = await db.select().from(creditNotesTable)
    .where(and(eq(creditNotesTable.id, id), eq(creditNotesTable.companyId, req.companyId)));
  if (!cn) { res.status(404).json({ error: "Credit note not found" }); return; }
  if (cn.status !== "Issued") { res.status(400).json({ error: "Only Issued credit notes can be applied" }); return; }
  if (!cn.invoiceId) { res.status(400).json({ error: "Credit note has no linked invoice" }); return; }

  const [inv] = await db.select().from(invoicesTable)
    .where(and(eq(invoicesTable.id, cn.invoiceId), eq(invoicesTable.companyId, req.companyId)));
  if (!inv) { res.status(404).json({ error: "Linked invoice not found" }); return; }
  if (inv.status === "Paid") { res.status(400).json({ error: "Invoice is already fully paid" }); return; }

  await db.transaction(async (tx) => {
    await tx.insert(paymentsTable).values({
      companyId: req.companyId,
      invoiceId: cn.invoiceId!,
      amount: cn.amount,
      type: "credit_note",
      paymentMode: "Credit Note",
      referenceNo: cn.creditNoteNumber,
      paymentDate: new Date(),
      notes: `Applied credit note ${cn.creditNoteNumber}`,
    });

    const allPayments = await tx.select().from(paymentsTable)
      .where(and(eq(paymentsTable.invoiceId, cn.invoiceId!), eq(paymentsTable.companyId, req.companyId)));
    const totalPaid = allPayments.reduce((s, p) => s + Number(p.amount), 0);
    const grandTotal = Number(inv.grandTotal);
    const newInvStatus = totalPaid >= grandTotal ? "Paid" : totalPaid > 0 ? "Partially Paid" : inv.status;

    if (newInvStatus !== inv.status) {
      await tx.update(invoicesTable).set({ status: newInvStatus }).where(eq(invoicesTable.id, cn.invoiceId!));
    }

    await tx.update(creditNotesTable).set({ status: "Applied" }).where(eq(creditNotesTable.id, id));
  });

  const [updated] = await db
    .select({ cn: creditNotesTable, clientName: clientsTable.companyName, invoiceNumber: invoicesTable.invoiceNumber })
    .from(creditNotesTable)
    .leftJoin(clientsTable, eq(creditNotesTable.clientId, clientsTable.id))
    .leftJoin(invoicesTable, eq(creditNotesTable.invoiceId, invoicesTable.id))
    .where(eq(creditNotesTable.id, id));

  res.json({
    id: updated.cn.id, creditNoteNumber: updated.cn.creditNoteNumber,
    clientId: updated.cn.clientId, clientName: updated.clientName ?? null,
    invoiceId: updated.cn.invoiceId ?? null, invoiceNumber: updated.invoiceNumber ?? null,
    amount: Number(updated.cn.amount), reason: updated.cn.reason,
    status: updated.cn.status, issuedDate: updated.cn.issuedDate.toISOString(),
    createdAt: updated.cn.createdAt.toISOString(),
  });
});

router.patch("/v1/credit-notes/:id/void", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [cn] = await db.select().from(creditNotesTable)
    .where(and(eq(creditNotesTable.id, id), eq(creditNotesTable.companyId, req.companyId)));
  if (!cn) { res.status(404).json({ error: "Credit note not found" }); return; }
  if (cn.status === "Applied") { res.status(400).json({ error: "Applied credit notes cannot be voided" }); return; }

  await db.update(creditNotesTable).set({ status: "Void" }).where(eq(creditNotesTable.id, id));
  res.json({ id, status: "Void" });
});

router.delete("/v1/credit-notes/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [cn] = await db.select().from(creditNotesTable)
    .where(and(eq(creditNotesTable.id, id), eq(creditNotesTable.companyId, req.companyId)));
  if (!cn) { res.status(404).json({ error: "Credit note not found" }); return; }
  if (cn.status === "Applied") { res.status(400).json({ error: "Cannot delete applied credit notes" }); return; }

  await db.delete(creditNotesTable).where(eq(creditNotesTable.id, id));
  res.status(204).send();
});

export default router;
