/**
 * Force-reseed: clears sparse/stale tables then restores from seed files.
 * Run once: node scripts/force-reseed.mjs
 */
import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEEDS_DIR = path.resolve(__dirname, "../lib/db/seeds");

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

// ── Table map (seed key → db table name) ────────────────────────────────────
const TABLE_MAP = {
  regions: "regions",
  cities: "cities",
  areas: "areas",
  featuredAreas: "featured_areas",
  categories: "categories",
  subcategories: "subcategories",
  properties: "properties",
  emailTemplates: "email_templates",
  siteSettings: "site_settings",
  billingPlans: "billing_plans",
  commissionRules: "commission_rules",
  packages: "packages",
  propertyFieldConfigs: "property_field_configs",
  adminStaff: "admin_staff",
  users: "users",
};

function toSnake(str) {
  return str.replace(/([A-Z])/g, "_$1").toLowerCase();
}

// ── Seed files to load (in dependency order) ─────────────────────────────────
const SEED_FILES = [
  "locations.json",
  "categories.json",
  "settings.json",
  "billing.json",
  "field-configs.json",
  "email.json",
  "properties.json",
  "admin.json",
];

// Tables to truncate before re-seeding (order matters for FK constraints)
const TRUNCATE_ORDER = [
  "subcategories",
  "categories",
  "areas",
  "cities",
  "regions",
  "featured_areas",
  "property_field_configs",
  "site_settings",
  "billing_plans",
  "email_templates",
];

console.log("⏳ Clearing stale tables...");
for (const t of TRUNCATE_ORDER) {
  try {
    await client.query(`TRUNCATE TABLE "${t}" RESTART IDENTITY CASCADE`);
    console.log(`  ✓ Cleared ${t}`);
  } catch (e) {
    console.warn(`  ⚠ Could not clear ${t}:`, e.message);
  }
}

console.log("\n⏳ Loading seed files...");

for (const file of SEED_FILES) {
  const fp = path.join(SEEDS_DIR, file);
  if (!fs.existsSync(fp)) { console.warn(`  ⚠ Missing: ${file}`); continue; }

  let content;
  try { content = JSON.parse(fs.readFileSync(fp, "utf8")); }
  catch (e) { console.warn(`  ⚠ Cannot parse ${file}:`, e.message); continue; }

  const tables = content.tables ?? {};
  for (const [key, rows] of Object.entries(tables)) {
    if (!rows || rows.length === 0) continue;
    const dbName = TABLE_MAP[key];
    if (!dbName) { console.warn(`  ⚠ No DB mapping for key: ${key}`); continue; }

    let inserted = 0;
    for (const row of rows) {
      const cols = Object.keys(row).map(k => `"${toSnake(k)}"`);
      const vals = Object.values(row);
      const placeholders = vals.map((_, i) => `$${i + 1}`);
      try {
        await client.query(
          `INSERT INTO "${dbName}" (${cols.join(",")}) VALUES (${placeholders.join(",")}) ON CONFLICT (id) DO NOTHING`,
          vals
        );
        inserted++;
      } catch (e) {
        // skip row errors silently
      }
    }

    // Reset sequence
    try {
      await client.query(
        `SELECT setval(pg_get_serial_sequence('"${dbName}"', 'id'), COALESCE((SELECT MAX(id) FROM "${dbName}"), 1))`
      );
    } catch {}

    console.log(`  ✓ ${dbName}: ${inserted}/${rows.length} rows`);
  }
}

// Fix property statuses — old snapshots used 'published', current code uses 'approved'
const { rowCount } = await client.query(
  `UPDATE properties SET status='approved', approved_at=NOW() WHERE status IN ('published','active') AND approved_at IS NULL`
);
if (rowCount > 0) console.log(`\n  ✓ Fixed ${rowCount} property status(es) → approved`);

await client.end();
console.log("\n✅ Reseed complete!");
