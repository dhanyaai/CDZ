import { Router } from "express";
import { eq, and, SQL } from "drizzle-orm";
import { db, artworkApprovalsTable, clientsTable } from "@workspace/db";

const router = Router();

function serializeArtwork(a: typeof artworkApprovalsTable.$inferSelect, clientName: string | null) {
  return {
    id: a.id,
    clientId: a.clientId,
    clientName: clientName ?? "Unknown",
    salesOrderId: a.salesOrderId ?? null,
    assetName: a.assetName,
    assetUrl: a.assetUrl ?? null,
    status: a.status,
    notes: a.notes ?? null,
    createdAt: a.createdAt.toISOString(),
  };
}

router.get("/v1/artwork", async (req, res): Promise<void> => {
  const { clientId, status } = req.query as { clientId?: string; status?: string };
  const conditions: SQL[] = [eq(artworkApprovalsTable.companyId, req.companyId)];
  if (clientId) conditions.push(eq(artworkApprovalsTable.clientId, parseInt(clientId, 10)));
  if (status) conditions.push(eq(artworkApprovalsTable.status, status));

  const rows = await db
    .select({ artwork: artworkApprovalsTable, clientName: clientsTable.companyName })
    .from(artworkApprovalsTable)
    .leftJoin(clientsTable, eq(artworkApprovalsTable.clientId, clientsTable.id))
    .where(and(...conditions))
    .orderBy(artworkApprovalsTable.createdAt);

  res.json(rows.map((r) => serializeArtwork(r.artwork, r.clientName)));
});

router.post("/v1/artwork", async (req, res): Promise<void> => {
  const { clientId, salesOrderId, assetName, assetUrl, notes } = req.body ?? {};
  if (!clientId || !assetName) {
    res.status(400).json({ error: "clientId and assetName are required" });
    return;
  }

  const [artwork] = await db
    .insert(artworkApprovalsTable)
    .values({ companyId: req.companyId, clientId, salesOrderId: salesOrderId ?? null, assetName, assetUrl, notes, status: "Pending" })
    .returning();

  const [row] = await db
    .select({ artwork: artworkApprovalsTable, clientName: clientsTable.companyName })
    .from(artworkApprovalsTable)
    .leftJoin(clientsTable, eq(artworkApprovalsTable.clientId, clientsTable.id))
    .where(eq(artworkApprovalsTable.id, artwork.id));

  res.status(201).json(serializeArtwork(row.artwork, row.clientName));
});

router.patch("/v1/artwork/:id/status", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { status, notes } = req.body ?? {};
  if (!status) {
    res.status(400).json({ error: "status is required" });
    return;
  }

  const updates: Record<string, unknown> = { status };
  if (notes != null) updates.notes = notes;

  const [artwork] = await db.update(artworkApprovalsTable).set(updates).where(and(eq(artworkApprovalsTable.id, id), eq(artworkApprovalsTable.companyId, req.companyId))).returning();
  if (!artwork) {
    res.status(404).json({ error: "Artwork approval not found" });
    return;
  }

  const [row] = await db
    .select({ artwork: artworkApprovalsTable, clientName: clientsTable.companyName })
    .from(artworkApprovalsTable)
    .leftJoin(clientsTable, eq(artworkApprovalsTable.clientId, clientsTable.id))
    .where(eq(artworkApprovalsTable.id, id));

  res.json(serializeArtwork(row.artwork, row.clientName));
});

export default router;
