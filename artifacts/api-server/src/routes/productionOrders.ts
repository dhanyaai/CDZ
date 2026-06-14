import { Router } from "express";
import { and, eq, SQL } from "drizzle-orm";
import { db, productionOrdersTable, productionMaterialsTable, productsTable, inventoryMovementsTable } from "@workspace/db";

const router = Router();

function padId(id: number) { return `PROD-${String(id).padStart(5, "0")}`; }

async function getDetail(id: number, companyId: number) {
  const [row] = await db.select({ order: productionOrdersTable, product: productsTable })
    .from(productionOrdersTable)
    .leftJoin(productsTable, eq(productionOrdersTable.productId, productsTable.id))
    .where(and(eq(productionOrdersTable.id, id), eq(productionOrdersTable.companyId, companyId)));
  if (!row) return null;

  const materials = await db.select({ mat: productionMaterialsTable, product: productsTable })
    .from(productionMaterialsTable)
    .leftJoin(productsTable, eq(productionMaterialsTable.productId, productsTable.id))
    .where(eq(productionMaterialsTable.productionOrderId, id));

  return {
    id: row.order.id,
    orderNumber: row.order.orderNumber,
    productId: row.order.productId,
    productName: row.product?.name ?? "Unknown",
    quantity: row.order.quantity,
    producedQty: row.order.producedQty,
    status: row.order.status,
    plannedDate: row.order.plannedDate ?? null,
    completedDate: row.order.completedDate ?? null,
    notes: row.order.notes ?? null,
    createdAt: row.order.createdAt.toISOString(),
    materials: materials.map((m) => ({
      id: m.mat.id,
      productId: m.mat.productId,
      productName: m.product?.name ?? "Unknown",
      requiredQty: m.mat.requiredQty,
      issuedQty: m.mat.issuedQty,
      notes: m.mat.notes ?? null,
    })),
  };
}

// GET /v1/production-orders
router.get("/v1/production-orders", async (req, res): Promise<void> => {
  const { status } = req.query as { status?: string };
  const conditions: SQL[] = [eq(productionOrdersTable.companyId, req.companyId)];
  if (status) conditions.push(eq(productionOrdersTable.status, status));

  const rows = await db.select({ order: productionOrdersTable, product: productsTable })
    .from(productionOrdersTable)
    .leftJoin(productsTable, eq(productionOrdersTable.productId, productsTable.id))
    .where(and(...conditions))
    .orderBy(productionOrdersTable.createdAt);

  res.json(rows.map((r) => ({
    id: r.order.id,
    orderNumber: r.order.orderNumber,
    productId: r.order.productId,
    productName: r.product?.name ?? "Unknown",
    quantity: r.order.quantity,
    producedQty: r.order.producedQty,
    status: r.order.status,
    plannedDate: r.order.plannedDate ?? null,
    createdAt: r.order.createdAt.toISOString(),
  })));
});

// POST /v1/production-orders
router.post("/v1/production-orders", async (req, res): Promise<void> => {
  const { productId, quantity, plannedDate, notes, materials } = req.body ?? {};
  if (!productId || !quantity || quantity <= 0) {
    res.status(400).json({ error: "productId and positive quantity are required" }); return;
  }
  const [product] = await db.select().from(productsTable)
    .where(and(eq(productsTable.id, productId), eq(productsTable.companyId, req.companyId)));
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }

  const [order] = await db.insert(productionOrdersTable).values({
    companyId: req.companyId,
    orderNumber: "PROD-TEMP",
    productId,
    quantity,
    plannedDate: plannedDate ?? null,
    notes: notes ?? null,
    status: "Draft",
  }).returning();

  await db.update(productionOrdersTable).set({ orderNumber: padId(order.id) }).where(eq(productionOrdersTable.id, order.id));

  if (Array.isArray(materials) && materials.length > 0) {
    await db.insert(productionMaterialsTable).values(
      materials.map((m: { productId: number; requiredQty: number; notes?: string }) => ({
        productionOrderId: order.id,
        productId: m.productId,
        requiredQty: m.requiredQty,
        notes: m.notes ?? null,
      }))
    );
  }
  const detail = await getDetail(order.id, req.companyId);
  res.status(201).json(detail);
});

// GET /v1/production-orders/:id
router.get("/v1/production-orders/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const detail = await getDetail(id, req.companyId);
  if (!detail) { res.status(404).json({ error: "Production order not found" }); return; }
  res.json(detail);
});

// PATCH /v1/production-orders/:id/status
router.patch("/v1/production-orders/:id/status", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { status } = req.body ?? {};
  const allowed = ["Draft", "In Progress", "Completed", "Cancelled"];
  if (!status || !allowed.includes(status)) {
    res.status(400).json({ error: `status must be one of: ${allowed.join(", ")}` }); return;
  }
  const [updated] = await db.update(productionOrdersTable)
    .set({ status, ...(status === "Completed" ? { completedDate: new Date().toISOString().split("T")[0] } : {}) })
    .where(and(eq(productionOrdersTable.id, id), eq(productionOrdersTable.companyId, req.companyId)))
    .returning();
  if (!updated) { res.status(404).json({ error: "Order not found" }); return; }
  res.json(await getDetail(id, req.companyId));
});

// POST /v1/production-orders/:id/produce  — record production output + deduct materials
router.post("/v1/production-orders/:id/produce", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { qty } = req.body ?? {};
  if (!qty || qty <= 0) { res.status(400).json({ error: "qty must be positive" }); return; }

  const [order] = await db.select().from(productionOrdersTable)
    .where(and(eq(productionOrdersTable.id, id), eq(productionOrdersTable.companyId, req.companyId)));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  if (!["Draft", "In Progress"].includes(order.status)) {
    res.status(400).json({ error: "Can only produce from Draft or In Progress orders" }); return;
  }

  const newProduced = order.producedQty + qty;
  const newStatus = newProduced >= order.quantity ? "Completed" : "In Progress";

  await db.transaction(async (tx) => {
    // Update order
    await tx.update(productionOrdersTable).set({
      producedQty: newProduced,
      status: newStatus,
      ...(newStatus === "Completed" ? { completedDate: new Date().toISOString().split("T")[0] } : {}),
    }).where(eq(productionOrdersTable.id, id));

    // Credit the produced product to inventory
    await tx.insert(inventoryMovementsTable).values({
      companyId: req.companyId,
      productId: order.productId,
      type: "inward",
      quantity: qty,
      reference: `PROD-${order.orderNumber}`,
      batch: `PROD-${id}`,
    });

    // Update product stockLevel
    const [prod] = await tx.select().from(productsTable).where(eq(productsTable.id, order.productId));
    if (prod) {
      await tx.update(productsTable).set({ stockLevel: prod.stockLevel + qty }).where(eq(productsTable.id, order.productId));
    }

    // Deduct materials proportionally
    const materials = await tx.select({ mat: productionMaterialsTable, product: productsTable })
      .from(productionMaterialsTable)
      .leftJoin(productsTable, eq(productionMaterialsTable.productId, productsTable.id))
      .where(eq(productionMaterialsTable.productionOrderId, id));

    for (const { mat, product: matProd } of materials) {
      const qtyPerUnit = mat.requiredQty / order.quantity;
      const consumeNow = Math.round(qtyPerUnit * qty);
      if (consumeNow > 0) {
        await tx.update(productionMaterialsTable)
          .set({ issuedQty: mat.issuedQty + consumeNow })
          .where(eq(productionMaterialsTable.id, mat.id));
        await tx.insert(inventoryMovementsTable).values({
          companyId: req.companyId,
          productId: mat.productId,
          type: "outward",
          quantity: consumeNow,
          reference: `PROD-${order.orderNumber}`,
          batch: `PROD-${id}`,
        });
        if (matProd) {
          await tx.update(productsTable)
            .set({ stockLevel: Math.max(0, matProd.stockLevel - consumeNow) })
            .where(eq(productsTable.id, mat.productId));
        }
      }
    }
  });

  res.json(await getDetail(id, req.companyId));
});

// DELETE /v1/production-orders/:id
router.delete("/v1/production-orders/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.delete(productionOrdersTable)
    .where(and(eq(productionOrdersTable.id, id), eq(productionOrdersTable.companyId, req.companyId)));
  res.sendStatus(204);
});

export default router;
