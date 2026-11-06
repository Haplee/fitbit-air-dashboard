import {
  pgSchema,
  uuid,
  varchar,
  text,
  numeric,
  timestamp,
  jsonb,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// Keep health data in a non-exposed schema. The application accesses it only
// through its server-side PostgreSQL connection, not through the public Data API.
const fitbit = pgSchema("fitbit");

export const healthRecords = fitbit.table("health_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  metric: varchar("metric", { length: 64 }).notNull(),
  value: numeric("value", { precision: 16, scale: 4 }).notNull(),
  unit: varchar("unit", { length: 32 }).notNull().default(""),
  measuredAt: timestamp("measured_at", { withTimezone: true, mode: "date" }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true, mode: "date" }),
  source: varchar("source", { length: 32 }).notNull(),
  sourceFile: varchar("source_file", { length: 512 }).notNull().default(""),
  label: varchar("label", { length: 160 }).notNull().default(""),
  dedupeKey: varchar("dedupe_key", { length: 64 }).notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  importedAt: timestamp("imported_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (t) => ({
  dedupeUnique: uniqueIndex("health_records_dedupe_uq").on(t.dedupeKey),
  metricDateIdx: index("health_records_metric_date_idx").on(t.metric, t.measuredAt),
  measuredAtIdx: index("health_records_measured_at_idx").on(t.measuredAt),
}));

export const importJobs = fitbit.table("import_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  sha256: varchar("sha256", { length: 64 }).notNull(),
  status: varchar("status", { length: 24 }).notNull().default("processing"),
  totalRecords: integer("total_records").notNull().default(0),
  insertedRecords: integer("inserted_records").notNull().default(0),
  duplicateRecords: integer("duplicate_records").notNull().default(0),
  filesProcessed: integer("files_processed").notNull().default(0),
  message: text("message"),
  startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
}, (t) => ({ shaUnique: uniqueIndex("import_jobs_sha_uq").on(t.sha256) }));

export const googleConnections = fitbit.table("google_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerKey: varchar("owner_key", { length: 64 }).notNull().default("owner"),
  encryptedTokens: text("encrypted_tokens").notNull(),
  grantedScopes: text("granted_scopes").notNull().default(""),
  connectedAt: timestamp("connected_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true, mode: "date" }),
  lastSyncStatus: varchar("last_sync_status", { length: 32 }).notNull().default("never"),
}, (t) => ({ ownerUnique: uniqueIndex("google_connections_owner_uq").on(t.ownerKey) }));

export const appEvents = fitbit.table("app_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventType: varchar("event_type", { length: 64 }).notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (t) => ({ createdIdx: index("app_events_created_idx").on(t.createdAt) }));
