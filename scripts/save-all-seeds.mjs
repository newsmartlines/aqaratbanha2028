/**
 * save-all-seeds.mjs
 * Queries all important tables and writes them to lib/db/seeds/
 * Run: node scripts/save-all-seeds.mjs
 */

import pg from "pg";
import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEEDS_DIR = path.resolve(__dirname, "../lib/db/seeds");
const DB_URL = process.env.DATABASE_URL;

if (!DB_URL) {
  console.error("❌ DATABASE_URL not set");
  process.exit(1);
}

const client = new pg.Client({ connectionString: DB_URL });
await client.connect();

async function q(sql, params = []) {
  const res = await client.query(sql, params);
  return res.rows;
}

console.log("🔌 Connected to PostgreSQL");
console.log("📁 Seeds dir:", SEEDS_DIR);

if (!existsSync(SEEDS_DIR)) {
  await fs.mkdir(SEEDS_DIR, { recursive: true });
}

const now = new Date().toISOString();

// ─── SENSITIVE site_settings keys to skip ────────────────────────────────────
const SENSITIVE_KEYS = new Set([
  "smtpPass", "smtpUser", "smtpHost", "smtpPort", "smtpSecure",
  "googleClientSecret", "jwtSecret", "paymentGatewayKey", "stripeSecret",
]);

// ─── Fetch all tables ─────────────────────────────────────────────────────────
console.log("\n⏳ Fetching data from database...\n");

const regions       = await q("SELECT * FROM regions ORDER BY id");
const cities        = await q("SELECT * FROM cities ORDER BY id");
const areas         = await q("SELECT * FROM areas ORDER BY id");
const featuredAreas = await q("SELECT * FROM featured_areas ORDER BY id");
const categories    = await q("SELECT * FROM categories ORDER BY id");
const subcategories = await q("SELECT * FROM subcategories ORDER BY id");
const properties    = await q("SELECT * FROM properties ORDER BY id");
const emailTemplates = await q("SELECT * FROM email_templates ORDER BY id");
const rawSettings   = await q("SELECT * FROM site_settings ORDER BY id");
const siteSettings  = rawSettings.filter(r => !SENSITIVE_KEYS.has(r.key));
const billingPlans  = await q("SELECT * FROM billing_plans ORDER BY id");
const commissionRules = await q("SELECT * FROM commission_rules ORDER BY id");
const packages      = await q("SELECT * FROM packages ORDER BY id");
const fieldConfigs  = await q("SELECT * FROM property_field_configs ORDER BY id");
const adminStaff    = await q("SELECT * FROM admin_staff ORDER BY id");
// Users: strip password hash
const usersRaw      = await q("SELECT * FROM users ORDER BY id");
const users         = usersRaw.map(({ password_hash, ...safe }) => safe);

// ─── Print counts ─────────────────────────────────────────────────────────────
const counts = {
  regions: regions.length,
  cities: cities.length,
  areas: areas.length,
  featuredAreas: featuredAreas.length,
  categories: categories.length,
  subcategories: subcategories.length,
  properties: properties.length,
  emailTemplates: emailTemplates.length,
  siteSettings: siteSettings.length,
  billingPlans: billingPlans.length,
  commissionRules: commissionRules.length,
  packages: packages.length,
  propertyFieldConfigs: fieldConfigs.length,
  adminStaff: adminStaff.length,
  users: users.length,
};

for (const [table, count] of Object.entries(counts)) {
  console.log(`  ${count > 0 ? "✅" : "⚠️ "} ${table}: ${count} rows`);
}

// ─── Write seed files ─────────────────────────────────────────────────────────

async function writeSeed(filename, groupKey, label, tables) {
  const hasSomeData = Object.values(tables).some(r => r.length > 0);
  if (!hasSomeData) {
    console.log(`\n⏭️  Skipping ${filename} (no data)`);
    return false;
  }
  const payload = { version: "1.0", group: groupKey, label, exportedAt: now, tables };
  await fs.writeFile(path.join(SEEDS_DIR, filename), JSON.stringify(payload, null, 2), "utf8");
  const total = Object.values(tables).reduce((a, r) => a + r.length, 0);
  console.log(`\n💾 Saved ${filename} — ${total} rows`);
  return true;
}

const savedFiles = [];

if (await writeSeed("locations.json", "locations", "المواقع الجغرافية", { regions, cities, areas, featuredAreas })) savedFiles.push("locations.json");
if (await writeSeed("categories.json", "categories", "التصنيفات", { categories, subcategories })) savedFiles.push("categories.json");
if (await writeSeed("properties.json", "properties", "العقارات", { properties })) savedFiles.push("properties.json");
if (await writeSeed("email.json", "email", "قوالب البريد", { emailTemplates })) savedFiles.push("email.json");
if (await writeSeed("settings.json", "settings", "إعدادات الموقع", { siteSettings })) savedFiles.push("settings.json");
if (await writeSeed("billing.json", "billing", "الفواتير والاشتراكات", { billingPlans, commissionRules, packages })) savedFiles.push("billing.json");
if (await writeSeed("field-configs.json", "fieldConfigs", "حقول العقارات", { propertyFieldConfigs: fieldConfigs })) savedFiles.push("field-configs.json");
if (await writeSeed("admin.json", "admin", "المستخدمون والإدارة", { adminStaff, users })) savedFiles.push("admin.json");

// ─── Write manifest ────────────────────────────────────────────────────────────
const totalRows = Object.values(counts).reduce((a, b) => a + b, 0);
const manifest = {
  version: "1.0",
  platform: "عقارات بنها",
  exportedAt: now,
  files: savedFiles,
  tableCounts: counts,
  totalRows,
  description: "Auto-saved by save-all-seeds.mjs",
};
await fs.writeFile(path.join(SEEDS_DIR, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

console.log(`\n📋 Manifest updated: ${savedFiles.length} files, ${totalRows} total rows`);
console.log("\n✅ Done! All seeds saved to lib/db/seeds/\n");

await client.end();
