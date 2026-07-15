import { Router } from "express";
import { eq, ilike, and, lte, isNull, SQL } from "drizzle-orm";
import { db, productsTable, vendorsTable } from "@workspace/db";

const router = Router();

function serializeProduct(p: typeof productsTable.$inferSelect, vendorName?: string | null) {
  return {
    id: p.id,
    name: p.name,
    sku: p.sku ?? null,
    brand: p.brand ?? null,
    productType: p.productType ?? null,
    category: p.category,
    hsnCode: p.hsnCode ?? null,
    gstRate: Number(p.gstRate),
    uom: p.uom,
    costPrice: Number(p.costPrice),
    sellingPrice: Number(p.sellingPrice),
    stockLevel: p.stockLevel,
    reservedQty: p.reservedQty,
    availableQty: p.stockLevel - p.reservedQty,
    lowStockThreshold: p.lowStockThreshold,
    reorderQty: p.reorderQty,
    isPerishable: p.isPerishable,
    shelfLifeDays: p.shelfLifeDays ?? null,
    brandable: p.brandable,
    isPackaging: p.isPackaging,
    barcode: p.barcode ?? null,
    vendorId: p.vendorId ?? null,
    vendorName: vendorName ?? null,
    imageUrl: p.imageUrl ?? null,
    createdAt: p.createdAt.toISOString(),
  };
}

router.get("/v1/products", async (req, res): Promise<void> => {
  const { search, category, lowStock } = req.query as { search?: string; category?: string; lowStock?: string };
  const conditions: SQL[] = [
    eq(productsTable.companyId, req.companyId),
    isNull(productsTable.deletedAt),
  ];
  if (search) conditions.push(ilike(productsTable.name, `%${search}%`));
  if (category) conditions.push(eq(productsTable.category, category));
  if (lowStock === "true") conditions.push(lte(productsTable.stockLevel, productsTable.lowStockThreshold));

  const rows = await db
    .select({ product: productsTable, vendorName: vendorsTable.name })
    .from(productsTable)
    .leftJoin(vendorsTable, eq(productsTable.vendorId, vendorsTable.id))
    .where(and(...conditions))
    .orderBy(productsTable.name);

  res.json(rows.map((r) => serializeProduct(r.product, r.vendorName)));
});

router.post("/v1/products", async (req, res): Promise<void> => {
  const {
    name, sku, category, costPrice, sellingPrice,
    stockLevel, lowStockThreshold, reorderQty,
    vendorId, imageUrl, brand, productType,
    hsnCode, gstRate, uom, isPerishable, shelfLifeDays, brandable,
    isPackaging, barcode,
  } = req.body ?? {};

  if (!name || !category || costPrice == null || sellingPrice == null) {
    res.status(400).json({ error: "name, category, costPrice, and sellingPrice are required" });
    return;
  }

  const [product] = await db
    .insert(productsTable)
    .values({
      companyId: req.companyId,
      name,
      sku: sku ?? null,
      brand: brand ?? null,
      productType: productType ?? null,
      category,
      hsnCode: hsnCode ?? null,
      gstRate: String(gstRate ?? 18),
      uom: uom ?? "PCS",
      costPrice: String(costPrice),
      sellingPrice: String(sellingPrice),
      stockLevel: stockLevel ?? 0,
      lowStockThreshold: lowStockThreshold ?? 10,
      reorderQty: reorderQty ?? 0,
      isPerishable: isPerishable ?? false,
      shelfLifeDays: shelfLifeDays ?? null,
      brandable: brandable ?? false,
      isPackaging: isPackaging ?? false,
      barcode: barcode ?? null,
      vendorId: vendorId ?? null,
      imageUrl: imageUrl ?? null,
    })
    .returning();

  const vendorName = vendorId
    ? (await db.select().from(vendorsTable).where(and(eq(vendorsTable.id, vendorId), eq(vendorsTable.companyId, req.companyId))))[0]?.name
    : null;

  res.status(201).json(serializeProduct(product, vendorName));
});

router.post("/v1/products/import", async (req, res): Promise<void> => {
  const { rows } = req.body ?? {};
  if (!Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({ error: "rows must be a non-empty array" });
    return;
  }

  let imported = 0;
  let updated = 0;
  const errors: { row: number; message: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as Record<string, unknown>;
    try {
      const { name, sku, brand, productType, category, hsnCode, gstRate, uom, costPrice, sellingPrice, stockLevel, lowStockThreshold, reorderQty, brandable, barcode } = row;

      if (!name || !category || costPrice == null || sellingPrice == null) {
        errors.push({ row: i + 1, message: "name, category, costPrice, sellingPrice are required" });
        continue;
      }

      if (sku) {
        const existing = await db
          .select()
          .from(productsTable)
          .where(and(eq(productsTable.companyId, req.companyId), eq(productsTable.sku, String(sku)), isNull(productsTable.deletedAt)))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(productsTable)
            .set({
              name: String(name),
              brand: brand ? String(brand) : null,
              productType: productType ? String(productType) : null,
              category: String(category),
              hsnCode: hsnCode ? String(hsnCode) : null,
              gstRate: String(gstRate ?? 18),
              uom: uom ? String(uom) : "PCS",
              costPrice: String(costPrice),
              sellingPrice: String(sellingPrice),
              stockLevel: Number(stockLevel ?? 0),
              lowStockThreshold: Number(lowStockThreshold ?? 10),
              reorderQty: Number(reorderQty ?? 0),
              brandable: String(brandable).toLowerCase() === "true",
              barcode: barcode ? String(barcode) : null,
              updatedAt: new Date(),
            })
            .where(eq(productsTable.id, existing[0].id));
          updated++;
          continue;
        }
      }

      await db.insert(productsTable).values({
        companyId: req.companyId,
        name: String(name),
        sku: sku ? String(sku) : null,
        brand: brand ? String(brand) : null,
        productType: productType ? String(productType) : null,
        category: String(category),
        hsnCode: hsnCode ? String(hsnCode) : null,
        gstRate: String(gstRate ?? 18),
        uom: uom ? String(uom) : "PCS",
        costPrice: String(costPrice),
        sellingPrice: String(sellingPrice),
        stockLevel: Number(stockLevel ?? 0),
        lowStockThreshold: Number(lowStockThreshold ?? 10),
        reorderQty: Number(reorderQty ?? 0),
        brandable: String(brandable).toLowerCase() === "true",
        barcode: barcode ? String(barcode) : null,
      });
      imported++;
    } catch (err) {
      errors.push({ row: i + 1, message: err instanceof Error ? err.message : String(err) });
    }
  }

  res.json({ imported, updated, errors });
});

router.get("/v1/products/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [row] = await db
    .select({ product: productsTable, vendorName: vendorsTable.name })
    .from(productsTable)
    .leftJoin(vendorsTable, eq(productsTable.vendorId, vendorsTable.id))
    .where(and(eq(productsTable.id, id), eq(productsTable.companyId, req.companyId), isNull(productsTable.deletedAt)));

  if (!row) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(serializeProduct(row.product, row.vendorName));
});

router.patch("/v1/products/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const updates: Record<string, unknown> = {};
  const fields: string[] = [
    "name", "sku", "brand", "productType", "category",
    "hsnCode", "uom", "vendorId", "imageUrl",
    "isPerishable", "brandable", "isPackaging", "barcode",
  ];
  for (const f of fields) {
    if ((req.body as Record<string, unknown>)[f] != null) updates[f] = (req.body as Record<string, unknown>)[f];
  }
  if (req.body.gstRate != null) updates.gstRate = String(req.body.gstRate);
  if (req.body.costPrice != null) updates.costPrice = String(req.body.costPrice);
  if (req.body.sellingPrice != null) updates.sellingPrice = String(req.body.sellingPrice);
  if (req.body.stockLevel != null) updates.stockLevel = req.body.stockLevel;
  if (req.body.lowStockThreshold != null) updates.lowStockThreshold = req.body.lowStockThreshold;
  if (req.body.reorderQty != null) updates.reorderQty = req.body.reorderQty;
  if (req.body.shelfLifeDays != null) updates.shelfLifeDays = req.body.shelfLifeDays;

  const [product] = await db
    .update(productsTable)
    .set(updates)
    .where(and(eq(productsTable.id, id), eq(productsTable.companyId, req.companyId), isNull(productsTable.deletedAt)))
    .returning();

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const vendorName = product.vendorId
    ? (await db.select().from(vendorsTable).where(eq(vendorsTable.id, product.vendorId)))[0]?.name
    : null;

  res.json(serializeProduct(product, vendorName));
});

router.delete("/v1/products/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [product] = await db
    .update(productsTable)
    .set({ deletedAt: new Date() })
    .where(and(eq(productsTable.id, id), eq(productsTable.companyId, req.companyId), isNull(productsTable.deletedAt)))
    .returning();
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
