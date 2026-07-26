import { Router } from "express";
import { eq, and, inArray, desc } from "drizzle-orm";
import { db, catalogueSharesTable, companiesTable, productsTable, sampleOrdersTable, sampleOrderItemsTable, opportunitiesTable, quotesTable, quoteItemsTable } from "@workspace/db";
import crypto from "crypto";

const router = Router();

router.post("/v1/catalogue-shares", async (req, res): Promise<void> => {
  const { opportunityTitle, clientName, catalogueType, productIds, productPrices, opportunityId, clientId } = req.body ?? {};
  if (!opportunityTitle || !catalogueType || !Array.isArray(productIds) || productIds.length === 0) {
    res.status(400).json({ error: "opportunityTitle, catalogueType and productIds are required" });
    return;
  }
  const [company] = await db.select({ name: companiesTable.name }).from(companiesTable).where(eq(companiesTable.id, req.companyId));
  if (!company) { res.status(400).json({ error: "Company not found" }); return; }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  try {
    await db.insert(catalogueSharesTable).values({
      token,
      companyId: req.companyId,
      companyName: company.name,
      opportunityId: opportunityId ? Number(opportunityId) : null,
      clientId: clientId ? Number(clientId) : null,
      opportunityTitle,
      clientName: clientName ?? null,
      catalogueType,
      productIds: JSON.stringify(productIds),
      productPrices: productPrices ? JSON.stringify(productPrices) : null,
      expiresAt,
    });
  } catch (err: unknown) {
    req.log.error({ err }, "Failed to insert catalogue share");
    res.status(500).json({ error: "Failed to create share link. The database may be missing required columns — please contact support." });
    return;
  }

  res.json({ token });
});

router.get("/v1/public/catalogue/:token", async (req, res): Promise<void> => {
  const { token } = req.params as { token: string };
  const [share] = await db.select().from(catalogueSharesTable).where(eq(catalogueSharesTable.token, token));
  if (!share) { res.status(404).json({ error: "Catalogue not found" }); return; }
  if (share.expiresAt && share.expiresAt < new Date()) { res.status(410).json({ error: "This catalogue link has expired" }); return; }

  const ids: number[] = JSON.parse(share.productIds);
  const storedPrices: Record<string, number> = share.productPrices ? JSON.parse(share.productPrices) : {};

  const products = ids.length > 0
    ? await db.select({
        id: productsTable.id,
        name: productsTable.name,
        category: productsTable.category,
        sellingPrice: productsTable.sellingPrice,
        imageUrl: productsTable.imageUrl,
      }).from(productsTable).where(
        and(inArray(productsTable.id, ids), eq(productsTable.companyId, share.companyId))
      )
    : [];

  // Preserve original ordering from productIds
  const productMap = new Map(products.map(p => [p.id, p]));
  const orderedProducts = ids.map(id => productMap.get(id)).filter(Boolean) as typeof products;

  res.json({
    token: share.token,
    companyName: share.companyName,
    opportunityId: share.opportunityId ?? null,
    clientId: share.clientId ?? null,
    opportunityTitle: share.opportunityTitle,
    clientName: share.clientName,
    catalogueType: share.catalogueType,
    expiresAt: share.expiresAt?.toISOString() ?? null,
    createdAt: share.createdAt.toISOString(),
    alreadySubmitted: !!share.selectedProductIds,
    products: orderedProducts.map(p => ({
      ...p,
      sellingPrice: storedPrices[String(p.id)] !== undefined ? storedPrices[String(p.id)] : Number(p.sellingPrice),
    })),
  });
});

// POST /v1/public/catalogue/:token/request-samples
// Public endpoint — customer submits shortlisted products.
// Saves selection on the catalogue share and advances the opportunity to "shortlisted".
// Does NOT create a sample order — sales team does that separately.
router.post("/v1/public/catalogue/:token/request-samples", async (req, res): Promise<void> => {
  const { token } = req.params as { token: string };
  const { productIds } = req.body ?? {};

  if (!Array.isArray(productIds) || productIds.length === 0) {
    res.status(400).json({ error: "productIds[] is required" });
    return;
  }

  const [share] = await db.select().from(catalogueSharesTable).where(eq(catalogueSharesTable.token, token));
  if (!share) { res.status(404).json({ error: "Catalogue not found" }); return; }
  if (share.expiresAt && share.expiresAt < new Date()) { res.status(410).json({ error: "This catalogue link has expired" }); return; }

  // Validate all product IDs belong to this company's catalogue share
  const validIds: number[] = JSON.parse(share.productIds);
  const selectedIds: number[] = (productIds as number[]).filter(id => validIds.includes(id));
  if (selectedIds.length === 0) {
    res.status(400).json({ error: "No valid products selected" });
    return;
  }

  // Save the customer's selection on the catalogue share
  await db.update(catalogueSharesTable)
    .set({ selectedProductIds: JSON.stringify(selectedIds) })
    .where(eq(catalogueSharesTable.token, token));

  // Advance opportunity to "shortlisted" stage if linked
  if (share.opportunityId) {
    await db.update(opportunitiesTable)
      .set({ stage: "shortlisted", updatedAt: new Date() })
      .where(and(
        eq(opportunitiesTable.id, share.opportunityId),
        eq(opportunitiesTable.companyId, share.companyId),
      ));
  }

  res.json({ success: true, shortlistedCount: selectedIds.length });
});

// GET /v1/opportunities/:id/shortlisted-products
// Returns the customer-selected products from the most recent catalogue share for this opportunity.
router.get("/v1/opportunities/:id/shortlisted-products", async (req, res): Promise<void> => {
  const oppId = Number(req.params.id);

  const shares = await db.select()
    .from(catalogueSharesTable)
    .where(and(
      eq(catalogueSharesTable.opportunityId, oppId),
      eq(catalogueSharesTable.companyId, req.companyId),
    ))
    .orderBy(desc(catalogueSharesTable.createdAt));

  // Find the most recent share that has a customer selection
  const share = shares.find(s => s.selectedProductIds) ?? null;

  if (!share || !share.selectedProductIds) {
    res.json({ products: [], shareToken: null, catalogueType: null });
    return;
  }

  const selectedIds: number[] = JSON.parse(share.selectedProductIds);
  const products = selectedIds.length > 0
    ? await db.select({
        id: productsTable.id,
        name: productsTable.name,
        category: productsTable.category,
        sellingPrice: productsTable.sellingPrice,
        imageUrl: productsTable.imageUrl,
      }).from(productsTable).where(
        and(inArray(productsTable.id, selectedIds), eq(productsTable.companyId, req.companyId))
      )
    : [];

  // Effective price = the calculated price stored on the share (what the customer saw), fallback sellingPrice
  let storedPrices: Record<string, number> = {};
  try { storedPrices = share.productPrices ? JSON.parse(share.productPrices) : {}; } catch { storedPrices = {}; }

  res.json({
    products: products.map(p => {
      const stored = Number(storedPrices[String(p.id)]);
      const selling = Number(p.sellingPrice);
      return { ...p, sellingPrice: selling, price: Number.isFinite(stored) && stored >= 0 ? stored : selling };
    }),
    shareToken: share.token,
    catalogueType: share.catalogueType,
  });
});

// POST /v1/opportunities/:id/convert-shortlist-to-quote
// Atomically create a quote from the customer's shortlisted products — priced with the
// stored share prices the customer actually saw — and advance the opportunity to
// quotation_sent. Retry-safe: once the stage has moved past samples, returns 409.
router.post("/v1/opportunities/:id/convert-shortlist-to-quote", async (req, res): Promise<void> => {
  const oppId = Number(req.params.id);
  if (!Number.isInteger(oppId)) { res.status(400).json({ error: "Invalid id" }); return; }

  try {
    const result = await db.transaction(async (tx) => {
      const oppRows = await tx.select().from(opportunitiesTable)
        .where(and(eq(opportunitiesTable.id, oppId), eq(opportunitiesTable.companyId, req.companyId)))
        .for("update");
      const opp = oppRows[0];
      if (!opp) throw Object.assign(new Error("Opportunity not found"), { httpStatus: 404 });
      if (opp.stage !== "shortlisted" && opp.stage !== "samples") {
        throw Object.assign(new Error("Shortlist was already converted — the opportunity has moved past the Samples stage"), { httpStatus: 409 });
      }
      if (!opp.clientId) throw Object.assign(new Error("No client linked — set a client on the opportunity first (Edit → Client)"), { httpStatus: 400 });

      const shares = await tx.select().from(catalogueSharesTable)
        .where(and(eq(catalogueSharesTable.opportunityId, oppId), eq(catalogueSharesTable.companyId, req.companyId)))
        .orderBy(desc(catalogueSharesTable.createdAt));
      const share = shares.find(s => s.selectedProductIds) ?? null;
      if (!share || !share.selectedProductIds) {
        throw Object.assign(new Error("No shortlisted products found for this opportunity"), { httpStatus: 400 });
      }

      const selectedIds: number[] = JSON.parse(share.selectedProductIds);
      let storedPrices: Record<string, number> = {};
      try { storedPrices = share.productPrices ? JSON.parse(share.productPrices) : {}; } catch { storedPrices = {}; }

      const products = selectedIds.length > 0
        ? await tx.select().from(productsTable)
            .where(and(inArray(productsTable.id, selectedIds), eq(productsTable.companyId, req.companyId)))
        : [];
      if (products.length === 0) {
        throw Object.assign(new Error("Shortlisted products no longer exist in the catalogue"), { httpStatus: 400 });
      }

      const quoteLines = products.map(p => {
        const stored = Number(storedPrices[String(p.id)]);
        const selling = Number(p.sellingPrice);
        const unitPrice = Number.isFinite(stored) && stored >= 0 ? stored : (Number.isFinite(selling) ? selling : 0);
        return { productId: p.id, description: p.name, quantity: 1, unitPrice, imageUrl: p.imageUrl ?? null };
      });

      const subtotal = quoteLines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
      const gst = subtotal * 0.18;
      const total = subtotal + gst;

      const [q] = await tx.insert(quotesTable).values({
        companyId: req.companyId,
        quoteNumber: `QT-${Date.now()}`,
        subject: opp.title,
        clientId: opp.clientId,
        opportunityId: opp.id,
        subtotal: subtotal.toFixed(2), discountPct: "0.00",
        gstAmount: gst.toFixed(2), totalAmount: total.toFixed(2),
        notes: `Created from customer shortlist (${share.catalogueType} catalogue)`,
      }).returning();

      await tx.insert(quoteItemsTable).values(quoteLines.map(l => ({
        quoteId: q.id, productId: l.productId, description: l.description,
        quantity: l.quantity, unitPrice: l.unitPrice.toString(),
        lineTotal: (l.quantity * l.unitPrice).toString(), imageUrl: l.imageUrl,
      })));

      await tx.update(opportunitiesTable).set({ stage: "quotation_sent", updatedAt: new Date() })
        .where(eq(opportunitiesTable.id, opp.id));

      return { quoteId: q.id, quoteNumber: q.quoteNumber, opportunityStage: "quotation_sent" as string | null };
    });

    res.status(201).json(result);
  } catch (err) {
    const httpStatus = (err as { httpStatus?: number }).httpStatus;
    if (httpStatus) { res.status(httpStatus).json({ error: (err as Error).message }); return; }
    console.error("convert-shortlist-to-quote failed:", err);
    res.status(500).json({ error: "Failed to convert shortlist to quote" });
  }
});

// POST /v1/opportunities/:id/create-sample-from-shortlist
// Creates a sample order from the customer-shortlisted products and advances the opportunity to "samples".
router.post("/v1/opportunities/:id/create-sample-from-shortlist", async (req, res): Promise<void> => {
  const oppId = Number(req.params.id);

  const shares = await db.select()
    .from(catalogueSharesTable)
    .where(and(
      eq(catalogueSharesTable.opportunityId, oppId),
      eq(catalogueSharesTable.companyId, req.companyId),
    ))
    .orderBy(desc(catalogueSharesTable.createdAt));

  const share = shares.find(s => s.selectedProductIds) ?? null;
  if (!share || !share.selectedProductIds) {
    res.status(400).json({ error: "No shortlisted products found for this opportunity" });
    return;
  }

  const selectedIds: number[] = JSON.parse(share.selectedProductIds);
  if (selectedIds.length === 0) {
    res.status(400).json({ error: "No products in shortlist" });
    return;
  }

  const [opp] = await db.select().from(opportunitiesTable)
    .where(and(eq(opportunitiesTable.id, oppId), eq(opportunitiesTable.companyId, req.companyId)));
  if (!opp) { res.status(404).json({ error: "Opportunity not found" }); return; }

  const [order] = await db.insert(sampleOrdersTable).values({
    companyId: req.companyId,
    sampleNumber: "",
    clientId: share.clientId ?? null,
    opportunityId: oppId,
    customerName: share.clientName ?? opp.title,
    status: "Requested",
    notes: `Created from customer shortlist — ${share.catalogueType}`,
  }).returning({ id: sampleOrdersTable.id });

  const sampleNumber = `SMPL-${String(order.id).padStart(5, "0")}`;
  await db.update(sampleOrdersTable)
    .set({ sampleNumber })
    .where(eq(sampleOrdersTable.id, order.id));

  await db.insert(sampleOrderItemsTable).values(
    selectedIds.map(pid => ({ sampleOrderId: order.id, productId: pid, quantity: 1 }))
  );

  // Advance opportunity to "samples"
  await db.update(opportunitiesTable)
    .set({ stage: "samples", updatedAt: new Date() })
    .where(and(eq(opportunitiesTable.id, oppId), eq(opportunitiesTable.companyId, req.companyId)));

  res.json({ success: true, sampleOrderId: order.id, sampleNumber });
});

export default router;
