import { NextResponse } from "next/server";
import { db, healthRecords, googleConnections } from "@/lib/db";
import { gte, desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const now = new Date();
    const from = new Date(now.getTime() - 30 * 86400000);
    const rows = await db.select().from(healthRecords).where(gte(healthRecords.measuredAt, from)).orderBy(desc(healthRecords.measuredAt)).limit(15000);
    const today = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
    const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
    const dailyMap = new Map<string, { steps: number; heart: number[]; sleep: number[] }>();
    const bucket = (key: string) => { if (!dailyMap.has(key)) dailyMap.set(key,{steps:0,heart:[],sleep:[]}); return dailyMap.get(key)!; };
    for (const row of rows) {
      const date = new Date(row.measuredAt).toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" });
      const b = bucket(date); const value = Number(row.value);
      if (row.metric === "steps") b.steps += value;
      if (row.metric === "heart_rate") b.heart.push(value);
      if (row.metric === "sleep") b.sleep.push(value);
    }
    const daily = [...dailyMap.entries()].sort(([a],[b]) => a.localeCompare(b)).map(([day,v]) => ({ day: new Intl.DateTimeFormat("es-ES",{day:"2-digit",month:"short",timeZone:"Europe/Madrid"}).format(new Date(`${day}T12:00:00Z`)), steps: Math.round(v.steps), heartRate: v.heart.length ? Math.round(v.heart.reduce((a,b)=>a+b,0)/v.heart.length) : null, sleep: v.sleep.length ? Math.round(v.sleep.reduce((a,b)=>a+b,0)) : null }));
    const vals = (metric: string) => rows.filter(r => r.metric === metric).sort((a,b)=>b.measuredAt.getTime()-a.measuredAt.getTime());
    const heart = vals("heart_rate"); const resting = vals("resting_heart_rate"); const hrv=vals("hrv"); const sleep=vals("sleep"); const spo2=vals("spo2");
    const todaySum = (metric: string) => rows.filter(r => r.metric===metric && new Date(r.measuredAt).toLocaleDateString("en-CA",{timeZone:"Europe/Madrid"})===todayKey).reduce((sum,r)=>sum+Number(r.value),0);
    const avg = (items: typeof heart) => items.length ? items.reduce((s,r)=>s+Number(r.value),0)/items.length : null;
    const [connection] = await db.select({lastSyncAt:googleConnections.lastSyncAt}).from(googleConnections).where(eq(googleConnections.ownerKey,"owner")).limit(1);
    return NextResponse.json({ records: rows.length, googleConnected: Boolean(connection), lastSyncAt: connection?.lastSyncAt ?? null, daily, totals: {
      stepsToday: rows.some(r=>r.metric==="steps" && new Date(r.measuredAt).toLocaleDateString("en-CA",{timeZone:"Europe/Madrid"})===todayKey) ? todaySum("steps") : null,
      heartRateAverage: avg(heart), restingHeartRate: resting.length ? Number(resting[0].value) : null, hrvLatest: hrv.length ? Number(hrv[0].value) : null,
      sleepAverageMinutes: sleep.length ? sleep.reduce((s,r)=>s+Number(r.value),0)/Math.min(30,sleep.length) : null, sleepLatestMinutes: sleep.length ? Number(sleep[0].value) : null,
      sleepRecords: sleep.length, spo2: spo2.length ? Number(spo2[0].value) : null, caloriesToday: rows.some(r=>r.metric==="calories") ? todaySum("calories") : null,
      activeMinutesToday: rows.some(r=>r.metric==="active_minutes") ? todaySum("active_minutes") : null,
      distanceToday: rows.some(r=>r.metric==="distance") ? todaySum("distance") : null,
    } });
  } catch (error) { console.error("summary_error", error); return NextResponse.json({ error: "No se pudo consultar el resumen. Comprueba DATABASE_URL y las migraciones." }, { status: 500 }); }
}
