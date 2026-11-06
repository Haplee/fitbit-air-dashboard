import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
export const metadata: Metadata = { title: "Fitbit Air Dashboard", description: "Panel privado de salud y actividad de Google Health y Fitbit Air.", robots: { index: false, follow: false } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="es"><body><Providers>{children}</Providers></body></html>; }
