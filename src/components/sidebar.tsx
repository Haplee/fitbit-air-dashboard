"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ArrowDownToLine, ChevronLeft, CircleDot, HeartPulse, LayoutDashboard, MoonStar, Settings2, TrendingUp, Watch } from "lucide-react";
import { cn } from "@/lib/utils";
const items = [
  { href: "/", label: "Resumen", icon: LayoutDashboard },
  { href: "/heart", label: "Salud cardíaca", icon: HeartPulse },
  { href: "/sleep", label: "Sueño", icon: MoonStar },
  { href: "/activity", label: "Actividad", icon: Activity },
  { href: "/trends", label: "Evolución", icon: TrendingUp },
  { href: "/import", label: "Importar datos", icon: ArrowDownToLine },
  { href: "/settings", label: "Conexiones", icon: Settings2 },
];
export function Sidebar() {
  const pathname = usePathname();
  return <aside className="sidebar">
    <div className="brand"><div className="brand-mark"><Watch size={19}/></div><div><strong>Fitbit Air</strong><span>HEALTH CONSOLE</span></div></div>
    <div className="workspace"><span className="workspace-dot"/> Espacio personal <ChevronLeft size={14} className="rotate-[-90deg]"/></div>
    <div className="nav-label">TU SALUD</div>
    <nav className="nav-list" aria-label="Navegación principal">
      {items.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={cn("nav-link", pathname === href && "active")}><Icon size={18}/><span>{label}</span>{href === "/import" && <span className="nav-pulse"/>}</Link>)}
    </nav>
    <div className="sidebar-bottom"><div className="device-card"><div className="device-icon"><Watch size={18}/></div><div><strong>Fitbit Air</strong><small>Dispositivo objetivo</small></div><CircleDot size={13} className="text-emerald-400"/></div><p>Los datos se muestran según su disponibilidad en Google Health.</p><div className="sidebar-foot"><span>FITBIT AIR DASHBOARD</span><span>v1.0.0</span></div></div>
  </aside>;
}
