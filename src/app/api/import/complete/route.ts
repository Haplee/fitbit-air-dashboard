import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, importJobs } from "@/lib/db";
import { eq } from "drizzle-orm";
const schema = z.object({ jobId: z.string().uuid(), filesProcessed: z.number().int().min(0), totalRecords: z.number().int().min(0), insertedRecords: z.number().int().min(0), duplicateRecords: z.number().int().min(0) });
export async function POST(request: NextRequest) { const p=schema.safeParse(await request.json()); if(!p.success)return NextResponse.json({error:"Datos inválidos."},{status:400}); try { await db.update(importJobs).set({status:"completed",filesProcessed:p.data.filesProcessed,totalRecords:p.data.totalRecords,insertedRecords:p.data.insertedRecords,duplicateRecords:p.data.duplicateRecords,completedAt:new Date()}).where(eq(importJobs.id,p.data.jobId)); return NextResponse.json({ok:true}); } catch(e){console.error("import_complete_error",e);return NextResponse.json({error:"No se pudo cerrar la importación."},{status:500});} }
