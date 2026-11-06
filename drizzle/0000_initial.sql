-- Fitbit Air Dashboard: private application schema for Supabase PostgreSQL.
-- The application accesses this schema through its server-only DATABASE_URL.
-- Do not add the `fitbit` schema to Supabase's exposed Data API schemas.
CREATE SCHEMA IF NOT EXISTS fitbit;
--> statement-breakpoint
REVOKE ALL ON SCHEMA fitbit FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON SCHEMA fitbit FROM anon;
--> statement-breakpoint
REVOKE ALL ON SCHEMA fitbit FROM authenticated;
--> statement-breakpoint
GRANT USAGE, CREATE ON SCHEMA fitbit TO postgres;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS fitbit.health_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric varchar(64) NOT NULL,
  value numeric(16,4) NOT NULL,
  unit varchar(32) DEFAULT '' NOT NULL,
  measured_at timestamptz NOT NULL,
  end_at timestamptz,
  source varchar(32) NOT NULL,
  source_file varchar(512) DEFAULT '' NOT NULL,
  label varchar(160) DEFAULT '' NOT NULL,
  dedupe_key varchar(64) NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  imported_at timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS health_records_dedupe_uq ON fitbit.health_records (dedupe_key);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS health_records_metric_date_idx ON fitbit.health_records (metric, measured_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS health_records_measured_at_idx ON fitbit.health_records (measured_at);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS fitbit.import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name varchar(255) NOT NULL,
  sha256 varchar(64) NOT NULL,
  status varchar(24) DEFAULT 'processing' NOT NULL,
  total_records integer DEFAULT 0 NOT NULL,
  inserted_records integer DEFAULT 0 NOT NULL,
  duplicate_records integer DEFAULT 0 NOT NULL,
  files_processed integer DEFAULT 0 NOT NULL,
  message text,
  started_at timestamptz DEFAULT now() NOT NULL,
  completed_at timestamptz
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS import_jobs_sha_uq ON fitbit.import_jobs (sha256);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS fitbit.google_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_key varchar(64) DEFAULT 'owner' NOT NULL,
  encrypted_tokens text NOT NULL,
  granted_scopes text DEFAULT '' NOT NULL,
  connected_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  last_sync_at timestamptz,
  last_sync_status varchar(32) DEFAULT 'never' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS google_connections_owner_uq ON fitbit.google_connections (owner_key);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS fitbit.app_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type varchar(64) NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS app_events_created_idx ON fitbit.app_events (created_at);
--> statement-breakpoint
ALTER TABLE fitbit.health_records ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE fitbit.import_jobs ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE fitbit.google_connections ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE fitbit.app_events ENABLE ROW LEVEL SECURITY;
