import { Router } from "express";
import { eq, and } from "drizzle-orm";
import {
  db, grnTable, grnItemsTable, creditNotesTable, warehouseLocationsTable,
  purchaseOrdersTable, clientsTable, invoicesTable,
} from "@workspace/db";
import { postGRN } from "../services/grnService";
import { StatusError } from "../services/stateMachine";

const router = Router();

// GRN (Goods Receipt Note)
router.get("/v1/grn", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      id: grnTable.id, grnNumber: grnTable.grnNumber,
      purchaseOrderId: grnTable.purchaseOrderId,
      vendorId: purchaseOrdersTable.vendorId,
      receivedDate: grnTable.receivedDate, status: grnTable.status, notes: grnTable.notes,
      createdAt: grnTable.createdAt,
    })
    .from(grnTable)
    .leftJoin(purchaseOrdersTable, eq(grnTable.purchaseOrderId, purchaseOrdersTable.id))
    .where(eq(grnTable.companyId, req.companyId))
    .orderBy(grnTable.createdAt);
  res.json(rows.map((r) => ({
    ...r, receivedDate: r.receivedDate.toISOString(), createdAt: r.createdAt.toISOString(),
  })));
});

router.post("/v1/grn", async (req, res): Promise<void> => {
  const { purchaseOrderId, notes, items } = req.body ?? {};
  if (!purchaseOrderId || !Array.isArray(items)) {
    res.status(400).json({ error: "purchaseOrderId and items[] required" }); return;
  }

  try {
    const grn = await postGRN(req.companyId, purchaseOrderId, items, notes);
    res.status(201).json(grn);
  } catch (err) {
    if (err instanceof StatusError) {
      res.status(err.status).json({ error: err.message });
    } else {
      throw err;
    }
  }
});

router.get("/v1/grn/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [grn] = await db.select().from(grnTable).where(and(eq(grnTable.id, id), eq(grnTable.companyId, req.companyId)));
  if (!grn) { res.status(404).json({ error: "Not found" }); return; }
  const items = await db.select().from(grnItemsTable).where(eq(grnItemsTable.grnId, id));
  res.json({ ...grn, receivedDate: grn.receivedDate.toISOString(), createdAt: grn.createdAt.toISOString(), items });
});

// Credit Notes
router.get("/v1/credit-notes", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      id: creditNotesTable.id, creditNoteNumber: creditNotesTable.creditNoteNumber,
      invoiceId: creditNotesTable.invoiceId, invoiceNumber: invoicesTable.invoiceNumber,
      clientId: creditNotesTable.clientId, clientName: clientsTable.companyName,
      amount: creditNotesTable.amount, reason: creditNotesTable.reason,
      status: creditNotesTable.status, issuedDate: creditNotesTable.issuedDate,
      createdAt: creditNotesTable.createdAt,
    })
    .from(creditNotesTable)
    .leftJoin(invoicesTable, eq(creditNotesTable.invoiceId, invoicesTable.id))
    .leftJoin(clientsTable, eq(creditNotesTable.clientId, clientsTable.id))
    .where(eq(creditNotesTable.companyId, req.companyId))
    .orderBy(creditNotesTable.createdAt);
  res.json(rows.map((r) => ({
    ...r, amount: Number(r.amount),
    issuedDate: r.issuedDate.toISOString(), createdAt: r.createdAt.toISOString(),
  })));
});

export default router;
