import { NextResponse } from "next/server";
import { syncGoogleHealthData } from "@/lib/google-sync";

export const maxDuration = 60;

export async function POST() {
  try {
    return NextResponse.json(await syncGoogleHealthData());
  } catch (error) {
    console.error("google_sync_error", error);
    const message = error instanceof Error ? error.message : "No se pudo completar la sincronización.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
