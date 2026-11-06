CREATE TABLE IF NOT EXISTS "health_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "metric" varchar(64) NOT NULL,
  "value" numeric(16,4) NOT NULL,
  "unit" varchar(32) DEFAULT '' NOT NULL,
  "measured_at" timestamptz NOT NULL,
  "end_at" timestamptz,
  "source" varchar(32) NOT NULL,
  "source_file" varchar(512) DEFAULT '' NOT NULL,
  "label" varchar(160) DEFAULT '' NOT NULL,
  "dedupe_key" varchar(64) NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "imported_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "health_records_dedupe_uq" ON "health_records" USING btree ("dedupe_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "health_records_metric_date_idx" ON "health_records" USING btree ("metric","measured_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "health_records_measured_at_idx" ON "health_records" USING btree ("measured_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "import_jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "file_name" varchar(255) NOT NULL,
  "sha256" varchar(64) NOT NULL,
  "status" varchar(24) DEFAULT 'processing' NOT NULL,
  "total_records" integer DEFAULT 0 NOT NULL,
  "inserted_records" integer DEFAULT 0 NOT NULL,
  "duplicate_records" integer DEFAULT 0 NOT NULL,
  "files_processed" integer DEFAULT 0 NOT NULL,
  "message" text,
  "started_at" timestamptz DEFAULT now() NOT NULL,
  "completed_at" timestamptz
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "import_jobs_sha_uq" ON "import_jobs" USING btree ("sha256");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "google_connections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_key" varchar(64) DEFAULT 'owner' NOT NULL,
  "encrypted_tokens" text NOT NULL,
  "granted_scopes" text DEFAULT '' NOT NULL,
  "connected_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "last_sync_at" timestamptz,
  "last_sync_status" varchar(32) DEFAULT 'never' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "google_connections_owner_uq" ON "google_connections" USING btree ("owner_key");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "app_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_type" varchar(64) NOT NULL,
  "message" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "app_events_created_idx" ON "app_events" USING btree ("created_at");
