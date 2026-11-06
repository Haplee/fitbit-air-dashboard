import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { z } from "zod";
const schema = z.object({ password: z.string().min(1).max(256) });
export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Introduce la contraseña." }, { status: 400 });
    const hash = process.env.APP_PASSWORD_HASH;
    const secret = process.env.AUTH_SECRET;
    if (!hash || !secret || secret.length < 32) return NextResponse.json({ error: "Falta configurar APP_PASSWORD_HASH o AUTH_SECRET en el entorno." }, { status: 503 });
    const valid = await bcrypt.compare(parsed.data.password, hash);
    if (!valid) return NextResponse.json({ error: "Contraseña incorrecta." }, { status: 401 });
    const token = await new SignJWT({ role: "owner" }).setProtectedHeader({ alg: "HS256" }).setSubject("owner").setIssuedAt().setExpirationTime("7d").sign(new TextEncoder().encode(secret));
    const response = NextResponse.json({ ok: true });
    response.cookies.set("fitbit_air_session", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 60 * 60 * 24 * 7 });
    return response;
  } catch { return NextResponse.json({ error: "No se pudo procesar el inicio de sesión." }, { status: 400 }); }
}
