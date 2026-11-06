import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not configured. Set the Supabase Transaction Pooler URI.");
}

// Supabase's shared Transaction Pooler is intended for short-lived/serverless
// workloads. Prepared statements must be disabled in transaction pool mode.
const client = postgres(connectionString, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 15,
  prepare: false,
});

export const db = drizzle(client, { schema });
export { client as dbClient };
export * from "./schema";
