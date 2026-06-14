import { Router } from "express";
import { eq, and } from "drizzle-orm";
import {
  db, grnTable, grnItemsTable, creditNotesTable, warehouseLocationsTable,
  purchaseOrdersTable, clientsTable, invoicesTable,
} from "@workspace/db";

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
  const grnNumber = `GRN-${Date.now()}`;
  const grn = await db.transaction(async (tx) => {
    const [g] = await tx.insert(grnTable).values({ companyId: req.companyId, grnNumber, purchaseOrderId, notes }).returning();
    if (items.length) {
      await tx.insert(grnItemsTable).values(items.map((i: { productId: number; quantityReceived: number; quantityRejected?: number; remarks?: string }) => ({
        grnId: g.id, productId: i.productId,
        quantityReceived: i.quantityReceived, quantityRejected: i.quantityRejected ?? 0, remarks: i.remarks,
      })));
    }
    return g;
  });
  res.status(201).json(grn);
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

router.post("/v1/credit-notes", async (req, res): Promise<void> => {
  const { invoiceId, clientId, amount, reason } = req.body ?? {};
  if (!clientId || amount == null || !reason) { res.status(400).json({ error: "clientId, amount, reason required" }); return; }
  const creditNoteNumber = `CN-${Date.now()}`;
  const [cn] = await db.insert(creditNotesTable).values({
    companyId: req.companyId, creditNoteNumber, invoiceId, clientId, amount: amount.toString(), reason,
  }).returning();
  res.status(201).json(cn);
});

router.delete("/v1/credit-notes/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.delete(creditNotesTable).where(and(eq(creditNotesTable.id, id), eq(creditNotesTable.companyId, req.companyId)));
  res.sendStatus(204);
});

// Warehouse Locations
router.get("/v1/locations", async (req, res): Promise<void> => {
  const rows = await db.select().from(warehouseLocationsTable).where(eq(warehouseLocationsTable.companyId, req.companyId)).orderBy(warehouseLocationsTable.code);
  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/v1/locations", async (req, res): Promise<void> => {
  const { name, code, zone, bin, type, capacity, notes } = req.body ?? {};
  if (!name || !code) { res.status(400).json({ error: "name and code required" }); return; }
  const [loc] = await db.insert(warehouseLocationsTable).values({
    companyId: req.companyId, name, code, zone, bin, type: type ?? "storage", capacity, notes,
  }).returning();
  res.status(201).json(loc);
});

router.patch("/v1/locations/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const updates: Record<string, unknown> = {};
  for (const f of ["name", "code", "zone", "bin", "type", "capacity", "notes"] as const) {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  }
  const [loc] = await db.update(warehouseLocationsTable).set(updates).where(and(eq(warehouseLocationsTable.id, id), eq(warehouseLocationsTable.companyId, req.companyId))).returning();
  if (!loc) { res.status(404).json({ error: "Not found" }); return; }
  res.json(loc);
});

router.delete("/v1/locations/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.delete(warehouseLocationsTable).where(and(eq(warehouseLocationsTable.id, id), eq(warehouseLocationsTable.companyId, req.companyId)));
  res.sendStatus(204);
});

export default router;
