import type { MetricKey, MetricRecordInput } from "@/lib/metrics";

const aliases: Record<string, { metric: MetricKey; unit: string; valueKeys: string[] }> = {
  steps: { metric: "steps", unit: "pasos", valueKeys: ["steps", "stepcount", "count", "value"] },
  step: { metric: "steps", unit: "pasos", valueKeys: ["steps", "stepcount", "count", "value"] },
  heartrate: { metric: "heart_rate", unit: "lpm", valueKeys: ["bpm", "heartrate", "beatsperminute", "value"] },
  heartrateintraday: { metric: "heart_rate", unit: "lpm", valueKeys: ["bpm", "heartrate", "beatsperminute", "value"] },
  restingheartrate: { metric: "resting_heart_rate", unit: "lpm", valueKeys: ["restingheartrate", "bpm", "value"] },
  hrv: { metric: "hrv", unit: "ms", valueKeys: ["rmssd", "rmssdms", "heartratevariability", "value"] },
  heartratevariability: { metric: "hrv", unit: "ms", valueKeys: ["rmssd", "rmssdms", "value"] },
  sleep: { metric: "sleep", unit: "min", valueKeys: ["minutesasleep", "totalsleepminutes", "durationminutes", "value"] },
  distance: { metric: "distance", unit: "m", valueKeys: ["distancemeters", "meters", "distance", "value"] },
  calories: { metric: "calories", unit: "kcal", valueKeys: ["calories", "totalcalories", "kcal", "value"] },
  activecalories: { metric: "calories", unit: "kcal", valueKeys: ["calories", "kcal", "value"] },
  activeminutes: { metric: "active_minutes", unit: "min", valueKeys: ["activeminutes", "minutes", "value"] },
  spo2: { metric: "spo2", unit: "%", valueKeys: ["spo2", "percentage", "value"] },
  oxygensaturation: { metric: "spo2", unit: "%", valueKeys: ["spo2", "percentage", "value"] },
  respiratoryrate: { metric: "respiratory_rate", unit: "rpm", valueKeys: ["respiratoryrate", "breathsperminute", "value"] },
  weight: { metric: "weight", unit: "kg", valueKeys: ["weight", "kilograms", "value"] },
  vo2max: { metric: "vo2_max", unit: "ml/kg/min", valueKeys: ["vo2max", "value"] },
  exercise: { metric: "exercise", unit: "min", valueKeys: ["durationminutes", "durationseconds", "duration", "value"] },
  activity: { metric: "steps", unit: "pasos", valueKeys: ["steps", "stepcount", "count", "value"] },
  stepcount: { metric: "steps", unit: "pasos", valueKeys: ["steps", "stepcount", "count", "value"] },
};

const timeKeys = ["datetime", "date", "timestamp", "starttime", "start_time", "measuredat", "time", "start"];

function keyNorm(value: string) { return value.toLowerCase().replace(/[^a-z0-9]/g, ""); }
function findDeepValue(obj: unknown, candidates: string[], depth = 0): unknown {
  if (depth > 5 || !obj || typeof obj !== "object") return undefined;
  const record = obj as Record<string, unknown>;
  for (const candidate of candidates) {
    const key = Object.keys(record).find((k) => keyNorm(k) === keyNorm(candidate));
    if (key && record[key] !== null && record[key] !== undefined) return record[key];
  }
  for (const value of Object.values(record)) {
    const found = findDeepValue(value, candidates, depth + 1);
    if (found !== undefined) return found;
  }
  return undefined;
}

function inferAlias(path: string, row: Record<string, unknown>): (typeof aliases)[string] | null {
  const context = `${path} ${Object.keys(row).join(" ")}`.toLowerCase().replace(/[^a-z0-9]/g, "");
  const matches = Object.entries(aliases).sort((a, b) => b[0].length - a[0].length);
  return matches.find(([alias]) => context.includes(alias))?.[1] ?? null;
}

function toIso(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const d = new Date(value < 10_000_000_000 ? value * 1000 : value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (typeof value !== "string" || !value.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

async function sha256(input: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function normalizeRows(rows: unknown[], fileName: string): Promise<MetricRecordInput[]> {
  const output: MetricRecordInput[] = [];
  for (const item of rows) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const alias = inferAlias(fileName, row);
    if (!alias) continue;
    const timeValue = findDeepValue(row, timeKeys);
    const measuredAt = toIso(timeValue);
    if (!measuredAt) continue;
    const valueRaw = findDeepValue(row, alias.valueKeys);
    const value = typeof valueRaw === "string" ? Number(valueRaw.replace(",", ".")) : Number(valueRaw);
    if (!Number.isFinite(value)) continue;
    let normalized = value;
    if (alias.metric === "sleep" && /durationmillis/i.test(JSON.stringify(row).slice(0, 1000)) && value > 10000) normalized = value / 60000;
    if (alias.metric === "exercise" && /durationseconds/i.test(JSON.stringify(row).slice(0, 1000)) && value > 0) normalized = value / 60;
    const unitValue = findDeepValue(row, ["unit"]);
    const unit = typeof unitValue === "string" ? unitValue.slice(0, 32) : alias.unit;
    const canonical = `${alias.metric}|${measuredAt}|${normalized}|${unit}`;
    output.push({
      metric: alias.metric, value: normalized, unit, measuredAt, source: "takeout", sourceFile: fileName.slice(0, 500),
      label: typeof row.name === "string" ? row.name.slice(0, 160) : alias.metric,
      dedupeKey: await sha256(canonical), metadata: { importedFrom: "Google Takeout" },
    });
  }
  return output;
}

export function collectCandidateRows(value: unknown): unknown[] {
  const rows: unknown[] = [];
  const visit = (node: unknown, depth: number) => {
    if (depth > 12 || node === null || node === undefined) return;
    if (Array.isArray(node)) { for (const child of node) visit(child, depth + 1); return; }
    if (typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    const hasTime = Object.keys(record).some((k) => timeKeys.includes(k.toLowerCase()));
    const hasNumber = Object.values(record).some((v) => typeof v === "number" || (typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v)));
    if (hasTime && hasNumber) rows.push(record);
    for (const child of Object.values(record)) if (child && typeof child === "object") visit(child, depth + 1);
  };
  visit(value, 0);
  return rows;
}
