import { db, numberSequencesTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";

function getFyLabel(date: Date, fyStartMonth: number): string {
  const m = date.getMonth() + 1;
  const y = date.getFullYear();
  const fyStartYear = m >= fyStartMonth ? y : y - 1;
  const fyEndYear = fyStartYear + 1;
  return `${String(fyStartYear).slice(2)}-${String(fyEndYear).slice(2)}`;
}

type DbLike = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function nextDocNumber(
  txOrDb: DbLike,
  companyId: number,
  docType: string,
  prefix: string,
  fyStartMonth = 4,
): Promise<string> {
  const fyLabel = getFyLabel(new Date(), fyStartMonth);

  const [existing] = await (txOrDb as typeof db)
    .select()
    .from(numberSequencesTable)
    .where(
      and(
        eq(numberSequencesTable.companyId, companyId),
        eq(numberSequencesTable.docType, docType),
        eq(numberSequencesTable.fyLabel, fyLabel),
      ),
    )
    .for("update");

  let next: number;
  if (existing) {
    next = existing.lastNumber + 1;
    await (txOrDb as typeof db)
      .update(numberSequencesTable)
      .set({ lastNumber: next })
      .where(eq(numberSequencesTable.id, existing.id));
  } else {
    await (txOrDb as typeof db)
      .insert(numberSequencesTable)
      .values({ companyId, docType, fyLabel, lastNumber: 1 })
      .onConflictDoNothing();
    const [row] = await (txOrDb as typeof db)
      .select()
      .from(numberSequencesTable)
      .where(
        and(
          eq(numberSequencesTable.companyId, companyId),
          eq(numberSequencesTable.docType, docType),
          eq(numberSequencesTable.fyLabel, fyLabel),
        ),
      );
    if (row && row.lastNumber > 1) {
      await (txOrDb as typeof db)
        .update(numberSequencesTable)
        .set({ lastNumber: sql`${numberSequencesTable.lastNumber} + 1` })
        .where(eq(numberSequencesTable.id, row.id));
      const [updated] = await (txOrDb as typeof db)
        .select()
        .from(numberSequencesTable)
        .where(eq(numberSequencesTable.id, row.id));
      next = updated!.lastNumber;
    } else {
      next = 1;
    }
  }

  return `${prefix}/${fyLabel}/${String(next).padStart(4, "0")}`;
}
