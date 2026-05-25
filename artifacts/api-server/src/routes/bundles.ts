import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, bundlesTable, bundleItemsTable, productsTable } from "@workspace/db";

const router = Router();

async function getBundleWithItems(id: number) {
  const [bundle] = await db.select().from(bundlesTable).where(eq(bundlesTable.id, id));
  if (!bundle) return null;

  const items = await db
    .select({ item: bundleItemsTable, product: productsTable })
    .from(bundleItemsTable)
    .leftJoin(productsTable, eq(bundleItemsTable.productId, productsTable.id))
    .where(eq(bundleItemsTable.bundleId, id));

  const bundleItems = items.map((r) => ({
    productId: r.item.productId,
    productName: r.product?.name ?? "Unknown",
    quantity: r.item.quantity,
    unitPrice: Number(r.product?.sellingPrice ?? 0),
  }));

  const totalPrice = bundleItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  return {
    id: bundle.id,
    name: bundle.name,
    description: bundle.description ?? null,
    occasion: bundle.occasion ?? null,
    totalPrice,
    imageUrl: bundle.imageUrl ?? null,
    items: bundleItems,
    createdAt: bundle.createdAt.toISOString(),
  };
}

router.get("/v1/bundles", async (_req, res): Promise<void> => {
  const bundles = await db.select().from(bundlesTable).orderBy(bundlesTable.name);
  const results = await Promise.all(bundles.map((b) => getBundleWithItems(b.id)));
  res.json(results.filter(Boolean));
});

router.post("/v1/bundles", async (req, res): Promise<void> => {
  const { name, description, occasion, imageUrl, items } = req.body ?? {};
  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const [bundle] = await db.insert(bundlesTable).values({ name, description, occasion, imageUrl }).returning();

  if (Array.isArray(items) && items.length > 0) {
    await db.insert(bundleItemsTable).values(
      items.map((i: { productId: number; quantity: number }) => ({
        bundleId: bundle.id,
        productId: i.productId,
        quantity: i.quantity,
      }))
    );
  }

  const result = await getBundleWithItems(bundle.id);
  res.status(201).json(result);
});

router.get("/v1/bundles/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const result = await getBundleWithItems(id);
  if (!result) {
    res.status(404).json({ error: "Bundle not found" });
    return;
  }
  res.json(result);
});

router.patch("/v1/bundles/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { name, description, occasion, imageUrl, items } = req.body ?? {};

  const updates: Record<string, unknown> = {};
  if (name != null) updates.name = name;
  if (description != null) updates.description = description;
  if (occasion != null) updates.occasion = occasion;
  if (imageUrl != null) updates.imageUrl = imageUrl;

  if (Object.keys(updates).length > 0) {
    await db.update(bundlesTable).set(updates).where(eq(bundlesTable.id, id));
  }

  if (Array.isArray(items)) {
    await db.delete(bundleItemsTable).where(eq(bundleItemsTable.bundleId, id));
    if (items.length > 0) {
      await db.insert(bundleItemsTable).values(
        items.map((i: { productId: number; quantity: number }) => ({
          bundleId: id,
          productId: i.productId,
          quantity: i.quantity,
        }))
      );
    }
  }

  const result = await getBundleWithItems(id);
  if (!result) {
    res.status(404).json({ error: "Bundle not found" });
    return;
  }
  res.json(result);
});

router.delete("/v1/bundles/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [bundle] = await db.delete(bundlesTable).where(eq(bundlesTable.id, id)).returning();
  if (!bundle) {
    res.status(404).json({ error: "Bundle not found" });
    return;
  }
  res.sendStatus(204);
});

// Smart bundle suggester
router.post("/v1/bundles/suggest", async (req, res): Promise<void> => {
  const { budget, occasion } = req.body ?? {};
  if (!budget || !occasion) {
    res.status(400).json({ error: "budget and occasion are required" });
    return;
  }

  // Get all products and optimize for margin within budget
  const products = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.stockLevel, productsTable.stockLevel)); // all products with stock

  // Sort by margin (sellingPrice - costPrice) descending
  const sorted = products
    .filter((p) => p.stockLevel > 0)
    .map((p) => ({
      ...p,
      margin: Number(p.sellingPrice) - Number(p.costPrice),
      sellingPrice: Number(p.sellingPrice),
      costPrice: Number(p.costPrice),
    }))
    .sort((a, b) => b.margin - a.margin);

  const selected: typeof sorted = [];
  let remaining = Number(budget);

  for (const product of sorted) {
    if (product.sellingPrice <= remaining) {
      selected.push(product);
      remaining -= product.sellingPrice;
    }
    if (remaining <= 0) break;
  }

  const items = selected.map((p) => ({
    productId: p.id,
    productName: p.name,
    quantity: 1,
    unitPrice: p.sellingPrice,
  }));

  const totalPrice = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const totalCost = selected.reduce((s, p) => s + p.costPrice, 0);

  res.json({
    items,
    totalCost,
    totalPrice,
    margin: totalPrice > 0 ? ((totalPrice - totalCost) / totalPrice) * 100 : 0,
  });
});

export default router;
