import { NextRequest, NextResponse } from "next/server";
import { getRecords } from "@/lib/queries";
export const dynamic = "force-dynamic";
function esc(value: unknown) { const s=String(value??""); return `"${s.replace(/"/g,'""')}"`; }
export async function GET(request:NextRequest) { try { const metric=request.nextUrl.searchParams.get("metric")??undefined; const rows=await getRecords({metric,limit:10000}); const header=["metric","value","unit","measured_at","source","source_file","label"]; const lines=[header.map(esc).join(","),...rows.map(r=>[r.metric,r.value,r.unit,r.measuredAt.toISOString(),r.source,r.sourceFile,r.label].map(esc).join(","))]; return new NextResponse("\uFEFF"+lines.join("\r\n"),{headers:{"content-type":"text/csv; charset=utf-8","content-disposition":"attachment; filename=fitbit-air-export.csv","cache-control":"no-store"}}); } catch(e){console.error("csv_export_error",e);return NextResponse.json({error:"No se pudo exportar."},{status:500});} }
