import { Router } from "express";
import { eq, and, isNull } from "drizzle-orm";
import { db, bundlesTable, bundleItemsTable, productsTable } from "@workspace/db";

const router = Router();

async function getBundleWithItems(id: number, companyId: number) {
  const [bundle] = await db.select().from(bundlesTable).where(and(eq(bundlesTable.id, id), eq(bundlesTable.companyId, companyId)));
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

router.get("/v1/bundles", async (req, res): Promise<void> => {
  const bundles = await db.select().from(bundlesTable).where(eq(bundlesTable.companyId, req.companyId)).orderBy(bundlesTable.name);
  const results = await Promise.all(bundles.map((b) => getBundleWithItems(b.id, req.companyId)));
  res.json(results.filter(Boolean));
});

router.post("/v1/bundles", async (req, res): Promise<void> => {
  const { name, description, occasion, imageUrl, items } = req.body ?? {};
  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const [bundle] = await db.insert(bundlesTable).values({ companyId: req.companyId, name, description, occasion, imageUrl }).returning();

  if (Array.isArray(items) && items.length > 0) {
    await db.insert(bundleItemsTable).values(
      items.map((i: { productId: number; quantity: number }) => ({
        bundleId: bundle.id,
        productId: i.productId,
        quantity: i.quantity,
      }))
    );
  }

  const result = await getBundleWithItems(bundle.id, req.companyId);
  res.status(201).json(result);
});

router.get("/v1/bundles/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const result = await getBundleWithItems(id, req.companyId);
  if (!result) {
    res.status(404).json({ error: "Bundle not found" });
    return;
  }
  res.json(result);
});

router.patch("/v1/bundles/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { name, description, occasion, imageUrl, items } = req.body ?? {};

  const [existing] = await db.select({ id: bundlesTable.id }).from(bundlesTable)
    .where(and(eq(bundlesTable.id, id), eq(bundlesTable.companyId, req.companyId)));
  if (!existing) { res.status(404).json({ error: "Bundle not found" }); return; }

  const updates: Record<string, unknown> = {};
  if (name != null) updates.name = name;
  if (description != null) updates.description = description;
  if (occasion != null) updates.occasion = occasion;
  if (imageUrl != null) updates.imageUrl = imageUrl;

  if (Object.keys(updates).length > 0) {
    await db.update(bundlesTable).set(updates).where(and(eq(bundlesTable.id, id), eq(bundlesTable.companyId, req.companyId)));
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

  const result = await getBundleWithItems(id, req.companyId);
  if (!result) {
    res.status(404).json({ error: "Bundle not found" });
    return;
  }
  res.json(result);
});

router.delete("/v1/bundles/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [bundle] = await db.delete(bundlesTable).where(and(eq(bundlesTable.id, id), eq(bundlesTable.companyId, req.companyId))).returning();
  if (!bundle) {
    res.status(404).json({ error: "Bundle not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/v1/bundles/suggest", async (req, res): Promise<void> => {
  const { targetSellingPrice, budget, category } = req.body ?? {};

  const target = Number(targetSellingPrice ?? budget ?? 0);
  if (!target || target <= 0) {
    res.status(400).json({ error: "targetSellingPrice is required and must be > 0" });
    return;
  }

  const conditions = [eq(productsTable.companyId, req.companyId), isNull(productsTable.deletedAt)];
  if (category && typeof category === "string") {
    conditions.push(eq(productsTable.category, category));
  }

  const allProducts = await db.select().from(productsTable).where(and(...conditions));

  const candidates = allProducts
    .filter((p) => p.stockLevel > 0 && Number(p.sellingPrice) > 0 && Number(p.sellingPrice) <= target)
    .map((p) => {
      const sp = Number(p.sellingPrice);
      const cp = Number(p.costPrice);
      const marginPct = sp > 0 ? ((sp - cp) / sp) * 100 : 0;
      return { ...p, sellingPrice: sp, costPrice: cp, marginPct };
    })
    .sort((a, b) => {
      if (Math.abs(b.marginPct - a.marginPct) > 2) return b.marginPct - a.marginPct;
      return a.sellingPrice - b.sellingPrice;
    });

  const selected: Array<{ id: number; name: string; sellingPrice: number; costPrice: number; qty: number }> = [];
  let remaining = target;

  for (const product of candidates) {
    if (product.sellingPrice <= remaining + 0.01) {
      selected.push({ id: product.id, name: product.name, sellingPrice: product.sellingPrice, costPrice: product.costPrice, qty: 1 });
      remaining -= product.sellingPrice;
    }
    if (remaining < 1) break;
  }

  if (remaining > 0 && selected.length > 0) {
    const bestFit = candidates
      .filter((p) => p.sellingPrice <= remaining + 0.01 && !selected.find((s) => s.id === p.id))
      .sort((a, b) => b.sellingPrice - a.sellingPrice)[0];
    if (bestFit) {
      selected.push({ id: bestFit.id, name: bestFit.name, sellingPrice: bestFit.sellingPrice, costPrice: bestFit.costPrice, qty: 1 });
      remaining -= bestFit.sellingPrice;
    }
  }

  if (remaining > 1 && selected.length > 0) {
    const cheapest = [...selected].sort((a, b) => a.sellingPrice - b.sellingPrice)[0];
    const extraQty = Math.floor(remaining / cheapest.sellingPrice);
    if (extraQty >= 1) {
      const entry = selected.find((s) => s.id === cheapest.id)!;
      entry.qty += extraQty;
      remaining -= cheapest.sellingPrice * extraQty;
    }
  }

  const items = selected.map((p) => ({
    productId: p.id,
    productName: p.name,
    quantity: p.qty,
    unitPrice: p.sellingPrice,
  }));

  const totalPrice = selected.reduce((s, p) => s + p.sellingPrice * p.qty, 0);
  const totalCost = selected.reduce((s, p) => s + p.costPrice * p.qty, 0);
  const priceUtilization = target > 0 ? Math.min(100, (totalPrice / target) * 100) : 0;

  res.json({
    items,
    totalCost,
    totalPrice,
    margin: totalPrice > 0 ? ((totalPrice - totalCost) / totalPrice) * 100 : 0,
    priceUtilization,
    targetSellingPrice: target,
  });
});

export default router;
