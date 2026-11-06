
import dotenv from "dotenv";
import postgres from "postgres";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });
dotenv.config();

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is missing. Configure Supabase in .env.local."
    );
  }

  const sql = postgres(connectionString, {
    max: 1,
    connect_timeout: 15,
    prepare: false,
  });

  try {
    const migrationPath = resolve(
      process.cwd(),
      "drizzle",
      "0000_initial.sql"
    );

    const migration = await readFile(migrationPath, "utf8");

    const statements = migration
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      .filter(Boolean);

    await sql.begin(async (transaction) => {
      for (const statement of statements) {
        await transaction.unsafe(statement);
      }
    });

    console.log(
      `Supabase migration completed: ${statements.length} statements.`
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  console.error("Database migration failed:", error);
  process.exitCode = 1;
});
