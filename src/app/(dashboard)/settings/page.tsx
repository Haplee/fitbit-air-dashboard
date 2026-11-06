"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Activity, Cloud, ExternalLink, KeyRound, ShieldCheck, Unlink, Watch } from "lucide-react";
import { toast } from "sonner";

async function load() {
  const response = await fetch("/api/google/status", { cache: "no-store" });
  if (!response.ok) throw new Error("No se pudo consultar Google Health.");
  return response.json() as Promise<{ configured: boolean; connected: boolean; lastSyncAt: string | null; lastSyncStatus: string }>;
}

export default function SettingsPage() {
  const { data, refetch } = useQuery({ queryKey: ["google-status"], queryFn: load });
  const [loading, setLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  async function sync() {
    setLoading(true);
    try {
      const response = await fetch("/api/google/sync", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "No se pudo sincronizar.");
      toast.success(payload.skipped ? "No hay una cuenta Google conectada." : `Sincronización: ${payload.inserted} registros nuevos.`);
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error de sincronización.");
    } finally {
      setLoading(false);
    }
  }

  async function disconnect() {
    if (!window.confirm("¿Desconectar Google Health y eliminar los tokens guardados? Los datos ya importados se conservarán.")) return;
    setDisconnecting(true);
    try {
      const response = await fetch("/api/google/disconnect", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "No se pudo desconectar Google.");
      toast.success("Google Health desconectado. El histórico local se ha conservado.");
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al desconectar Google.");
    } finally {
      setDisconnecting(false);
    }
  }

  return <>
    <div className="page-heading">
      <div className="eyebrow">CUENTA Y FUENTES</div>
      <h2>Conexiones y ajustes</h2>
      <p>Administra las fuentes autorizadas y el estado de sincronización de tu Fitbit Air.</p>
    </div>
    <div className="settings-grid">
      <article className="panel">
        <div className="connection-card">
          <div className="connection-left"><div className="connection-icon"><Cloud size={19}/></div><div><strong>Google Health API</strong><small>OAuth 2.0 · Solo lectura</small></div></div>
          <span className="status-badge"><i style={{ background: data?.connected ? "#7bc9a2" : undefined }}/>{data?.connected ? "Conectado" : data?.configured ? "Sin conectar" : "Pendiente de configuración"}</span>
        </div>
        <div className="settings-note border-t border-[#292832]">
          {data?.connected ? `Cuenta vinculada. Última sincronización: ${data.lastSyncAt ? new Date(data.lastSyncAt).toLocaleString("es-ES") : "todavía no sincronizada"}.` : "Conecta tu cuenta de Google cuando hayas configurado el proyecto OAuth y añadido las credenciales de Vercel."}
        </div>
        <div className="flex flex-wrap gap-2 px-4 pb-4">
          {data?.connected ? <>
            <button className="primary-button" onClick={sync} disabled={loading}><Activity size={13} className="inline mr-2"/>{loading ? "Sincronizando…" : "Sincronizar ahora"}</button>
            <button className="secondary-button flex items-center gap-2" onClick={disconnect} disabled={disconnecting}><Unlink size={12}/>{disconnecting ? "Desconectando…" : "Desconectar"}</button>
          </> : <a className="primary-button" href="/api/google/connect">Conectar Google</a>}
          <a className="secondary-button flex items-center gap-2" href="https://developers.google.com/health/setup" target="_blank" rel="noreferrer">Guía de Google <ExternalLink size={12}/></a>
        </div>
      </article>
      <article className="panel">
        <div className="connection-card"><div className="connection-left"><div className="connection-icon" style={{ background: "#332b1e", color: "#e6bd85" }}><Watch size={19}/></div><div><strong>Fitbit Air</strong><small>Dispositivo compatible con Google Health API</small></div></div><span className="status-badge"><i style={{ background: "#7bc9a2" }}/> Fuente admitida</span></div>
        <div className="settings-note border-t border-[#292832]">La pulsera sincroniza con la aplicación móvil. Este dashboard consulta los datos disponibles en Google Health; no conecta el dispositivo directamente al navegador.</div>
      </article>
      <article className="panel">
        <div className="connection-card"><div className="connection-left"><div className="connection-icon"><ShieldCheck size={19}/></div><div><strong>Privacidad y seguridad</strong><small>Sesión privada · tokens cifrados</small></div></div><span className="status-badge"><i style={{ background: "#7bc9a2" }}/> Activo</span></div>
        <div className="settings-note border-t border-[#292832]">La aplicación tiene acceso de propietario mediante contraseña. Los tokens de Google se cifran en el servidor con AES-256-GCM. No se solicitan permisos de escritura. Al desconectar Google se revoca el token y se elimina de la base de datos; el histórico importado se conserva.</div>
      </article>
      <article className="panel">
        <div className="connection-card"><div className="connection-left"><div className="connection-icon"><KeyRound size={19}/></div><div><strong>Permisos solicitados</strong><small>Ámbitos de lectura necesarios</small></div></div></div>
        <div className="settings-note border-t border-[#292832]">Actividad y ejercicio · Métricas de salud · Sueño. Google clasifica estos ámbitos como restringidos; sigue el proceso de verificación que corresponda antes de publicar la integración para usuarios externos.</div>
      </article>
    </div>
  </>;
}
