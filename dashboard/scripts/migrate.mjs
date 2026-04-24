// Runtime-only migrator: no dev deps needed. Runs inside the prod container.
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

console.log("Running migrations against", process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":****@"));
await migrate(db, { migrationsFolder: "./drizzle" });
console.log("Migrations complete ✓");
await pool.end();
