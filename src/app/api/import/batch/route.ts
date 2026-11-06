import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, healthRecords, importJobs } from "@/lib/db";
import { eq } from "drizzle-orm";
const metric = z.enum(["steps","heart_rate","resting_heart_rate","hrv","sleep","distance","calories","active_minutes","spo2","respiratory_rate","weight","vo2_max","exercise"]);
const record = z.object({ metric, value: z.number().finite().min(-1000000).max(1000000000), unit: z.string().max(32).default(""), measuredAt: z.string().datetime({ offset: true }), endAt: z.string().datetime({ offset: true }).nullable().optional(), source: z.enum(["takeout","google_health"]), sourceFile: z.string().max(512).optional().default(""), label: z.string().max(160).optional().default(""), dedupeKey: z.string().regex(/^[a-f0-9]{64}$/), metadata: z.record(z.unknown()).optional().default({}) });
const schema = z.object({ jobId: z.string().uuid(), records: z.array(record).min(1).max(300) });
export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ error: "El lote contiene registros inválidos.", details: parsed.error.issues.slice(0,4) }, { status: 400 });
  try {
    const [job] = await db.select({ id: importJobs.id }).from(importJobs).where(eq(importJobs.id, parsed.data.jobId)).limit(1);
    if (!job) return NextResponse.json({ error: "La importación no existe." }, { status: 404 });
    const values = parsed.data.records.map((r) => ({ metric:r.metric, value:String(r.value), unit:r.unit, measuredAt:new Date(r.measuredAt), endAt:r.endAt ? new Date(r.endAt) : null, source:r.source, sourceFile:r.sourceFile, label:r.label, dedupeKey:r.dedupeKey, metadata:r.metadata }));
    const inserted = await db.insert(healthRecords).values(values).onConflictDoNothing({ target: healthRecords.dedupeKey }).returning({ id: healthRecords.id });
    return NextResponse.json({ inserted: inserted.length, duplicates: values.length - inserted.length });
  } catch (error) { console.error("import_batch_error", error); return NextResponse.json({ error: "No se pudieron guardar los registros del lote." }, { status: 500 }); }
}
