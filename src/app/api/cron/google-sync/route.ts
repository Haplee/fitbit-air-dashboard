import { NextRequest, NextResponse } from "next/server";
import { syncGoogleHealthData } from "@/lib/google-sync";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await syncGoogleHealthData());
  } catch (error) {
    console.error("google_cron_sync_error", error);
    const message = error instanceof Error ? error.message : "No se pudo completar la sincronización programada.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
