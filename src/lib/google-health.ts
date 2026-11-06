import { db, googleConnections } from "@/lib/db";
import { decryptJson, encryptJson } from "@/lib/crypto";
import { eq } from "drizzle-orm";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly",
  "https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly",
  "https://www.googleapis.com/auth/googlehealth.sleep.readonly",
];

export type GoogleTokens = {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  token_type?: string;
  scope?: string;
};

export function googleIsConfigured() {
  return process.env.GOOGLE_HEALTH_API_ENABLED === "true" && Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI && process.env.GOOGLE_TOKEN_ENCRYPTION_KEY);
}

export async function saveGoogleTokens(tokens: GoogleTokens) {
  const encryptedTokens = encryptJson(tokens);
  await db.insert(googleConnections).values({ ownerKey: "owner", encryptedTokens, grantedScopes: tokens.scope ?? "" })
    .onConflictDoUpdate({ target: googleConnections.ownerKey, set: { encryptedTokens, grantedScopes: tokens.scope ?? "", updatedAt: new Date() } });
}

export async function getGoogleTokens(): Promise<GoogleTokens | null> {
  const [row] = await db.select().from(googleConnections).where(eq(googleConnections.ownerKey, "owner")).limit(1);
  return row ? decryptJson<GoogleTokens>(row.encryptedTokens) : null;
}

export async function getValidGoogleAccessToken() {
  const tokens = await getGoogleTokens();
  if (!tokens) throw new Error("Google Health no está conectado.");
  if (tokens.expires_at > Date.now() + 60_000) return tokens.access_token;
  if (!tokens.refresh_token) throw new Error("La sesión de Google ha caducado. Vuelve a conectar la cuenta.");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: tokens.refresh_token,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  const refreshed = await response.json();
  if (!response.ok) throw new Error(`Google OAuth refresh falló: ${refreshed.error_description ?? refreshed.error ?? response.status}`);
  const next: GoogleTokens = { ...tokens, ...refreshed, refresh_token: tokens.refresh_token, expires_at: Date.now() + Number(refreshed.expires_in ?? 3600) * 1000 };
  await saveGoogleTokens(next);
  return next.access_token;
}

export const GOOGLE_DATA_TYPES = [
  { id: "steps", metric: "steps", timeField: "interval.civil_start_time", family: true },
  { id: "heart-rate", metric: "heart_rate", timeField: "sample_time.physical_time", family: true },
  { id: "daily-resting-heart-rate", metric: "resting_heart_rate", timeField: "date", family: true },
  { id: "daily-heart-rate-variability", metric: "hrv", timeField: "date", family: true },
  { id: "sleep", metric: "sleep", timeField: "interval.end_time", family: false },
  { id: "exercise", metric: "exercise", timeField: "interval.civil_start_time", family: true },
  { id: "distance", metric: "distance", timeField: "interval.civil_start_time", family: true },
  { id: "active-zone-minutes", metric: "active_minutes", timeField: "interval.civil_start_time", family: true },
  { id: "oxygen-saturation", metric: "spo2", timeField: "sample_time.physical_time", family: true },
  { id: "daily-oxygen-saturation", metric: "spo2", timeField: "date", family: true },
  { id: "daily-respiratory-rate", metric: "respiratory_rate", timeField: "date", family: true },
  { id: "daily-vo2-max", metric: "vo2_max", timeField: "date", family: true },
  { id: "active-energy-burned", metric: "calories", timeField: "interval.civil_start_time", family: true },
] as const;

function deepNumber(obj: unknown, keys: string[], depth = 0): number | null {
  if (!obj || typeof obj !== "object" || depth > 7) return null;
  const entries = Object.entries(obj as Record<string, unknown>);
  for (const key of keys) {
    const found = entries.find(([name]) => name.toLowerCase() === key.toLowerCase());
    if (found) {
      const raw = found[1];
      if (typeof raw === "number" && Number.isFinite(raw)) return raw;
      if (typeof raw === "string") {
        const parsed = Number.parseFloat(raw.replace(/s$/, ""));
        if (Number.isFinite(parsed)) return parsed;
      }
    }
  }
  for (const [, value] of entries) {
    const nested = deepNumber(value, keys, depth + 1);
    if (nested !== null) return nested;
  }
  return null;
}

function dateObjectToIso(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.year === "number" && typeof v.month === "number" && typeof v.day === "number") {
    const d = new Date(Date.UTC(v.year, v.month - 1, v.day));
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

function findTime(obj: unknown, depth = 0): string | null {
  if (!obj || typeof obj !== "object" || depth > 8) return null;
  const entries = Object.entries(obj as Record<string, unknown>);
  const keys = ["physicalTime", "civilTime", "civilStartTime", "startTime", "endTime", "civilEndTime", "date", "timestamp"];
  for (const key of keys) {
    const found = entries.find(([name]) => name.toLowerCase() === key.toLowerCase());
    if (!found) continue;
    const raw = found[1];
    if (typeof raw === "string" || typeof raw === "number") {
      const d = new Date(raw);
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }
    const fromDate = dateObjectToIso(raw);
    if (fromDate) return fromDate;
    const nested = findTime(raw, depth + 1);
    if (nested) return nested;
  }
  for (const [, value] of entries) {
    if (value && typeof value === "object") {
      const nested = findTime(value, depth + 1);
      if (nested) return nested;
    }
  }
  return null;
}

export function normalizeGoogleDataPoint(dataType: string, point: Record<string, unknown>) {
  const type = GOOGLE_DATA_TYPES.find((item) => item.id === dataType);
  if (!type) return null;
  const payloadKey = Object.keys(point).find((key) => key !== "name" && key !== "dataSource");
  const payload = (payloadKey ? point[payloadKey] : point) as Record<string, unknown>;
  const time = findTime(payload) ?? findTime(point);
  if (!time) return null;

  const keysByMetric: Record<string, string[]> = {
    steps: ["count"], heart_rate: ["beatsPerMinute"], resting_heart_rate: ["beatsPerMinute"],
    hrv: ["averageHeartRateVariabilityMilliseconds", "deepSleepRootMeanSquareOfSuccessiveDifferencesMilliseconds"],
    sleep: ["minutesAsleep", "minutesInSleepPeriod"], exercise: ["activeDuration", "durationSeconds"],
    distance: ["millimeters"], active_minutes: ["activeZoneMinutes"], spo2: ["percentage", "averagePercentage"],
    respiratory_rate: ["breathsPerMinute", "averageBreathsPerMinute"], vo2_max: ["dailyVo2Max", "vo2Max"],
    calories: ["kilocalories", "caloriesKcal", "value"],
  };
  let value = deepNumber(payload, keysByMetric[type.metric] ?? ["value"]);
  if (value === null) return null;
  let unit = "";
  switch (type.metric) {
    case "steps": unit = "pasos"; break;
    case "heart_rate": case "resting_heart_rate": unit = "lpm"; break;
    case "hrv": unit = "ms"; break;
    case "sleep": unit = "min"; break;
    case "exercise": unit = "min"; value /= 60; break;
    case "distance": unit = "m"; value /= 1000; break;
    case "active_minutes": unit = "min"; break;
    case "spo2": unit = "%"; break;
    case "respiratory_rate": unit = "rpm"; break;
    case "vo2_max": unit = "ml/kg/min"; break;
    case "calories": unit = "kcal"; break;
  }
  const source = point.dataSource && typeof point.dataSource === "object" ? point.dataSource as Record<string, unknown> : {};
  const label = typeof payload.displayName === "string" ? payload.displayName : (typeof source.name === "string" ? source.name : dataType);
  return { metric: type.metric, value, unit, measuredAt: time, source: "google_health" as const, label, metadata: { dataType, googleName: point.name ?? null, dataSource: source, original: payload } };
}
