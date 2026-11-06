"use client";
import { useCallback, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ZipReader, BlobReader, TextWriter } from "@zip.js/zip.js";
import Papa from "papaparse";
import { CheckCircle2, FileArchive, FileJson, FileSpreadsheet, ShieldCheck, UploadCloud, XCircle } from "lucide-react";
import { toast } from "sonner";
import { collectCandidateRows, normalizeRows } from "@/lib/import/normalize";

type Progress = { percent: number; message: string; inserted: number; duplicates: number; files: number; records: number };
const BATCH_SIZE = 250;
async function loadImportJobs() { const response = await fetch("/api/import/jobs", { cache: "no-store" }); if (!response.ok) throw new Error("No se pudo cargar el historial."); return response.json() as Promise<{ jobs: Array<{ id: string; fileName: string; status: string; totalRecords: number; insertedRecords: number; duplicateRecords: number; filesProcessed: number; startedAt: string; completedAt: string | null }> }>; }
export default function ImportPage() {
  const { data: history, refetch: refreshHistory } = useQuery({ queryKey: ["import-jobs"], queryFn: loadImportJobs });
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const processFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".zip")) { toast.error("Selecciona un archivo ZIP de Google Takeout."); return; }
    if (file.size > 250 * 1024 * 1024) { toast.error("El ZIP supera el límite local de 250 MB para mantener un uso de memoria seguro en el navegador."); return; }
    setWorking(true); setError(null); setResult(null);
    const state: Progress = { percent: 1, message: "Abriendo archivo…", inserted: 0, duplicates: 0, files: 0, records: 0 };
    setProgress({ ...state });
    try {
      const hash = await fileHash(file);
      const jobResponse = await fetch("/api/import/start", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fileName: file.name, sha256: hash }) });
      const job = await jobResponse.json();
      if (!jobResponse.ok) throw new Error(job.error ?? "No se pudo iniciar la importación.");
      if (job.alreadyImported) { setResult("Este archivo ya se había importado anteriormente. No se han duplicado registros."); setWorking(false); setProgress(null); await refreshHistory(); return; }
      const reader = new ZipReader(new BlobReader(file));
      const entries = await reader.getEntries();
      const relevant = entries.filter((entry) => !entry.directory && /\.(json|csv)$/i.test(entry.filename) && !/(manifest|readme|metadata)/i.test(entry.filename));
      if (!relevant.length) throw new Error("No se han encontrado archivos JSON o CSV reconocibles dentro del ZIP.");
      let processed = 0;
      for (let index = 0; index < relevant.length; index++) {
        const entry = relevant[index];
        state.message = `Analizando ${entry.filename.split("/").pop()}`;
        state.percent = Math.round(5 + (index / relevant.length) * 80);
        setProgress({ ...state });
        const text = await entry.getData(new TextWriter());
        let rows: unknown[] = [];
        if (entry.filename.toLowerCase().endsWith(".json")) {
          try { const parsed = JSON.parse(text); rows = Array.isArray(parsed) ? parsed : collectCandidateRows(parsed); if (!rows.length && parsed && typeof parsed === "object") rows = [parsed]; }
          catch { continue; }
        } else {
          const parsed = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true, dynamicTyping: true });
          rows = parsed.data;
        }
        const normalized = await normalizeRows(rows, entry.filename);
        for (let cursor = 0; cursor < normalized.length; cursor += BATCH_SIZE) {
          const batch = normalized.slice(cursor, cursor + BATCH_SIZE);
          const response = await fetch("/api/import/batch", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jobId: job.jobId, records: batch }) });
          const json = await response.json();
          if (!response.ok) throw new Error(json.error ?? "Error guardando registros.");
          state.inserted += json.inserted ?? 0; state.duplicates += json.duplicates ?? 0; state.records += batch.length;
          setProgress({ ...state });
        }
        if (normalized.length) processed++;
        state.files = index + 1;
      }
      await fetch("/api/import/complete", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jobId: job.jobId, filesProcessed: processed, totalRecords: state.records, insertedRecords: state.inserted, duplicateRecords: state.duplicates }) });
      state.percent = 100; state.message = "Importación completada"; setProgress({ ...state });
      setResult(`Importación finalizada: ${state.inserted.toLocaleString("es-ES")} nuevos registros, ${state.duplicates.toLocaleString("es-ES")} duplicados omitidos. Archivos con datos: ${processed}.`);
      toast.success("Histórico procesado correctamente.");
      await refreshHistory();
    } catch (e) { const message = e instanceof Error ? e.message : "Error inesperado durante la importación."; setError(message); toast.error(message); }
    finally { setWorking(false); if (inputRef.current) inputRef.current.value = ""; }
  }, []);
  return <><div className="page-heading"><div className="eyebrow">HISTÓRICO PERSONAL</div><h2>Centro de importación</h2><p>Incorpora copias exportadas desde Google Takeout. El ZIP se analiza dentro de tu navegador y se envían únicamente registros normalizados a tu base de datos.</p></div><div className="import-layout"><section className="panel"><div className="panel-header"><div><div className="panel-title">Importar Google Takeout</div><div className="panel-subtitle">Formatos admitidos: ZIP con archivos JSON y CSV</div></div><span className="tag">LOCAL EN NAVEGADOR</span></div><div className={`dropzone ${dragging ? "dragging" : ""}`} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); const file = e.dataTransfer.files?.[0]; if (file) void processFile(file); }}><div className="upload-icon"><UploadCloud size={23}/></div><h3>Arrastra aquí tu archivo ZIP</h3><p>Selecciona el archivo descargado desde Google Takeout. El límite de tamaño del importador es 250 MB y el contenido se procesa en tu navegador.</p><button className="primary-button" onClick={() => inputRef.current?.click()} disabled={working}>Seleccionar archivo</button><input ref={inputRef} type="file" accept=".zip,application/zip" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void processFile(file); }}/></div>{progress && <div className="import-progress"><div className="progress-top"><span>{progress.message}</span><strong>{progress.percent}%</strong></div><div className="progress-track"><div className="progress-fill" style={{ width: `${progress.percent}%` }}/></div><div className="flex justify-between mt-3 text-[9px] text-[#888693]"><span>{progress.files} archivos · {progress.records.toLocaleString("es-ES")} registros leídos</span><span>{progress.inserted.toLocaleString("es-ES")} guardados</span></div></div>}{result && <div className="mx-[18px] mb-[18px] success-notice notice flex items-start gap-2"><CheckCircle2 size={15} className="shrink-0 mt-0.5"/>{result}</div>}{error && <div className="mx-[18px] mb-[18px] error-notice notice flex items-start gap-2"><XCircle size={15} className="shrink-0 mt-0.5"/>{error}</div>}</section><aside className="panel"><div className="panel-header"><div><div className="panel-title">Cómo funciona</div><div className="panel-subtitle">Importación segura y deduplicada</div></div><ShieldCheck size={17} color="#d985a0"/></div><div className="import-steps"><Step n="01" title="Exporta tus datos" text="En Google Takeout, selecciona Google Health y descarga el archivo ZIP."/><Step n="02" title="Procesamiento en navegador" text="El ZIP se abre localmente. No se almacena una copia completa del archivo en el servidor."/><Step n="03" title="Normalización" text="Las mediciones compatibles se transforman a un esquema común y se envían por lotes."/><Step n="04" title="Deduplicación" text="Cada medición recibe una clave estable para evitar duplicados entre cargas."/></div><div className="border-t border-[#292832] px-[18px] py-4"><div className="info-list"><Info icon={<FileArchive size={15}/>} text="Archivo ZIP descargado desde Google Takeout."/><Info icon={<FileJson size={15}/>} text="JSON para sesiones, mediciones y resúmenes."/><Info icon={<FileSpreadsheet size={15}/>} text="CSV cuando esté incluido en la exportación."/></div></div></aside></div><section className="panel mt-4"><div className="panel-header"><div><div className="panel-title">Historial de importaciones</div><div className="panel-subtitle">Últimos 20 archivos procesados</div></div><span className="tag">{history?.jobs?.length ?? 0} REGISTROS</span></div><div className="table-wrap"><table className="data-table"><thead><tr><th>ARCHIVO</th><th>ESTADO</th><th>REGISTROS</th><th>FECHA</th></tr></thead><tbody>{(history?.jobs ?? []).map((job) => <tr key={job.id}><td>{job.fileName}</td><td><span className="tag">{job.status === "completed" ? "COMPLETADA" : job.status.toUpperCase()}</span></td><td>{Number(job.insertedRecords).toLocaleString("es-ES")} nuevos · {Number(job.duplicateRecords).toLocaleString("es-ES")} duplicados</td><td>{new Date(job.startedAt).toLocaleString("es-ES")}</td></tr>)}{!history?.jobs?.length && <tr><td colSpan={4}>Todavía no hay importaciones.</td></tr>}</tbody></table></div></section><div className="notice mt-4">El formato de Takeout puede cambiar y no todos los ficheros se pueden identificar automáticamente. Los archivos no reconocidos se omiten; después de una primera exportación real podremos ajustar el mapeo a su estructura exacta.</div></>;
}
function Step({ n, title, text }: { n: string; title: string; text: string }) { return <div className="import-step"><div className="step-number">{n}</div><div><strong>{title}</strong><p>{text}</p></div></div>; }
function Info({ icon, text }: { icon: React.ReactNode; text: string }) { return <div className="info-item">{icon}<span>{text}</span></div>; }
async function fileHash(file: File) { const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer()); return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join(""); }
