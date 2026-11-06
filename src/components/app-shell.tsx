"use client";
import { Sidebar } from "@/components/sidebar";
import { Bell, Download, LogOut } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
const titleMap: Record<string, string> = { "/": "Resumen general", "/heart": "Salud cardíaca", "/sleep": "Análisis del sueño", "/activity": "Actividad física", "/trends": "Evolución de métricas", "/import": "Centro de importación", "/settings": "Conexiones y ajustes" };
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);
  async function logout() { setLoggingOut(true); await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/login"; }
  return <div className="app-shell"><Sidebar/><main className="main-area"><header className="topbar"><div className="topbar-left"><div className="breadcrumb">FITBIT AIR <span>/</span> <strong>{titleMap[pathname] ?? "Dashboard"}</strong></div><h1>{titleMap[pathname] ?? "Dashboard"}</h1></div><div className="topbar-actions"><a className="icon-button" href="/api/export/csv" aria-label="Exportar CSV" title="Exportar histórico CSV"><Download size={16}/></a><div className="privacy-pill"><span/> Datos privados</div><button className="icon-button" aria-label="Notificaciones"><Bell size={18}/></button><button className="profile-button" onClick={logout} disabled={loggingOut} title="Cerrar sesión"><span>FV</span><LogOut size={15}/></button></div></header><div className="page-content">{children}</div><footer className="app-footer"><span>FITBIT AIR DASHBOARD</span><span>Los datos son orientativos y no sustituyen una valoración médica.</span></footer></main></div>;
}
