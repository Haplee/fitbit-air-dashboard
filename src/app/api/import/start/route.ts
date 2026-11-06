import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, importJobs } from "@/lib/db";
import { eq } from "drizzle-orm";
const bodySchema = z.object({ fileName: z.string().min(1).max(255), sha256: z.string().regex(/^[a-f0-9]{64}$/) });
export async function POST(request: NextRequest) {
  const body = bodySchema.safeParse(await request.json()); if (!body.success) return NextResponse.json({ error: "Datos del archivo inválidos." }, { status: 400 });
  try {
    const [existing] = await db.select().from(importJobs).where(eq(importJobs.sha256, body.data.sha256)).limit(1);
    if (existing?.status === "completed") return NextResponse.json({ alreadyImported: true, jobId: existing.id });
    if (existing) return NextResponse.json({ jobId: existing.id, alreadyImported: false });
    const [job] = await db.insert(importJobs).values({ fileName: body.data.fileName, sha256: body.data.sha256, status: "processing" }).returning({ id: importJobs.id });
    return NextResponse.json({ jobId: job.id, alreadyImported: false });
  } catch (error) { console.error("import_start_error", error); return NextResponse.json({ error: "No se pudo registrar la importación." }, { status: 500 }); }
}
