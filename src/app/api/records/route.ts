import { NextRequest, NextResponse } from "next/server";
import { getRecords, toSafeRecord } from "@/lib/queries";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const metric = params.get("metric") ?? undefined;
  const from = params.get("from") ? new Date(params.get("from")!) : undefined;
  const to = params.get("to") ? new Date(params.get("to")!) : undefined;
  const limit = Number(params.get("limit") ?? 1000);
  if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime())) || !Number.isFinite(limit)) return NextResponse.json({ error: "Filtros inválidos." }, { status: 400 });
  try { const rows = await getRecords({ metric, from, to, limit }); return NextResponse.json({ records: rows.map(toSafeRecord) }); }
  catch (error) { console.error("records_error", error); return NextResponse.json({ error: "No se pudieron recuperar los registros." }, { status: 500 }); }
}
