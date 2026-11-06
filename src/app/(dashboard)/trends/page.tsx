"use client";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, CalendarDays, ChartLine, Filter } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNumber } from "@/lib/utils";

type RecordRow = { id: string; metric: string; value: number; unit: string; measuredAt: string; source: string; label: string };
type MetricOption = { value: string; label: string; unit: string; aggregate: "sum" | "average" };
const metrics: MetricOption[] = [
  { value: "steps", label: "Pasos", unit: "pasos", aggregate: "sum" },
  { value: "heart_rate", label: "Frecuencia cardíaca", unit: "lpm", aggregate: "average" },
  { value: "resting_heart_rate", label: "Pulso en reposo", unit: "lpm", aggregate: "average" },
  { value: "hrv", label: "Variabilidad cardíaca", unit: "ms", aggregate: "average" },
  { value: "sleep", label: "Sueño", unit: "min", aggregate: "sum" },
  { value: "calories", label: "Calorías", unit: "kcal", aggregate: "sum" },
  { value: "distance", label: "Distancia", unit: "m", aggregate: "sum" },
  { value: "active_minutes", label: "Minutos activos", unit: "min", aggregate: "sum" },
];
function dateInput(daysAgo: number) { const date = new Date(); date.setDate(date.getDate() - daysAgo); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
async function loadRecords(metric: string, from: string, to: string) {
  const start = new Date(`${from}T00:00:00`).toISOString();
  const end = new Date(`${to}T23:59:59.999`).toISOString();
  const params = new URLSearchParams({ metric, from: start, to: end, limit: "10000" });
  const response = await fetch(`/api/records?${params}`, { cache: "no-store" });
  if (!response.ok) throw new Error("No se pudieron cargar los registros de ese periodo.");
  return response.json() as Promise<{ records: RecordRow[] }>;
}
export default function TrendsPage() {
  const [metric, setMetric] = useState("steps");
  const [from, setFrom] = useState(dateInput(90));
  const [to, setTo] = useState(dateInput(0));
  const selected = metrics.find((item) => item.value === metric) ?? metrics[0];
  const query = useQuery({ queryKey: ["records", metric, from, to], queryFn: () => loadRecords(metric, from, to), enabled: Boolean(from && to && from <= to) });
  const daily = useMemo(() => {
    const buckets = new Map<string, number[]>();
    for (const record of query.data?.records ?? []) {
      const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date(record.measuredAt));
      if (!buckets.has(date)) buckets.set(date, []);
      buckets.get(date)!.push(Number(record.value));
    }
    return [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, values]) => ({
      date: new Date(`${date}T12:00:00Z`).toLocaleDateString("es-ES", { day: "2-digit", month: "short", timeZone: "Europe/Madrid" }),
      value: selected.aggregate === "sum" ? values.reduce((sum, value) => sum + value, 0) : values.reduce((sum, value) => sum + value, 0) / values.length,
      samples: values.length,
    }));
  }, [query.data?.records, selected.aggregate]);
  const totalSamples = query.data?.records.length ?? 0;
  const latest = daily.at(-1)?.value ?? null;
  const average = daily.length ? daily.reduce((sum, item) => sum + item.value, 0) / daily.length : null;
  return <>
    <div className="page-heading"><div className="eyebrow">HISTÓRICO Y TENDENCIAS</div><h2>Evolución de tus métricas</h2><p>Consulta cualquier periodo del histórico importado o sincronizado. Los valores se agrupan por día en horario de Madrid.</p></div>
    <section className="panel mb-4">
      <div className="panel-header"><div><div className="panel-title">Filtros del informe</div><div className="panel-subtitle">Selecciona una métrica y un intervalo de fechas</div></div><Filter size={16} color="#d985a0"/></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4">
        <label className="block"><span className="field-label">MÉTRICA</span><select className="text-input" value={metric} onChange={(event) => setMetric(event.target.value)}>{metrics.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label className="block"><span className="field-label">DESDE</span><input className="text-input" type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)}/></label>
        <label className="block"><span className="field-label">HASTA</span><input className="text-input" type="date" value={to} min={from} max={dateInput(0)} onChange={(event) => setTo(event.target.value)}/></label>
      </div>
    </section>
    <section className="metric-grid">
      <Metric label="REGISTROS" value={formatNumber(totalSamples)} detail="Muestras en el periodo" icon={<Activity size={16}/>}/>
      <Metric label="DÍAS CON DATOS" value={formatNumber(daily.length)} detail="Días representados" icon={<CalendarDays size={16}/>}/>
      <Metric label="MEDIA DIARIA" value={average === null ? "—" : formatNumber(average, 1)} detail={`${selected.label} · ${selected.unit}`} icon={<ChartLine size={16}/>}/>
      <Metric label="ÚLTIMO DÍA" value={latest === null ? "—" : formatNumber(latest, 1)} detail={selected.unit} icon={<Activity size={16}/>}/>
    </section>
    <article className="panel mt-4">
      <div className="panel-header"><div><div className="panel-title">{selected.label}</div><div className="panel-subtitle">{from} → {to} · {selected.aggregate === "sum" ? "Total diario" : "Media diaria"}</div></div><span className="tag">{daily.length} DÍAS</span></div>
      {query.isLoading ? <div className="empty-chart"><p>Cargando histórico…</p></div> : query.isError ? <div className="empty-chart"><p>{query.error instanceof Error ? query.error.message : "No se pudo cargar el histórico."}</p></div> : daily.length ? <div className="chart-wrap" style={{ height: 310 }}><ResponsiveContainer width="100%" height="100%">{selected.aggregate === "sum" ? <BarChart data={daily} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}><CartesianGrid stroke="#ffffff0c" vertical={false}/><XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "#777987", fontSize: 10 }}/><YAxis tickLine={false} axisLine={false} tick={{ fill: "#777987", fontSize: 10 }}/><Tooltip content={<TrendTooltip unit={selected.unit}/>}/><Bar dataKey="value" name={selected.label} fill="#df819e" radius={[4, 4, 0, 0]}/></BarChart> : <LineChart data={daily} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}><CartesianGrid stroke="#ffffff0c" vertical={false}/><XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "#777987", fontSize: 10 }}/><YAxis tickLine={false} axisLine={false} tick={{ fill: "#777987", fontSize: 10 }}/><Tooltip content={<TrendTooltip unit={selected.unit}/>}/><Line type="monotone" dataKey="value" name={selected.label} stroke="#df819e" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }}/></LineChart>}</ResponsiveContainer></div> : <div className="empty-chart"><p>No hay datos de {selected.label.toLowerCase()} en el intervalo seleccionado. Importa un histórico de Google Takeout o conecta Google Health.</p></div>}
    </article>
    <article className="panel mt-4"><div className="panel-header"><div><div className="panel-title">Detalle por día</div><div className="panel-subtitle">Resumen del intervalo seleccionado</div></div></div><div className="table-wrap"><table className="data-table"><thead><tr><th>DÍA</th><th>VALOR</th><th>MUESTRAS</th></tr></thead><tbody>{[...daily].reverse().slice(0, 50).map((row) => <tr key={row.date}><td>{row.date}</td><td>{formatNumber(row.value, 1)} {selected.unit}</td><td>{row.samples}</td></tr>)}{!daily.length && <tr><td colSpan={3}>No hay datos para mostrar.</td></tr>}</tbody></table></div></article>
  </>;
}
function Metric({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: React.ReactNode }) { return <article className="metric-card"><div className="metric-card-top">{label}<span className="metric-icon rose">{icon}</span></div><div className="metric-value">{value}</div><div className="metric-card-bottom">{detail}</div></article>; }
function TrendTooltip({ active, payload, label, unit }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string; unit: string }) { if (!active || !payload?.length) return null; return <div className="chart-tooltip"><span>{label}</span>{payload.map((item) => <div key={item.name}><i style={{ background: item.color }}/>{item.name}: <b>{formatNumber(Number(item.value), 1)} {unit}</b></div>)}</div>; }
