import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db, importJobs } from "@/lib/db";
export const dynamic = "force-dynamic";
export async function GET() { try { const jobs=await db.select().from(importJobs).orderBy(desc(importJobs.startedAt)).limit(20); return NextResponse.json({jobs}); } catch(e){console.error("jobs_error",e);return NextResponse.json({error:"No se pudo cargar el historial."},{status:500});} }
