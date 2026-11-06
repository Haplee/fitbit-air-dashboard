import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db, healthRecords } from "@/lib/db";

export async function getRecords(options: { metric?: string; from?: Date; to?: Date; limit?: number } = {}) {
  const filters = [];
  if (options.metric) filters.push(eq(healthRecords.metric, options.metric));
  if (options.from) filters.push(gte(healthRecords.measuredAt, options.from));
  if (options.to) filters.push(lte(healthRecords.measuredAt, options.to));
  return db.select().from(healthRecords).where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(healthRecords.measuredAt)).limit(Math.min(options.limit ?? 2000, 10000));
}

export function toSafeRecord(row: typeof healthRecords.$inferSelect) {
  return { ...row, value: Number(row.value), metadata: row.metadata ?? {} };
}
