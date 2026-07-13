import { Router } from "express";
import { and, eq, sql } from "drizzle-orm";
import { db, orderProcessingFormsTable, salesOrdersTable, clientsTable } from "@workspace/db";

const router = Router();

// GET /v1/order-processing/list — all SOs with processing form status
router.get("/v1/order-processing/list", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      id: salesOrdersTable.id,
      orderNumber: salesOrdersTable.orderNumber,
      clientName: clientsTable.companyName,
      status: salesOrdersTable.status,
      deliveryDate: salesOrdersTable.deliveryDate,
      grandTotal: salesOrdersTable.grandTotal,
      hasProcessingForm: sql<boolean>`(${orderProcessingFormsTable.id} IS NOT NULL)`,
    })
    .from(salesOrdersTable)
    .leftJoin(clientsTable, eq(salesOrdersTable.clientId, clientsTable.id))
    .leftJoin(
      orderProcessingFormsTable,
      and(
        eq(orderProcessingFormsTable.salesOrderId, salesOrdersTable.id),
        eq(orderProcessingFormsTable.companyId, req.companyId),
      ),
    )
    .where(eq(salesOrdersTable.companyId, req.companyId))
    .orderBy(salesOrdersTable.createdAt);

  res.json(rows.map((r) => ({
    id: r.id,
    orderNumber: r.orderNumber,
    clientName: r.clientName ?? null,
    status: r.status,
    deliveryDate: r.deliveryDate ? r.deliveryDate.toISOString() : null,
    grandTotal: r.grandTotal,
    hasProcessingForm: Boolean(r.hasProcessingForm),
  })));
});

// GET /v1/order-processing?salesOrderId=X
router.get("/v1/order-processing", async (req, res): Promise<void> => {
  const salesOrderId = Number(req.query.salesOrderId);
  if (!salesOrderId) {
    res.status(400).json({ error: "salesOrderId is required" });
    return;
  }

  const [row] = await db
    .select({
      form: orderProcessingFormsTable,
      orderNumber: salesOrdersTable.orderNumber,
      clientName: clientsTable.companyName,
      deliveryDate: salesOrdersTable.deliveryDate,
      totalAmount: salesOrdersTable.grandTotal,
    })
    .from(orderProcessingFormsTable)
    .leftJoin(salesOrdersTable, eq(orderProcessingFormsTable.salesOrderId, salesOrdersTable.id))
    .leftJoin(clientsTable, eq(salesOrdersTable.clientId, clientsTable.id))
    .where(
      and(
        eq(orderProcessingFormsTable.salesOrderId, salesOrderId),
        eq(orderProcessingFormsTable.companyId, req.companyId),
      ),
    );

  if (!row) {
    res.json(null);
    return;
  }

  res.json({
    id: row.form.id,
    salesOrderId: row.form.salesOrderId,
    orderNumber: row.orderNumber,
    clientName: row.clientName,
    deliveryDate: row.deliveryDate,
    totalAmount: row.totalAmount,
    formData: row.form.formData ?? {},
    createdAt: row.form.createdAt,
    updatedAt: row.form.updatedAt,
  });
});

// POST /v1/order-processing
router.post("/v1/order-processing", async (req, res): Promise<void> => {
  const { salesOrderId, formData } = req.body as { salesOrderId: number; formData: Record<string, unknown> };

  if (!salesOrderId) {
    res.status(400).json({ error: "salesOrderId is required" });
    return;
  }

  const [existing] = await db
    .select({ id: orderProcessingFormsTable.id })
    .from(orderProcessingFormsTable)
    .where(
      and(
        eq(orderProcessingFormsTable.salesOrderId, salesOrderId),
        eq(orderProcessingFormsTable.companyId, req.companyId),
      ),
    );

  if (existing) {
    const [updated] = await db
      .update(orderProcessingFormsTable)
      .set({ formData: formData ?? {}, updatedAt: new Date() })
      .where(eq(orderProcessingFormsTable.id, existing.id))
      .returning();
    res.json({ id: updated.id, salesOrderId: updated.salesOrderId, formData: updated.formData, updatedAt: updated.updatedAt });
    return;
  }

  const [created] = await db
    .insert(orderProcessingFormsTable)
    .values({ salesOrderId, companyId: req.companyId, formData: formData ?? {} })
    .returning();

  res.status(201).json({ id: created.id, salesOrderId: created.salesOrderId, formData: created.formData, createdAt: created.createdAt });
});

// PATCH /v1/order-processing/:id
router.patch("/v1/order-processing/:id", async (req, res): Promise<void> => {
  const { formData } = req.body as { formData: Record<string, unknown> };

  const [updated] = await db
    .update(orderProcessingFormsTable)
    .set({ formData, updatedAt: new Date() })
    .where(
      and(
        eq(orderProcessingFormsTable.id, Number(req.params.id)),
        eq(orderProcessingFormsTable.companyId, req.companyId),
      ),
    )
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Form not found" });
    return;
  }

  res.json({ id: updated.id, salesOrderId: updated.salesOrderId, formData: updated.formData, updatedAt: updated.updatedAt });
});

export default router;
