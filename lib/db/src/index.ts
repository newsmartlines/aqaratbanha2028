import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    "DATABASE_URL environment variable is not set.\n" +
    "Set it in your .env file, e.g.:\n" +
    "  DATABASE_URL=postgresql://user:password@localhost:5432/mydb"
  );
}

export const pool = new Pool({ connectionString: url });
export const db = drizzle(pool, { schema });

export * from "./schema";
