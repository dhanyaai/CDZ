import { Router } from "express";
import { eq, and, gte, lte, sql, desc, isNull, isNotNull } from "drizzle-orm";
import { db, invoicesTable, invoiceLinesTable, clientsTable } from "@workspace/db";

const router = Router();

router.get("/v1/reports/gstr1", async (req, res): Promise<void> => {
  const { from, to } = req.query as Record<string, string | undefined>;

  const now = new Date();
  const fyStart = now.getMonth() >= 3
    ? new Date(now.getFullYear(), 3, 1)
    : new Date(now.getFullYear() - 1, 3, 1);
  const fyEnd = new Date(fyStart.getFullYear() + 1, 2, 31, 23, 59, 59);

  const rangeStart = from ? new Date(from) : fyStart;
  const rangeEnd   = to   ? new Date(to + "T23:59:59.999Z") : fyEnd;

  const conditions = [
    eq(invoicesTable.companyId, req.companyId),
    sql`${invoicesTable.status} NOT IN ('Draft', 'Cancelled')`,
    isNull(invoicesTable.deletedAt),
    gte(invoicesTable.createdAt, rangeStart),
    lte(invoicesTable.createdAt, rangeEnd),
  ];

  const invRows = await db
    .select({
      id: invoicesTable.id,
      invoiceNumber: invoicesTable.invoiceNumber,
      createdAt: invoicesTable.createdAt,
      totalAmount: invoicesTable.totalAmount,
      grandTotal: invoicesTable.grandTotal,
      cgst: invoicesTable.cgst,
      sgst: invoicesTable.sgst,
      igst: invoicesTable.igst,
      placeOfSupplyStateCode: invoicesTable.placeOfSupplyStateCode,
      clientId: invoicesTable.clientId,
      clientName: clientsTable.companyName,
      clientGstin: clientsTable.gstNumber,
      clientStateCode: clientsTable.stateCode,
    })
    .from(invoicesTable)
    .leftJoin(clientsTable, eq(invoicesTable.clientId, clientsTable.id))
    .where(and(...conditions))
    .orderBy(desc(invoicesTable.createdAt));

  const lineRows = await db
    .select({
      invoiceId: invoiceLinesTable.invoiceId,
      hsnCode: invoiceLinesTable.hsnCode,
      description: invoiceLinesTable.description,
      gstRate: invoiceLinesTable.gstRate,
      lineTotal: invoiceLinesTable.lineTotal,
      cgst: invoiceLinesTable.cgst,
      sgst: invoiceLinesTable.sgst,
      igst: invoiceLinesTable.igst,
      lineTaxTotal: invoiceLinesTable.lineTaxTotal,
      lineGrandTotal: invoiceLinesTable.lineGrandTotal,
    })
    .from(invoiceLinesTable)
    .innerJoin(invoicesTable, eq(invoiceLinesTable.invoiceId, invoicesTable.id))
    .where(and(
      eq(invoicesTable.companyId, req.companyId),
      isNull(invoicesTable.deletedAt),
      gte(invoicesTable.createdAt, rangeStart),
      lte(invoicesTable.createdAt, rangeEnd),
      sql`${invoicesTable.status} NOT IN ('Draft', 'Cancelled')`,
    ));

  const linesByInvoice = new Map<number, typeof lineRows>();
  for (const l of lineRows) {
    if (!linesByInvoice.has(l.invoiceId)) linesByInvoice.set(l.invoiceId, []);
    linesByInvoice.get(l.invoiceId)!.push(l);
  }

  // ─── B2B ────────────────────────────────────────────────────────────────────
  const b2bMap = new Map<string, {
    gstin: string; clientName: string; invoices: Array<{
      invoiceNumber: string; invoiceDate: string; invoiceValue: number;
      placeOfSupply: string; reverseCharge: "N";
      items: Array<{ hsnCode: string; taxableValue: number; gstRate: number; cgst: number; sgst: number; igst: number }>;
    }>;
  }>();

  const b2cs: Array<{
    stateCode: string; gstRate: number; taxableValue: number; cgst: number; sgst: number; igst: number;
  }> = [];

  const hsnMap = new Map<string, { hsnCode: string; description: string; gstRate: number; qty: number; taxableValue: number; cgst: number; sgst: number; igst: number; total: number }>();

  for (const inv of invRows) {
    const lines = linesByInvoice.get(inv.id) ?? [];
    const lineItems = lines.map((l) => ({
      hsnCode: l.hsnCode ?? "",
      taxableValue: Number(l.lineTotal),
      gstRate: Number(l.gstRate),
      cgst: Number(l.cgst),
      sgst: Number(l.sgst),
      igst: Number(l.igst),
    }));

    for (const l of lines) {
      const key = l.hsnCode ?? "MISC";
      const rate = Number(l.gstRate);
      const existing = hsnMap.get(key);
      if (existing && existing.gstRate === rate) {
        existing.taxableValue += Number(l.lineTotal);
        existing.cgst += Number(l.cgst);
        existing.sgst += Number(l.sgst);
        existing.igst += Number(l.igst);
        existing.total += Number(l.lineGrandTotal);
      } else {
        hsnMap.set(`${key}-${rate}`, {
          hsnCode: key,
          description: l.description,
          gstRate: rate,
          qty: 1,
          taxableValue: Number(l.lineTotal),
          cgst: Number(l.cgst),
          sgst: Number(l.sgst),
          igst: Number(l.igst),
          total: Number(l.lineGrandTotal),
        });
      }
    }

    if (inv.clientGstin) {
      const gstin = inv.clientGstin;
      if (!b2bMap.has(gstin)) {
        b2bMap.set(gstin, { gstin, clientName: inv.clientName ?? "Unknown", invoices: [] });
      }
      b2bMap.get(gstin)!.invoices.push({
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.createdAt.toISOString().slice(0, 10),
        invoiceValue: Number(inv.grandTotal),
        placeOfSupply: inv.placeOfSupplyStateCode ?? inv.clientStateCode ?? "27",
        reverseCharge: "N",
        items: lineItems,
      });
    } else {
      const stateCode = inv.placeOfSupplyStateCode ?? inv.clientStateCode ?? "27";
      const isInter = Number(inv.igst) > 0;
      const existing = b2cs.find(
        (r) => r.stateCode === stateCode && Math.abs(r.gstRate - (lines[0] ? Number(lines[0].gstRate) : 18)) < 0.01
      );
      const gstRate = lines[0] ? Number(lines[0].gstRate) : 18;
      if (existing) {
        existing.taxableValue += Number(inv.totalAmount);
        existing.cgst += isInter ? 0 : Number(inv.cgst);
        existing.sgst += isInter ? 0 : Number(inv.sgst);
        existing.igst += isInter ? Number(inv.igst) : 0;
      } else {
        b2cs.push({
          stateCode,
          gstRate,
          taxableValue: Number(inv.totalAmount),
          cgst: isInter ? 0 : Number(inv.cgst),
          sgst: isInter ? 0 : Number(inv.sgst),
          igst: isInter ? Number(inv.igst) : 0,
        });
      }
    }
  }

  const totals = {
    invoiceCount: invRows.length,
    taxableValue: invRows.reduce((s, i) => s + Number(i.totalAmount), 0),
    cgst: invRows.reduce((s, i) => s + Number(i.cgst), 0),
    sgst: invRows.reduce((s, i) => s + Number(i.sgst), 0),
    igst: invRows.reduce((s, i) => s + Number(i.igst), 0),
    grandTotal: invRows.reduce((s, i) => s + Number(i.grandTotal), 0),
  };

  res.json({
    period: { from: rangeStart.toISOString().slice(0, 10), to: rangeEnd.toISOString().slice(0, 10) },
    totals,
    b2b: Array.from(b2bMap.values()),
    b2cs,
    hsnSummary: Array.from(hsnMap.values()).sort((a, b) => b.taxableValue - a.taxableValue),
  });
});

export default router;
