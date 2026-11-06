import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, googleConnections, healthRecords } from "@/lib/db";
import { GOOGLE_DATA_TYPES, getGoogleTokens, getValidGoogleAccessToken, normalizeGoogleDataPoint } from "@/lib/google-health";
import type { MetricRecordInput } from "@/lib/metrics";

/** Shared implementation for the owner-triggered sync and the Vercel Cron endpoint. */
export async function syncGoogleHealthData() {
  const savedTokens = await getGoogleTokens();
  if (!savedTokens) return { ok: true, skipped: true, reason: "Google Health todavía no está conectado." };
  const token = await getValidGoogleAccessToken();
  let insertedTotal = 0;
  let scanned = 0;
  const from = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const to = new Date(Date.now() + 86_400_000).toISOString();

  for (const type of GOOGLE_DATA_TYPES) {
    let pageToken: string | undefined;
    let loops = 0;
    do {
      const url = new URL(`https://health.googleapis.com/v4/users/me/dataTypes/${type.id}/dataPoints`);
      url.searchParams.set("pageSize", type.id === "sleep" || type.id === "exercise" ? "25" : "10000");

      if (type.id === "sleep") {
        url.searchParams.set("filter", `sleep.interval.end_time >= "${from}" AND sleep.interval.end_time < "${to}"`);
      } else if (type.id.startsWith("daily-")) {
        const field = type.id.replace(/-/g, "_");
        url.searchParams.set("filter", `${field}.date >= "${from.slice(0, 10)}" AND ${field}.date < "${to.slice(0, 10)}"`);
      } else {
        const field = type.id.replace(/-/g, "_");
        const dateFrom = type.timeField.includes("sample_time") || type.timeField.includes("interval") ? from : from.slice(0, 10);
        const dateTo = type.timeField.includes("sample_time") || type.timeField.includes("interval") ? to : to.slice(0, 10);
        url.searchParams.set("filter", `${field}.${type.timeField} >= "${dateFrom}" AND ${field}.${type.timeField} < "${dateTo}"`);
      }
      if (type.family) url.searchParams.set("dataSourceFamily", "users/me/dataSourceFamilies/google-wearables");
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const response = await fetch(url, { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        // A missing data type or an unavailable metric should not block all other metrics.
        if ([403, 404].includes(response.status)) break;
        throw new Error(payload.error?.message ?? `Google Health API error ${response.status}`);
      }

      const points = Array.isArray(payload.dataPoints) ? payload.dataPoints : [];
      const mapped = points.flatMap((point: Record<string, unknown>) => {
        const record = normalizeGoogleDataPoint(type.id, point);
        return record ? [record] : [];
      });
      scanned += points.length;

      for (let index = 0; index < mapped.length; index += 250) {
        const batch = mapped.slice(index, index + 250).map((record: MetricRecordInput) => {
          const dedupeKey = createHash("sha256")
            .update(`${record.metric}|${record.measuredAt}|${record.value}|${record.unit}`)
            .digest("hex");
          return { ...record, dedupeKey };
        });

        if (batch.length) {
          const inserted = await db.insert(healthRecords)
            .values(batch)
            .onConflictDoNothing({ target: healthRecords.dedupeKey })
            .returning({ id: healthRecords.id });
          insertedTotal += inserted.length;
        }
      }

      pageToken = payload.nextPageToken || undefined;
      loops += 1;
    } while (pageToken && loops < 5);
  }

  await db.update(googleConnections)
    .set({ lastSyncAt: new Date(), lastSyncStatus: "success", updatedAt: new Date() })
    .where(eq(googleConnections.ownerKey, "owner"));

  return { ok: true, inserted: insertedTotal, scanned };
}
