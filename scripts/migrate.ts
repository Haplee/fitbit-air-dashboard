import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";
import { readFile } from "node:fs/promises";

dotenv.config({ path: ".env.local" });
dotenv.config();

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required. Set it in .env.local or the environment.");
const sql = neon(url);
const schema = await readFile(new URL("../drizzle/0000_initial.sql", import.meta.url), "utf8");
for (const statement of schema.split("--> statement-breakpoint").map((part) => part.trim()).filter(Boolean)) {
  await sql.query(statement);
}
console.log("Database schema applied.");
