import { defineConfig } from "drizzle-kit";
import path from "path";

const url = process.env.MYSQL_URL ?? process.env.DATABASE_URL;

if (!url) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  out: path.join(__dirname, "./migrations"),
  dialect: "postgresql",
  dbCredentials: { url },
});
