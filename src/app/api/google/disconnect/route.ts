import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, googleConnections } from "@/lib/db";
import { getGoogleTokens } from "@/lib/google-health";

export async function POST() {
  try {
    const tokens = await getGoogleTokens();
    if (tokens) {
      const tokenToRevoke = tokens.refresh_token ?? tokens.access_token;
      try {
        await fetch("https://oauth2.googleapis.com/revoke", {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ token: tokenToRevoke }),
          cache: "no-store",
        });
      } catch (error) {
        // Local credentials are still removed if the revocation endpoint is unavailable.
        console.warn("google_revoke_warning", error);
      }
    }
    await db.delete(googleConnections).where(eq(googleConnections.ownerKey, "owner"));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("google_disconnect_error", error);
    return NextResponse.json({ error: "No se pudo desconectar Google." }, { status: 500 });
  }
}
