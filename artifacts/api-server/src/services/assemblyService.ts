import { eq, and } from "drizzle-orm";
import {
  db,
  assemblyJobsTable, assemblyItemsTable,
  productsTable, inventoryMovementsTable,
} from "@workspace/db";
import { ASSEMBLY_TRANSITIONS, assertTransition, StatusError } from "./stateMachine";

export async function advanceAssembly(
  jobId: number,
  companyId: number,
  toStatus: string,
): Promise<void> {
  const [job] = await db
    .select()
    .from(assemblyJobsTable)
    .where(and(eq(assemblyJobsTable.id, jobId), eq(assemblyJobsTable.companyId, companyId)));

  if (!job) throw new StatusError(404, "Assembly job not found");

  assertTransition(ASSEMBLY_TRANSITIONS, job.status, toStatus, "Assembly job");

  if (toStatus === "Completed") {
    await backflushAssembly(job, companyId);
  } else {
    await db
      .update(assemblyJobsTable)
      .set({ status: toStatus })
      .where(eq(assemblyJobsTable.id, jobId));
  }
}

async function backflushAssembly(
  job: typeof assemblyJobsTable.$inferSelect,
  companyId: number,
): Promise<void> {
  const items = await db
    .select()
    .from(assemblyItemsTable)
    .where(eq(assemblyItemsTable.assemblyJobId, job.id));

  if (items.length === 0) {
    await db
      .update(assemblyJobsTable)
      .set({ status: "Completed" })
      .where(eq(assemblyJobsTable.id, job.id));
    return;
  }

  await db.transaction(async (tx) => {
    for (const item of items) {
      if (!item.productId) continue;

      const totalConsumed = item.quantity * job.totalKits;

      const [prod] = await tx
        .select({ stockLevel: productsTable.stockLevel })
        .from(productsTable)
        .where(and(eq(productsTable.id, item.productId), eq(productsTable.companyId, companyId)))
        .for("update");

      if (!prod) continue;

      const available = prod.stockLevel - totalConsumed;
      if (available < 0) {
        throw new StatusError(
          422,
          `Insufficient stock for product ID ${item.productId}: need ${totalConsumed}, have ${prod.stockLevel}`,
        );
      }

      await tx
        .update(productsTable)
        .set({ stockLevel: available })
        .where(eq(productsTable.id, item.productId));

      await tx.insert(inventoryMovementsTable).values({
        companyId,
        productId: item.productId,
        type: "ASSEMBLY_CONSUME",
        quantity: -totalConsumed,
        reference: job.jobNumber,
      });
    }

    await tx
      .update(assemblyJobsTable)
      .set({ status: "Completed", completedKits: job.totalKits })
      .where(eq(assemblyJobsTable.id, job.id));
  });
}
